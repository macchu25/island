import { create } from 'zustand';

export type Panel = 'none' | 'codex' | 'table' | 'monster' | 'breeding' | 'market';
/** HUD widgets a building on the island can point at (the breeding building opens its own panel instead). */
export type HudTarget = 'extractor';
/** How long a HUD widget pulses after its building is clicked. */
export const HUD_PULSE_MS = 1500;

interface UiState {
  panel: Panel;
  selectedChemicalId: string | null;
  /** HUD widget currently pulsing, if any. */
  pulse: HudTarget | null;
  open(panel: Panel, id?: string): void;
  close(): void;
  pulseHud(target: HudTarget): void;
}

let pulseTimer: ReturnType<typeof setTimeout> | undefined;

export const useUi = create<UiState>((set) => ({
  panel: 'none',
  selectedChemicalId: null,
  pulse: null,
  open: (panel, id) => set({ panel, selectedChemicalId: id ?? null }),
  close: () => set({ panel: 'none', selectedChemicalId: null }),
  pulseHud: (target) => {
    // A second click restarts the pulse instead of being cut short by the first timer.
    clearTimeout(pulseTimer);
    set({ pulse: target });
    pulseTimer = setTimeout(() => set({ pulse: null }), HUD_PULSE_MS);
  },
}));

/** Tailwind classes for a pulsing HUD widget. */
export const PULSE_CLASSES = 'animate-pulse ring-4 ring-amber-300';
