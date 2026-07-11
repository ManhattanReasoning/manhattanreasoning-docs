# FFN accelerator

A **streaming, tiled, quantized FFN engine** in Amaranth that runs the BERT
feed-forward sublayer, `requant2(GELU(requant1(x·W1))·W2)`, entirely in
silicon. This engine owns the whole computation: it tiles, accumulates over
K, requantizes, and applies GELU on-chip, through the existing 2 KB Wishbone
MMIO window, no SoC changes.

```text
 x (int8) ─▶ MatMul-1 ─▶ Requant ─▶ GELU LUT ─▶ MatMul-2 ─▶ Requant ─▶ y (int8)
             x·W1        int32→int8   int8→int8   ·W2         int32→int8
             └─ tiled output-stationary MAC grid (tile×tile INT8 MACs) ─┘
```

Source: [`examples/ffn_accel/`](https://github.com/ManhattanReasoning/manhattan-reasoning-gym/tree/main/examples/ffn_accel) in the `manhattan-reasoning-gym` repo. The
[BERT feed-forward example](bert-ffn.md) is a real application built on top
of this same design.

## What's real about it

| Feature | How |
| --- | --- |
| **Parallel MAC grid** | `tile×tile` output-stationary INT8→INT32 MACs, one DSP each |
| **Hardware tiling** | An FSM sweeps M×N output tiles, accumulating over K from packed BRAM |
| **Proper quantization** | Per-tensor int8 + gemmlowp-style fixed-point requant: `(acc·mult + bias) >> shift` |
| **GELU** | Exact int8→int8 lookup ROM, runtime-loadable per model |
| **Native chaining** | Each engine emits results in the layout the next consumes, GELU is a 1-pass streaming copy, no transpose |
| **Pipelined** | Address-ahead-of-data K-loop, 1-cycle requant/GELU stages |

The design is one self-contained file (the orchestrator uploads only that),
and it's **bit-exact** against a NumPy golden model, the golden model
performs the identical integer ops, so a passing simulation test *is* a proof
of correctness, not an approximation.

## ECP5-85 fit (real `yosys synth_ecp5`)

The whole dual-engine slave at `tile=4`:

| | LUT4 | carry (CCU2C) | DSP (MULT18X18) | BRAM (DP16KD) | FF |
| --- | --- | --- | --- | --- | --- |
| FFNSlave | 3,437 | 840 | 40 | 6 | 1,505 |
| **Budget (LFE5UM5G-85F)** | 84k | – | **156** | 208 | – |

Fits with huge headroom next to the VexRiscv+LiteEth SoC. The parallel MAC
grid scales as `tile²` DSPs, 12×12 (144 MACs) is the max all-DSP fit; 16×16
(256 MACs) needs on-fabric multipliers.

## Run it

```bash
mrg login                                   # or set MRG_API_KEY
mrg run examples/ffn_accel/client_sdk.py    # builds the bitstream, programs a board, runs
```

The client builds a quantization plan host-side, streams the int8 operands +
requant constants + GELU table through the MMIO window, runs the pipeline,
reads the int8 output back, and asserts it's bit-exact against the golden
model.

```bash
cd examples/ffn_accel && python -m pytest tests/ -q   # 9 sim tests, no hardware
```

Covers the MAC grid, requant, the tiling engine, the full FFN, and the
complete Wishbone MMIO data path, each bit-exact against the golden model.

## The honest limitation (why the demo dims are small)

A *full* BERT-base FFN has 4.7 MB of weights, 10× the ECP5-85's 468 KB of
BRAM, so a real deployment must *stream* weights from off-chip, and on this
board the only host link is 100 Mbit Ethernet through a softcore, which caps
a full layer at roughly half a second of weight transfer (I/O-bound, not
compute-bound). The engine is architected for that streaming model (operands
flow in tile by tile); the on-board demo keeps dimensions small (`8→32→8`)
because operands load through the 2 KB MMIO window one word at a time. The
*silicon* is the real thing; feeding it at full BERT scale is a data-path
project (DMA + a faster link), not a compute one.
