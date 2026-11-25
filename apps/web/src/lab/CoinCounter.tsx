import { useMe } from '../api/queries';

export function CoinCounter() {
  const coins = useMe().data?.coins ?? 0;
  return <span aria-label="Số Xu" className="rounded bg-amber-400/20 px-2 font-bold text-amber-300">{coins} Xu</span>;
}
