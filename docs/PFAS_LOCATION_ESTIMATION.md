# PFAS Location Estimation Implementation Guide

## Overview
The PFAS location estimation feature allows users to input their ZIP code and receive estimated PFAS contamination data for their area. The system uses:
- **Manual demo data** for Cincinnati (ZIP: 452xx) and Little Hocking (ZIP: 457xx)
- **Google Gemini API** to estimate PFAS levels for other ZIP codes (if configured)
- **Deterministic heuristic fallback** if the API is unavailable

## Architecture

### Backend Components

#### 1. **Config** (`apps/backend/app/core/config.py`)
- Added `gemini_api_key` setting from environment variable `GEMINI_API_KEY`

#### 2. **Estimator Service** (`apps/backend/app/services/gemini_estimator.py`)
- `estimate_pfas_by_zip(zip_code)` - Main function that:
  - Matches ZIP code against demo location prefixes
  - Returns manual demo data if match found
  - Calls Gemini API for other locations
  - Falls back to heuristic estimate if API fails

**Demo Locations:**
- **Cincinnati**: ZIP prefix `452`
  - System: Cincinnati Public Water System
  - Population: 750,200
  - PFAS compounds: PFBS (4.1 ppt), PFBA (5.2 ppt), PFOS (6.1 ppt)
  - Total PFAS: 15 ppt

- **Little Hocking**: ZIP prefix `457`
  - Location: Washington County, Ohio
  - Contamination site: Little Hocking Water Association
  - PFAS compound: PFOA (10.1 ppt from groundwater)
  - Suspected source: Industrial Manufacturing

#### 3. **Route** (`apps/backend/app/routes/estimate.py`)
- `GET /estimate/pfas?zip_code=XXXXX`
- Returns JSON with source, ZIP code, and PFAS data/estimate

### Frontend Components

#### 1. **Service** (`src/lib/pfasEstimation.ts`)
- `estimatePfasByZip(zipCode)` - Calls backend `/estimate/pfas` endpoint
- Interfaces for request/response data

#### 2. **Display Component** (`src/components/inputs/LocationPfasDisplay.tsx`)
- Shows PFAS data with different layouts for:
  - Demo location data (shows system name, location, detected compounds)
  - Gemini/heuristic estimates (shows total ppt, breakdown, confidence)
  - Loading state
  - Error handling

#### 3. **Store Updates** (`src/store/appStore.ts`)
Added state for PFAS estimation:
```typescript
pfasEstimate: LocationPfasEstimate | null;
pfasEstimateLoading: boolean;
pfasEstimateError: string | null;
```

#### 4. **ZIP Code Input Hook** (`src/components/inputs/ZipCodeInput.tsx`)
- useEffect that triggers estimation when valid ZIP code entered
- Manages loading/error states

#### 5. **Form Integration** (`src/components/inputs/InputForm.tsx`)
- Shows `LocationPfasDisplay` after user enters ZIP code
- Displays data before advancing to next step

## Setup & Usage

### Backend Setup

1. Set the Gemini API key (optional - system works without it):
```bash
# Windows PowerShell
$env:GEMINI_API_KEY = 'YOUR_API_KEY_HERE'

# Linux/Mac
export GEMINI_API_KEY='YOUR_API_KEY_HERE'
```

2. Start the backend:
```bash
cd apps/backend
python -m uvicorn app.main:app --reload --port 8000
```

### Frontend Setup

1. Install dependencies:
```bash
cd apps/frontend
npm install
```

2. Configure API URL (if not localhost):
```bash
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:8000
```

3. Start the frontend:
```bash
npm run dev
```

## Testing

### Demo Locations
- **Cincinnati**: Test with ZIP codes starting with 452
  ```bash
  curl http://localhost:8000/estimate/pfas?zip_code=45202
  ```
  Response includes Cincinnati water system data

- **Little Hocking**: Test with ZIP codes starting with 457
  ```bash
  curl http://localhost:8000/estimate/pfas?zip_code=45742
  ```
  Response includes Little Hocking contamination data

### Heuristic Fallback
- **Any other ZIP**: Will use deterministic heuristic if API unavailable
  ```bash
  curl http://localhost:8000/estimate/pfas?zip_code=10001
  ```
  Response includes estimated PFAS breakdown with "low" confidence

### Frontend Testing
1. Navigate to `http://localhost:3000` (or 3001 if 3000 in use)
2. Enter a ZIP code in the first step
3. PFAS data will automatically load below the ZIP input
4. Demo data shows actual location details
5. Other ZIP codes show estimated confidence levels

## API Response Examples

### Demo Location (Cincinnati)
```json
{
  "source": "manual_demo",
  "zip_code": "45202",
  "location_data": {
    "system_name": "Cincinnati Public Water System",
    "state": "Ohio",
    "population_served": 750200,
    "pfas_detected": {
      "PFBS": {"year": 2023, "max_ppt": 4.1},
      "PFBA": {"year": 2023, "max_ppt": 5.2},
      "PFOS": {"year": 2023, "max_ppt": 6.1},
      "Total PFAS": {"year": 2023, "max_ppt": 15}
    }
  }
}
```

### Heuristic Estimate
```json
{
  "source": "heuristic_fallback",
  "zip_code": "10001",
  "estimate": {
    "estimated_total_pfas_ppt": 3.0,
    "breakdown": {
      "PFOS": 1.2,
      "PFOA": 1.05,
      "Other PFAS": 0.75
    },
    "confidence": "low"
  }
}
```

## Future Improvements

1. **Database Integration**: Replace demo data with actual EPA/UCMR5 database lookups
2. **Gemini API Enhancement**: Improve prompt engineering for more accurate estimates
3. **Caching**: Add caching for repeated ZIP code queries
4. **Visual Enhancements**: Show PFAS level gauges, risk indicators
5. **Data Sources**: Display which data sources were used (EPA, EWG, etc.)
6. **Batch Estimates**: Support estimating multiple ZIP codes at once
