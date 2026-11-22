// What the scene needs from the page around it, wherever the scene runs.
//
// On most browsers the scene runs in a worker of its own (worker.js), where
// there's no document: no canvas wrapper to mark, no input events to watch,
// no visibility to read. So the scene asks for those here, and whoever hosts
// it says how: on the main thread, straight from the document (the default
// below), and in the worker, through messages to and from the page
// (workerRoot.jsx).

// The marks the scene puts on .canvas-wrap for styles.css: its first frame
// is drawn (FadeIn), it's fading out to move the camera (CameraRig, with
// reduced motion), and it draws the scrims itself (ScrimMark).
export const MARKS = { shown: 'data-shown', veil: 'data-veil', scrim: 'data-scrim' };

// What counts as someone using the page, for the frame rate (FrameDriver):
// these on the window, and any scroll. The page scrolls inside .viewport,
// and scroll doesn't bubble, so that's caught on the way down.
export const INPUTS = ['pointermove', 'pointerdown', 'wheel', 'touchstart', 'keydown'];

export function listenForInput(onInput) {
  const listen = { passive: true, capture: true };
  INPUTS.forEach((type) => window.addEventListener(type, onInput, listen));
  document.addEventListener('scroll', onInput, listen);
  return () => {
    INPUTS.forEach((type) => window.removeEventListener(type, onInput, listen));
    document.removeEventListener('scroll', onInput, listen);
  };
}

const documentPage = {
  mark(name, on) {
    document.querySelector('.canvas-wrap')?.toggleAttribute(MARKS[name], on);
  },
  onInput: listenForInput,
  onVisibility(onChange) {
    document.addEventListener('visibilitychange', onChange);
    return () => document.removeEventListener('visibilitychange', onChange);
  },
  hidden: () => document.hidden,
};

let host = typeof document !== 'undefined' ? documentPage : null;

export function setPage(next) {
  host = next;
}

export const page = {
  mark: (name, on) => host?.mark(name, on),
  onInput: (onInput) => host?.onInput(onInput) ?? (() => {}),
  onVisibility: (onChange) => host?.onVisibility(onChange) ?? (() => {}),
  hidden: () => host?.hidden() ?? false,
};

// A 2D canvas to paint a texture on, and a promise that a font is ready to
// paint with (the hall's signs). A worker has no document, but it has
// OffscreenCanvas and a font set of its own, which worker.js fills.
export function makeCanvas(width, height) {
  if (typeof document === 'undefined') return new OffscreenCanvas(width, height);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

export function fontReady(spec) {
  const fonts = typeof document !== 'undefined' ? document.fonts : self.fonts;
  return fonts ? fonts.load(spec) : Promise.reject(new Error('no font set'));
}
