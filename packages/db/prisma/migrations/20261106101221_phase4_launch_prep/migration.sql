-- AlterTable
ALTER TABLE "user" ADD COLUMN     "deletionRequestedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "wedding" ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "erasureWarnedAt" TIMESTAMP(3),
ADD COLUMN     "guestDataErasedAt" TIMESTAMP(3);
