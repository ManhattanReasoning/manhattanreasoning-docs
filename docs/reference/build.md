# mrg.build

Local synthesis and place-and-route feedback in the toolchain image. No board
and no cloud: run `synth` for a fast utilization report, or `pnr` for full-SoC
Fmax and timing.

::: manhattan_reasoning_gym.build
    options:
      members:
        - synth
        - pnr
        - SandboxUnavailableError
