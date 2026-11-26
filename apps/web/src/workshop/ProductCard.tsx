import type { Product } from '@chemimon/shared';
import { formatFormula } from '../monsters/formatFormula';
import { span } from '../market/span';
import { ProductThumb } from '../products/ProductThumb';

export type ProductView = Product & { unlocked: boolean };

/** One craftable product: recipe, time, line, floor price, and the start / buy-blueprint button. */
export function ProductCard({ product, formulas, canCraft, slotsFull, busy, onStart, onBuy }: {
  product: ProductView;
  /** chemicalId to formula. */
  formulas: Map<string, string>;
  canCraft: boolean;
  slotsFull: boolean;
  busy: boolean;
  onStart(): void;
  onBuy(): void;
}) {
  const recipe = product.ingredients.map((i) => `${i.count} ${formatFormula(formulas.get(i.chemicalId) ?? i.chemicalId)}`).join(', ');
  const reason = !canCraft ? 'Thiếu nguyên liệu' : slotsFull ? 'Hết chỗ' : null;
  return (
    <div data-testid="product" role="group" aria-label={product.name} className="flex flex-wrap items-center gap-3 rounded-lg bg-white/5 p-3">
      <ProductThumb assetKey={product.assetKey} name={product.name} size={64} />
      <div className="min-w-40 flex-1 text-sm">
        <p className="font-bold">{product.name}</p>
        <p>Công thức chế tạo: {recipe}</p>
        <p>Thời gian: {span(product.durationS * 1000)}</p>
        <p className="italic">“{product.line}”</p>
        <p>Giá sàn: {product.floorPrice} Xu</p>
      </div>
      <div className="flex flex-col items-end gap-1">
        {product.unlocked ? (
          <>
            <button type="button" disabled={busy || reason !== null} onClick={onStart}
              className="rounded bg-emerald-600 px-3 py-1 font-bold disabled:opacity-50">Chế tạo</button>
            {reason && <span className="text-xs text-amber-300">{reason}</span>}
          </>
        ) : (
          <button type="button" disabled={busy} onClick={onBuy}
            className="rounded bg-amber-600 px-3 py-1 font-bold disabled:opacity-50">Mua bản vẽ ({product.blueprintPrice} Xu)</button>
        )}
      </div>
    </div>
  );
}
