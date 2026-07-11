# API Reference

Generated from `manhattan-reasoning-gym`'s public docstrings. For a narrative
walkthrough of these same surfaces, see the [SDK guide](../guides/sdk.md).

The SDK is organized by role into four namespaces:

| Namespace | Use it for |
| --- | --- |
| [`mrg.cloud`](cloud.md) | Direct cloud silicon for a key-holding user or agent (`App`, `run`). |
| [`mrg.build`](build.md) | Local synthesis and place-and-route, no cloud (`synth`, `pnr`). |
| [`mrg.sandbox`](sandbox.md) | Brokered promotes for a sandboxed agent that holds no key (`promote`). |
| [`mrg.bench`](bench.md) | The RL-gym harness (`Sandbox`, `run_sandbox`, `SandboxProfile`). |
