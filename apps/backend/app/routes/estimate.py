from fastapi import APIRouter, HTTPException, Query

from app.services.gemini_estimator import estimate_pfas_by_zip

router = APIRouter(prefix="/estimate", tags=["estimate"]) 


@router.get("/pfas")
def estimate_pfas(zip_code: str = Query(..., description="ZIP code to estimate PFAS for")):
    try:
        result = estimate_pfas_by_zip(zip_code)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Estimation failed: {e}") from e
