// The scene's worker, started by WorkerScene.jsx with the canvas the page
// handed over. It draws the 3D off the page's main thread: the page's
// scrolling, its scroll handling and its layout never wait on the scene's
// JavaScript, nor the scene on them, and on a phone the two run side by
// side on two cores.
//
// This part is small, and runs first. It takes the canvas's WebGL2 context,
// the one three then draws with (workerRoot.jsx), and checks the worker has
// what the scene needs: a frame clock of its own, and fonts. Without them
// (Safari before 17 can't draw WebGL from a worker) it says so before
// anything big has downloaded, and the page draws the scene itself instead.

// The hall's signs are lettered in DM Mono 500, as the page's labels are
// (useSignAtlas in hall.jsx). A worker doesn't share the page's fonts, so it
// loads its own copy, the same file.
import signFont from '@fontsource/dm-mono/files/dm-mono-latin-500-normal.woff2?url';

// What three asks for when it makes the context itself, with the settings
// the scene gives it (GL_SETTINGS in Scene.jsx).
const ATTRIBUTES = {
  alpha: true,
  depth: true,
  stencil: false,
  antialias: false,
  premultipliedAlpha: true,
  preserveDrawingBuffer: false,
  powerPreference: 'high-performance',
  failIfMajorPerformanceCaveat: false,
};

// In development the React plugin's hot-reload runtime comes along with every
// component: it sets a hook on `window` as it loads, which a worker doesn't
// have, and each component registers itself with `$RefreshReg$`, which the
// plugin only sets up on the page. In development only, the worker's own
// global stands in for the first, and the second does nothing here: hot
// reload has nothing to do in the worker. (Builds have no such runtime, and
// leave this out.)
if (import.meta.env.DEV) {
  self.window ??= self;
  self.$RefreshReg$ ??= () => {};
  self.$RefreshSig$ ??= () => (type) => type;
}

let failed = false;
const fail = (why) => {
  if (failed) return;
  failed = true;
  self.postMessage({ type: 'failed', why: String(why?.message ?? why) });
};
self.addEventListener('error', (e) => fail(e.message));
self.addEventListener('unhandledrejection', (e) => fail(e.reason));

// Messages that arrive while the scene is still loading wait for it.
const early = [];
let deliver = null;

self.onmessage = async ({ data }) => {
  if (deliver) return deliver(data);
  if (data.type !== 'init') return early.push(data);

  const context = data.canvas.getContext('webgl2', ATTRIBUTES);
  if (!context || typeof self.requestAnimationFrame !== 'function' || !self.fonts || typeof FontFace !== 'function') {
    self.postMessage({ type: 'unsupported' });
    return;
  }
  const face = new FontFace('DM Mono', `url(${signFont})`, { weight: '500', style: 'normal' });
  self.fonts.add(face);
  face.load().catch(() => {});

  try {
    const { start } = await import('./workerRoot.jsx');
    deliver = start({ canvas: data.canvas, context, init: data, post: (message) => self.postMessage(message) });
    early.splice(0).forEach(deliver);
  } catch (error) {
    fail(error);
  }
};
