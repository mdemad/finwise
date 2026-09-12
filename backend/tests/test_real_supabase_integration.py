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

    def test_real_supabase_goals_full_flow(self):
        """Executes full Phase 4D Financial Goals flow against real Supabase DB."""
        # 1. Inspect schema availability: confirm migration 002 has been applied
        try:
            self.supabase.table("financial_goals").select("id").limit(1).execute()
        except Exception as e:
            raise unittest.SkipTest(
                f"Skipping real Supabase goals test: 'financial_goals' table does not exist or migration 002 has not been applied yet. Detail: {e}"
            )

        user_a_id = str(uuid.uuid4())
        user_b_id = str(uuid.uuid4())
        token_a = self.create_mock_jwt(user_a_id, f"usera-goal-{user_a_id[:8]}@sbtest.com", "Goal User A")
        token_b = self.create_mock_jwt(user_b_id, f"userb-goal-{user_b_id[:8]}@sbtest.com", "Goal User B")

        created_goal_ids = []
        created_holding_ids = []
        created_asset_ids = []

        try:
            # -------------------------------------------------------------------
            # A. Create Financial Goal in Supabase
            # -------------------------------------------------------------------
            g_res = self.client.post(
                "/api/goals",
                json={
                    "name": "Retirement Villa Fund",
                    "targetAmount": 100000.0,
                    "targetDate": "2030-12-31",
                    "currency": "USD",
                    "status": "in_progress",
                    "notes": "Real Supabase Goal Test"
                },
                headers={"Authorization": f"Bearer {token_a}"}
            )
            self.assertEqual(g_res.status_code, 201, f"Goal creation failed: {g_res.text}")
            goal_a = g_res.json()
            goal_a_id = goal_a["id"]
            created_goal_ids.append(goal_a_id)

            # Verify directly in Supabase financial_goals table
            sb_goal = self.supabase.table("financial_goals").select("*").eq("id", goal_a_id).execute()
            self.assertEqual(len(sb_goal.data), 1)
            self.assertEqual(sb_goal.data[0]["name"], "Retirement Villa Fund")
            self.assertEqual(float(sb_goal.data[0]["target_amount"]), 100000.0)
            self.assertEqual(sb_goal.data[0]["user_id"], user_a_id)

            # -------------------------------------------------------------------
            # B. Read Goal back from Supabase
            # -------------------------------------------------------------------
            get_res = self.client.get("/api/goals", headers={"Authorization": f"Bearer {token_a}"})
            self.assertEqual(get_res.status_code, 200)
            goals_list = get_res.json()
            self.assertTrue(any(g["id"] == goal_a_id for g in goals_list))

            # -------------------------------------------------------------------
            # C. Update Goal and verify persistence in Supabase
            # -------------------------------------------------------------------
            up_res = self.client.put(
                f"/api/goals/{goal_a_id}",
                json={
                    "name": "Updated Villa Fund",
                    "targetAmount": 120000.0
                },
                headers={"Authorization": f"Bearer {token_a}"}
            )
            self.assertEqual(up_res.status_code, 200)
            sb_up_goal = self.supabase.table("financial_goals").select("*").eq("id", goal_a_id).execute()
            self.assertEqual(sb_up_goal.data[0]["name"], "Updated Villa Fund")
            self.assertEqual(float(sb_up_goal.data[0]["target_amount"]), 120000.0)

            # -------------------------------------------------------------------
            # D. Create Investment Holding linked to Goal and verify Supabase goal_id
            # -------------------------------------------------------------------
            h_res = self.client.post(
                "/api/investments/holdings",
                json={
                    "symbol": "GOALETF",
                    "name": "Goal Linked ETF",
                    "assetType": "etf",
                    "currentPrice": 200.0,
                    "currency": "USD",
                    "goalId": goal_a_id
                },
                headers={"Authorization": f"Bearer {token_a}"}
            )
            self.assertEqual(h_res.status_code, 201)
            holding_id = h_res.json()["id"]
            created_holding_ids.append(holding_id)

            # Verify goal_id stored in Supabase investment_holdings
            sb_h = self.supabase.table("investment_holdings").select("*").eq("id", holding_id).execute()
            self.assertEqual(len(sb_h.data), 1)
            self.assertEqual(sb_h.data[0]["goal_id"], goal_a_id)

            # Add BUY transaction: 10 units @ $200 = $2,000 market value
            now_str = datetime.now(timezone.utc).isoformat()
            tx_res = self.client.post(
                "/api/investments/transactions",
                json={
                    "holdingId": holding_id,
                    "transactionType": "BUY",
                    "quantity": 10.0,
                    "price": 200.0,
                    "transactionDate": now_str
                },
                headers={"Authorization": f"Bearer {token_a}"}
            )
            self.assertEqual(tx_res.status_code, 201)

            # -------------------------------------------------------------------
            # E. Update Holding goal_id and verify persistence
            # -------------------------------------------------------------------
            # Unlink
            self.client.put(
                f"/api/investments/holdings/{holding_id}",
                json={"goalId": None},
                headers={"Authorization": f"Bearer {token_a}"}
            )
            sb_h_unlinked = self.supabase.table("investment_holdings").select("goal_id").eq("id", holding_id).execute()
            self.assertIsNone(sb_h_unlinked.data[0]["goal_id"])

            # Relink back to goal
            self.client.put(
                f"/api/investments/holdings/{holding_id}",
                json={"goalId": goal_a_id},
                headers={"Authorization": f"Bearer {token_a}"}
            )
            sb_h_relinked = self.supabase.table("investment_holdings").select("goal_id").eq("id", holding_id).execute()
            self.assertEqual(sb_h_relinked.data[0]["goal_id"], goal_a_id)

            # -------------------------------------------------------------------
            # F. Create Manual User Asset linked to Goal and verify Supabase goal_id
            # -------------------------------------------------------------------
            a_res = self.client.post(
                "/api/net-worth/assets",
                json={
                    "name": "Goal Fixed Deposit",
                    "category": "cash",
                    "currentValue": 8000.0,
                    "currency": "USD",
                    "goalId": goal_a_id
                },
                headers={"Authorization": f"Bearer {token_a}"}
            )
            self.assertEqual(a_res.status_code, 201)
            asset_id = a_res.json()["id"]
            created_asset_ids.append(asset_id)

            sb_asset = self.supabase.table("user_assets").select("*").eq("id", asset_id).execute()
            self.assertEqual(len(sb_asset.data), 1)
            self.assertEqual(sb_asset.data[0]["goal_id"], goal_a_id)

            # -------------------------------------------------------------------
            # G. Verify Goal Progress using actual Supabase Data
            # -------------------------------------------------------------------
            # Holding value ($2,000) + Manual asset ($8,000) = $10,000 total current value
            # Target = $120,000 -> Progress = 10,000 / 120,000 = 8.33%
            check_goals = self.client.get("/api/goals", headers={"Authorization": f"Bearer {token_a}"}).json()
            matched = next(g for g in check_goals if g["id"] == goal_a_id)
            self.assertEqual(matched["currentValue"], 10000.0)
            self.assertEqual(matched["progressPercent"], 8.33)
            self.assertEqual(matched["amountRemaining"], 110000.0)

            # -------------------------------------------------------------------
            # H. Verify Mirrored Portfolio Asset is not Double-Counted
            # -------------------------------------------------------------------
            # Mirrored asset linked to holding and linked to goal
            mirror_res = self.client.post(
                "/api/net-worth/assets",
                json={
                    "name": "Mirrored Asset",
                    "category": "stocks",
                    "currentValue": 2000.0,
                    "linkedHoldingId": holding_id,
                    "goalId": goal_a_id,
                    "currency": "USD"
                },
                headers={"Authorization": f"Bearer {token_a}"}
            )
            if mirror_res.status_code == 201:
                created_asset_ids.append(mirror_res.json()["id"])
            check_goals2 = self.client.get("/api/goals", headers={"Authorization": f"Bearer {token_a}"}).json()
            matched2 = next(g for g in check_goals2 if g["id"] == goal_a_id)
            # Must remain 10000.0, NOT 12000.0
            self.assertEqual(matched2["currentValue"], 10000.0)

            # -------------------------------------------------------------------
            # J. Verify Cross-User Goal Isolation
            # -------------------------------------------------------------------
            # User B creates a goal
            g_b_res = self.client.post(
                "/api/goals",
                json={
                    "name": "User B Goal",
                    "targetAmount": 50000.0,
                    "targetDate": "2030-01-01"
                },
                headers={"Authorization": f"Bearer {token_b}"}
            )
            self.assertEqual(g_b_res.status_code, 201)
            goal_b_id = g_b_res.json()["id"]
            created_goal_ids.append(goal_b_id)

            # User A cannot view User B's goal
            user_a_list = self.client.get("/api/goals", headers={"Authorization": f"Bearer {token_a}"}).json()
            self.assertFalse(any(g["id"] == goal_b_id for g in user_a_list))

            # User A cannot update User B's goal
            up_b_res = self.client.put(
                f"/api/goals/{goal_b_id}",
                json={"name": "Hacked Goal"},
                headers={"Authorization": f"Bearer {token_a}"}
            )
            self.assertIn(up_b_res.status_code, [403, 404])

            # User A cannot link a holding to User B's goal -> 403 Forbidden
            cross_link_res = self.client.post(
                "/api/investments/holdings",
                json={
                    "symbol": "CROSSSTK",
                    "name": "Cross Holding",
                    "assetType": "stock",
                    "currentPrice": 100.0,
                    "goalId": goal_b_id
                },
                headers={"Authorization": f"Bearer {token_a}"}
            )
            self.assertEqual(cross_link_res.status_code, 403)

            # -------------------------------------------------------------------
            # I. Delete Goal and Verify Unlinking in Supabase
            # -------------------------------------------------------------------
            del_res = self.client.delete(f"/api/goals/{goal_a_id}", headers={"Authorization": f"Bearer {token_a}"})
            self.assertEqual(del_res.status_code, 200)

            # Verify goal deleted in Supabase
            sb_del = self.supabase.table("financial_goals").select("*").eq("id", goal_a_id).execute()
            self.assertEqual(len(sb_del.data), 0)

            # Verify holding still exists in Supabase, but goal_id is NULL
            sb_h_after = self.supabase.table("investment_holdings").select("*").eq("id", holding_id).execute()
            self.assertEqual(len(sb_h_after.data), 1)
            self.assertIsNone(sb_h_after.data[0]["goal_id"])

            # Verify asset still exists in Supabase, but goal_id is NULL
            sb_a_after = self.supabase.table("user_assets").select("*").eq("id", asset_id).execute()
            self.assertEqual(len(sb_a_after.data), 1)
            self.assertIsNone(sb_a_after.data[0]["goal_id"])

        finally:
            # -------------------------------------------------------------------
            # K. Cleanup ALL test data in try/finally
            # -------------------------------------------------------------------
            for hid in created_holding_ids:
                try:
                    self.supabase.table("investment_transactions").delete().eq("holding_id", hid).execute()
                    self.supabase.table("investment_holdings").delete().eq("id", hid).execute()
                except Exception:
                    pass

            for aid in created_asset_ids:
                try:
                    self.supabase.table("user_assets").delete().eq("id", aid).execute()
                except Exception:
                    pass

            for gid in created_goal_ids:
                try:
                    self.supabase.table("financial_goals").delete().eq("id", gid).execute()
                except Exception:
                    pass


if __name__ == "__main__":
    unittest.main()

