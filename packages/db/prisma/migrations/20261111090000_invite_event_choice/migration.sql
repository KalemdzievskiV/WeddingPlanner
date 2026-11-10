-- AlterTable
ALTER TABLE "wedding" ADD COLUMN     "inviteEventIds" TEXT[] DEFAULT ARRAY[]::TEXT[];

