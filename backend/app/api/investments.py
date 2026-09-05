from fastapi import APIRouter, Depends, HTTPException, status, Query
from app.models.schemas import (
    HoldingCreate,
    HoldingUpdate,
    HoldingResponse,
    TransactionCreate,
    TransactionResponse,
    InvestmentSummaryResponse,
    AssetAllocationItem,
)
from app.api.auth import get_current_user
from app.api.currency import get_current_rates
from app.config import settings
from datetime import datetime, timezone
import uuid
import threading

router = APIRouter(prefix="/investments", tags=["investments"])

# Thread-safe in-memory data stores for holdings and transactions
MOCK_HOLDINGS: dict[str, dict] = {}
MOCK_TRANSACTIONS: dict[str, dict] = {}
LOCK = threading.Lock()

VALID_ASSET_TYPES = {"stock", "mutual_fund", "etf", "bond", "crypto", "reit", "other"}
VALID_TRANSACTION_TYPES = {"BUY", "SELL", "DIVIDEND", "FEE", "SPLIT", "TRANSFER_IN", "TRANSFER_OUT"}


def _enrich_holding(h: dict) -> HoldingResponse:
    units_held = float(h.get("unitsHeld", 0))
    avg_price = float(h.get("averageBuyPrice", 0))
    curr_price = float(h.get("currentPrice", 0))

    cost_basis = round(units_held * avg_price, 4)
    current_val = round(units_held * curr_price, 4)
    unrealized_pnl = round(current_val - cost_basis, 4)
    unrealized_pnl_pct = (
        round((unrealized_pnl / cost_basis) * 100, 2) if cost_basis > 0 else 0.0
    )

    return HoldingResponse(
        id=h["id"],
        userId=h["userId"],
        symbol=h["symbol"],
        name=h["name"],
        assetType=h.get("assetType", "other"),
        currency=h.get("currency", "USD"),
        brokerCode=h.get("brokerCode", "MANUAL"),
        externalHoldingId=h.get("externalHoldingId"),
        unitsHeld=round(units_held, 8),
        averageBuyPrice=round(avg_price, 8),
        currentPrice=round(curr_price, 8),
        status=h.get("status", "active"),
        costBasis=cost_basis,
        currentValue=current_val,
        unrealizedPnL=unrealized_pnl,
        unrealizedPnLPercent=unrealized_pnl_pct,
        notes=h.get("notes"),
        createdAt=h.get("createdAt", datetime.now(timezone.utc)),
        updatedAt=h.get("updatedAt", datetime.now(timezone.utc)),
    )


# ---------------------------------------------------------------------------
# Holdings Endpoints
# ---------------------------------------------------------------------------
@router.get("/holdings", response_model=list[HoldingResponse])
async def list_holdings(
    status_filter: str | None = Query(None, alias="status"),
    asset_type_filter: str | None = Query(None, alias="asset_type"),
    current_user: dict = Depends(get_current_user),
):
    user_id = current_user["id"]
    with LOCK:
        user_holdings = [h for h in MOCK_HOLDINGS.values() if h["userId"] == user_id]

    if status_filter:
        user_holdings = [h for h in user_holdings if h.get("status") == status_filter]
    if asset_type_filter:
        user_holdings = [h for h in user_holdings if h.get("assetType") == asset_type_filter]

    user_holdings.sort(key=lambda x: x.get("createdAt", datetime.now(timezone.utc)), reverse=True)
    return [_enrich_holding(h) for h in user_holdings]


@router.post("/holdings", response_model=HoldingResponse, status_code=status.HTTP_201_CREATED)
async def create_holding(
    holding_in: HoldingCreate,
    current_user: dict = Depends(get_current_user),
):
    user_id = current_user["id"]
    holding_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)

    asset_type = holding_in.assetType if holding_in.assetType in VALID_ASSET_TYPES else "other"
    currency_code = holding_in.currency or current_user.get("currency", "USD")

    new_holding = {
        "id": holding_id,
        "userId": user_id,
        "symbol": holding_in.symbol.upper(),
        "name": holding_in.name,
        "assetType": asset_type,
        "currency": currency_code,
        "brokerCode": holding_in.brokerCode or "MANUAL",
        "externalHoldingId": holding_in.externalHoldingId,
        "unitsHeld": 0.0,
        "averageBuyPrice": 0.0,
        "currentPrice": float(holding_in.currentPrice),
        "status": "active",
        "notes": holding_in.notes,
        "createdAt": now,
        "updatedAt": now,
    }

    with LOCK:
        MOCK_HOLDINGS[holding_id] = new_holding

        # Process optional initial BUY transaction atomically
        if holding_in.initialQuantity and float(holding_in.initialQuantity) > 0:
            init_qty = float(holding_in.initialQuantity)
            init_price = float(holding_in.initialPrice or holding_in.currentPrice)
            tx_id = str(uuid.uuid4())

            new_holding["unitsHeld"] = round(init_qty, 8)
            new_holding["averageBuyPrice"] = round(init_price, 8)

            init_tx = {
                "id": tx_id,
                "userId": user_id,
                "holdingId": holding_id,
                "transactionType": "BUY",
                "quantity": init_qty,
                "price": init_price,
                "amount": round(init_qty * init_price, 4),
                "fees": 0.0,
                "currency": currency_code,
                "transactionDate": now,
                "externalTransactionId": None,
                "notes": "Initial holding purchase",
                "createdAt": now,
                "realizedPnL": None,
            }
            MOCK_TRANSACTIONS[tx_id] = init_tx

    # Supabase DB Sync if credentials provided
    if settings.SUPABASE_URL and settings.SUPABASE_KEY:
        try:
            from supabase import create_client
            supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
            supabase.table("investment_holdings").insert({
                "id": holding_id,
                "user_id": user_id,
                "symbol": new_holding["symbol"],
                "name": new_holding["name"],
                "asset_type": new_holding["assetType"],
                "currency": new_holding["currency"],
                "broker_code": new_holding["brokerCode"],
                "external_holding_id": new_holding["externalHoldingId"],
                "units_held": new_holding["unitsHeld"],
                "average_buy_price": new_holding["averageBuyPrice"],
                "current_price": new_holding["currentPrice"],
                "status": new_holding["status"],
                "notes": new_holding["notes"],
                "created_at": now.isoformat(),
                "updated_at": now.isoformat(),
            }).execute()

            if holding_in.initialQuantity and float(holding_in.initialQuantity) > 0:
                supabase.table("investment_transactions").insert({
                    "id": init_tx["id"],
                    "user_id": user_id,
                    "holding_id": holding_id,
                    "transaction_type": "BUY",
                    "quantity": init_tx["quantity"],
                    "price": init_tx["price"],
                    "amount": init_tx["amount"],
                    "fees": 0.0,
                    "currency": currency_code,
                    "transaction_date": now.isoformat(),
                    "created_at": now.isoformat(),
                }).execute()
        except Exception as e:
            print(f"Supabase holding sync note: {e}")

    return _enrich_holding(new_holding)


@router.get("/holdings/{holding_id}", response_model=HoldingResponse)
async def get_holding(
    holding_id: str,
    current_user: dict = Depends(get_current_user),
):
    user_id = current_user["id"]
    with LOCK:
        holding = MOCK_HOLDINGS.get(holding_id)

    if not holding or holding["userId"] != user_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Holding not found")

    return _enrich_holding(holding)


@router.put("/holdings/{holding_id}", response_model=HoldingResponse)
async def update_holding(
    holding_id: str,
    holding_in: HoldingUpdate,
    current_user: dict = Depends(get_current_user),
):
    user_id = current_user["id"]
    now = datetime.now(timezone.utc)

    with LOCK:
        if holding_id not in MOCK_HOLDINGS:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Holding not found")

        holding = MOCK_HOLDINGS[holding_id]
        if holding["userId"] != user_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Holding not found")

        update_dict = holding_in.model_dump(exclude_unset=True)
        for k, v in update_dict.items():
            if k == "symbol" and v:
                holding["symbol"] = str(v).upper()
            elif k == "assetType" and v:
                holding["assetType"] = v if v in VALID_ASSET_TYPES else "other"
            elif k == "status" and v:
                if v in {"active", "closed", "archived"}:
                    holding["status"] = v
            elif k in {"unitsHeld", "averageBuyPrice"}:
                # Reject direct manual overrides of calculated accounting projections
                continue
            elif v is not None:
                holding[k] = v

        holding["updatedAt"] = now

    if settings.SUPABASE_URL and settings.SUPABASE_KEY:
        try:
            from supabase import create_client
            supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
            supabase.table("investment_holdings").update({
                "symbol": holding["symbol"],
                "name": holding["name"],
                "asset_type": holding["assetType"],
                "currency": holding["currency"],
                "broker_code": holding["brokerCode"],
                "current_price": holding["currentPrice"],
                "status": holding["status"],
                "notes": holding.get("notes"),
                "updated_at": now.isoformat(),
            }).eq("id", holding_id).eq("user_id", user_id).execute()
        except Exception as e:
            print(f"Supabase holding update note: {e}")

    return _enrich_holding(holding)


@router.delete("/holdings/{holding_id}")
async def delete_holding(
    holding_id: str,
    current_user: dict = Depends(get_current_user),
):
    user_id = current_user["id"]
    with LOCK:
        if holding_id not in MOCK_HOLDINGS:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Holding not found")

        holding = MOCK_HOLDINGS[holding_id]
        if holding["userId"] != user_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Holding not found")

        # RULE 6: Do NOT allow deletion of a holding that has transactions
        existing_txs = [t for t in MOCK_TRANSACTIONS.values() if t["holdingId"] == holding_id]
        if existing_txs:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete holding with existing transaction history. Update status to 'closed' or 'archived' instead.",
            )

        del MOCK_HOLDINGS[holding_id]

    if settings.SUPABASE_URL and settings.SUPABASE_KEY:
        try:
            from supabase import create_client
            supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
            supabase.table("investment_holdings").delete().eq("id", holding_id).eq("user_id", user_id).execute()
        except Exception as e:
            print(f"Supabase holding delete note: {e}")

    return {"status": "success", "message": "Holding deleted successfully"}


# ---------------------------------------------------------------------------
# Transactions Endpoints
# ---------------------------------------------------------------------------
@router.get("/transactions", response_model=list[TransactionResponse])
async def list_transactions(
    holding_id_filter: str | None = Query(None, alias="holding_id"),
    transaction_type_filter: str | None = Query(None, alias="transaction_type"),
    current_user: dict = Depends(get_current_user),
):
    user_id = current_user["id"]

    with LOCK:
        if holding_id_filter:
            holding = MOCK_HOLDINGS.get(holding_id_filter)
            if not holding or holding["userId"] != user_id:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Holding not found")
            user_txs = [t for t in MOCK_TRANSACTIONS.values() if t["holdingId"] == holding_id_filter and t["userId"] == user_id]
        else:
            user_txs = [t for t in MOCK_TRANSACTIONS.values() if t["userId"] == user_id]

    if transaction_type_filter:
        tx_type_u = transaction_type_filter.upper()
        user_txs = [t for t in user_txs if t["transactionType"] == tx_type_u]

    user_txs.sort(key=lambda x: x.get("transactionDate", datetime.now(timezone.utc)), reverse=True)

    return [
        TransactionResponse(
            id=t["id"],
            userId=t["userId"],
            holdingId=t["holdingId"],
            transactionType=t["transactionType"],
            quantity=float(t["quantity"]),
            price=float(t["price"]),
            amount=float(t["amount"]),
            fees=float(t["fees"]),
            currency=t["currency"],
            transactionDate=t["transactionDate"],
            externalTransactionId=t.get("externalTransactionId"),
            notes=t.get("notes"),
            createdAt=t.get("createdAt", datetime.now(timezone.utc)),
            realizedPnL=t.get("realizedPnL"),
        )
        for t in user_txs
    ]


@router.post("/transactions", response_model=TransactionResponse, status_code=status.HTTP_201_CREATED)
async def create_transaction(
    tx_in: TransactionCreate,
    current_user: dict = Depends(get_current_user),
):
    user_id = current_user["id"]
    tx_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)

    t_type = tx_in.transactionType.upper()
    if t_type not in VALID_TRANSACTION_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid transaction_type: {tx_in.transactionType}. Supported: {', '.join(VALID_TRANSACTION_TYPES)}",
        )

    with LOCK:
        # Verify holding exists and belongs to authenticated user
        if tx_in.holdingId not in MOCK_HOLDINGS:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Holding not found")

        holding = MOCK_HOLDINGS[tx_in.holdingId]
        if holding["userId"] != user_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Holding not found")

        # Deduplication check for externalTransactionId
        if tx_in.externalTransactionId:
            duplicate = any(
                t.get("externalTransactionId") == tx_in.externalTransactionId and t["userId"] == user_id
                for t in MOCK_TRANSACTIONS.values()
            )
            if duplicate:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Transaction with this external_transaction_id already exists.",
                )

        # Retrieve current holding state
        old_units = float(holding.get("unitsHeld", 0))
        old_wac = float(holding.get("averageBuyPrice", 0))

        qty = float(tx_in.quantity)
        price = float(tx_in.price)
        fees = float(tx_in.fees)
        amount = float(tx_in.amount)
        realized_pnl = None

        # -------------------------------------------------------------------
        # ACCOUNTING & WEIGHTED AVERAGE COST (WAC) ENGINE
        # -------------------------------------------------------------------
        if t_type == "BUY":
            new_units = old_units + qty
            total_cost = (old_units * old_wac) + (qty * price) + fees
            new_wac = (total_cost / new_units) if new_units > 0 else 0.0
            if amount == 0:
                amount = round((qty * price) + fees, 4)

            holding["unitsHeld"] = round(new_units, 8)
            holding["averageBuyPrice"] = round(new_wac, 8)

        elif t_type == "SELL":
            if qty > old_units:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Insufficient units to sell. Available: {old_units}, Requested: {qty}",
                )
            new_units = old_units - qty
            new_wac = old_wac  # WAC is strictly preserved on SELL
            realized_pnl = round((price - old_wac) * qty - fees, 4)
            if amount == 0:
                amount = round((qty * price) - fees, 4)

            holding["unitsHeld"] = round(new_units, 8)
            holding["averageBuyPrice"] = round(new_wac, 8)

        elif t_type == "SPLIT":
            split_ratio = price if price > 0 else qty
            if split_ratio <= 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Split ratio (price or quantity) must be greater than 0",
                )
            new_units = old_units * split_ratio
            new_wac = (old_wac / split_ratio) if split_ratio > 0 else 0.0

            holding["unitsHeld"] = round(new_units, 8)
            holding["averageBuyPrice"] = round(new_wac, 8)

        elif t_type == "TRANSFER_IN":
            new_units = old_units + qty
            transfer_cost = (qty * price) + fees
            total_cost = (old_units * old_wac) + transfer_cost
            new_wac = (total_cost / new_units) if new_units > 0 else 0.0

            holding["unitsHeld"] = round(new_units, 8)
            holding["averageBuyPrice"] = round(new_wac, 8)

        elif t_type == "TRANSFER_OUT":
            if qty > old_units:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Insufficient units for transfer out. Available: {old_units}, Requested: {qty}",
                )
            new_units = old_units - qty
            new_wac = old_wac

            holding["unitsHeld"] = round(new_units, 8)
            holding["averageBuyPrice"] = round(new_wac, 8)

        elif t_type == "DIVIDEND":
            # Cash dividend does not modify units or WAC
            if amount == 0 and qty > 0 and price > 0:
                amount = round(qty * price, 4)

        elif t_type == "FEE":
            # Standalone fee (not part of BUY/SELL). If qty == 0, adjusts cost basis cleanly.
            if qty == 0 and fees > 0 and old_units > 0:
                new_wac = old_wac + (fees / old_units)
                holding["averageBuyPrice"] = round(new_wac, 8)

        holding["updatedAt"] = now

        new_tx = {
            "id": tx_id,
            "userId": user_id,
            "holdingId": tx_in.holdingId,
            "transactionType": t_type,
            "quantity": qty,
            "price": price,
            "amount": amount,
            "fees": fees,
            "currency": tx_in.currency or holding.get("currency", "USD"),
            "transactionDate": tx_in.transactionDate,
            "externalTransactionId": tx_in.externalTransactionId,
            "notes": tx_in.notes,
            "createdAt": now,
            "realizedPnL": realized_pnl,
        }

        MOCK_TRANSACTIONS[tx_id] = new_tx

    # Supabase Atomic Sync via PL/pgSQL RPC if credentials configured
    if settings.SUPABASE_URL and settings.SUPABASE_KEY:
        try:
            from supabase import create_client
            supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
            supabase.rpc("process_investment_transaction", {
                "p_user_id": user_id,
                "p_holding_id": new_tx["holdingId"],
                "p_transaction_type": t_type,
                "p_quantity": new_tx["quantity"],
                "p_price": new_tx["price"],
                "p_amount": new_tx["amount"],
                "p_fees": new_tx["fees"],
                "p_currency": new_tx["currency"],
                "p_transaction_date": new_tx["transactionDate"].isoformat(),
                "p_external_transaction_id": new_tx["externalTransactionId"],
                "p_notes": new_tx["notes"],
            }).execute()
        except Exception as e:
            print(f"Supabase transaction RPC sync note: {e}")

    return TransactionResponse(
        id=new_tx["id"],
        userId=new_tx["userId"],
        holdingId=new_tx["holdingId"],
        transactionType=new_tx["transactionType"],
        quantity=new_tx["quantity"],
        price=new_tx["price"],
        amount=new_tx["amount"],
        fees=new_tx["fees"],
        currency=new_tx["currency"],
        transactionDate=new_tx["transactionDate"],
        externalTransactionId=new_tx["externalTransactionId"],
        notes=new_tx["notes"],
        createdAt=new_tx["createdAt"],
        realizedPnL=new_tx["realizedPnL"],
    )


# ---------------------------------------------------------------------------
# Portfolio Summary Endpoint
# ---------------------------------------------------------------------------
@router.get("/summary", response_model=InvestmentSummaryResponse)
async def get_investment_summary(current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    user_base_currency = current_user.get("currency", "USD")

    with LOCK:
        user_holdings = [
            h for h in MOCK_HOLDINGS.values()
            if h["userId"] == user_id and h.get("status", "active") == "active"
        ]

    try:
        rates_data = await get_current_rates(user_base_currency)
    except Exception:
        rates_data = {user_base_currency: 1.0}

    total_val_base = 0.0
    total_cost_base = 0.0
    allocation_totals: dict[str, float] = {}

    for h in user_holdings:
        units = float(h.get("unitsHeld", 0))
        curr_price = float(h.get("currentPrice", 0))
        avg_price = float(h.get("averageBuyPrice", 0))
        inst_currency = h.get("currency", "USD").upper()

        val_native = units * curr_price
        cost_native = units * avg_price

        # Convert native currency to user base currency
        if inst_currency == user_base_currency.upper():
            rate = 1.0
        elif inst_currency in rates_data and rates_data[inst_currency] > 0:
            rate = 1.0 / rates_data[inst_currency]
        else:
            rate = 1.0

        val_base = val_native * rate
        cost_base = cost_native * rate

        total_val_base += val_base
        total_cost_base += cost_base

        atype = h.get("assetType", "other")
        allocation_totals[atype] = allocation_totals.get(atype, 0.0) + val_base

    total_unrealized_pnl_base = round(total_val_base - total_cost_base, 2)
    unrealized_pnl_pct = (
        round((total_unrealized_pnl_base / total_cost_base) * 100, 2) if total_cost_base > 0 else 0.0
    )

    allocation_list = [
        AssetAllocationItem(
            assetType=atype,
            valueBase=round(val, 2),
            percentage=round((val / total_val_base) * 100, 2) if total_val_base > 0 else 0.0,
        )
        for atype, val in allocation_totals.items()
    ]
    allocation_list.sort(key=lambda x: x.valueBase, reverse=True)

    return InvestmentSummaryResponse(
        totalValueBase=round(total_val_base, 2),
        totalCostBasisBase=round(total_cost_base, 2),
        totalUnrealizedPnLBase=total_unrealized_pnl_base,
        unrealizedPnLPercent=unrealized_pnl_pct,
        holdingCount=len(user_holdings),
        userCurrency=user_base_currency,
        allocationByAssetType=allocation_list,
    )
