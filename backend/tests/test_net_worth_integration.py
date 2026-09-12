import unittest
import jwt
from datetime import datetime, timedelta, timezone
from fastapi.testclient import TestClient
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.main import app
from app.config import settings
from app.api.auth import MOCK_USERS
from app.api.net_worth import MOCK_ASSETS, MOCK_LIABILITIES, MOCK_SNAPSHOTS
from app.api.investments import MOCK_HOLDINGS, MOCK_TRANSACTIONS


class TestNetWorthInvestmentIntegration(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        MOCK_USERS.clear()
        MOCK_ASSETS.clear()
        MOCK_LIABILITIES.clear()
        MOCK_SNAPSHOTS.clear()
        MOCK_HOLDINGS.clear()
        MOCK_TRANSACTIONS.clear()

        self.secret = "test_jwt_secret_key_12345678901234567890_32bytes"
        settings.JWT_SECRET = self.secret
        settings.SUPABASE_JWT_SECRET = self.secret

    def create_mock_jwt(self, user_id: str, email: str = "user@test.com", name: str = "Test User"):
        payload = {
            "sub": user_id,
            "email": email,
            "aud": "authenticated",
            "exp": datetime.now(timezone.utc) + timedelta(hours=1),
            "user_metadata": {"name": name, "currency": "USD"}
        }
        return jwt.encode(payload, self.secret, algorithm="HS256")

    def test_portfolio_assets_contribute_to_net_worth(self):
        """Active portfolio holdings dynamically contribute to net worth and asset breakdown."""
        token = self.create_mock_jwt("user-nw-1")

        # 1. User has $10,000 cash bank (manual asset)
        self.client.post(
            "/api/net-worth/assets",
            json={"name": "Checking Account", "category": "cash_bank", "currentValue": 10000.0},
            headers={"Authorization": f"Bearer {token}"}
        )

        # 2. User has $2,000 liability (credit card)
        self.client.post(
            "/api/net-worth/liabilities",
            json={"name": "Credit Card", "category": "credit_card", "outstandingAmount": 2000.0},
            headers={"Authorization": f"Bearer {token}"}
        )

        # Summary before investments: Net worth = $8,000
        s1 = self.client.get("/api/net-worth/summary", headers={"Authorization": f"Bearer {token}"}).json()
        self.assertEqual(s1["totalAssets"], 10000.0)
        self.assertEqual(s1["totalLiabilities"], 2000.0)
        self.assertEqual(s1["netWorth"], 8000.0)
        self.assertEqual(s1["portfolioValue"], 0.0)

        # 3. User buys 10 shares of AAPL @ $150 ($1,500 value)
        h_res = self.client.post(
            "/api/investments/holdings",
            json={
                "symbol": "AAPL",
                "name": "Apple Inc.",
                "assetType": "stock",
                "currentPrice": 150.0,
                "initialQuantity": 10.0,
                "initialPrice": 150.0,
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        self.assertEqual(h_res.status_code, 201)

        # 4. Summary after investments: Net worth = $10,000 + $1,500 - $2,000 = $9,500
        s2 = self.client.get("/api/net-worth/summary", headers={"Authorization": f"Bearer {token}"}).json()
        self.assertEqual(s2["totalAssets"], 11500.0)
        self.assertEqual(s2["totalLiabilities"], 2000.0)
        self.assertEqual(s2["netWorth"], 9500.0)
        self.assertEqual(s2["portfolioValue"], 1500.0)
        self.assertEqual(s2["portfolioAssetCount"], 1)
        self.assertEqual(s2["manualAssetCount"], 1)

        # Verify asset allocation has both cash_bank and stocks
        cat_ids = [item["categoryId"] for item in s2["assetAllocation"]]
        self.assertIn("cash_bank", cat_ids)
        self.assertIn("stocks", cat_ids)

    def test_portfolio_synced_assets_in_list_and_guard_deletion(self):
        """Portfolio assets appear in list_assets and cannot be deleted via net-worth endpoint."""
        token = self.create_mock_jwt("user-nw-2")

        # Create a holding
        h_res = self.client.post(
            "/api/investments/holdings",
            json={
                "symbol": "BTC",
                "name": "Bitcoin",
                "assetType": "crypto",
                "currentPrice": 60000.0,
                "initialQuantity": 0.5,
                "initialPrice": 50000.0,
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        holding_id = h_res.json()["id"]

        # List assets should include the synced holding
        assets = self.client.get("/api/net-worth/assets", headers={"Authorization": f"Bearer {token}"}).json()
        self.assertEqual(len(assets), 1)
        synced = assets[0]
        self.assertTrue(synced["isAutoSynced"])
        self.assertEqual(synced["source"], "portfolio")
        self.assertEqual(synced["category"], "crypto")
        self.assertEqual(synced["currentValue"], 30000.0)
        self.assertEqual(synced["gainLoss"], 5000.0)

        # Attempting to delete the auto-synced asset via net-worth endpoint should return 400
        del_res = self.client.delete(f"/api/net-worth/assets/{synced['id']}", headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(del_res.status_code, 400)
        self.assertIn("Portfolio", del_res.json()["detail"])


if __name__ == "__main__":
    unittest.main()
