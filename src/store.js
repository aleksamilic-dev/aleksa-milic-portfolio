import { create } from 'zustand';

// 'reduced' | 'full' — the same two words used for the data-motion attribute
// App.jsx sets, so the store, the DOM, and localStorage all speak one
// vocabulary. Persisted so the choice holds across visits.
const MOTION_KEY = 'motion';

function storedMotion() {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(MOTION_KEY);
  } catch {
    return null; // storage blocked (private mode, locked-down browser) — fine, just don't persist
  }
}

// First visit with no stored choice: follow the OS-level preference. After
// that the button is the source of truth — this isn't re-read live, so
// changing the OS setting later doesn't fight a choice already made here.
function initialCalm() {
  const stored = storedMotion();
  if (stored) return stored === 'reduced';
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

// Shared state between the HUD (which owns the scroll container) and the
// Scene (which reads `progress` for a gentle ambient parallax). `progress`
// is a continuous 0..1 value across the whole page; `section` is the index
// of the section currently in view, driving the progress rail's active tick.
// `calm` is the visitor's ambient-motion preference — see MotionToggle in
// ui/HUD.jsx and the Scene/Fallback switch in App.jsx.
export const useFactory = create((set) => ({
  progress: 0,
  section: 0,
  calm: initialCalm(),

  setProgress: (progress) => set({ progress }),
  setSection: (section) => set({ section }),
  toggleCalm: () =>
    set((s) => {
      const calm = !s.calm;
      try {
        window.localStorage.setItem(MOTION_KEY, calm ? 'reduced' : 'full');
      } catch {
        // not persisted this time — the toggle still works for the session
      }
      return { calm };
    }),
}));
