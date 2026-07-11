---
hide:
  - navigation
  - toc
description: >-
  manhattan-reasoning-gym: a Python SDK and CLI for hardware design. Iterate
  locally, sandbox untrusted agents, and program real cloud FPGAs.
---

<section class="hero">
  <canvas id="routing-canvas" class="hero-routing-canvas" data-routing-field aria-hidden="true"></canvas>
  <div class="hero-inner">
    <div class="hero-copy">
      <h1>Program real FPGAs<br>from Python.</h1>
      <p class="bio">
        <code>manhattan-reasoning-gym</code> is a Python SDK and CLI for hardware
        design. Iterate locally with fast synthesis and place-and-route feedback,
        run untrusted agents in a locked sandbox, and program real cloud FPGAs,
        all from one package.
      </p>
      <div class="hero-ctas">
        <a class="btn btn-outline" href="guides/quickstart/">Get started</a>
        <a class="read-more" href="reference/">API reference &rarr;</a>
      </div>
    </div>
  </div>
</section>

<section class="home-section">
  <p class="kicker">Three ways to use it</p>
  <div class="feature-grid">
    <a class="feature-card" href="guides/sdk/#mrgcloud-real-hardware">
      <span class="feature-card__icon"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17.5 19a4.5 4.5 0 0 0 .5-8.97A6 6 0 0 0 6.34 9.5 4 4 0 0 0 7 17.5"/><path d="M8 21h9"/><path d="M12 17v4"/></svg></span>
      <span class="feature-card__title">Cloud</span>
      <span class="feature-card__body">Program a real Lattice ECP5 over the network with <code>mrg.cloud.App</code>. Build, program, and drive live hardware in a few lines.</span>
    </a>
    <a class="feature-card" href="guides/sdk/#mrgsandbox-locked-agent-execution">
      <span class="feature-card__icon"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2 4 5v6c0 5 3.4 8.3 8 11 4.6-2.7 8-6 8-11V5z"/><path d="M9 12l2 2 4-4"/></svg></span>
      <span class="feature-card__title">Sandbox</span>
      <span class="feature-card__body">Run an untrusted agent in a locked container with <code>mrg.Sandbox</code>. It vets its own design, then promotes a candidate to silicon through a broker it never touches.</span>
    </a>
    <a class="feature-card" href="guides/sdk/#mrgbuild-local-synth-pnr">
      <span class="feature-card__icon"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="7" y="7" width="10" height="10" rx="1.5"/><path d="M10 2v3M14 2v3M10 19v3M14 19v3M2 10h3M2 14h3M19 10h3M19 14h3"/></svg></span>
      <span class="feature-card__title">Local build</span>
      <span class="feature-card__body">Get synthesis and place-and-route reports (utilization, Fmax, timing closure) with <code>mrg.build</code>. No board, no sandbox, just Docker.</span>
    </a>
  </div>
</section>

<section class="home-section">
  <p class="kicker">Explore the docs</p>
  <div class="tile-grid">
    <a class="tile" href="guides/quickstart/">
      <span class="tile__label">Guide</span>
      <span class="tile__desc">Install, log in, and program a board, then the full SDK and CLI across all three usage modes.</span>
      <span class="tile__links">Quickstart · SDK usage · CLI usage</span>
    </a>
    <a class="tile" href="examples/">
      <span class="tile__label">Examples</span>
      <span class="tile__desc">Complete, runnable designs, from a minimal smoke test to a real INT8 transformer accelerator on silicon.</span>
      <span class="tile__links">Hello Wishbone · SAT solver · BERT FFN · FFN accelerator</span>
    </a>
    <a class="tile" href="reference/">
      <span class="tile__label">Reference</span>
      <span class="tile__desc">The full public API. Every class, function, and signature, generated from the SDK's docstrings.</span>
      <span class="tile__links">mrg.cloud · mrg.build · mrg.sandbox · mrg.bench</span>
    </a>
  </div>
</section>
