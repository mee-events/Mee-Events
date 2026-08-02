# ADR 0001: Monorepo and modular monolith

- Status: accepted
- Date: 2026-07-27

## Context

ME Event needs a mobile product, an internal ERP, shared contracts, and a backend.
The early team needs fast, coordinated changes without distributed-system
operational overhead.

## Decision

Use a pnpm monorepo for TypeScript workspaces and keep Flutter as a first-class
app in the same repository. Start the backend as a NestJS modular monolith.
Modules own their domain logic and expose explicit interfaces so independently
scaling services can be extracted later.

## Consequences

Atomic changes and shared CI are straightforward. Deployments remain independent
per app. Module boundaries must be enforced in review; repository proximity does
not permit database or internal-code coupling.
