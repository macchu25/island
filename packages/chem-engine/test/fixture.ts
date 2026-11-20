import type { ReactionDef } from '@chemimon/shared';

const t = (chemicalId: string, coefficient: number) => ({ chemicalId, coefficient });
export const mkRule = (p: Partial<ReactionDef> & Pick<ReactionDef, 'id' | 'inputs' | 'outputs'>): ReactionDef => ({
  conditions: {},
  priority: 0,
  durationS: 10,
  source: 't',
  reviewed: true,
  ...p,
});

export const RULES: ReactionDef[] = [
  mkRule({ id: 'co2', inputs: [t('c', 1), t('o2', 1)], outputs: [t('co2', 1)], ratio: { min: 0, max: 1 }, conditions: { temperatureC: { min: 450, max: 3000 } } }),
  mkRule({ id: 'co', inputs: [t('c', 2), t('o2', 1)], outputs: [t('co', 2)], ratio: { min: 2, max: 100 }, conditions: { temperatureC: { min: 450, max: 3000 } } }),
  mkRule({ id: 'h2o', inputs: [t('h2', 2), t('o2', 1)], outputs: [t('h2o', 2)], conditions: { activation: 'spark' } }),
  mkRule({ id: 'caco3_dec', inputs: [t('caco3', 1)], outputs: [t('co2', 1), t('cao', 1)], conditions: { temperatureC: { min: 1000, max: 3000 } } }),
];
