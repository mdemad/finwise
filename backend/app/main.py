from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.api import auth, calculations, ai_ready, currency, net_worth

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Backend API for FinWise Financial planning platform",
    version="1.0.0",
)

# CORS configurations
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Routers
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(calculations.router, prefix=settings.API_V1_STR)
app.include_router(net_worth.router, prefix=settings.API_V1_STR)
app.include_router(ai_ready.router, prefix=settings.API_V1_STR)
app.include_router(currency.router, prefix=settings.API_V1_STR)

@app.get("/")
async def root():
    return {
        "status": "online",
        "message": "Welcome to the FinWise Smart Financial API. Everything is running smoothly.",
        "version": "1.0.0"
    }
