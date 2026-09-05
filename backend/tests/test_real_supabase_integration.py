import unittest
import jwt
from datetime import datetime, timedelta, timezone
from fastapi.testclient import TestClient
import sys
import os
import uuid
from supabase import create_client

# Ensure backend directory is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.main import app
from app.config import settings
from app.api.auth import MOCK_USERS
from app.api.investments import MOCK_HOLDINGS, MOCK_TRANSACTIONS


class TestRealSupabaseIntegration(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        if os.getenv("FINWISE_RUN_REAL_SUPABASE_TESTS") != "1":
            raise unittest.SkipTest("Skipping real Supabase integration test (requires FINWISE_RUN_REAL_SUPABASE_TESTS=1)")

        cls.client = TestClient(app)
        
        # Load backend/.env manually if needed
        env_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '.env'))
        if os.path.exists(env_path):
            with open(env_path, 'r') as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith('#') and '=' in line:
                        k, v = line.split('=', 1)
                        os.environ[k.strip()] = v.strip().strip('"').strip("'")
        
        settings.SUPABASE_URL = os.getenv("SUPABASE_URL", settings.SUPABASE_URL)
        settings.SUPABASE_KEY = os.getenv("SUPABASE_KEY", settings.SUPABASE_KEY)
        
        cls.supabase_url = settings.SUPABASE_URL
        cls.supabase_key = settings.SUPABASE_KEY

        if not cls.supabase_url or not cls.supabase_key:
            raise unittest.SkipTest("Supabase credentials not configured in backend/.env")

        cls.supabase = create_client(cls.supabase_url, cls.supabase_key)

    def setUp(self):
        MOCK_USERS.clear()
        MOCK_HOLDINGS.clear()
        MOCK_TRANSACTIONS.clear()

        self.secret = settings.JWT_SECRET or "super_secret_finwise_key_change_me_in_production"
        settings.SUPABASE_JWT_SECRET = self.secret

    def create_mock_jwt(self, user_id: str, email: str = "integration@test.com", name: str = "Integration User"):
        payload = {
            "sub": user_id,
            "email": email,
            "aud": "authenticated",
            "exp": datetime.now(timezone.utc) + timedelta(hours=1),
            "user_metadata": {"name": name, "currency": "USD"}
        }
        return jwt.encode(payload, self.secret, algorithm="HS256")

    def test_real_supabase_full_flow(self):
        """Executes full investment flow against real Supabase DB and verifies DB state."""
        user_a_id = str(uuid.uuid4())
        user_b_id = str(uuid.uuid4())
        token_a = self.create_mock_jwt(user_a_id, f"usera-{user_a_id[:8]}@sbtest.com", "User A")
        token_b = self.create_mock_jwt(user_b_id, f"userb-{user_b_id[:8]}@sbtest.com", "User B")

        # -------------------------------------------------------------------
        # A. Holding Creation
        # -------------------------------------------------------------------
        h_res = self.client.post(
            "/api/investments/holdings",
            json={
                "symbol": "REALTEST",
                "name": "Real Supabase Holding",
                "assetType": "stock",
                "currentPrice": 100.0,
                "currency": "USD"
            },
            headers={"Authorization": f"Bearer {token_a}"}
        )
        self.assertEqual(h_res.status_code, 201, f"Holding creation failed: {h_res.text}")
        holding = h_res.json()
        holding_id = holding["id"]
        self.assertEqual(holding["unitsHeld"], 0.0)

        # Verify insertion in real Supabase table
        sb_holding = self.supabase.table("investment_holdings").select("*").eq("id", holding_id).execute()
        self.assertEqual(len(sb_holding.data), 1)
        self.assertEqual(sb_holding.data[0]["symbol"], "REALTEST")
        self.assertEqual(float(sb_holding.data[0]["units_held"]), 0.0)

        now_str = datetime.now(timezone.utc).isoformat()

        # -------------------------------------------------------------------
        # B. BUY Transaction (10 units @ $100 + $10 fee)
        # -------------------------------------------------------------------
        buy1_res = self.client.post(
            "/api/investments/transactions",
            json={
                "holdingId": holding_id,
                "transactionType": "BUY",
                "quantity": 10.0,
                "price": 100.0,
                "fees": 10.0,
                "transactionDate": now_str
            },
            headers={"Authorization": f"Bearer {token_a}"}
        )
        self.assertEqual(buy1_res.status_code, 201, f"BUY 1 failed: {buy1_res.text}")
        
        # Check holding state in Supabase DB: units = 10, WAC = 101.0
        sb_h1 = self.supabase.table("investment_holdings").select("*").eq("id", holding_id).execute()
        self.assertEqual(float(sb_h1.data[0]["units_held"]), 10.0)
        self.assertEqual(float(sb_h1.data[0]["average_buy_price"]), 101.0)

        # Check transaction inserted in Supabase DB
        sb_tx1 = self.supabase.table("investment_transactions").select("*").eq("holding_id", holding_id).execute()
        self.assertEqual(len(sb_tx1.data), 1)
        self.assertEqual(sb_tx1.data[0]["transaction_type"], "BUY")

        # -------------------------------------------------------------------
        # C. Second BUY (10 units @ $200 + $0 fee) -> Total cost = 1010 + 2000 = 3010 / 20 = 150.5 WAC
        # -------------------------------------------------------------------
        buy2_res = self.client.post(
            "/api/investments/transactions",
            json={
                "holdingId": holding_id,
                "transactionType": "BUY",
                "quantity": 10.0,
                "price": 200.0,
                "fees": 0.0,
                "transactionDate": now_str
            },
            headers={"Authorization": f"Bearer {token_a}"}
        )
        self.assertEqual(buy2_res.status_code, 201)

        sb_h2 = self.supabase.table("investment_holdings").select("*").eq("id", holding_id).execute()
        self.assertEqual(float(sb_h2.data[0]["units_held"]), 20.0)
        self.assertEqual(float(sb_h2.data[0]["average_buy_price"]), 150.5)

        # -------------------------------------------------------------------
        # D. SELL (5 units @ $200 + $10 fee) -> Realized P&L = (200 - 150.5)*5 - 10 = 237.5
        # -------------------------------------------------------------------
        sell_res = self.client.post(
            "/api/investments/transactions",
            json={
                "holdingId": holding_id,
                "transactionType": "SELL",
                "quantity": 5.0,
                "price": 200.0,
                "fees": 10.0,
                "transactionDate": now_str
            },
            headers={"Authorization": f"Bearer {token_a}"}
        )
        self.assertEqual(sell_res.status_code, 201)
        self.assertEqual(sell_res.json()["realizedPnL"], 237.5)

        # Check holding state in Supabase DB: units = 15, WAC preserved at 150.5
        sb_h3 = self.supabase.table("investment_holdings").select("*").eq("id", holding_id).execute()
        self.assertEqual(float(sb_h3.data[0]["units_held"]), 15.0)
        self.assertEqual(float(sb_h3.data[0]["average_buy_price"]), 150.5)

        # -------------------------------------------------------------------
        # E. Insufficient SELL (Attempting to sell 100 units when only 15 available)
        # -------------------------------------------------------------------
        insuf_res = self.client.post(
            "/api/investments/transactions",
            json={
                "holdingId": holding_id,
                "transactionType": "SELL",
                "quantity": 100.0,
                "price": 200.0,
                "transactionDate": now_str
            },
            headers={"Authorization": f"Bearer {token_a}"}
        )
        self.assertEqual(insuf_res.status_code, 400)

        # Verify DB holding units remained 15.0 and no new transaction was added
        sb_h4 = self.supabase.table("investment_holdings").select("*").eq("id", holding_id).execute()
        self.assertEqual(float(sb_h4.data[0]["units_held"]), 15.0)
        sb_tx_count = self.supabase.table("investment_transactions").select("*").eq("holding_id", holding_id).execute()
        self.assertEqual(len(sb_tx_count.data), 3)  # BUY 1, BUY 2, SELL

        # -------------------------------------------------------------------
        # F. Duplicate External Transaction ID
        # -------------------------------------------------------------------
        ext_id = f"ext-order-{int(datetime.now().timestamp())}"
        tx_ext1 = self.client.post(
            "/api/investments/transactions",
            json={
                "holdingId": holding_id,
                "transactionType": "BUY",
                "quantity": 1.0,
                "price": 100.0,
                "externalTransactionId": ext_id,
                "transactionDate": now_str
            },
            headers={"Authorization": f"Bearer {token_a}"}
        )
        self.assertEqual(tx_ext1.status_code, 201)

        # Duplicate attempt -> 409 Conflict
        tx_ext2 = self.client.post(
            "/api/investments/transactions",
            json={
                "holdingId": holding_id,
                "transactionType": "BUY",
                "quantity": 1.0,
                "price": 100.0,
                "externalTransactionId": ext_id,
                "transactionDate": now_str
            },
            headers={"Authorization": f"Bearer {token_a}"}
        )
        self.assertEqual(tx_ext2.status_code, 409)

        # Verify only 1 row in DB with external_transaction_id = ext_id
        sb_ext = self.supabase.table("investment_transactions").select("*").eq("external_transaction_id", ext_id).execute()
        self.assertEqual(len(sb_ext.data), 1)

        # -------------------------------------------------------------------
        # G. Atomicity & Supabase RPC Direct Invocation Test
        # -------------------------------------------------------------------
        # Test direct RPC invocation with invalid quantity (-5) -> Must fail completely
        try:
            self.supabase.rpc("process_investment_transaction", {
                "p_user_id": user_a_id,
                "p_holding_id": holding_id,
                "p_transaction_type": "BUY",
                "p_quantity": -5.0,
                "p_price": 100.0,
                "p_amount": 500.0,
                "p_fees": 0.0,
                "p_currency": "USD",
                "p_transaction_date": now_str,
            }).execute()
            self.fail("RPC should have raised exception for negative quantity")
        except Exception as e:
            self.assertIn("non-negative", str(e).lower())

        # -------------------------------------------------------------------
        # H. Cross-User Isolation
        # -------------------------------------------------------------------
        # User B attempts to access User A's holding -> 404
        get_b = self.client.get(f"/api/investments/holdings/{holding_id}", headers={"Authorization": f"Bearer {token_b}"})
        self.assertEqual(get_b.status_code, 404)

        # User B attempts to post transaction to User A's holding -> 404
        tx_b = self.client.post(
            "/api/investments/transactions",
            json={
                "holdingId": holding_id,
                "transactionType": "BUY",
                "quantity": 10,
                "price": 100.0,
                "transactionDate": now_str
            },
            headers={"Authorization": f"Bearer {token_b}"}
        )
        self.assertEqual(tx_b.status_code, 404)

        # -------------------------------------------------------------------
        # I. Holding Deletion Protection
        # -------------------------------------------------------------------
        del_res = self.client.delete(f"/api/investments/holdings/{holding_id}", headers={"Authorization": f"Bearer {token_a}"})
        self.assertEqual(del_res.status_code, 400)
        self.assertIn("Cannot delete holding with existing transaction history", del_res.json()["detail"])

        # Verify holding still exists in Supabase DB
        sb_still = self.supabase.table("investment_holdings").select("*").eq("id", holding_id).execute()
        self.assertEqual(len(sb_still.data), 1)

        # Cleanup test holding and transactions from real Supabase DB
        self.supabase.table("investment_transactions").delete().eq("holding_id", holding_id).execute()
        self.supabase.table("investment_holdings").delete().eq("id", holding_id).execute()


if __name__ == "__main__":
    unittest.main()
