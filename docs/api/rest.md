# REST API

The orchestrator exposes a REST API over HTTP. All hardware-mutating endpoints
are **asynchronous**: they return `202 Accepted` with a `job_id` you poll for
progress.

!!! tip "Interactive reference"
    When running the orchestrator locally, FastAPI serves a live Swagger UI at
    [`/docs`](http://localhost:8000/docs) and the raw schema at
    `/openapi.json` — always exactly in sync with the deployed build.

## Conventions

- **`fpga_id`** is an integer `0`–`9`. Out-of-range values return `422`.
- **Headers** — `X-API-Key` (caller identity) and `X-Session-ID` (active
  session) are read on every route but **not yet enforced** in the prototype.
- **Errors** are returned by FastAPI nested under a `detail` key:

  ```json
  { "detail": { "error": "fpga_not_idle", "message": "FPGA 3 is queued, not idle." } }
  ```

  The inner object follows the `ErrorResponse` model (`error` code +
  human-readable `message`).

## Health

### `GET /health`

Returns service health and Redis connectivity.

```json
{ "status": "ok", "redis": true }
```

## FPGAs

### `GET /fpga`

List the state and session info for all 10 FPGA nodes. Returns an array of
`FPGASummary`.

### `GET /fpga/{fpga_id}`

State snapshot for a single FPGA. An out-of-range `fpga_id` returns a `422`
validation error.

```json
{ "fpga_id": 3, "state": "idle", "session": null, "current_job_id": null }
```

### `POST /fpga/{fpga_id}/submit`

Upload an HDL source file (multipart form field `file`) and enqueue a
`build_and_program` job. The FPGA **must be `idle`**.

- **Success:** `202` → `{ "job_id", "fpga_id", "status": "queued" }`; FPGA → `queued`.
- **`409 fpga_not_idle`** if the board is not idle.

```bash
curl -X POST $BASE/fpga/3/submit -H "X-API-Key: $KEY" -F "file=@design.py"
```

### `POST /fpga/{fpga_id}/run`

Enqueue a Wishbone transaction. The FPGA **must be `reserved`**.

Request body (`RunRequest`):

| Field | Type | Notes |
| --- | --- | --- |
| `op` | int | Wishbone opcode: `1` = write, `2` = read |
| `address` | int | Wishbone byte address |
| `data` | list[int] | 32-bit data words (write only) |

- **Success:** `202` → `{ "job_id", "fpga_id", "status": "queued" }`.
- **`409 fpga_not_reserved`** if the board is not reserved.

### `POST /fpga/{fpga_id}/reset`

Enqueue a reset job that reflashes the base LiteX SoC and returns the FPGA to
`idle`. Allowed from `reserved` or `error`.

- **Success:** `202`.
- **`409 fpga_not_resettable`** otherwise.

## Jobs

Paths are prefixed with `/fpga/{fpga_id}/jobs`.

### `GET /fpga/{fpga_id}/jobs/{job_id}`

Current status and metadata for a job (`JobResponse`).

```json
{
  "job_id": "…", "fpga_id": 3, "type": "build_and_program",
  "status": "queued", "created_at": "…", "updated_at": "…"
}
```

`status` is one of `queued`, `running`, `complete`, `failed`, `cancelled`.

### `GET /fpga/{fpga_id}/jobs/{job_id}/logs`

Full build log for the job, as plain text.

### `GET /fpga/{fpga_id}/jobs/{job_id}/result`

Wishbone response data from a **completed** `run` job.

- **Success:** `{ "ok": true, "data": [ … ] }`.
- **`409 job_not_complete`** if the job has not finished.

### `DELETE /fpga/{fpga_id}/jobs/{job_id}`

Cancel a **queued** job before a worker picks it up.

- **Success:** `204`; job → `cancelled`.
- **`409 job_not_cancellable`** if it has already started.

## Sessions

### `GET /fpga/{fpga_id}/session`

Active session for an FPGA (`SessionResponse`), including `expires_at`.
`404 no_active_session` if none.

### `POST /fpga/{fpga_id}/session/release`

Release the session by enqueuing a reset job; the FPGA returns to `idle` once it
completes. `404 no_active_session` if there is no session.

---

For the request/response model definitions in Python, see the
[Python package reference](../reference/orchestrator.md).
