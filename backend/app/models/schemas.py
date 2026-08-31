from pydantic import BaseModel, EmailStr, Field
from typing import Optional, Any
from datetime import datetime

# Auth Schemas
class UserBase(BaseModel):
    email: EmailStr
    name: str

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserUpdate(BaseModel):
    name: str
    currency: str

class UserResponse(UserBase):
    id: str
    currency: str = "USD"
    createdAt: datetime

    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    token: str
    user: UserResponse

# Calculation Schemas
class CalculationBase(BaseModel):
    calculatorType: str = Field(..., description="Calculation module name, e.g. sip, lumpsum, emi")
    name: str = Field(..., description="Custom name given by user")
    inputs: Any = Field(..., description="JSON payload of input sliders/values")
    outputs: Any = Field(..., description="JSON payload of calculated results")

class CalculationCreate(CalculationBase):
    pass

class CalculationUpdate(BaseModel):
    name: Optional[str] = None
    favorite: Optional[bool] = None

class CalculationResponse(CalculationBase):
    id: str
    userId: str
    createdAt: datetime
    favorite: bool = False

    class Config:
        from_attributes = True

# AI Ready Schemas
class AIQuery(BaseModel):
    prompt: str = Field(..., description="User query or financial question")
    portfolioSummary: Optional[Any] = Field(None, description="Current assets/liabilities snapshot")

class AIResponse(BaseModel):
    response: str = Field(..., description="AI agent financial recommendation or response")
    insights: list[str] = Field(default=[], description="Bullet insights generated")
    recommendedGoalAdjustments: Optional[Any] = None

# Asset Schemas
class AssetBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=120, description="Name or label of the asset")
    category: str = Field(..., description="Category key e.g. cash_bank, stocks, gold, etc.")
    currentValue: float = Field(..., gt=0, description="Current market / estimated value")
    purchaseValue: Optional[float] = Field(None, ge=0, description="Historical purchase price")
    purchaseDate: Optional[str] = Field(None, description="Purchase date YYYY-MM-DD")
    quantity: Optional[str] = Field(None, description="Quantity/units e.g. 50g, 10 units")
    currency: str = Field(default="USD", description="Currency denomination")
    notes: Optional[str] = Field(None, max_length=500, description="Optional user notes")

class AssetCreate(AssetBase):
    pass

class AssetUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=120)
    category: Optional[str] = None
    currentValue: Optional[float] = Field(None, gt=0)
    purchaseValue: Optional[float] = Field(None, ge=0)
    purchaseDate: Optional[str] = None
    quantity: Optional[str] = None
    currency: Optional[str] = None
    notes: Optional[str] = Field(None, max_length=500)

class AssetResponse(AssetBase):
    id: str
    userId: str
    createdAt: datetime
    updatedAt: Optional[datetime] = None
    gainLoss: Optional[float] = None
    gainLossPercent: Optional[float] = None

    class Config:
        from_attributes = True

# Liability Schemas
class LiabilityBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=120, description="Name or label of the liability")
    category: str = Field(..., description="Category key e.g. home_loan, personal_loan, etc.")
    outstandingAmount: float = Field(..., ge=0, description="Outstanding balance")
    originalAmount: Optional[float] = Field(None, ge=0, description="Original borrowed amount")
    interestRate: Optional[float] = Field(None, ge=0, le=100, description="Annual interest rate percentage")
    emi: Optional[float] = Field(None, ge=0, description="Monthly EMI payment")
    remainingTenureMonths: Optional[int] = Field(None, ge=0, description="Remaining tenure in months")
    currency: str = Field(default="USD", description="Currency denomination")
    notes: Optional[str] = Field(None, max_length=500, description="Optional notes")

class LiabilityCreate(LiabilityBase):
    pass

class LiabilityUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=120)
    category: Optional[str] = None
    outstandingAmount: Optional[float] = Field(None, ge=0)
    originalAmount: Optional[float] = Field(None, ge=0)
    interestRate: Optional[float] = Field(None, ge=0, le=100)
    emi: Optional[float] = Field(None, ge=0)
    remainingTenureMonths: Optional[int] = Field(None, ge=0)
    currency: Optional[str] = None
    notes: Optional[str] = Field(None, max_length=500)

class LiabilityResponse(LiabilityBase):
    id: str
    userId: str
    createdAt: datetime
    updatedAt: Optional[datetime] = None

    class Config:
        from_attributes = True

# Historical Snapshot Schemas
class NetWorthSnapshotBase(BaseModel):
    date: str = Field(..., description="Snapshot date or label e.g. 2026-08-30 or Aug 2026")
    totalAssets: float = Field(..., ge=0)
    totalLiabilities: float = Field(..., ge=0)
    netWorth: float

class NetWorthSnapshotCreate(NetWorthSnapshotBase):
    pass

class NetWorthSnapshotResponse(NetWorthSnapshotBase):
    id: str
    userId: str
    createdAt: datetime

    class Config:
        from_attributes = True

# Full Wealth & Diversification Summary Schema (for UI & future AI ingestion)
class AllocationItem(BaseModel):
    categoryId: str
    name: str
    value: float
    percentage: float
    color: str
    liquidity: str
    group: str
    count: int

class MacroGroupItem(BaseModel):
    groupId: str
    name: str
    value: float
    percentage: float
    color: str

class ConcentrationInsight(BaseModel):
    largestCategoryId: Optional[str] = None
    largestCategoryName: Optional[str] = None
    largestCategoryValue: float = 0
    percentage: float = 0
    isConcentrated: bool = False
    message: str = ""

class DiversificationScoreDetail(BaseModel):
    score: int
    maxScore: int = 100
    factors: list[dict[str, Any]]
    categoryPoints: int
    concentrationPoints: int
    groupPoints: int
    liquidityPoints: int

class NetWorthSummaryResponse(BaseModel):
    totalAssets: float
    totalLiabilities: float
    netWorth: float
    debtToAssetRatio: float
    liquidAssets: float
    liquidPercent: float
    illiquidAssets: float
    illiquidPercent: float
    assetCount: int
    liabilityCount: int
    categoryCount: int
    assetAllocation: list[AllocationItem]
    liabilityAllocation: list[dict[str, Any]]
    groupAllocation: list[MacroGroupItem]
    concentration: ConcentrationInsight
    diversificationScore: DiversificationScoreDetail
    currency: str

