// Manhattan Reasoning docs, theme behaviour.
(function () {
  "use strict";

  // 1. Header: collapse the wordmark once scrolled (mirrors the main site).
  var header = document.getElementById("site-header");
  if (header) {
    var onScroll = function () {
      header.classList.toggle("scrolled", window.scrollY > 8);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  // 2. Mobile drawer: toggle the left sidebar; close on link tap or outside tap.
  var drawerBtn = document.querySelector("[data-drawer-toggle]");
  function closeDrawer() { document.body.classList.remove("drawer-open"); }
  if (drawerBtn) {
    drawerBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      document.body.classList.toggle("drawer-open");
    });
    document.querySelectorAll(".doc-sidebar .nav-link").forEach(function (a) {
      a.addEventListener("click", closeDrawer);
    });
    document.addEventListener("click", function (e) {
      if (!document.body.classList.contains("drawer-open")) return;
      var sb = document.querySelector(".doc-sidebar");
      if (sb && !sb.contains(e.target)) closeDrawer();
    });
  }

  // 3. Search overlay open/close.
  var overlay = document.getElementById("search-overlay");
  var input = document.getElementById("mkdocs-search-query");
  function openSearch() {
    if (!overlay) return;
    overlay.hidden = false;
    document.body.classList.add("search-active");
    if (input) { input.focus(); input.select(); }
  }
  function closeSearch() {
    if (!overlay) return;
    overlay.hidden = true;
    document.body.classList.remove("search-active");
  }
  document.querySelectorAll("[data-search-open]").forEach(function (b) {
    b.addEventListener("click", openSearch);
  });
  document.querySelectorAll("[data-search-close]").forEach(function (b) {
    b.addEventListener("click", closeSearch);
  });
  if (overlay) {
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) closeSearch();
    });
  }
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeSearch();
    if ((e.key === "/" || (e.key === "k" && (e.metaKey || e.ctrlKey)))
        && document.activeElement !== input) {
      e.preventDefault();
      openSearch();
    }
  });

  // 4. Copy buttons on code blocks (pymdownx.highlight output).
  document.querySelectorAll("div.highlight > pre").forEach(function (pre) {
    var wrap = pre.parentElement;
    if (wrap.querySelector(".copy-btn")) return;
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "copy-btn";
    btn.textContent = "Copy";
    btn.addEventListener("click", function () {
      var code = pre.querySelector("code") || pre;
      navigator.clipboard.writeText(code.innerText).then(function () {
        btn.textContent = "Copied";
        btn.classList.add("copied");
        setTimeout(function () {
          btn.textContent = "Copy";
          btn.classList.remove("copied");
        }, 1600);
      });
    });
    wrap.appendChild(btn);
  });

  // 5. Scrollspy: highlight the current section in the right-hand "On this page"
  //    TOC as you scroll, mirroring the left sidebar's active indicator.
  var tocLinks = Array.prototype.slice.call(
    document.querySelectorAll(".doc-toc .toc-link"));
  if (tocLinks.length) {
    var byId = {};
    var headings = [];
    tocLinks.forEach(function (a) {
      var id = decodeURIComponent((a.getAttribute("href") || "").replace(/^#/, ""));
      var el = id && document.getElementById(id);
      if (el) { byId[id] = a; headings.push(el); }
    });
    var currentActive = null;
    function setActive(a) {
      if (a === currentActive) return;
      if (currentActive) currentActive.classList.remove("active");
      if (a) a.classList.add("active");
      currentActive = a;
    }
    var offset = 96; // clears the sticky header
    var ticking = false;
    function spy() {
      ticking = false;
      var active = headings[0];
      for (var i = 0; i < headings.length; i++) {
        if (headings[i].getBoundingClientRect().top <= offset) active = headings[i];
        else break;
      }
      // near the bottom, force the last heading (short trailing sections)
      if (window.innerHeight + Math.ceil(window.scrollY) >=
          document.documentElement.scrollHeight - 2) {
        active = headings[headings.length - 1];
      }
      setActive(active ? byId[active.id] : null);
    }
    function requestSpy() {
      if (!ticking) { ticking = true; requestAnimationFrame(spy); }
    }
    window.addEventListener("scroll", requestSpy, { passive: true });
    window.addEventListener("resize", requestSpy, { passive: true });
    spy();
  }
})();
