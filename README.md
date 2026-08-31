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

All copy and the scene layout live in `src/data.js`. Hero, about, experience,
skills, education, and certifications are filled in from the CV. The `PROJECTS`
array is still scaffolding — entries marked `TODO —` need a real project written
up (and a dashboard screenshot dropped in `src/assets/`).
