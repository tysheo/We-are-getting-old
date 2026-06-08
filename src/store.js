import { create } from 'zustand'

// The act state machine. Only one act's heavy work is mounted at a time
// (see Experience.jsx) — this is the main guard against the "effect-overload"
// risk called out in the plan.
export const ACTS = {
  PULL: 1, // Act 1 — pull the flower out of the concrete
  BLOOM: 2, // Act 2 — click to open the bloom (aperture)
  TUNNEL: 3, // Act 3 — 2.5D image-archive flythrough
  AGING: 4, // Act 4 — scroll-scrubbed 0->100 aging
  DISSOLVE: 5, // Act 5 — dissolve to water + "close to you"
}

export const useStore = create((set, get) => ({
  act: ACTS.PULL,

  // Act 1: 0 (buried) -> 1 (pulled past threshold). Drives concrete loosening.
  pullAmount: 0,
  // True once the concrete has shattered and the flower is free.
  isFreed: false,
  // Act 2: the bloom has opened.
  isBloomed: false,
  // Act 4: 0..1 scrub -> mapped to age 0..100.
  ageProgress: 0,

  // Whether to overlay a faint dev HUD (toggled with the `d` key).
  debug: false,

  setAct: (act) => set({ act }),
  advanceAct: () => set((s) => ({ act: Math.min(s.act + 1, ACTS.DISSOLVE) })),

  setPull: (pullAmount) => set({ pullAmount }),
  freeFlower: () => set({ isFreed: true }),
  bloom: () => set({ isBloomed: true }),
  setAgeProgress: (ageProgress) => set({ ageProgress }),

  toggleDebug: () => set((s) => ({ debug: !s.debug })),

  // Hard reset (used by the dev HUD).
  reset: () =>
    set({
      act: ACTS.PULL,
      pullAmount: 0,
      isFreed: false,
      isBloomed: false,
      ageProgress: 0,
    }),
}))
