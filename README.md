# BioBound Monorepo

This repository contains both Team A (frontend) and Team B (backend) code.

## Structure

- `apps/frontend`: Team A Next.js app
- `apps/backend`: Team B FastAPI service, tests, and backend config
- `docs`: Shared project documentation and handoff notes
- `designdoc_A.md`: Team A implementation plan
- `designdoc_B.md`: Team B implementation plan

## Quick Start

### Backend (Team B)

```bash
cd apps/backend
python -m pip install -e .[dev]
python -m uvicorn app.main:app --reload --port 8000
```

### Frontend (Team A)

```bash
cd apps/frontend
npm install
npm run dev
```

Set frontend proxy target when needed:

```bash
# apps/frontend/.env.local
TEAM_B_API_BASE_URL=http://127.0.0.1:8000
```

## Workspace Commands (from repo root)

```bash
npm run dev:frontend
npm run lint:frontend
npm run test:backend
npm run lint:backend
```
