import { useEffect, useRef } from 'react';
import { useFactory } from '../store.js';
import { MARKS, listenForInput } from './page.js';

// Whether this browser can hand a canvas to a worker. Whether the worker can
// then draw WebGL on it is only known by trying (worker.js), and when it
// can't, the scene comes back to the main thread (`onFallback`). ?worker=0
// draws on the main thread anyway, for comparing the two.
export const canDrawInWorker =
  typeof window !== 'undefined' &&
  new URLSearchParams(window.location.search).get('worker') !== '0' &&
  typeof Worker === 'function' &&
  typeof HTMLCanvasElement === 'function' &&
  'transferControlToOffscreen' in HTMLCanvasElement.prototype;

// The page's side of the scene's worker. It renders the canvas, hands it to
// the worker once the canvas has a size, and from then on tells the worker
// everything the scene reads from the page: the scroll, the pointer, input,
// whether the tab is hidden, the canvas's size, and the scene's props. The
// worker tells it which marks to put on .canvas-wrap (page.js), or that it
// can't draw, or that it failed.
//
// This imports nothing of three.js. The worker loads all of that itself, so
// the page's own JavaScript stays as small as it was.
export default function WorkerScene({ tier, portrait, still, onFallback }) {
  const box = useRef();
  const canvasRef = useRef();
  const post = useRef(null);
  const props = useRef({ tier, portrait, still });
  props.current = { tier, portrait, still };
  // the props the worker has last been told
  const sent = useRef(null);
  const fallback = useRef(onFallback);
  fallback.current = onFallback;

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = canvas.closest('.canvas-wrap');
    let worker = null;
    const stops = [];
    let gaveUp = false;
    const giveUp = () => {
      if (gaveUp) return;
      gaveUp = true;
      fallback.current();
    };

    const begin = (width, height) => {
      let offscreen;
      try {
        offscreen = canvas.transferControlToOffscreen();
        worker = new Worker(new URL('./worker.js', import.meta.url), { type: 'module', name: 'scene' });
      } catch {
        giveUp();
        return;
      }
      const send = (message) => worker.postMessage(message);
      post.current = send;
      worker.onmessage = ({ data }) => {
        if (data.type === 'mark') wrap?.toggleAttribute(MARKS[data.name], data.on);
        else if (data.type === 'unsupported' || data.type === 'failed') giveUp();
      };
      worker.onerror = giveUp;

      const { progress, beat } = useFactory.getState();
      sent.current = props.current;
      worker.postMessage(
        { type: 'init', canvas: offscreen, width, height, progress, beat, hidden: document.hidden, ...props.current },
        [offscreen],
      );

      // the scroll, as the store has it (HUD's scroll pass)
      stops.push(
        useFactory.subscribe((s, prev) => {
          if (s.progress !== prev.progress || s.beat !== prev.beat) send({ type: 'scroll', progress: s.progress, beat: s.beat });
        }),
      );

      // input, at most every tenth of a second: enough for the frame rate's
      // idle pace (FrameDriver), which only asks whether anyone's there
      let lastInput = -Infinity;
      stops.push(
        listenForInput(() => {
          const now = performance.now();
          if (now - lastInput < 100) return;
          lastInput = now;
          send({ type: 'input' });
        }),
      );

      // the pointer, for the parallax, once a frame at most. Not on touch,
      // as usePointer (hooks.js).
      if (!window.matchMedia('(pointer: coarse)').matches) {
        let frame = 0;
        let x = 0;
        let y = 0;
        const onMove = (e) => {
          x = (e.clientX / window.innerWidth) * 2 - 1;
          y = (e.clientY / window.innerHeight) * 2 - 1;
          if (frame) return;
          frame = requestAnimationFrame(() => {
            frame = 0;
            send({ type: 'pointer', x, y });
          });
        };
        window.addEventListener('pointermove', onMove, { passive: true });
        stops.push(() => {
          window.removeEventListener('pointermove', onMove);
          cancelAnimationFrame(frame);
        });
      }

      const onVisibility = () => send({ type: 'visibility', hidden: document.hidden });
      document.addEventListener('visibilitychange', onVisibility);
      stops.push(() => document.removeEventListener('visibilitychange', onVisibility));
    };

    // The canvas's size, from the first measure on. The worker starts with
    // the first one that isn't empty (the viewport can still be 0 high on a
    // cold load).
    let size = null;
    const measure = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (!width || !height || (size && size[0] === width && size[1] === height)) return;
      size = [width, height];
      if (!post.current && !gaveUp) begin(width, height);
      else post.current?.({ type: 'size', width, height });
    });
    measure.observe(box.current);

    return () => {
      measure.disconnect();
      stops.forEach((stop) => stop());
      worker?.terminate();
      post.current = null;
      Object.values(MARKS).forEach((mark) => wrap?.removeAttribute(mark));
    };
  }, []);

  // props after the start (the start carries the first ones)
  useEffect(() => {
    if (!post.current || !sent.current) return;
    const next = { tier, portrait, still };
    const last = sent.current;
    if (next.tier === last.tier && next.portrait === last.portrait && next.still === last.still) return;
    sent.current = next;
    post.current({ type: 'props', props: next });
  }, [tier, portrait, still]);

  return (
    <div ref={box} style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />
    </div>
  );
}
