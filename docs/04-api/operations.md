# Operations API

CRM field operations and assigned-staff self-service under `/operations/me`.

Controller:
`apps/backend/src/modules/operations/presentation/crm-operations.controller.ts`
(`@Controller("crm/operations")` and `@Controller("operations")`).

---

## CRM (`/api/v1/crm/operations`)

| Method | Path                                                       | Capability                     | Purpose              |
| ------ | ---------------------------------------------------------- | ------------------------------ | -------------------- |
| GET    | `/api/v1/crm/operations/dashboard`                         | `crm_operations.read`          | Ops dashboard        |
| GET    | `/api/v1/crm/operations/events`                            | `crm_operations.read`          | List ops events      |
| GET    | `/api/v1/crm/operations/events/:eventRecordId`             | `crm_operations.read`          | Get ops event        |
| POST   | `/api/v1/crm/operations/events/:eventRecordId/ensure`      | `crm_operations.manage`        | Ensure ops record    |
| GET    | `/api/v1/crm/operations/tasks`                             | `operations.task.read`         | List tasks           |
| POST   | `/api/v1/crm/operations/tasks`                             | `operations.task.manage`       | Create task          |
| GET    | `/api/v1/crm/operations/tasks/:taskId`                     | `operations.task.read`         | Get task             |
| PATCH  | `/api/v1/crm/operations/tasks/:taskId`                     | `operations.task.manage`       | Update task          |
| POST   | `/api/v1/crm/operations/tasks/:taskId/assign`              | `operations.task.manage`       | Assign task          |
| PATCH  | `/api/v1/crm/operations/assignments/:assignmentId`         | `operations.task.manage`       | Update assignment    |
| GET    | `/api/v1/crm/operations/attendance`                        | `crm_operations.read`          | List attendance      |
| POST   | `/api/v1/crm/operations/attendance/check-in`               | `operations.attendance.manage` | Check in             |
| POST   | `/api/v1/crm/operations/attendance/check-out`              | `operations.attendance.manage` | Check out            |
| POST   | `/api/v1/crm/operations/attendance/finalize`               | `operations.attendance.manage` | Finalize attendance  |
| GET    | `/api/v1/crm/operations/issues`                            | `crm_operations.read`          | List issues          |
| POST   | `/api/v1/crm/operations/issues`                            | `operations.issue.manage`      | Create issue         |
| PATCH  | `/api/v1/crm/operations/issues/:issueId`                   | `operations.issue.manage`      | Update issue         |
| GET    | `/api/v1/crm/operations/photos`                            | `crm_operations.read`          | List photos          |
| POST   | `/api/v1/crm/operations/photos`                            | `operations.photo.upload`      | Upload photo         |
| GET    | `/api/v1/crm/operations/materials`                         | `crm_operations.read`          | List materials       |
| POST   | `/api/v1/crm/operations/materials`                         | `crm_operations.manage`        | Record material      |
| PATCH  | `/api/v1/crm/operations/materials/:materialId`             | `crm_operations.manage`        | Update material      |
| GET    | `/api/v1/crm/operations/progress`                          | `crm_operations.read`          | List progress        |
| POST   | `/api/v1/crm/operations/events/:eventRecordId/recalculate` | `crm_operations.manage`        | Recalculate progress |
| GET    | `/api/v1/crm/operations/events/:eventRecordId/completion`  | `crm_operations.read`          | Get completion       |
| PATCH  | `/api/v1/crm/operations/events/:eventRecordId/completion`  | `crm_operations.manage`        | Update checklist     |
| POST   | `/api/v1/crm/operations/events/:eventRecordId/complete`    | `operations.complete`          | Complete event       |

---

## Self (`/api/v1/operations/me`)

| Method | Path                                          | Capability                   | Purpose              |
| ------ | --------------------------------------------- | ---------------------------- | -------------------- |
| GET    | `/api/v1/operations/me/dashboard`             | `operations_assigned.read`   | Assigned dashboard   |
| GET    | `/api/v1/operations/me/events`                | `operations_assigned.read`   | Assigned events      |
| GET    | `/api/v1/operations/me/events/:eventRecordId` | `operations_assigned.read`   | Assigned event       |
| GET    | `/api/v1/operations/me/tasks`                 | `operations_assigned.read`   | Assigned tasks       |
| POST   | `/api/v1/operations/me/attendance/check-in`   | `operations_assigned.update` | Check in             |
| POST   | `/api/v1/operations/me/attendance/check-out`  | `operations_assigned.update` | Check out            |
| GET    | `/api/v1/operations/me/attendance`            | `operations_assigned.read`   | Own attendance       |
| POST   | `/api/v1/operations/me/issues`                | `operations.issue.manage`    | Create issue         |
| GET    | `/api/v1/operations/me/issues`                | `operations_assigned.read`   | Own issues           |
| POST   | `/api/v1/operations/me/photos`                | `operations.photo.upload`    | Upload photo         |
| PATCH  | `/api/v1/operations/me/tasks/:taskId`         | `operations.task.manage`     | Update assigned task |
| GET    | `/api/v1/operations/me/progress`              | `operations_assigned.read`   | Own progress         |

---

## Related

- [manager.md](./manager.md)
- [worker.md](./worker.md)
- [API index](./README.md)
