-- Decisions 136–137: read-only seating chart link, room scale and measure lines.
ALTER TABLE "wedding_event" ADD COLUMN "seatingShareToken" TEXT,
ADD COLUMN "roomWidthM" DOUBLE PRECISION NOT NULL DEFAULT 30;

CREATE UNIQUE INDEX "wedding_event_seatingShareToken_key" ON "wedding_event"("seatingShareToken");

CREATE TABLE "measure_line" (
    "id" TEXT NOT NULL,
    "weddingId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "x1" DOUBLE PRECISION NOT NULL,
    "y1" DOUBLE PRECISION NOT NULL,
    "x2" DOUBLE PRECISION NOT NULL,
    "y2" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "measure_line_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "measure_line_eventId_idx" ON "measure_line"("eventId");

ALTER TABLE "measure_line" ADD CONSTRAINT "measure_line_weddingId_fkey" FOREIGN KEY ("weddingId") REFERENCES "wedding"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "measure_line" ADD CONSTRAINT "measure_line_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "wedding_event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
