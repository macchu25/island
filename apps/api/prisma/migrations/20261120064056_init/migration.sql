-- CreateEnum
CREATE TYPE "breeding_status" AS ENUM ('running', 'collected');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chemicals" (
    "id" TEXT NOT NULL,
    "formula" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "atomic_number" INTEGER,
    "group" INTEGER,
    "period" INTEGER,
    "phase_at_25c" TEXT NOT NULL,
    "family" TEXT NOT NULL,

    CONSTRAINT "chemicals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monsters" (
    "id" TEXT NOT NULL,
    "chemical_id" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "rarity" TEXT NOT NULL,
    "silhouette" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "asset_key" TEXT NOT NULL,
    "blurb" TEXT NOT NULL,

    CONSTRAINT "monsters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reactions" (
    "id" TEXT NOT NULL,
    "priority" DOUBLE PRECISION NOT NULL,
    "duration_s" DOUBLE PRECISION NOT NULL,
    "conditions" JSONB NOT NULL,
    "ratio" JSONB,
    "source" TEXT NOT NULL,
    "reviewed" BOOLEAN NOT NULL,

    CONSTRAINT "reactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reaction_inputs" (
    "reaction_id" TEXT NOT NULL,
    "chemical_id" TEXT NOT NULL,
    "coefficient" INTEGER NOT NULL,

    CONSTRAINT "reaction_inputs_pkey" PRIMARY KEY ("reaction_id","chemical_id")
);

-- CreateTable
CREATE TABLE "reaction_outputs" (
    "reaction_id" TEXT NOT NULL,
    "chemical_id" TEXT NOT NULL,
    "coefficient" INTEGER NOT NULL,

    CONSTRAINT "reaction_outputs_pkey" PRIMARY KEY ("reaction_id","chemical_id")
);

-- CreateTable
CREATE TABLE "player_monsters" (
    "player_id" UUID NOT NULL,
    "chemical_id" TEXT NOT NULL,
    "count" INTEGER NOT NULL,

    CONSTRAINT "player_monsters_pkey" PRIMARY KEY ("player_id","chemical_id")
);

-- CreateTable
CREATE TABLE "breeding_sessions" (
    "id" UUID NOT NULL,
    "player_id" UUID NOT NULL,
    "inputs" JSONB NOT NULL,
    "conditions" JSONB NOT NULL,
    "status" "breeding_status" NOT NULL,
    "result" JSONB NOT NULL,
    "collect_outcome" JSONB,
    "reaction_id" TEXT,
    "started_at" TIMESTAMPTZ(3) NOT NULL,
    "ready_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "breeding_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "player_discoveries" (
    "player_id" UUID NOT NULL,
    "chemical_id" TEXT NOT NULL,
    "discovered_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "player_discoveries_pkey" PRIMARY KEY ("player_id","chemical_id")
);

-- CreateTable
CREATE TABLE "first_discoveries" (
    "chemical_id" TEXT NOT NULL,
    "player_id" UUID NOT NULL,
    "discovered_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "first_discoveries_pkey" PRIMARY KEY ("chemical_id")
);

-- CreateTable
CREATE TABLE "extractor_state" (
    "player_id" UUID NOT NULL,
    "last_claim_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "extractor_state_pkey" PRIMARY KEY ("player_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_display_name_key" ON "users"("display_name");

-- CreateIndex
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "monsters_chemical_id_key" ON "monsters"("chemical_id");

-- CreateIndex
CREATE INDEX "breeding_sessions_player_id_status_idx" ON "breeding_sessions"("player_id", "status");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monsters" ADD CONSTRAINT "monsters_chemical_id_fkey" FOREIGN KEY ("chemical_id") REFERENCES "chemicals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reaction_inputs" ADD CONSTRAINT "reaction_inputs_reaction_id_fkey" FOREIGN KEY ("reaction_id") REFERENCES "reactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reaction_inputs" ADD CONSTRAINT "reaction_inputs_chemical_id_fkey" FOREIGN KEY ("chemical_id") REFERENCES "chemicals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reaction_outputs" ADD CONSTRAINT "reaction_outputs_reaction_id_fkey" FOREIGN KEY ("reaction_id") REFERENCES "reactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reaction_outputs" ADD CONSTRAINT "reaction_outputs_chemical_id_fkey" FOREIGN KEY ("chemical_id") REFERENCES "chemicals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_monsters" ADD CONSTRAINT "player_monsters_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_monsters" ADD CONSTRAINT "player_monsters_chemical_id_fkey" FOREIGN KEY ("chemical_id") REFERENCES "chemicals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "breeding_sessions" ADD CONSTRAINT "breeding_sessions_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "breeding_sessions" ADD CONSTRAINT "breeding_sessions_reaction_id_fkey" FOREIGN KEY ("reaction_id") REFERENCES "reactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_discoveries" ADD CONSTRAINT "player_discoveries_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_discoveries" ADD CONSTRAINT "player_discoveries_chemical_id_fkey" FOREIGN KEY ("chemical_id") REFERENCES "chemicals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "first_discoveries" ADD CONSTRAINT "first_discoveries_chemical_id_fkey" FOREIGN KEY ("chemical_id") REFERENCES "chemicals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "first_discoveries" ADD CONSTRAINT "first_discoveries_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "extractor_state" ADD CONSTRAINT "extractor_state_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Hand-added: stock can never go negative.
ALTER TABLE "player_monsters" ADD CONSTRAINT "player_monsters_count_check" CHECK ("count" >= 0);
