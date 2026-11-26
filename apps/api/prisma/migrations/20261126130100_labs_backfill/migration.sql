-- Backfill for accounts that bred at gated conditions before labs existed. Idempotent: safe to run twice.
-- Each past breeding session grants the items its conditions need: temperature 1000 or 2500 gives furnace,
-- temperature -78 gives cold, pressure 100 or 200 gives pressure, a catalyst other than none gives catalyst:<name>.
-- breeding_sessions.conditions is jsonb. No ledger rows: these items are free.
INSERT INTO "player_labs" ("player_id", "item_id")
SELECT DISTINCT g."player_id", g."item_id"
FROM (
  SELECT s."player_id",
         CASE
           WHEN (s."conditions"->>'temperatureC')::numeric IN (1000, 2500) THEN 'furnace'
           WHEN (s."conditions"->>'temperatureC')::numeric = -78 THEN 'cold'
         END AS "item_id"
  FROM "breeding_sessions" s
  UNION ALL
  SELECT s."player_id",
         CASE WHEN (s."conditions"->>'pressureAtm')::numeric IN (100, 200) THEN 'pressure' END
  FROM "breeding_sessions" s
  UNION ALL
  SELECT s."player_id", 'catalyst:' || (s."conditions"->>'catalyst')
  FROM "breeding_sessions" s
  WHERE s."conditions"->>'catalyst' IS NOT NULL AND s."conditions"->>'catalyst' <> 'none'
) g
WHERE g."item_id" IS NOT NULL
ON CONFLICT ("player_id", "item_id") DO NOTHING;
