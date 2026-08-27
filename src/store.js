import { create } from 'zustand';

const CALM_KEY = 'portfolio:calm';

const storedCalm = () => {
  try {
    return localStorage.getItem(CALM_KEY) === '1';
  } catch {
    return false;
  }
};

// Shared state between the HUD (which owns the scroll container) and the
// Scene (which reads `progress` for a gentle ambient parallax). `progress`
// is a continuous 0..1 value across the whole page; `section` is the index
// of the section currently in view, used for discrete UI state (active nav
// item, progress rail).
export const useFactory = create((set) => ({
  progress: 0,
  section: 0,
  menuOpen: false,
  calmMode: storedCalm(),

  setProgress: (progress) => set({ progress }),
  setSection: (section) => set({ section }),

  toggleMenu: () => set((s) => ({ menuOpen: !s.menuOpen })),
  closeMenu: () => set({ menuOpen: false }),

  toggleCalm: () =>
    set((s) => {
      const calmMode = !s.calmMode;
      try {
        localStorage.setItem(CALM_KEY, calmMode ? '1' : '0');
      } catch {
        /* private mode / storage disabled — honour the choice for this session only */
      }
      return { calmMode };
    }),
}));
