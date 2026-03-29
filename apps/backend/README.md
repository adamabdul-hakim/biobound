# Team B Backend

FastAPI analysis service for OCR, PFAS detection, risk scoring, and decay simulation.

## Run

```bash
python -m uvicorn app.main:app --reload --port 8000
```

## Install

```bash
python -m pip install -e .[dev]
```

## Test

```bash
pytest -q
```

## Lint

```bash
ruff check .
```

## Environment

Use `apps/backend/.env.example` as the template for local environment values.
