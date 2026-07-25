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
