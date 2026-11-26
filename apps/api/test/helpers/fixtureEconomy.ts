import type { Economy } from '@chemimon/shared';

/**
 * Fixture economy for API tests: Global Constraints condition prices, 200 starter Xu, a floor for every fixture chemical.
 * Places use fixture chemicals only (sio2 is not in the fixture catalog, so `sand` drops si here).
 * Every fixture element has family `element`, so its habitat is gas or crystal: h2 matches `air`.
 */
export const fixtureEconomy: Economy = {
  starterCoins: 200,
  catalystPrices: { Fe: 40, Pt: 80, V2O5: 60, MnO2: 40 },
  labs: [
    { id: 'furnace', name: 'Lò cao', unlocks: { temperatureC: [1000, 2500] }, price: 150 },
    { id: 'pressure', name: 'Buồng áp suất', unlocks: { pressureAtm: [100, 200] }, price: 120 },
    { id: 'cold', name: 'Phòng lạnh', unlocks: { temperatureC: [-78] }, price: 60 },
    { id: 'electrolysis', name: 'Buồng điện phân', unlocks: { activation: ['electric'] }, price: 200 },
  ],
  places: [
    { id: 'sand', name: 'Bãi cát', drops: [{ chemicalId: 'si', count: 4 }], durationS: 600, fee: 0, permitPrice: 0, bonusHabitat: 'quarry' },
    {
      id: 'iron', name: 'Mỏ sắt', drops: [{ chemicalId: 'fe2o3', count: 3 }, { chemicalId: 'fe3o4', count: 2 }],
      durationS: 900, fee: 10, permitPrice: 0, bonusHabitat: 'metal',
    },
    {
      id: 'air', name: 'Tháp tách khí',
      drops: [{ chemicalId: 'n2', count: 2 }, { chemicalId: 'o2', count: 2 }, { chemicalId: 'ar', count: 1 }, { chemicalId: 'ne', count: 1 }],
      durationS: 1200, fee: 20, permitPrice: 60, bonusHabitat: 'gas',
    },
  ],
  conditionPrices: {
    temperatureC: { '-78': 20, '25': 0, '200': 5, '450': 15, '1000': 40, '2500': 120 },
    pressureAtm: { '1': 0, '10': 10, '100': 40, '200': 80 },
    environment: { air: 0, water: 2, inert: 10 },
    activation: { none: 0, spark: 3, light: 3, electric: 10 },
    catalyst: { none: 0, Fe: 0, Pt: 0, V2O5: 0, MnO2: 0 },
  },
  floorPrices: {
    h2: 1, he: 3, c: 2, n2: 2, o2: 2, f2: 3, ne: 2, na: 2, mg: 2, al: 2, si: 2, p4: 3, s8: 2,
    cl2: 2, ar: 2, k: 2, ca: 2, fe: 2, cu: 3, zn: 3, ag: 3, i2: 3, au: 3, hg: 3, pb: 3,
    h2o: 1, co: 3, co2: 1, fe2o3: 1, fe3o4: 1, // 50 % of the fixture cost (fee over the runs one start allows): co 6.25, co2 3.75
  },
};
