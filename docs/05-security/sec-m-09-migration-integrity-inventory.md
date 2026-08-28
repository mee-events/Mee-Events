# SEC-M-09 Migration Integrity Inventory

- **Date:** 28 August 2026
- **Scope:** local migration runner, `schema_migrations`, and the isolated PostgreSQL 17.2 integration harness
- **Result:** **DONE WITH FINDINGS** locally; STAB-20 remains open and Phase 0 remains **NOT PASSED**
- **Next block:** Android release boundary corrective work — **NOT STARTED**

## Before this correction

| Area                  | Previous behavior                                                                      | Risk                                                                                           |
| --------------------- | -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Migration transaction | Each SQL file committed in one `psql` call; its filename was inserted by a second call | A terminated runner could leave schema/data applied without a ledger row                       |
| Ledger identity       | `schema_migrations` stored only `filename` and `applied_at`                            | A changed applied file was not detected at runtime                                             |
| Retry                 | The runner retried any filename absent from the ledger                                 | A previously applied but unrecorded non-idempotent migration could fail and strand the catalog |
| Legacy ledger         | Filename-only rows were accepted                                                       | The runner had no content identity to compare                                                  |
| Unknown rows          | No catalog-to-ledger rejection                                                         | A stale or manually invented ledger filename was not explicitly rejected                       |

STAB-14 reproduced the applied-but-unrecorded state with migration `0019`.
That historical evidence remains valid; this correction changes the runner, not
the old experiment.

## Implemented behavior

The shared runner is
[`infrastructure/postgres/migration-runner.sh`](../../infrastructure/postgres/migration-runner.sh).
The local command and the database-integration harness both use it.

| Control            | Current behavior                                                                                                                                                                                                 |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SHA-256 ledger     | Every row stores a 64-character lowercase SHA-256 of the exact migration file                                                                                                                                    |
| Atomic bookkeeping | The runner snapshots a pending file and inserts its filename/checksum immediately after that file's existing `BEGIN`; the original `COMMIT` durably commits both migration work and ledger row                   |
| Failure rollback   | SQL failure, ledger insert failure, or database-session termination before `COMMIT` rolls back both sides                                                                                                        |
| Preflight          | All recorded filenames must exist in the current catalog; all non-null recorded checksums must match before any missing file is applied                                                                          |
| Legacy upgrade     | A missing checksum column is added; null historical checksums are backfilled from the trusted current checkout before `NOT NULL` and the validated SHA-256 check constraint are enforced                         |
| Pre-ledger `0001`  | The legacy baseline is allowed only when required foundation table, seed, function, trigger, and extension sentinels exist and the `0002` OTP table does not                                                     |
| File shape         | Files fail closed unless they have exactly one `BEGIN`, one final `COMMIT`, and a controlled ordered filename                                                                                                    |
| Apply snapshot     | A pending migration is copied to a temporary file and hashed; the same bytes are rendered and sent to PostgreSQL                                                                                                 |
| Concurrent runners | The ledger primary-key insert occurs before migration work. Competing application of the same filename fails closed before the second runner reaches domain SQL; rerunning then verifies/skips the committed row |

The 20 historical migration files were not rewritten and retain their STAB-14
hashes.

## Maintained verification

`corepack pnpm test:integration:backend` now uses the shared runner against an
isolated, marked PostgreSQL 17.2 Compose project. On 28 August 2026 it passed
**5/5 files and 39/39 tests** and also completed these shell-level setup probes:

1. applied `0001`–`0020` through the shared runner on a completely empty
   database;
2. removed a required audit trigger and proved the runner rejected the
   incomplete legacy foundation, then restored it and completed the pre-ledger
   `0001` path through `0020`;
3. removed the checksum column to simulate the old filename-only ledger, then
   backfilled and constrained all 20 rows;
4. changed one stored checksum to a different valid SHA-256 shape and proved
   the runner rejected it before applying work;
5. applied a synthetic test-owned migration whose PostgreSQL session terminated
   after its table/row writes but before `COMMIT`; neither the table nor the
   migration ledger row survived;
6. compared every durable ledger checksum with a fresh SHA-256 of the maintained
   catalog and verified the non-null validated database constraint.

The first sandboxed attempt could not bind the harness loopback port. The same
command passed unchanged with loopback and Docker permission. No staging,
production, founder, or remote database was accessed.

Final regression evidence: root format, lint, and typecheck passed; backend
unit tests passed **239/239** after the same loopback permission was allowed;
ERP unit tests passed **12/12**; and the repeated PostgreSQL integration run
passed **39/39**.

## Retained findings

- Backfilling an old filename-only ledger trusts the current reviewed checkout.
  It cannot prove which bytes were historically applied before checksums existed.
- A database already left in an applied-but-unrecorded state by the old runner
  is not guessed or silently repaired. Operators must stop, verify the expected
  file hash and semantic postconditions, and use a reviewed reconciliation.
- The ledger is not a signed external attestation. A database owner capable of
  changing both application files and ledger rows remains outside this local
  integrity boundary.
- No managed staging/production database, backup, restore, PITR, rollback, or
  deployment rehearsal was performed. Those remain PROD-03 work.
- The second of two concurrent migration runners can fail on the ledger primary
  key and require a clean rerun; it cannot double-apply the migration.

This result does not claim production migration readiness or production
security.
