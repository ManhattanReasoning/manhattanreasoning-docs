---
description: Release notes for the manhattan-reasoning-gym SDK and CLI.
---

# Changelog

Notable changes to the `manhattan-reasoning-gym` SDK and CLI. The project is in
private beta, so surfaces may still change between `0.1.x` releases.

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
