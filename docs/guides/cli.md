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

Loads the [`mrg.cloud.App`](sdk.md#app) from `file.py`, programs the FPGA
(picking an idle board automatically unless `--fpga-id` or the app pins one),
then calls its [`@local_entrypoint`](sdk.md#applocal_entrypoint).

```bash
mrg run examples/app.py
mrg run my_design.py --fpga-id 3 --sys-clk 90e6
```

## `status`, `job`, `logs`: read-only, no login required

```bash
mrg status [fpga_id] [--json]
mrg job    <fpga_id> [job_id] [--json]
mrg logs   <fpga_id> [job_id]
```

`status` with no argument prints the full board table; with an `fpga_id`,
that board's detail (state, owner, current job). `job_id` is optional on
`job`/`logs`, omit it and the CLI resolves whatever job is currently running
on that board.

```text
  ID  STATE           OWNER         CURRENT JOB
  ─────────────────────────────────────────────
   0  idle            -             -
   3  reserved        alice         a1b2c3d4…
```

States: `idle`, `queued`, `building`, `programming`, `reserved`, `error`.

When a build fails, `mrg logs <fpga_id>` prints the toolchain output (Yosys /
nextpnr) so you can see what was rejected.

## `cancel`: stop a job

```bash
mrg cancel <fpga_id> [job_id]
```

Cancels a queued job, or stops an in-flight build. `job_id` is optional here
too, omit it to cancel whatever's currently running on that board. Requires
a real, board-owning API key.

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
