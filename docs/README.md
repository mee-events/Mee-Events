# Mee Events documentation

Canonical engineering docs live in the numbered suites. ADRs and product PRDs
remain the decision and scope sources.

## Engineering suites

| Suite                                                 | Contents                                         |
| ----------------------------------------------------- | ------------------------------------------------ |
| [01-overview](./01-overview/README.md)                | Platform introduction                            |
| [02-architecture](./02-architecture/architecture.md)  | System architecture, backend handbook, Pattern B |
| [03-database](./03-database/README.md)                | Schema, migrations, transactions, indexing       |
| [04-api](./04-api/README.md)                          | REST route reference                             |
| [05-security](./05-security/authentication.md)        | Authn, authz, JWT, capabilities, secrets, [AI coding controls](./05-security/ai-coding-controls.md) |
| [06-workflows](./06-workflows/enquiry-to-booking.md)  | Cross-module business flows                      |
| [07-deployment](./07-deployment/local-development.md) | Local, env, CI, production posture, monitoring   |
| [08-testing](./08-testing/testing-strategy.md)        | Test strategy, verify gate                       |

## Other trees

| Path                                                    | Role                                             |
| ------------------------------------------------------- | ------------------------------------------------ |
| [adr/](./adr/README.md)                                 | Architecture decision records                    |
| [product/](./product/prd/00-master-prd-v1.md)           | PRD suite and product notes                      |
| [design-system/](./design-system/README.md)             | Design system                                    |
| [references/supabase/](./references/supabase/README.md) | Legacy Supabase schema dump — **not** schema SoT |
