import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';

vi.mock('../src/api/client', async (orig) => ({ ...(await orig<typeof import('../src/api/client')>()), apiFetch: vi.fn() }));
import { ApiError, apiFetch } from '../src/api/client';
import { MarketPanel } from '../src/market/MarketPanel';
import { useUi } from '../src/state/ui';

const mocked = vi.mocked(apiFetch);
const monster = (chemicalId: string) => ({ id: `m-${chemicalId}`, chemicalId, displayName: `Mon-${chemicalId}`, silhouette: 'orb', color: '#112233', assetKey: chemicalId, rarity: 'common', blurb: '' });

function setup(inventory = [{ chemicalId: 'h2', count: 4 }, { chemicalId: 'o2', count: 2 }]) {
  const qc = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity } } });
  qc.setQueryData(['me'], { player: { id: 'p', email: 'e', displayName: 'a' }, coins: 10, inventory, products: [], sessions: [], extractor: { nextClaimAt: null } });
  qc.setQueryData(['catalog'], { chemicals: [{ id: 'h2', formula: 'H2' }, { id: 'o2', formula: 'O2' }], monsters: [monster('h2'), monster('o2')] });
  qc.setQueryData(['economy'], { conditionPrices: {}, floorPrices: { h2: 2, o2: 3 } });
  render(<QueryClientProvider client={qc}><MarketPanel /></QueryClientProvider>);
}

beforeEach(() => { mocked.mockReset(); useUi.setState({ panel: 'market', selectedChemicalId: null, pulse: null }); });

it('lists owned species with floor price', () => {
  setup();
  const rows = screen.getByLabelText('Thu mua');
  expect(rows).toHaveTextContent('Mon-h2');
  expect(rows).toHaveTextContent('×4');
  expect(rows).toHaveTextContent('2 Xu / con');
  expect(rows).toHaveTextContent('3 Xu / con');
  expect(screen.getByRole('dialog', { name: 'Chợ' })).toBeInTheDocument();
});

it('shows the empty message when nothing is owned', () => {
  setup([]);
  expect(screen.getByText('Bạn chưa có gì để bán.')).toBeInTheDocument();
});

it('stepper stops at owned', () => {
  setup();
  for (let i = 0; i < 5; i++) fireEvent.click(screen.getByLabelText('Tăng o2'));
  expect(screen.getByLabelText('Số lượng o2')).toHaveTextContent('2');
  fireEvent.click(screen.getByLabelText('Giảm o2'));
  fireEvent.click(screen.getByLabelText('Giảm o2'));
  expect(screen.getByLabelText('Số lượng o2')).toHaveTextContent('1');
});

it('Bán posts {chemicalId, count} once on double click and shows the status line', async () => {
  mocked.mockResolvedValue({ coins: 16, inventory: [{ chemicalId: 'h2', count: 1 }] });
  setup();
  fireEvent.click(screen.getByLabelText('Tăng h2'));
  fireEvent.click(screen.getByLabelText('Tăng h2'));
  const btn = screen.getByTestId('sell-h2');
  fireEvent.click(btn);
  fireEvent.click(btn);
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Đã bán 3 H₂: +6 Xu'));
  const calls = mocked.mock.calls.filter((c) => c[0] === '/api/market/sell');
  expect(calls).toHaveLength(1);
  expect(JSON.parse((calls[0]![2] as { body: string }).body)).toEqual({ chemicalId: 'h2', count: 3 });
});

it.each([
  [409, 'INSUFFICIENT_MONSTERS', 'Không đủ hàng để bán.'],
  [400, 'UNKNOWN_CHEMICAL', 'Chất này không bán được.'],
  [500, 'INTERNAL', 'Có lỗi, thử lại.'],
] as const)('a refused sale (%i %s) shows the market message, never the breeding copy', async (status, code, text) => {
  mocked.mockRejectedValue(new ApiError(status, code, 'x'));
  setup();
  fireEvent.click(screen.getByTestId('sell-h2'));
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(text));
  expect(screen.queryByText(/lai/)).not.toBeInTheDocument();
  expect(mocked.mock.calls.filter((c) => c[0] === '/api/market/sell')).toHaveLength(1);
  expect(screen.getByTestId('sell-h2')).not.toBeDisabled(); // the button is usable again after the error
});

it('Escape closes', () => {
  setup();
  fireEvent.keyDown(window, { key: 'Escape' });
  expect(useUi.getState().panel).toBe('none');
});

it('lists owned products with the floor price and sells one by productId', async () => {
  mocked.mockResolvedValue({ coins: 20, product: { productId: 'can', count: 1 } });
  const qc = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } });
  qc.setQueryData(['me'], { player: { id: 'p', email: 'e', displayName: 'a' }, coins: 10, inventory: [], products: [{ productId: 'can', count: 3 }], sessions: [], extractor: { nextClaimAt: null } });
  qc.setQueryData(['catalog'], { chemicals: [], monsters: [] });
  qc.setQueryData(['economy'], { conditionPrices: {}, floorPrices: {} });
  qc.setQueryData(['workshop'], { products: [{ id: 'can', name: 'Lon nhôm', ingredients: [{ chemicalId: 'al', count: 2 }], durationS: 120, blueprintPrice: 0, floorPrice: 5, line: 'đựng nước ngọt', assetKey: 'can', unlocked: true }], jobs: [] });
  render(<QueryClientProvider client={qc}><MarketPanel /></QueryClientProvider>);
  const row = screen.getByTestId('product-row');
  expect(row).toHaveTextContent('Lon nhôm');
  expect(row).toHaveTextContent('Giá sàn: 5 Xu');
  fireEvent.click(screen.getByLabelText('Tăng can'));
  const btn = screen.getByTestId('sell-can');
  fireEvent.click(btn);
  fireEvent.click(btn);
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Đã bán 2 Lon nhôm: +10 Xu'));
  const calls = mocked.mock.calls.filter((c) => c[0] === '/api/market/sell');
  expect(calls).toHaveLength(1);
  expect(JSON.parse((calls[0]![2] as { body: string }).body)).toEqual({ productId: 'can', count: 2 });
});
