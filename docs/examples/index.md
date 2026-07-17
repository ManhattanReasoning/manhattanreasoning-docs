# Examples

Runnable apps from the [`manhattan-reasoning-gym`](https://github.com/ManhattanReasoning/manhattan-reasoning-gym/tree/main/examples)
repo. Each is a complete `mrg.cloud.App` you launch with `mrg run`.

<div class="grid cards" markdown>

-   :material-hand-wave: **[Hello Wishbone](hello-wishbone.md)**

    The minimal smoke test, write a pattern to an echo RAM and read it back.
    Start here to verify the interface contract.

-   :material-file-code: **[Verilog Hello](verilog-hello.md)**

    The same echo RAM as Hello Wishbone, written as plain Verilog instead of
    Amaranth, to demonstrate submitting a hand-written `.v` design directly.

-   :material-check-decagram: **[SAT solver](sat-solver.md)**

    A brute-force boolean satisfiability solver in hardware. Includes a
    generalized DIMACS runner and a 30-variable variant.

-   :material-brain: **[BERT feed-forward](bert-ffn.md)**

    A real transformer encoder block whose feed-forward matmuls run on the
    FPGA via a tiled int8 matmul core.

-   :material-chip: **[FFN accelerator](ffn-accel.md)**

    A real streaming INT8 transformer feed-forward engine, entirely in
    silicon, parallel MAC grid, on-chip requantization, and GELU.

</div>

!!! tip "Before you run"
    `pip install manhattan-reasoning-gym`, `mrg login`, and confirm a board is
    `idle` (`mrg status`). See the [Quickstart](../guides/quickstart.md).
