import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
vi.mock('../src/api/client', async (orig) => ({ ...(await orig<typeof import('../src/api/client')>()), apiFetch: vi.fn() }));
import { ExtractorButton } from '../src/extractor/ExtractorButton';

function setup(nextClaimAt: string | null, inventory: { chemicalId: string; count: number }[] = [], catalog?: unknown) {
  const qc = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity } } });
  if (catalog) qc.setQueryData(['catalog'], catalog);
  qc.setQueryData(['me'], { player: { id: 'p', email: 'e', displayName: 'a' }, coins: 0, inventory, products: [], sessions: [], extractor: { nextClaimAt } });
  render(<QueryClientProvider client={qc}><ExtractorButton /></QueryClientProvider>);
}

it('shows cooldown when nextClaimAt is in the future', () => {
  setup(new Date(Date.now() + 30_000).toISOString());
  expect(screen.getByRole('button', { name: /Chờ \d+s/ })).toBeDisabled();
});

it('is ready with no cooldown', () => {
  setup(null);
  expect(screen.getByRole('button', { name: 'Nhận' })).toBeEnabled();
});

it('disabled at cap', () => {
  setup(null, [{ chemicalId: 'h2', count: 12 }]);
  fireEvent.change(screen.getByLabelText('Nguyên tố'), { target: { value: 'h2' } });
  expect(screen.getByRole('button', { name: 'Đã đủ 12' })).toBeDisabled();
});

it('option labels show the formatted formula and catalog name, not raw ids', () => {
  setup(null, [], {
    chemicals: [{ id: 'h2', formula: 'H2', name: 'Hydrogen', kind: 'element', phaseAt25C: 'gas', family: 'nonmetal' }],
    monsters: [],
  });
  const select = screen.getByLabelText('Nguyên tố') as HTMLSelectElement;
  const h2 = [...select.options].find((o) => o.value === 'h2')!;
  expect(h2.textContent).toBe('H₂ · Hydrogen');
  const mg = [...select.options].find((o) => o.value === 'mg')!;
  expect(mg.textContent).toBe('mg');
});

it('offers the 16 extractor elements', () => {
  setup(null);
  expect(screen.getByLabelText('Nguyên tố').querySelectorAll('option')).toHaveLength(16);
});
