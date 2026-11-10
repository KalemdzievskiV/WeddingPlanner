-- AlterTable
ALTER TABLE "guest" ADD COLUMN     "guestNote" TEXT,
ADD COLUMN     "respondedAt" TIMESTAMP(3),
ADD COLUMN     "rsvpToken" TEXT;

-- AlterTable
ALTER TABLE "schedule_item" ADD COLUMN     "isMain" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "wedding" ADD COLUMN     "inviteEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "inviteHeadline" TEXT,
ADD COLUMN     "inviteMessage" TEXT,
ADD COLUMN     "inviteOverlay" INTEGER NOT NULL DEFAULT 45,
ADD COLUMN     "inviteVideoUrl" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "guest_rsvpToken_key" ON "guest"("rsvpToken");

