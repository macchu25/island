import type { Economy } from '@chemimon/shared';

/** Fixture economy for API tests: Global Constraints condition prices, 200 starter Xu, a floor for every fixture chemical. */
export const fixtureEconomy: Economy = {
  starterCoins: 200,
  conditionPrices: {
    temperatureC: { '-78': 20, '25': 0, '200': 5, '450': 15, '1000': 40, '2500': 120 },
    pressureAtm: { '1': 0, '10': 10, '100': 40, '200': 80 },
    environment: { air: 0, water: 2, inert: 10 },
    activation: { none: 0, spark: 3, light: 3 },
    catalyst: { none: 0, Fe: 0, Pt: 0, V2O5: 0, MnO2: 0 },
  },
  floorPrices: {
    h2: 1, he: 3, c: 2, n2: 2, o2: 2, f2: 3, ne: 3, na: 2, mg: 2, al: 2, si: 2, p4: 3, s8: 2,
    cl2: 2, ar: 3, k: 2, ca: 2, fe: 2, cu: 3, zn: 3, ag: 3, i2: 3, au: 3, hg: 3, pb: 3,
    h2o: 1, co: 10, co2: 5,
  },
};
