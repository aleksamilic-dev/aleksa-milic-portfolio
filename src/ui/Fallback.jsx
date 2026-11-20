import { SECTIONS, ZONE_COLORS } from '../data.js';
import { useFactory } from '../store.js';

// Which zone's colour each section's node takes: the stage of the line the
// 3D scene has on screen for that section (STOPS in data.js). The intake for
// the hero, processing for the work, the control room for skills and
// experience, the shipping gate for contact.
const SECTION_ZONE = [0, 1, 3, 4];

// '#ff9d4d' -> '255, 157, 77', so styles.css can put it in rgba()
const rgb = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return `${n >> 16}, ${(n >> 8) & 255}, ${n & 255}`;
};

// The line runs in the same stages as the 3D belt: raw, refined, checked,
// and out through the gate.
const STAGES = {
  '--raw': rgb(ZONE_COLORS[0]),
  '--refined': rgb(ZONE_COLORS[1]),
  '--checked': rgb(ZONE_COLORS[3]),
  '--out': rgb(ZONE_COLORS[4]),
};

// 2D calm backdrop — shown on the `flat` tier (no WebGL2 context, or a
// genuinely weak device, see hooks.js useDeviceTier), or whenever `calm` is
// true (the topbar's ambient-motion toggle, see MotionToggle in ui/HUD.jsx
// and store.js — full motion by default regardless of prefers-reduced-motion;
// this is what a visitor sees once they've turned the toggle on themselves).
// Fully static: a dim floor, haze, and a horizon line with one node per
// section. The node for the section in view lights up in its zone's colour.
// It sits well behind the content and never competes with it.
export default function Fallback() {
  // read here rather than passed down, so a section change re-renders this
  // and nothing above it
  const section = useFactory((s) => s.section);
  return (
    <div className="flat" style={STAGES} aria-hidden>
      <div className="flat__floor" />
      <div className="flat__haze" />
      <div className="flat__line">
        <span className="flat__nodes">
          {SECTIONS.map((s, i) => (
            <span
              key={s.id}
              className={`flat__node ${i === section ? 'is-active' : ''}`}
              style={{ '--node': rgb(ZONE_COLORS[SECTION_ZONE[i] ?? 0]) }}
            />
          ))}
        </span>
      </div>
    </div>
  );
}
