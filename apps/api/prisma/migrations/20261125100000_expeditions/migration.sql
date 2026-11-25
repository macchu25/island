-- CreateEnum
CREATE TYPE "expedition_status" AS ENUM ('running', 'collected');

-- AlterTable
ALTER TABLE "player_discoveries" ADD COLUMN     "bred_at" TIMESTAMPTZ(3),
ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'breeding';

-- CreateTable
CREATE TABLE "expeditions" (
    "id" UUID NOT NULL,
    "player_id" UUID NOT NULL,
    "place_id" TEXT NOT NULL,
    "monster_chemical_id" TEXT NOT NULL,
    "status" "expedition_status" NOT NULL,
    "started_at" TIMESTAMPTZ(3) NOT NULL,
    "ready_at" TIMESTAMPTZ(3) NOT NULL,
    "result" JSONB NOT NULL,
    "collect_outcome" JSONB,

    CONSTRAINT "expeditions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "player_permits" (
    "player_id" UUID NOT NULL,
    "place_id" TEXT NOT NULL,
    "bought_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "player_permits_pkey" PRIMARY KEY ("player_id","place_id")
);

-- CreateIndex
CREATE INDEX "expeditions_player_id_status_idx" ON "expeditions"("player_id", "status");

-- AddForeignKey
ALTER TABLE "expeditions" ADD CONSTRAINT "expeditions_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expeditions" ADD CONSTRAINT "expeditions_monster_chemical_id_fkey" FOREIGN KEY ("monster_chemical_id") REFERENCES "chemicals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_permits" ADD CONSTRAINT "player_permits_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Hand-added: the four discovery sources.
ALTER TABLE "player_discoveries" ADD CONSTRAINT "player_discoveries_source_check"
  CHECK ("source" IN ('starter', 'extractor', 'expedition', 'breeding'));
