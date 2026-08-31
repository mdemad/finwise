from fastapi import APIRouter, Depends, HTTPException, status, Query
from app.models.schemas import (
    AssetCreate,
    AssetUpdate,
    AssetResponse,
    LiabilityCreate,
    LiabilityUpdate,
    LiabilityResponse,
    NetWorthSnapshotCreate,
    NetWorthSnapshotResponse,
    NetWorthSummaryResponse,
    AllocationItem,
    MacroGroupItem,
    ConcentrationInsight,
    DiversificationScoreDetail,
)
from app.models.wealth_config import (
    ASSET_CATEGORIES,
    LIABILITY_CATEGORIES,
    MACRO_GROUPS,
    calculate_diversification_score,
)
from app.api.auth import get_current_user
from app.config import settings
from datetime import datetime
import uuid

router = APIRouter(prefix="/net-worth", tags=["net_worth"])

# Thread-safe in-memory stores matching auth.py and calculations.py
MOCK_ASSETS: dict[str, dict] = {}
MOCK_LIABILITIES: dict[str, dict] = {}
MOCK_SNAPSHOTS: dict[str, dict] = {}


def _enrich_asset(asset: dict) -> AssetResponse:
    curr_val = float(asset.get("currentValue", 0))
    purch_val = asset.get("purchaseValue")
    gain_loss = None
    gain_loss_pct = None

    if purch_val is not None and float(purch_val) > 0:
        purch_val_f = float(purch_val)
        gain_loss = round(curr_val - purch_val_f, 2)
        gain_loss_pct = round(((curr_val - purch_val_f) / purch_val_f) * 100, 2)

    return AssetResponse(
        id=asset["id"],
        userId=asset["userId"],
        name=asset["name"],
        category=asset["category"],
        currentValue=curr_val,
        purchaseValue=purch_val,
        purchaseDate=asset.get("purchaseDate"),
        quantity=asset.get("quantity"),
        currency=asset.get("currency", "USD"),
        notes=asset.get("notes"),
        createdAt=asset.get("createdAt", datetime.utcnow()),
        updatedAt=asset.get("updatedAt"),
        gainLoss=gain_loss,
        gainLossPercent=gain_loss_pct,
    )


# ---------------------------------------------------------------------------
# Assets Endpoints
# ---------------------------------------------------------------------------
@router.get("/assets", response_model=list[AssetResponse])
async def list_assets(current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    user_assets = [a for a in MOCK_ASSETS.values() if a["userId"] == user_id]
    user_assets.sort(key=lambda x: x["createdAt"], reverse=True)
    return [_enrich_asset(a) for a in user_assets]


@router.post("/assets", response_model=AssetResponse, status_code=status.HTTP_201_CREATED)
async def create_asset(
    asset_in: AssetCreate,
    current_user: dict = Depends(get_current_user),
):
    user_id = current_user["id"]
    asset_id = str(uuid.uuid4())
    now = datetime.utcnow()

    # Validate category key
    cat_key = asset_in.category
    if cat_key not in ASSET_CATEGORIES:
        cat_key = "custom"

    new_asset = {
        "id": asset_id,
        "userId": user_id,
        "name": asset_in.name,
        "category": cat_key,
        "currentValue": float(asset_in.currentValue),
        "purchaseValue": float(asset_in.purchaseValue) if asset_in.purchaseValue is not None else None,
        "purchaseDate": asset_in.purchaseDate,
        "quantity": asset_in.quantity,
        "currency": asset_in.currency or current_user.get("currency", "USD"),
        "notes": asset_in.notes,
        "createdAt": now,
        "updatedAt": now,
    }

    MOCK_ASSETS[asset_id] = new_asset

    # Supabase sync if credentials provided
    if settings.SUPABASE_URL and settings.SUPABASE_KEY:
        try:
            from supabase import create_client
            supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
            supabase.table("user_assets").insert({
                "id": asset_id,
                "user_id": user_id,
                "name": new_asset["name"],
                "category": new_asset["category"],
                "current_value": new_asset["currentValue"],
                "purchase_value": new_asset["purchaseValue"],
                "purchase_date": new_asset["purchaseDate"],
                "quantity": new_asset["quantity"],
                "currency": new_asset["currency"],
                "notes": new_asset["notes"],
                "created_at": now.isoformat(),
            }).execute()
        except Exception as e:
            print(f"Supabase asset sync failed: {e}")

    return _enrich_asset(new_asset)


@router.put("/assets/{asset_id}", response_model=AssetResponse)
async def update_asset(
    asset_id: str,
    asset_in: AssetUpdate,
    current_user: dict = Depends(get_current_user),
):
    user_id = current_user["id"]
    if asset_id not in MOCK_ASSETS:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asset not found")

    asset = MOCK_ASSETS[asset_id]
    if asset["userId"] != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    update_dict = asset_in.model_dump(exclude_unset=True)
    for k, v in update_dict.items():
        if k == "category" and v not in ASSET_CATEGORIES:
            asset[k] = "custom"
        elif v is not None:
            asset[k] = v

    asset["updatedAt"] = datetime.utcnow()

    # Supabase sync
    if settings.SUPABASE_URL and settings.SUPABASE_KEY:
        try:
            from supabase import create_client
            supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
            supabase.table("user_assets").update({
                "name": asset["name"],
                "category": asset["category"],
                "current_value": asset["currentValue"],
                "purchase_value": asset.get("purchaseValue"),
                "purchase_date": asset.get("purchaseDate"),
                "quantity": asset.get("quantity"),
                "currency": asset.get("currency"),
                "notes": asset.get("notes"),
                "updated_at": asset["updatedAt"].isoformat(),
            }).eq("id", asset_id).execute()
        except Exception as e:
            print(f"Supabase asset update failed: {e}")

    return _enrich_asset(asset)


@router.delete("/assets/{asset_id}")
async def delete_asset(
    asset_id: str,
    current_user: dict = Depends(get_current_user),
):
    user_id = current_user["id"]
    if asset_id not in MOCK_ASSETS:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asset not found")

    asset = MOCK_ASSETS[asset_id]
    if asset["userId"] != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    del MOCK_ASSETS[asset_id]

    if settings.SUPABASE_URL and settings.SUPABASE_KEY:
        try:
            from supabase import create_client
            supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
            supabase.table("user_assets").delete().eq("id", asset_id).execute()
        except Exception as e:
            print(f"Supabase asset delete failed: {e}")

    return {"status": "success", "message": "Asset deleted successfully"}


# ---------------------------------------------------------------------------
# Liabilities Endpoints
# ---------------------------------------------------------------------------
@router.get("/liabilities", response_model=list[LiabilityResponse])
async def list_liabilities(current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    user_liabs = [l for l in MOCK_LIABILITIES.values() if l["userId"] == user_id]
    user_liabs.sort(key=lambda x: x["createdAt"], reverse=True)
    return [
        LiabilityResponse(
            id=l["id"],
            userId=l["userId"],
            name=l["name"],
            category=l["category"],
            outstandingAmount=float(l["outstandingAmount"]),
            originalAmount=l.get("originalAmount"),
            interestRate=l.get("interestRate"),
            emi=l.get("emi"),
            remainingTenureMonths=l.get("remainingTenureMonths"),
            currency=l.get("currency", "USD"),
            notes=l.get("notes"),
            createdAt=l.get("createdAt", datetime.utcnow()),
            updatedAt=l.get("updatedAt"),
        )
        for l in user_liabs
    ]


@router.post("/liabilities", response_model=LiabilityResponse, status_code=status.HTTP_201_CREATED)
async def create_liability(
    liab_in: LiabilityCreate,
    current_user: dict = Depends(get_current_user),
):
    user_id = current_user["id"]
    liab_id = str(uuid.uuid4())
    now = datetime.utcnow()

    cat_key = liab_in.category
    if cat_key not in LIABILITY_CATEGORIES:
        cat_key = "custom"

    new_liab = {
        "id": liab_id,
        "userId": user_id,
        "name": liab_in.name,
        "category": cat_key,
        "outstandingAmount": float(liab_in.outstandingAmount),
        "originalAmount": float(liab_in.originalAmount) if liab_in.originalAmount is not None else None,
        "interestRate": float(liab_in.interestRate) if liab_in.interestRate is not None else None,
        "emi": float(liab_in.emi) if liab_in.emi is not None else None,
        "remainingTenureMonths": liab_in.remainingTenureMonths,
        "currency": liab_in.currency or current_user.get("currency", "USD"),
        "notes": liab_in.notes,
        "createdAt": now,
        "updatedAt": now,
    }

    MOCK_LIABILITIES[liab_id] = new_liab

    if settings.SUPABASE_URL and settings.SUPABASE_KEY:
        try:
            from supabase import create_client
            supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
            supabase.table("user_liabilities").insert({
                "id": liab_id,
                "user_id": user_id,
                "name": new_liab["name"],
                "category": new_liab["category"],
                "outstanding_amount": new_liab["outstandingAmount"],
                "original_amount": new_liab["originalAmount"],
                "interest_rate": new_liab["interestRate"],
                "emi": new_liab["emi"],
                "remaining_tenure_months": new_liab["remainingTenureMonths"],
                "currency": new_liab["currency"],
                "notes": new_liab["notes"],
                "created_at": now.isoformat(),
            }).execute()
        except Exception as e:
            print(f"Supabase liability sync failed: {e}")

    return LiabilityResponse(
        id=new_liab["id"],
        userId=new_liab["userId"],
        name=new_liab["name"],
        category=new_liab["category"],
        outstandingAmount=new_liab["outstandingAmount"],
        originalAmount=new_liab["originalAmount"],
        interestRate=new_liab["interestRate"],
        emi=new_liab["emi"],
        remainingTenureMonths=new_liab["remainingTenureMonths"],
        currency=new_liab["currency"],
        notes=new_liab["notes"],
        createdAt=new_liab["createdAt"],
        updatedAt=new_liab["updatedAt"],
    )


@router.put("/liabilities/{liab_id}", response_model=LiabilityResponse)
async def update_liability(
    liab_id: str,
    liab_in: LiabilityUpdate,
    current_user: dict = Depends(get_current_user),
):
    user_id = current_user["id"]
    if liab_id not in MOCK_LIABILITIES:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Liability not found")

    liab = MOCK_LIABILITIES[liab_id]
    if liab["userId"] != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    update_dict = liab_in.model_dump(exclude_unset=True)
    for k, v in update_dict.items():
        if k == "category" and v not in LIABILITY_CATEGORIES:
            liab[k] = "custom"
        elif v is not None:
            liab[k] = v

    liab["updatedAt"] = datetime.utcnow()

    if settings.SUPABASE_URL and settings.SUPABASE_KEY:
        try:
            from supabase import create_client
            supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
            supabase.table("user_liabilities").update({
                "name": liab["name"],
                "category": liab["category"],
                "outstanding_amount": liab["outstandingAmount"],
                "original_amount": liab.get("originalAmount"),
                "interest_rate": liab.get("interestRate"),
                "emi": liab.get("emi"),
                "remaining_tenure_months": liab.get("remainingTenureMonths"),
                "currency": liab.get("currency"),
                "notes": liab.get("notes"),
                "updated_at": liab["updatedAt"].isoformat(),
            }).eq("id", liab_id).execute()
        except Exception as e:
            print(f"Supabase liability update failed: {e}")

    return LiabilityResponse(
        id=liab["id"],
        userId=liab["userId"],
        name=liab["name"],
        category=liab["category"],
        outstandingAmount=liab["outstandingAmount"],
        originalAmount=liab.get("originalAmount"),
        interestRate=liab.get("interestRate"),
        emi=liab.get("emi"),
        remainingTenureMonths=liab.get("remainingTenureMonths"),
        currency=liab.get("currency", "USD"),
        notes=liab.get("notes"),
        createdAt=liab.get("createdAt", datetime.utcnow()),
        updatedAt=liab.get("updatedAt"),
    )


@router.delete("/liabilities/{liab_id}")
async def delete_liability(
    liab_id: str,
    current_user: dict = Depends(get_current_user),
):
    user_id = current_user["id"]
    if liab_id not in MOCK_LIABILITIES:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Liability not found")

    liab = MOCK_LIABILITIES[liab_id]
    if liab["userId"] != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    del MOCK_LIABILITIES[liab_id]

    if settings.SUPABASE_URL and settings.SUPABASE_KEY:
        try:
            from supabase import create_client
            supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
            supabase.table("user_liabilities").delete().eq("id", liab_id).execute()
        except Exception as e:
            print(f"Supabase liability delete failed: {e}")

    return {"status": "success", "message": "Liability deleted successfully"}


# ---------------------------------------------------------------------------
# Full Wealth & Diversification Summary
# ---------------------------------------------------------------------------
@router.get("/summary", response_model=NetWorthSummaryResponse)
async def get_wealth_summary(current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    user_currency = current_user.get("currency", "USD")

    user_assets = [a for a in MOCK_ASSETS.values() if a["userId"] == user_id]
    user_liabs = [l for l in MOCK_LIABILITIES.values() if l["userId"] == user_id]

    total_assets = sum(float(a["currentValue"]) for a in user_assets)
    total_liabilities = sum(float(l["outstandingAmount"]) for l in user_liabs)
    net_worth = total_assets - total_liabilities
    debt_to_asset = round((total_liabilities / total_assets * 100), 2) if total_assets > 0 else 0.0

    # Categorize and aggregate
    category_totals: dict[str, dict] = {}
    liquid_total = 0.0
    illiquid_total = 0.0
    group_totals: dict[str, float] = {g: 0.0 for g in MACRO_GROUPS.keys()}

    for a in user_assets:
        cat_id = a.get("category", "custom")
        cat_info = ASSET_CATEGORIES.get(cat_id, ASSET_CATEGORIES["custom"])
        val = float(a["currentValue"])

        if cat_id not in category_totals:
            category_totals[cat_id] = {
                "categoryId": cat_id,
                "name": cat_info["name"],
                "value": 0.0,
                "color": cat_info["color"],
                "liquidity": cat_info["liquidity"],
                "group": cat_info["group"],
                "count": 0,
            }

        category_totals[cat_id]["value"] += val
        category_totals[cat_id]["count"] += 1

        if cat_info["liquidity"] == "liquid":
            liquid_total += val
        else:
            illiquid_total += val

        grp_id = cat_info.get("group", "alternative")
        if grp_id in group_totals:
            group_totals[grp_id] += val
        else:
            group_totals["alternative"] += val

    # Build Allocation List
    asset_allocation: list[AllocationItem] = []
    max_cat_pct = 0.0
    largest_cat_id = None
    largest_cat_name = None
    largest_cat_val = 0.0

    for cat in category_totals.values():
        pct = round((cat["value"] / total_assets * 100), 2) if total_assets > 0 else 0.0
        if pct > max_cat_pct:
            max_cat_pct = pct
            largest_cat_id = cat["categoryId"]
            largest_cat_name = cat["name"]
            largest_cat_val = cat["value"]

        asset_allocation.append(
            AllocationItem(
                categoryId=cat["categoryId"],
                name=cat["name"],
                value=round(cat["value"], 2),
                percentage=pct,
                color=cat["color"],
                liquidity=cat["liquidity"],
                group=cat["group"],
                count=cat["count"],
            )
        )

    asset_allocation.sort(key=lambda x: x.value, reverse=True)

    # Build Macro Group Allocation
    group_allocation: list[MacroGroupItem] = []
    active_groups_count = 0
    for grp_id, grp_val in group_totals.items():
        if grp_val > 0:
            active_groups_count += 1
            grp_info = MACRO_GROUPS.get(grp_id, MACRO_GROUPS["alternative"])
            grp_pct = round((grp_val / total_assets * 100), 2) if total_assets > 0 else 0.0
            group_allocation.append(
                MacroGroupItem(
                    groupId=grp_id,
                    name=grp_info["name"],
                    value=round(grp_val, 2),
                    percentage=grp_pct,
                    color=grp_info["color"],
                )
            )

    group_allocation.sort(key=lambda x: x.value, reverse=True)

    # Build Liability Allocation
    liab_category_totals: dict[str, dict] = {}
    for l in user_liabs:
        cat_id = l.get("category", "custom")
        cat_info = LIABILITY_CATEGORIES.get(cat_id, LIABILITY_CATEGORIES["custom"])
        val = float(l["outstandingAmount"])
        if cat_id not in liab_category_totals:
            liab_category_totals[cat_id] = {
                "categoryId": cat_id,
                "name": cat_info["name"],
                "value": 0.0,
                "color": cat_info["color"],
                "count": 0,
            }
        liab_category_totals[cat_id]["value"] += val
        liab_category_totals[cat_id]["count"] += 1

    liability_allocation = []
    for lcat in liab_category_totals.values():
        pct = round((lcat["value"] / total_liabilities * 100), 2) if total_liabilities > 0 else 0.0
        liability_allocation.append({
            "categoryId": lcat["categoryId"],
            "name": lcat["name"],
            "value": round(lcat["value"], 2),
            "percentage": pct,
            "color": lcat["color"],
            "count": lcat["count"],
        })
    liability_allocation.sort(key=lambda x: x["value"], reverse=True)

    liquid_pct = round((liquid_total / total_assets * 100), 2) if total_assets > 0 else 0.0
    illiquid_pct = round((illiquid_total / total_assets * 100), 2) if total_assets > 0 else 0.0

    # Concentration Analysis Insight
    is_concentrated = max_cat_pct >= 40.0 and len(asset_allocation) > 0
    concentration_msg = ""
    if is_concentrated:
        concentration_msg = (
            f"Your portfolio has a relatively high concentration in {largest_cat_name} ({max_cat_pct:.1f}%). "
            f"This may reduce overall liquidity and increase sensitivity to {largest_cat_name.lower()} market cycles."
        )
    elif len(asset_allocation) > 1:
        concentration_msg = (
            f"Your assets are distributed across {len(asset_allocation)} categories with the largest ({largest_cat_name}) at {max_cat_pct:.1f}%, reflecting a balanced allocation spread."
        )
    elif len(asset_allocation) == 1:
        concentration_msg = (
            f"100% of your current assets are concentrated in {largest_cat_name}. Adding additional asset categories over time can help build diversification resilience."
        )

    concentration_insight = ConcentrationInsight(
        largestCategoryId=largest_cat_id,
        largestCategoryName=largest_cat_name,
        largestCategoryValue=round(largest_cat_val, 2),
        percentage=max_cat_pct,
        isConcentrated=is_concentrated,
        message=concentration_msg,
    )

    # Deterministic Diversification Score
    score_data = calculate_diversification_score(
        category_count=len(asset_allocation),
        max_concentration_pct=max_cat_pct,
        group_count=active_groups_count,
        liquid_pct=liquid_pct,
    )

    return NetWorthSummaryResponse(
        totalAssets=round(total_assets, 2),
        totalLiabilities=round(total_liabilities, 2),
        netWorth=round(net_worth, 2),
        debtToAssetRatio=debt_to_asset,
        liquidAssets=round(liquid_total, 2),
        liquidPercent=liquid_pct,
        illiquidAssets=round(illiquid_total, 2),
        illiquidPercent=illiquid_pct,
        assetCount=len(user_assets),
        liabilityCount=len(user_liabs),
        categoryCount=len(asset_allocation),
        assetAllocation=asset_allocation,
        liabilityAllocation=liability_allocation,
        groupAllocation=group_allocation,
        concentration=concentration_insight,
        diversificationScore=DiversificationScoreDetail(**score_data),
        currency=user_currency,
    )


# ---------------------------------------------------------------------------
# Historical Net Worth Snapshots
# ---------------------------------------------------------------------------
@router.get("/history", response_model=list[NetWorthSnapshotResponse])
async def list_snapshots(current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    user_snaps = [s for s in MOCK_SNAPSHOTS.values() if s["userId"] == user_id]
    user_snaps.sort(key=lambda x: x["createdAt"])
    return [
        NetWorthSnapshotResponse(
            id=s["id"],
            userId=s["userId"],
            date=s["date"],
            totalAssets=float(s["totalAssets"]),
            totalLiabilities=float(s["totalLiabilities"]),
            netWorth=float(s["netWorth"]),
            createdAt=s.get("createdAt", datetime.utcnow()),
        )
        for s in user_snaps
    ]


@router.post("/history", response_model=NetWorthSnapshotResponse, status_code=status.HTTP_201_CREATED)
async def record_snapshot(
    snap_in: NetWorthSnapshotCreate,
    current_user: dict = Depends(get_current_user),
):
    user_id = current_user["id"]
    snap_id = str(uuid.uuid4())
    now = datetime.utcnow()

    new_snap = {
        "id": snap_id,
        "userId": user_id,
        "date": snap_in.date,
        "totalAssets": float(snap_in.totalAssets),
        "totalLiabilities": float(snap_in.totalLiabilities),
        "netWorth": float(snap_in.netWorth),
        "createdAt": now,
    }

    MOCK_SNAPSHOTS[snap_id] = new_snap

    if settings.SUPABASE_URL and settings.SUPABASE_KEY:
        try:
            from supabase import create_client
            supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
            supabase.table("net_worth_snapshots").insert({
                "id": snap_id,
                "user_id": user_id,
                "date": new_snap["date"],
                "total_assets": new_snap["totalAssets"],
                "total_liabilities": new_snap["totalLiabilities"],
                "net_worth": new_snap["netWorth"],
                "created_at": now.isoformat(),
            }).execute()
        except Exception as e:
            print(f"Supabase snapshot sync failed: {e}")

    return NetWorthSnapshotResponse(
        id=new_snap["id"],
        userId=new_snap["userId"],
        date=new_snap["date"],
        totalAssets=new_snap["totalAssets"],
        totalLiabilities=new_snap["totalLiabilities"],
        netWorth=new_snap["netWorth"],
        createdAt=new_snap["createdAt"],
    )
