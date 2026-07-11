# Hello Wishbone

The minimal smoke test, the "hello world" of the platform. The design
exposes a 512-word (2 KB) **echo RAM** over Wishbone; the app writes a
pattern and reads it back, confirming the full path (build → program →
write → read) works end to end. If this design works on a board, your bus
wiring, firmware bridge, and client plumbing are all correct.

Source: [`examples/hello_wishbone/`](https://github.com/ManhattanReasoning/manhattan-reasoning-gym/tree/main/examples/hello_wishbone) in the `manhattan-reasoning-gym` repo.

## Run it

```bash
mrg run examples/hello_wishbone/client_sdk.py
```

```text
writing pattern ...
reading back ...
  [0] 0xdeadbeef → OK
  [1] 0xcafebabe → OK
  [2] 0x12345678 → OK
  [3] 0xabcdef01 → OK
```

## The whole app

It's about as small as an `mrg.cloud.App` gets:

```python
import manhattan_reasoning_gym as mrg

class Regs(mrg.cloud.RegisterMap):
    # The EchoSlave exposes a 512-word (2 KB) echo RAM starting at byte 0.
    ECHO = 0x0000

app = mrg.cloud.App(
    "hello_wishbone",
    design="examples/hello_wishbone/design.py",
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

This is the best starting point for [writing your own app](../guides/sdk.md):
swap in your own design and register map, and replace `main()` with your logic.
