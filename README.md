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
commit `docs/` whenever the site changes — `.github/workflows/ci.yml` fails the
build if `docs/` is behind `src/`, so a forgotten rebuild can't ship silently.

`.github/workflows/pages.yml` is the alternative: build and publish from `src/`
on every push, so `docs/` no longer has to be committed at all. It's inert until
you switch **Settings → Pages → Source** to "GitHub Actions" and uncomment its
`push:` trigger — the file's header comment has the full order of operations.

## Checks

`.github/workflows/ci.yml` runs on every push and pull request: it builds the
site (which exercises the prerender) and then fails if the committed `docs/`
assets differ from that fresh build.

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

## The scene

`src/hooks.js` picks a capability tier (`full` / `lite` / `flat`) from WebGL2
support, core count and device memory; `flat` swaps the canvas for the static 2D
backdrop in `src/ui/Fallback.jsx`, which is also what the topbar's ambient-motion
toggle serves. `?tier=flat|lite|full` overrides it for testing, and
`?inspect=<0-4>` opens a single machine on a lit turntable.

Which of the two camera paths in `src/data.js` the scene flies is an **aspect
ratio** question, not a viewport-width one: three's `fov` is vertical, so only
the aspect decides how much of the corridor fits sideways. The landscape
keyframes hold every machine fully in frame down to 1/1 and crop hard below it;
the portrait path frames all five at any aspect. `App.jsx` switches on
`(max-aspect-ratio: 1/1)`.
