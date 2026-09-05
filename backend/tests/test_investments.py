import unittest
import unittest.mock
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
from app.api.investments import MOCK_HOLDINGS, MOCK_TRANSACTIONS


class TestInvestmentFoundation(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        MOCK_USERS.clear()
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

    # ---------------------------------------------------------------------------
    # Test 1: Unauthenticated request rejected
    # ---------------------------------------------------------------------------
    def test_1_unauthenticated_request_rejected(self):
        """Unauthenticated requests to holdings, transactions, and summary must return 401."""
        r1 = self.client.get("/api/investments/holdings")
        self.assertEqual(r1.status_code, 401)

        r2 = self.client.post("/api/investments/holdings", json={"symbol": "AAPL", "name": "Apple", "assetType": "stock"})
        self.assertEqual(r2.status_code, 401)

        r3 = self.client.get("/api/investments/transactions")
        self.assertEqual(r3.status_code, 401)

        r4 = self.client.get("/api/investments/summary")
        self.assertEqual(r4.status_code, 401)

    # ---------------------------------------------------------------------------
    # Test 2: User A cannot access User B holdings
    # ---------------------------------------------------------------------------
    def test_2_user_a_cannot_access_user_b_holdings(self):
        """User B cannot view, update, or delete User A's holdings."""
        token_a = self.create_mock_jwt("user-a-111")
        token_b = self.create_mock_jwt("user-b-222")

        # User A creates a holding
        h_res = self.client.post(
            "/api/investments/holdings",
            json={"symbol": "AAPL", "name": "Apple Inc.", "assetType": "stock", "currentPrice": 200.0},
            headers={"Authorization": f"Bearer {token_a}"}
        )
        self.assertEqual(h_res.status_code, 201)
        holding_id = h_res.json()["id"]

        # User B attempts to GET User A's holding -> 404
        get_b = self.client.get(f"/api/investments/holdings/{holding_id}", headers={"Authorization": f"Bearer {token_b}"})
        self.assertEqual(get_b.status_code, 404)

        # User B lists holdings -> sees empty list
        list_b = self.client.get("/api/investments/holdings", headers={"Authorization": f"Bearer {token_b}"})
        self.assertEqual(len(list_b.json()), 0)

        # User B attempts to PUT User A's holding -> 404
        put_b = self.client.put(f"/api/investments/holdings/{holding_id}", json={"name": "Hacked"}, headers={"Authorization": f"Bearer {token_b}"})
        self.assertEqual(put_b.status_code, 404)

        # User B attempts to DELETE User A's holding -> 404
        del_b = self.client.delete(f"/api/investments/holdings/{holding_id}", headers={"Authorization": f"Bearer {token_b}"})
        self.assertEqual(del_b.status_code, 404)

    # ---------------------------------------------------------------------------
    # Test 3: User A cannot access User B transactions
    # ---------------------------------------------------------------------------
    def test_3_user_a_cannot_access_user_b_transactions(self):
        """User B cannot create transactions on User A's holding or list User A's transactions."""
        token_a = self.create_mock_jwt("user-a-111")
        token_b = self.create_mock_jwt("user-b-222")

        # User A creates holding
        h_res = self.client.post(
            "/api/investments/holdings",
            json={"symbol": "MSFT", "name": "Microsoft", "assetType": "stock", "currentPrice": 400.0},
            headers={"Authorization": f"Bearer {token_a}"}
        )
        holding_id = h_res.json()["id"]

        # User B attempts to add a transaction to User A's holding -> 404
        tx_b = self.client.post(
            "/api/investments/transactions",
            json={
                "holdingId": holding_id,
                "transactionType": "BUY",
                "quantity": 10,
                "price": 400.0,
                "fees": 0.0,
                "transactionDate": datetime.now(timezone.utc).isoformat()
            },
            headers={"Authorization": f"Bearer {token_b}"}
        )
        self.assertEqual(tx_b.status_code, 404)

        # User B lists transactions -> sees 0 transactions
        list_tx_b = self.client.get("/api/investments/transactions", headers={"Authorization": f"Bearer {token_b}"})
        self.assertEqual(len(list_tx_b.json()), 0)

    # ---------------------------------------------------------------------------
    # Test 4: BUY updates units and WAC correctly
    # ---------------------------------------------------------------------------
    def test_4_buy_updates_units_and_wac_correctly(self):
        """BUY transactions correctly update unitsHeld and Weighted Average Cost (WAC) including fees."""
        token = self.create_mock_jwt("user-a-111")

        # Create holding
        h_res = self.client.post(
            "/api/investments/holdings",
            json={"symbol": "NVDA", "name": "Nvidia", "assetType": "stock", "currentPrice": 120.0},
            headers={"Authorization": f"Bearer {token}"}
        )
        holding_id = h_res.json()["id"]

        now = datetime.now(timezone.utc).isoformat()

        # Buy 1: 10 units @ $100 + $10 fee -> Cost basis = 1010, WAC = 101.0
        tx1 = self.client.post(
            "/api/investments/transactions",
            json={"holdingId": holding_id, "transactionType": "BUY", "quantity": 10, "price": 100.0, "fees": 10.0, "transactionDate": now},
            headers={"Authorization": f"Bearer {token}"}
        )
        self.assertEqual(tx1.status_code, 201)

        h1 = self.client.get(f"/api/investments/holdings/{holding_id}", headers={"Authorization": f"Bearer {token}"}).json()
        self.assertEqual(h1["unitsHeld"], 10.0)
        self.assertEqual(h1["averageBuyPrice"], 101.0)

        # Buy 2: 10 units @ $200 + $0 fee -> Total Cost = 1010 + 2000 = 3010, Total Units = 20, WAC = 150.5
        tx2 = self.client.post(
            "/api/investments/transactions",
            json={"holdingId": holding_id, "transactionType": "BUY", "quantity": 10, "price": 200.0, "fees": 0.0, "transactionDate": now},
            headers={"Authorization": f"Bearer {token}"}
        )
        self.assertEqual(tx2.status_code, 201)

        h2 = self.client.get(f"/api/investments/holdings/{holding_id}", headers={"Authorization": f"Bearer {token}"}).json()
        self.assertEqual(h2["unitsHeld"], 20.0)
        self.assertEqual(h2["averageBuyPrice"], 150.5)

    # ---------------------------------------------------------------------------
    # Test 5: SELL cannot exceed available units
    # ---------------------------------------------------------------------------
    def test_5_sell_cannot_exceed_available_units(self):
        """Attempting to SELL more units than currently held must be rejected with 400 Bad Request."""
        token = self.create_mock_jwt("user-a-111")

        h_res = self.client.post(
            "/api/investments/holdings",
            json={"symbol": "TSLA", "name": "Tesla", "assetType": "stock", "currentPrice": 200.0},
            headers={"Authorization": f"Bearer {token}"}
        )
        holding_id = h_res.json()["id"]

        now = datetime.now(timezone.utc).isoformat()
        # Buy 5 units
        self.client.post(
            "/api/investments/transactions",
            json={"holdingId": holding_id, "transactionType": "BUY", "quantity": 5, "price": 200.0, "transactionDate": now},
            headers={"Authorization": f"Bearer {token}"}
        )

        # Attempt to sell 10 units -> Expect 400
        sell_err = self.client.post(
            "/api/investments/transactions",
            json={"holdingId": holding_id, "transactionType": "SELL", "quantity": 10, "price": 250.0, "transactionDate": now},
            headers={"Authorization": f"Bearer {token}"}
        )
        self.assertEqual(sell_err.status_code, 400)
        self.assertIn("Insufficient units", sell_err.json()["detail"])

    # ---------------------------------------------------------------------------
    # Test 6: SELL preserves WAC
    # ---------------------------------------------------------------------------
    def test_6_sell_preserves_wac(self):
        """SELL transaction reduces units, preserves WAC, and calculates realized P&L."""
        token = self.create_mock_jwt("user-a-111")

        h_res = self.client.post(
            "/api/investments/holdings",
            json={"symbol": "AMZN", "name": "Amazon", "assetType": "stock", "currentPrice": 180.0},
            headers={"Authorization": f"Bearer {token}"}
        )
        holding_id = h_res.json()["id"]

        now = datetime.now(timezone.utc).isoformat()
        # Buy 10 units @ $100 -> WAC = $100
        self.client.post(
            "/api/investments/transactions",
            json={"holdingId": holding_id, "transactionType": "BUY", "quantity": 10, "price": 100.0, "transactionDate": now},
            headers={"Authorization": f"Bearer {token}"}
        )

        # Sell 4 units @ $150 with $10 fee -> Realized P&L = (150 - 100)*4 - 10 = $190
        sell_res = self.client.post(
            "/api/investments/transactions",
            json={"holdingId": holding_id, "transactionType": "SELL", "quantity": 4, "price": 150.0, "fees": 10.0, "transactionDate": now},
            headers={"Authorization": f"Bearer {token}"}
        )
        self.assertEqual(sell_res.status_code, 201)
        self.assertEqual(sell_res.json()["realizedPnL"], 190.0)

        # Check holding: remaining units = 6, WAC remains 100.0
        h_after = self.client.get(f"/api/investments/holdings/{holding_id}", headers={"Authorization": f"Bearer {token}"}).json()
        self.assertEqual(h_after["unitsHeld"], 6.0)
        self.assertEqual(h_after["averageBuyPrice"], 100.0)

    # ---------------------------------------------------------------------------
    # Test 7: SPLIT updates units and WAC correctly
    # ---------------------------------------------------------------------------
    def test_7_split_updates_units_and_wac_correctly(self):
        """SPLIT transaction adjusts unitsHeld and averageBuyPrice according to split ratio."""
        token = self.create_mock_jwt("user-a-111")

        h_res = self.client.post(
            "/api/investments/holdings",
            json={"symbol": "GOOGL", "name": "Alphabet", "assetType": "stock", "currentPrice": 150.0},
            headers={"Authorization": f"Bearer {token}"}
        )
        holding_id = h_res.json()["id"]

        now = datetime.now(timezone.utc).isoformat()
        # Buy 10 units @ $200 -> WAC = 200
        self.client.post(
            "/api/investments/transactions",
            json={"holdingId": holding_id, "transactionType": "BUY", "quantity": 10, "price": 200.0, "transactionDate": now},
            headers={"Authorization": f"Bearer {token}"}
        )

        # 2:1 Stock Split (price = 2.0 split ratio)
        split_res = self.client.post(
            "/api/investments/transactions",
            json={"holdingId": holding_id, "transactionType": "SPLIT", "quantity": 0, "price": 2.0, "transactionDate": now},
            headers={"Authorization": f"Bearer {token}"}
        )
        self.assertEqual(split_res.status_code, 201)

        # New units = 20, new WAC = 100
        h_split = self.client.get(f"/api/investments/holdings/{holding_id}", headers={"Authorization": f"Bearer {token}"}).json()
        self.assertEqual(h_split["unitsHeld"], 20.0)
        self.assertEqual(h_split["averageBuyPrice"], 100.0)

    # ---------------------------------------------------------------------------
    # Test 8: Transaction cannot be edited or deleted
    # ---------------------------------------------------------------------------
    def test_8_transaction_cannot_be_edited_or_deleted(self):
        """Transactions are append-only. PUT or DELETE calls on transactions route must return 405 Method Not Allowed."""
        token = self.create_mock_jwt("user-a-111")

        h_res = self.client.post(
            "/api/investments/holdings",
            json={"symbol": "ETH", "name": "Ethereum", "assetType": "crypto", "currentPrice": 3000.0},
            headers={"Authorization": f"Bearer {token}"}
        )
        holding_id = h_res.json()["id"]

        now = datetime.now(timezone.utc).isoformat()
        tx_res = self.client.post(
            "/api/investments/transactions",
            json={"holdingId": holding_id, "transactionType": "BUY", "quantity": 1, "price": 3000.0, "transactionDate": now},
            headers={"Authorization": f"Bearer {token}"}
        )
        tx_id = tx_res.json()["id"]

        # Attempt PUT -> 404/405 (No PUT endpoint exists)
        put_res = self.client.put(f"/api/investments/transactions/{tx_id}", json={"quantity": 2}, headers={"Authorization": f"Bearer {token}"})
        self.assertIn(put_res.status_code, [404, 405])

        # Attempt DELETE -> 404/405 (No DELETE endpoint exists)
        del_res = self.client.delete(f"/api/investments/transactions/{tx_id}", headers={"Authorization": f"Bearer {token}"})
        self.assertIn(del_res.status_code, [404, 405])

    # ---------------------------------------------------------------------------
    # Test 9: Holding with transactions cannot be deleted
    # ---------------------------------------------------------------------------
    def test_9_holding_with_transactions_cannot_be_deleted(self):
        """Attempting to delete a holding that has transaction history returns 400 Bad Request."""
        token = self.create_mock_jwt("user-a-111")

        h_res = self.client.post(
            "/api/investments/holdings",
            json={"symbol": "BTC", "name": "Bitcoin", "assetType": "crypto", "currentPrice": 60000.0},
            headers={"Authorization": f"Bearer {token}"}
        )
        holding_id = h_res.json()["id"]

        now = datetime.now(timezone.utc).isoformat()
        self.client.post(
            "/api/investments/transactions",
            json={"holdingId": holding_id, "transactionType": "BUY", "quantity": 0.5, "price": 60000.0, "transactionDate": now},
            headers={"Authorization": f"Bearer {token}"}
        )

        # Attempt to delete holding -> 400 Bad Request
        del_res = self.client.delete(f"/api/investments/holdings/{holding_id}", headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(del_res.status_code, 400)
        self.assertIn("Cannot delete holding with existing transaction history", del_res.json()["detail"])

        # Change status to 'closed' via PUT -> Succeeds
        put_res = self.client.put(f"/api/investments/holdings/{holding_id}", json={"status": "closed"}, headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(put_res.status_code, 200)
        self.assertEqual(put_res.json()["status"], "closed")

    # ---------------------------------------------------------------------------
    # Test 10: External transaction ID prevents duplicate import
    # ---------------------------------------------------------------------------
    def test_10_external_transaction_id_prevents_duplicate_import(self):
        """Inserting a second transaction with matching externalTransactionId returns 409 Conflict."""
        token = self.create_mock_jwt("user-a-111")

        h_res = self.client.post(
            "/api/investments/holdings",
            json={"symbol": "VOO", "name": "Vanguard S&P 500 ETF", "assetType": "etf", "currentPrice": 500.0},
            headers={"Authorization": f"Bearer {token}"}
        )
        holding_id = h_res.json()["id"]

        now = datetime.now(timezone.utc).isoformat()
        ext_tx_id = "zerodha-order-987654"

        # First import -> Succeeds (201)
        tx1 = self.client.post(
            "/api/investments/transactions",
            json={
                "holdingId": holding_id,
                "transactionType": "BUY",
                "quantity": 5,
                "price": 500.0,
                "externalTransactionId": ext_tx_id,
                "transactionDate": now
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        self.assertEqual(tx1.status_code, 201)

        # Duplicate import attempt -> Returns 409 Conflict
        tx2 = self.client.post(
            "/api/investments/transactions",
            json={
                "holdingId": holding_id,
                "transactionType": "BUY",
                "quantity": 5,
                "price": 500.0,
                "externalTransactionId": ext_tx_id,
                "transactionDate": now
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        self.assertEqual(tx2.status_code, 409)
        self.assertIn("already exists", tx2.json()["detail"])

    # ---------------------------------------------------------------------------
    # Test 11: Atomic Supabase RPC invocation
    # ---------------------------------------------------------------------------
    @unittest.mock.patch("supabase.create_client")
    def test_11_atomic_supabase_rpc_invocation(self, mock_create_client):
        """Verifies that Supabase persistence invokes atomic process_investment_transaction RPC function."""
        settings.SUPABASE_URL = "https://test.supabase.co"
        settings.SUPABASE_KEY = "test_key"

        mock_supabase = unittest.mock.MagicMock()
        mock_create_client.return_value = mock_supabase

        token = self.create_mock_jwt("user-rpc-test")
        h_res = self.client.post(
            "/api/investments/holdings",
            json={"symbol": "AAPL", "name": "Apple", "assetType": "stock", "currentPrice": 200.0},
            headers={"Authorization": f"Bearer {token}"}
        )
        holding_id = h_res.json()["id"]

        now = datetime.now(timezone.utc).isoformat()
        tx_res = self.client.post(
            "/api/investments/transactions",
            json={"holdingId": holding_id, "transactionType": "BUY", "quantity": 10, "price": 200.0, "transactionDate": now},
            headers={"Authorization": f"Bearer {token}"}
        )
        self.assertEqual(tx_res.status_code, 201)

        # Verify rpc was called with process_investment_transaction
        mock_supabase.rpc.assert_called_with(
            "process_investment_transaction",
            unittest.mock.ANY
        )
        rpc_call_name = mock_supabase.rpc.call_args[0][0]
        self.assertEqual(rpc_call_name, "process_investment_transaction")

        # Reset settings
        settings.SUPABASE_URL = ""
        settings.SUPABASE_KEY = ""


if __name__ == "__main__":
    unittest.main()

