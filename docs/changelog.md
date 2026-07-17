---
description: Release notes for the manhattan-reasoning-gym SDK and CLI.
---

# Changelog

Notable changes to the `manhattan-reasoning-gym` SDK and CLI. The project is in
private beta, so surfaces may still change between `0.1.x` releases.

## 0.1.8 (private beta)

### Added
- **Plain Verilog designs.** `design=` on `App`, and the `design` argument to
  `mrg.build.synth`/`pnr` and `mrg synth`/`mrg pnr`, now also accept a `.v`
  file, not just an Amaranth `.py` module — the extension picks the language
  server-side. A Verilog file's top module is found by scanning for the one
  module whose port list matches the fixed Wishbone contract (`clk`, `rst`,
  `wb_cyc`, `wb_stb`, `wb_we`, `wb_adr`, `wb_dat_w`, `wb_sel`, `wb_dat_r`,
  `wb_ack`, exact widths and directions) by name; if a file exposes more than
  one matching module, pass `--top <name>` (CLI) or `top="<name>"`
  (`App(...)`/`mrg.build.synth`/`pnr`) to disambiguate. See the new
  [Verilog Hello](examples/verilog-hello.md) example.
- `mrg synth`/`mrg pnr` and `mrg run` gained a `--top` flag; `App`,
  `mrg.build.synth`, and `mrg.build.pnr` gained a matching `top=` keyword
  argument. All are ignored for an Amaranth design.

## 0.1.7 (private beta)

### Fixed
- `mrg.bench.CloudSilicon` still called the pre-0.1.6 client API
  (`find_idle_fpga`/`NoFPGAAvailableError`, and `submit(fpga_id, ...)`), left
  over from the 0.1.6 board-less submit change. It now submits without an
  `fpga_id`, treats a full build-slot pool as a `503` (surfaced as
  `no_board`) instead of a pre-flight idle-board check, and reads the
  assigned `fpga_id` off the completed job record instead of raising on
  success.

## 0.1.6 (private beta)

### Changed
- **Board-less submit.** `App`/`mrg run` no longer picks a board before
  building — the server claims a build slot (a network identity baked into
  the bitstream, decoupled from any physical board) and dispatches the build
  immediately, so many builds now run concurrently regardless of how many
  physical boards are live. `app.fpga_id` is filled in once some board's
  worker claims the finished bitstream and flashes it, not chosen up front.
  `App(fpga_id=...)` / `mrg run --fpga-id` now only matter for the
  `--no-program` reconnect case (skip rebuilding, talk to a board you already
  have a live session on).
- `mrg job`, `mrg logs`, and `mrg cancel` now take a `job_id` directly instead
  of `<fpga_id> [job_id]` — jobs are looked up by their own id, not scoped
  under a board, since a job with no board assigned yet has no board to look
  it up by.
- FPGA states are now `idle`, `programming`, `reserved`, `error` — `queued`
  and `building` were board states describing a build in progress on that
  board; a build never touches a board anymore, so those states no longer
  apply to one.

### Added
- `mrg jobs [--status STATUS]`: list every job the caller's API key has
  submitted, newest first — the only way to find a board-less build's
  `job_id` while it's still in flight, since it has no board to check
  instead.

## 0.1.5 (private beta)

### Added
- `App.write(addr, value, fixed_address=True)`: repeats `addr` for every word
  in a burst instead of incrementing it, for a FIFO or push-register port
  where a design keeps its own internal write index (a common streaming-load
  pattern — writing a sequence of words one at a time to a single register,
  with the RTL auto-advancing into the next clause/slot).
- `App.stream()`: a persistent, low-latency session for many small
  `read`/`write` ops. Unlike `App.write()`/`App.read()`, which each dispatch
  their own job against the cloud API and poll for completion every 0.5s, a
  `Stream` holds one WebSocket connection open for the life of a `with`
  block — useful for tight loops like loading a CNF instance one literal per
  write, or an RL reward loop grading many episodes per training step.

## 0.1.4 (private beta)

The current beta surface:

- **`mrg.cloud`** for direct cloud silicon: declare an `App`, program a real
  Lattice ECP5 over the network, and drive it over MMIO.
- **`mrg.build`** for local synthesis and place-and-route feedback (`synth`,
  `pnr`) in the pinned toolchain image, with no board and no cloud.
- **`mrg.sandbox`** and **`mrg.bench`** for running untrusted agents in a locked
  container that promotes candidates to silicon through a broker.
- The `mrg` CLI: `login`, `run`, `synth`, `pnr`, `status`, `job`, `logs`,
  `cancel`, `reset`, `read`, and `write`.

<!--
Add new releases above this line, newest first. Suggested format:

## 0.1.5 (YYYY-MM-DD)

### Added
- ...

### Changed
- ...

### Fixed
- ...
-->
