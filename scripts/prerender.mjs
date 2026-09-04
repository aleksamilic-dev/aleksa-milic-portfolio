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
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const PORT = 4179;
const ROUTES = [{ path: '/', out: 'docs/index.html' }];

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
      // Strip the live 3D so the static file is just the readable HUD.
      document.querySelector('.app')?.setAttribute('data-tier', 'full');
      document.querySelector('.canvas-wrap')?.replaceChildren();
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

    await writeFile(resolve(out), html, 'utf8');
    console.log(`[prerender] ${path} -> ${out}  (${(html.length / 1024).toFixed(1)} kB)`);
    await page.close();
  }
} catch (err) {
  console.error('[prerender] FAILED — docs/ keeps the un-prerendered SPA build.');
  console.error(`[prerender] ${err.message}`);
} finally {
  await browser?.close();
  await server.httpServer.close();
}
