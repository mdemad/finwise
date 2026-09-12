"""
test_goals.py — Phase 4D Financial Goals Integration Tests

Coverage:
  1.  Goal CRUD (create / read / update / delete)
  2.  Goal ownership isolation — user B cannot read/modify user A's goals
  3.  Holding goal_id persistence (create + update)
  4.  Asset goal_id persistence (create + update)
  5.  Cross-user goal rejection — holding link
  6.  Cross-user goal rejection — asset link
  7.  Delete goal unlinks holdings/assets (in-memory FK cascade)
  8.  Goal progress after BUY
  9.  Goal progress after SELL
  10. Double-counting prevention (mirrored portfolio asset excluded)
  11. target_amount = 0 edge case
  12. Summary endpoint
  13. Status lifecycle (in_progress → achieved → abandoned → in_progress)
"""

import unittest
import jwt
from datetime import datetime, timedelta, timezone
from fastapi.testclient import TestClient
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.main import app
from app.config import settings
from app.api.auth import MOCK_USERS
from app.api.goals import MOCK_GOALS
from app.api.investments import MOCK_HOLDINGS, MOCK_TRANSACTIONS
from app.api.net_worth import MOCK_ASSETS


SECRET = "test_jwt_secret_key_12345678901234567890_32bytes"


class GoalsTestBase(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        MOCK_USERS.clear()
        MOCK_GOALS.clear()
        MOCK_HOLDINGS.clear()
        MOCK_TRANSACTIONS.clear()
        MOCK_ASSETS.clear()

        settings.JWT_SECRET = SECRET
        settings.SUPABASE_JWT_SECRET = SECRET
        # Force in-memory mode for all tests (Supabase not configured in CI)
        settings.SUPABASE_URL = ""
        settings.SUPABASE_KEY = ""

    def jwt(self, user_id: str, email: str = "u@test.com", name: str = "Test") -> str:
        payload = {
            "sub": user_id,
            "email": email,
            "aud": "authenticated",
            "exp": datetime.now(timezone.utc) + timedelta(hours=1),
            "user_metadata": {"name": name, "currency": "USD"},
        }
        return jwt.encode(payload, SECRET, algorithm="HS256")

    def auth(self, user_id: str) -> dict:
        return {"Authorization": f"Bearer {self.jwt(user_id)}"}

    def create_goal(self, user_id: str, **kwargs) -> dict:
        body = {
            "name": kwargs.get("name", "Test Goal"),
            "targetAmount": kwargs.get("targetAmount", 10000),
            "targetDate": kwargs.get("targetDate", "2030-01-01"),
        }
        res = self.client.post("/api/goals", json=body, headers=self.auth(user_id))
        self.assertEqual(res.status_code, 201, res.text)
        return res.json()

    def create_holding(self, user_id: str, **kwargs) -> dict:
        body = {
            "symbol": kwargs.get("symbol", "AAPL"),
            "name": kwargs.get("name", "Apple"),
            "assetType": kwargs.get("assetType", "stock"),
            "currentPrice": kwargs.get("currentPrice", 100),
        }
        if "goalId" in kwargs:
            body["goalId"] = kwargs["goalId"]
        if "initialQuantity" in kwargs:
            body["initialQuantity"] = kwargs["initialQuantity"]
        if "initialPrice" in kwargs:
            body["initialPrice"] = kwargs["initialPrice"]
        res = self.client.post("/api/investments/holdings", json=body, headers=self.auth(user_id))
        self.assertEqual(res.status_code, 201, res.text)
        return res.json()

    def create_asset(self, user_id: str, **kwargs) -> dict:
        body = {
            "name": kwargs.get("name", "Cash"),
            "category": kwargs.get("category", "cash_bank"),
            "currentValue": kwargs.get("currentValue", 1000),
        }
        if "goalId" in kwargs:
            body["goalId"] = kwargs["goalId"]
        if "linkedHoldingId" in kwargs:
            body["linkedHoldingId"] = kwargs["linkedHoldingId"]
        res = self.client.post("/api/net-worth/assets", json=body, headers=self.auth(user_id))
        self.assertEqual(res.status_code, 201, res.text)
        return res.json()

    def buy(self, user_id: str, holding_id: str, qty: float, price: float) -> dict:
        res = self.client.post(
            "/api/investments/transactions",
            json={
                "holdingId": holding_id,
                "transactionType": "BUY",
                "quantity": qty,
                "price": price,
                "transactionDate": "2026-01-01T00:00:00Z",
            },
            headers=self.auth(user_id),
        )
        self.assertEqual(res.status_code, 201, res.text)
        return res.json()

    def sell(self, user_id: str, holding_id: str, qty: float, price: float) -> dict:
        res = self.client.post(
            "/api/investments/transactions",
            json={
                "holdingId": holding_id,
                "transactionType": "SELL",
                "quantity": qty,
                "price": price,
                "transactionDate": "2026-02-01T00:00:00Z",
            },
            headers=self.auth(user_id),
        )
        self.assertEqual(res.status_code, 201, res.text)
        return res.json()

    def get_goals(self, user_id: str) -> list:
        res = self.client.get("/api/goals", headers=self.auth(user_id))
        self.assertEqual(res.status_code, 200, res.text)
        return res.json()


# ---------------------------------------------------------------------------
# Test 1: Goal CRUD
# ---------------------------------------------------------------------------
class TestGoalCRUD(GoalsTestBase):

    def test_create_goal_returns_correct_fields(self):
        g = self.create_goal("user-A", name="House", targetAmount=200000, targetDate="2032-06-01")
        self.assertEqual(g["name"], "House")
        self.assertEqual(g["targetAmount"], 200000.0)
        self.assertEqual(g["targetDate"], "2032-06-01")
        self.assertEqual(g["status"], "in_progress")
        self.assertEqual(g["currentValue"], 0.0)
        self.assertEqual(g["progressPercent"], 0.0)
        self.assertEqual(g["amountRemaining"], 200000.0)
        self.assertIn("id", g)
        self.assertIn("createdAt", g)

    def test_list_goals_returns_only_own(self):
        self.create_goal("user-A")
        self.create_goal("user-A")
        goals_a = self.get_goals("user-A")
        goals_b = self.get_goals("user-B")
        self.assertEqual(len(goals_a), 2)
        self.assertEqual(len(goals_b), 0)

    def test_update_goal(self):
        g = self.create_goal("user-A", name="Old Name", targetAmount=5000)
        res = self.client.put(
            f"/api/goals/{g['id']}",
            json={"name": "New Name", "targetAmount": 9999},
            headers=self.auth("user-A"),
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["name"], "New Name")
        self.assertEqual(res.json()["targetAmount"], 9999.0)

    def test_delete_goal(self):
        g = self.create_goal("user-A")
        res = self.client.delete(f"/api/goals/{g['id']}", headers=self.auth("user-A"))
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(self.get_goals("user-A")), 0)


# ---------------------------------------------------------------------------
# Test 2: Goal ownership isolation
# ---------------------------------------------------------------------------
class TestGoalOwnership(GoalsTestBase):

    def test_user_b_cannot_see_user_a_goal(self):
        self.create_goal("user-A")
        self.assertEqual(len(self.get_goals("user-B")), 0)

    def test_user_b_cannot_update_user_a_goal(self):
        g = self.create_goal("user-A")
        res = self.client.put(
            f"/api/goals/{g['id']}",
            json={"name": "Hacked"},
            headers=self.auth("user-B"),
        )
        self.assertEqual(res.status_code, 403)

    def test_user_b_cannot_delete_user_a_goal(self):
        g = self.create_goal("user-A")
        res = self.client.delete(f"/api/goals/{g['id']}", headers=self.auth("user-B"))
        self.assertEqual(res.status_code, 403)
        # Goal still exists for A
        self.assertEqual(len(self.get_goals("user-A")), 1)


# ---------------------------------------------------------------------------
# Test 3 & 4: goal_id persistence on holdings and assets (in-memory path)
# ---------------------------------------------------------------------------
class TestGoalIdPersistence(GoalsTestBase):

    def test_holding_stores_goal_id(self):
        g = self.create_goal("user-A")
        h = self.create_holding("user-A", goalId=g["id"])
        self.assertEqual(h.get("goalId"), g["id"])
        # Verify via GET
        h2 = self.client.get(f"/api/investments/holdings/{h['id']}", headers=self.auth("user-A")).json()
        self.assertEqual(h2.get("goalId"), g["id"])

    def test_asset_stores_goal_id(self):
        g = self.create_goal("user-A")
        a = self.create_asset("user-A", goalId=g["id"])
        self.assertEqual(a.get("goalId"), g["id"])

    def test_update_holding_goal_id(self):
        g = self.create_goal("user-A")
        h = self.create_holding("user-A")
        self.assertIsNone(h.get("goalId"))
        res = self.client.put(
            f"/api/investments/holdings/{h['id']}",
            json={"goalId": g["id"]},
            headers=self.auth("user-A"),
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["goalId"], g["id"])

    def test_update_asset_goal_id(self):
        g = self.create_goal("user-A")
        a = self.create_asset("user-A")
        self.assertIsNone(a.get("goalId"))
        res = self.client.put(
            f"/api/net-worth/assets/{a['id']}",
            json={"goalId": g["id"]},
            headers=self.auth("user-A"),
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["goalId"], g["id"])


# ---------------------------------------------------------------------------
# Test 5 & 6: Cross-user goal rejection
# ---------------------------------------------------------------------------
class TestCrossUserGoalRejection(GoalsTestBase):

    def test_holding_cross_user_goal_rejected(self):
        g_a = self.create_goal("user-A")
        res = self.client.post(
            "/api/investments/holdings",
            json={"symbol": "X", "name": "X", "assetType": "stock", "currentPrice": 10, "goalId": g_a["id"]},
            headers=self.auth("user-B"),
        )
        self.assertEqual(res.status_code, 403)

    def test_asset_cross_user_goal_rejected(self):
        g_a = self.create_goal("user-A")
        res = self.client.post(
            "/api/net-worth/assets",
            json={"name": "X", "category": "cash_bank", "currentValue": 100, "goalId": g_a["id"]},
            headers=self.auth("user-B"),
        )
        self.assertEqual(res.status_code, 403)

    def test_update_holding_cross_user_goal_rejected(self):
        g_a = self.create_goal("user-A")
        h_b = self.create_holding("user-B")
        res = self.client.put(
            f"/api/investments/holdings/{h_b['id']}",
            json={"goalId": g_a["id"]},
            headers=self.auth("user-B"),
        )
        self.assertEqual(res.status_code, 403)

    def test_update_asset_cross_user_goal_rejected(self):
        g_a = self.create_goal("user-A")
        a_b = self.create_asset("user-B")
        res = self.client.put(
            f"/api/net-worth/assets/{a_b['id']}",
            json={"goalId": g_a["id"]},
            headers=self.auth("user-B"),
        )
        self.assertEqual(res.status_code, 403)


# ---------------------------------------------------------------------------
# Test 7: Delete goal unlinks holdings and assets
# ---------------------------------------------------------------------------
class TestDeleteGoalUnlinks(GoalsTestBase):

    def test_delete_goal_unlinks_holding(self):
        g = self.create_goal("user-A")
        h = self.create_holding("user-A", goalId=g["id"])
        self.client.delete(f"/api/goals/{g['id']}", headers=self.auth("user-A"))
        h2 = self.client.get(f"/api/investments/holdings/{h['id']}", headers=self.auth("user-A")).json()
        self.assertIsNone(h2.get("goalId"))

    def test_delete_goal_unlinks_asset(self):
        g = self.create_goal("user-A")
        a = self.create_asset("user-A", goalId=g["id"])
        self.client.delete(f"/api/goals/{g['id']}", headers=self.auth("user-A"))
        assets = self.client.get("/api/net-worth/assets?include_portfolio=false", headers=self.auth("user-A")).json()
        manual = [x for x in assets if x["id"] == a["id"]]
        self.assertEqual(len(manual), 1)
        self.assertIsNone(manual[0].get("goalId"))

    def test_delete_goal_holding_still_exists(self):
        g = self.create_goal("user-A")
        h = self.create_holding("user-A", goalId=g["id"])
        self.client.delete(f"/api/goals/{g['id']}", headers=self.auth("user-A"))
        h2 = self.client.get(f"/api/investments/holdings/{h['id']}", headers=self.auth("user-A"))
        self.assertEqual(h2.status_code, 200)


# ---------------------------------------------------------------------------
# Test 8 & 9: Progress after BUY/SELL
# ---------------------------------------------------------------------------
class TestGoalProgress(GoalsTestBase):

    def test_progress_after_buy(self):
        g = self.create_goal("user-A", targetAmount=50000)
        h = self.create_holding("user-A", goalId=g["id"], currentPrice=200)
        self.buy("user-A", h["id"], qty=100, price=200)  # 100 * 200 = 20000

        goals = self.get_goals("user-A")
        self.assertEqual(goals[0]["currentValue"], 20000.0)
        self.assertEqual(goals[0]["progressPercent"], 40.0)
        self.assertEqual(goals[0]["amountRemaining"], 30000.0)

    def test_progress_after_sell(self):
        g = self.create_goal("user-A", targetAmount=50000)
        h = self.create_holding("user-A", goalId=g["id"], currentPrice=200)
        self.buy("user-A", h["id"], qty=100, price=200)
        self.sell("user-A", h["id"], qty=50, price=200)   # 50 * 200 = 10000 remaining

        goals = self.get_goals("user-A")
        self.assertEqual(goals[0]["currentValue"], 10000.0)
        self.assertEqual(goals[0]["progressPercent"], 20.0)

    def test_closed_holding_excluded_from_progress(self):
        g = self.create_goal("user-A", targetAmount=50000)
        h = self.create_holding("user-A", goalId=g["id"], currentPrice=200)
        self.buy("user-A", h["id"], qty=100, price=200)

        self.client.put(
            f"/api/investments/holdings/{h['id']}",
            json={"status": "closed"},
            headers=self.auth("user-A"),
        )

        goals = self.get_goals("user-A")
        self.assertEqual(goals[0]["currentValue"], 0.0)


# ---------------------------------------------------------------------------
# Test 10: Double-counting prevention
# ---------------------------------------------------------------------------
class TestDoubleCountingPrevention(GoalsTestBase):

    def test_mirrored_asset_excluded(self):
        g = self.create_goal("user-A", targetAmount=10000)
        goal_id = g["id"]

        # Manual asset NOT linked to a holding → should be included
        self.create_asset("user-A", name="Cash", currentValue=2000, goalId=goal_id)

        # Portfolio holding → should be included
        h = self.create_holding(
            "user-A", symbol="BTC", currentPrice=30000, goalId=goal_id,
            initialQuantity=0.1, initialPrice=30000
        )

        # Mirrored asset with linkedHoldingId set → MUST be excluded (double-count guard)
        self.create_asset(
            "user-A",
            name="BTC Mirror",
            currentValue=3000,
            goalId=goal_id,
            linkedHoldingId=h["id"],
        )

        goals = self.get_goals("user-A")
        # manual 2000 + holding 3000 = 5000 ; mirror excluded
        self.assertEqual(goals[0]["currentValue"], 5000.0)


# ---------------------------------------------------------------------------
# Test 11: target_amount = 0 edge case
# ---------------------------------------------------------------------------
class TestTargetZeroSafe(GoalsTestBase):

    def test_zero_target_amount(self):
        g = self.create_goal("user-A", targetAmount=0)
        self.assertEqual(g["progressPercent"], 0.0)
        self.assertEqual(g["amountRemaining"], 0.0)


# ---------------------------------------------------------------------------
# Test 12: Summary endpoint
# ---------------------------------------------------------------------------
class TestGoalsSummary(GoalsTestBase):

    def test_summary_structure(self):
        self.create_goal("user-A", targetAmount=10000)
        self.create_goal("user-A", targetAmount=20000)
        res = self.client.get("/api/goals/summary", headers=self.auth("user-A"))
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("totalTargetAmount", data)
        self.assertIn("totalCurrentValue", data)
        self.assertIn("overallProgressPercent", data)
        self.assertIn("goalCount", data)
        self.assertEqual(data["goalCount"], 2)
        self.assertEqual(data["totalTargetAmount"], 30000.0)

    def test_summary_empty(self):
        res = self.client.get("/api/goals/summary", headers=self.auth("user-A"))
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["goalCount"], 0)
        self.assertEqual(data["totalTargetAmount"], 0.0)
        self.assertIsNone(data["closestGoalId"])

    def test_summary_closest_goal(self):
        g1 = self.create_goal("user-A", name="G1", targetAmount=10000)
        g2 = self.create_goal("user-A", name="G2", targetAmount=10000)
        # Link a holding only to G2 → G2 has higher progress
        h = self.create_holding("user-A", goalId=g2["id"], currentPrice=5000)
        self.buy("user-A", h["id"], qty=1, price=5000)

        res = self.client.get("/api/goals/summary", headers=self.auth("user-A"))
        data = res.json()
        self.assertEqual(data["closestGoalId"], g2["id"])
        self.assertEqual(data["closestGoalProgress"], 50.0)


# ---------------------------------------------------------------------------
# Test 13: Status lifecycle
# ---------------------------------------------------------------------------
class TestStatusLifecycle(GoalsTestBase):

    def test_status_transitions(self):
        g = self.create_goal("user-A")
        self.assertEqual(g["status"], "in_progress")

        # → achieved
        res = self.client.put(
            f"/api/goals/{g['id']}",
            json={"status": "achieved"},
            headers=self.auth("user-A"),
        )
        self.assertEqual(res.json()["status"], "achieved")

        # → abandoned
        res = self.client.put(
            f"/api/goals/{g['id']}",
            json={"status": "abandoned"},
            headers=self.auth("user-A"),
        )
        self.assertEqual(res.json()["status"], "abandoned")

        # → back to in_progress
        res = self.client.put(
            f"/api/goals/{g['id']}",
            json={"status": "in_progress"},
            headers=self.auth("user-A"),
        )
        self.assertEqual(res.json()["status"], "in_progress")


if __name__ == "__main__":
    unittest.main()
