import { create } from 'zustand';

// Shared state between the HUD (which owns the scroll container) and the
// Scene (which reads `progress` for a gentle ambient parallax). `progress`
// is a continuous 0..1 value across the whole page; `section` is the index
// of the section currently in view, driving the progress rail's active tick.
// `heroInView` gates the mobile HeroScene's render loop — it freezes once the
// hero has scrolled away (the 3D is a hero-only moment on phones).
export const useFactory = create((set) => ({
  progress: 0,
  section: 0,
  heroInView: true,

  setProgress: (progress) => set({ progress }),
  setSection: (section) => set({ section }),
  setHeroInView: (heroInView) => set({ heroInView }),
}));
