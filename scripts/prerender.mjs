// Post-build prerender. `vite build` leaves docs/index.html as an empty shell
// whose content only exists after React + three.js run — slow for crawlers and
// invisible to anything that doesn't execute JS. This loads the built site in
// headless Chrome, waits for the HUD, then writes the settled DOM back over
// docs/index.html. React re-mounts over it on load (identical markup, so no
// flash); we don't hydrate — the Suspense/lazy 3D boundary can't round-trip
// through a DOM snapshot.
//
// Best-effort: if puppeteer isn't installed or the render fails, the plain SPA
// build is left in place and the build still succeeds.

import { preview } from 'vite';
import { readdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const PORT = 4179;
const ROUTES = [{ path: '/', out: 'docs/index.html' }];

// The fonts the first screen is set in: the hero's name and copy, and the
// mono labels around it (the topbar, the kicker, the buttons, the photo
// card), all regular weight. Without a preload the browser only learns it
// needs a file once the stylesheet has parsed and the text has been laid out,
// so the text paints in the fallback face and swaps. On a slow phone the mono
// labels swapped a second after the page appeared. Built names carry a
// content hash, hence the lookup. A font the build doesn't have just gets no
// preload.
const FIRST_SCREEN_FONTS = [
  /^space-grotesk-latin-wght-normal-.+\.woff2$/,
  /^dm-mono-latin-400-normal-.+\.woff2$/,
];

async function firstScreenFontPreloads() {
  const files = await readdir(resolve('docs/assets')).catch(() => []);
  return FIRST_SCREEN_FONTS.map((pattern) => files.find((f) => pattern.test(f)))
    .filter(Boolean)
    .map((font) => `<link rel="preload" as="font" type="font/woff2" crossorigin href="/assets/${font}">`)
    .join('\n    ');
}

// The 3D's code: three.js, r3f and drei, the glow passes, and the scene's
// own chunks, about 270 kB compressed. The page asks for it once its own
// script has run and React has mounted, which on a slow connection left that
// download to start a second or so after the page itself. This starts it as
// the page arrives, at low priority so the stylesheet, the fonts and the
// page's script go first.
//
// Only where the scene will run, so the devices that get the flat backdrop
// don't download it for nothing: the same checks as useDeviceTier
// (hooks.js), the motion toggle (store.js) and the ?tier and ?inspect test
// switches (App.jsx).
const SCENE_CHUNKS = [/^three-.+\.js$/, /^r3f-.+\.js$/, /^postfx-.+\.js$/, /^Scene-.+\.js$/, /^stations-.+\.js$/];

async function scenePreload() {
  const files = await readdir(resolve('docs/assets')).catch(() => []);
  const chunks = SCENE_CHUNKS.map((pattern) => files.find((f) => pattern.test(f))).filter(Boolean);
  if (chunks.length !== SCENE_CHUNKS.length) return '';
  return `<script>
      (function () {
        try {
          var q = new URLSearchParams(location.search);
          if (q.get('tier') === 'flat' || q.has('inspect') || localStorage.getItem('motion') === 'reduced') return;
        } catch (e) {}
        if (typeof WebGL2RenderingContext === 'undefined') return;
        if ((navigator.hardwareConcurrency || 8) <= 2 || (navigator.deviceMemory || 8) <= 2) return;
        ${JSON.stringify(chunks)}.forEach(function (file) {
          var link = document.createElement('link');
          link.rel = 'modulepreload';
          link.href = '/assets/' + file;
          // as Vite's own module links are, or the import fetches it again
          link.crossOrigin = '';
          link.setAttribute('fetchpriority', 'low');
          document.head.appendChild(link);
        });
      })();
    </script>`;
}

let puppeteer;
try {
  puppeteer = (await import('puppeteer')).default;
} catch {
  console.warn(
    '[prerender] puppeteer not installed — skipping. The SPA build still works; ' +
      'run `npm install` and rebuild for crawlable static HTML.',
  );
  process.exit(0);
}

const server = await preview({ preview: { port: PORT, strictPort: true }, logLevel: 'warn' });
const origin = `http://localhost:${PORT}`;
let browser;

try {
  browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  for (const { path, out } of ROUTES) {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });
    await page.goto(origin + path, { waitUntil: 'networkidle0', timeout: 60_000 });

    // Wait for the real content, not just the shell.
    await page.waitForSelector('.viewport .hero__value', { timeout: 30_000 });
    await page.waitForFunction(
      () =>
        document.querySelectorAll('.experience .xp').length >= 3 &&
        document.querySelectorAll('.certs a').length >= 3 &&
        document.querySelectorAll('.work__list .project').length >= 1,
      { timeout: 30_000 },
    );

    const html = await page.evaluate(() => {
      // Strip the live 3D so the static file is just the readable HUD, along
      // with the mark that fades it in once drawn (FadeIn in scene/Scene.jsx).
      document.querySelector('.app')?.setAttribute('data-tier', 'full');
      document.querySelector('.canvas-wrap')?.replaceChildren();
      document.querySelector('.canvas-wrap')?.removeAttribute('data-shown');
      // Drop the motion attribute: baking this browser's answer in would tell
      // a reduce-motion visitor reading the static HTML (JS off, or before the
      // mount) that motion is fine. Absent, styles.css falls back to the OS
      // media query — see the REDUCED MOTION block there. React sets it again
      // on mount from the visitor's own preference.
      document.querySelector('.app')?.removeAttribute('data-motion');
      // Reveal-on-scroll elements start at opacity:0; show them all so the
      // static page reads fully before JS runs. React manages the class after.
      document
        .querySelectorAll('[data-reveal]')
        .forEach((n) => n.classList.add('in-view'));
      document
        .querySelectorAll('[style]')
        .forEach((n) => n.matches('.rail__fill, .viewport') && n.removeAttribute('style'));
      document.querySelectorAll('.viewport').forEach((v) => (v.scrollTop = 0));
      // A baked iframe starts loading from the static HTML, then React's mount
      // swaps in a fresh one and every visitor pays for each embed twice. That
      // includes the cross-origin dbt docs even on phones, where React renders
      // a hand-off link instead of the frame. React sets its own src, so the
      // static copies don't need one.
      document.querySelectorAll('iframe').forEach((f) => f.removeAttribute('src'));
      // Styles three/drei/postprocessing inject at runtime (prod Vite emits a
      // <link>, so anything here is library-injected and now dead).
      document.querySelectorAll('head > style').forEach((s) => s.remove());
      // Speculative module preloads Chrome adds for the chunks that loaded
      // during prerender — keep the shell's loading behaviour, not this one's.
      document
        .querySelectorAll('head link[rel="modulepreload"][as="script"]')
        .forEach((l) => l.remove());

      return '<!doctype html>\n' + document.documentElement.outerHTML + '\n';
    });

    // Ahead of the stylesheet, so they're all fetched side by side.
    const preload = [await firstScreenFontPreloads(), await scenePreload()].filter(Boolean).join('\n    ');
    const withPreload = preload
      ? html.replace('<link rel="stylesheet"', `${preload}\n    <link rel="stylesheet"`)
      : html;

    await writeFile(resolve(out), withPreload, 'utf8');
    console.log(`[prerender] ${path} -> ${out}  (${(withPreload.length / 1024).toFixed(1)} kB)`);
    await page.close();
  }
} catch (err) {
  console.error('[prerender] FAILED — docs/ keeps the un-prerendered SPA build.');
  console.error(`[prerender] ${err.message}`);
} finally {
  await browser?.close();
  await server.httpServer.close();
}
