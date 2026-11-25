import type { ReactElement } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { CodexPanel } from '../src/codex/CodexPanel';
import { PeriodicTable } from '../src/codex/PeriodicTable';
import { useUi } from '../src/state/ui';

const monster = (chemicalId: string) => ({ id: `m-${chemicalId}`, chemicalId, displayName: `M-${chemicalId}`, silhouette: 'orb', color: '#112233', assetKey: chemicalId, rarity: 'common', blurb: '' });
function setup(ui: ReactElement, h2oCount = 0, extra: object[] = [], extraChems: object[] = []) {
  const qc = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity } } });
  qc.setQueryData(['catalog'], {
    chemicals: [
      { id: 'fe', formula: 'Fe', name: 'Sắt', kind: 'element', atomicNumber: 26 },
      { id: 'co2', formula: 'CO2', name: 'Carbon dioxide', kind: 'compound' },
      { id: 'h2o', formula: 'H2O', name: 'Nước', kind: 'compound' },
      ...extraChems,
    ],
    monsters: [monster('fe'), monster('co2'), monster('h2o')],
  });
  qc.setQueryData(['codex'], { entries: [
    { chemicalId: 'fe', state: 'owned', count: 5, bred: false, firstDiscoverer: null },
    { chemicalId: 'co2', state: 'unknown', count: 0, bred: false, firstDiscoverer: null },
    { chemicalId: 'h2o', state: 'discovered', count: h2oCount, bred: true, firstDiscoverer: { displayName: 'Alice', at: '2026-01-01T00:00:00.000Z' } },
    ...extra,
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

it('unknown element shows only ???, not its own symbol', () => {
  setup(<CodexPanel />, 0, [{ chemicalId: 'si', state: 'unknown', count: 0, bred: false, firstDiscoverer: null }],
    [{ id: 'si', formula: 'Si', name: 'Silic', kind: 'element', atomicNumber: 14 }]);
  fireEvent.click(screen.getByText('Nguyên tố'));
  expect(screen.getAllByText('???')).toHaveLength(1);
  expect(screen.queryByText('Si')).toBeNull();
  expect(screen.queryByText('Silic')).toBeNull();
});

it('a mined compound that was never bred says chưa lai tạo; bred ones and elements do not', () => {
  setup(<CodexPanel />, 0, [{ chemicalId: 'sio2', state: 'discovered', count: 4, bred: false, firstDiscoverer: null }],
    [{ id: 'sio2', formula: 'SiO2', name: 'Cát', kind: 'compound' }]);
  expect(screen.getAllByText('chưa lai tạo')).toHaveLength(1);
  expect(screen.getByText('Cát').parentElement).toHaveTextContent('chưa lai tạo');
});

it('discovered compound shows its count only while the player holds some', () => {
  setup(<CodexPanel />, 2);
  expect(screen.getByText('×2')).toBeInTheDocument();
});

it('discovered compound with count 0 shows no count', () => {
  setup(<CodexPanel />);
  expect(screen.getByText('×5')).toBeInTheDocument(); // the owned element
  expect(screen.queryByText('×0')).toBeNull();
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

it('an unknown element shows ??? and is not live in the periodic table', () => {
  const qc = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity } } });
  qc.setQueryData(['catalog'], { chemicals: [{ id: 'au', formula: 'Au', name: 'Vàng', kind: 'element', atomicNumber: 79 }], monsters: [monster('au')] });
  qc.setQueryData(['codex'], { entries: [{ chemicalId: 'au', state: 'unknown', count: 0, firstDiscoverer: null }] });
  render(<QueryClientProvider client={qc}><CodexPanel /><PeriodicTable /></QueryClientProvider>);
  expect(screen.getByText('???')).toBeInTheDocument();
  expect(screen.queryByText('Vàng')).toBeNull();
  expect(screen.queryByRole('button', { name: 'Au' })).toBeNull();
});
