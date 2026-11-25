import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
import { App } from '../src/App';
import { useUi } from '../src/state/ui';

afterEach(() => vi.unstubAllGlobals());

const me = {
  player: { id: 'p1', email: 'a@b.co', displayName: 'alice' },
  coins: 0,
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

it('logout and the next login purge the previous player cache and refetch /api/me', async () => {
  let session: 'alice' | 'none' | 'bob' = 'alice';
  const bob = { ...me, player: { id: 'p2', email: 'b@b.co', displayName: 'bob' } };
  const f = vi.fn(async (path: string) => {
    if (path === '/api/auth/logout') { session = 'none'; return new Response(null, { status: 204 }); }
    if (path === '/api/auth/login') { session = 'bob'; return json(200, bob); }
    if (path === '/api/me') return session === 'alice' ? json(200, me) : session === 'bob' ? json(200, bob) : unauth();
    return json(500, { error: { code: 'INTERNAL', message: 'x' } });
  });
  vi.stubGlobal('fetch', f);
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  qc.setQueryData(['codex'], { entries: [{ chemicalId: 'h2o', state: 'discovered', count: 2, firstDiscoverer: null }] });
  render(<QueryClientProvider client={qc}><App /></QueryClientProvider>);
  const u = userEvent.setup();
  await screen.findByRole('button', { name: 'Đăng xuất' });
  act(() => useUi.getState().open('table'));
  await u.click(screen.getByRole('button', { name: 'Đăng xuất' }));
  await screen.findByRole('tab', { name: 'Đăng nhập' });
  expect(useUi.getState().panel).toBe('none');
  expect(qc.getQueryData(['codex'])).toBeUndefined();
  expect(qc.getQueryData(['me'])).toBeNull();

  qc.setQueryData(['codex'], { entries: [] }); // stale leftover that must not survive the login
  await u.type(screen.getByLabelText('Email'), 'b@b.co');
  await u.type(screen.getByLabelText('Mật khẩu'), 'password1');
  await u.click(screen.getByRole('button', { name: 'Đăng nhập' }));
  expect(await screen.findByText('bob')).toBeInTheDocument();
  expect(qc.getQueryData(['codex'])).toBeUndefined();
  const calls = f.mock.calls.map((c) => c[0]);
  expect(calls.lastIndexOf('/api/me')).toBeGreaterThan(calls.indexOf('/api/auth/login'));
});

it('non-401 /me failure shows a connection error with retry, not the login form', async () => {
  let up = false;
  setup((path) => {
    if (path !== '/api/me') return unauth();
    return up ? json(200, me) : new Response('Bad Gateway', { status: 502 });
  });
  expect(await screen.findByText('Không kết nối được máy chủ.')).toBeInTheDocument();
  expect(screen.queryByRole('tab', { name: 'Đăng nhập' })).toBeNull();
  up = true;
  await userEvent.setup().click(screen.getByRole('button', { name: 'Thử lại' }));
  expect(await screen.findByText('alice')).toBeInTheDocument();
});

it('a failed background /me refetch keeps the lab instead of the error screen', async () => {
  let up = true;
  const f = vi.fn(async (path: string) =>
    path === '/api/me' ? (up ? json(200, me) : new Response('Bad Gateway', { status: 502 })) : unauth(),
  );
  vi.stubGlobal('fetch', f);
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={qc}><App /></QueryClientProvider>);
  expect(await screen.findByText('alice')).toBeInTheDocument();
  up = false;
  await act(async () => {
    await qc.refetchQueries({ queryKey: ['me'] });
    await new Promise((r) => setTimeout(r, 50)); // let the observer notification render
  });
  expect(qc.getQueryState(['me'])?.status).toBe('error');
  expect(screen.getByText('alice')).toBeInTheDocument();
  expect(screen.queryByText('Không kết nối được máy chủ.')).toBeNull();
});
