from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from app.services.gemini_estimator import estimate_pfas_by_zip, get_pfas_recommendations

router = APIRouter(prefix="/estimate", tags=["estimate"])


@router.get("/pfas")
def estimate_pfas(zip_code: str = Query(..., description="ZIP code to estimate PFAS for")):
    try:
        result = estimate_pfas_by_zip(zip_code)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Estimation failed: {e}") from e


class RecommendationsRequest(BaseModel):
    rei_score: int
    filter_type: str | None = None
    cookware_pct: int = 0
    cookware_years: int = 0
    diet_raising_count: int = 0
    diet_reducing_count: int = 0
    has_children: bool = False
    children_crawl: bool = False
    zip_code: str | None = None


@router.post("/recommendations")
def get_recommendations(body: RecommendationsRequest):
    try:
        result = get_pfas_recommendations(
            rei_score=body.rei_score,
            filter_type=body.filter_type,
            cookware_pct=body.cookware_pct,
            cookware_years=body.cookware_years,
            diet_raising_count=body.diet_raising_count,
            diet_reducing_count=body.diet_reducing_count,
            has_children=body.has_children,
            children_crawl=body.children_crawl,
            zip_code=body.zip_code,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Recommendations failed: {e}") from e
