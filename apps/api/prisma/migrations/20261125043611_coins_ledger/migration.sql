-- AlterTable
ALTER TABLE "breeding_sessions" ADD COLUMN     "fee" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "coins" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "coin_ledger" (
    "id" UUID NOT NULL,
    "player_id" UUID NOT NULL,
    "delta" INTEGER NOT NULL,
    "balance_after" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "ref_id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coin_ledger_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "coin_ledger_player_id_created_at_idx" ON "coin_ledger"("player_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "coin_ledger_player_id_reason_ref_id_key" ON "coin_ledger"("player_id", "reason", "ref_id");

-- AddForeignKey
ALTER TABLE "coin_ledger" ADD CONSTRAINT "coin_ledger_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Hand-added: the Xu balance can never go negative.
ALTER TABLE "users" ADD CONSTRAINT "users_coins_check" CHECK ("coins" >= 0);

-- Hand-added backfill: every existing account gets 200 Xu once, recorded as one starter ledger row.
-- New accounts get theirs from the register transaction (economy.yaml starterCoins), not from here.
UPDATE "users" SET "coins" = 200;
INSERT INTO "coin_ledger" ("id", "player_id", "delta", "balance_after", "reason", "ref_id")
SELECT gen_random_uuid(), "id", 200, 200, 'starter', 'starter' FROM "users";
