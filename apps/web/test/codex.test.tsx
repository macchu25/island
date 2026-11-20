import type { ReactElement } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { CodexPanel } from '../src/codex/CodexPanel';
import { PeriodicTable } from '../src/codex/PeriodicTable';
import { useUi } from '../src/state/ui';

const monster = (chemicalId: string) => ({ id: `m-${chemicalId}`, chemicalId, displayName: `M-${chemicalId}`, silhouette: 'orb', color: '#112233', assetKey: chemicalId, rarity: 'common', blurb: '' });
function setup(ui: ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity } } });
  qc.setQueryData(['catalog'], {
    chemicals: [
      { id: 'fe', formula: 'Fe', name: 'Sắt', kind: 'element', atomicNumber: 26 },
      { id: 'co2', formula: 'CO2', name: 'Carbon dioxide', kind: 'compound' },
      { id: 'h2o', formula: 'H2O', name: 'Nước', kind: 'compound' },
    ],
    monsters: [monster('fe'), monster('co2'), monster('h2o')],
  });
  qc.setQueryData(['codex'], { entries: [
    { chemicalId: 'fe', state: 'owned', count: 5, firstDiscoverer: null },
    { chemicalId: 'co2', state: 'unknown', count: 0, firstDiscoverer: null },
    { chemicalId: 'h2o', state: 'discovered', count: 0, firstDiscoverer: { displayName: 'Alice', at: '2026-01-01T00:00:00.000Z' } },
  ] });
  render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

it('unknown compound shows ??? and symbol chips only', () => {
  setup(<CodexPanel />);
  expect(screen.getAllByText('???')).toHaveLength(1);
  expect(screen.getByText('C')).toBeInTheDocument();
  expect(screen.getByText('O')).toBeInTheDocument();
  expect(screen.queryByText(/CO/)).toBeNull();
  expect(screen.queryByText('Carbon dioxide')).toBeNull();
  expect(screen.getByText('Nước')).toBeInTheDocument();
  expect(screen.getByText(/Alice/)).toBeInTheDocument();
});

it('filter shows only compounds', () => {
  setup(<CodexPanel />);
  fireEvent.click(screen.getByText('Hợp chất'));
  expect(screen.queryByText('Sắt')).toBeNull();
  fireEvent.click(screen.getByText('Nguyên tố'));
  expect(screen.getByText('Sắt')).toBeInTheDocument();
});

it('periodic table renders 118 cells and opens owned monster', () => {
  setup(<PeriodicTable />);
  expect(screen.getAllByTestId('cell')).toHaveLength(118);
  fireEvent.click(screen.getByLabelText('Fe'));
  expect(useUi.getState()).toMatchObject({ panel: 'monster', selectedChemicalId: 'fe' });
});
