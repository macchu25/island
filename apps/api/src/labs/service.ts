import { CATALYSTS, catalystItemId, usefulItems, type Economy, type Lab, type LabItemView } from '@chemimon/shared';
import type { AppDeps } from '../app';
import { lockPlayer } from '../player/grant';
import { applyCoins } from '../wallet/ledger';

export type LabItem = Omit<LabItemView, 'owned' | 'useful'>;

export type BuyLabOutcome =
  | { kind: 'UNKNOWN_LAB' }
  | { kind: 'LAB_OWNED' }
  | { kind: 'LAB_USELESS' }
  | { kind: 'INSUFFICIENT_COINS'; needed: number; have: number }
  | { kind: 'BOUGHT'; coins: number };

const TX_OPTS = { maxWait: 10_000, timeout: 15_000 };

/** Activation values as they read inside "Mở ..." (lowercase Vietnamese). */
const ACTIVATION_VI: Record<string, string> = { none: 'không', spark: 'tia lửa', light: 'ánh sáng', electric: 'điện phân' };

/** −78 with a real minus sign (U+2212), as the player reads it. */
const celsius = (v: number) => `${v < 0 ? `−${-v}` : v} °C`;
const joinVi = (parts: string[]) =>
  parts.length <= 1 ? parts.join('') : `${parts.slice(0, -1).join(', ')} và ${parts[parts.length - 1]}`;

/** "Mở 1000 °C và 2500 °C", built from the lab's unlocks in economy.yaml. */
function opensText(lab: Lab): string {
  const parts = [
    ...(lab.unlocks.temperatureC ?? []).map(celsius),
    ...(lab.unlocks.pressureAtm ?? []).map((v) => `${v} atm`),
    ...(lab.unlocks.activation ?? []).map((v) => ACTIVATION_VI[v] ?? v),
  ];
  return `Mở ${joinVi(parts)}`;
}

/** Every item the lab screen sells: labs in economy.yaml order, then each paid catalyst in CATALYSTS order. */
export function labItems(economy: Economy): LabItem[] {
  const labs = economy.labs.map((l) => ({ id: l.id, kind: 'lab' as const, name: l.name, opens: opensText(l), price: l.price }));
  const catalysts = CATALYSTS.flatMap((c) =>
    c === 'none' ? [] : [{ id: catalystItemId(c), kind: 'catalyst' as const, name: `Xúc tác ${c}`, opens: `Mở xúc tác ${c}`, price: economy.catalystPrices[c] }]);
  return [...labs, ...catalysts];
}

/** Useful against the catalog this server loaded (drafts only when CONTENT_INCLUDE_DRAFTS=1). */
const usefulFor = (deps: AppDeps) => usefulItems(deps.catalog.reactions, deps.economy.labs);

export async function listLabs(deps: AppDeps, playerId: string): Promise<LabItemView[]> {
  const rows = await deps.db.playerLab.findMany({ where: { playerId }, select: { itemId: true } });
  const owned = new Set(rows.map((r) => r.itemId));
  const useful = usefulFor(deps);
  return labItems(deps.economy).map((i) => ({ ...i, owned: owned.has(i.id), useful: useful.has(i.id) }));
}

/** Check order (Global Constraints): known item, not owned, useful, enough Xu; then charge and insert. */
export async function buyLab(deps: AppDeps, playerId: string, itemId: string): Promise<BuyLabOutcome> {
  const item = labItems(deps.economy).find((i) => i.id === itemId);
  if (!item) return { kind: 'UNKNOWN_LAB' };
  return deps.db.$transaction(async (tx) => {
    await lockPlayer(tx, playerId);
    // Under the player lock a concurrent second buy waits here and then sees the first one's row.
    if ((await tx.playerLab.count({ where: { playerId, itemId } })) > 0) return { kind: 'LAB_OWNED' } as const;
    if (!usefulFor(deps).has(itemId)) return { kind: 'LAB_USELESS' } as const;
    // ref_id = item id: the unique (player_id, reason, ref_id) index is the last guard against a second charge.
    const paid = await applyCoins(tx, playerId, -item.price, 'lab', itemId);
    if (!paid.ok) return { kind: 'INSUFFICIENT_COINS', needed: item.price, have: paid.balance } as const;
    await tx.playerLab.create({ data: { playerId, itemId, boughtAt: deps.now() } });
    return { kind: 'BOUGHT', coins: paid.balance } as const;
  }, TX_OPTS);
}
