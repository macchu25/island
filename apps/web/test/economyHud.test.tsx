import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { CoinCounter } from '../src/lab/CoinCounter';

it('header shows the balance', () => {
  const qc = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity } } });
  qc.setQueryData(['me'], { player: { id: 'p', email: 'e', displayName: 'a' }, coins: 157, inventory: [], products: [], sessions: [], extractor: { nextClaimAt: null } });
  render(<QueryClientProvider client={qc}><CoinCounter /></QueryClientProvider>);
  expect(screen.getByLabelText('Số Xu')).toHaveTextContent('157 Xu');
});
