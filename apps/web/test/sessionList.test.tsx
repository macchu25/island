import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { SessionList } from '../src/breeding/SessionList';

function setup(readyAt: string) {
  const qc = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity } } });
  qc.setQueryData(['me'], { player: { id: 'p', email: 'e', displayName: 'a' }, inventory: [], extractor: { nextClaimAt: null },
    sessions: [{ id: 's1', status: 'running', inputs: [{ chemicalId: 'h2', count: 2 }], conditions: {}, readyAt }] });
  qc.setQueryData(['catalog'], { chemicals: [{ id: 'h2', formula: 'H2' }], monsters: [] });
  return render(<QueryClientProvider client={qc}><SessionList onCollected={() => {}} /></QueryClientProvider>);
}

it('enables Collect when readyAt is past', () => {
  setup(new Date(Date.now() - 1000).toISOString());
  expect(screen.getByRole('button', { name: 'Thu hoạch' })).toBeEnabled();
});

it('disables Collect with countdown and clears interval on unmount', () => {
  vi.useFakeTimers();
  const clear = vi.spyOn(globalThis, 'clearInterval');
  const { unmount } = setup(new Date(Date.now() + 5000).toISOString());
  expect(screen.getByRole('button', { name: 'Thu hoạch' })).toBeDisabled();
  expect(screen.getByText('00:05')).toBeInTheDocument();
  unmount();
  expect(clear).toHaveBeenCalled();
  vi.useRealTimers();
});
