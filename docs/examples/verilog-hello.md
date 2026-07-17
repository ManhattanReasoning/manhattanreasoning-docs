# Verilog Hello

The same design as [Hello Wishbone](hello-wishbone.md), a 512 × 32-bit echo
memory, but written as plain Verilog instead of Amaranth, to demonstrate
submitting a hand-written `.v` design directly.

Source: [`examples/verilog_hello/`](https://github.com/ManhattanReasoning/manhattan-reasoning-gym/tree/main/examples/verilog_hello) in the `manhattan-reasoning-gym` repo.

## Run it

```bash
# Local synth report only (no cloud, no hardware)
mrg synth examples/verilog_hello/design.v

# Against a live node
mrg run examples/verilog_hello/client_sdk.py
```

```text
writing pattern ...
reading back ...
  [0] 0xdeadbeef → OK
  [1] 0xcafebabe → OK
  [2] 0x12345678 → OK
  [3] 0xabcdef01 → OK
```

## The design

`echo_slave`: the memory behind the Wishbone B4 slave contract (registered
single-cycle ack), identical timing to
[`hello_wishbone/design.py`](hello-wishbone.md)'s `EchoSlave`:

```verilog
module echo_slave (
    input  wire        clk,
    input  wire        rst,
    input  wire        wb_cyc,
    input  wire        wb_stb,
    input  wire        wb_we,
    input  wire [8:0]  wb_adr,   // 512 words = 9 address bits
    input  wire [31:0] wb_dat_w,
    input  wire [3:0]  wb_sel,   // accepted, ignored
    output wire [31:0] wb_dat_r,
    output reg         wb_ack
);
    reg [31:0] mem [0:511];
    reg [31:0] dat_r_reg;
    wire wr_en = wb_cyc & wb_stb & wb_we & ~wb_ack;

    always @(posedge clk) begin
        if (rst) begin
            wb_ack <= 1'b0;
            dat_r_reg <= 32'b0;
        end else begin
            wb_ack <= wb_cyc & wb_stb & ~wb_ack;
            if (wr_en)
                mem[wb_adr] <= wb_dat_w;
            dat_r_reg <= mem[wb_adr];
        end
    end

    assign wb_dat_r = dat_r_reg;
endmodule
```

## The whole app

```python
import manhattan_reasoning_gym as mrg

class Regs(mrg.cloud.RegisterMap):
    # echo_slave exposes a 512-word (2 KB) echo RAM starting at byte 0.
    ECHO = 0x0000

app = mrg.cloud.App(
    "verilog_hello",
    design="examples/verilog_hello/design.v",
    registers=Regs,
)

@app.local_entrypoint()
def main():
    pattern = [0xDEADBEEF, 0xCAFEBABE, 0x12345678, 0xABCDEF01]

    print("writing pattern ...")
    for i, word in enumerate(pattern):
        app.write(Regs.ECHO + i * 4, word)

    print("reading back ...")
    for i, expected in enumerate(pattern):
        got = app.read(Regs.ECHO + i * 4)
        status = "OK" if got == expected else f"MISMATCH (got {got:#010x})"
        print(f"  [{i}] {expected:#010x} → {status}")
```

The only difference from `hello_wishbone/client_sdk.py` is `design=`
pointing at a `.v` file instead of a `.py` module — nothing else about
`App` changes.

## The Wishbone contract, for a Verilog top module

Unlike an Amaranth design, where the top-level class is found by scanning
for the one `Elaboratable` exposing the right port *attributes*, a plain
Verilog file's top module is found by scanning for the one module whose
port list matches this contract by name, width, and direction:

| Port | Width | Direction |
| --- | --- | --- |
| `clk` | 1 | input |
| `rst` | 1 | input |
| `wb_cyc` | 1 | input |
| `wb_stb` | 1 | input |
| `wb_we` | 1 | input |
| `wb_adr` | 9 | input |
| `wb_dat_w` | 32 | input |
| `wb_sel` | 4 | input |
| `wb_dat_r` | 32 | output |
| `wb_ack` | 1 | output |

If a file has more than one module matching this contract, pass `--top
<name>` (CLI) or `top="<name>"` (`App(...)`/`mrg.build.synth`/`pnr`) to
disambiguate, `design.v` here only has one, so it's auto-detected.

## Note: no simulation tests here

[`hello_wishbone/tests/`](hello-wishbone.md) uses Amaranth's own Python
simulator (`amaranth.sim.Simulator`), which only simulates Amaranth's IR, it
can't run a hand-written `.v` file. There's currently no Verilog simulator
wired into `mrg_build` (Icarus Verilog and Verilator ship in the sandbox
image's toolchain bundle already, but nothing calls them yet), so this
example's `tests/` is a synth-report smoke test instead of a real
simulation.
