# The Python SDK

`manhattan-reasoning-gym` (imported as `mrg`) has three surfaces, matching the
three ways to use the platform:

| Surface | What it does | Needs |
| --- | --- | --- |
| [`mrg.build`](#mrgbuild-local-synth-pnr) | local synth / place-and-route reports, no board | Docker |
| [`mrg.Sandbox`](#mrgsandbox-locked-agent-execution) | run an untrusted agent in a locked container that can promote to silicon | Docker |
| [`mrg.cloud`](#mrgcloud-real-hardware) | program + drive a real ECP5 over the cloud | API key |

## `mrg.cloud`: real hardware

You describe an **application** with three things: a **design** (an Amaranth
`.py` file whose top-level module is a Wishbone B4 slave), an optional
**register map** (the byte offsets your design exposes), and API config.

```python
import manhattan_reasoning_gym as mrg

class Regs(mrg.cloud.RegisterMap):
    CTRL     = 0x0000
    DATA_IN  = 0x0004
    DATA_OUT = 0x0008

app = mrg.cloud.App(
    "my_design",
    design="design.py",
    registers=Regs,
)

@app.local_entrypoint()
def main():
    app.write(Regs.DATA_IN, 0x1234)
    app.write(Regs.CTRL, 1)            # kick off
    print(hex(app.read(Regs.DATA_OUT)))
```

Run it with the CLI, which programs the FPGA then calls the entrypoint:

```bash
mrg run my_design.py
```

### `App`

```python
mrg.cloud.App(
    name,
    *,
    design,                    # path to the Amaranth .py design
    fpga_id=None,               # pin a board, or let the SDK pick an idle one
    registers=None,              # a RegisterMap subclass (optional)
    api_key=None,                # explicit arg > $MRG_API_KEY > `mrg login`
    api_url=DEFAULT_API_URL,
    sys_clk_freq=None,            # SoC compute clock override (Hz)
    timing_target_mhz=None,        # PnR/grading timing target (MHz)
)
```

Creating an `App` registers it so the CLI can discover it, you don't export
anything. If a file defines several, `mrg run` uses the last one.

!!! info "Sys clock vs. timing target"
    A build carries two independent frequencies. **Sys clock** is what the SoC
    actually runs at (produced by the ECP5 PLL from a fixed 12 MHz input,
    default **50 MHz**), because the PLL divides that fixed input, only
    certain output frequencies are realizable. **Timing target** is the
    frequency place-and-route is *constrained* to hit and the build is
    *graded* against; it carries no PLL restriction, so it can be any value,
    and defaults to the sys clock. Keeping them separate lets you ask "can
    this design close at 90 MHz?" without re-clocking the SoC, and grade
    against thresholds the PLL can't synthesize exactly. Set both via
    `App(sys_clk_freq=..., timing_target_mhz=...)` or the CLI's
    `--sys-clk`/`--timing-target-mhz` flags.

#### `app.read(addr, count=1)`

Read `count` 32-bit words starting at byte address `addr`. Returns a single
`int` when `count == 1`, otherwise a `list[int]`. Programs the FPGA first if
it hasn't been programmed yet.

#### `app.write(addr, value)`

Write one or more 32-bit words to byte address `addr`. `value` may be a single
`int` or a `list[int]` for a burst write.

#### `app.release()`

Release the active session, returning the board to `idle`. Returns the reset
`job_id`. `App` is also a context manager that calls this on exit.

### `RegisterMap`

A marker base class for your design's address map, subclass it and set
integer class attributes for the byte offsets. Byte offset = 4 × word offset.
Passing `registers=` to `App` is optional; it's for your own organization,
`read`/`write` take raw addresses either way.

### `@app.local_entrypoint()`

Marks the function `mrg run` calls after programming. Not called on plain
`import`/`python`, so the same file doubles as an importable module and a
runnable app.

### `secret(env_var)`

Reads a required environment variable, raising immediately if it's unset,
useful for API keys you want to fail loudly on rather than silently pass
through as `None`.

### Module-level session functions

```python
mrg.cloud.get_session(fpga_id, api_key, api_url)      # current session info
mrg.cloud.release_session(fpga_id, api_key, api_url)  # release, returns job_id
```

## `mrg.Sandbox`: locked agent execution

For running an **untrusted agent**: the agent gets a locked-down container
with no API key and no network. Having vetted a candidate locally with
`mrg.build`, it calls `mrg.sandbox.promote(...)`, a file handoff on the
shared workspace, and your trusted process outside the container decides
whether to run it on real silicon.

```python
import manhattan_reasoning_gym as mrg

sb = mrg.Sandbox(files=["design.py", "agent.py"])  # mock silicon unless a key is set
result = sb.run("agent.py")
for promotion in result.promotions:
    print(promotion)
```

```python
mrg.Sandbox(
    files=(),
    *,
    isolation="locked",       # or "dev", or a custom SandboxProfile
    silicon="auto",           # "auto" | "cloud" | "mock" | a callable
    api_key=None,
    api_url=None,
    sys_clk_freq=None,
    guard=None,               # optional (design_bytes, report) -> reject reason | None
    image=None,
    poll_interval=0.2,
)
```

`sb.run(entrypoint, *, timeout=1800)` launches `entrypoint` in the container
and brokers its promotes to silicon, returning a `SandboxResult(returncode,
stdout, stderr, promotions)`.

**No gating by default**: the framework doesn't decide whether a promote is
"good enough"; the agent gates itself, and you only get a promote check if you
pass `guard=`. **The trust boundary is fixed**: the container has no key and
no network; promote is a file handoff on the shared workspace; only the
trusted process outside the container holds the key and touches silicon.

### Inside the container: `mrg.sandbox.promote`

The only function available to a sandboxed agent, it never holds a key or
calls the orchestrator directly:

```python
report = mrg.build.pnr("design.py")
if report.fits and report.timing_met:
    mrg.sandbox.promote("design.py", report, agent="demo-agent")
```

## `mrg.build`: local synth / PnR

Fast, no-cloud, no-board build feedback. The same call works everywhere: run
inside the sandbox image (toolchain present) executes in-process; run on a
plain host transparently runs the pinned Docker image and parses its JSON
report. Either way you get a `BuildReport` back.

```python
mrg.build.synth(design, *, work=None) -> BuildReport
mrg.build.pnr(
    design, *,
    target_mhz=None,        # legacy alias, sets both knobs below
    sys_clk_mhz=None,
    timing_target_mhz=None,
    seed=1,
    work=None,
) -> BuildReport
```

- `synth`: resource utilization only, fast, no timing analysis.
- `pnr`: full-SoC place-and-route (Fmax, `timing_met`, SoC-wide utilization).

`BuildReport` fields: `mode`, `ok`, `scope`, `fits`, `fmax_mhz`, `sys_clk_mhz`,
`target_mhz`, `timing_met`, `clock`, `util`, `synth_cells`, `warnings`,
`design_hash`, `toolchain`, `log_tail`, plus `.to_json()`/`.to_dict()`.

## See also

- [CLI reference](cli.md), driving all three surfaces from the terminal.
- [Examples](../examples/index.md), complete, runnable apps.
- [API Reference](../reference/index.md), the full generated docstring reference.
