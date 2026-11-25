import { MIN_BRANCHING_PAIRS, validateCatalog, validateEconomy } from '@chemimon/content';
import { EXTRACTOR_ELEMENTS, type Catalog, type Economy } from '@chemimon/shared';
import type { PrismaClient } from './generated/prisma/client';

export const DEFAULT_HOST = '127.0.0.1';
export const DEFAULT_PORT = 3101;

/** PORT env: unset -> 3101; otherwise it must be an integer 1..65535. */
export function parsePort(raw: string | undefined): number {
  if (raw === undefined || raw === '') return DEFAULT_PORT;
  const n = Number(raw);
  if (!/^\d+$/.test(raw.trim()) || !Number.isInteger(n) || n < 1 || n > 65535) {
    throw new Error(`PORT must be an integer 1..65535, got "${raw}"`);
  }
  return n;
}

/** HOST env: unset or empty -> 127.0.0.1 (loopback only). */
export function parseHost(raw: string | undefined): string {
  return raw === undefined || raw.trim() === '' ? DEFAULT_HOST : raw.trim();
}

/**
 * Boot gate for the api. Returns human-readable problems; empty means safe to serve.
 * 1. The catalog passes the validator: strict (all reviewed, >= 8 branching pairs) when drafts are off.
 * 2. economy.yaml passes validateEconomy against the catalog (a floor for every chemical, extractor
 *    chemicals 1..3 Xu, no floor above the cheapest production cost).
 * 3. Every catalog chemical exists in the DB `chemicals` table, so no reaction can write a product row
 *    that violates the player_monsters -> chemicals foreign key (seed not run, or run with other options).
 */
export async function bootCheck(
  catalog: Catalog,
  economy: Economy,
  db: Pick<PrismaClient, 'chemical'>,
  includeDrafts: boolean,
): Promise<string[]> {
  const problems = validateCatalog(catalog, {
    requireReviewed: !includeDrafts,
    minBranchingPairs: includeDrafts ? 0 : MIN_BRANCHING_PAIRS,
  }, [...EXTRACTOR_ELEMENTS, ...economy.places.flatMap((pl) => pl.drops.map((d) => d.chemicalId))]).map((i) => `content ${i.code} ${i.ref}: ${i.detail}`);
  for (const i of validateEconomy(catalog, economy, EXTRACTOR_ELEMENTS)) {
    problems.push(`economy ${i.code} ${i.ref}: ${i.detail}`);
  }
  const ids = catalog.chemicals.map((c) => c.id);
  const inDb = new Set((await db.chemical.findMany({ where: { id: { in: ids } }, select: { id: true } })).map((r) => r.id));
  const missing = ids.filter((id) => !inDb.has(id));
  if (missing.length > 0) {
    problems.push(`database: ${missing.length} catalog chemical(s) missing from table chemicals (run db:seed): ${missing.join(', ')}`);
  }
  return problems;
}
