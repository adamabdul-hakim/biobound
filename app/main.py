from fastapi import FastAPI

from app.core.config import settings
from app.routes.analyze import router as analyze_router
from app.routes.process_image import router as process_image_router

app = FastAPI(title=settings.app_name, version=settings.api_version)
app.include_router(analyze_router)
app.include_router(process_image_router)


@app.get("/health", tags=["health"])
def health() -> dict[str, str]:
    return {"status": "ok", "version": settings.api_version}
