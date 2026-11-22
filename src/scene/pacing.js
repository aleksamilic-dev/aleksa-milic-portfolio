// When the scene draws, counted in whole refreshes of the screen.
//
// The scene draws at most 60 times a second (FrameDriver in Scene.jsx). Held
// to that by the clock alone, it came out uneven on a screen whose rate isn't
// a multiple of 60: on a 90 Hz phone frames went 11 and 22 ms apart by turns,
// and on a 144 Hz screen 14 and 21, which shows as a judder whenever the
// camera moves. Counted in whole refreshes, frames are always evenly spaced:
// every refresh at 60 Hz, every other one at 90 Hz (45 a second) and at
// 120 Hz (60 a second). A pace comes out at the fewest refreshes that keep it
// no more than OVERSHOOT faster than asked, which keeps the common rates well
// clear of a tie: 75 Hz draws every refresh, 144 Hz every other one (72 a
// second). The idle paces work the same way.
//
// The screen's refresh interval comes from the gaps between frame callbacks.
// A refresh the page misses makes a gap twice as long, never a shorter one,
// so it's read from the short end of the recent gaps: the ones within a
// quarter of their lower quartile, averaged, which also evens out jitter in
// the timestamps. And it's never taken as longer than a 60 Hz refresh: a
// device too slow for its own screen shows long gaps all the time, and
// reading those as a slow screen would hide from PerformanceMonitor how far
// behind it is. So on a 60 Hz screen, or anything slower, this draws exactly
// when the clock did before.
//
// Whether a frame is due is counted from the last one drawn, rounded to
// whole refreshes, so a small error in the estimate can't add up over time.

const SLOWEST_REFRESH_MS = 1000 / 60;
const SAMPLES = 32;
const OVERSHOOT = 1.3;

export function createPacer() {
  const gaps = new Float64Array(SAMPLES);
  let seen = 0;
  let prev = 0;
  let last = -Infinity; // when the last frame was drawn
  let refresh = SLOWEST_REFRESH_MS;

  // whole refreshes per drawn frame, for a pace of one frame per `frameMs`
  const refreshes = (frameMs) => Math.max(1, Math.ceil(frameMs / refresh / OVERSHOOT));

  return {
    // every frame callback, with its timestamp
    tick(t) {
      const gap = t - prev;
      prev = t;
      // a stall, or a return from the background, says nothing about the screen
      if (gap < 3 || gap > 50) return;
      gaps[seen++ % SAMPLES] = gap;
      if (seen % SAMPLES) return;
      const sorted = Array.from(gaps).sort((a, b) => a - b);
      const short = sorted[SAMPLES >> 2] * 1.25;
      let sum = 0;
      let n = 0;
      for (const g of sorted) {
        if (g > short) break;
        sum += g;
        n++;
      }
      refresh = Math.min(SLOWEST_REFRESH_MS, sum / n);
    },
    // how many frames a second a pace of one per `frameMs` comes out at
    rate(frameMs) {
      return 1000 / (refreshes(frameMs) * refresh);
    },
    // whether a frame is due at `t`, at a pace of one per `frameMs`
    due(t, frameMs) {
      if (Math.round((t - last) / refresh) < refreshes(frameMs)) return false;
      last = t;
      return true;
    },
    // the next frame is due at once (input after an idle spell, the tab back)
    restart() {
      last = -Infinity;
    },
  };
}
