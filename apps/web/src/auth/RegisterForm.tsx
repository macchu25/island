import { useState, type FormEvent } from 'react';
import { ApiError } from '../api/client';
import { useRegister } from '../api/queries';
import { Field } from './fields';

export function RegisterForm() {
  const reg = useRegister();
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const err = reg.error instanceof ApiError ? reg.error : null;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    reg.mutate({ email, password, displayName });
  };

  return (
    <form onSubmit={submit}>
      <Field label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
        error={err?.code === 'EMAIL_TAKEN' ? 'Email đã được đăng ký' : undefined} />
      <Field label="Tên hiển thị" value={displayName} onChange={(e) => setDisplayName(e.target.value)}
        minLength={3} maxLength={20} pattern="[A-Za-z0-9_]+"
        error={err?.code === 'DISPLAY_NAME_TAKEN' ? 'Tên hiển thị đã có người dùng' : undefined} />
      <Field label="Mật khẩu" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
        minLength={8} maxLength={128} />
      {reg.error && err?.code !== 'EMAIL_TAKEN' && err?.code !== 'DISPLAY_NAME_TAKEN' && (
        <p role="alert" className="text-sm text-red-600">Đăng ký thất bại, thử lại</p>
      )}
      <button type="submit" disabled={reg.isPending} className="rounded bg-black px-3 py-1 text-white">
        Đăng ký
      </button>
    </form>
  );
}
