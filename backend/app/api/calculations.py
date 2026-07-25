from fastapi import APIRouter, Depends, HTTPException, status
from app.models.schemas import CalculationCreate, CalculationResponse, CalculationUpdate
from app.api.auth import get_current_user
from app.config import settings
from datetime import datetime
import uuid

router = APIRouter(prefix="/calculations", tags=["calculations"])

MOCK_CALCS = {}

@router.get("", response_model=list[CalculationResponse])
async def list_calculations(current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    user_calcs = [c for c in MOCK_CALCS.values() if c["userId"] == user_id]
    
    # Sort by creation date descending
    user_calcs.sort(key=lambda x: x["createdAt"], reverse=True)
    return user_calcs

@router.post("", response_model=CalculationResponse)
async def save_calculation(calc_in: CalculationCreate, current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    calc_id = str(uuid.uuid4())
    
    new_calc = {
        "id": calc_id,
        "userId": user_id,
        "calculatorType": calc_in.calculatorType,
        "name": calc_in.name,
        "inputs": calc_in.inputs,
        "outputs": calc_in.outputs,
        "createdAt": datetime.utcnow(),
        "favorite": False
    }
    
    # Store locally
    MOCK_CALCS[calc_id] = new_calc
    
    # Supabase sync if enabled
    if settings.SUPABASE_URL and settings.SUPABASE_KEY:
        try:
            from supabase import create_client
            supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
            supabase.table("calculations").insert({
                "id": calc_id,
                "user_id": user_id,
                "calculator_type": calc_in.calculatorType,
                "name": calc_in.name,
                "inputs": calc_in.inputs,
                "outputs": calc_in.outputs,
                "created_at": new_calc["createdAt"].isoformat(),
                "favorite": False
            }).execute()
        except Exception as e:
            print(f"Supabase sync failed: {e}")
            
    return new_calc

@router.patch("/{calc_id}/favorite", response_model=CalculationResponse)
async def toggle_favorite(calc_id: str, current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    if calc_id not in MOCK_CALCS:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Calculation not found")
        
    calc = MOCK_CALCS[calc_id]
    if calc["userId"] != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
        
    calc["favorite"] = not calc["favorite"]
    
    # Supabase sync if enabled
    if settings.SUPABASE_URL and settings.SUPABASE_KEY:
        try:
            from supabase import create_client
            supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
            supabase.table("calculations").update({
                "favorite": calc["favorite"]
            }).eq("id", calc_id).execute()
        except Exception as e:
            print(f"Supabase sync failed: {e}")
            
    return calc

@router.delete("/{calc_id}")
async def delete_calculation(calc_id: str, current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    if calc_id not in MOCK_CALCS:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Calculation not found")
        
    calc = MOCK_CALCS[calc_id]
    if calc["userId"] != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
        
    del MOCK_CALCS[calc_id]
    
    # Supabase sync if enabled
    if settings.SUPABASE_URL and settings.SUPABASE_KEY:
        try:
            from supabase import create_client
            supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
            supabase.table("calculations").delete().eq("id", calc_id).execute()
        except Exception as e:
            print(f"Supabase sync failed: {e}")
            
    return {"status": "success", "message": "Calculation deleted"}
