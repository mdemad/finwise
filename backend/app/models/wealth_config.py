"""
FinWise Centralized Wealth & Net Worth Configuration
===================================================
Central taxonomy for 16 Asset Categories, 8 Liability Categories,
Liquidity Classification, Macro Groupings, and Deterministic Scoring.
"""

from typing import Dict, Any, List

ASSET_CATEGORIES: Dict[str, Dict[str, Any]] = {
    "cash_bank": {
        "id": "cash_bank",
        "name": "Cash / Bank",
        "liquidity": "liquid",
        "group": "cash_liquidity",
        "color": "#10b981",  # Emerald
    },
    "stocks": {
        "id": "stocks",
        "name": "Stocks",
        "liquidity": "liquid",
        "group": "growth",
        "color": "#3b82f6",  # Blue
    },
    "mutual_funds": {
        "id": "mutual_funds",
        "name": "Mutual Funds",
        "liquidity": "liquid",
        "group": "growth",
        "color": "#6366f1",  # Indigo
    },
    "gold": {
        "id": "gold",
        "name": "Gold",
        "liquidity": "illiquid",
        "group": "defensive",
        "color": "#eab308",  # Amber/Yellow
    },
    "silver": {
        "id": "silver",
        "name": "Silver",
        "liquidity": "illiquid",
        "group": "defensive",
        "color": "#94a3b8",  # Slate
    },
    "precious_assets": {
        "id": "precious_assets",
        "name": "Diamonds / Precious Assets",
        "liquidity": "illiquid",
        "group": "defensive",
        "color": "#a855f7",  # Purple
    },
    "land": {
        "id": "land",
        "name": "Land",
        "liquidity": "illiquid",
        "group": "real_assets",
        "color": "#84cc16",  # Lime
    },
    "real_estate": {
        "id": "real_estate",
        "name": "Real Estate",
        "liquidity": "illiquid",
        "group": "real_assets",
        "color": "#f97316",  # Orange
    },
    "fixed_deposits": {
        "id": "fixed_deposits",
        "name": "Fixed Deposits",
        "liquidity": "liquid",
        "group": "cash_liquidity",
        "color": "#06b6d4",  # Cyan
    },
    "bonds": {
        "id": "bonds",
        "name": "Bonds",
        "liquidity": "liquid",
        "group": "defensive",
        "color": "#14b8a6",  # Teal
    },
    "bitcoin": {
        "id": "bitcoin",
        "name": "Bitcoin",
        "liquidity": "liquid",
        "group": "growth",
        "color": "#f59e0b",  # Amber
    },
    "crypto": {
        "id": "crypto",
        "name": "Cryptocurrency",
        "liquidity": "liquid",
        "group": "growth",
        "color": "#ec4899",  # Pink
    },
    "vehicles": {
        "id": "vehicles",
        "name": "Vehicles",
        "liquidity": "illiquid",
        "group": "real_assets",
        "color": "#64748b",  # Slate Blue
    },
    "business": {
        "id": "business",
        "name": "Business Ownership",
        "liquidity": "illiquid",
        "group": "growth",
        "color": "#8b5cf6",  # Violet
    },
    "other": {
        "id": "other",
        "name": "Other Assets",
        "liquidity": "illiquid",
        "group": "alternative",
        "color": "#71717a",  # Zinc
    },
    "custom": {
        "id": "custom",
        "name": "Custom Asset",
        "liquidity": "illiquid",
        "group": "alternative",
        "color": "#0ea5e9",  # Sky
    },
}

LIABILITY_CATEGORIES: Dict[str, Dict[str, Any]] = {
    "home_loan": {"id": "home_loan", "name": "Home Loan", "color": "#ef4444"},
    "personal_loan": {"id": "personal_loan", "name": "Personal Loan", "color": "#f43f5e"},
    "education_loan": {"id": "education_loan", "name": "Education Loan", "color": "#fb7185"},
    "vehicle_loan": {"id": "vehicle_loan", "name": "Vehicle Loan", "color": "#e11d48"},
    "credit_card": {"id": "credit_card", "name": "Credit Card", "color": "#b91c1c"},
    "business_loan": {"id": "business_loan", "name": "Business Loan", "color": "#991b1b"},
    "other_debt": {"id": "other_debt", "name": "Other Debt", "color": "#7f1d1d"},
    "custom": {"id": "custom", "name": "Custom Liability", "color": "#dc2626"},
}

MACRO_GROUPS: Dict[str, Dict[str, Any]] = {
    "growth": {"id": "growth", "name": "Growth Assets", "color": "#3b82f6"},
    "defensive": {"id": "defensive", "name": "Defensive / Store-of-Value", "color": "#eab308"},
    "real_assets": {"id": "real_assets", "name": "Real Assets", "color": "#f97316"},
    "cash_liquidity": {"id": "cash_liquidity", "name": "Cash / Liquidity", "color": "#10b981"},
    "alternative": {"id": "alternative", "name": "Alternative Assets", "color": "#8b5cf6"},
}


def calculate_diversification_score(
    category_count: int,
    max_concentration_pct: float,
    group_count: int,
    liquid_pct: float,
) -> Dict[str, Any]:
    """
    Deterministic scoring methodology for FinWise Diversification Score (0-100).
    
    Pillars:
    1. Category Breadth (0 - 25 pts)
    2. Concentration Balance (0 - 30 pts)
    3. Macro Group Distribution (0 - 25 pts)
    4. Liquidity Health (0 - 20 pts)
    """
    factors: List[Dict[str, Any]] = []

    # 1. Category Breadth (0 - 25)
    if category_count >= 5:
        cat_pts = 25
        factors.append({"name": "Broad Category Spread", "pts": 25, "note": "5+ distinct asset categories held"})
    elif category_count == 4:
        cat_pts = 20
        factors.append({"name": "Good Category Spread", "pts": 20, "note": "4 distinct asset categories held"})
    elif category_count == 3:
        cat_pts = 15
        factors.append({"name": "Moderate Category Spread", "pts": 15, "note": "3 distinct asset categories held"})
    elif category_count == 2:
        cat_pts = 10
        factors.append({"name": "Basic Category Spread", "pts": 10, "note": "2 distinct asset categories held"})
    elif category_count == 1:
        cat_pts = 5
        factors.append({"name": "Single Category Exposure", "pts": 5, "note": "Only 1 asset category held"})
    else:
        cat_pts = 0
        factors.append({"name": "No Assets Recorded", "pts": 0, "note": "Add assets to begin scoring"})

    # 2. Concentration Risk (0 - 30)
    if category_count == 0:
        conc_pts = 0
    elif max_concentration_pct <= 25.0:
        conc_pts = 30
        factors.append({"name": "Well-Balanced Allocation", "pts": 30, "note": f"Largest category is {max_concentration_pct:.1f}% (<= 25%)"})
    elif max_concentration_pct <= 40.0:
        conc_pts = 25
        factors.append({"name": "Moderate Concentration", "pts": 25, "note": f"Largest category is {max_concentration_pct:.1f}% (<= 40%)"})
    elif max_concentration_pct <= 55.0:
        conc_pts = 18
        factors.append({"name": "Elevated Concentration", "pts": 18, "note": f"Largest category is {max_concentration_pct:.1f}% (<= 55%)"})
    elif max_concentration_pct <= 70.0:
        conc_pts = 10
        factors.append({"name": "High Single-Asset Exposure", "pts": 10, "note": f"Largest category is {max_concentration_pct:.1f}% (<= 70%)"})
    else:
        conc_pts = 4
        factors.append({"name": "Heavy Asset Concentration", "pts": 4, "note": f"Largest category is {max_concentration_pct:.1f}% (> 70%)"})

    # 3. Macro Group Spread (0 - 25)
    if group_count >= 3:
        group_pts = 25
        factors.append({"name": "Multi-Group Diversification", "pts": 25, "note": f"{group_count} macro asset groups represented"})
    elif group_count == 2:
        group_pts = 15
        factors.append({"name": "Dual-Group Spread", "pts": 15, "note": "2 macro asset groups represented"})
    elif group_count == 1:
        group_pts = 5
        factors.append({"name": "Single Macro Group", "pts": 5, "note": "Assets belong to only 1 macro group"})
    else:
        group_pts = 0

    # 4. Liquidity Health (0 - 20)
    if category_count == 0:
        liq_pts = 0
    elif 15.0 <= liquid_pct <= 85.0:
        liq_pts = 20
        factors.append({"name": "Optimal Liquidity Ratio", "pts": 20, "note": f"{liquid_pct:.1f}% liquid assets (healthy 15-85% band)"})
    elif liquid_pct < 15.0:
        liq_pts = 8
        factors.append({"name": "Low Liquidity Buffer", "pts": 8, "note": f"{liquid_pct:.1f}% liquid assets (below 15% safety threshold)"})
    else:  # liquid_pct > 85.0
        liq_pts = 12
        factors.append({"name": "High Liquidity Concentration", "pts": 12, "note": f"{liquid_pct:.1f}% liquid assets (potential cash drag)"})

    total_score = min(100, max(0, cat_pts + conc_pts + group_pts + liq_pts))

    return {
        "score": total_score,
        "maxScore": 100,
        "factors": factors,
        "categoryPoints": cat_pts,
        "concentrationPoints": conc_pts,
        "groupPoints": group_pts,
        "liquidityPoints": liq_pts,
    }
