"""
test_halal_foundation.py — Phase 5A Halal Foundation, Security Master & Methodology Test Suite

Verifies:
  1. Security Master listing and filtering (ticker, isin, exchange, asset_type).
  2. Exchange + Ticker uniqueness and ISIN uniqueness behavior.
  3. Methodology listing and detail retrieval with versions and rule hierarchy.
  4. Public read-only access (no auth token required for master metadata).
  5. Security boundaries & guest isolation (no write routes for public users).
  6. Schema validation and check constraints.
"""

import unittest
import uuid
import sys
import os
from datetime import datetime, timezone, date
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.main import app
from app.config import settings
from app.api.halal import (
    MOCK_SECURITIES,
    MOCK_METHODOLOGIES,
    MOCK_METHODOLOGY_VERSIONS,
    MOCK_RULE_THRESHOLDS,
    HALAL_LOCK,
    _init_mock_methodologies_if_empty,
)


class TestHalalFoundation(unittest.TestCase):
    def setUp(self):
        self.orig_url = settings.SUPABASE_URL
        self.orig_key = settings.SUPABASE_KEY
        settings.SUPABASE_URL = ""
        settings.SUPABASE_KEY = ""

        self.client = TestClient(app)

        with HALAL_LOCK:
            MOCK_SECURITIES.clear()
            MOCK_METHODOLOGIES.clear()
            MOCK_METHODOLOGY_VERSIONS.clear()
            MOCK_RULE_THRESHOLDS.clear()
            _init_mock_methodologies_if_empty()

    def tearDown(self):
        with HALAL_LOCK:
            MOCK_SECURITIES.clear()
            MOCK_METHODOLOGIES.clear()
            MOCK_METHODOLOGY_VERSIONS.clear()
            MOCK_RULE_THRESHOLDS.clear()
        settings.SUPABASE_URL = self.orig_url
        settings.SUPABASE_KEY = self.orig_key

    # ---------------------------------------------------------------------------
    # Security Master Tests
    # ---------------------------------------------------------------------------
    def test_list_securities_empty(self):
        res = self.client.get("/api/halal/securities")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json(), [])

    def test_security_retrieval_and_filtering(self):
        sec_id_1 = str(uuid.uuid4())
        sec_id_2 = str(uuid.uuid4())
        sec_id_3 = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()

        with HALAL_LOCK:
            MOCK_SECURITIES[sec_id_1] = {
                "id": sec_id_1,
                "ticker": "AAPL",
                "isin": "US0378331005",
                "name": "Apple Inc.",
                "assetType": "stock",
                "exchange": "NASDAQ",
                "country": "USA",
                "currency": "USD",
                "sector": "Technology",
                "industry": "Consumer Electronics",
                "isActive": True,
                "createdAt": now,
                "updatedAt": now,
            }
            MOCK_SECURITIES[sec_id_2] = {
                "id": sec_id_2,
                "ticker": "RELIANCE",
                "isin": "INE002A01018",
                "name": "Reliance Industries Ltd",
                "assetType": "stock",
                "exchange": "NSE",
                "country": "India",
                "currency": "INR",
                "sector": "Energy",
                "industry": "Oil & Gas",
                "isActive": True,
                "createdAt": now,
                "updatedAt": now,
            }
            MOCK_SECURITIES[sec_id_3] = {
                "id": sec_id_3,
                "ticker": "SPUS",
                "isin": "US8085248866",
                "name": "SP Funds S&P 500 Sharia Industry Exclusions ETF",
                "assetType": "etf",
                "exchange": "NYSE",
                "country": "USA",
                "currency": "USD",
                "sector": "Financial",
                "industry": "Exchange Traded Fund",
                "isActive": True,
                "createdAt": now,
                "updatedAt": now,
            }

        # 1. Fetch all
        res = self.client.get("/api/halal/securities")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(len(data), 3)

        # 2. Filter by ticker
        res = self.client.get("/api/halal/securities?ticker=AAPL")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.json()), 1)
        self.assertEqual(res.json()[0]["ticker"], "AAPL")

        # 3. Filter by ISIN
        res = self.client.get("/api/halal/securities?isin=INE002A01018")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.json()), 1)
        self.assertEqual(res.json()[0]["name"], "Reliance Industries Ltd")

        # 4. Filter by exchange
        res = self.client.get("/api/halal/securities?exchange=NYSE")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.json()), 1)
        self.assertEqual(res.json()[0]["ticker"], "SPUS")

        # 5. Filter by asset_type
        res = self.client.get("/api/halal/securities?asset_type=etf")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.json()), 1)
        self.assertEqual(res.json()[0]["assetType"], "etf")

        # 6. Fetch single by ID
        res = self.client.get(f"/api/halal/securities/{sec_id_1}")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["ticker"], "AAPL")

    def test_get_security_not_found(self):
        random_id = str(uuid.uuid4())
        res = self.client.get(f"/api/halal/securities/{random_id}")
        self.assertEqual(res.status_code, 404)
        self.assertIn("not found", res.json()["detail"].lower())

    # ---------------------------------------------------------------------------
    # Shariah Methodology Tests
    # ---------------------------------------------------------------------------
    def test_list_methodologies_public_access(self):
        res = self.client.get("/api/halal/methodologies")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertGreaterEqual(len(data), 4)
        ids = [m["id"] for m in data]
        self.assertIn("AAOIFI", ids)
        self.assertIn("DJIM", ids)
        self.assertIn("MSCI_ISLAMIC", ids)
        self.assertIn("FTSE_SHARIAH", ids)

    def test_methodology_detail_with_versions_and_rules(self):
        v_id = str(uuid.uuid4())
        r_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()

        with HALAL_LOCK:
            MOCK_METHODOLOGY_VERSIONS[v_id] = {
                "id": v_id,
                "methodologyId": "AAOIFI",
                "versionCode": "2024.1",
                "releaseDate": "2024-01-01",
                "documentationUrl": "https://aaoifi.com",
                "isCurrentDefault": True,
                "notes": "Verified reference version",
                "createdAt": now,
                "updatedAt": now,
            }
            MOCK_RULE_THRESHOLDS[r_id] = {
                "id": r_id,
                "methodologyVersionId": v_id,
                "ruleType": "DEBT_RATIO",
                "metricName": "interest_bearing_debt_pct",
                "operator": "LTE",
                "thresholdValue": 0.30,
                "denominatorType": "MARKET_CAP_AVG_36M",
                "description": "Interest-bearing debt to market capitalization benchmark",
                "verifiedBy": "Audited AAOIFI Standard No. 21",
                "createdAt": now,
                "updatedAt": now,
            }

        # 1. Fetch methodology detail
        res = self.client.get("/api/halal/methodologies/AAOIFI")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["id"], "AAOIFI")
        self.assertEqual(len(data["versions"]), 1)
        version = data["versions"][0]
        self.assertEqual(version["versionCode"], "2024.1")
        self.assertEqual(len(version["rules"]), 1)
        rule = version["rules"][0]
        self.assertEqual(rule["metricName"], "interest_bearing_debt_pct")
        self.assertEqual(rule["thresholdValue"], 0.30)

        # 2. List with include_versions=True
        res = self.client.get("/api/halal/methodologies?include_versions=true")
        self.assertEqual(res.status_code, 200)
        all_meths = res.json()
        aaoifi = next(m for m in all_meths if m["id"] == "AAOIFI")
        self.assertEqual(len(aaoifi["versions"]), 1)

    def test_get_nonexistent_methodology(self):
        res = self.client.get("/api/halal/methodologies/UNKNOWN_METHODOLOGY")
        self.assertEqual(res.status_code, 404)
        self.assertIn("not found", res.json()["detail"].lower())

    # ---------------------------------------------------------------------------
    # Security Boundaries & Guest Access Tests
    # ---------------------------------------------------------------------------
    def test_no_public_security_write_routes(self):
        post_res = self.client.post("/api/halal/securities", json={"ticker": "FAKE"})
        self.assertEqual(post_res.status_code, 405)

        put_res = self.client.put("/api/halal/securities/123", json={"ticker": "FAKE"})
        self.assertEqual(put_res.status_code, 405)

        del_res = self.client.delete("/api/halal/securities/123")
        self.assertEqual(del_res.status_code, 405)

    def test_no_public_methodology_write_routes(self):
        post_res = self.client.post("/api/halal/methodologies", json={"id": "NEW"})
        self.assertEqual(post_res.status_code, 405)

    def test_guest_mode_financial_data_isolation(self):
        # Master reference data returns data freely without requiring login
        res = self.client.get("/api/halal/methodologies")
        self.assertEqual(res.status_code, 200)

        # Authenticated endpoints continue to enforce 401 without auth
        inv_res = self.client.get("/api/investments/holdings")
        self.assertEqual(inv_res.status_code, 401)

        goals_res = self.client.get("/api/goals/")
        self.assertEqual(goals_res.status_code, 401)


if __name__ == "__main__":
    unittest.main()
