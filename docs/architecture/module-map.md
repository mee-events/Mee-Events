# Initial module map

| Module        | Owns now                                  | Next boundary             |
| ------------- | ----------------------------------------- | ------------------------- |
| Identity      | accounts, OTP challenges, device sessions | recovery and verification |
| Authorization | role metadata and guard scaffolding       | scoped policy engine      |
| Audit         | immutable event contract                  | PostgreSQL/outbox sink    |
| Health        | liveness and honest readiness             | dependency probes         |
| Notifications | reserved                                  | provider-neutral delivery |
| Enquiries     | reserved                                  | next vertical slice       |

Modules may reference public application/domain contracts, not another module's
adapter or persistence implementation.
