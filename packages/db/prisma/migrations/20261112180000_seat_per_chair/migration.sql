-- Decision 133: a guest sits on a specific chair.
ALTER TABLE "wedding" ADD COLUMN "seatPlainFigures" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "seatFirstNames" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "seating_table" ADD COLUMN "hiddenSeats" INTEGER[] DEFAULT ARRAY[]::INTEGER[];

ALTER TABLE "table_seat" ADD COLUMN "seat" INTEGER;

-- Existing guests get chairs in the order the planner showed them: head tables by wedding-party role
-- (decision 102), other tables by family, then guest order.
UPDATE "table_seat" ts SET "seat" = n.rn - 1
FROM (
  SELECT s."guestId", s."eventId",
    ROW_NUMBER() OVER (
      PARTITION BY s."tableId"
      ORDER BY
        CASE WHEN t."shape" = 'HEAD' THEN
          CASE g."role"
            WHEN 'STAROSVATICA' THEN 0 WHEN 'STAR_SVAT' THEN 1 WHEN 'KUM' THEN 2
            WHEN 'GROOM' THEN 3 WHEN 'BRIDE' THEN 4 WHEN 'KUMA' THEN 5 ELSE 6 END
        ELSE 0 END,
        h."createdAt", g."sortOrder", g."id"
    ) AS rn
  FROM "table_seat" s
  JOIN "seating_table" t ON t."id" = s."tableId"
  JOIN "guest" g ON g."id" = s."guestId"
  JOIN "household" h ON h."id" = g."householdId"
) n
WHERE ts."guestId" = n."guestId" AND ts."eventId" = n."eventId";

ALTER TABLE "table_seat" ALTER COLUMN "seat" SET NOT NULL;

DROP INDEX IF EXISTS "table_seat_tableId_idx";
CREATE UNIQUE INDEX "table_seat_tableId_seat_key" ON "table_seat"("tableId", "seat");
