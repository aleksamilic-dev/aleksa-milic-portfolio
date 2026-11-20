import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useFactory } from '../store.js';

// The factory's own clock. The belt and every machine run on it instead of
// the render clock, so the whole line can change pace together: scrolling the
// page drives it. While the visitor scrolls, the line speeds up (by up to
// MAX_BOOST on top of normal speed), and once they stop it eases back down
// over a second or two. Read it inside a useFrame:
//
//   flow.t     seconds of factory time, for anything cyclic (a spinning drum,
//              a blinking light)
//   flow.belt  how far the belt has moved, in world units
//   flow.gate  how far the shipping gate is open, 0 to 1. It rolls up as the
//              camera arrives at the dock, which is when Contact comes on
//              screen, and comes down again if the visitor scrolls back up.
//   flow.pitch the gap between batches on the belt, set by SpineFlow
//
// <FlowClock> advances it. It has to be the first child of the Canvas, so
// that its frame callback runs before the ones that read it.
export const flow = { t: 0, belt: 0, rate: 1, gate: 0, pitch: 5 };

// How strongly a batch is passing a point on the belt right now, 0 to 1, for
// the machines to react to: `d` is the point's distance from the head of the
// belt (SPINE.startZ - z). It peaks as the middle of a batch crosses the
// point, comes up quickly as one arrives and dies away over a couple of
// units after. Batches sit a whole number of pitches apart, so the nearest
// one is found by wrapping the belt's travel by the pitch.
const BATCH_MIDDLE = 0.42; // the middle packet's lead over the batch's first
export function batchPulse(d) {
  const p = flow.pitch;
  let x = (((flow.belt + BATCH_MIDDLE - d) % p) + p) % p;
  if (x > p / 2) x -= p; // negative while the batch is still on its way
  return x < 0 ? Math.exp(-((x / 0.45) ** 2)) : Math.exp(-x / 1.1);
}

// The stretch of `beat` (see beats.js) over which the gate opens: the second
// half of the trip to the dock, done just before the camera settles there.
const GATE_FROM = 3.5;
const GATE_TO = 3.9;

// World units per second at normal speed. Packets and the dashes on the rail
// both move at this, so they read as riding the same belt.
export const BELT_SPEED = 1.3;

// Extra speed per unit of scroll progress per second. Progress runs 0 to 1
// over the whole page, so an ordinary wheel scroll (a fifth of the page a
// second) adds about 1.8×.
const GAIN = 9;
const MAX_BOOST = 2.2;

export function FlowClock() {
  const last = useRef(null);
  useFrame((_, delta) => {
    // a long stall (a hidden tab, a slow frame) mustn't jump the whole line
    const dt = Math.min(delta, 0.1);
    const { progress: p, beat } = useFactory.getState();
    const speed = last.current === null ? 0 : Math.abs(p - last.current) / Math.max(dt, 1e-3);
    last.current = p;

    const target = 1 + Math.min(speed * GAIN, MAX_BOOST);
    // quick to pick up, slow to wind down
    const lambda = target > flow.rate ? 5 : 1.4;
    flow.rate += (target - flow.rate) * (1 - Math.exp(-lambda * dt));
    flow.t += dt * flow.rate;
    flow.belt += dt * flow.rate * BELT_SPEED;

    // eased, so a jump straight to Contact still rolls the door up
    const gate = THREE.MathUtils.smoothstep(beat, GATE_FROM, GATE_TO);
    flow.gate += (gate - flow.gate) * (1 - Math.exp(-2.2 * dt));
  });
  return null;
}
