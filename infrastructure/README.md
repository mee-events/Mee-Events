# Infrastructure

The compose file runs disposable local PostgreSQL and Redis services. Its
credentials are intentionally local-only and must never be reused in hosted
environments.

The default host ports are deliberately non-standard so this workspace does not
interrupt another local project:

- PostgreSQL: `localhost:5433`
- Redis: `localhost:6380`

Override them with `POSTGRES_PORT` and `REDIS_PORT` when required.

Staging and production will be defined with infrastructure as code after the
cloud, region, recovery objectives, and data-residency decisions are approved.
They must use managed secret storage, private networking, encryption, backups,
restore testing, monitoring, and separate accounts/projects.
