# STAB-20 canonical GitHub verification

- **Task:** canonical GitHub verification for the STAB-20 application commits
- **Date:** 28 August 2026
- **Repository:** `mee-events/Mee-Events`
- **Branch:** `master`
- **Verified commit:** `37cf6c2f8e36dd522688e3423be7b9595e442ead`
- **Result:** **DONE WITH FINDINGS** — every user-required workflow completed
  with conclusion `success`; CodeQL also reported four open alerts with
  `security_severity_level: high`
- **Phase 0:** **NOT PASSED**
- **STAB-20:** remains **IN PROGRESS** until the unclassified findings and
  residual-risk gate are reviewed
- **Next:** final Phase 0 review, **NOT STARTED**

This closeout records the exact canonical GitHub state for the already-pushed
application commit. It does not classify or remediate CodeQL alerts, pass
Phase 0, authorize Customer work, claim production security, or change any
GitHub setting.

## Gate definition and repository policy

The user-required gate consisted of the `CI`, `Security`, and `CodeQL` push
workflows for the exact commit above. All three reached terminal `completed`
status with conclusion `success`.

A read-only GitHub API query returned `404 Branch not protected` for
`master`. Therefore GitHub repository settings currently enforce no required
status-check contexts; “required” in this closeout means the three workflows
explicitly required for this verification. No branch protection, security
feature, workflow, alert, or other repository setting was changed.

## Exact workflow results

All timestamps below are GitHub's UTC timestamps.

| Workflow | Run                                                                              | Status      | Conclusion | Created / started      | Terminal update        |
| -------- | -------------------------------------------------------------------------------- | ----------- | ---------- | ---------------------- | ---------------------- |
| CI       | [33178045303](https://github.com/mee-events/Mee-Events/actions/runs/33178045303) | `completed` | `success`  | `2026-08-28T14:00:34Z` | `2026-08-28T14:06:32Z` |
| Security | [33178045308](https://github.com/mee-events/Mee-Events/actions/runs/33178045308) | `completed` | `success`  | `2026-08-28T14:00:34Z` | `2026-08-28T14:01:22Z` |
| CodeQL   | [33178045381](https://github.com/mee-events/Mee-Events/actions/runs/33178045381) | `completed` | `success`  | `2026-08-28T14:00:34Z` | `2026-08-28T14:02:37Z` |

## Exact job results

| Workflow | Job                              | Job ID                                                                                           | Status      | Conclusion | Started                | Completed              |
| -------- | -------------------------------- | ------------------------------------------------------------------------------------------------ | ----------- | ---------- | ---------------------- | ---------------------- |
| CI       | Backend PostgreSQL integration   | [98871715390](https://github.com/mee-events/Mee-Events/actions/runs/33178045303/job/98871715390) | `completed` | `success`  | `2026-08-28T14:00:37Z` | `2026-08-28T14:02:31Z` |
| CI       | TypeScript quality               | [98871715577](https://github.com/mee-events/Mee-Events/actions/runs/33178045303/job/98871715577) | `completed` | `success`  | `2026-08-28T14:00:37Z` | `2026-08-28T14:02:36Z` |
| CI       | Flutter development verification | [98871715878](https://github.com/mee-events/Mee-Events/actions/runs/33178045303/job/98871715878) | `completed` | `success`  | `2026-08-28T14:00:37Z` | `2026-08-28T14:06:31Z` |
| CI       | Dependency review                | [98871717157](https://github.com/mee-events/Mee-Events/actions/runs/33178045303/job/98871717157) | `completed` | `skipped`  | `2026-08-28T14:00:35Z` | `2026-08-28T14:00:34Z` |
| Security | Secret scan                      | [98871714646](https://github.com/mee-events/Mee-Events/actions/runs/33178045308/job/98871714646) | `completed` | `success`  | `2026-08-28T14:00:37Z` | `2026-08-28T14:00:47Z` |
| Security | Dependency audit                 | [98871714780](https://github.com/mee-events/Mee-Events/actions/runs/33178045308/job/98871714780) | `completed` | `success`  | `2026-08-28T14:00:38Z` | `2026-08-28T14:01:21Z` |
| CodeQL   | CodeQL JavaScript/TypeScript     | [98871714793](https://github.com/mee-events/Mee-Events/actions/runs/33178045381/job/98871714793) | `completed` | `success`  | `2026-08-28T14:00:38Z` | `2026-08-28T14:02:36Z` |

`Dependency review` is guarded for pull requests and was skipped on this push,
as designed. GitHub's raw skipped-job metadata reports its `completedAt` one
second before its `startedAt`; the table preserves those exact API values.
Every executable step in the other listed jobs concluded `success`, including
PostgreSQL integration, TypeScript format/lint/typecheck/unit/build gates,
Flutter format/analyze/tests/debug APK build, dependency audit, Gitleaks
history scan, and CodeQL analysis.

## Exact CodeQL alert state

The successful CodeQL workflow proves that analysis completed; it does not
mean that analysis returned zero alerts. A read-only query for open alerts on
`refs/heads/master` returned these four alerts. All point at the verified
commit and are intentionally left open and unclassified here.

| Alert                                                                   | Rule                                       | Query severity | Security severity | Location                                               | State  |
| ----------------------------------------------------------------------- | ------------------------------------------ | -------------- | ----------------- | ------------------------------------------------------ | ------ |
| [#4](https://github.com/mee-events/Mee-Events/security/code-scanning/4) | `js/insecure-helmet-configuration`         | `error`        | `high`            | `apps/backend/src/common/http/http-surface.ts:131-140` | `open` |
| [#3](https://github.com/mee-events/Mee-Events/security/code-scanning/3) | `js/incomplete-url-substring-sanitization` | `warning`      | `high`            | `apps/backend/src/config/environment.ts:214`           | `open` |
| [#2](https://github.com/mee-events/Mee-Events/security/code-scanning/2) | `js/incomplete-url-substring-sanitization` | `warning`      | `high`            | `apps/backend/scripts/migrate_images.ts:57`            | `open` |
| [#1](https://github.com/mee-events/Mee-Events/security/code-scanning/1) | `js/clear-text-storage-of-sensitive-data`  | `error`        | `high`            | `apps/erp-web/src/lib/employee-api.ts:1796`            | `open` |

Alert `#4` was created during this run at `2026-08-28T14:02:05Z`; alerts
`#1`-`#3` were created at `2026-08-27T02:54:05Z` and their most recent
instances are on `37cf6c2f8e36dd522688e3423be7b9595e442ead`. No alert was
dismissed, modified, assigned, or otherwise triaged during this closeout.

## Closeout boundary

Canonical GitHub verification is **DONE WITH FINDINGS**. The exact workflow
gate passed, while the four open high-security-level CodeQL alerts prevent an
honest zero-unaccepted-high finding claim until review. STAB-20 and Phase 0
therefore remain open, Customer work remains unauthorized, and the final Phase
0 review is the next block but was not started. The documentation closeout
commit is local only and must not be pushed as part of this block.
