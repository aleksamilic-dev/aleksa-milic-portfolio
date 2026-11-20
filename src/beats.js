import { STOPS } from './data.js';

// Turns scroll progress into `beat`: where the visitor is in the factory.
// Beat 0 frames the first machine and beat 4 the last, so the camera, the
// lights and the shipping gate all read one number instead of each working
// out from raw progress which machine belongs to which bit of the page.
//
// The machines used to sit at even steps of progress (0, 0.25, 0.5...), but
// the sections aren't even: the benchmark came up after the camera had
// already left the processing drum. Now each machine holds while its part of
// the page (STOPS in data.js) fills the middle of the screen, and the trip
// to the next one happens across the join between the two.

// How much scroll a trip between machines takes at most, either side of the
// join, as a share of the screen height. Each side also leaves at least a
// tenth of its part of the page for the hold.
const TRIP = 0.4;
const TRIP_SHARE = 0.45;

// While a machine holds, the camera still creeps on by this much of a beat,
// so the scene never sits dead still under a long section. (At the first
// machine it walks further in: CAMERA_LEAD_IN in data.js.)
export const DRIFT = 0.1;

// Knots as [progress, beat] pairs, measured from the page. null when the page
// can't scroll yet (no height on a cold load), which falls back to even steps.
export function measureKnots(viewport) {
  const vh = viewport.clientHeight;
  const max = viewport.scrollHeight - vh;
  if (max <= 0 || vh <= 0) return null;

  // the scroll position that puts a y (in page px) at the middle of the screen
  const origin = viewport.getBoundingClientRect().top - viewport.scrollTop;
  const spans = [];
  for (const ids of STOPS) {
    const first = document.getElementById(ids[0]);
    const last = document.getElementById(ids[ids.length - 1]);
    if (!first || !last) return null;
    const top = first.getBoundingClientRect().top - origin;
    const bottom = last.getBoundingClientRect().bottom - origin;
    spans.push({ enter: top - vh / 2, leave: bottom - vh / 2 });
  }

  const knots = [[0, 0]];
  for (let i = 0; i < spans.length - 1; i++) {
    const a = spans[i];
    const b = spans[i + 1];
    const join = (a.leave + b.enter) / 2;
    const before = Math.min(TRIP * vh, TRIP_SHARE * (a.leave - a.enter));
    const after = Math.min(TRIP * vh, TRIP_SHARE * (b.leave - b.enter));
    knots.push([(join - before) / max, i + DRIFT]);
    knots.push([(join + after) / max, i + 1 - DRIFT]);
  }
  knots.push([1, spans.length - 1]);

  // keep them in order and inside the page, whatever the layout did
  let prev = 0;
  for (const k of knots) {
    k[0] = Math.min(1, Math.max(prev, k[0]));
    prev = k[0];
  }
  return knots;
}

export function beatAt(progress, knots) {
  if (!knots) return progress * (STOPS.length - 1);
  for (let i = 1; i < knots.length; i++) {
    const [p1, b1] = knots[i];
    if (progress <= p1) {
      const [p0, b0] = knots[i - 1];
      return p1 > p0 ? b0 + ((progress - p0) / (p1 - p0)) * (b1 - b0) : b1;
    }
  }
  return knots[knots.length - 1][1];
}
