-- Starosvat and Starosvatica are on the bride's side (decision 125).
-- Families on the groom's side whose guests all hold one of these roles move to the bride's side.
UPDATE "household" h
SET "side" = 'BRIDE'
WHERE h."side" = 'GROOM'
  AND EXISTS (SELECT 1 FROM "guest" g WHERE g."householdId" = h."id")
  AND NOT EXISTS (
    SELECT 1 FROM "guest" g
    WHERE g."householdId" = h."id"
      AND (g."role" IS NULL OR g."role" NOT IN ('STAR_SVAT', 'STAROSVATICA'))
  );
