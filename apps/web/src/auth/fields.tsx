import { useId, type InputHTMLAttributes } from 'react';

export function Field({
  label,
  error,
  ...props
}: { label: string; error?: string | undefined } & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <div className="mb-3">
      <label htmlFor={id} className="block text-sm">{label}</label>
      <input id={id} required className="w-full rounded border px-2 py-1" {...props} />
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
