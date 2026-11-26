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
mrg run <file.py> [--no-program] [--session ID] [--sys-clk HZ] [--timing-target-mhz MHZ] [--top NAME] [--transport websocket|http]
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
[`@local_entrypoint`](sdk.md#applocal_entrypoint). You never choose a board,
and never see which one you got: the server assigns one when your build is
flashed and gives the reservation a **session**, with a random id
(`app.session_id`). The board stays yours until the session ends.

`--no-program` skips the build and reconnects to the session you hold. If you
hold more than one, pick it with `--session ID` (the first 8 characters, as
`mrg status` shows them, are enough); `--session` implies `--no-program`.

```bash
mrg run examples/app.py
mrg run my_design.py --no-program   # reconnect to your session, skip rebuilding
```

!!! note "Board numbers are gone"
    `--fpga-id`, `App(fpga_id=...)` and the board-number arguments of
    `status`, `reset`, `read` and `write` were removed in 0.2.0. Every command
    acts on your session instead. Older SDKs need upgrading:
    `pip install -U manhattan-reasoning-gym`.

## `status`, `jobs`, `job`, `logs`: read-only, no login required

```bash
mrg status [SESSION] [--json]
mrg jobs   [--status STATUS] [--type build|run|reset|all] [-n N | --all] [--json]
mrg job    <job_id> [--json]
mrg logs   <job_id>
```

`status` needs you to be logged in. With no argument it prints the server's
deployed commit and the sessions you hold (usually none or one). With a
session id (or its first 8 characters) it prints that session's detail:
state, how long you've held it, when it expires, and its current job.
`HELD FOR` is how long the session has lasted; `JOB AGE` is the time since its
current job was submitted (queueing, building and flashing included, so it
isn't billable build time). Your active builds are listed below, with their
elapsed time and current stage.

```text
  server commit: 92a7cf81eb64f941f7ee2454c12100681df3cb8d

  SESSION     STATE           HELD FOR      JOB AGE       CURRENT JOB
  ───────────────────────────────────────────────────────────────────
  5f0c6f1e    reserved        00:12:40      00:15:02      a1b2c3d4…

  Your active builds (elapsed since submission, including waiting):
  8bf0de40…  00:01:37  build_gateware/nextpnr-ecp5
```

A session id that has ended, or isn't yours, gets the same "no such session"
answer either way.

States: `idle`, `programming`, `reserved`, `dirty` (session over, wiping the
board), `error`. Durations are `HH:MM:SS` snapshots; run the command again to
refresh them.

`jobs` lists **your 10 most recent builds**, newest first: the way to find a
build's `job_id` while it's still in flight. `-n N` shows more and `--all` shows them all.
`--type all` includes `run` and `reset` jobs too (every HTTP `app.read()` or
`app.write()` is its own `run` job, so that list is long). `--json` always
prints the raw, unfiltered list. `job`/`logs` take a `job_id` directly.

```text
$ mrg jobs -n 3

  JOB_ID      TYPE                STATUS      SESSION    ELAPSED       CREATED
  ────────────────────────────────────────────────────────────────────────────
  de6996c6…   build_and_program   complete    5f0c6f1e   00:02:50      2026-10-17T02:12:14Z
  efcd2252…   build_and_program   failed      -          00:03:02      2026-10-17T02:12:14Z
  8d4fa7d8…   build_and_program   running     -          00:01:12      2026-10-17T02:20:03Z

  showing the 3 most recent; hidden: 42 older (-n N or --all), 310 of other types (--type all)
```

`SESSION` is blank until the build is flashed onto a board — poll
`mrg jobs`/`mrg job <job_id>` rather than assuming you have a board right after
submit.

When a build fails, `mrg logs <job_id>` prints the toolchain output (Yosys /
nextpnr) so you can see what was rejected.

## `cancel`: stop a job

```bash
mrg cancel <job_id>
```

Cancels a queued job, or stops an in-flight build. Requires a real API key
(the caller must be the job's owner).

## `reset`: end your session

```bash
mrg reset [SESSION]
```

Ends your session and reflashes the board's base image. With no argument it
acts on the session you hold. Async: poll `mrg status` rather than expecting
it to complete instantly.

## `read` / `write`: poke registers directly

```bash
mrg read  <address> [--count N] [--session ID] [--transport websocket|http]
mrg write <address> <value> [--session ID] [--transport websocket|http]
```

`address`/`value` accept hex or decimal; `address` is a **byte** address.
Works against the board of the session you hold (`--session ID` picks one if
you hold several).

Each command opens a WebSocket to the board, makes its one call, and closes
it. Pass `--transport http` (or set `MRG_TRANSPORT=http`) on a network that
blocks WebSockets. If the socket can't open, or another connection is using
the board, the command prints a one-line `error:` message instead of a
traceback.

```bash
mrg read 0x10            #   0x10: 0x00000005
mrg write 0x04 3
```

## See also

- [Python SDK](sdk.md), the `App`/`Sandbox`/`build` surfaces the CLI drives.
- [Examples](../examples/index.md), runnable apps.
