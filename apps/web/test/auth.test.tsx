import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
import { App } from '../src/App';

afterEach(() => vi.unstubAllGlobals());

const me = {
  player: { id: 'p1', email: 'a@b.co', displayName: 'alice' },
  inventory: [],
  sessions: [],
  extractor: { nextClaimAt: null },
};
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

function setup(handler: (path: string, init?: RequestInit) => Response) {
  const f = vi.fn(async (path: string, init?: RequestInit) => handler(path, init));
  vi.stubGlobal('fetch', f);
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={qc}>
      <App />
    </QueryClientProvider>,
  );
  return f;
}

const unauth = () => json(401, { error: { code: 'UNAUTHORIZED', message: 'x' } });

async function fillRegister() {
  const u = userEvent.setup();
  await screen.findByText('CHEMIMON');
  await u.click(await screen.findByRole('tab', { name: 'Đăng ký' }));
  await u.type(screen.getByLabelText('Email'), 'a@b.co');
  await u.type(screen.getByLabelText('Tên hiển thị'), 'alice');
  await u.type(screen.getByLabelText('Mật khẩu'), 'password1');
  await u.click(screen.getByRole('button', { name: 'Đăng ký' }));
}

it('register posts body and shows lab on success', async () => {
  let registered = false;
  const f = setup((path) => {
    if (path === '/api/auth/register') {
      registered = true;
      return json(201, me);
    }
    return registered ? json(200, me) : unauth();
  });
  await fillRegister();
  expect(await screen.findByText('alice')).toBeInTheDocument();
  const call = f.mock.calls.find((c) => c[0] === '/api/auth/register')!;
  expect(call[1]!.method).toBe('POST');
  expect(JSON.parse(call[1]!.body as string)).toEqual({
    email: 'a@b.co',
    password: 'password1',
    displayName: 'alice',
  });
});

it('shows inline error for DISPLAY_NAME_TAKEN', async () => {
  setup((path) =>
    path === '/api/auth/register'
      ? json(409, { error: { code: 'DISPLAY_NAME_TAKEN', message: 'x' } })
      : unauth(),
  );
  await fillRegister();
  await waitFor(() => expect(screen.getByText('Tên hiển thị đã có người dùng')).toBeInTheDocument());
  expect(screen.queryByText('Phòng thí nghiệm')).toBeNull();
});
