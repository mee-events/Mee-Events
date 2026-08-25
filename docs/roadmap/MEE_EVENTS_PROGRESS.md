# Mee Events — Progress Tracker

- **Updated:** 25 August 2026
- **Repository:** `Mee Event V1`
- **Baseline branch/commit:** `master` / `9e2a442d91c137ec97a349d1a55697ae8d79d5df`
- **Current phase:** Phase 0 — Stabilization
- **Phase gate:** **NOT PASSED**
- **Last completed task:** AUDIT-05 — Founder roadmap PDF and documentation package
- **Current task:** None — audit session closed as instructed
- **Next task:** STAB-01 — Repository snapshot
- **Latest application commit:** `9e2a442d91c137ec97a349d1a55697ae8d79d5df`
- **Audit documentation commit:** This tracker is part of the documentation-only audit commit; use Git history for its hash.

## Status key

```text
[ ] Not started
[~] In progress
[x] Completed
[!] Blocked
[✗] Failed
```

## Audit package completed in this session

- [x] **AUDIT-01** Repository/Git/toolchain/environment inventory.
- [x] **AUDIT-02** Architecture, implementation, database, product, security, test, CI, deployment, design and documentation comparison.
- [x] **AUDIT-03** Proportional local verification and dependency security audit.
- [x] **AUDIT-04** Complete audit, completion scorecard and Master TODO.
- [x] **AUDIT-05** Founder-friendly step-by-step PDF and progress tracker.

These audit tasks do not count as STAB-01. No Phase 0 implementation block was completed.

## Latest verification

| Verification                 | Result                          | Evidence summary                                                               |
| ---------------------------- | ------------------------------- | ------------------------------------------------------------------------------ |
| Git start state              | **PASS**                        | Clean `master` worktree at audited baseline; `origin/HEAD` drift to old `main` |
| Node / pnpm                  | **PASS**                        | Node `20.20.2`; pnpm `9.15.4`                                                  |
| Flutter / Dart               | **PASS**                        | Flutter `3.44.8`; Dart `3.12.2`                                                |
| Root TypeScript verification | **PASS**                        | format, lint, typecheck, tests, backend build, ERP build                       |
| Backend tests                | **PASS**                        | 173/173 across 30 files                                                        |
| ERP tests                    | **PASS but weak**               | 2/2 across 2 files                                                             |
| Flutter format               | **PASS**                        | 199 files unchanged                                                            |
| Flutter analysis             | **PASS**                        | no issues with fatal infos                                                     |
| Flutter tests                | **PASS**                        | 435/435                                                                        |
| Android dev debug build      | **PASS**                        | APK compiled                                                                   |
| Android prod release compile | **COMPILE PASS / RELEASE FAIL** | 69.1 MB APK; no INTERNET permission; Android Debug certificate                 |
| iOS unsigned release build   | **FAIL**                        | `Application not configured for iOS`                                           |
| Dependency audit             | **FAIL**                        | 74 total: 4 critical, 29 high, 31 moderate, 10 low                             |
| PostgreSQL integration       | **NOT VERIFIED / BLOCKED**      | Docker daemon unavailable; no in-repo integration suite                        |
| Browser/device E2E           | **MISSING**                     | No framework/suite                                                             |

## Known release blockers

1. Critical/high dependency advisories.
2. Employee branch/resource IDOR/BOLA gaps.
3. OTP consume/session atomicity and unstable mobile device ID.
4. Outbox crash recovery and application idempotency are incomplete.
5. ERP Lead Inbox is fixture-backed; employee bootstrap/capability routing is incomplete.
6. Real OTP, payment, private storage, PDF, push/email, maps, monitoring and crash integrations are absent.
7. Live database, HTTP integration, cross-module, browser/device E2E and security suites are missing.
8. Staging/production infrastructure, secrets, backups/restore, observability, CD and rollback are absent.
9. Android production artifact lacks network permission and uses debug signing.
10. iOS is not configured for a Flutter release build and has no signing/TestFlight setup.

## Founder decisions

Do not ask for these until their dependent block is approaching, unless early procurement lead time requires it.

- [!] Production hosting and managed PostgreSQL/storage topology.
- [!] India-compliant SMS/OTP provider and sender/DLT ownership.
- [!] Payment gateway plus advance/final/refund/cancellation/reconciliation policies.
- [!] Object storage/CDN, push, email, maps/location, analytics, monitoring and crash providers.
- [!] Privacy/terms/refund/location/retention wording and legal review.
- [!] Company Play Console and Apple Developer/App Store Connect ownership/roles.
- [!] Android upload/signing key custody and iOS certificate/profile custody.
- [!] Final Customer navigation decision is already directed by this roadmap: Home, Explore, Enquire, Plan, Profile; confirm only if business intent changes.

## Phase 0 — Stabilization

- [ ] STAB-01 Repository snapshot
- [ ] STAB-02 Environment verification
- [ ] STAB-03 Dependency verification
- [ ] STAB-04 Formatting
- [ ] STAB-05 Lint
- [ ] STAB-06 TypeScript typecheck
- [ ] STAB-07 Backend tests
- [ ] STAB-08 ERP tests
- [ ] STAB-09 Flutter analysis
- [ ] STAB-10 Flutter tests
- [ ] STAB-11 Backend build
- [ ] STAB-12 ERP build
- [ ] STAB-13 Flutter build
- [ ] STAB-14 PostgreSQL migration verification
- [ ] STAB-15 Database integration tests
- [ ] STAB-16 CI verification
- [ ] STAB-17 E2E test foundation
- [ ] STAB-18 Documentation reconciliation
- [ ] STAB-19 Repository cleanup
- [ ] STAB-20 Security baseline

### Phase 0 security packages

- [ ] SEC-01 Dependency remediation
- [ ] SEC-02 Branch and BOLA closure
- [ ] SEC-03 Authentication atomicity and session control
- [ ] SEC-04 Outbox and idempotency reliability
- [ ] SEC-05 Web/API hardening
- [ ] SEC-06 Mobile fail-closed and boundary cleanup

## Phase 1 — Customer

- [ ] CUST-01 Authentication
- [ ] CUST-02 OTP
- [ ] CUST-03 Session
- [ ] CUST-04 Customer bootstrap
- [ ] CUST-05 Home
- [ ] CUST-06 Explore
- [ ] CUST-07 Event categories
- [ ] CUST-08 Services
- [ ] CUST-09 Search
- [ ] CUST-10 Favorites
- [ ] CUST-11 Enquiry creation
- [ ] CUST-12 Enquiry editing
- [ ] CUST-13 Enquiry tracking
- [ ] CUST-14 Quotation
- [ ] CUST-15 Quotation approval
- [ ] CUST-16 Advance payment
- [ ] CUST-17 Booking
- [ ] CUST-18 Event workspace
- [ ] CUST-19 Plan
- [ ] CUST-20 Profile
- [ ] CUST-21 Notifications
- [ ] CUST-22 Documents
- [ ] CUST-23 Feedback
- [ ] CUST-24 Error states
- [ ] CUST-25 Empty states
- [ ] CUST-26 Offline states
- [ ] CUST-27 Security
- [ ] CUST-28 Customer integration tests
- [ ] CUST-29 Customer E2E

## Phase 2 — Vendor

- [ ] VEND-01 Authentication
- [ ] VEND-02 Profile
- [ ] VEND-03 Business onboarding
- [ ] VEND-04 Vendor verification
- [ ] VEND-05 Services
- [ ] VEND-06 Products
- [ ] VEND-07 Pricing
- [ ] VEND-08 Availability
- [ ] VEND-09 Assignment inbox
- [ ] VEND-10 Assignment details
- [ ] VEND-11 Accept assignment
- [ ] VEND-12 Reject assignment
- [ ] VEND-13 Event details
- [ ] VEND-14 Vendor tasks
- [ ] VEND-15 Progress
- [ ] VEND-16 Completion
- [ ] VEND-17 Documents
- [ ] VEND-18 Notifications
- [ ] VEND-19 Settlement visibility
- [ ] VEND-20 Security
- [ ] VEND-21 Integration tests
- [ ] VEND-22 E2E

## Phase 3 — Worker

- [ ] WORK-01 Authentication
- [ ] WORK-02 Profile
- [ ] WORK-03 Availability
- [ ] WORK-04 Assigned work
- [ ] WORK-05 Work details
- [ ] WORK-06 Attendance
- [ ] WORK-07 Task start
- [ ] WORK-08 Task progress
- [ ] WORK-09 Task completion
- [ ] WORK-10 Event location
- [ ] WORK-11 Location/privacy
- [ ] WORK-12 Notifications
- [ ] WORK-13 Documents
- [ ] WORK-14 Security
- [ ] WORK-15 Integration tests
- [ ] WORK-16 E2E

## Phase 4 — CRM

- [ ] CRM-01 Employee authentication
- [ ] CRM-02 Employee session
- [ ] CRM-03 Capability enforcement
- [ ] CRM-04 Dashboard live data
- [ ] CRM-05 My Work
- [ ] CRM-06 Lead inbox
- [ ] CRM-07 Lead creation
- [ ] CRM-08 Lead assignment
- [ ] CRM-09 Follow-up queue
- [ ] CRM-10 Customer 360
- [ ] CRM-11 Enquiry management
- [ ] CRM-12 Quotation management
- [ ] CRM-13 Approval tracking
- [ ] CRM-14 Booking handoff
- [ ] CRM-15 Event Record visibility
- [ ] CRM-16 Communication history
- [ ] CRM-17 Team workload
- [ ] CRM-18 Reports
- [ ] CRM-19 Search
- [ ] CRM-20 Filtering
- [ ] CRM-21 Pagination
- [ ] CRM-22 Notifications
- [ ] CRM-23 Audit visibility
- [ ] CRM-24 Security
- [ ] CRM-25 Integration tests
- [ ] CRM-26 Browser E2E

## Phase 5 — ERP

- [ ] ERP-01 Operations dashboard
- [ ] ERP-02 Event operations
- [ ] ERP-03 Task management
- [ ] ERP-04 Manager assignments
- [ ] ERP-05 Vendor management
- [ ] ERP-06 Worker management
- [ ] ERP-07 Inventory
- [ ] ERP-08 Warehouse
- [ ] ERP-09 Stock movement
- [ ] ERP-10 Procurement — ADR required before implementation
- [ ] ERP-11 Purchase orders
- [ ] ERP-12 Goods receipt
- [ ] ERP-13 Finance
- [ ] ERP-14 Payment reconciliation
- [ ] ERP-15 Vendor settlements
- [ ] ERP-16 Approval inbox
- [ ] ERP-17 Employee administration
- [ ] ERP-18 Reporting
- [ ] ERP-19 Audit
- [ ] ERP-20 Security
- [ ] ERP-21 Integration tests
- [ ] ERP-22 Browser E2E

## Phase 6 — Employee Mobile

- [ ] EMP-01 Employee Mobile ADR
- [ ] EMP-02 Project setup
- [ ] EMP-03 Employee authentication
- [ ] EMP-04 Employee bootstrap
- [ ] EMP-05 Role/capability handling
- [ ] EMP-06 My Work
- [ ] EMP-07 Tasks
- [ ] EMP-08 Event operations
- [ ] EMP-09 Vendor/worker coordination
- [ ] EMP-10 Approvals
- [ ] EMP-11 Notifications
- [ ] EMP-12 Attendance if required
- [ ] EMP-13 Offline mode
- [ ] EMP-14 Secure storage
- [ ] EMP-15 E2E

## Phase 7 — Cross-module integration

- [ ] XMOD-01 Connected lifecycle happy path
- [ ] XMOD-02 Failure and recovery matrix
- [ ] XMOD-03 Concurrency and idempotency

## Phase 8 — External integrations

- [ ] INT-01 Production OTP/SMS
- [ ] INT-02 Payment gateway
- [ ] INT-03 Private storage
- [ ] INT-04 PDF generation
- [ ] INT-05 Push notifications
- [ ] INT-06 Email
- [ ] INT-07 Maps and privacy-safe location
- [ ] INT-08 Analytics and crash reporting

## Phase 9 — Security hardening

- [ ] SEC-PROD-01 Final security audit

## Phase 10 — Production infrastructure

- [ ] PROD-01 Production topology and IaC
- [ ] PROD-02 Secrets and access governance
- [ ] PROD-03 Database migration, backup and restore
- [ ] PROD-04 Deployment and rollback
- [ ] PROD-05 Observability and incident response
- [ ] PROD-06 Production readiness review

## Phase 11 — Android release

- [ ] ANDROID-01 App ID
- [ ] ANDROID-02 Package name
- [ ] ANDROID-03 Branding
- [ ] ANDROID-04 Signing
- [ ] ANDROID-05 Keystore
- [ ] ANDROID-06 Production environment
- [ ] ANDROID-07 Production API
- [ ] ANDROID-08 Release build
- [ ] ANDROID-09 Internal testing
- [ ] ANDROID-10 Closed testing
- [ ] ANDROID-11 Privacy policy
- [ ] ANDROID-12 Store listing
- [ ] ANDROID-13 Permissions
- [ ] ANDROID-14 Data safety
- [ ] ANDROID-15 Production rollout

## Phase 12 — iOS release

- [ ] IOS-01 Bundle ID
- [ ] IOS-02 Apple Developer configuration
- [ ] IOS-03 Certificates
- [ ] IOS-04 Provisioning
- [ ] IOS-05 Production environment
- [ ] IOS-06 Release build
- [ ] IOS-07 TestFlight
- [ ] IOS-08 Privacy
- [ ] IOS-09 Store listing
- [ ] IOS-10 Production release

## Cross-cutting polish after core gates

- [ ] POLISH-01 Accessibility
- [ ] POLISH-02 Performance and capacity
- [ ] POLISH-03 Data retention and rights
- [ ] POLISH-04 License, SBOM and provenance
- [ ] POLISH-05 Support and runbooks
- [ ] POLISH-06 Final launch checklist

## Founder session rule

1. Open the founder PDF and this tracker.
2. Select only the first unchecked task whose dependencies are complete.
3. Ask Codex to execute only that task.
4. Review changed files, tests, security evidence and Git diff.
5. Commit one scoped change.
6. Mark the task complete with date/evidence/commit.
7. Stop. Start the next task in a new session.
