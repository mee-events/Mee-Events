# Manager Operations API

CRM manager assignment and task/progress management, plus assigned-manager
routes under `/manager` (not `/manager/me`).

Controllers:

- `apps/backend/src/modules/manager-operations/presentation/crm-manager-operations.controller.ts`
- `apps/backend/src/modules/manager-operations/presentation/manager-operations.controller.ts`

---

## CRM (`/api/v1/crm/manager`)

| Method | Path                                             | Capability                | Purpose                 |
| ------ | ------------------------------------------------ | ------------------------- | ----------------------- |
| GET    | `/api/v1/crm/manager/candidates`                 | `manager_event.manage`    | List manager candidates |
| GET    | `/api/v1/crm/manager/dashboard`                  | `manager_dashboard.read`  | Manager CRM dashboard   |
| POST   | `/api/v1/crm/manager/events/:eventId/assign`     | `manager_event.manage`    | Assign manager to event |
| GET    | `/api/v1/crm/manager/events/:eventId/assignment` | `manager_event.read`      | Get assignment          |
| PATCH  | `/api/v1/crm/manager/assignments/:assignmentId`  | `manager_event.manage`    | Update assignment       |
| GET    | `/api/v1/crm/manager/events/:eventId/dashboard`  | `manager_dashboard.read`  | Event manager dashboard |
| GET    | `/api/v1/crm/manager/events/:eventId/tasks`      | `manager_task.read`       | List event tasks        |
| POST   | `/api/v1/crm/manager/events/:eventId/tasks`      | `manager_task.manage`     | Create event task       |
| GET    | `/api/v1/crm/manager/tasks/:taskId`              | `manager_task.read`       | Get task                |
| PATCH  | `/api/v1/crm/manager/tasks/:taskId`              | `manager_task.manage`     | Update task             |
| POST   | `/api/v1/crm/manager/tasks/:taskId/complete`     | `manager_task.manage`     | Complete task           |
| POST   | `/api/v1/crm/manager/tasks/:taskId/comments`     | `manager_task.manage`     | Add comment             |
| GET    | `/api/v1/crm/manager/events/:eventId/progress`   | `manager_event.read`      | List progress           |
| POST   | `/api/v1/crm/manager/events/:eventId/progress`   | `manager_progress.manage` | Create progress         |
| PATCH  | `/api/v1/crm/manager/progress/:progressId`       | `manager_progress.manage` | Update progress         |

---

## Self (`/api/v1/manager`)

| Method | Path                                        | Capability                | Purpose             |
| ------ | ------------------------------------------- | ------------------------- | ------------------- |
| GET    | `/api/v1/manager/dashboard`                 | `manager_dashboard.read`  | Own dashboard       |
| GET    | `/api/v1/manager/events`                    | `manager_event.read`      | Own events          |
| GET    | `/api/v1/manager/events/:eventId/dashboard` | `manager_event.read`      | Own event dashboard |
| GET    | `/api/v1/manager/tasks/today`               | `manager_task.read`       | Today’s tasks       |
| GET    | `/api/v1/manager/tasks/:taskId`             | `manager_task.read`       | Get task            |
| PATCH  | `/api/v1/manager/tasks/:taskId`             | `manager_task.manage`     | Update task         |
| POST   | `/api/v1/manager/tasks/:taskId/complete`    | `manager_task.manage`     | Complete task       |
| POST   | `/api/v1/manager/events/:eventId/progress`  | `manager_progress.manage` | Create progress     |

---

## Related

- [operations.md](./operations.md)
- [crm.md](./crm.md) — event records
- [API index](./README.md)
