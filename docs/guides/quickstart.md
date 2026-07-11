# Quickstart

Install the SDK, program an FPGA, and run a real workload, in a few minutes,
headless-friendly (no browser required if you'd rather use a token).

!!! info "What you need"
    - **Python 3.12+**
    - **Docker**, for local synth/PnR feedback and sandboxing (the SDK runs the
      pinned toolchain image for you, you never install yosys/nextpnr/LiteX)
    - An **allowlisted API key** for cloud FPGA access (`mrg login`)

## 1. Install

```bash
pip install manhattan-reasoning-gym
docker pull ghcr.io/manhattanreasoning/mrg-sandbox:latest
```

If your system Python is broken or externally managed, the robust path is
`uv venv && uv pip install manhattan-reasoning-gym`.

## 2. Log in

```bash
mrg login
```

Opens a GitHub device-flow login in your browser and stores the resulting API
key at `~/.config/mrg/credentials.json`. Headless / CI environments can skip
the browser entirely:

```bash
export MRG_API_KEY=...                        # already have a key
# or
mrg login --github-token <no-scope PAT>       # or $GITHUB_TOKEN
```

A no-scope personal access token is sufficient, it's only used to read your
GitHub username against the allowlist.

## 3. Get a local build report: no board needed

```bash
mrg synth examples/design.py   # resource utilization, ~seconds
mrg pnr   examples/design.py   # Fmax + timing closure, ~tens of seconds
```

Both print a JSON report on stdout and exit non-zero if the build fails,
useful in scripts and CI without ever touching a real board.

## 4. Run it on real hardware

```bash
mrg run examples/app.py
```

```text
  ID  STATE           OWNER         CURRENT JOB
  ─────────────────────────────────────────────
   0  idle            -             -
```

`mrg run` picks an idle board automatically (unless the app pins one), builds
and programs it (~2-3 min the first time), then runs the app's entrypoint. The
board stays reserved to you afterward, reuse it with `mrg run --no-program`,
or free it for someone else:

```bash
mrg reset 0
```

`reset` is an async queued job that reflashes the base image (~1 min); poll
with `mrg status 0` rather than expecting it to complete instantly.

## What's next

<div class="grid cards" markdown>

-   :material-language-python: **[The Python SDK](sdk.md)**: write your own `App`, or run agents in a `Sandbox`.
-   :material-console: **[The CLI](cli.md)**: every `mrg` command.
-   :material-flask: **[Examples](../examples/index.md)**: runnable, real designs.

</div>
