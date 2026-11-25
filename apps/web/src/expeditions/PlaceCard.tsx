import { expeditionYield, habitatFor, type Place } from '@chemimon/shared';
import type { CatalogResponse } from '@chemimon/shared';
import { formatFormula } from '../monsters/formatFormula';
import { MonsterThumb } from '../monsters/MonsterThumb';

export interface OwnedMonster {
  id: string;
  name: string;
  formula: string;
  color: string;
  assetKey: string;
  count: number;
}

const minutes = (s: number) => (s % 60 === 0 ? `${s / 60} phút` : `${Math.floor(s / 60)} phút ${s % 60} giây`);

/** One place: drops, time, fee, and either "Gửi quái" (with a picture picker) or the permit button. */
export function PlaceCard({ place, unlocked, picking, owned, catalog, busy, onPick, onTogglePicker, onBuyPermit }: {
  place: Place;
  unlocked: boolean;
  picking: boolean;
  owned: OwnedMonster[];
  catalog: CatalogResponse | undefined;
  busy: boolean;
  onPick(chemicalId: string): void;
  onTogglePicker(): void;
  onBuyPermit(): void;
}) {
  const fmt = (id: string) => {
    const f = catalog?.chemicals.find((c) => c.id === id)?.formula;
    return f ? formatFormula(f) : id;
  };
  const drops = (list: { chemicalId: string; count: number }[]) => list.map((d) => `${d.count}×${fmt(d.chemicalId)}`).join(', ');
  return (
    <div data-testid="place" className="flex flex-col gap-2 rounded-lg bg-white/5 p-3">
      <div className="flex flex-wrap items-center gap-3">
        <span className="min-w-40 flex-1">
          <span className="block font-bold">{place.name}</span>
          <span className="text-xs opacity-80">
            {drops(place.drops)} · {minutes(place.durationS)} · {place.fee > 0 ? `phí ${place.fee} Xu` : 'miễn phí'}
          </span>
        </span>
        {unlocked ? (
          <button type="button" onClick={onTogglePicker} aria-expanded={picking}
            className="rounded bg-emerald-600 px-3 py-1 font-bold">Gửi quái</button>
        ) : (
          <button type="button" disabled={busy} onClick={onBuyPermit}
            className="rounded bg-amber-600 px-3 py-1 font-bold disabled:opacity-50">Mua giấy phép · {place.permitPrice} Xu</button>
        )}
      </div>
      {unlocked && picking && (
        owned.length === 0 ? <p className="text-sm opacity-80">Bạn chưa có quái nào để gửi.</p> : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(6.5rem,1fr))] gap-2">
            {owned.map((o) => {
              const chem = catalog?.chemicals.find((c) => c.id === o.id);
              const habitat = chem ? habitatFor(chem) : undefined;
              const bonus = habitat === place.bonusHabitat;
              const yields = habitat ? expeditionYield(place, habitat) : place.drops;
              return (
                <button key={o.id} type="button" data-testid={`pick-${o.id}`} disabled={busy}
                  aria-label={`${o.name} ${formatFormula(o.formula)}, có ${o.count}`} onClick={() => onPick(o.id)}
                  className="relative flex flex-col items-center rounded-lg bg-white/5 p-1 hover:bg-white/15 disabled:opacity-50">
                  <span className="absolute right-1 top-0.5 text-xs font-bold">×{o.count}</span>
                  <MonsterThumb assetKey={o.assetKey} color={o.color} formula={o.formula} size={64} />
                  <span className="w-full truncate text-xs font-bold">{o.name}</span>
                  <span className="text-xs">{drops(yields)}{bonus && <b className="ml-1 text-emerald-300">+50%</b>}</span>
                </button>
              );
            })}
          </div>
        )
      )}
    </div>
  );
}
