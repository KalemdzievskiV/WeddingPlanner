-- CreateEnum
CREATE TYPE "GuestRole" AS ENUM ('BRIDE', 'GROOM', 'KUM', 'KUMA', 'STAR_SVAT', 'DEVER', 'DEVERUSHA');

-- AlterTable
ALTER TABLE "guest" ADD COLUMN     "role" "GuestRole";
