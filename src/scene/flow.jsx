import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
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
//
// <FlowClock> advances it. It has to be the first child of the Canvas, so
// that its frame callback runs before the ones that read it.
export const flow = { t: 0, belt: 0, rate: 1 };

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
    const p = useFactory.getState().progress;
    const speed = last.current === null ? 0 : Math.abs(p - last.current) / Math.max(dt, 1e-3);
    last.current = p;

    const target = 1 + Math.min(speed * GAIN, MAX_BOOST);
    // quick to pick up, slow to wind down
    const lambda = target > flow.rate ? 5 : 1.4;
    flow.rate += (target - flow.rate) * (1 - Math.exp(-lambda * dt));
    flow.t += dt * flow.rate;
    flow.belt += dt * flow.rate * BELT_SPEED;
  });
  return null;
}
