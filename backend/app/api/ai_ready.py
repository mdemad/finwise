from fastapi import APIRouter, Depends
from app.models.schemas import AIQuery, AIResponse
from app.api.auth import get_current_user
import random

router = APIRouter(prefix="/ai", tags=["ai_ready"])

@router.post("/recommend", response_model=AIResponse)
async def generate_financial_recommendations(query: AIQuery, current_user: dict = Depends(get_current_user)):
    prompt_lower = query.prompt.lower()
    
    # Defaults
    insights = [
        "Your asset-to-liability ratio is currently in a healthy range.",
        "Compounding returns are highest when left untouched for over 10 years.",
        "Consider allocating at least 20% of your net worth to index equities."
    ]
    response = "Based on your financial parameters, your general direction looks stable. Keep investing consistently."
    recommended_adjustments = {"action": "hold", "amount": 0, "message": "Maintain your current SIP amounts."}

    # Dynamic parsing to generate contextual mock outputs
    if "retirement" in prompt_lower or "retire" in prompt_lower:
        response = f"Hello {current_user['name']}, analyzing your retirement parameters. Given typical post-retirement inflation of 6%, a conservative withdrawal rate of 3.5% is recommended to ensure your corpus lasts beyond 35 years."
        insights = [
            "Post-retirement return rate is conservative (typically 7-9%) to prevent sequence-of-returns risk.",
            "Adjusting for inflation is critical: your retirement expenses will double approximately every 12 years."
        ]
        recommended_adjustments = {"action": "increase_sip", "amount": 2000, "message": "Increase monthly retirement SIP to bridge the corpus gap."}
        
    elif "fire" in prompt_lower:
        response = "To reach Financial Independence Retire Early (FIRE), your target corpus must reach at least 25x your annual expenses. Based on standard simulations, early retirement requires an aggressive saving rate (50%+ of your income)."
        insights = [
            "The 4% Safe Withdrawal Rate rule is highly sensitive to early sequence of returns.",
            "Building a bridge fund (taxable assets) is necessary to fund life before standard retirement age account access."
        ]
        recommended_adjustments = {"action": "increase_saving_rate", "percentage": 10, "message": "Increase monthly FIRE SIP by 10% next year."}
        
    elif "sip" in prompt_lower or "investment" in prompt_lower:
        response = "Reviewing your Systematic Investment Plan. Over a 10+ year term, equity compounding averages 12%. Adding an annual step-up of 10% is the single most effective way to multiply your final wealth without feeling immediate cash flow strains."
        insights = [
            "Step-up SIPs exploit salary increments to scale investments seamlessly.",
            "Compounding builds most of its mass in the final 20% of your investment duration."
        ]
        recommended_adjustments = {"action": "step_up", "percentage": 10, "message": "Set an automatic 10% annual step-up on your mutual fund SIPs."}
        
    elif "emergency" in prompt_lower or "crisis" in prompt_lower:
        response = "Emergency fund sizing should represent 3 to 6 months of expenses. Dependents or contract/freelance employment profiles require up to 9 months of liquidity."
        insights = [
            "Store emergency funds in liquid sweep-in FDs or liquid mutual funds rather than cash.",
            "Do not count long-term stocks or illiquid real estate towards emergency reserves."
        ]
        recommended_adjustments = {"action": "add_buffer", "months": 2, "message": "Increase emergency reserves to cover 2 additional months."}

    return AIResponse(
        response=response,
        insights=insights,
        recommendedGoalAdjustments=recommended_adjustments
    )
