import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';

vi.mock('../src/api/client', async (orig) => ({ ...(await orig<typeof import('../src/api/client')>()), apiFetch: vi.fn() }));
import { ApiError, apiFetch } from '../src/api/client';
import { BreedingPanel } from '../src/breeding/BreedingPanel';
import { labError } from '../src/labs/errors';
import { LabsPanel } from '../src/labs/LabsPanel';
import { useUi } from '../src/state/ui';

const mocked = vi.mocked(apiFetch);
const items = (over: Record<string, boolean> = {}) => [
  { id: 'furnace', kind: 'lab', name: 'Lò cao', opens: 'Mở 1000 °C và 2500 °C', price: 150, owned: over.furnace ?? false, useful: true },
  { id: 'cold', kind: 'lab', name: 'Phòng lạnh', opens: 'Mở -78 °C', price: 60, owned: false, useful: false },
  { id: 'catalyst:Fe', kind: 'catalyst', name: 'Xúc tác Fe', opens: 'Mở xúc tác Fe', price: 40, owned: true, useful: true },
];
const LABS = [
  { id: 'furnace', name: 'Lò cao', unlocks: { temperatureC: [1000, 2500] }, price: 150 },
  { id: 'cold', name: 'Phòng lạnh', unlocks: { temperatureC: [-78] }, price: 60 },
];

function setup(ui: React.ReactElement, labItems = items()) {
  const qc = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity } } });
  qc.setQueryData(['me'], { player: { id: 'p', email: 'e', displayName: 'a' }, coins: 500, inventory: [], products: [], sessions: [], extractor: { nextClaimAt: null } });
  qc.setQueryData(['catalog'], { chemicals: [], monsters: [] });
  qc.setQueryData(['labs'], { items: labItems });
  qc.setQueryData(['economy'], {
    conditionPrices: {
      temperatureC: { '-78': 20, '25': 0, '200': 5, '450': 15, '1000': 40, '2500': 120 },
      pressureAtm: { '1': 0, '10': 10, '100': 40, '200': 80 },
      environment: { air: 0, water: 2, inert: 10 },
      activation: { none: 0, spark: 3, light: 3, electric: 10 },
      catalyst: { none: 0, Fe: 0, Pt: 0, V2O5: 0, MnO2: 0 },
    },
    floorPrices: {}, labs: LABS,
  });
  render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}
beforeEach(() => { mocked.mockReset(); useUi.setState({ panel: 'labs', selectedChemicalId: null, pulse: null }); });

it('shows buy, owned and useless card states', () => {
  setup(<LabsPanel />);
  expect(screen.getByRole('dialog', { name: 'Phòng thí nghiệm' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Mua (150 Xu)' })).toBeInTheDocument();
  expect(screen.getByText('Mở 1000 °C và 2500 °C')).toBeInTheDocument();
  expect(screen.getByText('Đã có')).toBeInTheDocument();
  expect(screen.getByText('Chưa dùng được')).toBeInTheDocument();
  expect(screen.getAllByRole('button', { name: /Mua/ })).toHaveLength(1);
});

it('buy posts the item id and ignores a double click', async () => {
  mocked.mockImplementation(((path: string) => path === '/api/labs/buy' ? new Promise((r) => setTimeout(() => r({ itemId: 'furnace', coins: 350 }), 20)) : Promise.resolve(null)) as never);
  setup(<LabsPanel />);
  const btn = screen.getByRole('button', { name: 'Mua (150 Xu)' });
  fireEvent.click(btn); fireEvent.click(btn);
  await waitFor(() => expect(mocked.mock.calls.some((c) => c[0] === '/api/labs')).toBe(true));
  const buys = mocked.mock.calls.filter((c) => c[0] === '/api/labs/buy');
  expect(buys).toHaveLength(1);
  expect(JSON.parse((buys[0]![2] as { body: string }).body)).toEqual({ itemId: 'furnace' });
});

it.each([
  ['LAB_OWNED', undefined, 'Đã có.'],
  ['LAB_USELESS', undefined, 'Chưa có phản ứng nào dùng được.'],
  ['INSUFFICIENT_COINS', { needed: 150, have: 20 }, 'Thiếu Xu: cần 150, có 20.'],
] as const)('refusal %s shows its text', async (code, details, text) => {
  mocked.mockRejectedValue(new ApiError(409, code, 'x', details));
  setup(<LabsPanel />);
  fireEvent.click(screen.getByRole('button', { name: 'Mua (150 Xu)' }));
  expect(await screen.findByRole('status')).toHaveTextContent(text);
});

it('LAB_LOCKED text names the lab', () => {
  expect(labError(new ApiError(409, 'LAB_LOCKED', 'x', { itemId: 'furnace' }), { furnace: 'Lò cao' })).toBe('Cần mua Lò cao trước.');
});

it('breeding room locks unowned values with the lab name and shows the hint line', () => {
  setup(<BreedingPanel />);
  const temp = screen.getByRole('group', { name: 'Nhiệt độ' });
  const t1000 = temp.querySelector('button:nth-of-type(5)') as HTMLButtonElement;
  expect(t1000).toBeDisabled();
  expect(t1000).toHaveTextContent('🔒');
  expect(t1000).toHaveTextContent('Cần Lò cao');
  expect(screen.getByRole('button', { name: /^25 °C/ })).toBeEnabled();
  expect(screen.getByText('Mở thêm điều kiện ở Phòng thí nghiệm.')).toBeInTheDocument();
});

it('breeding room opens values of an owned lab', () => {
  setup(<BreedingPanel />, items({ furnace: true }));
  expect(screen.getByRole('button', { name: /^1000 °C/ })).toBeEnabled();
});

it('while labs are loading, gated values are locked and Start is disabled', () => {
  mocked.mockReturnValue(new Promise(() => {}) as never);
  const qc = new QueryClient();
  qc.setQueryData(['me'], { player: { id: 'p', email: 'e', displayName: 'a' }, coins: 500, inventory: [], products: [], sessions: [], extractor: { nextClaimAt: null } });
  qc.setQueryData(['catalog'], { chemicals: [], monsters: [] });
  render(<QueryClientProvider client={qc}><BreedingPanel /></QueryClientProvider>);
  expect(screen.getByRole('button', { name: /^1000 °C/ })).toBeDisabled();
  expect(screen.getByRole('button', { name: /^Fe/ })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Bắt đầu' })).toBeDisabled();
});

it('with the labs query failed, gated values stay locked and LAB_LOCKED still shows its text', async () => {
  mocked.mockRejectedValue(new ApiError(500, 'INTERNAL', 'x'));
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  qc.setQueryData(['me'], { player: { id: 'p', email: 'e', displayName: 'a' }, coins: 500, inventory: [], products: [], sessions: [], extractor: { nextClaimAt: null } });
  qc.setQueryData(['catalog'], { chemicals: [], monsters: [] });
  render(<QueryClientProvider client={qc}><BreedingPanel /></QueryClientProvider>);
  await waitFor(() => expect(qc.getQueryState(['labs'])?.status).toBe('error'));
  expect(screen.getByRole('button', { name: /^1000 °C/ })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Bắt đầu' })).toBeDisabled();
  expect(labError(new ApiError(409, 'LAB_LOCKED', 'x', { itemId: 'furnace' }))).toBe('Cần mua furnace trước.');
});

it('a later successful buy clears the stale error', async () => {
  mocked.mockRejectedValueOnce(new ApiError(409, 'LAB_OWNED', 'x'));
  mocked.mockResolvedValue({ itemId: 'furnace', coins: 1 } as never);
  setup(<LabsPanel />);
  fireEvent.click(screen.getByRole('button', { name: 'Mua (150 Xu)' }));
  await screen.findByRole('status');
  fireEvent.click(screen.getByRole('button', { name: 'Mua (150 Xu)' }));
  await waitFor(() => expect(screen.queryByRole('status')).toBeNull());
});
