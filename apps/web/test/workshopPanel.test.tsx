import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';

vi.mock('../src/api/client', async (orig) => ({ ...(await orig<typeof import('../src/api/client')>()), apiFetch: vi.fn() }));
import { ApiError, apiFetch } from '../src/api/client';
import { useUi } from '../src/state/ui';
import { WorkshopPanel } from '../src/workshop/WorkshopPanel';

const mocked = vi.mocked(apiFetch);
const product = (id: string, name: string, over: Record<string, unknown> = {}) => ({
  id, name, ingredients: [{ chemicalId: 'al', count: 2 }], durationS: 120, blueprintPrice: 0, floorPrice: 5, line: 'đựng nước ngọt', assetKey: id, unlocked: true, ...over,
});
const job = (id: string, readyInMs: number) => ({ id, productId: 'can', status: 'running', startedAt: new Date().toISOString(), readyAt: new Date(Date.now() + readyInMs).toISOString() });

function setup(opts: { al?: number; jobs?: unknown[]; coins?: number } = {}) {
  const qc = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } });
  qc.setQueryData(['me'], { player: { id: 'p', email: 'e', displayName: 'a' }, coins: opts.coins ?? 10, inventory: [{ chemicalId: 'al', count: opts.al ?? 2 }], products: [{ productId: 'can', count: 3 }], sessions: [], extractor: { nextClaimAt: null } });
  qc.setQueryData(['catalog'], { chemicals: [
    { id: 'al', formula: 'Al', name: 'Nhôm', kind: 'element', family: 'metal', phaseAt25C: 'solid' },
    { id: 'naoh', formula: 'NaOH', name: 'Xút', kind: 'compound', family: 'base', phaseAt25C: 'solid' },
  ], monsters: [] });
  qc.setQueryData(['workshop'], {
    products: [product('can', 'Lon nhôm'), product('soap', 'Bánh xà phòng', { ingredients: [{ chemicalId: 'naoh', count: 2 }], blueprintPrice: 30, unlocked: false, durationS: 300 })],
    jobs: opts.jobs ?? [],
  });
  render(<QueryClientProvider client={qc}><WorkshopPanel /></QueryClientProvider>);
}

beforeEach(() => { mocked.mockReset(); useUi.setState({ panel: 'workshop', selectedChemicalId: null, pulse: null }); });

it('renders the card copy, unlocked and locked', () => {
  setup();
  expect(screen.getByRole('dialog', { name: 'Xưởng chế tạo' })).toBeInTheDocument();
  expect(screen.getByText('Công thức chế tạo: 2 Al')).toBeInTheDocument();
  expect(screen.getByText('Thời gian: 2 phút')).toBeInTheDocument();
  expect(screen.getAllByText('“đựng nước ngọt”').length).toBe(2);
  expect(screen.getAllByText('Giá sàn: 5 Xu').length).toBe(2);
  expect(screen.getByRole('button', { name: 'Chế tạo' })).toBeEnabled();
  expect(screen.getByRole('button', { name: 'Mua bản vẽ (30 Xu)' })).toBeInTheDocument();
  const img = document.querySelector('img')!;
  expect(img.getAttribute('src')).toBe('/assets/products/thumbs/can.png');
  fireEvent.error(img);
  expect(screen.getAllByTestId('product-thumb-fallback')[0]).toHaveTextContent('Lon nhôm');
});

it('disables Chế tạo with "Thiếu nguyên liệu" when short', () => {
  setup({ al: 1 });
  expect(screen.getByRole('button', { name: 'Chế tạo' })).toBeDisabled();
  expect(screen.getByText('Thiếu nguyên liệu')).toBeInTheDocument();
});

it('disables Chế tạo with "Hết chỗ" when 2 jobs run', () => {
  setup({ jobs: [job('a', 60_000), job('b', 60_000)] });
  expect(screen.getByRole('button', { name: 'Chế tạo' })).toBeDisabled();
  expect(screen.getByText('Hết chỗ')).toBeInTheDocument();
});

it('lists a running job with the remaining time', () => {
  setup({ jobs: [job('a', 50_000)] });
  expect(screen.getByText('Đang làm Lon nhôm, còn 1 phút')).toBeInTheDocument();
});

it('collects a ready job and shows the result', async () => {
  mocked.mockResolvedValue({ product: { productId: 'can', count: 1 } });
  setup({ jobs: [job('a', -1000)] });
  fireEvent.click(screen.getByRole('button', { name: 'Nhận' }));
  await waitFor(() => expect(screen.getByText('Nhận về: 1 Lon nhôm')).toBeInTheDocument());
  expect(mocked.mock.calls[0]![0]).toBe('/api/workshop/jobs/a/collect');
});

it('a double click starts one job', async () => {
  mocked.mockImplementation(() => new Promise(() => {}));
  setup();
  const b = screen.getByRole('button', { name: 'Chế tạo' });
  fireEvent.click(b); fireEvent.click(b);
  await waitFor(() => expect(mocked.mock.calls.filter((c) => c[0] === '/api/workshop/jobs')).toHaveLength(1));
  expect(JSON.parse((mocked.mock.calls[0]![2] as { body: string }).body)).toEqual({ productId: 'can' });
});

it('a double click buys one blueprint', async () => {
  mocked.mockImplementation(() => new Promise(() => {}));
  setup({ coins: 100 });
  const b = screen.getByRole('button', { name: 'Mua bản vẽ (30 Xu)' });
  fireEvent.click(b); fireEvent.click(b);
  await waitFor(() => expect(mocked.mock.calls.filter((c) => c[0] === '/api/workshop/blueprints')).toHaveLength(1));
});

it.each([
  ['BLUEPRINT_LOCKED', 'Chưa có bản vẽ.'],
  ['INSUFFICIENT_MONSTERS', 'Thiếu nguyên liệu.'],
  ['SLOTS_FULL', 'Xưởng đang bận cả 2 chỗ.'],
  ['INSUFFICIENT_PRODUCTS', 'Không đủ hàng.'],
  ['INTERNAL', 'Có lỗi, thử lại.'],
])('start refusal %s shows copy', async (code, text) => {
  mocked.mockRejectedValueOnce(new ApiError(409, code as never, 'x'));
  setup();
  fireEvent.click(screen.getByRole('button', { name: 'Chế tạo' }));
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(text));
});

it('blueprint refusals: owned and short of coins', async () => {
  mocked.mockRejectedValueOnce(new ApiError(409, 'BLUEPRINT_OWNED', 'x'));
  setup({ coins: 10 });
  fireEvent.click(screen.getByRole('button', { name: 'Mua bản vẽ (30 Xu)' }));
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Đã có bản vẽ này.'));
  mocked.mockRejectedValueOnce(new ApiError(409, 'INSUFFICIENT_COINS', 'x'));
  fireEvent.click(screen.getByRole('button', { name: 'Mua bản vẽ (30 Xu)' }));
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Thiếu Xu: cần 30, có 10.'));
});

it('collect result shows the amount collected (1), not the stock (3)', async () => {
  mocked.mockResolvedValueOnce({ product: { productId: 'can', count: 1 } });
  setup({ jobs: [job('a', -1000)] });
  fireEvent.click(screen.getByRole('button', { name: 'Nhận' }));
  await waitFor(() => expect(screen.getByText('Nhận về: 1 Lon nhôm')).toBeInTheDocument());
});
