import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';

vi.mock('../src/api/client', async (orig) => ({ ...(await orig<typeof import('../src/api/client')>()), apiFetch: vi.fn() }));
import { ApiError, apiFetch } from '../src/api/client';
import { BreedingPanel } from '../src/breeding/BreedingPanel';

const mocked = vi.mocked(apiFetch);
const monster = (chemicalId: string) => ({ id: `m-${chemicalId}`, chemicalId, displayName: chemicalId, silhouette: 'orb', color: '#112233', assetKey: chemicalId, rarity: 'common', blurb: '' });

let qcRef: QueryClient;
function setup() {
  const qc = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity } } });
  qc.setQueryData(['me'], { player: { id: 'p', email: 'e', displayName: 'a' }, inventory: [{ chemicalId: 'h2', count: 4 }, { chemicalId: 'o2', count: 2 }], sessions: [], extractor: { nextClaimAt: null } });
  qc.setQueryData(['catalog'], { chemicals: [{ id: 'h2', formula: 'H2' }, { id: 'o2', formula: 'O2' }], monsters: [monster('h2'), monster('o2')] });
  qcRef = qc;
  render(<QueryClientProvider client={qc}><BreedingPanel /></QueryClientProvider>);
}
const pick = (name: string, v: string) => fireEvent.change(screen.getByLabelText(`Chất ${name}`), { target: { value: v } });

beforeEach(() => { mocked.mockReset(); });

it('removes the A species from the B options', () => {
  setup();
  pick('A', 'h2');
  const opts = Array.from(screen.getByLabelText('Chất B').querySelectorAll('option')).map((o) => o.value);
  expect(opts).not.toContain('h2');
  expect(opts).toContain('o2');
});

it('stepper stops at min(4, owned)', () => {
  setup();
  pick('A', 'o2');
  fireEvent.click(screen.getByLabelText('Tăng A'));
  expect(screen.getByLabelText('Số lượng A')).toHaveTextContent('2');
  expect(screen.getByLabelText('Tăng A')).toBeDisabled();
  pick('A', 'h2');
  for (let i = 0; i < 6; i++) fireEvent.click(screen.getByLabelText('Tăng A'));
  expect(screen.getByLabelText('Số lượng A')).toHaveTextContent('4');
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
  qcRef.setQueryData(['me'], { player: { id: 'p', email: 'e', displayName: 'a' }, inventory: [{ chemicalId: 'h2', count: h2 }, { chemicalId: 'o2', count: 2 }], sessions: [], extractor: { nextClaimAt: null } });
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
