-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "FloorItemKind" ADD VALUE 'DANCE_FLOOR_ROUND';
ALTER TYPE "FloorItemKind" ADD VALUE 'STAGE';
ALTER TYPE "FloorItemKind" ADD VALUE 'TENT';
ALTER TYPE "FloorItemKind" ADD VALUE 'BUFFET_LONG';
ALTER TYPE "FloorItemKind" ADD VALUE 'BUFFET_ROUND';
ALTER TYPE "FloorItemKind" ADD VALUE 'WALL';
ALTER TYPE "FloorItemKind" ADD VALUE 'DOOR';
ALTER TYPE "FloorItemKind" ADD VALUE 'PILLAR';
ALTER TYPE "FloorItemKind" ADD VALUE 'ENTRANCE';
ALTER TYPE "FloorItemKind" ADD VALUE 'WC';
ALTER TYPE "FloorItemKind" ADD VALUE 'BAR';
ALTER TYPE "FloorItemKind" ADD VALUE 'DJ';
ALTER TYPE "FloorItemKind" ADD VALUE 'CAKE';
ALTER TYPE "FloorItemKind" ADD VALUE 'GIFTS';
ALTER TYPE "FloorItemKind" ADD VALUE 'SPEAKER';
ALTER TYPE "FloorItemKind" ADD VALUE 'LIGHT';
ALTER TYPE "FloorItemKind" ADD VALUE 'PHOTO';
ALTER TYPE "FloorItemKind" ADD VALUE 'KIDS';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TableShape" ADD VALUE 'SQUARE';
ALTER TYPE "TableShape" ADD VALUE 'ELLIPSE';
ALTER TYPE "TableShape" ADD VALUE 'HALF_ROUND';
ALTER TYPE "TableShape" ADD VALUE 'ROW';
