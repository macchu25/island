import { useEffect, useState } from 'react';

/** Picture of a product. A missing or broken file falls back to a coloured tile with the name. */
export function ProductThumb({ assetKey, name, size = 72 }: { assetKey: string; name: string; size?: number }) {
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [assetKey]);
  if (broken) {
    return (
      <span data-testid="product-thumb-fallback" aria-hidden
        className="flex items-center justify-center rounded-lg bg-slate-500 p-1 text-center text-xs font-bold leading-tight text-white"
        style={{ width: size, height: size }}>
        {name}
      </span>
    );
  }
  return (
    <img src={`/assets/products/thumbs/${assetKey}.png`} alt="" width={size} height={size} draggable={false}
      onError={() => setBroken(true)} style={{ width: size, height: size }} />
  );
}
