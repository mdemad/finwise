"""
halal.py — Phase 5A Halal Foundation, Security Master & Methodology Framework API

Architecture & Scope:
  - Phase 5A implements strictly the read-only foundation for Security Master
    and Shariah Methodology reference data.
  - FinWise does not issue religious rulings; screening is methodology-relative.
  - Data is read from Supabase when configured (primary source of truth).
  - In-memory mock dictionaries are used as a fallback when Supabase is not configured (local dev/tests).
  - All Phase 5A endpoints are public read-only. No anonymous or standard user write routes exist.
"""

from fastapi import APIRouter, HTTPException, Query, status
from typing import List, Optional
from datetime import datetime, timezone, date
import uuid
import threading

from app.models.schemas import (
    SecurityResponse,
    ShariahMethodologyResponse,
    ShariahMethodologyDetailResponse,
    ShariahMethodologyVersionResponse,
    ShariahRuleThresholdResponse,
)
from app.api.auth import _get_supabase_client as _get_supabase_singleton
from app.config import settings

router = APIRouter(prefix="/halal", tags=["halal"])

# ---------------------------------------------------------------------------
# In-memory stores (used when Supabase is unconfigured / local test runs)
# ---------------------------------------------------------------------------
MOCK_SECURITIES: dict[str, dict] = {}
MOCK_METHODOLOGIES: dict[str, dict] = {}
MOCK_METHODOLOGY_VERSIONS: dict[str, dict] = {}
MOCK_RULE_THRESHOLDS: dict[str, dict] = {}
HALAL_LOCK = threading.RLock()


def _supabase_configured() -> bool:
    return bool(settings.SUPABASE_URL and settings.SUPABASE_KEY)


def _get_supabase():
    """Returns the singleton Supabase client shared across all modules."""
    client = _get_supabase_singleton()
    if client is None:
        raise RuntimeError("Supabase client not available")
    return client


# ---------------------------------------------------------------------------
# Seed basic, non-controversial methodology metadata in mock memory
# (Thresholds remain empty until explicitly verified in Phase 5B)
# ---------------------------------------------------------------------------
def _init_mock_methodologies_if_empty():
    with HALAL_LOCK:
        if not MOCK_METHODOLOGIES:
            now = datetime.now(timezone.utc)
            base_methodologies = [
                {
                    "id": "AAOIFI",
                    "name": "AAOIFI Shariah Standard No. 21",
                    "organization": "Accounting and Auditing Organization for Islamic Financial Institutions",
                    "description": "Financial and investment screening standard established by AAOIFI Shariah Board.",
                    "isActive": True,
                    "createdAt": now,
                    "updatedAt": now,
                },
                {
                    "id": "DJIM",
                    "name": "Dow Jones Islamic Market Index Methodology",
                    "organization": "S&P Dow Jones Indices / Shariah Supervisory Board",
                    "description": "Rulebook for screening equities for the Dow Jones Islamic Market Indices.",
                    "isActive": True,
                    "createdAt": now,
                    "updatedAt": now,
                },
                {
                    "id": "MSCI_ISLAMIC",
                    "name": "MSCI Islamic Index Methodology",
                    "organization": "MSCI Inc. / Shariah Advisors",
                    "description": "Methodology for screening securities included in MSCI Islamic Indices.",
                    "isActive": True,
                    "createdAt": now,
                    "updatedAt": now,
                },
                {
                    "id": "FTSE_SHARIAH",
                    "name": "FTSE Global Equity Shariah Index Series",
                    "organization": "FTSE Russell / Yasaar Limited Shariah Consultants",
                    "description": "Methodology for Shariah-compliant global equity index series.",
                    "isActive": True,
                    "createdAt": now,
                    "updatedAt": now,
                },
            ]
            for m in base_methodologies:
                MOCK_METHODOLOGIES[m["id"]] = m


_init_mock_methodologies_if_empty()


# ---------------------------------------------------------------------------
# Row to Schema Mappers
# ---------------------------------------------------------------------------
def _security_row_to_dict(row: dict) -> dict:
    return {
        "id": str(row["id"]),
        "ticker": row["ticker"],
        "isin": row.get("isin"),
        "name": row["name"],
        "assetType": row["asset_type"],
        "exchange": row["exchange"],
        "country": row["country"],
        "currency": row.get("currency", "USD"),
        "sector": row.get("sector"),
        "industry": row.get("industry"),
        "isActive": row.get("is_active", True),
        "createdAt": row.get("created_at"),
        "updatedAt": row.get("updated_at"),
    }


def _methodology_row_to_dict(row: dict) -> dict:
    return {
        "id": row["id"],
        "name": row["name"],
        "organization": row["organization"],
        "description": row["description"],
        "isActive": row.get("is_active", True),
        "createdAt": row.get("created_at"),
        "updatedAt": row.get("updated_at"),
    }


def _version_row_to_dict(row: dict) -> dict:
    return {
        "id": str(row["id"]),
        "methodologyId": row["methodology_id"],
        "versionCode": row["version_code"],
        "releaseDate": str(row["release_date"]),
        "documentationUrl": row.get("documentation_url"),
        "isCurrentDefault": row.get("is_current_default", False),
        "notes": row.get("notes"),
        "createdAt": row.get("created_at"),
        "updatedAt": row.get("updated_at"),
    }


def _rule_row_to_dict(row: dict) -> dict:
    return {
        "id": str(row["id"]),
        "methodologyVersionId": str(row["methodology_version_id"]),
        "ruleType": row["rule_type"],
        "metricName": row["metric_name"],
        "operator": row["operator"],
        "thresholdValue": float(row["threshold_value"]),
        "denominatorType": row.get("denominator_type"),
        "description": row["description"],
        "verifiedBy": row["verified_by"],
        "createdAt": row.get("created_at"),
        "updatedAt": row.get("updated_at"),
    }


# ---------------------------------------------------------------------------
# API Endpoints
# ---------------------------------------------------------------------------

@router.get(
    "/methodologies",
    response_model=List[ShariahMethodologyResponse],
    summary="List supported Shariah screening methodologies",
)
async def list_methodologies(
    include_versions: bool = Query(False, description="Include versions list under each methodology"),
):
    """
    Returns the list of active Shariah methodologies recognized by FinWise.
    Publicly accessible reference metadata.
    """
    if _supabase_configured():
        try:
            supabase = _get_supabase()
            query = supabase.table("shariah_methodologies").select("*").eq("is_active", True)
            res = query.execute()
            items = [_methodology_row_to_dict(r) for r in (res.data or [])]

            if include_versions and items:
                v_res = supabase.table("shariah_methodology_versions").select("*").execute()
                versions_by_meth: dict[str, list] = {}
                for vr in (v_res.data or []):
                    v_dict = _version_row_to_dict(vr)
                    versions_by_meth.setdefault(v_dict["methodologyId"], []).append(v_dict)
                for itm in items:
                    itm["versions"] = versions_by_meth.get(itm["id"], [])
            return items
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to fetch methodologies: {str(e)}",
            )

    # In-memory fallback
    with HALAL_LOCK:
        _init_mock_methodologies_if_empty()
        items = [
            dict(m) for m in MOCK_METHODOLOGIES.values()
            if m.get("isActive", True)
        ]
        if include_versions:
            for itm in items:
                m_versions = [
                    dict(v) for v in MOCK_METHODOLOGY_VERSIONS.values()
                    if v.get("methodologyId") == itm["id"]
                ]
                itm["versions"] = m_versions
        return items


@router.get(
    "/methodologies/{methodology_id}",
    response_model=ShariahMethodologyDetailResponse,
    summary="Get Shariah methodology details with versions and rules",
)
async def get_methodology(methodology_id: str):
    """
    Returns detailed methodology metadata, including all registered versions and their verified rules.
    """
    m_id_upper = methodology_id.upper()

    if _supabase_configured():
        try:
            supabase = _get_supabase()
            m_res = supabase.table("shariah_methodologies").select("*").eq("id", m_id_upper).execute()
            if not m_res.data:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Shariah methodology '{methodology_id}' not found",
                )
            methodology = _methodology_row_to_dict(m_res.data[0])

            # Fetch versions
            v_res = supabase.table("shariah_methodology_versions").select("*").eq("methodology_id", m_id_upper).execute()
            versions = [_version_row_to_dict(vr) for vr in (v_res.data or [])]

            if versions:
                v_ids = [v["id"] for v in versions]
                r_res = supabase.table("shariah_rule_thresholds").select("*").in_("methodology_version_id", v_ids).execute()
                rules_by_v: dict[str, list] = {}
                for rr in (r_res.data or []):
                    r_dict = _rule_row_to_dict(rr)
                    rules_by_v.setdefault(r_dict["methodologyVersionId"], []).append(r_dict)
                for v in versions:
                    v["rules"] = rules_by_v.get(v["id"], [])

            methodology["versions"] = versions
            return methodology
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to fetch methodology: {str(e)}",
            )

    # In-memory fallback
    with HALAL_LOCK:
        _init_mock_methodologies_if_empty()
        if m_id_upper not in MOCK_METHODOLOGIES:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Shariah methodology '{methodology_id}' not found",
            )
        methodology = dict(MOCK_METHODOLOGIES[m_id_upper])
        versions = [
            dict(v) for v in MOCK_METHODOLOGY_VERSIONS.values()
            if v.get("methodologyId") == m_id_upper
        ]
        for v in versions:
            v_id = v["id"]
            v["rules"] = [
                dict(r) for r in MOCK_RULE_THRESHOLDS.values()
                if r.get("methodologyVersionId") == v_id
            ]
        methodology["versions"] = versions
        return methodology


@router.get(
    "/securities",
    response_model=List[SecurityResponse],
    summary="List or search registered securities in the Security Master",
)
async def list_securities(
    ticker: Optional[str] = Query(None, description="Filter by ticker symbol (e.g. AAPL)"),
    isin: Optional[str] = Query(None, description="Filter by exact ISIN"),
    exchange: Optional[str] = Query(None, description="Filter by exchange code (e.g. NASDAQ)"),
    asset_type: Optional[str] = Query(None, description="Filter by asset type (stock, etf, etc.)"),
    is_active: Optional[bool] = Query(True, description="Filter by active status"),
    limit: int = Query(50, ge=1, le=200, description="Max items to return"),
    offset: int = Query(0, ge=0, description="Pagination offset"),
):
    """
    Search and retrieve security master records for screening lookup.
    """
    if _supabase_configured():
        try:
            supabase = _get_supabase()
            query = supabase.table("security_master").select("*")
            if ticker:
                query = query.ilike("ticker", f"%{ticker.strip()}%")
            if isin:
                query = query.eq("isin", isin.strip().upper())
            if exchange:
                query = query.eq("exchange", exchange.strip().upper())
            if asset_type:
                query = query.eq("asset_type", asset_type.strip().lower())
            if is_active is not None:
                query = query.eq("is_active", is_active)

            query = query.order("ticker").range(offset, offset + limit - 1)
            res = query.execute()
            return [_security_row_to_dict(r) for r in (res.data or [])]
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to query securities: {str(e)}",
            )

    # In-memory fallback
    with HALAL_LOCK:
        results = []
        for s in MOCK_SECURITIES.values():
            if is_active is not None and s.get("isActive") != is_active:
                continue
            if ticker and ticker.strip().upper() not in s.get("ticker", "").upper():
                continue
            if isin and isin.strip().upper() != (s.get("isin") or "").upper():
                continue
            if exchange and exchange.strip().upper() != s.get("exchange", "").upper():
                continue
            if asset_type and asset_type.strip().lower() != s.get("assetType", "").lower():
                continue
            results.append(s)

        results.sort(key=lambda x: x.get("ticker", ""))
        paginated = results[offset : offset + limit]
        return paginated


@router.get(
    "/securities/{security_id}",
    response_model=SecurityResponse,
    summary="Get security master record by ID",
)
async def get_security(security_id: str):
    """
    Retrieves a single security master entry by UUID.
    """
    if _supabase_configured():
        try:
            supabase = _get_supabase()
            res = supabase.table("security_master").select("*").eq("id", security_id).execute()
            if not res.data:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Security '{security_id}' not found",
                )
            return _security_row_to_dict(res.data[0])
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to fetch security: {str(e)}",
            )

    # In-memory fallback
    with HALAL_LOCK:
        sec = MOCK_SECURITIES.get(security_id)
        if not sec:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Security '{security_id}' not found",
            )
        return sec
