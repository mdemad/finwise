"""
goals.py — Phase 4D Financial Goals API

Persistence strategy:
  - When SUPABASE_URL + SUPABASE_KEY are configured, Supabase is the
    PRIMARY store. All reads and writes go to the database first.
    Failures raise HTTP 5xx — they are NOT silently swallowed.
  - When Supabase is NOT configured (local dev/test), MOCK_GOALS
    (in-memory dict) is used as the only store.

Ownership is always enforced from the authenticated JWT user_id.
The frontend-supplied user_id is never trusted.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from app.models.schemas import GoalCreate, GoalUpdate, GoalResponse
from app.api.auth import get_current_user
from app.config import settings
from datetime import datetime, timezone, date
import uuid
import threading

router = APIRouter(prefix="/goals", tags=["goals"])

# ---------------------------------------------------------------------------
# In-memory fallback store (used ONLY when Supabase is not configured)
# ---------------------------------------------------------------------------
MOCK_GOALS: dict[str, dict] = {}
GOALS_LOCK = threading.Lock()


def _supabase_configured() -> bool:
    return bool(settings.SUPABASE_URL and settings.SUPABASE_KEY)


def _get_supabase():
    from supabase import create_client
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)


def _row_to_dict(row: dict) -> dict:
    """Map Supabase snake_case row → camelCase in-memory dict."""
    return {
        "id": str(row["id"]),
        "userId": str(row["user_id"]),
        "name": row["name"],
        "targetAmount": float(row["target_amount"]),
        "targetDate": str(row["target_date"]),
        "currency": row.get("currency", "USD"),
        "status": row.get("status", "in_progress"),
        "notes": row.get("notes"),
        "createdAt": row.get("created_at"),
        "updatedAt": row.get("updated_at"),
    }


def _enrich_goal(goal: dict, holdings_snapshot: list, assets_snapshot: list) -> GoalResponse:
    """
    Compute dynamic progress fields from live holdings and assets.
    Double-counting is prevented: manual assets with a linkedHoldingId are
    excluded (the portfolio holding already contributes its market value).
    """
    target_amount = float(goal["targetAmount"])
    user_id = goal["userId"]
    goal_id = goal["id"]
    current_value = 0.0

    # 1. Active portfolio holdings linked to this goal
    for h in holdings_snapshot:
        if (
            str(h.get("userId") or h.get("user_id", "")) == user_id
            and str(h.get("goalId") or h.get("goal_id") or "") == goal_id
            and h.get("status", "active") == "active"
        ):
            units = float(h.get("unitsHeld") or h.get("units_held") or 0)
            price = float(h.get("currentPrice") or h.get("current_price") or 0)
            if units > 0 and price > 0:
                current_value += units * price

    # 2. Manual assets linked to this goal, excluding mirrored portfolio holdings
    for a in assets_snapshot:
        a_user = str(a.get("userId") or a.get("user_id", ""))
        a_goal = str(a.get("goalId") or a.get("goal_id") or "")
        a_linked = a.get("linkedHoldingId") or a.get("linked_holding_id")
        if a_user == user_id and a_goal == goal_id and not a_linked:
            current_value += float(a.get("currentValue") or a.get("current_value") or 0)

    progress_percent = min(100.0, (current_value / target_amount) * 100) if target_amount > 0 else 0.0
    amount_remaining = max(0.0, target_amount - current_value)

    # Days remaining
    days_remaining = 0
    overdue = False
    try:
        td = goal["targetDate"]
        if isinstance(td, str):
            target_date_obj = datetime.strptime(td[:10], "%Y-%m-%d").date()
        else:
            target_date_obj = td
        delta = (target_date_obj - date.today()).days
        if delta < 0:
            overdue = True
            days_remaining = delta  # negative = how many days overdue
        else:
            days_remaining = delta
    except Exception:
        pass

    created = goal.get("createdAt") or datetime.now(timezone.utc)
    updated = goal.get("updatedAt") or datetime.now(timezone.utc)
    if isinstance(created, str):
        created = datetime.fromisoformat(created.replace("Z", "+00:00"))
    if isinstance(updated, str):
        updated = datetime.fromisoformat(updated.replace("Z", "+00:00"))

    return GoalResponse(
        id=goal_id,
        userId=user_id,
        name=goal["name"],
        targetAmount=target_amount,
        targetDate=goal["targetDate"],
        currency=goal.get("currency", "USD"),
        status=goal.get("status", "in_progress"),
        notes=goal.get("notes"),
        currentValue=round(current_value, 2),
        progressPercent=round(progress_percent, 2),
        amountRemaining=round(amount_remaining, 2),
        daysRemaining=days_remaining,
        overdue=overdue,
        createdAt=created,
        updatedAt=updated,
    )


def _fetch_holdings_for_progress(user_id: str) -> list:
    """
    Fetch active holdings for progress calculation.
    Uses Supabase if configured, MOCK_HOLDINGS otherwise.
    """
    if _supabase_configured():
        try:
            supabase = _get_supabase()
            res = supabase.table("investment_holdings").select(
                "id,user_id,goal_id,units_held,current_price,status"
            ).eq("user_id", user_id).execute()
            return [
                {
                    "userId": str(r["user_id"]),
                    "goalId": str(r["goal_id"]) if r.get("goal_id") else None,
                    "unitsHeld": float(r.get("units_held") or 0),
                    "currentPrice": float(r.get("current_price") or 0),
                    "status": r.get("status", "active"),
                }
                for r in (res.data or [])
            ]
        except Exception:
            pass  # fall through to mock

    from app.api.investments import MOCK_HOLDINGS, LOCK as HOLDINGS_LOCK
    with HOLDINGS_LOCK:
        return [
            {k: v for k, v in h.items()}
            for h in MOCK_HOLDINGS.values()
            if h["userId"] == user_id
        ]


def _fetch_assets_for_progress(user_id: str) -> list:
    """
    Fetch manual assets for progress calculation.
    Uses Supabase if configured, MOCK_ASSETS otherwise.
    """
    if _supabase_configured():
        try:
            supabase = _get_supabase()
            res = supabase.table("user_assets").select(
                "id,user_id,goal_id,current_value,linked_holding_id"
            ).eq("user_id", user_id).execute()
            return [
                {
                    "userId": str(r["user_id"]),
                    "goalId": str(r["goal_id"]) if r.get("goal_id") else None,
                    "currentValue": float(r.get("current_value") or 0),
                    "linkedHoldingId": r.get("linked_holding_id"),
                }
                for r in (res.data or [])
            ]
        except Exception:
            pass

    from app.api.net_worth import MOCK_ASSETS
    return [
        {k: v for k, v in a.items()}
        for a in MOCK_ASSETS.values()
        if a["userId"] == user_id
    ]


# ---------------------------------------------------------------------------
# Ownership check helper
# ---------------------------------------------------------------------------
def _verify_goal_owner(goal_id: str, user_id: str) -> dict:
    """
    Load a goal and verify it belongs to user_id.
    Raises 404/403 on failure.
    Returns the goal dict on success.
    """
    if _supabase_configured():
        try:
            supabase = _get_supabase()
            res = supabase.table("financial_goals").select("*").eq("id", goal_id).single().execute()
            row = res.data
        except Exception as e:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Goal not found")

        if not row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Goal not found")
        if str(row["user_id"]) != user_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
        return _row_to_dict(row)

    # Fallback
    with GOALS_LOCK:
        goal = MOCK_GOALS.get(goal_id)
    if not goal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Goal not found")
    if goal["userId"] != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    return goal


# ---------------------------------------------------------------------------
# GET /goals — list
# ---------------------------------------------------------------------------
@router.get("", response_model=List[GoalResponse])
async def list_goals(current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]

    if _supabase_configured():
        try:
            supabase = _get_supabase()
            res = supabase.table("financial_goals").select("*").eq("user_id", user_id).order("created_at", desc=True).execute()
            goals = [_row_to_dict(r) for r in (res.data or [])]
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Database error fetching goals: {e}"
            )
    else:
        with GOALS_LOCK:
            goals = [g for g in MOCK_GOALS.values() if g["userId"] == user_id]

    holdings = _fetch_holdings_for_progress(user_id)
    assets = _fetch_assets_for_progress(user_id)

    result = [_enrich_goal(g, holdings, assets) for g in goals]
    result.sort(key=lambda x: x.createdAt, reverse=True)
    return result


# ---------------------------------------------------------------------------
# POST /goals — create
# ---------------------------------------------------------------------------
@router.post("", response_model=GoalResponse, status_code=status.HTTP_201_CREATED)
async def create_goal(goal_in: GoalCreate, current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    goal_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    currency = goal_in.currency or current_user.get("currency", "USD")
    goal_status = goal_in.status or "in_progress"

    new_goal = {
        "id": goal_id,
        "userId": user_id,
        "name": goal_in.name,
        "targetAmount": float(goal_in.targetAmount),
        "targetDate": goal_in.targetDate,
        "currency": currency,
        "status": goal_status,
        "notes": goal_in.notes,
        "createdAt": now,
        "updatedAt": now,
    }

    if _supabase_configured():
        try:
            supabase = _get_supabase()
            supabase.table("financial_goals").insert({
                "id": goal_id,
                "user_id": user_id,
                "name": goal_in.name,
                "target_amount": float(goal_in.targetAmount),
                "target_date": str(goal_in.targetDate),
                "currency": currency,
                "status": goal_status,
                "notes": goal_in.notes,
                "created_at": now.isoformat(),
                "updated_at": now.isoformat(),
            }).execute()
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Database error creating goal: {e}"
            )
    else:
        with GOALS_LOCK:
            MOCK_GOALS[goal_id] = new_goal

    holdings = _fetch_holdings_for_progress(user_id)
    assets = _fetch_assets_for_progress(user_id)
    return _enrich_goal(new_goal, holdings, assets)


# ---------------------------------------------------------------------------
# PUT /goals/{goal_id} — update
# ---------------------------------------------------------------------------
@router.put("/{goal_id}", response_model=GoalResponse)
async def update_goal(goal_id: str, goal_in: GoalUpdate, current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    now = datetime.now(timezone.utc)

    goal = _verify_goal_owner(goal_id, user_id)

    update_dict = goal_in.model_dump(exclude_unset=True)
    for k, v in update_dict.items():
        if v is not None:
            goal[k] = v
    goal["updatedAt"] = now

    if _supabase_configured():
        db_payload = {"updated_at": now.isoformat()}
        field_map = {
            "name": "name",
            "targetAmount": "target_amount",
            "targetDate": "target_date",
            "currency": "currency",
            "status": "status",
            "notes": "notes",
        }
        for py_key, db_key in field_map.items():
            if py_key in update_dict and update_dict[py_key] is not None:
                db_payload[db_key] = update_dict[py_key]

        try:
            supabase = _get_supabase()
            supabase.table("financial_goals").update(db_payload).eq("id", goal_id).eq("user_id", user_id).execute()
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Database error updating goal: {e}"
            )
    else:
        with GOALS_LOCK:
            MOCK_GOALS[goal_id] = goal

    holdings = _fetch_holdings_for_progress(user_id)
    assets = _fetch_assets_for_progress(user_id)
    return _enrich_goal(goal, holdings, assets)


# ---------------------------------------------------------------------------
# DELETE /goals/{goal_id} — delete
# ---------------------------------------------------------------------------
@router.delete("/{goal_id}")
async def delete_goal(goal_id: str, current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]

    _verify_goal_owner(goal_id, user_id)  # raises 404/403 if not owned

    if _supabase_configured():
        try:
            supabase = _get_supabase()
            # ON DELETE SET NULL in the migration handles holdings/assets automatically
            supabase.table("financial_goals").delete().eq("id", goal_id).eq("user_id", user_id).execute()
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Database error deleting goal: {e}"
            )
    else:
        with GOALS_LOCK:
            MOCK_GOALS.pop(goal_id, None)
        # Clean up in-memory FK references
        from app.api.investments import MOCK_HOLDINGS, LOCK as HOLDINGS_LOCK
        with HOLDINGS_LOCK:
            for h in MOCK_HOLDINGS.values():
                if h.get("userId") == user_id and h.get("goalId") == goal_id:
                    h["goalId"] = None
                    h["updatedAt"] = datetime.now(timezone.utc)

        from app.api.net_worth import MOCK_ASSETS
        for a in MOCK_ASSETS.values():
            if a.get("userId") == user_id and a.get("goalId") == goal_id:
                a["goalId"] = None
                a["updatedAt"] = datetime.now(timezone.utc)

    return {"status": "success", "message": "Goal deleted. Linked holdings/assets have been unlinked."}


# ---------------------------------------------------------------------------
# GET /goals/summary
# ---------------------------------------------------------------------------
@router.get("/summary")
async def get_goals_summary(current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]

    if _supabase_configured():
        try:
            supabase = _get_supabase()
            res = supabase.table("financial_goals").select("*").eq("user_id", user_id).execute()
            goals = [_row_to_dict(r) for r in (res.data or [])]
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Database error fetching goal summary: {e}"
            )
    else:
        with GOALS_LOCK:
            goals = [g for g in MOCK_GOALS.values() if g["userId"] == user_id]

    holdings = _fetch_holdings_for_progress(user_id)
    assets = _fetch_assets_for_progress(user_id)
    enriched = [_enrich_goal(g, holdings, assets) for g in goals]

    total_target = sum(g.targetAmount for g in enriched)
    total_current = sum(g.currentValue for g in enriched)
    total_progress = (total_current / total_target * 100) if total_target > 0 else 0.0

    closest_goal = None
    in_progress = [g for g in enriched if g.status == "in_progress" and g.progressPercent < 100.0]
    if in_progress:
        closest_goal = max(in_progress, key=lambda g: g.progressPercent)
    elif enriched:
        closest_goal = max(enriched, key=lambda g: g.progressPercent)

    return {
        "totalTargetAmount": round(total_target, 2),
        "totalCurrentValue": round(total_current, 2),
        "overallProgressPercent": round(total_progress, 2),
        "goalCount": len(enriched),
        "closestGoalId": closest_goal.id if closest_goal else None,
        "closestGoalName": closest_goal.name if closest_goal else None,
        "closestGoalProgress": closest_goal.progressPercent if closest_goal else 0.0,
    }


# ---------------------------------------------------------------------------
# Ownership verification helper used by investments.py / net_worth.py
# ---------------------------------------------------------------------------
def verify_goal_ownership_for_link(goal_id: str, user_id: str) -> None:
    """
    Called by investments.py and net_worth.py before linking a holding/asset
    to a goal. Raises HTTP 403 if the goal does not belong to user_id.
    """
    if not goal_id:
        return

    if _supabase_configured():
        try:
            supabase = _get_supabase()
            res = supabase.table("financial_goals").select("user_id").eq("id", goal_id).single().execute()
            row = res.data
        except Exception:
            row = None

        if not row or str(row.get("user_id", "")) != user_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid goal ownership")
    else:
        with GOALS_LOCK:
            goal = MOCK_GOALS.get(goal_id)
        if not goal or goal["userId"] != user_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid goal ownership")
