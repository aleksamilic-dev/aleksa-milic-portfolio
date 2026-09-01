import { SECTIONS } from '../data.js';

// 2D calm backdrop — shown on the `flat` tier (no WebGL2 context, or a
// genuinely weak device, see hooks.js useDeviceTier), or whenever `calm` is
// true (the topbar's ambient-motion toggle, see MotionToggle in ui/HUD.jsx
// and store.js — it starts from prefers-reduced-motion, then the toggle
// owns it). Fully static: a dim floor, haze, and a horizon line with one
// node per section. The node for the section in view lights up. It sits
// well behind the content and never competes with it.
export default function Fallback({ section = 0 }) {
  return (
    <div className="flat" aria-hidden>
      <div className="flat__floor" />
      <div className="flat__haze" />
      <div className="flat__line">
        <span className="flat__nodes">
          {SECTIONS.map((s, i) => (
            <span
              key={s.id}
              className={`flat__node ${i === section ? 'is-active' : ''}`}
            />
          ))}
        </span>
      </div>
    </div>
  );
}
