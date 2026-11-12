-- CreateEnum
CREATE TYPE "InviteTheme" AS ENUM ('LILAC', 'IVORY', 'SAGE');

-- AlterTable
ALTER TABLE "wedding" ADD COLUMN     "inviteMusic" TEXT,
ADD COLUMN     "inviteTheme" "InviteTheme" NOT NULL DEFAULT 'LILAC';
