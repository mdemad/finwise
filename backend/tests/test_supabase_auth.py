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
from app.api.auth import MOCK_USERS
from app.api.net_worth import MOCK_ASSETS, MOCK_LIABILITIES
from app.api.calculations import MOCK_CALCS

class TestSupabaseAuthMigration(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        # Clear mock stores before each test
        MOCK_USERS.clear()
        MOCK_ASSETS.clear()
        MOCK_LIABILITIES.clear()
        MOCK_CALCS.clear()

        # Set up 32+ byte test secrets
        self.secret = "test_jwt_secret_key_12345678901234567890_32bytes"
        settings.JWT_SECRET = self.secret
        settings.SUPABASE_JWT_SECRET = self.secret

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

if __name__ == "__main__":
    unittest.main()
