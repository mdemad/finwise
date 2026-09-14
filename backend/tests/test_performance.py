"""
test_performance.py — Backend performance optimization tests.

Covers:
  1. get_current_rates_safe() — FX timeout + fallback behaviour
  2. /api/investments/summary — does not hang when FX is unavailable
  3. goals.py singleton Supabase client usage (no per-call create_client)
"""

import asyncio
import unittest
import sys
import os
from unittest.mock import patch, AsyncMock, MagicMock
from datetime import datetime, timedelta, timezone
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.api.currency import get_current_rates_safe, _rates_cache, _cache_key, _CACHE_TTL_LATEST
from app.main import app
from app.config import settings
from app.api.auth import MOCK_USERS, _SYNCED_USERS
from app.api.investments import MOCK_HOLDINGS, MOCK_TRANSACTIONS, LOCK
import jwt


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_jwt(user_id: str, email: str, secret: str = "test_jwt_secret_key_12345678901234567890_32bytes") -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "aud": "authenticated",
        "exp": int((datetime.now(timezone.utc) + timedelta(hours=1)).timestamp()),
        "iat": int(datetime.now(timezone.utc).timestamp()),
        "user_metadata": {"name": "Test User"},
    }
    return jwt.encode(payload, secret, algorithm="HS256")


# ---------------------------------------------------------------------------
# 1. get_current_rates_safe — unit tests
# ---------------------------------------------------------------------------

class TestGetCurrentRatesSafe(unittest.IsolatedAsyncioTestCase):
    """Tests for the non-blocking FX rate wrapper."""

    def setUp(self):
        # Clear the rates cache before each test
        _rates_cache.clear()
        settings.SUPABASE_URL = ""
        settings.SUPABASE_KEY = ""

    async def test_returns_from_cache_without_external_call(self):
        """When the cache is warm, no external fetch should be made."""
        base = "USD"
        cache_k = _cache_key("rates", base)
        _rates_cache[cache_k] = {
            "rates": {"USD": 1.0, "INR": 83.5, "EUR": 0.92},
            "fetched_at": datetime.utcnow(),
        }

        with patch("app.api.currency._fetch_rates_currencyapi", new_callable=AsyncMock) as mock_api:
            with patch("app.api.currency._fetch_rates_frankfurter", new_callable=AsyncMock) as mock_ff:
                result = await get_current_rates_safe(base)

        self.assertEqual(result["INR"], 83.5)
        mock_api.assert_not_called()
        mock_ff.assert_not_called()

    async def test_returns_neutral_fallback_on_timeout(self):
        """If the live fetch exceeds timeout_s, returns {base: 1.0} without raising."""
        base = "INR"

        async def slow_fetch(b):
            await asyncio.sleep(10)
            return {"INR": 1.0}

        with patch("app.api.currency._fetch_rates_currencyapi", new_callable=AsyncMock, side_effect=slow_fetch):
            with patch("app.api.currency._fetch_rates_frankfurter", new_callable=AsyncMock, side_effect=slow_fetch):
                result = await get_current_rates_safe(base, timeout_s=0.05)

        self.assertIn("INR", result)
        self.assertEqual(result["INR"], 1.0)
        self.assertEqual(len(result), 1)

    async def test_returns_neutral_fallback_when_both_providers_fail(self):
        """If both FX providers raise errors, returns {base: 1.0} without raising 503."""
        base = "USD"

        with patch("app.api.currency._fetch_rates_currencyapi", new_callable=AsyncMock, side_effect=Exception("CurrencyAPI down")):
            with patch("app.api.currency._fetch_rates_frankfurter", new_callable=AsyncMock, side_effect=Exception("Frankfurter down")):
                result = await get_current_rates_safe(base, timeout_s=5.0)

        self.assertEqual(result, {"USD": 1.0})

    async def test_returns_live_rates_and_populates_cache_on_success(self):
        """On successful fetch, result is returned and the cache is populated."""
        base = "USD"
        mock_rates = {"USD": 1.0, "EUR": 0.91, "INR": 83.5}

        with patch("app.api.currency._fetch_rates_currencyapi", new_callable=AsyncMock, side_effect=Exception("no key")):
            with patch("app.api.currency._fetch_rates_frankfurter", new_callable=AsyncMock, return_value=mock_rates):
                result = await get_current_rates_safe(base, timeout_s=5.0)

        self.assertEqual(result["EUR"], 0.91)
        cache_k = _cache_key("rates", base)
        self.assertIn(cache_k, _rates_cache)


# ---------------------------------------------------------------------------
# 2. /api/investments/summary — does not hang when FX is unavailable
# ---------------------------------------------------------------------------

class TestInvestmentSummaryFxFallback(unittest.TestCase):
    """
    Verifies that /api/investments/summary returns 200 even when the FX
    providers are unavailable, using the neutral 1:1 fallback rate.
    """

    def setUp(self):
        self.client = TestClient(app)
        MOCK_USERS.clear()
        _SYNCED_USERS.clear()
        with LOCK:
            MOCK_HOLDINGS.clear()
            MOCK_TRANSACTIONS.clear()

        self.secret = "test_jwt_secret_key_12345678901234567890_32bytes"
        settings.JWT_SECRET = self.secret
        settings.SUPABASE_JWT_SECRET = self.secret
        settings.SUPABASE_URL = ""
        settings.SUPABASE_KEY = ""
        _rates_cache.clear()

        self.user_id = "fx-fallback-user-1234"
        self.token = _make_jwt(self.user_id, "fxtest@example.com")

    def test_summary_returns_200_when_fx_is_unavailable(self):
        """Summary endpoint must respond 200 even when FX returns neutral fallback."""
        async def always_neutral(b, timeout_s=5.0):
            return {"USD": 1.0}

        with patch("app.api.investments.get_current_rates_safe", new=always_neutral):
            res = self.client.get(
                "/api/investments/summary",
                headers={"Authorization": f"Bearer {self.token}"},
            )

        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("totalValueBase", data)
        self.assertEqual(data["totalValueBase"], 0.0)

    def test_summary_returns_correct_values_with_holdings_and_fx_fallback(self):
        """Summary with same-currency holdings computes correctly even with neutral FX."""
        import uuid
        h_id = str(uuid.uuid4())
        with LOCK:
            MOCK_HOLDINGS[h_id] = {
                "id": h_id,
                "userId": self.user_id,
                "symbol": "AAPL",
                "name": "Apple Inc",
                "assetType": "stock",
                "currency": "USD",
                "brokerCode": "MANUAL",
                "unitsHeld": 10.0,
                "averageBuyPrice": 150.0,
                "currentPrice": 180.0,
                "status": "active",
                "goalId": None,
                "notes": None,
                "createdAt": datetime.now(timezone.utc),
                "updatedAt": datetime.now(timezone.utc),
            }

        async def fx_neutral(b, timeout_s=5.0):
            return {"USD": 1.0}

        with patch("app.api.investments.get_current_rates_safe", new=fx_neutral):
            res = self.client.get(
                "/api/investments/summary",
                headers={"Authorization": f"Bearer {self.token}"},
            )

        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertAlmostEqual(data["totalValueBase"], 1800.0, places=1)
        self.assertAlmostEqual(data["totalCostBasisBase"], 1500.0, places=1)
        self.assertAlmostEqual(data["totalUnrealizedPnLBase"], 300.0, places=1)


# ---------------------------------------------------------------------------
# 3. goals.py singleton client
# ---------------------------------------------------------------------------

class TestGoalsSingletonClient(unittest.TestCase):
    """
    Verifies that goals.py _get_supabase() uses the singleton from auth.py
    and does NOT call supabase.create_client() per invocation.
    """

    def test_get_supabase_uses_singleton_not_create_client(self):
        """goals._get_supabase() must delegate to _get_supabase_singleton()."""
        from app.api import goals as goals_module

        mock_client = MagicMock()

        with patch("app.api.goals._get_supabase_singleton", return_value=mock_client) as mock_singleton:
            client = goals_module._get_supabase()

        mock_singleton.assert_called_once()
        self.assertIs(client, mock_client)

    def test_get_supabase_raises_when_singleton_returns_none(self):
        """_get_supabase() must raise RuntimeError when creds are absent."""
        from app.api import goals as goals_module

        with patch("app.api.goals._get_supabase_singleton", return_value=None):
            with self.assertRaises(RuntimeError):
                goals_module._get_supabase()


if __name__ == "__main__":
    unittest.main()
