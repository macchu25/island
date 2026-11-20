import { create } from 'zustand';

export type Panel = 'none' | 'codex' | 'table' | 'monster';

interface UiState {
  panel: Panel;
  selectedChemicalId: string | null;
  open(panel: Panel, id?: string): void;
  close(): void;
}

export const useUi = create<UiState>((set) => ({
  panel: 'none',
  selectedChemicalId: null,
  open: (panel, id) => set({ panel, selectedChemicalId: id ?? null }),
  close: () => set({ panel: 'none', selectedChemicalId: null }),
}));
