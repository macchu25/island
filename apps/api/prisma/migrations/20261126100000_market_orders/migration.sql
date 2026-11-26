-- CreateTable
CREATE TABLE "market_orders" (
    "id" UUID NOT NULL,
    "player_id" UUID NOT NULL,
    "stall_id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "chemical_id" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "reward" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "opened_at" TIMESTAMPTZ(3) NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "delivered_at" TIMESTAMPTZ(3),

    CONSTRAINT "market_orders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "market_orders_player_id_stall_id_opened_at_idx" ON "market_orders"("player_id", "stall_id", "opened_at");

-- AddForeignKey
ALTER TABLE "market_orders" ADD CONSTRAINT "market_orders_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Hand-added: the three order states.
ALTER TABLE "market_orders" ADD CONSTRAINT "market_orders_status_check"
  CHECK ("status" IN ('open', 'delivered', 'expired'));

-- Hand-added: at most one open order per player and stall (Prisma schema cannot express a partial index).
CREATE UNIQUE INDEX "market_orders_one_open_per_stall" ON "market_orders"("player_id", "stall_id") WHERE "status" = 'open';
