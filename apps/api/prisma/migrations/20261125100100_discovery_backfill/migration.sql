-- Backfill for accounts that existed before the 6-element starter kit. Idempotent: safe to run twice.
-- Old players owned all 25 elements, so every element becomes a starter discovery (no bred_at).
INSERT INTO "player_discoveries" ("player_id", "chemical_id", "discovered_at", "source")
SELECT u."id", c."id", u."created_at", 'starter'
FROM "users" u CROSS JOIN "chemicals" c
WHERE c."kind" = 'element'
ON CONFLICT ("player_id", "chemical_id") DO NOTHING;

-- Existing compound discoveries came from breeding: mark when breeding first made them.
UPDATE "player_discoveries" d SET "bred_at" = d."discovered_at"
FROM "chemicals" c
WHERE c."id" = d."chemical_id" AND c."kind" = 'compound'
  AND d."source" = 'breeding' AND d."bred_at" IS NULL;
