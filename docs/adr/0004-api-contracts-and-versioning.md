# ADR 0004: API contracts and versioning

- Status: accepted
- Date: 2026-07-27

## Decision

External HTTP APIs are prefixed with `/api/v1`. OpenAPI is the authoritative
wire contract. Shared TypeScript types are useful to the ERP and tooling but do
not replace runtime validation. Mobile models mirror the published schema.

Errors use stable machine-readable codes, a safe message, HTTP status, request
ID, and optional validation details. Sensitive internals and stack traces never
cross the production boundary. Breaking changes require a new API version.
