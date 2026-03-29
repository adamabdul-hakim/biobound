import time
import uuid

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.errors import build_error_response, status_to_error_code
from app.core.metrics import metrics_collector
from app.routes.analyze import router as analyze_router
from app.routes.process_image import router as process_image_router
from app.routes.estimate import router as estimate_router

app = FastAPI(title=settings.app_name, version=settings.api_version)

# Add CORS middleware to allow requests from frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins; restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def request_context_middleware(request: Request, call_next):
    request_id = str(uuid.uuid4())
    request.state.request_id = request_id
    start = time.perf_counter()

    try:
        response = await call_next(request)
    except Exception:
        duration_ms = (time.perf_counter() - start) * 1000
        metrics_collector.record(request.url.path, 500, duration_ms)
        raise

    duration_ms = (time.perf_counter() - start) * 1000
    response.headers["x-request-id"] = request_id
    metrics_collector.record(request.url.path, response.status_code, duration_ms)
    return response


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    request_id = getattr(request.state, "request_id", str(uuid.uuid4()))
    status_code = exc.status_code
    error_code = status_to_error_code(status_code)

    detail = exc.detail
    if isinstance(detail, str):
        message = detail
        details = None
    elif isinstance(detail, dict):
        message = str(detail.get("message") or detail.get("detail") or "Request failed")
        details = detail
    else:
        message = "Request failed"
        details = detail

    return build_error_response(status_code, error_code, message, request_id, details)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(
    request: Request,
    exc: RequestValidationError,
) -> JSONResponse:
    request_id = getattr(request.state, "request_id", str(uuid.uuid4()))
    return build_error_response(
        status_code=422,
        error_code=status_to_error_code(422),
        message="Request validation failed",
        request_id=request_id,
        details=exc.errors(),
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    request_id = getattr(request.state, "request_id", str(uuid.uuid4()))
    return build_error_response(
        status_code=500,
        error_code=status_to_error_code(500),
        message="Unexpected server error",
        request_id=request_id,
        details=str(exc),
    )


app.include_router(analyze_router)
app.include_router(process_image_router)
app.include_router(estimate_router)


@app.get("/", tags=["root"])
def root() -> dict[str, str]:
    return {
        "message": "✅ BioBound Backend is Running",
        "service": "PFAS Exposure Assessment API",
        "version": settings.api_version,
        "status": "healthy"
    }


@app.get("/health", tags=["health"])
def health() -> dict[str, str]:
    return {"status": "ok", "version": settings.api_version}


@app.get("/metrics", tags=["observability"])
def metrics() -> dict:
    return metrics_collector.snapshot()
