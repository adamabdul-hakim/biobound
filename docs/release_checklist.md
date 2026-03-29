# Release Checklist (Post Phase 6)

## Pre-release
- [ ] `ruff check app tests` passes.
- [ ] `pytest -q` passes.
- [ ] `/analyze` contract tests pass.
- [ ] `/metrics` responds with expected fields.
- [ ] Rate limiting returns `429` and `RATE_LIMITED` code when exceeded.
- [ ] Error envelope format validated for `422` and `500` paths.

## Integration
- [ ] Team A smoke test completed against current `teamb` branch.
- [ ] Any schema questions resolved and documented in `docs/api_contract.md`.
- [ ] Mock mode setup shared with Team A (`docs/mock_mode_setup.md`).

## Deployment readiness
- [ ] Environment values reviewed (`.env.example`).
- [ ] Runbook reviewed (`docs/phase6_runbook.md`).
- [ ] Rollback owner assigned.
- [ ] Incident contact channel confirmed.

## Release candidate
- [ ] Create release candidate tag (example: `v1.0.0-rc1`).
- [ ] Announce candidate build + API notes to Team A.
- [ ] Record sign-off decision.
