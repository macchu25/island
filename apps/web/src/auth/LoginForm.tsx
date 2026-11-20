import { useState, type FormEvent } from 'react';
import { ApiError } from '../api/client';
import { useLogin } from '../api/queries';
import { Field } from './fields';

export function LoginForm() {
  const login = useLogin();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const err = login.error instanceof ApiError ? login.error : null;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    login.mutate({ email, password });
  };

  return (
    <form onSubmit={submit}>
      <Field label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <Field label="Mật khẩu" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      {login.error && (
        <p role="alert" className="text-sm text-red-600">
          {err?.code === 'INVALID_CREDENTIALS' ? 'Email hoặc mật khẩu không đúng' : 'Đăng nhập thất bại, thử lại'}
        </p>
      )}
      <button type="submit" disabled={login.isPending} className="rounded bg-black px-3 py-1 text-white">
        Đăng nhập
      </button>
    </form>
  );
}
