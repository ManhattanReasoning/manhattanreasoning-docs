# mrg.bench

The RL-gym harness: declare a `Sandbox`, run a sandboxed agent, and let promotes
be brokered to silicon internally. Promotes are ungated unless you pass a
`guard=`.

::: manhattan_reasoning_gym.bench
    options:
      members:
        - Sandbox
        - SandboxResult
        - SandboxProfile
        - run_sandbox
