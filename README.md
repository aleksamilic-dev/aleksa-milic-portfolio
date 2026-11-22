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
in. The schema.org profile search engines read (`src/ui/StructuredData.jsx`) is
built from the same file, so it can't drift from the page. The `<title>` and meta
description stay in `index.html`.

Each project shows its evidence in its own way:

- `PROJECTS[0].embed` frames `public/nis-urban-development-radar.html`, a live
  page of our own. It is same-origin and posts its height back, so the iframe
  never scrolls internally.
- `PROJECTS[1].bench` is the benchmark's headline graph, drawn inline beside
  the text by `src/ui/BenchFigure.jsx` (below it under 1180px). The seconds in
  `data.js` are computed from the `results/*.csv` committed in the benchmark
  repo, the same way its own report totals them. Recompute them if the
  benchmark is re-run.
- `PROJECTS[2].embed` frames the project's own published dbt docs, deep-linked
  straight onto the lineage graph. Cross-origin embeds are marked `external`:
  they get a fixed height, a click-to-activate shield so the page can still be
  scrolled past them, and a hand-off link instead of the frame below 1100px.

## Fonts

Space Grotesk and DM Mono are served from this origin, not from Google Fonts.
`src/fonts.css` declares them from the Fontsource packages in `package.json`,
and Vite copies the files it references into `docs/assets/`. The prerender adds
a preload for the one the hero is set in. The dashboard embed does the same
with its own two faces, whose files sit in `public/fonts/`.

The CV linked from the contact section is `public/Aleksa_Milic_CV.pdf`. Vite
copies `public/` into `docs/` verbatim, so replacing that file and rebuilding is
all it takes to publish a new one.

## Analytics

[GoatCounter](https://aleksa-milic.goatcounter.com) counts page views. It
sets no cookies, so the site needs no consent banner. The tag lives in
`index.html`. Clicks a page view can't see (the CV download, email, GitHub and
LinkedIn, each project's repo, report or docs link, and each certificate) go
through `track()` in `src/ui/HUD.jsx` and show up as events.
count.js ignores localhost, so local dev and the prerender never count. To stop
counting your own visits, open `https://aleksa-milic.com/#toggle-goatcounter`
once in each browser you use.

## The scene

`src/hooks.js` picks a capability tier (`full` / `lite` / `flat`) from WebGL2
support, core count and device memory; `flat` swaps the canvas for the static 2D
backdrop in `src/ui/Fallback.jsx`, which is also what the topbar's ambient-motion
toggle serves. `?tier=flat|lite|full` overrides it for testing,
`?inspect=<0-4>` opens a single machine on a lit turntable, and `?worker=0`
draws the scene on the page's main thread instead of in its worker.

Which of the two camera paths in `src/data.js` the scene flies is an **aspect
ratio** question, not a viewport-width one: three's `fov` is vertical, so only
the aspect decides how much of the corridor fits sideways. The landscape
keyframes hold every machine fully in frame down to 1/1 and crop hard below it;
the portrait path frames all five at any aspect. `App.jsx` switches on
`(max-aspect-ratio: 1/1)`.

Between keyframes the camera follows a curve through the via points in
`CAMERA_VIAS` / `CAMERA_VIAS_PORTRAIT`, which take it round the machines rather
than through them. If you move a keyframe or a machine, check that route again.

### Keeping it fast

- **The scene draws in a worker.** The page hands its canvas to a worker of
  its own (`src/scene/WorkerScene.jsx` on the page, `worker.js` and
  `workerRoot.jsx` in the worker), so three.js never runs on the page's main
  thread. Scrolling, the scroll handler and the page's layout don't wait on the
  scene, and on a phone the two run side by side on separate cores. The worker
  is a build of its own (the `w-` files, see `vite.config.js`) with its own
  copy of three.js, which the page then never loads. Anything the scene needs
  from the page (the scroll, the pointer, input, the tab's visibility, the
  marks it puts on `.canvas-wrap`) goes through `src/scene/page.js`, so the
  same scene code runs in either place. Where a worker can't draw WebGL
  (Safari before 17), the page draws the scene itself, from the main-thread
  copy. `?worker=0` forces that, for comparing the two.
- **Static batching.** `StaticBatch` (`src/scene/batch.jsx`) merges every part
  of a machine, and of the corridor, that never moves into one mesh per
  material, once at load. That took the scene from 200–260 draw calls a frame
  to 80–100, which is most of what a phone's CPU was spending. A part that an
  animation drives must carry `userData={LIVE}`, or it gets merged and frozen
  in place. Every element in `stations.jsx` that holds a ref for an animation
  has it. Add it to any new one.
- **No re-renders while scrolling.** The machines are built once
  (`MACHINE_ELEMENTS`), and only the 2D backdrop reads the current section.
  Either one re-rendering in step with the scroll used to cost a long frame on
  phones.
- **60fps cap, evenly paced.** `FrameDriver` in `Scene.jsx` asks for at most
  60 frames a second, so 90 and 120Hz phones don't draw the backdrop twice as
  often for no visible gain. The cap is counted in whole screen refreshes
  (`src/scene/pacing.js`), so frames stay evenly spaced on any screen: 45 a
  second on a 90Hz phone, where a plain 60 cap judders. It also pauses
  everything while the tab is hidden.
- **Nothing full-screen over the canvas.** The canvas changes every frame, so
  the browser blends every page layer above it again every frame, at the
  screen's full resolution. The scrims are painted by the scene itself in its
  last glow pass (`Scrim` in `Scene.jsx`). The page's own copy
  (`.canvas-wrap::after`) only shows before the first frame, behind the flat
  backdrop, and if the glow passes go. A full-screen overlay, blend mode or
  backdrop filter added over the scene costs every phone on every frame.
- **One shader at a time.** Opaque surfaces are drawn grouped by shader
  (`DrawOrder` in `Scene.jsx`), and hidden machines are skipped when three
  places the scene each frame (`skipWhileHidden` in `stations.jsx`).
- **Degrading gracefully.** If a device can't keep up, `PerformanceMonitor`
  lowers the render resolution in steps down to 0.7, and only drops the glow
  passes after that.

The belt and every machine animate on one shared clock, `src/scene/flow.jsx`,
rather than the render clock. Scrolling speeds it up, so the whole line works
harder while the visitor scrolls and eases back when they stop. Packets ride
the belt in batches: raw amber shards go into the processing drum and come out
as blue blocks, which turn green once they pass the control room.
