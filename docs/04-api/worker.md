# Worker API

CRM worker registry, tasks, and attendance, plus worker self-service under
`/workers/me`.

Controllers:

- `apps/backend/src/modules/workers/presentation/crm-worker.controller.ts`
- `apps/backend/src/modules/workers/presentation/worker.controller.ts`

---

## CRM (`/api/v1/crm/workers`)

| Method | Path                                | Capability          | Purpose          |
| ------ | ----------------------------------- | ------------------- | ---------------- |
| GET    | `/api/v1/crm/workers`               | `crm_worker.read`   | List workers     |
| POST   | `/api/v1/crm/workers`               | `crm_worker.manage` | Create worker    |
| GET    | `/api/v1/crm/workers/dashboard`     | `crm_worker.read`   | Worker dashboard |
| GET    | `/api/v1/crm/workers/tasks`         | `crm_worker.read`   | List tasks       |
| POST   | `/api/v1/crm/workers/tasks`         | `crm_worker.manage` | Assign task      |
| GET    | `/api/v1/crm/workers/tasks/:taskId` | `crm_worker.read`   | Get task         |
| GET    | `/api/v1/crm/workers/attendance`    | `crm_worker.read`   | List attendance  |
| GET    | `/api/v1/crm/workers/:id`           | `crm_worker.read`   | Get worker       |
| PATCH  | `/api/v1/crm/workers/:id`           | `crm_worker.manage` | Update worker    |
| POST   | `/api/v1/crm/workers/:id/notes`     | `crm_worker.manage` | Add note         |

---

## Self (`/api/v1/workers/me`)

| Method | Path                                         | Capability          | Purpose         |
| ------ | -------------------------------------------- | ------------------- | --------------- |
| GET    | `/api/v1/workers/me/dashboard`               | `worker_own.read`   | Own dashboard   |
| GET    | `/api/v1/workers/me/tasks`                   | `worker_own.read`   | Own tasks       |
| GET    | `/api/v1/workers/me/tasks/:taskId`           | `worker_own.read`   | Own task        |
| POST   | `/api/v1/workers/me/tasks/:taskId/accept`    | `worker_own.update` | Accept task     |
| POST   | `/api/v1/workers/me/tasks/:taskId/reject`    | `worker_own.update` | Reject task     |
| POST   | `/api/v1/workers/me/tasks/:taskId/check-in`  | `worker_own.update` | Check in        |
| POST   | `/api/v1/workers/me/tasks/:taskId/progress`  | `worker_own.update` | Report progress |
| POST   | `/api/v1/workers/me/tasks/:taskId/check-out` | `worker_own.update` | Check out       |
| POST   | `/api/v1/workers/me/notes`                   | `worker_own.update` | Add own note    |

---

## Related

- [vendor.md](./vendor.md)
- [operations.md](./operations.md)
- [API index](./README.md)
