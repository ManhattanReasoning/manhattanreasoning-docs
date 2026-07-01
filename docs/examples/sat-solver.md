# SAT solver

The flagship workload: a **brute-force boolean satisfiability solver** in
hardware. Every clock cycle it evaluates all clauses combinationally in parallel
against the current candidate assignment, while a binary counter sweeps the
assignment space. Worst case is `2^n_vars` cycles — ≈20 µs for 10 variables at
50 MHz.

It's deliberately the naive baseline: a fast, verifiable reward signal that an
agent is meant to *improve on* (toward DPLL/CDCL-style reasoning).

Source: `examples/sat_solver/` in the
[`Cloud_FPGA`](https://github.com/ManhattanReasoning/Manhattan-Reasoning-Cloud) repo.

## Run it

```bash
cloud-fpga run examples/sat_solver/client_sdk.py
```

```text
[cloud-fpga] programming 'sat_solver' onto FPGA 0 ...
[cloud-fpga] done.
solving ...
SAT  (8 cycles)  model={'x1': True, 'x2': True, 'x3': True}
solving (x1) ∧ (¬x1) ...
UNSAT  (3 cycles)
```

`client_sdk.py` solves a built-in SAT formula and a built-in UNSAT formula.

## Solve your own formula

A generalized runner (`solve.py`) accepts a
[DIMACS](https://www.cs.utexas.edu/~marijn/sat/) formula — variables are 1-based,
a negative number means negated, `0` ends a clause:

```bash
# inline DIMACS
SAT_FORMULA="1 2 3 0 -1 2 0 -2 3 0 1 -3 0" \
  cloud-fpga run examples/sat_solver/solve.py

# from a .cnf file
SAT_CNF=myproblem.cnf cloud-fpga run examples/sat_solver/solve.py

# pick a different board
FPGA_ID=1 SAT_CNF=myproblem.cnf cloud-fpga run examples/sat_solver/solve.py
```

## Limits

The default design is sized at synthesis time:

| Parameter | Max | Constant |
| --- | --- | --- |
| Variables | 10 | `MAX_VARS` |
| Clauses | 20 | `MAX_CLAUSES` |
| Literals per clause | 10 | `CLAUSE_LEN` |

The variable index is packed into a 4-bit field, so **16 variables** is the
ceiling without changing the literal encoding. Beyond that, brute force itself is
the wall: the search is `2^n`, so it gets impractical around 25–30 variables.

## Register map

32-bit registers; byte offset = 4 × word offset, relative to the design's
Wishbone region.

| Word | Byte | Access | Contents |
| --- | --- | --- | --- |
| 0 | `0x000` | W | bit 0 = start (auto-clears) |
| 0 | `0x000` | R | bit 0 = done, bit 1 = sat |
| 1 | `0x004` | W | `n_vars` |
| 2 | `0x008` | W | `n_clauses` |
| 3 | `0x00C` | R | model — bit *i* = value of variable *i+1* (valid when sat) |
| 4 | `0x010` | R | cycles taken (diagnostic) |
| 8 + c·10 + l | `0x020 + …` | W | literal for clause *c*, slot *l*: bits[3:0]=variable (0-based), bit 4=negated, bit 5=used |

Solve sequence: write the literal block → write `n_vars`/`n_clauses` → write
start → poll word 0 until `done` → if `sat`, read the model from word 3.

## Going bigger: a 30-variable variant

To watch brute force stretch its legs, a wide variant widens the literal field to
5 bits (so up to 30 variables) and the cycle counter to 32 bits (so it doesn't
overflow past 2²⁰). A full 2³⁰ sweep runs in real time on the FPGA:

```bash
# (x30) ∧ (¬x30): UNSAT, but references x30 so it sweeps all 2^30 assignments
SAT_FORMULA="30 0 -30 0" cloud-fpga run examples/sat_solver/solve_wide.py
```

```text
formula: 30 vars, 2 clauses  (search space = 2^30)
solving on the FPGA ...
UNSAT  (1,073,741,824 cycles, 21.47s on-chip @50MHz, 22.1s wall)
```

Exactly 2³⁰ cycles at 50 MHz ≈ 21.5 s of pure hardware search, with the network
adding well under a second.

## Without hardware

The example also has pure-Python and Amaranth simulation tests, plus a reference
client (`client.py`) that speaks the wire protocol directly to a board on your
LAN. See `examples/sat_solver/README.md`.
