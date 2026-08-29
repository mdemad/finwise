import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "FinWise API"
    API_V1_STR: str = "/api"
    
    # JWT security settings
    JWT_SECRET: str = os.getenv("JWT_SECRET", "super_secret_finwise_key_change_me_in_production")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # Supabase credentials (optional - falls back to local sqlite/in-memory if not provided)
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_KEY: str = os.getenv("SUPABASE_KEY", "")
    
    # Currency API key (currencyapi.com primary provider)
    # Get a free key at: https://currencyapi.com
    # Add this as CURRENCY_API_KEY environment variable in backend/.env or on Render.
    CURRENCY_API_KEY: str = os.getenv("CURRENCY_API_KEY", os.getenv("EXCHANGE_RATE_API_KEY", ""))
    EXCHANGE_RATE_API_KEY: str = os.getenv("EXCHANGE_RATE_API_KEY", "")
    
    # CORS
    BACKEND_CORS_ORIGINS: list[str] = ["*"]

    class Config:
        case_sensitive = True

settings = Settings()

