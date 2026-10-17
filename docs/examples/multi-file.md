# Multi-file

A Verilog design split across three files, to show that `mrg run` uploads a
design's local dependencies automatically. The top module instantiates a
module from another file, which pulls a constant from an included header.
Nothing in the client lists those files.

Source: [`examples/multi_file/`](https://github.com/ManhattanReasoning/manhattan-reasoning-sdk/tree/main/examples/multi_file) in the `manhattan-reasoning-sdk` repo.

## Run it

```bash
mrg run examples/multi_file/client.py
```

```text
Multi-file design returned the expected value
```

This builds and programs a real FPGA.

## The files

```text
examples/multi_file/
├── client.py              # the App: design="design.v", nothing else
├── design.v               # top module: instantiates constant_value
├── rtl/constant_value.v   # `include "values.vh"
└── include/values.vh      # `define EXAMPLE_VALUE 32'h12345678
```

`design.v` meets the [Wishbone contract](../guides/sdk.md#app) and drives its
read data from the `constant_value` module:

```verilog
module example_top (
    input clk, rst,
    input wb_cyc, wb_stb, wb_we,
    input [8:0] wb_adr,
    input [31:0] wb_dat_w,
    input [3:0] wb_sel,
    output [31:0] wb_dat_r,
    output wb_ack
);
    constant_value value_source(.value(wb_dat_r));
    assign wb_ack = wb_cyc & wb_stb;
endmodule
```

`rtl/constant_value.v` includes the header for its value:

```verilog
`include "values.vh"
module constant_value(output [31:0] value);
    assign value = `EXAMPLE_VALUE;
endmodule
```

The client only names the top-level file:

```python
app = mrg.App(
    "multi_file",
    design=str(Path(__file__).with_name("design.v")),
)


@app.local_entrypoint()
def main():
    with app:
        assert app.read(0) == 0x12345678
        print("Multi-file design returned the expected value")
```

From `design.v`, the SDK finds `rtl/constant_value.v` (a module instance) and,
from that, `include/values.vh` (a literal `` `include ``). It uploads all three
as one bundle. Discovery starts in the folder containing `design.v`, so it
works whichever directory you run `mrg run` from.

## When discovery isn't enough

Discovery reads static imports, module instances and literal includes. For
anything it can't follow, send the files yourself:

```python
mrg.App("multi_file", design="design.v", include_dir="support")       # a whole directory
mrg.App("multi_file", design="design.v", sources=["rtl/child.v"])     # an exact list
```

The CLI equivalents are `--include-dir` and `--source`. See
[Multi-file designs](../guides/sdk.md#multi-file-designs) for the rules and
limits.
