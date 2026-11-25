import { useState } from 'react';
import { formatFormula } from './formatFormula';

/**
 * Picture of a monster for 2D UI. The PNG is rendered by Blender from the same .glb the island shows
 * (art/blender/thumbs.py). A missing or broken file falls back to a coloured disc with the formula.
 */
export function MonsterThumb({ assetKey, color, formula, size = 72 }: {
  assetKey: string;
  color: string;
  formula: string;
  size?: number;
}) {
  const [broken, setBroken] = useState(false);
  if (broken) {
    return (
      <span data-testid="thumb-fallback" aria-hidden
        className="flex items-center justify-center rounded-full text-sm font-bold text-black/70"
        style={{ width: size, height: size, background: color }}>
        {formatFormula(formula)}
      </span>
    );
  }
  return (
    <img src={`/assets/monsters/thumbs/${assetKey}.png`} alt="" width={size} height={size} draggable={false}
      onError={() => setBroken(true)} style={{ width: size, height: size }} />
  );
}
