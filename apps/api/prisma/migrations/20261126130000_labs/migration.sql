-- CreateTable
CREATE TABLE "player_labs" (
    "player_id" UUID NOT NULL,
    "item_id" TEXT NOT NULL,
    "bought_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "player_labs_pkey" PRIMARY KEY ("player_id","item_id")
);

-- AddForeignKey
ALTER TABLE "player_labs" ADD CONSTRAINT "player_labs_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
