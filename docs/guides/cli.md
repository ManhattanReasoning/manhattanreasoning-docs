# The CLI

`mrg` is installed with the [SDK](sdk.md). It programs FPGAs, runs local
builds, inspects cluster and job state, and pokes registers on a live board.

```bash
mrg --help
mrg <command> [options]
```

**Global options** (accepted by every command except `synth`/`pnr`, which are
purely local):

| Option | Default | Purpose |
| --- | --- | --- |
| `--api-key KEY` | `$MRG_API_KEY`, then a stored `mrg login` | API key. |
| `--api-url URL` | `https://api.manhattanreasoning.com` | Orchestrator base URL. |

## Auth

```bash
mrg login [--github-token TOKEN] [--client-id ID]
mrg logout
```

`login` with no flags is an interactive GitHub device-flow login; it stores
the resulting key so later commands don't need `--api-key`. Headless
environments should pass `--github-token` (or set `$GITHUB_TOKEN`) with a
no-scope personal access token, or just set `$MRG_API_KEY` directly.

## Local builds: no login required

```bash
mrg synth <design.py>                                        # resource util
mrg pnr   <design.py> [--target-mhz] [--sys-clk-mhz] [--timing-target-mhz]  # Fmax + timing
```

Both print a JSON report on stdout and exit non-zero on a failed build. No
API key, no cloud, these run against the local toolchain or the pinned
Docker image.

## `run`: program and run an app

```bash
mrg run <file.py> [--fpga-id N] [--no-program] [--sys-clk HZ] [--timing-target-mhz MHZ]
```

Loads the [`mrg.cloud.App`](sdk.md#app) from `file.py`, submits the design and
blocks until it's built and flashed, then calls its
[`@local_entrypoint`](sdk.md#applocal_entrypoint). No board is chosen up
front: the server claims a build slot (a network identity baked into the
bitstream, decoupled from any physical board) and dispatches the build
immediately, and whichever board frees up first claims the finished bitstream
and flashes it — `app.fpga_id` is filled in from that completed job, not
picked by the CLI or the app. `--fpga-id` overrides `App(fpga_id=...)`, which
only matters for the `--no-program` reconnect case below; it is not a way to
request a specific board for a fresh build.

```bash
mrg run examples/app.py
mrg run my_design.py --fpga-id 3 --no-program   # reconnect, skip rebuilding
```

## `status`, `jobs`, `job`, `logs`: read-only, no login required

```bash
mrg status [fpga_id] [--json]
mrg jobs   [--status STATUS] [--json]
mrg job    <job_id> [--json]
mrg logs   <job_id>
```

`status` with no argument prints the full board table; with an `fpga_id`,
that board's detail (state, owner, current job). `jobs` lists every job the
caller's API key has submitted, newest first — the only way to find a
build's `job_id` while it's still in flight, since a board-less build has no
board to look it up by. `job`/`logs` take a `job_id` directly (jobs are
looked up by their own id now, not scoped under a board).

```text
  ID  STATE           OWNER         CURRENT JOB
  ─────────────────────────────────────────────
   0  idle            -             -
   3  reserved        alice         a1b2c3d4…
```

States: `idle`, `programming`, `reserved`, `error`.

```text
  JOB_ID      TYPE                STATUS      FPGA   CREATED
  ──────────────────────────────────────────────────────────
  8bf0de40…   reset               complete    2      2026-07-15T12:48:23Z
  a4c92b62…   run                 failed      2      2026-07-15T12:48:19Z
  8d4fa7d8…   build_and_program   complete    2      2026-07-15T12:45:27Z
```

`FPGA` is blank until a board claims the job (still building, or waiting to
flash) — poll `mrg jobs`/`mrg job <job_id>` rather than assuming a board is
assigned right after submit.

When a build fails, `mrg logs <job_id>` prints the toolchain output (Yosys /
nextpnr) so you can see what was rejected.

## `cancel`: stop a job

```bash
mrg cancel <job_id>
```

Cancels a queued job, or stops an in-flight build. Requires a real API key
(the caller must be the job's owner).

## `reset`: return a board to idle

```bash
mrg reset <fpga_id>
```

Reflashes the base image and returns the board to `idle`. Async, poll
`mrg status <fpga_id>` rather than expecting it to complete instantly.

## `read` / `write`: poke registers directly

```bash
mrg read  <fpga_id> <address> [--count N]
mrg write <fpga_id> <address> <value>
```

`address`/`value` accept hex or decimal; `address` is a **byte** address.
Works against a live (`reserved`) board.

```bash
mrg read 0 0x10            #   0x10: 0x00000005
mrg write 0 0x04 3
```

## See also

- [Python SDK](sdk.md), the `App`/`Sandbox`/`build` surfaces the CLI drives.
- [Examples](../examples/index.md), runnable apps.
