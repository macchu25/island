import { useEffect, useRef, useState } from 'react';
import { useCollectJob, useWorkshop } from '../api/queries';
import { span } from '../market/span';
import { workshopError } from './errors';

/** Running workshop jobs: "Đang làm X, còn N phút", then "Nhận". After a collect, a result line shows what came back. */
export function JobList({ label = 'Việc đang làm' }: { label?: string }) {
  const data = useWorkshop().data;
  const collect = useCollectJob();
  const busy = useRef(false);
  const [now, setNow] = useState(() => Date.now());
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const running = (data?.jobs ?? []).filter((j) => j.status === 'running');
  if (running.length === 0 && !result && !error) return null;
  const name = (id: string) => data?.products.find((p) => p.id === id)?.name ?? id;
  const doCollect = (id: string) => {
    if (busy.current) return;
    busy.current = true;
    setError(null);
    collect.mutate(id, {
      onSuccess: (body) => setResult(`Nhận về: ${body.product.count} ${name(body.product.productId)}`),
      onError: (e) => { setResult(null); setError(workshopError(e)); },
      onSettled: () => { busy.current = false; },
    });
  };
  return (
    <section aria-label={label} className="rounded bg-black/60 p-3 text-white">
      <ul>
        {running.map((j) => {
          const left = new Date(j.readyAt).getTime() - now;
          return (
            <li key={j.id} data-testid="job" className="mb-1 flex items-center gap-2 text-sm">
              <span className="flex-1">{left > 0 ? `Đang làm ${name(j.productId)}, còn ${span(left)}` : `${name(j.productId)} đã xong`}</span>
              {left <= 0 && <button type="button" disabled={collect.isPending} onClick={() => doCollect(j.id)}>Nhận</button>}
            </li>
          );
        })}
      </ul>
      {result && (
        <div data-testid="job-result" className="mt-1 flex items-start gap-2 text-sm text-emerald-300">
          <p className="flex-1">{result}</p>
          <button type="button" aria-label="Ẩn kết quả" onClick={() => setResult(null)}>✕</button>
        </div>
      )}
      {error && <p role="status" className="text-sm text-amber-300">{error}</p>}
    </section>
  );
}
