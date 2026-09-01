# Aleksa Milic — Data Engineering Portfolio

Personal portfolio for Aleksa Milic, Data Engineer. A single-page site with an
ambient 3D "data factory" scene (React + Vite + react-three-fiber) sitting behind
the content.

## Run locally

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

Vite builds into `docs/`, then `scripts/prerender.mjs` loads the built site in
headless Chrome and writes the settled HUD markup back over `docs/index.html` so
crawlers and slow connections get the text without running the 3D. React re-mounts
over it on load. The prerender is best-effort: if `puppeteer` isn't installed (or
it fails) the build still completes with the plain SPA shell — watch the build
output for a `[prerender] FAILED` line.

GitHub Pages publishes the site from `docs/` on the `master` branch, served at
[aleksa-milic.com](https://aleksa-milic.com) (see `public/CNAME`). Rebuild and
commit `docs/` whenever the site changes.

## Content

All copy and the scene layout live in `src/data.js`, and every section is filled
in. Two of the three projects carry a live panel instead of a screenshot:
`PROJECTS[0]` embeds `public/nis-urban-development-radar.html`, which is
same-origin and posts its height back so the iframe never scrolls internally;
`PROJECTS[2]` frames the project's own published dbt docs, deep-linked straight
onto the lineage graph. Cross-origin embeds are marked `external` — they get a
fixed height, a click-to-activate shield so the page can still be scrolled past
them, and a hand-off link instead of the frame below 1100px.

The CV linked from the contact section is `public/Aleksa_Milic_CV.pdf`. Vite
copies `public/` into `docs/` verbatim, so replacing that file and rebuilding is
all it takes to publish a new one.
