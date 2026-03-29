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

## OCR Setup (Image Analyze Path)

Install OCR provider dependencies as needed:

```bash
python -m pip install -e .[dev,ocr-google]
python -m pip install -e .[dev,ocr-tesseract]
```

Run readiness checks:

```bash
python scripts/check_ocr_readiness.py --provider current
python scripts/check_ocr_readiness.py --provider all
```

For Google Vision, set:

```bash
set GOOGLE_APPLICATION_CREDENTIALS=C:\path\to\service-account.json
```

On Windows, Tesseract also requires the system `tesseract.exe` binary on `PATH`.
