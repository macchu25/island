import { ELEMENT_SYMBOLS } from '@chemimon/chem-engine';

export interface Cell { row: number; col: number; symbol: string }

const symbols = [...ELEMENT_SYMBOLS]; // insertion order = atomic number order

function position(z: number): { row: number; col: number } {
  if (z === 1) return { row: 1, col: 1 };
  if (z === 2) return { row: 1, col: 18 };
  if (z >= 57 && z <= 71) return { row: 9, col: z - 57 + 3 };
  if (z >= 89 && z <= 103) return { row: 10, col: z - 89 + 3 };
  const blocks: [number, number, number, number][] = [
    // [firstZ, lastZ, row, firstCol]
    [3, 4, 2, 1], [5, 10, 2, 13], [11, 12, 3, 1], [13, 18, 3, 13],
    [19, 36, 4, 1], [37, 54, 5, 1], [55, 56, 6, 1], [72, 86, 6, 4],
    [87, 88, 7, 1], [104, 118, 7, 4],
  ];
  const b = blocks.find(([a, c]) => z >= a && z <= c)!;
  return { row: b[2], col: b[3] + (z - b[0]) };
}

export const periodicLayout: Record<number, Cell> = Object.fromEntries(
  symbols.map((symbol, i) => [i + 1, { ...position(i + 1), symbol }]),
);
