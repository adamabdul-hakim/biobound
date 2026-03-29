from fastapi.responses import JSONResponse


def build_error_response(
    status_code: int,
    error_code: str,
    message: str,
    request_id: str,
    details: dict | list | str | None = None,
) -> JSONResponse:
    payload = {
        "error": {
            "code": error_code,
            "message": message,
            "request_id": request_id,
        }
    }

    if details is not None:
        payload["error"]["details"] = details

    return JSONResponse(status_code=status_code, content=payload)


def status_to_error_code(status_code: int) -> str:
    mapping = {
        400: "INVALID_INPUT",
        401: "UNAUTHORIZED",
        403: "FORBIDDEN",
        404: "NOT_FOUND",
        409: "CONFLICT",
        422: "VALIDATION_ERROR",
        429: "RATE_LIMITED",
        500: "INTERNAL_ERROR",
    }
    return mapping.get(status_code, "UNHANDLED_ERROR")
