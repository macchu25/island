-- AlterTable
ALTER TABLE "market_orders" ADD COLUMN     "product_id" TEXT,
ALTER COLUMN "chemical_id" DROP NOT NULL;

-- CreateTable
CREATE TABLE "player_blueprints" (
    "player_id" UUID NOT NULL,
    "product_id" TEXT NOT NULL,
    "bought_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "player_blueprints_pkey" PRIMARY KEY ("player_id","product_id")
);

-- CreateTable
CREATE TABLE "player_products" (
    "player_id" UUID NOT NULL,
    "product_id" TEXT NOT NULL,
    "count" INTEGER NOT NULL,

    CONSTRAINT "player_products_pkey" PRIMARY KEY ("player_id","product_id")
);

-- CreateTable
CREATE TABLE "workshop_jobs" (
    "id" UUID NOT NULL,
    "player_id" UUID NOT NULL,
    "product_id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "started_at" TIMESTAMPTZ(3) NOT NULL,
    "ready_at" TIMESTAMPTZ(3) NOT NULL,
    "collected_at" TIMESTAMPTZ(3),
    "collect_outcome" JSONB,

    CONSTRAINT "workshop_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "workshop_jobs_player_id_status_idx" ON "workshop_jobs"("player_id", "status");

-- AddForeignKey
ALTER TABLE "player_blueprints" ADD CONSTRAINT "player_blueprints_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_products" ADD CONSTRAINT "player_products_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workshop_jobs" ADD CONSTRAINT "workshop_jobs_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Hand-added: product stock never goes below 0.
ALTER TABLE "player_products" ADD CONSTRAINT "player_products_count_check" CHECK ("count" >= 0);

-- Hand-added: the two job states.
ALTER TABLE "workshop_jobs" ADD CONSTRAINT "workshop_jobs_status_check"
  CHECK ("status" IN ('running', 'collected'));

-- Hand-added: an order asks for exactly one item, a chemical or a product. Existing rows all have chemical_id
-- set and product_id NULL, so they pass unchanged.
ALTER TABLE "market_orders" ADD CONSTRAINT "market_orders_one_item_check"
  CHECK (num_nonnulls("chemical_id", "product_id") = 1);
