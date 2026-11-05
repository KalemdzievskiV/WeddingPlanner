-- CreateEnum
CREATE TYPE "InquiryStatus" AS ENUM ('NEW', 'REPLIED', 'OFFER_SENT', 'BOOKED', 'DECLINED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "OfferUnit" AS ENUM ('TOTAL', 'PER_PERSON');

-- CreateEnum
CREATE TYPE "OfferStatus" AS ENUM ('OPEN', 'ACCEPTED', 'DECLINED', 'REPLACED');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('VISIBLE', 'HIDDEN');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('INQUIRY_NEW', 'INQUIRY_MESSAGE', 'INQUIRY_CANCELLED', 'OFFER_NEW', 'OFFER_ACCEPTED', 'OFFER_DECLINED', 'BOOKED', 'DECLINED', 'REVIEW_NEW', 'REVIEW_REPLY', 'REVIEW_REPORTED');

-- AlterTable
ALTER TABLE "business" ADD COLUMN     "ratingAvg" DOUBLE PRECISION,
ADD COLUMN     "ratingCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "expense" ADD COLUMN     "offerId" TEXT;

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "emailNotifications" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "favorite" (
    "weddingId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "favorite_pkey" PRIMARY KEY ("weddingId","businessId")
);

-- CreateTable
CREATE TABLE "inquiry" (
    "id" TEXT NOT NULL,
    "weddingId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "eventId" TEXT,
    "hallId" TEXT,
    "packageRef" TEXT,
    "packageName" TEXT,
    "date" DATE,
    "guestCount" INTEGER,
    "status" "InquiryStatus" NOT NULL DEFAULT 'NEW',
    "createdById" TEXT,
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "coupleSeenAt" TIMESTAMP(3),
    "vendorSeenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inquiry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inquiry_message" (
    "id" TEXT NOT NULL,
    "inquiryId" TEXT NOT NULL,
    "authorId" TEXT,
    "fromVendor" BOOLEAN NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inquiry_message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offer" (
    "id" TEXT NOT NULL,
    "inquiryId" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "unit" "OfferUnit" NOT NULL,
    "currency" "Currency" NOT NULL,
    "validUntil" DATE,
    "note" TEXT,
    "status" "OfferStatus" NOT NULL DEFAULT 'OPEN',
    "authorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "offer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "weddingId" TEXT NOT NULL,
    "authorId" TEXT,
    "rating" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "status" "ReviewStatus" NOT NULL DEFAULT 'VISIBLE',
    "vendorReply" TEXT,
    "repliedAt" TIMESTAMP(3),
    "reportedAt" TIMESTAMP(3),
    "reportReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "data" JSONB NOT NULL DEFAULT '{}',
    "link" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_stat_day" (
    "businessId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 0,
    "inquiries" INTEGER NOT NULL DEFAULT 0,
    "favorites" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "business_stat_day_pkey" PRIMARY KEY ("businessId","date")
);

-- CreateTable
CREATE TABLE "business_view" (
    "businessId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "visitor" TEXT NOT NULL,

    CONSTRAINT "business_view_pkey" PRIMARY KEY ("businessId","date","visitor")
);

-- CreateIndex
CREATE INDEX "favorite_businessId_idx" ON "favorite"("businessId");

-- CreateIndex
CREATE INDEX "inquiry_weddingId_idx" ON "inquiry"("weddingId");

-- CreateIndex
CREATE INDEX "inquiry_businessId_status_idx" ON "inquiry"("businessId", "status");

-- CreateIndex
CREATE INDEX "inquiry_message_inquiryId_idx" ON "inquiry_message"("inquiryId");

-- CreateIndex
CREATE INDEX "offer_inquiryId_idx" ON "offer"("inquiryId");

-- CreateIndex
CREATE INDEX "review_businessId_status_idx" ON "review"("businessId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "review_businessId_weddingId_key" ON "review"("businessId", "weddingId");

-- CreateIndex
CREATE INDEX "notification_userId_readAt_idx" ON "notification"("userId", "readAt");

-- CreateIndex
CREATE INDEX "notification_userId_createdAt_idx" ON "notification"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "expense_offerId_key" ON "expense"("offerId");

-- AddForeignKey
ALTER TABLE "expense" ADD CONSTRAINT "expense_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "offer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorite" ADD CONSTRAINT "favorite_weddingId_fkey" FOREIGN KEY ("weddingId") REFERENCES "wedding"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorite" ADD CONSTRAINT "favorite_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inquiry" ADD CONSTRAINT "inquiry_weddingId_fkey" FOREIGN KEY ("weddingId") REFERENCES "wedding"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inquiry" ADD CONSTRAINT "inquiry_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inquiry" ADD CONSTRAINT "inquiry_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "wedding_event"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inquiry" ADD CONSTRAINT "inquiry_hallId_fkey" FOREIGN KEY ("hallId") REFERENCES "hall"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inquiry_message" ADD CONSTRAINT "inquiry_message_inquiryId_fkey" FOREIGN KEY ("inquiryId") REFERENCES "inquiry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inquiry_message" ADD CONSTRAINT "inquiry_message_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offer" ADD CONSTRAINT "offer_inquiryId_fkey" FOREIGN KEY ("inquiryId") REFERENCES "inquiry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review" ADD CONSTRAINT "review_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review" ADD CONSTRAINT "review_weddingId_fkey" FOREIGN KEY ("weddingId") REFERENCES "wedding"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review" ADD CONSTRAINT "review_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification" ADD CONSTRAINT "notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_stat_day" ADD CONSTRAINT "business_stat_day_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_view" ADD CONSTRAINT "business_view_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
