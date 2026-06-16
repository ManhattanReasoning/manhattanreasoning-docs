---
hide:
  - navigation
  - toc
---

<div class="mr-hero">
  <div class="mr-grid-bg"></div>
  <span class="mr-eyebrow"><span class="dot"></span> Early prototype · v0.1</span>
  <h1 class="mr-head">Cloud FPGA infrastructure<br><em>for hardware-reasoning agents</em></h1>
  <p class="mr-lede">Submit HDL designs, build and program them onto a pool of remote FPGAs, and run verifiable transactions — all through one REST API.</p>
  <div class="mr-cta">
    <a class="mr-btn mr-btn-primary" href="guides/quickstart/">Quickstart →</a>
    <a class="mr-btn mr-btn-ghost" href="api/rest/">REST API reference</a>
  </div>
</div>

Open-source FPGA toolchains in the cloud — fast, verifiable reward loops for
reinforcement learning on hardware reasoning. These docs cover the **Cloud FPGA
Orchestrator**: the service that accepts HDL designs, builds and programs them
onto a pool of remote FPGAs, and runs transactions against them.

!!! warning "Early prototype"
    The full infrastructure is still under active development. The orchestrator
    REST API documented here is implemented; the build/host/firmware layers it
    drives are landing incrementally. Endpoints and payloads may change.

## Start here

<div class="grid cards" markdown>

-   :material-rocket-launch: **[Quickstart](guides/quickstart.md)**

    Submit your first design and run a transaction against an FPGA.

-   :material-sitemap: **[Architecture](concepts/architecture.md)**

    How sessions, jobs, and the FPGA state machine fit together.

-   :material-api: **[REST API](api/rest.md)**

    Every endpoint, request, and response — the contract you build against.

-   :material-language-python: **[Python package](reference/orchestrator.md)**

    API reference generated from the `cloud_fpga_orchestrator` source.

</div>

## What is this?

The orchestrator exposes a pool of 10 FPGA nodes (`fpga_id` `0`–`9`). A typical
flow is:

1. **Submit** an HDL source file to an idle FPGA — the orchestrator enqueues a
   build-and-program job.
2. **Poll** the job until the FPGA reaches the `reserved` state.
3. **Run** Wishbone read/write transactions against the programmed design.
4. **Release** the FPGA back to idle when you're done.

See the [Quickstart](guides/quickstart.md) to walk through it end to end.
