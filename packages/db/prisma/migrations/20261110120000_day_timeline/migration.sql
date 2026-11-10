-- Decision 103: home events + map pins on events.
ALTER TYPE "EventType" ADD VALUE 'BRIDE_HOME';
ALTER TYPE "EventType" ADD VALUE 'GROOM_HOME';

ALTER TABLE "wedding_event" ADD COLUMN "lat" DOUBLE PRECISION,
ADD COLUMN "lng" DOUBLE PRECISION;

-- Decision 105: one timeline per day, items with order + duration.
CREATE TABLE "schedule_day" (
    "id" TEXT NOT NULL,
    "weddingId" TEXT NOT NULL,
    "date" DATE,
    "startTime" TEXT NOT NULL DEFAULT '10:00',

    CONSTRAINT "schedule_day_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "schedule_day_weddingId_idx" ON "schedule_day"("weddingId");
ALTER TABLE "schedule_day" ADD CONSTRAINT "schedule_day_weddingId_fkey" FOREIGN KEY ("weddingId") REFERENCES "wedding"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "schedule_item" DROP CONSTRAINT "schedule_item_eventId_fkey";
DROP INDEX "schedule_item_eventId_idx";

ALTER TABLE "schedule_item"
ADD COLUMN "dayId" TEXT,
ADD COLUMN "durationMin" INTEGER NOT NULL DEFAULT 30,
ADD COLUMN "forAll" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "forRoles" "GuestRole"[],
ADD COLUMN "forSides" "GuestSide"[],
ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "eventId" DROP NOT NULL;

-- Convert existing items: one day per (wedding, event date or wedding date),
-- starting at the earliest item; durations are the gaps to the next item.
CREATE TEMP TABLE "_item_day" AS
SELECT si."id" AS "itemId", si."weddingId", COALESCE(e."date", w."date") AS "date", si."time"
FROM "schedule_item" si
JOIN "wedding_event" e ON e."id" = si."eventId"
JOIN "wedding" w ON w."id" = si."weddingId";

INSERT INTO "schedule_day" ("id", "weddingId", "date", "startTime")
SELECT 'sd_' || md5(d."weddingId" || COALESCE(d."date"::text, '')), d."weddingId", d."date", MIN(d."time")
FROM "_item_day" d
GROUP BY d."weddingId", d."date";

WITH ordered AS (
  SELECT d."itemId",
         'sd_' || md5(d."weddingId" || COALESCE(d."date"::text, '')) AS "dayId",
         ROW_NUMBER() OVER w - 1 AS "sortOrder",
         LEAD(d."time") OVER w AS "next",
         d."time"
  FROM "_item_day" d
  WINDOW w AS (PARTITION BY d."weddingId", d."date" ORDER BY d."time", d."itemId")
)
UPDATE "schedule_item" si
SET "dayId" = o."dayId",
    "sortOrder" = o."sortOrder",
    "durationMin" = CASE WHEN o."next" IS NULL THEN 30
      ELSE (EXTRACT(EPOCH FROM (o."next"::time - o."time"::time)) / 60)::int END
FROM ordered o
WHERE o."itemId" = si."id";

DROP TABLE "_item_day";

ALTER TABLE "schedule_item" DROP COLUMN "time";
ALTER TABLE "schedule_item" ALTER COLUMN "dayId" SET NOT NULL;

CREATE INDEX "schedule_item_dayId_idx" ON "schedule_item"("dayId");
ALTER TABLE "schedule_item" ADD CONSTRAINT "schedule_item_dayId_fkey" FOREIGN KEY ("dayId") REFERENCES "schedule_day"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "schedule_item" ADD CONSTRAINT "schedule_item_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "wedding_event"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Decision 106: guests picked for an item.
CREATE TABLE "schedule_item_guest" (
    "itemId" TEXT NOT NULL,
    "guestId" TEXT NOT NULL,

    CONSTRAINT "schedule_item_guest_pkey" PRIMARY KEY ("itemId","guestId")
);
CREATE INDEX "schedule_item_guest_guestId_idx" ON "schedule_item_guest"("guestId");
ALTER TABLE "schedule_item_guest" ADD CONSTRAINT "schedule_item_guest_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "schedule_item"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "schedule_item_guest" ADD CONSTRAINT "schedule_item_guest_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "guest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Decision 104: the floor plan doubled (1000×700 → 2000×1400); keep tables where they were in the room.
UPDATE "seating_table" SET "x" = "x" * 2, "y" = "y" * 2;
