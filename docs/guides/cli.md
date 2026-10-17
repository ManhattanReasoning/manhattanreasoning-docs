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
mrg synth <design.py|design.v> [--top NAME]                                      # resource util
mrg pnr   <design.py|design.v> [--top NAME] [--target-mhz] [--sys-clk-mhz] [--timing-target-mhz]  # Fmax + timing
```

Both print a JSON report on stdout and exit non-zero on a failed build. No
API key, no cloud, these run against the local toolchain or the pinned
Docker image. `design` may be an Amaranth `.py` module or a plain Verilog
`.v` file — the extension picks the language. `--top` is a Verilog-only
top-module disambiguator (ignored for Amaranth), only needed when a `.v`
file exposes more than one module matching the Wishbone contract; otherwise
the top module is auto-detected.

## `run`: program and run an app

```bash
mrg run <file.py> [--fpga-id N] [--no-program] [--sys-clk HZ] [--timing-target-mhz MHZ] [--top NAME] [--transport websocket|http]
                  [--include-dir DIR] [--source FILE ...]
```

`--include-dir` and `--source` (repeatable) override `App(include_dir=...)`
and `App(sources=...)`, for designs whose dependencies need to be uploaded
explicitly; see [Multi-file designs](sdk.md#multi-file-designs). Paths are
relative to the design's folder, not the client script.

`--top` overrides `App(top=...)`; it's the Verilog-only top-module
disambiguator described above (ignored when the `App`'s `design` is
Amaranth), only needed if the app's `.v` file exposes more than one module
matching the Wishbone contract.

`--transport` overrides `App(transport=...)` and `$MRG_TRANSPORT`. Leave it
unset to use a WebSocket; pass `http` on a network that blocks WebSockets
(much slower, see [`App`](sdk.md#app)).

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
mrg jobs   [--status STATUS] [--type build|run|reset|all] [-n N | --all] [--json]
mrg job    <job_id> [--json]
mrg logs   <job_id>
```

`status` with no argument prints the server's deployed commit and the full
board table. With an `fpga_id`, it prints that board's detail (state, owner,
session, current job). `HELD FOR` is how long the current reservation has
lasted; `JOB AGE` is the time since the board's current job was submitted
(queueing, building and flashing included, so it isn't billable build time).
When you're logged in, your active builds are listed below the table, including
ones that have no board yet, with their elapsed time and current stage.

```text
  server commit: 92a7cf81eb64f941f7ee2454c12100681df3cb8d

  ID  STATE           OWNER         HELD FOR      JOB AGE       CURRENT JOB
  ─────────────────────────────────────────────────────────────────────────
   0  idle            -             -             -             -
   3  reserved        alice         00:12:40      00:15:02      a1b2c3d4…

  Your active builds (elapsed since submission, including waiting):
  8bf0de40…  00:01:37  build_gateware/nextpnr-ecp5
```

States: `idle`, `programming`, `reserved`, `error`. Durations are `HH:MM:SS`
snapshots; run the command again to refresh them.

`jobs` lists **your 10 most recent builds**, newest first: the way to find a
build's `job_id` while it's still in flight, since a board-less build has no
board to look it up by. `-n N` shows more and `--all` shows them all.
`--type all` includes `run` and `reset` jobs too (every HTTP `app.read()` or
`app.write()` is its own `run` job, so that list is long). `--json` always
prints the raw, unfiltered list. `job`/`logs` take a `job_id` directly.

```text
$ mrg jobs -n 3

  JOB_ID      TYPE                STATUS      FPGA   ELAPSED       CREATED
  ────────────────────────────────────────────────────────────────────────
  de6996c6…   build_and_program   complete    5      00:02:50      2026-10-17T02:12:14Z
  efcd2252…   build_and_program   failed      0      00:03:02      2026-10-17T02:12:14Z
  8d4fa7d8…   build_and_program   running     -      00:01:12      2026-10-17T02:20:03Z

  showing the 3 most recent; hidden: 42 older (-n N or --all), 310 of other types (--type all)
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
mrg read  <fpga_id> <address> [--count N] [--transport websocket|http]
mrg write <fpga_id> <address> <value> [--transport websocket|http]
```

`address`/`value` accept hex or decimal; `address` is a **byte** address.
Works against a live (`reserved`) board.

Each command opens a WebSocket to the board, makes its one call, and closes
it. Pass `--transport http` (or set `MRG_TRANSPORT=http`) on a network that
blocks WebSockets. If the socket can't open, or another connection is using
the board, the command prints a one-line `error:` message instead of a
traceback.

```bash
mrg read 0 0x10            #   0x10: 0x00000005
mrg write 0 0x04 3
```

## See also

- [Python SDK](sdk.md), the `App`/`Sandbox`/`build` surfaces the CLI drives.
- [Examples](../examples/index.md), runnable apps.
