import unittest
import jwt
from datetime import datetime, timedelta, timezone
from fastapi.testclient import TestClient
import sys
import os

# Ensure backend directory is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.main import app
from app.config import settings
from app.api.auth import MOCK_USERS, _SYNCED_USERS
from app.api.net_worth import MOCK_ASSETS, MOCK_LIABILITIES
from app.api.calculations import MOCK_CALCS
import threading
from unittest.mock import patch, MagicMock

class TestSupabaseAuthMigration(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        # Clear mock stores before each test
        MOCK_USERS.clear()
        _SYNCED_USERS.clear()
        MOCK_ASSETS.clear()
        MOCK_LIABILITIES.clear()
        MOCK_CALCS.clear()

        # Set up 32+ byte test secrets
        self.secret = "test_jwt_secret_key_12345678901234567890_32bytes"
        settings.JWT_SECRET = self.secret
        settings.SUPABASE_JWT_SECRET = self.secret
        settings.SUPABASE_URL = ""
        settings.SUPABASE_KEY = ""

    def create_mock_jwt(self, user_id: str, email: str, name: str = "Test User", expired: bool = False):
        exp = datetime.now(timezone.utc) + (timedelta(seconds=-10) if expired else timedelta(hours=1))
        payload = {
            "sub": user_id,
            "email": email,
            "aud": "authenticated",
            "exp": exp,
            "user_metadata": {
                "name": name,
                "currency": "USD"
            }
        }
        return jwt.encode(payload, self.secret, algorithm="HS256")

    def test_unauthenticated_request_returns_401(self):
        """Unauthenticated request must return HTTP 401."""
        response = self.client.get("/api/net-worth/assets")
        self.assertEqual(response.status_code, 401)
        self.assertIn("Invalid authorization format", response.json()["detail"])

    def test_invalid_expired_token_returns_401(self):
        """Invalid or expired token must return HTTP 401."""
        # 1. Invalid signature
        invalid_token = jwt.encode({"sub": "user-123"}, "wrong_secret_key_12345678901234567890", algorithm="HS256")
        res1 = self.client.get(
            "/api/net-worth/assets",
            headers={"Authorization": f"Bearer {invalid_token}"}
        )
        self.assertEqual(res1.status_code, 401)

        # 2. Expired token
        expired_token = self.create_mock_jwt("user-123", "user123@test.com", expired=True)
        res2 = self.client.get(
            "/api/net-worth/assets",
            headers={"Authorization": f"Bearer {expired_token}"}
        )
        self.assertEqual(res2.status_code, 401)

    def test_legacy_custom_jwt_signed_with_old_jwt_secret_is_rejected(self):
        """Legacy custom JWT signed with old FinWise JWT_SECRET must be strictly rejected (401)."""
        settings.JWT_SECRET = "old_legacy_finwise_secret_key_32bytes"
        settings.SUPABASE_JWT_SECRET = ""

        legacy_payload = {
            "sub": "legacy-user-123",
            "email": "legacy@example.com",
            "name": "Legacy User",
            "exp": datetime.now(timezone.utc) + timedelta(hours=1)
        }
        legacy_token = jwt.encode(legacy_payload, settings.JWT_SECRET, algorithm="HS256")

        response = self.client.get(
            "/api/net-worth/assets",
            headers={"Authorization": f"Bearer {legacy_token}"}
        )
        self.assertEqual(response.status_code, 401)
        self.assertIn("Could not validate credentials", response.json()["detail"])

    def test_authenticated_user_id_extraction_and_user_creation(self):
        """Valid Supabase token extracts UUID sub and maps user identity without duplicating data."""
        user_uuid = "550e8400-e29b-41d4-a716-446655440000"
        token = self.create_mock_jwt(user_uuid, "alice@example.com", "Alice Smith")

        response = self.client.get(
            "/api/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["id"], user_uuid)
        self.assertEqual(data["email"], "alice@example.com")
        self.assertEqual(data["name"], "Alice Smith")
        self.assertIn(user_uuid, MOCK_USERS)

    def test_user_data_isolation(self):
        """User A cannot access or mutate User B's assets, liabilities, or calculations."""
        user_a_id = "user-a-uuid-1111"
        user_b_id = "user-b-uuid-2222"

        token_a = self.create_mock_jwt(user_a_id, "usera@test.com", "User A")
        token_b = self.create_mock_jwt(user_b_id, "userb@test.com", "User B")

        # User A creates an asset
        asset_res = self.client.post(
            "/api/net-worth/assets",
            json={"name": "User A Stock Portfolio", "category": "stocks", "currentValue": 50000},
            headers={"Authorization": f"Bearer {token_a}"}
        )
        self.assertEqual(asset_res.status_code, 201)
        asset_id = asset_res.json()["id"]

        # User A lists assets -> sees 1 asset
        list_a = self.client.get("/api/net-worth/assets", headers={"Authorization": f"Bearer {token_a}"})
        self.assertEqual(len(list_a.json()), 1)

        # User B lists assets -> sees 0 assets
        list_b = self.client.get("/api/net-worth/assets", headers={"Authorization": f"Bearer {token_b}"})
        self.assertEqual(len(list_b.json()), 0)

        # User B attempts to delete User A's asset -> returns 403 Forbidden or 404 Not Found
        del_res = self.client.delete(f"/api/net-worth/assets/{asset_id}", headers={"Authorization": f"Bearer {token_b}"})
        self.assertIn(del_res.status_code, [403, 404])

        # User A's asset remains intact
        list_a_after = self.client.get("/api/net-worth/assets", headers={"Authorization": f"Bearer {token_a}"})
        self.assertEqual(len(list_a_after.json()), 1)

    def test_no_email_based_auto_merging(self):
        """New Supabase user with matching email gets distinct record keyed strictly by Supabase Auth UUID."""
        custom_user_id = "legacy-custom-id"
        MOCK_USERS[custom_user_id] = {
            "id": custom_user_id,
            "email": "shared@example.com",
            "name": "Legacy User",
            "currency": "USD"
        }

        sb_uuid = "supabase-auth-uuid-9999"
        token = self.create_mock_jwt(sb_uuid, "shared@example.com", "Supabase User")

        me_res = self.client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(me_res.status_code, 200)
        self.assertEqual(me_res.json()["id"], sb_uuid)
        # Verify legacy user ID was not overwritten
        self.assertIn(custom_user_id, MOCK_USERS)
        self.assertIn(sb_uuid, MOCK_USERS)

    def test_concurrent_authenticated_requests_safe(self):
        """Multiple parallel requests for the same user succeed without race conditions."""
        user_uuid = "concurrent-user-uuid-8888"
        token = self.create_mock_jwt(user_uuid, "concurrent@example.com", "Concurrent User")

        results = []
        threads = []

        def make_request():
            res = self.client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
            results.append(res.status_code)

        for _ in range(10):
            t = threading.Thread(target=make_request)
            threads.append(t)
            t.start()

        for t in threads:
            t.join()

        self.assertEqual(len(results), 10)
        self.assertTrue(all(code == 200 for code in results))
        self.assertIn(user_uuid, MOCK_USERS)

    def test_profile_update_persists_and_updates_mock_user(self):
        """PUT /api/auth/profile updates user attributes cleanly."""
        user_uuid = "profile-user-uuid-7777"
        token = self.create_mock_jwt(user_uuid, "profile@example.com", "Old Name")

        # Initial auth call
        init_res = self.client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(init_res.status_code, 200)
        self.assertEqual(init_res.json()["name"], "Old Name")

        # Profile update call
        update_res = self.client.put(
            "/api/auth/profile",
            json={"name": "New Name", "currency": "EUR"},
            headers={"Authorization": f"Bearer {token}"},
        )
        self.assertEqual(update_res.status_code, 200)
        self.assertEqual(update_res.json()["name"], "New Name")
        self.assertEqual(update_res.json()["currency"], "EUR")

        self.assertEqual(MOCK_USERS[user_uuid]["name"], "New Name")
        self.assertEqual(MOCK_USERS[user_uuid]["currency"], "EUR")

    def test_synced_users_cache_and_concurrency_deduplication(self):
        """5 concurrent requests for the same new user perform users.upsert() exactly ONCE, and subsequent requests skip it."""
        settings.SUPABASE_URL = "https://mock-supabase-project.supabase.co"
        settings.SUPABASE_KEY = "mock-service-role-key"

        user_uuid = "sync-test-uuid-5555"
        token = self.create_mock_jwt(user_uuid, "sync_test@example.com", "Sync Test User")

        with patch("app.api.auth._get_supabase_client") as mock_get_client:
            mock_client = MagicMock()
            mock_table = MagicMock()
            mock_upsert = MagicMock()
            mock_execute = MagicMock()

            mock_get_client.return_value = mock_client
            mock_client.table.return_value = mock_table
            mock_table.upsert.return_value = mock_upsert
            mock_upsert.execute.return_value = MagicMock(data=[{"id": user_uuid}])

            # 1. Simulate 5 concurrent authenticated requests for the same user
            results = []
            threads = []

            def make_request():
                res = self.client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
                results.append(res.status_code)

            for _ in range(5):
                t = threading.Thread(target=make_request)
                threads.append(t)
                t.start()

            for t in threads:
                t.join()

            self.assertEqual(len(results), 5)
            self.assertTrue(all(code == 200 for code in results))

            # 2. Verify client.table("users").upsert(...) and execute() were called exactly ONCE across all 5 requests
            mock_client.table.assert_called_with("users")
            self.assertEqual(mock_table.upsert.call_count, 1)
            self.assertEqual(mock_upsert.execute.call_count, 1)
            self.assertIn(user_uuid, _SYNCED_USERS)

            # 3. Subsequent request for the same user must NOT trigger another upsert
            subsequent_res = self.client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
            self.assertEqual(subsequent_res.status_code, 200)
            self.assertEqual(mock_table.upsert.call_count, 1)
            self.assertEqual(mock_upsert.execute.call_count, 1)

    def test_failed_upsert_does_not_poison_cache_and_allows_retry(self):
        """If users.upsert() fails, user is NOT added to _SYNCED_USERS and subsequent request retries provisioning."""
        settings.SUPABASE_URL = "https://mock-supabase-project.supabase.co"
        settings.SUPABASE_KEY = "mock-service-role-key"

        user_uuid = "fail-retry-uuid-6666"
        token = self.create_mock_jwt(user_uuid, "fail_retry@example.com", "Retry User")

        with patch("app.api.auth._get_supabase_client") as mock_get_client:
            mock_client = MagicMock()
            mock_table = MagicMock()
            mock_upsert = MagicMock()

            mock_get_client.return_value = mock_client
            mock_client.table.return_value = mock_table
            mock_table.upsert.return_value = mock_upsert
            # First attempt raises network/database exception
            mock_upsert.execute.side_effect = Exception("Supabase connection timed out")

            # 1. First request fails database upsert
            res1 = self.client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
            self.assertEqual(res1.status_code, 200)  # Graceful fallback returns mock user
            self.assertEqual(mock_upsert.execute.call_count, 1)
            self.assertNotIn(user_uuid, _SYNCED_USERS)  # Cache must NOT be poisoned

            # 2. Supabase connection recovers
            mock_upsert.execute.side_effect = None
            mock_upsert.execute.return_value = MagicMock(data=[{"id": user_uuid}])

            # 3. Second request retries provisioning
            res2 = self.client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
            self.assertEqual(res2.status_code, 200)
            self.assertEqual(mock_upsert.execute.call_count, 2)  # Retried
            self.assertIn(user_uuid, _SYNCED_USERS)  # Successfully added to cache

            # 4. Third request skips upsert
            res3 = self.client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
            self.assertEqual(res3.status_code, 200)
            self.assertEqual(mock_upsert.execute.call_count, 2)  # Skipped, call count stays at 2

if __name__ == "__main__":
    unittest.main()
