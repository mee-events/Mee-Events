# End-to-End Tests

**Status: not implemented.**

This repository has no Playwright, Cypress, or Detox project config, and no
`*e2e*` test suites for ERP, mobile, or API journeys.

Product intent for broader release gates may appear in
[PRD 10](../product/prd/10-deployment-devops-prd-v1.md). Do not treat that intent
as a live E2E harness.

---

## What CI is not

The Flutter CI job builds a **debug APK** (`flutter build apk --debug --flavor
dev` with dart-defines). That is a **compile / packaging check**, not an
end-to-end UI or API test ([ci-cd.md](../07-deployment/ci-cd.md)).

---

## Manual smoke (ops, not automated E2E)

Until an E2E tool is adopted, operators can smoke a deployed or local stack
using existing run guidance:

- Health: `GET /api/v1/health/live` and `/ready` —
  [monitoring.md](../07-deployment/monitoring.md)
- Cutover / staging checklist items —
  [production.md](../07-deployment/production.md)

Those are manual procedures, not an in-repo E2E framework.

---

## Related

- [testing-strategy.md](./testing-strategy.md)
- [integration-tests.md](./integration-tests.md)
- [verification.md](./verification.md)
