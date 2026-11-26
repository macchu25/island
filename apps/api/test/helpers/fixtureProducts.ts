import type { Product } from '@chemimon/shared';

/**
 * Fixture products for API tests, built from fixture-catalog chemicals (fixture floors: al 2, cu 3, na 2, h2o 1).
 * soap uses na instead of naoh (naoh is not in the fixture catalog), so its floor is 5 (real 4).
 * wire floors at 9 because the fixture cu floor is 3 (real 1 Xu floor gives 4).
 */
export const fixtureProducts: Product[] = [
  { id: 'can', name: 'Lon nhôm', ingredients: [{ chemicalId: 'al', count: 2 }], durationS: 120, blueprintPrice: 0, floorPrice: 5, line: 'đựng nước ngọt', assetKey: 'can' },
  { id: 'wire', name: 'Cuộn dây điện', ingredients: [{ chemicalId: 'cu', count: 3 }], durationS: 300, blueprintPrice: 0, floorPrice: 9, line: 'dẫn điện trong nhà', assetKey: 'wire' },
  { id: 'soap', name: 'Bánh xà phòng', ingredients: [{ chemicalId: 'na', count: 2 }, { chemicalId: 'h2o', count: 1 }], durationS: 300, blueprintPrice: 30, floorPrice: 5, line: 'rửa tay sạch', assetKey: 'soap' },
];
