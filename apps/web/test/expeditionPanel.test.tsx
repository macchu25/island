import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';

vi.mock('../src/api/client', async (orig) => ({ ...(await orig<typeof import('../src/api/client')>()), apiFetch: vi.fn() }));
import { ApiError, apiFetch } from '../src/api/client';
import { ExpeditionPanel } from '../src/expeditions/ExpeditionPanel';
import { useUi } from '../src/state/ui';

const mocked = vi.mocked(apiFetch);
const monster = (chemicalId: string) => ({ id: `m-${chemicalId}`, chemicalId, displayName: `Mon-${chemicalId}`, silhouette: 'orb', color: '#112233', assetKey: chemicalId, rarity: 'common', blurb: '' });
const place = (id: string, over: Record<string, unknown> = {}) => ({
  id, name: `Nơi ${id}`, drops: [{ chemicalId: 'sio2', count: 4 }], durationS: 600, fee: 0, permitPrice: 0, bonusHabitat: 'metal', unlocked: true, ...over,
});
const places = [
  place('sand'), place('salt'), place('iron', { fee: 10 }), place('copper', { fee: 10 }),
  place('air', { permitPrice: 60, unlocked: false, fee: 20 }), place('well', { permitPrice: 80, unlocked: false }),
  place('gold', { permitPrice: 150, unlocked: false }), place('volcano', { permitPrice: 100, unlocked: false }),
];
const trip = (id: string, readyInMs: number) => ({ id, placeId: 'sand', chemicalId: 'h2', status: 'running', startedAt: new Date().toISOString(), readyAt: new Date(Date.now() + readyInMs).toISOString(), result: [] });

function setup(trips: unknown[] = [], coins = 100) {
  const qc = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity } } });
  qc.setQueryData(['me'], { player: { id: 'p', email: 'e', displayName: 'a' }, coins, inventory: [{ chemicalId: 'fe', count: 2 }, { chemicalId: 'h2', count: 4 }], products: [], sessions: [], extractor: { nextClaimAt: null } });
  qc.setQueryData(['catalog'], {
    chemicals: [
      { id: 'fe', formula: 'Fe', name: 'Sắt', kind: 'element', family: 'transition-metal', phaseAt25C: 'solid' },
      { id: 'h2', formula: 'H2', name: 'Hydro', kind: 'element', family: 'nonmetal', phaseAt25C: 'gas' },
      { id: 'sio2', formula: 'SiO2', name: 'Cát', kind: 'compound', family: 'oxide', phaseAt25C: 'solid' },
    ],
    monsters: [monster('fe'), monster('h2'), monster('sio2')],
  });
  qc.setQueryData(['expeditions'], { places, trips });
  render(<QueryClientProvider client={qc}><ExpeditionPanel /></QueryClientProvider>);
}

beforeEach(() => { mocked.mockReset(); useUi.setState({ panel: 'expedition', selectedChemicalId: null, pulse: null }); });

it('renders 8 places; locked ones show the permit price', () => {
  setup();
  expect(screen.getByRole('dialog', { name: 'Bến khai thác' })).toBeInTheDocument();
  expect(screen.getAllByTestId('place')).toHaveLength(8);
  expect(screen.getByRole('button', { name: 'Mua giấy phép · 60 Xu' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Mua giấy phép · 150 Xu' })).toBeInTheDocument();
  expect(screen.getAllByRole('button', { name: 'Gửi quái' })).toHaveLength(4);
});

it('picking shows the yield with +50% on a habitat match, and sending posts and closes the picker', async () => {
  mocked.mockResolvedValue({ trip: trip('t1', 600_000), coins: 100 });
  setup();
  fireEvent.click(within(screen.getAllByTestId('place')[0]!).getByRole('button', { name: 'Gửi quái' }));
  const fe = screen.getByTestId('pick-fe');
  expect(fe).toHaveTextContent('+50%');
  expect(fe).toHaveTextContent('6');
  expect(screen.getByTestId('pick-h2')).not.toHaveTextContent('+50%');
  fireEvent.click(fe);
  await waitFor(() => expect(screen.queryByTestId('pick-fe')).toBeNull());
  const call = mocked.mock.calls.find((c) => c[0] === '/api/expeditions')!;
  expect(JSON.parse((call[2] as { body: string }).body)).toEqual({ placeId: 'sand', chemicalId: 'fe' });
});

it('buying a permit posts the place id', async () => {
  mocked.mockResolvedValue({ placeId: 'air', coins: 40 });
  setup();
  fireEvent.click(screen.getByRole('button', { name: 'Mua giấy phép · 60 Xu' }));
  await waitFor(() => expect(mocked.mock.calls.some((c) => c[0] === '/api/permits')).toBe(true));
  const call = mocked.mock.calls.find((c) => c[0] === '/api/permits')!;
  expect(JSON.parse((call[2] as { body: string }).body)).toEqual({ placeId: 'air' });
});

it('shows a refusal in its own words', async () => {
  mocked.mockRejectedValue(new ApiError(409, 'INSUFFICIENT_COINS', 'x'));
  setup();
  fireEvent.click(screen.getByRole('button', { name: 'Mua giấy phép · 60 Xu' }));
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Không đủ Xu.'));
});

it('a ready trip shows Nhận, a running one a countdown', async () => {
  mocked.mockResolvedValue({ returned: { chemicalId: 'h2', count: 1 }, products: [{ chemicalId: 'sio2', count: 4 }], newDiscoveries: [] });
  setup([trip('t1', -1000), trip('t2', 90_000)]);
  const rows = screen.getAllByTestId('trip');
  expect(within(rows[0]!).getByRole('button', { name: 'Nhận' })).toBeEnabled();
  expect(rows[1]).toHaveTextContent('01:30');
  expect(within(rows[1]!).queryByRole('button', { name: 'Nhận' })).toBeNull();
  fireEvent.click(within(rows[0]!).getByRole('button', { name: 'Nhận' }));
  await waitFor(() => expect(mocked.mock.calls.some((c) => c[0] === '/api/expeditions/t1/collect')).toBe(true));
});

it('collecting the last trip shows what came back and what is new to the Codex', async () => {
  const body = { returned: { chemicalId: 'fe', count: 1 }, products: [{ chemicalId: 'sio2', count: 6 }], newDiscoveries: ['sio2'] };
  // The refetch after collect sees no running trip, so the trip row goes away.
  mocked.mockImplementation(async (path: string) => (path === '/api/expeditions' ? { places, trips: [] } : body) as never);
  setup([trip('t1', -1000)]);
  fireEvent.click(within(screen.getByTestId('trip')).getByRole('button', { name: 'Nhận' }));
  const line = await screen.findByTestId('trip-result');
  expect(line).toHaveTextContent('Nhận về: Mon-fe, +6 SiO₂');
  expect(line).toHaveTextContent('Khám phá mới: SiO₂');
  await waitFor(() => expect(screen.queryByTestId('trip')).toBeNull());
  expect(screen.getByTestId('trip-result')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Ẩn kết quả' }));
  expect(screen.queryByTestId('trip-result')).toBeNull();
});

it('a collect with nothing new shows no discovery line', async () => {
  mocked.mockResolvedValue({ returned: { chemicalId: 'h2', count: 1 }, products: [{ chemicalId: 'sio2', count: 4 }], newDiscoveries: [] });
  setup([trip('t1', -1000)]);
  fireEvent.click(within(screen.getByTestId('trip')).getByRole('button', { name: 'Nhận' }));
  const line = await screen.findByTestId('trip-result');
  expect(line).toHaveTextContent('Nhận về: Mon-h2, +4 SiO₂');
  expect(line).not.toHaveTextContent('Khám phá mới');
});

it.each([
  ['SLOTS_FULL', 'Đã hết chỗ: tối đa 2 chuyến.'],
  ['PLACE_LOCKED', 'Nơi này cần giấy phép.'],
])('%s shows its own message', async (code, text) => {
  mocked.mockRejectedValue(new ApiError(409, code as never, 'x'));
  setup();
  fireEvent.click(within(screen.getAllByTestId('place')[0]!).getByRole('button', { name: 'Gửi quái' }));
  fireEvent.click(screen.getByTestId('pick-h2'));
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(text));
});
