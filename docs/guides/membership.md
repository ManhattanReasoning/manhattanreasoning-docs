---
description: What a Manhattan Reasoning membership includes, how to subscribe and check usage from the mrg CLI, and what to do when a build is refused.
---

# Membership and usage

Cloud builds are metered against a monthly quota, and a membership is what
pays for them. You subscribe, manage your card, and check your usage from the
`mrg` CLI.

!!! info "Not required during the beta"
    While the platform is in private beta you can build without a membership.
    We'll announce the date before one becomes required.

## What a membership includes

| | |
| --- | --- |
| **Price** | $25 per month |
| **Build time** | 1,000 build-minutes per calendar month (UTC) |
| **Concurrency** | One build in flight at a time |

- **Build-minutes** are the time your build spends running on the build
  servers, counted in whole minutes. Waiting for a board and flashing it
  don't count.
- **Failed and cancelled builds count too.** The build server runs until the
  build stops, whatever the outcome.
- **The counter resets** at the start of each month, UTC. Unused minutes don't
  carry over.
- **Only new builds are limited.** Reading and writing a board you already
  hold, `mrg run --no-program`, `mrg status`, `mrg jobs` and `mrg logs` keep
  working whatever your membership or quota.
- **Local builds are free.** `mrg synth` and `mrg pnr` run on your own machine
  and are never metered.

## Check your usage

```bash
mrg usage [--json]
```

```text
$ mrg usage

  month:       2026-11 (UTC)
  used:        42 of 1000 build-minutes
  remaining:   958

  JOB_ID      MINUTES  ENDED
  0b6f3c1e…         7  2026-11-16T10:07:00Z
```

The table lists your recent metered builds, newest first. `--json` prints the
raw response (`month`, `build_minutes_used`, `build_minutes_limit`,
`build_minutes_remaining`, `builds`); parse that rather than the table.

## Subscribe

```bash
mrg subscribe [--no-open]
```

```text
$ mrg subscribe

  Start your membership at:
  https://checkout.stripe.com/g/pay/…

  Builds unlock once Stripe confirms the payment (usually seconds).
  Already a member? Use 'mrg billing' instead.
```

`subscribe` prints a link to a checkout page hosted by Stripe and, in an
interactive terminal, opens it in your browser. Pay there, and your membership
is active as soon as Stripe confirms the payment. There's nothing to paste
back into the CLI.

Pass `--no-open` to print the link without opening a browser, for example
over SSH. The link is tied to your account, so open it yourself rather than
sharing it.

Payment happens entirely on Stripe's pages. Your card details never pass
through `mrg` or our servers.

## Manage or cancel

```bash
mrg billing [--no-open]
```

```text
$ mrg billing

  Manage your membership at:
  https://billing.stripe.com/p/session…
```

`billing` opens Stripe's customer portal, where you can update your card,
download invoices, and cancel. If you cancel, your membership stays active
until the end of the period you've already paid for.

## When a build is refused

If a build can't start for a membership or quota reason, `mrg run` exits with
the reason and the command that resolves it:

```text
$ mrg run examples/app.py
error: An active membership is required to submit builds. Subscribe via POST /billing/checkout, then retry.
  run 'mrg subscribe' to start a membership
```

The first line is the server's message; the second is what to run. Nothing is
built and no minutes are used.

| Reason | What it means | What to do |
| --- | --- | --- |
| `subscription_required` | You don't have a membership. | `mrg subscribe` |
| `billing_blocked` | Your membership lapsed: a payment failed, or it was cancelled and the paid period ended. | `mrg billing` to fix your card, or `mrg subscribe` to start again after a cancellation |
| `quota_exhausted` | You've used this month's build-minutes. | `mrg usage` to see the total. The counter resets at the start of next month (UTC). Local `mrg synth` / `mrg pnr` still work. |
| `build_in_flight` | You already have a build running. | `mrg jobs --status running` to find it; wait for it, or `mrg cancel <job_id>` |

When you program a board from Python instead of `mrg run`, the same refusal
is raised as an exception carrying the same two-line message.

### Other messages from `mrg subscribe` and `mrg billing`

**You're already a member.** Use `mrg billing` to manage the membership you
have.

```text
$ mrg subscribe
error: This account already has an active membership. Manage it via POST /billing/portal.
  run 'mrg billing' to manage it
```

**Your login predates billing.** Run `mrg login` once more, then retry.

```text
$ mrg subscribe
error: No Stripe customer exists for this account yet; log in again (mrg login) to create one, then retry.
  run 'mrg login' again, then retry
```

**Billing is temporarily unavailable.** Nothing was charged. Try again in a
few minutes.

```text
$ mrg subscribe
error: Could not reach the billing provider; try again.
```

## Requirements

`mrg usage`, `mrg subscribe` and `mrg billing` need an SDK release that
includes them. If `mrg subscribe` reports `invalid choice`, upgrade:

```bash
pip install -U manhattan-reasoning-gym
```

On an older release, a refused build shows up as a
`402 Client Error: Payment Required` traceback instead of the messages above.

## See also

- [The CLI](cli.md), every `mrg` command.
- [Quickstart](quickstart.md), from install to a running design.
