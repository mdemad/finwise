from fastapi import APIRouter, Depends, HTTPException, status, Header
from jose import jwt, JWTError
from datetime import datetime, timedelta
from passlib.context import CryptContext
from app.config import settings
from app.models.schemas import UserCreate, UserLogin, UserResponse, TokenResponse, UserUpdate
import uuid

router = APIRouter(prefix="/auth", tags=["auth"])

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Thread-safe in-memory database simulation when Supabase isn't supplied
MOCK_USERS = {}

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.ALGORITHM)
    return encoded_jwt

# Dependency to verify token and extract user
def get_current_user(authorization: str = Header(..., description="Bearer JWT Token")) -> dict:
    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization format. Must be Bearer <token>",
        )
    token = authorization.split(" ")[1]
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token payload",
            )
        
        # Supabase adapter OR Mock database check
        if settings.SUPABASE_URL and settings.SUPABASE_KEY:
            # supbase fetch user query details (impl mock for standard DB fallback)
            pass
            
        if user_id in MOCK_USERS:
            return MOCK_USERS[user_id]
        else:
            # Supabase fallback user structure
            return {"id": user_id, "email": payload.get("email", ""), "name": payload.get("name", "User"), "currency": "USD", "createdAt": datetime.utcnow()}
            
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
        )

@router.post("/signup", response_model=TokenResponse)
async def signup(user_in: UserCreate):
    # Check email exists
    for u in MOCK_USERS.values():
        if u["email"] == user_in.email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered",
            )

    user_id = str(uuid.uuid4())
    hashed_pwd = get_password_hash(user_in.password)
    
    new_user = {
        "id": user_id,
        "email": user_in.email,
        "name": user_in.name,
        "password": hashed_pwd,
        "currency": "USD",
        "createdAt": datetime.utcnow()
    }
    
    # Store in memory
    MOCK_USERS[user_id] = new_user
    
    # Supabase Integration: Insert to Supabase if configured
    if settings.SUPABASE_URL and settings.SUPABASE_KEY:
        try:
            from supabase import create_client
            supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
            # Register using Supabase Auth and database tables
            supabase.table("users").insert({
                "id": user_id,
                "email": user_in.email,
                "name": user_in.name,
                "currency": "USD",
                "created_at": datetime.utcnow().isoformat()
            }).execute()
        except Exception as e:
            # Gracefully log Supabase issues, continue locally
            print(f"Supabase sync failed: {e}")

    token_data = {"sub": user_id, "email": user_in.email, "name": user_in.name}
    token = create_access_token(token_data)
    
    return {
        "token": token,
        "user": UserResponse(
            id=user_id,
            email=user_in.email,
            name=user_in.name,
            currency="USD",
            createdAt=new_user["createdAt"]
        )
    }

@router.post("/login", response_model=TokenResponse)
async def login(user_in: UserLogin):
    found_user = None
    for u in MOCK_USERS.values():
        if u["email"] == user_in.email:
            found_user = u
            break
            
    if not found_user or not verify_password(user_in.password, found_user["password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
        
    token_data = {"sub": found_user["id"], "email": found_user["email"], "name": found_user["name"]}
    token = create_access_token(token_data)
    
    return {
        "token": token,
        "user": UserResponse(
            id=found_user["id"],
            email=found_user["email"],
            name=found_user["name"],
            currency=found_user.get("currency", "USD"),
            createdAt=found_user["createdAt"]
        )
    }

@router.get("/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return UserResponse(
        id=current_user["id"],
        email=current_user["email"],
        name=current_user["name"],
        currency=current_user.get("currency", "USD"),
        createdAt=current_user.get("createdAt", datetime.utcnow())
    )

@router.put("/profile", response_model=UserResponse)
async def update_profile(profile_in: UserUpdate, current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    if user_id in MOCK_USERS:
        MOCK_USERS[user_id]["name"] = profile_in.name
        MOCK_USERS[user_id]["currency"] = profile_in.currency
        
    # Supabase Integration: Update in Supabase if configured
    if settings.SUPABASE_URL and settings.SUPABASE_KEY:
        try:
            from supabase import create_client
            supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
            supabase.table("users").update({
                "name": profile_in.name,
                "currency": profile_in.currency
            }).eq("id", user_id).execute()
        except Exception as e:
            print(f"Supabase sync failed: {e}")
            
    return UserResponse(
        id=user_id,
        email=current_user["email"],
        name=profile_in.name,
        currency=profile_in.currency,
        createdAt=current_user.get("createdAt", datetime.utcnow())
    )
