import { useState } from 'react';
import { useMe } from './api/queries';
import { LoginForm } from './auth/LoginForm';
import { RegisterForm } from './auth/RegisterForm';
import { LabScreen } from './lab/LabScreen';

function AuthScreen() {
  const [tab, setTab] = useState<'login' | 'register'>('login');
  return (
    <main className="mx-auto max-w-sm p-6">
      <h1 className="mb-4 text-2xl font-bold">CHEMIMON</h1>
      <div role="tablist" className="mb-4 flex gap-2">
        <button role="tab" aria-selected={tab === 'login'} onClick={() => setTab('login')}>Đăng nhập</button>
        <button role="tab" aria-selected={tab === 'register'} onClick={() => setTab('register')}>Đăng ký</button>
      </div>
      {tab === 'login' ? <LoginForm /> : <RegisterForm />}
    </main>
  );
}

export function App() {
  const me = useMe();
  if (me.isPending) return <h1>CHEMIMON</h1>;
  // useMe maps 401 to null; any other failure (server down, 5xx) is not "logged out".
  if (me.isError) {
    return (
      <main className="mx-auto max-w-sm p-6">
        <h1 className="mb-4 text-2xl font-bold">CHEMIMON</h1>
        <p role="alert" className="mb-2">Không kết nối được máy chủ.</p>
        <button type="button" disabled={me.isFetching} onClick={() => void me.refetch()} className="rounded bg-black px-3 py-1 text-white">
          Thử lại
        </button>
      </main>
    );
  }
  if (me.data === null || me.data === undefined) return <AuthScreen />;
  return <LabScreen />;
}
