import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
vi.mock('../src/api/client', async (orig) => ({ ...(await orig<typeof import('../src/api/client')>()), apiFetch: vi.fn() }));
import { ExtractorButton } from '../src/extractor/ExtractorButton';

function setup(nextClaimAt: string | null, inventory: { chemicalId: string; count: number }[] = []) {
  const qc = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity } } });
  qc.setQueryData(['me'], { player: { id: 'p', email: 'e', displayName: 'a' }, inventory, sessions: [], extractor: { nextClaimAt } });
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
