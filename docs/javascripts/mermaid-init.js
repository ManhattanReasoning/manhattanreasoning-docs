// Mermaid rendering for diagram code fences (see mkdocs.yml's superfences
// "mermaid" custom fence). The custom theme has no light/dark toggle (fixed
// dark, data-md-color-scheme="slate" in main.html), so themeVariables below
// are a one-shot match to theme/css/docs.css's palette rather than a
// light/dark pair.
import mermaid from "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs";

mermaid.initialize({
  startOnLoad: false,
  theme: "base",
  fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
  themeVariables: {
    background: "#0e1218",
    primaryColor: "#10151d",
    primaryTextColor: "#d7dee9",
    primaryBorderColor: "#1c2330",
    secondaryColor: "#0e1218",
    secondaryBorderColor: "#1c2330",
    tertiaryColor: "#0e1218",
    tertiaryBorderColor: "#1c2330",
    lineColor: "#5fb0ff",
    textColor: "#d7dee9",
    mainBkg: "#10151d",
    nodeTextColor: "#d7dee9",
    clusterBkg: "#05070d",
    clusterBorder: "#1c2330",
    titleColor: "#f2f5fa",
    edgeLabelBackground: "#0e1218",
    fontSize: "14px",
  },
  flowchart: { curve: "basis", htmlLabels: true, padding: 14 },
  securityLevel: "loose",
});

// pymdownx.superfences emits <pre class="mermaid"><code>...</code></pre>;
// mermaid's run() reads the element's raw innerHTML and chokes on that
// nested <code> tag ("No diagram type detected... text: <code>...").
// Flatten each block to a plain text node (still the exact decoded diagram
// source) before handing it to mermaid.
for (const el of document.querySelectorAll("pre.mermaid")) {
  el.textContent = el.textContent;
}

mermaid.run({ querySelector: "pre.mermaid" });
