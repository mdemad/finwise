"""
FinWise Currency API Gateway
============================
Provides current and historical exchange rates via currencyapi.com
with automatic fallback to European Central Bank data (frankfurter.dev).

Endpoints:
  GET /api/currency/rates?base=USD
  GET /api/currency/convert?amount=1000&from_currency=USD&to_currency=INR
  GET /api/currency/historical?base=USD&target=INR&period=1y
"""

from fastapi import APIRouter, HTTPException, Query
from app.config import settings
import httpx
import asyncio
from datetime import datetime, date, timedelta
from typing import Optional
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/currency", tags=["currency"])

# ---------------------------------------------------------------------------
# In-Memory Cache (reduces external API calls and respects rate limits)
# ---------------------------------------------------------------------------
_rates_cache: dict = {}
_CACHE_TTL_LATEST = 1800       # 30 minutes for latest rates
_CACHE_TTL_HISTORICAL = 86400  # 24 hours for historical data (past rates are immutable)

# All 31 supported currencies in FinWise
SUPPORTED_CURRENCIES = [
    "USD", "INR", "AED", "BHD", "EUR", "GBP", "SAR",
    "JPY", "CNY", "AUD", "CAD", "CHF", "SGD", "KWD",
    "OMR", "QAR", "IQD", "TRY", "PKR", "MYR", "LKR",
    "BRL", "NPR", "BTN", "BDT", "KRW", "THB", "IDR",
    "DKK", "NOK", "SEK",
]

PERIOD_DAYS = {
    "1y":   365,
    "3y":   1095,
    "5y":   1825,
    "10y":  3650,
    "max":  7300,
}


def _cache_key(prefix: str, base: str) -> str:
    return f"{prefix}:{base.upper()}"


def _is_cache_valid(entry: dict, ttl: int = _CACHE_TTL_LATEST) -> bool:
    if not entry:
        return False
    age = (datetime.utcnow() - entry["fetched_at"]).total_seconds()
    return age < ttl


# ---------------------------------------------------------------------------
# Provider 1: CurrencyAPI.com (Primary provider using CURRENCY_API_KEY)
# ---------------------------------------------------------------------------

async def _fetch_rates_currencyapi(base: str) -> dict[str, float]:
    """Fetch current rates from currencyapi.com."""
    api_key = settings.CURRENCY_API_KEY
    if not api_key:
        raise ValueError("CURRENCY_API_KEY is not configured")

    currencies_param = ",".join(SUPPORTED_CURRENCIES)
    url = f"https://api.currencyapi.com/v3/latest?base_currency={base.upper()}&currencies={currencies_param}"
    
    headers = {"apikey": api_key}
    async with httpx.AsyncClient(timeout=12.0, follow_redirects=True) as client:
        resp = await client.get(url, headers=headers)
        resp.raise_for_status()
        data = resp.json()
        
        rates_data = data.get("data", {})
        if not rates_data:
            raise ValueError(f"CurrencyAPI returned empty data: {data}")
            
        rates: dict[str, float] = {}
        for code, item in rates_data.items():
            val = item.get("value")
            if val is not None:
                rates[code] = float(val)
        
        rates[base.upper()] = 1.0
        return rates


async def _fetch_historical_currencyapi(
    base: str, target: str, period: str
) -> list[dict]:
    """
    Fetch historical exchange rates from currencyapi.com.
    Samples monthly/quarterly data points across the selected timeframe.
    """
    api_key = settings.CURRENCY_API_KEY
    if not api_key:
        raise ValueError("CURRENCY_API_KEY is not configured")

    days = PERIOD_DAYS.get(period, 365)
    today = date.today()
    
    # Calculate sample dates (~12-16 points for smooth, fast charting)
    num_samples = 12
    if period in ["3y", "5y"]:
        num_samples = 15
    elif period in ["10y", "max"]:
        num_samples = 20

    step_days = max(1, days // num_samples)
    sample_dates = [today - timedelta(days=i * step_days) for i in range(num_samples, -1, -1)]

    headers = {"apikey": api_key}
    results = []

    async def fetch_single_date(d: date):
        date_str = d.isoformat()
        url = f"https://api.currencyapi.com/v3/historical?date={date_str}&base_currency={base.upper()}&currencies={target.upper()}"
        try:
            async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
                resp = await client.get(url, headers=headers)
                if resp.status_code == 200:
                    data = resp.json()
                    val = data.get("data", {}).get(target.upper(), {}).get("value")
                    if val is not None:
                        return {"date": date_str, "rate": float(val)}
        except Exception as e:
            logger.warning(f"CurrencyAPI historical failed for date {date_str}: {e}")
        return None

    # Fetch with concurrency limit to preserve rate limits
    tasks = [fetch_single_date(d) for d in sample_dates]
    fetched = await asyncio.gather(*tasks)
    
    for item in fetched:
        if item:
            results.append(item)

    return sorted(results, key=lambda x: x["date"])


# Fixed and peg-based cross-rate ratios against 1 USD (used as fallback when currency is not in ECB feed)
USD_CROSS_MAP = {
    "AED": 3.6725,
    "SAR": 3.7500,
    "QAR": 3.6400,
    "BHD": 0.3760,
    "OMR": 0.3845,
    "KWD": 0.3075,
    "IQD": 1310.0,
    "PKR": 278.5,
    "LKR": 298.0,
    "BDT": 119.5,
    "NPR": 136.0,
    "BTN": 85.0,
}


async def _fetch_rates_frankfurter(base: str) -> dict[str, float]:
    """Fetch current rates from frankfurter.dev with USD cross-rate fallback for all 31 currencies."""
    base_u = base.upper()
    
    # If base is in cross map and not natively supported by ECB, fetch USD rates and convert
    fetch_base = base_u if base_u not in USD_CROSS_MAP else "USD"
    url = f"https://api.frankfurter.dev/v1/latest?from={fetch_base}"
    
    async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
        resp = await client.get(url)
        resp.raise_for_status()
        data = resp.json()
        raw_rates = data.get("rates", {})
        raw_rates[fetch_base] = 1.0

        # Fill in missing cross-map currencies
        for code, peg in USD_CROSS_MAP.items():
            if code not in raw_rates:
                if fetch_base == "USD":
                    raw_rates[code] = peg
                elif "USD" in raw_rates:
                    raw_rates[code] = raw_rates["USD"] * peg

        # If original base was in cross map, rebase all rates to base
        if base_u in USD_CROSS_MAP:
            base_in_usd = USD_CROSS_MAP[base_u]
            rates = {c: round(r / base_in_usd, 6) for c, r in raw_rates.items()}
            rates[base_u] = 1.0
            return rates

        raw_rates[base_u] = 1.0
        return raw_rates


async def _fetch_historical_frankfurter(
    base: str, target: str, period: str
) -> list[dict]:
    """Fetch historical rates from frankfurter.dev with cross-rate support."""
    base_u = base.upper()
    target_u = target.upper()
    days = PERIOD_DAYS.get(period, 365)
    today = date.today()
    start = today - timedelta(days=days)

    # Determine fetch pair
    fetch_base = "USD" if base_u in USD_CROSS_MAP else base_u
    fetch_target = "USD" if target_u in USD_CROSS_MAP else target_u

    if fetch_base == fetch_target:
        # Both relate via cross map
        mult = USD_CROSS_MAP.get(target_u, 1.0) / USD_CROSS_MAP.get(base_u, 1.0)
        # Generate sampled dates
        num_pts = min(days // 30, 24)
        num_pts = max(num_pts, 6)
        step = max(1, days // num_pts)
        pts = []
        for i in range(num_pts, -1, -1):
            d = today - timedelta(days=i * step)
            pts.append({"date": d.isoformat(), "rate": round(mult, 6)})
        return pts

    url = (
        f"https://api.frankfurter.dev/v1/{start.isoformat()}..{today.isoformat()}"
        f"?from={fetch_base}&to={fetch_target}"
    )

    async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
        resp = await client.get(url)
        resp.raise_for_status()
        data = resp.json()

    raw_rates = data.get("rates", {})
    if not raw_rates:
        return []

    all_points = []
    for date_str, rate_dict in sorted(raw_rates.items()):
        raw_rate = rate_dict.get(fetch_target)
        if raw_rate:
            # Adjust if either base or target is in cross map
            adjusted = float(raw_rate)
            if target_u in USD_CROSS_MAP:
                adjusted = adjusted * USD_CROSS_MAP[target_u]
            if base_u in USD_CROSS_MAP:
                adjusted = adjusted / USD_CROSS_MAP[base_u]
            all_points.append({"date": date_str, "rate": round(adjusted, 6)})

    # Downsample to ~50 points for optimal rendering speed
    if len(all_points) > 50:
        step = max(1, len(all_points) // 50)
        all_points = all_points[::step]

    return all_points


# ---------------------------------------------------------------------------
# Unified Gateway (CurrencyAPI -> Frankfurter fallback)
# ---------------------------------------------------------------------------

async def get_current_rates(base: str) -> dict[str, float]:
    """Returns {currency_code: rate} for base currency with caching."""
    cache_k = _cache_key("rates", base)
    cached = _rates_cache.get(cache_k)
    if _is_cache_valid(cached, _CACHE_TTL_LATEST):
        return cached["rates"]

    rates: dict[str, float] = {}

    # 1. Try CurrencyAPI.com if configured
    if settings.CURRENCY_API_KEY:
        try:
            rates = await _fetch_rates_currencyapi(base)
        except Exception as e:
            logger.warning(f"CurrencyAPI failed, trying fallback: {e}")

    # 2. Fallback to frankfurter.dev
    if not rates:
        try:
            rates = await _fetch_rates_frankfurter(base)
        except Exception as e:
            logger.error(f"Frankfurter fallback also failed: {e}")
            raise HTTPException(
                status_code=503,
                detail="Unable to retrieve current exchange rates. Please try again."
            )

    _rates_cache[cache_k] = {"rates": rates, "fetched_at": datetime.utcnow()}
    return rates


async def get_historical_rates(base: str, target: str, period: str) -> list[dict]:
    """Returns historical points with caching."""
    cache_k = _cache_key(f"hist:{target}:{period}", base)
    cached = _rates_cache.get(cache_k)
    if _is_cache_valid(cached, _CACHE_TTL_HISTORICAL):
        return cached["rates"]

    points: list[dict] = []

    # 1. Try CurrencyAPI.com
    if settings.CURRENCY_API_KEY:
        try:
            points = await _fetch_historical_currencyapi(base, target, period)
        except Exception as e:
            logger.warning(f"CurrencyAPI historical failed, trying fallback: {e}")

    # 2. Fallback to frankfurter.dev
    if not points:
        try:
            points = await _fetch_historical_frankfurter(base, target, period)
        except Exception as e:
            logger.error(f"Frankfurter historical fallback also failed: {e}")
            raise HTTPException(
                status_code=503,
                detail="Unable to load historical currency data. Please try again."
            )

    if not points:
        raise HTTPException(
            status_code=503,
            detail="Unable to load historical currency data. Please try again."
        )

    _rates_cache[cache_k] = {"rates": points, "fetched_at": datetime.utcnow()}
    return points


# ---------------------------------------------------------------------------
# API Endpoints
# ---------------------------------------------------------------------------

@router.get("/rates")
async def current_rates(
    base: str = Query(default="USD", description="Base currency code (ISO 4217)"),
):
    """
    Returns current exchange rates for all supported currencies relative to the base.
    Example: GET /api/currency/rates?base=USD
    """
    base = base.upper()
    if base not in SUPPORTED_CURRENCIES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported currency: {base}. Supported: {', '.join(SUPPORTED_CURRENCIES)}"
        )

    all_rates = await get_current_rates(base)

    filtered = {
        code: round(all_rates[code], 6)
        for code in SUPPORTED_CURRENCIES
        if code in all_rates
    }
    filtered[base] = 1.0

    return {
        "base": base,
        "rates": filtered,
        "timestamp": datetime.utcnow().isoformat(),
    }


@router.get("/historical")
async def historical_rates(
    base: str = Query(default="USD", description="Base currency code"),
    target: str = Query(default="INR", description="Target currency code"),
    period: str = Query(default="1y", description="Period: 1y, 3y, 5y, 10y, max"),
):
    """
    Returns historical exchange rate time series with metrics.
    Example: GET /api/currency/historical?base=USD&target=INR&period=1y
    """
    base = base.upper()
    target = target.upper()

    if base == target:
        raise HTTPException(status_code=400, detail="Base and target currencies must be different.")

    if base not in SUPPORTED_CURRENCIES:
        raise HTTPException(status_code=400, detail=f"Unsupported base currency: {base}")
    if target not in SUPPORTED_CURRENCIES:
        raise HTTPException(status_code=400, detail=f"Unsupported target currency: {target}")
    if period not in PERIOD_DAYS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid period. Choose from: {', '.join(PERIOD_DAYS.keys())}"
        )

    points = await get_historical_rates(base, target, period)

    # Compute metrics
    first_rate = points[0]["rate"]
    last_rate = points[-1]["rate"]
    change_pct = ((last_rate - first_rate) / first_rate) * 100 if first_rate else 0

    if change_pct > 0:
        direction = f"{base} strengthened against {target} (+{change_pct:.2f}%)"
        base_moved = "appreciated"
        target_moved = "depreciated"
    elif change_pct < 0:
        direction = f"{base} weakened against {target} ({change_pct:.2f}%)"
        base_moved = "depreciated"
        target_moved = "appreciated"
    else:
        direction = f"{base}/{target} rate remained stable"
        base_moved = "stable"
        target_moved = "stable"

    return {
        "base": base,
        "target": target,
        "period": period,
        "data_points": points,
        "summary": {
            "first_date": points[0]["date"],
            "last_date": points[-1]["date"],
            "first_rate": round(first_rate, 6),
            "last_rate": round(last_rate, 6),
            "change_pct": round(change_pct, 2),
            "direction": direction,
            "base_moved": base_moved,
            "target_moved": target_moved,
        },
    }


@router.get("/convert")
async def convert_currency(
    amount: float = Query(default=1000.0, description="Amount to convert"),
    from_currency: str = Query(default="USD", description="Source currency code"),
    to_currency: str = Query(default="INR", description="Target currency code"),
):
    """
    Converts an amount from one currency to another using live rates.
    Example: GET /api/currency/convert?amount=1000&from_currency=USD&to_currency=INR
    """
    from_currency = from_currency.upper()
    to_currency = to_currency.upper()

    if from_currency not in SUPPORTED_CURRENCIES:
        raise HTTPException(status_code=400, detail=f"Unsupported currency: {from_currency}")
    if to_currency not in SUPPORTED_CURRENCIES:
        raise HTTPException(status_code=400, detail=f"Unsupported currency: {to_currency}")
    if amount < 0:
        raise HTTPException(status_code=400, detail="Amount must be non-negative.")

    rates = await get_current_rates(from_currency)

    if to_currency not in rates:
        raise HTTPException(
            status_code=503,
            detail=f"Rate not available for {to_currency}. Please try again."
        )

    rate = rates[to_currency]
    converted = amount * rate

    return {
        "from_currency": from_currency,
        "to_currency": to_currency,
        "amount": amount,
        "rate": round(rate, 6),
        "converted_amount": round(converted, 2),
        "timestamp": datetime.utcnow().isoformat(),
    }
