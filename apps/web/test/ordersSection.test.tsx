import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';

vi.mock('../src/api/client', async (orig) => ({ ...(await orig<typeof import('../src/api/client')>()), apiFetch: vi.fn() }));
import { ApiError, apiFetch } from '../src/api/client';
import type { ErrorCode } from '@chemimon/shared';
import { MarketPanel } from '../src/market/MarketPanel';
import { OrdersSection } from '../src/market/OrdersSection';
import { useUi } from '../src/state/ui';

const mocked = vi.mocked(apiFetch);
const monster = (chemicalId: string) => ({ id: `m-${chemicalId}`, chemicalId, displayName: `Mon-${chemicalId}`, silhouette: 'orb', color: '#112233', assetKey: chemicalId, rarity: 'common', blurb: '' });
const iso = (ms: number) => new Date(Date.now() + ms).toISOString();
const order = (o: Record<string, unknown> = {}) => ({ id: 'o1', templateId: 't1', buyer: 'Tiệm bánh', chemicalId: 'nahco3', count: 3, reward: 40, line: 'bột nở giúp bánh xốp', expiresAt: iso((3 * 60 + 12) * 60_000 - 5_000), ...o });
const stalls = (over: Record<string, unknown>[] = []) => [
  { id: 'food', name: 'Phố ẩm thực', icon: '🍜', order: order(), readyAt: null },
  { id: 'factory', name: 'Khu nhà máy', icon: '🏭', order: null, readyAt: iso(24 * 60_000 + 30_000) },
  { id: 'city', name: 'Dịch vụ thành phố', icon: '🏙️', order: null, readyAt: null },
  { id: 'tech', name: 'Kim hoàn và công nghệ', icon: '💍', order: order({ id: 'o2', buyer: 'Xưởng bánh snack', chemicalId: 'n2', count: 3, reward: 15 }), readyAt: null },
].map((s, i) => ({ ...s, ...(over[i] ?? {}) }));

function setup(data = stalls(), inventory = [{ chemicalId: 'nahco3', count: 1 }, { chemicalId: 'n2', count: 5 }]) {
  mocked.mockImplementation(async (path: string) => {
    if (path === '/api/market/orders') return { stalls: data };
    throw new Error(`unmocked ${path}`);
  });
  const qc = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } });
  qc.setQueryData(['me'], { player: { id: 'p', email: 'e', displayName: 'a' }, coins: 10, inventory, sessions: [], extractor: { nextClaimAt: null } });
  qc.setQueryData(['catalog'], { chemicals: [{ id: 'nahco3', formula: 'NaHCO3' }, { id: 'n2', formula: 'N2' }], monsters: [monster('nahco3'), monster('n2')] });
  return render(<QueryClientProvider client={qc}><OrdersSection /></QueryClientProvider>);
}
const deliverCalls = () => mocked.mock.calls.filter((c) => String(c[0]).endsWith('/deliver'));

beforeEach(() => { mocked.mockReset(); useUi.setState({ panel: 'market', selectedChemicalId: null, pulse: null }); });

it('renders 4 stalls in order with order, cooling and empty states', async () => {
  setup();
  const names = (await screen.findAllByTestId('stall')).map((s) => s.getAttribute('aria-label'));
  expect(names).toEqual(['Phố ẩm thực', 'Khu nhà máy', 'Dịch vụ thành phố', 'Kim hoàn và công nghệ']);
  const food = screen.getByLabelText('Phố ẩm thực');
  expect(food).toHaveTextContent('Tiệm bánh');
  expect(food).toHaveTextContent('Cần 3 NaHCO₃ (bạn có 1)');
  expect(food).toHaveTextContent('“bột nở giúp bánh xốp”');
  expect(food).toHaveTextContent('+40 Xu');
  expect(food).toHaveTextContent('Còn 3 giờ 12 phút');
  expect(screen.getByLabelText('Khu nhà máy')).toHaveTextContent('Đơn mới sau 25 phút');
  expect(screen.getByLabelText('Dịch vụ thành phố')).toHaveTextContent('Chưa có đơn. Khám phá thêm chất nhé.');
});

it('disables Giao when short, enables when owned', async () => {
  setup();
  await screen.findByLabelText('Phố ẩm thực');
  expect(within(screen.getByLabelText('Phố ẩm thực')).getByRole('button', { name: 'Giao' })).toBeDisabled();
  expect(within(screen.getByLabelText('Kim hoàn và công nghệ')).getByRole('button', { name: 'Giao' })).toBeEnabled();
});

it('a successful deliver shows the status line; double click sends one request', async () => {
  setup();
  await screen.findByLabelText('Phố ẩm thực');
  mocked.mockImplementation(async (path: string) => {
    if (path === '/api/market/orders/o2/deliver') return { coins: 25, inventory: { chemicalId: 'n2', count: 2 }, stall: { id: 'tech', name: 'Kim hoàn và công nghệ', icon: '💍', order: null, readyAt: iso(1_800_000) } };
    return { stalls: stalls() };
  });
  const btn = within(screen.getByLabelText('Kim hoàn và công nghệ')).getByRole('button', { name: 'Giao' });
  fireEvent.click(btn);
  fireEvent.click(btn);
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Đã giao 3 N₂ cho Xưởng bánh snack: +15 Xu'));
  expect(deliverCalls()).toHaveLength(1);
  expect(deliverCalls()[0]![2]).toMatchObject({ method: 'POST' });
});

it.each([
  ['ORDER_EXPIRED', 'Đơn đã hết hạn.'],
  ['ORDER_CLOSED', 'Đơn này đã giao rồi.'],
  ['INSUFFICIENT_MONSTERS', 'Không đủ hàng để giao.'],
  ['BOOM', 'Có lỗi, thử lại.'],
])('error %s shows its text', async (code, text) => {
  setup();
  await screen.findByLabelText('Phố ẩm thực');
  mocked.mockImplementation(async (path: string) => {
    if (path.endsWith('/deliver')) throw new ApiError(409, code as ErrorCode, 'x');
    return { stalls: stalls() };
  });
  fireEvent.click(within(screen.getByLabelText('Kim hoàn và công nghệ')).getByRole('button', { name: 'Giao' }));
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(text));
});

it('refetches when a readyAt passes', async () => {
  setup(stalls([{}, { readyAt: iso(700) }]));
  await screen.findByLabelText('Khu nhà máy');
  const before = mocked.mock.calls.filter((c) => c[0] === '/api/market/orders').length;
  await waitFor(() => expect(mocked.mock.calls.filter((c) => c[0] === '/api/market/orders').length).toBeGreaterThan(before), { timeout: 3000 });
});

it('MarketPanel tabs switch between Thu mua and Đơn hàng', async () => {
  mocked.mockResolvedValue({ stalls: stalls() });
  const qc = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } });
  qc.setQueryData(['me'], { player: { id: 'p', email: 'e', displayName: 'a' }, coins: 10, inventory: [], sessions: [], extractor: { nextClaimAt: null } });
  qc.setQueryData(['catalog'], { chemicals: [], monsters: [] });
  qc.setQueryData(['economy'], { conditionPrices: {}, floorPrices: {} });
  render(<QueryClientProvider client={qc}><MarketPanel /></QueryClientProvider>);
  expect(screen.getByLabelText('Thu mua')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('tab', { name: 'Đơn hàng' }));
  expect(await screen.findByLabelText('Đơn hàng', { selector: 'section' })).toBeInTheDocument();
  expect(screen.queryByLabelText('Thu mua')).toBeNull();
  fireEvent.click(screen.getByRole('tab', { name: 'Thu mua' }));
  expect(screen.getByLabelText('Thu mua')).toBeInTheDocument();
});
