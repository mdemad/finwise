from fastapi import APIRouter, Depends, HTTPException, status, Header
import jwt
from jwt import PyJWKClient
from datetime import datetime, timezone
from app.config import settings
from app.models.schemas import UserResponse, UserUpdate
import os
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["auth"])

# Thread-safe in-memory user table
MOCK_USERS = {}

# Global JWK client cache per JWKS URL
_jwks_clients = {}


def get_jwks_client(supabase_url: str) -> PyJWKClient:
    jwks_url = f"{supabase_url.rstrip('/')}/auth/v1/.well-known/jwks.json"
    if jwks_url not in _jwks_clients:
        _jwks_clients[jwks_url] = PyJWKClient(jwks_url)
    return _jwks_clients[jwks_url]


def verify_supabase_token(token: str) -> dict:
    """
    Cryptographically verifies a Supabase Auth access token.
    Enforces strict signature verification (`verify_signature=True`) and expiration (`verify_exp=True`).
    Uses the project's official JWKS endpoint (ES256 / RS256) or explicit SUPABASE_JWT_SECRET (HS256).
    Legacy custom FinWise JWT tokens signed with old JWT_SECRET are strictly rejected.
    """
    try:
        header = jwt.get_unverified_header(token)
        alg = header.get("alg")
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization token format",
        )

    supabase_url = settings.SUPABASE_URL or os.getenv("VITE_SUPABASE_URL", "")
    supabase_jwt_secret = settings.SUPABASE_JWT_SECRET

    payload = None
    verification_error = None

    decode_options = {
        "verify_signature": True,
        "verify_exp": True,
        "verify_aud": False,  # Validated explicitly below
    }

    # 1. Asymmetric signature verification via Supabase JWKS (ES256 / RS256 / PS256)
    if alg in ["ES256", "RS256", "PS256"] and supabase_url:
        try:
            jwks_client = get_jwks_client(supabase_url)
            signing_key = jwks_client.get_signing_key_from_jwt(token)
            payload = jwt.decode(
                token,
                signing_key.key,
                algorithms=[alg],
                options=decode_options,
            )
        except Exception as err:
            verification_error = f"JWKS verification failed: {str(err)}"

    # 2. Symmetric signature verification via explicit SUPABASE_JWT_SECRET ONLY (HS256)
    # Note: We explicitly DO NOT fall back to legacy JWT_SECRET.
    elif alg == "HS256" and supabase_jwt_secret:
        try:
            payload = jwt.decode(
                token,
                supabase_jwt_secret,
                algorithms=["HS256"],
                options=decode_options,
            )
        except Exception as err:
            verification_error = f"Symmetric secret verification failed: {str(err)}"

    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Could not validate credentials: {verification_error or 'Unsupported token algorithm or missing verification key'}",
        )

    # Validate Supabase Auth sub claim
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing sub claim",
        )

    # Validate aud claim if present
    aud = payload.get("aud")
    if aud and aud != "authenticated":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token audience",
        )

    # Validate iss claim if present
    iss = payload.get("iss")
    if iss and supabase_url:
        expected_prefix = supabase_url.rstrip("/")
        if not iss.startswith(expected_prefix):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token issuer",
            )

    return payload


def get_current_user(
    authorization: str | None = Header(None, description="Bearer JWT Token"),
) -> dict:
    """
    FastAPI dependency ensuring request has a valid Supabase Auth JWT token.
    Extracts the authenticated Supabase user UUID from `sub`.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization format. Must be Bearer <token>",
        )

    token = authorization.split(" ", 1)[1].strip()
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing access token",
        )

    payload = verify_supabase_token(token)
    user_id = payload["sub"]

    email = payload.get("email", "")
    user_metadata = payload.get("user_metadata", {})
    name = (
        user_metadata.get("name")
        or user_metadata.get("full_name")
        or payload.get("name")
        or (email.split("@")[0] if email else "User")
    )
    currency = user_metadata.get("currency", "USD")

    # Maintain user in memory keyed by Supabase Auth UUID (no email auto-merging)
    if user_id not in MOCK_USERS:
        MOCK_USERS[user_id] = {
            "id": user_id,
            "email": email,
            "name": name,
            "currency": currency,
            "createdAt": datetime.now(timezone.utc),
        }
    else:
        if name and name != "User":
            MOCK_USERS[user_id]["name"] = name
        if email:
            MOCK_USERS[user_id]["email"] = email

    # Safely insert/update user in Supabase application `users` table
    if settings.SUPABASE_URL and settings.SUPABASE_KEY:
        try:
            from supabase import create_client
            supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
            supabase.table("users").upsert({
                "id": user_id,
                "email": email,
                "name": name,
                "currency": currency,
            }).execute()
        except Exception as err:
            logger.warning("Supabase application users table upsert note: %s", type(err).__name__)

    return MOCK_USERS[user_id]


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return UserResponse(
        id=current_user["id"],
        email=current_user["email"],
        name=current_user["name"],
        currency=current_user.get("currency", "USD"),
        createdAt=current_user.get("createdAt", datetime.now(timezone.utc)),
    )


@router.put("/profile", response_model=UserResponse)
async def update_profile(
    profile_in: UserUpdate,
    current_user: dict = Depends(get_current_user),
):
    user_id = current_user["id"]

    if user_id in MOCK_USERS:
        MOCK_USERS[user_id]["name"] = profile_in.name
        MOCK_USERS[user_id]["currency"] = profile_in.currency

    if settings.SUPABASE_URL and settings.SUPABASE_KEY:
        try:
            from supabase import create_client
            supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
            supabase.table("users").update({
                "name": profile_in.name,
                "currency": profile_in.currency,
            }).eq("id", user_id).execute()
        except Exception as err:
            logger.warning("Supabase profile update note: %s", type(err).__name__)

    return UserResponse(
        id=user_id,
        email=current_user["email"],
        name=profile_in.name,
        currency=profile_in.currency,
        createdAt=current_user.get("createdAt", datetime.now(timezone.utc)),
    )