/* Living wire-routing field — vendored from manhattanreasoning-web.
 *
 * Same animation as the main site's hero: /assets/data/routing.json is the
 * real routed cloud_fpga_soc (ECP5-85F), treated as a graph that "signals"
 * propagate along (BFS frontiers that light wires and fade). Vendored here
 * (not fetched cross-origin) so this site's ambient corner animation and
 * standalone intro work with no dependency on manhattanreasoning.com being
 * reachable.
 *
 * The only change from the main site's copy: the fetch path is root-absolute
 * (docs pages live at arbitrary URL depths — /guides/quickstart/ etc. — so a
 * plain relative "data/routing.json" would resolve differently per page).
 */
(function () {
  const canvases = Array.from(document.querySelectorAll("[data-routing-field]"));
  if (!canvases.length) return;

  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches ||
    new URLSearchParams(location.search).has("nofx");

  fetch("/assets/data/routing.json")
    .then((r) => r.json())
    .then((data) => canvases.forEach((canvas) => initField(canvas, data)))
    .catch(() => { canvases.forEach((canvas) => { canvas.style.display = "none"; }); });

  function initField(canvas, data) {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const fabric = document.createElement("canvas");   // static substrate, drawn once
    const fctx = fabric.getContext("2d");
    const glow = document.createElement("canvas");     // current, pre-bloom
    const gctx = glow.getContext("2d");
    if (!fctx || !gctx) return;

    const isHero = canvas.classList.contains("hero-routing-canvas");

    // palette on dark background (this site is dark-only)
    const FABRIC = "rgba(90, 130, 190, 0.09)";   // faint traces on dark
    const LIFE = 1600;                           // ms a lit wire glows then cools away

    // thermal ramp: temperature 1 (just routed, hot) -> 0 (cooled, brand blue).
    const HEAT = [
      [1.00, [255, 156, 46]],   // warm amber  (leading wavefront)
      [0.72, [247, 74, 58]],    // red
      [0.46, [214, 56, 138]],   // magenta
      [0.22, [104, 82, 214]],   // indigo
      [0.00, [10, 110, 245]],   // cold — brand blue trail
    ];
    function heat(t) {
      for (let i = 0; i < HEAT.length - 1; i++) {
        const a = HEAT[i], b = HEAT[i + 1];
        if (t <= a[0] && t >= b[0]) {
          const f = (t - b[0]) / (a[0] - b[0]);
          return [
            a[1][0] * f + b[1][0] * (1 - f),
            a[1][1] * f + b[1][1] * (1 - f),
            a[1][2] * f + b[1][2] * (1 - f),
          ];
        }
      }
      return HEAT[HEAT.length - 1][1];
    }

    let bounds = { rmin: 0, rmax: 1, cmin: 0, cmax: 1 };
    let geom = { pad: 0, cell: 4, dpr: 1 };
    let segsPx = [];                 // segIdx -> [x1,y1,x2,y2, span]
    let segNodes = [];               // segIdx -> [nodeA, nodeB]
    let adj = [];                    // nodeId -> [segIdx,...]
    let nodeKey = new Map();         // "c,r" -> nodeId  (for hover injection)

    const active = new Map();        // segIdx -> activation timestamp
    let fronts = [];                 // propagating BFS frontiers
    let lastSeed = 0, lastStep = 0;

    computeBounds();
    buildGraph();
    resize();
    if (reduce) { staticFill(); return; }

    // warm start so the field isn't empty on first paint
    for (let i = 0; i < (isHero ? 8 : 4); i++) seedSignal();
    requestAnimationFrame(loop);

    function computeBounds() {
      const rs = [], cs = [];
      for (const s of data.segs) { rs.push(s[1]); cs.push(s[0]); }
      rs.sort((a, b) => a - b); cs.sort((a, b) => a - b);
      const q = (a, p) => a[Math.floor(p * (a.length - 1))];
      bounds = {
        rmin: q(rs, 0.004) - 2, rmax: q(rs, 0.996) + 2,
        cmin: q(cs, 0.004) - 2, cmax: q(cs, 0.996) + 2,
      };
    }

    function buildGraph() {
      nodeKey = new Map();
      adj = [];
      segNodes = new Array(data.segs.length);
      const id = (c, r) => {
        const k = c + "," + r;
        let v = nodeKey.get(k);
        if (v === undefined) { v = adj.length; nodeKey.set(k, v); adj.push([]); }
        return v;
      };
      for (let i = 0; i < data.segs.length; i++) {
        const s = data.segs[i];
        const a = id(s[0], s[1]);
        const b = id(s[0] + s[2], s[1] + s[3]);
        segNodes[i] = [a, b];
        adj[a].push(i); adj[b].push(i);
      }
    }

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const cssW = canvas.clientWidth || 1;
      const cssH = canvas.clientHeight || 1;
      canvas.width = fabric.width = glow.width = Math.round(cssW * dpr);
      canvas.height = fabric.height = glow.height = Math.round(cssH * dpr);

      // fit the routed region into the canvas (contain), rotated so rows->x
      const nx = bounds.rmax - bounds.rmin + 1;
      const ny = bounds.cmax - bounds.cmin + 1;
      const cell = Math.max((cssW * dpr) / nx, (cssH * dpr) / ny) * 1.04; // cover
      const offX = (cssW * dpr - nx * cell) / 2 - bounds.rmin * cell;
      const offY = (cssH * dpr - ny * cell) / 2 - bounds.cmin * cell;
      geom = { cell, offX, offY, dpr };

      const X = (r) => offX + r * cell;
      const Y = (c) => offY + c * cell;
      segsPx = data.segs.map((s) => [X(s[1]), Y(s[0]), X(s[1] + s[3]), Y(s[0] + s[2]), s[4]]);

      renderFabric();
      if (reduce) staticFill();
    }

    function renderFabric() {
      fctx.clearRect(0, 0, fabric.width, fabric.height);
      fctx.lineCap = "round";
      fctx.strokeStyle = FABRIC;
      fctx.lineWidth = 1 * geom.dpr;
      fctx.beginPath();
      for (const s of segsPx) { fctx.moveTo(s[0], s[1]); fctx.lineTo(s[2], s[3]); }
      fctx.stroke();
    }

    /* ---- propagation ---- */
    function seedSignal(nodeHint) {
      let n = nodeHint;
      if (n == null) n = (Math.random() * adj.length) | 0;
      if (!adj[n] || !adj[n].length) return;
      fronts.push({
        frontier: [n],
        visited: new Set([n]),
        hops: 0,
        maxHops: 55 + (Math.random() * 70 | 0),
      });
    }

    function stepFronts(now) {
      for (const f of fronts) {
        let next = [];
        for (const node of f.frontier) {
          for (const si of adj[node]) {
            if (!active.has(si)) active.set(si, now);
            const [a, b] = segNodes[si];
            const other = a === node ? b : a;
            if (!f.visited.has(other)) { f.visited.add(other); next.push(other); }
          }
        }
        // keep tendrils thin & wandering rather than flooding the die
        if (next.length > 20) {
          for (let i = next.length - 1; i > 0; i--) {
            const j = (Math.random() * (i + 1)) | 0;
            [next[i], next[j]] = [next[j], next[i]];
          }
          next = next.slice(0, 20);
        }
        f.frontier = next; f.hops++;
      }
      fronts = fronts.filter((f) => f.frontier.length && f.hops < f.maxHops);
    }

    function loop(now) {
      if (now - lastStep > 55) { stepFronts(now); lastStep = now; }
      if (now - lastSeed > (isHero ? 520 : 700) && active.size < (isHero ? 1100 : 800)) {
        seedSignal();
        lastSeed = now;
      }

      // 1. paint current onto the glow layer — thin, CONSTANT width, intensity
      //    carried by opacity + colour temperature (never by line thickness)
      gctx.clearRect(0, 0, glow.width, glow.height);
      gctx.lineCap = "round";
      for (const [si, t0] of active) {
        const age = now - t0;
        if (age >= LIFE) { active.delete(si); continue; }
        const s = segsPx[si];
        const life = 1 - age / LIFE;
        const [cr, cg, cb] = heat(life);
        gctx.globalAlpha = 0.28 + 0.72 * life;
        gctx.strokeStyle = `rgb(${cr | 0},${cg | 0},${cb | 0})`;
        gctx.lineWidth = (s[4] >= 6 ? 1.5 : 1.1) * geom.dpr;
        gctx.beginPath(); gctx.moveTo(s[0], s[1]); gctx.lineTo(s[2], s[3]); gctx.stroke();
      }
      gctx.globalAlpha = 1;

      // 2. compose: fabric, then a soft blurred bloom of the current, then the
      //    crisp cores on top — a real halo instead of a fat semi-opaque line
      composite();
      requestAnimationFrame(loop);
    }

    function composite() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(fabric, 0, 0);
      ctx.save();
      ctx.globalAlpha = 0.55;
      ctx.filter = `blur(${3.2 * geom.dpr}px)`;
      ctx.drawImage(glow, 0, 0);           // wide soft bloom
      ctx.globalAlpha = 0.9;
      ctx.filter = `blur(${1.2 * geom.dpr}px)`;
      ctx.drawImage(glow, 0, 0);           // tight inner glow
      ctx.restore();
      ctx.drawImage(glow, 0, 0);           // crisp cores
    }

    /* reduced-motion / screenshot: a static snapshot, same bloom pipeline */
    function staticFill() {
      gctx.clearRect(0, 0, glow.width, glow.height);
      gctx.lineCap = "round";
      let rng = 7;
      const rand = () => (rng = (rng * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
      for (let i = 0; i < segsPx.length; i++) {
        if (rand() > 0.18) continue;
        const s = segsPx[i];
        const t = rand();                    // random temperature -> heatmap snapshot
        const [cr, cg, cb] = heat(t);
        gctx.globalAlpha = 0.28 + 0.72 * t;
        gctx.strokeStyle = `rgb(${cr | 0},${cg | 0},${cb | 0})`;
        gctx.lineWidth = (s[4] >= 6 ? 1.5 : 1.1) * geom.dpr;
        gctx.beginPath(); gctx.moveTo(s[0], s[1]); gctx.lineTo(s[2], s[3]); gctx.stroke();
      }
      gctx.globalAlpha = 1;
      composite();
    }

    /* ---- hover: inject current at the cursor (hero only) ---- */
    if (isHero) {
      let hoverT = 0;
      canvas.addEventListener("pointermove", (e) => {
        if (reduce) return;
        const now = performance.now();
        if (now - hoverT < 45) return;
        hoverT = now;
        const rect = canvas.getBoundingClientRect();
        const px = (e.clientX - rect.left) * (canvas.width / rect.width);
        const py = (e.clientY - rect.top) * (canvas.height / rect.height);
        const r = Math.round((px - geom.offX) / geom.cell);
        const c = Math.round((py - geom.offY) / geom.cell);
        for (let dr = 0; dr <= 3; dr++) {           // nearest existing node
          let hit = null;
          for (let a = -dr; a <= dr && !hit; a++) {
            for (let b = -dr; b <= dr; b++) {
              const id = nodeKey.get((c + b) + "," + (r + a));
              if (id !== undefined) { hit = id; break; }
            }
          }
          if (hit != null) { seedSignal(hit); break; }
        }
      });
    }

    let rto = null;
    window.addEventListener("resize", () => { clearTimeout(rto); rto = setTimeout(resize, 120); });
  }
})();
