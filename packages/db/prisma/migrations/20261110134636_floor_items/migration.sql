-- CreateEnum
CREATE TYPE "FloorItemKind" AS ENUM ('DANCE_FLOOR', 'BAND', 'LABEL');

-- CreateTable
CREATE TABLE "floor_item" (
    "id" TEXT NOT NULL,
    "weddingId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "kind" "FloorItemKind" NOT NULL,
    "name" TEXT NOT NULL,
    "x" DOUBLE PRECISION NOT NULL,
    "y" DOUBLE PRECISION NOT NULL,
    "width" DOUBLE PRECISION NOT NULL,
    "height" DOUBLE PRECISION NOT NULL,
    "rotation" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "floor_item_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "floor_item_eventId_idx" ON "floor_item"("eventId");

-- AddForeignKey
ALTER TABLE "floor_item" ADD CONSTRAINT "floor_item_weddingId_fkey" FOREIGN KEY ("weddingId") REFERENCES "wedding"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "floor_item" ADD CONSTRAINT "floor_item_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "wedding_event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
