import { create } from 'zustand';

// Shared state between the HUD (which owns the scroll container) and the
// Scene (which reads `progress` for a gentle ambient parallax). `progress`
// is a continuous 0..1 value across the whole page; `section` is the index
// of the section currently in view, driving the progress rail's active tick.
export const useFactory = create((set) => ({
  progress: 0,
  section: 0,

  setProgress: (progress) => set({ progress }),
  setSection: (section) => set({ section }),
}));
