# TaskFlow API

Base URL: `http://localhost:5000/api/v1`
Errors: `application/problem+json` (RFC 7807) with a stable `code` field.

| Method | Path | Body | Success | Traces to |
|--------|------|------|---------|-----------|
| `GET` | `/health` | — | `200 { status, database, uptime }` | NFR-002 |
| `POST` | `/projects` | `{ name }` | `201 { project }` | FR-008 |
| `GET` | `/projects` | — | `200 { projects }` | FR-008 |
| `POST` | `/tasks` | `{ title, projectId, description?, status?, dueDate? }` | `201 { task }` | FR-001..004 |
| `GET` | `/tasks` | query: `status`, `projectId`, `limit`, `offset` | `200 { tasks, total, limit, offset }` | FR-006 |
| `GET` | `/tasks/:id` | — | `200 { task }` | FR-006 |
| `PATCH` | `/tasks/:id` | any of `title`, `description`, `status`, `dueDate` | `200 { task }` | FR-005 |
| `DELETE` | `/tasks/:id` | — | `204` | FR-007 |

## Error codes

| Code | Status | Raised when |
|------|--------|-------------|
| `VALIDATION_FAILED` | 422 | The body or params failed the Zod schema |
| `BAD_REQUEST` | 400 | A domain rule rejected the request (past due date, editing a completed task) |
| `NOT_FOUND` | 404 | The task, project or route does not exist |
| `CONFLICT` | 409 | A unique constraint was violated (duplicate project name) |
| `INTERNAL` | 500 | Unhandled error — details are logged, never returned |

## Example

```bash
# Create a project, then a task in it
PROJECT=$(curl -s -X POST localhost:5000/api/v1/projects \
  -H 'content-type: application/json' \
  -d '{"name":"Demo"}' | jq -r .project.id)

curl -s -X POST localhost:5000/api/v1/tasks \
  -H 'content-type: application/json' \
  -d "{\"title\":\"Write the spec\",\"projectId\":\"$PROJECT\"}" | jq
```
