import { EXTRACTOR_CAP, STARTER_ELEMENTS } from '@chemimon/shared';
import { useEffect, useState } from 'react';
import { ApiError } from '../api/client';
import { useCatalog, useClaimExtractor, useMe } from '../api/queries';
import { formatFormula } from '../monsters/formatFormula';
import { PULSE_CLASSES, useUi } from '../state/ui';

const ERRORS: Record<string, string> = {
  EXTRACTOR_NOT_ELIGIBLE: 'Nguyên tố này không nhận được.',
  EXTRACTOR_COOLDOWN: 'Máy chiết xuất đang nghỉ, hãy chờ thêm.',
  EXTRACTOR_CAP: 'Bạn đã có đủ 12 nguyên tố này.',
};

export function ExtractorButton() {
  const me = useMe().data;
  const catalog = useCatalog().data;
  const optionLabel = (chemicalId: string) => {
    const chem = catalog?.chemicals.find((c) => c.id === chemicalId);
    return chem ? `${formatFormula(chem.formula)} · ${chem.name}` : chemicalId;
  };
  const claim = useClaimExtractor();
  const pulsing = useUi((s) => s.pulse === 'extractor');
  const [id, setId] = useState<string>(STARTER_ELEMENTS[0]);
  const [now, setNow] = useState(() => Date.now());
  const next = me?.extractor.nextClaimAt ? Date.parse(me.extractor.nextClaimAt) : 0;
  useEffect(() => {
    if (next <= Date.now()) return;
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, [next]);
  const wait = Math.max(0, Math.ceil((next - now) / 1000));
  const count = me?.inventory.find((s) => s.chemicalId === id)?.count ?? 0;
  const capped = count >= EXTRACTOR_CAP;
  const label = capped ? `Đã đủ ${EXTRACTOR_CAP}` : wait > 0 ? `Chờ ${wait}s` : 'Nhận';
  const err = claim.error instanceof ApiError ? (ERRORS[claim.error.code] ?? claim.error.message) : claim.error ? 'Lỗi không xác định.' : null;
  return (
    <div data-testid="extractor" data-pulse={pulsing || undefined} className={`flex flex-col gap-1 rounded bg-black/50 p-2 text-white ${pulsing ? PULSE_CLASSES : ''}`}>
      <div className="flex gap-2">
        <select aria-label="Nguyên tố" value={id} onChange={(e) => setId(e.target.value)} className="text-black">
          {STARTER_ELEMENTS.map((e) => <option key={e} value={e}>{optionLabel(e)}</option>)}
        </select>
        <button disabled={capped || wait > 0 || claim.isPending} onClick={() => claim.mutate({ chemicalId: id })}>{label}</button>
      </div>
      {err && <p role="alert" className="text-red-300">{err}</p>}
    </div>
  );
}
