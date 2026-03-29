# Contributing Guide (Team B)

## Branching Model

- Base branch for Team B work: `teamb`.
- Create short-lived feature branches from `teamb`:
  - example: `feat/phase1-process-image`
- Open a PR into `teamb` for all changes.

## Commit Conventions

- Use conventional commit prefixes:
  - `feat:` new functionality
  - `fix:` bug fixes
  - `test:` tests only
  - `docs:` documentation only
  - `refactor:` code restructuring with no behavior change

## Local Setup

```bash
python -m venv .venv
.venv/Scripts/python -m pip install --upgrade pip
.venv/Scripts/python -m pip install -e .[dev]
```

## Quality Gates

Run before opening a PR:

```bash
.venv/Scripts/python -m ruff check .
.venv/Scripts/python -m pytest -q
```

## API Contract Rules

- Any change to `AnalyzeRequest` or `AnalyzeResponse` requires:
  - test updates in `tests/test_analyze_contract.py`
  - explicit note in PR under "API Contract Impact"
  - Team A confirmation for compatibility

## Review Expectations

- At least one reviewer approval before merge.
- PR description must include verification steps and risk notes.
