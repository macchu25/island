import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';

vi.mock('../src/api/client', async (orig) => ({ ...(await orig<typeof import('../src/api/client')>()), apiFetch: vi.fn() }));
import { ApiError, apiFetch } from '../src/api/client';
import { BreedingPanel } from '../src/breeding/BreedingPanel';
import { useUi } from '../src/state/ui';

const mocked = vi.mocked(apiFetch);
const monster = (chemicalId: string) => ({ id: `m-${chemicalId}`, chemicalId, displayName: `Mon-${chemicalId}`, silhouette: 'orb', color: '#112233', assetKey: chemicalId, rarity: 'common', blurb: '' });

let qcRef: QueryClient;
function setup() {
  const qc = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity } } });
  qc.setQueryData(['me'], { player: { id: 'p', email: 'e', displayName: 'a' }, coins: 0, inventory: [{ chemicalId: 'h2', count: 4 }, { chemicalId: 'o2', count: 2 }], sessions: [], extractor: { nextClaimAt: null } });
  qc.setQueryData(['catalog'], { chemicals: [{ id: 'h2', formula: 'H2' }, { id: 'o2', formula: 'O2' }], monsters: [monster('h2'), monster('o2')] });
  qcRef = qc;
  render(<QueryClientProvider client={qc}><BreedingPanel /></QueryClientProvider>);
}
const card = (id: string) => screen.getByTestId(`pick-${id}`);
// Old tests picked A then B; with pictures, tapping cards in that order fills A then B.
const pick = (_slot: string, id: string) => fireEvent.click(card(id));

beforeEach(() => { mocked.mockReset(); useUi.setState({ panel: 'breeding', selectedChemicalId: null, pulse: null }); });

it('shows a picture card for every owned species, with name, formula and count', () => {
  setup();
  const h2 = card('h2');
  expect(h2.querySelector('img')).toHaveAttribute('src', '/assets/monsters/thumbs/h2.png');
  expect(h2).toHaveTextContent('Mon-h2');
  expect(h2).toHaveTextContent('H₂');
  expect(h2).toHaveTextContent('×4');
  expect(card('o2')).toHaveTextContent('×2');
});

it('a broken picture falls back to a coloured disc with the formula', () => {
  setup();
  fireEvent.error(card('o2').querySelector('img')!);
  expect(card('o2').querySelector('img')).toBeNull();
  expect(card('o2').querySelector('[data-testid="thumb-fallback"]')).toHaveTextContent('O₂');
});

it('tapping cards fills A then B; tapping a picked card takes it out and B moves up to A', () => {
  setup();
  fireEvent.click(card('h2'));
  expect(screen.getByTestId('slot-A')).toHaveTextContent('Mon-h2');
  expect(card('h2')).toHaveAttribute('aria-pressed', 'true');
  fireEvent.click(card('o2'));
  expect(screen.getByTestId('slot-B')).toHaveTextContent('Mon-o2');
  fireEvent.click(card('h2'));
  expect(screen.getByTestId('slot-A')).toHaveTextContent('Mon-o2');
  expect(screen.queryByLabelText('Số lượng B')).toBeNull();
  expect(card('h2')).toHaveAttribute('aria-pressed', 'false');
});

it('stepper stops at min(4, owned)', () => {
  setup();
  pick('A', 'o2');
  fireEvent.click(screen.getByLabelText('Tăng A'));
  expect(screen.getByLabelText('Số lượng A')).toHaveTextContent('2');
  expect(screen.getByLabelText('Tăng A')).toBeDisabled();
  fireEvent.click(screen.getByLabelText('Bỏ A'));
  pick('A', 'h2');
  for (let i = 0; i < 6; i++) fireEvent.click(screen.getByLabelText('Tăng A'));
  expect(screen.getByLabelText('Số lượng A')).toHaveTextContent('4');
});

it('a started session closes the breeding room; Escape and the close button close it too', async () => {
  mocked.mockResolvedValue({ status: 'STARTED', session: {} } as never);
  setup();
  pick('A', 'h2');
  fireEvent.click(screen.getByRole('button', { name: 'Bắt đầu' }));
  await waitFor(() => expect(useUi.getState().panel).toBe('none'));
  act(() => useUi.setState({ panel: 'breeding' }));
  fireEvent.keyDown(window, { key: 'Escape' });
  expect(useUi.getState().panel).toBe('none');
  act(() => useUi.setState({ panel: 'breeding' }));
  fireEvent.click(screen.getByRole('button', { name: 'Đóng' }));
  expect(useUi.getState().panel).toBe('none');
  act(() => useUi.setState({ panel: 'breeding' }));
  fireEvent.click(screen.getByRole('dialog'));
  expect(useUi.getState().panel).toBe('breeding');
  fireEvent.click(screen.getByTestId('breeding-backdrop'));
  expect(useUi.getState().panel).toBe('none');
});

it('with no monsters it says how to get one', () => {
  const qc = new QueryClient();
  qc.setQueryData(['me'], { player: { id: 'p', email: 'e', displayName: 'a' }, coins: 0, inventory: [], sessions: [], extractor: { nextClaimAt: null } });
  qc.setQueryData(['catalog'], { chemicals: [], monsters: [] });
  render(<QueryClientProvider client={qc}><BreedingPanel /></QueryClientProvider>);
  expect(screen.getByText('Bạn chưa có quái nào. Dùng Máy chiết nguyên tố để nhận quái.')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Bắt đầu' })).toBeDisabled();
});

it('posts the exact request once on double click', async () => {
  let resolve!: (v: unknown) => void;
  mocked.mockReturnValue(new Promise((r) => { resolve = r; }) as never);
  setup();
  pick('A', 'h2'); pick('B', 'o2');
  const btn = screen.getByRole('button', { name: 'Bắt đầu' });
  fireEvent.click(btn); fireEvent.click(btn);
  await waitFor(() => expect(mocked).toHaveBeenCalledTimes(1));
  fireEvent.click(btn);
  expect(mocked).toHaveBeenCalledTimes(1);
  const init = mocked.mock.calls[0]![2] as RequestInit;
  expect(mocked.mock.calls[0]![0]).toBe('/api/breeding');
  expect(JSON.parse(init.body as string)).toEqual({
    inputs: [{ chemicalId: 'h2', count: 1 }, { chemicalId: 'o2', count: 1 }],
    conditions: { temperatureC: 25, pressureAtm: 1, catalyst: 'none', environment: 'air', activation: 'none' },
  });
  resolve({ status: 'NO_REACTION' });
  await screen.findByText('Không có phản ứng. Thử đổi điều kiện hoặc tỷ lệ.');
});

it('shows SLOTS_FULL message', async () => {
  mocked.mockRejectedValue(new ApiError(409, 'SLOTS_FULL', 'x'));
  setup();
  pick('A', 'h2');
  fireEvent.click(screen.getByRole('button', { name: 'Bắt đầu' }));
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Cả 2 máy đang chạy. Chờ một máy xong nhé.'));
});

const setOwned = (h2: number) => act(() => {
  qcRef.setQueryData(['me'], { player: { id: 'p', email: 'e', displayName: 'a' }, coins: 0, inventory: [{ chemicalId: 'h2', count: h2 }, { chemicalId: 'o2', count: 2 }], sessions: [], extractor: { nextClaimAt: null } });
});

it('clamps count when owned drops and empties the slot at 0', async () => {
  mocked.mockReturnValue(new Promise(() => {}) as never);
  setup();
  pick('A', 'h2');
  for (let i = 0; i < 2; i++) fireEvent.click(screen.getByLabelText('Tăng A'));
  expect(screen.getByLabelText('Số lượng A')).toHaveTextContent('3');
  setOwned(2);
  await waitFor(() => expect(screen.getByLabelText('Số lượng A')).toHaveTextContent('2'));
  fireEvent.click(screen.getByRole('button', { name: 'Bắt đầu' }));
  await waitFor(() => expect(mocked).toHaveBeenCalledTimes(1));
  expect(JSON.parse((mocked.mock.calls[0]![2] as RequestInit).body as string).inputs).toEqual([{ chemicalId: 'h2', count: 2 }]);
  setOwned(0);
  await waitFor(() => expect(screen.queryByLabelText('Số lượng A')).toBeNull());
  expect(screen.getByRole('button', { name: 'Bắt đầu' })).toBeDisabled();
});

it('shows Vietnamese condition labels', () => {
  setup();
  expect(screen.getByRole('button', { name: 'Khí trơ' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: '25 °C' })).toBeInTheDocument();
});
