# ADR 0003: Environment separation and configuration

- Status: accepted
- Date: 2026-07-27

## Decision

Development, staging, and production use separate databases, storage, provider
credentials, notification projects, domains, and signing identities.
Configuration is validated at process startup. Secrets are never committed,
embedded in mobile builds, or included in sample environment files. CI injects
secrets from its protected store. Production configuration fails closed.

Flutter uses compile-time flavours named `dev`, `staging`, and `prod`. API base
URLs are supplied with `--dart-define`; no privileged secret is placed in the app.
