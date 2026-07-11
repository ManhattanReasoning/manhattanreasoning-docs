# SAT solver

A **brute-force boolean satisfiability solver** in hardware, the primary
research target workload. Every clock cycle it evaluates all clauses
combinationally in parallel against the current candidate assignment, while a
binary counter sweeps the assignment space. Worst case is `2^n_vars` cycles,
≈20 µs for 10 variables at 50 MHz.

It's deliberately the naive baseline: a fast, verifiable reward signal that an
agent is meant to *improve on* (toward DPLL/CDCL-style reasoning).

Source: [`examples/sat_solver/`](https://github.com/ManhattanReasoning/manhattan-reasoning-gym/tree/main/examples/sat_solver) in the `manhattan-reasoning-gym` repo.

## Run it

```bash
mrg run examples/sat_solver/client_sdk.py
```

```text
solving ...
SAT  (8 cycles)  model={'x1': True, 'x2': True, 'x3': True}
solving (x1) ∧ (¬x1) ...
UNSAT  (3 cycles)
```

`client_sdk.py` writes a small built-in SAT formula and a built-in UNSAT
formula (`x1 ∧ ¬x1`), directly demonstrating the write-literals → start →
poll → read-model sequence.

## Limits

The design is sized at synthesis time:

| Parameter | Max | Constant |
| --- | --- | --- |
| Variables | 10 | `MAX_VARS` |
| Clauses | 20 | `MAX_CLAUSES` |
| Literals per clause | 10 | `CLAUSE_LEN` |

The variable index is packed into a 4-bit field, so **16 variables** is the
ceiling without changing the literal encoding. Beyond that, brute force itself
is the wall: the search is `2^n`, so it gets impractical well before that.

## Register map

32-bit registers; byte offset = 4 × word offset, relative to the design's
Wishbone region.

| Word | Byte | Access | Contents |
| --- | --- | --- | --- |
| 0 | `0x000` | W | bit 0 = start (auto-clears) |
| 0 | `0x000` | R | bit 0 = done, bit 1 = sat |
| 1 | `0x004` | W | `n_vars` |
| 2 | `0x008` | W | `n_clauses` |
| 3 | `0x00C` | R | model, bit *i* = value of variable *i+1* (valid when sat) |
| 4 | `0x010` | R | cycles taken (diagnostic) |
| 8 + c·10 + l | `0x020 + …` | W | literal for clause *c*, slot *l*: bits[3:0]=variable (0-based), bit 4=negated, bit 5=used |

Solve sequence: write the literal block → write `n_vars`/`n_clauses` → write
start → poll word 0 until `done` → if `sat`, read the model from word 3.

## Without hardware

The example also has pure-Python and Amaranth simulation tests, plus a
reference client (`client.py`) that speaks the wire protocol directly to a
board on the LAN. See `examples/sat_solver/README.md`.
