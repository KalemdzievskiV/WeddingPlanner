-- CreateEnum
CREATE TYPE "BusinessStatus" AS ENUM ('DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'HIDDEN');

-- CreateEnum
CREATE TYPE "MemberRole" AS ENUM ('OWNER', 'STAFF');

-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('EUR', 'MKD');

-- CreateEnum
CREATE TYPE "UnmarkedDays" AS ENUM ('FREE', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "DayStatus" AS ENUM ('FREE', 'TENTATIVE', 'BOOKED');

-- CreateEnum
CREATE TYPE "DrinksIncluded" AS ENUM ('NONE', 'SOFT', 'DOMESTIC_UNLIMITED', 'CUSTOM');

-- CreateEnum
CREATE TYPE "ExtraUnit" AS ENUM ('PER_PERSON', 'FIXED');

-- CreateTable
CREATE TABLE "music_genre" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "nameMk" TEXT NOT NULL,
    "nameSq" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "music_genre_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business" (
    "id" TEXT NOT NULL,
    "category" "VendorCategoryKey" NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "descriptionMk" TEXT NOT NULL DEFAULT '',
    "descriptionSq" TEXT,
    "descriptionEn" TEXT,
    "cityId" TEXT,
    "address" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "phone" TEXT,
    "viber" TEXT,
    "whatsapp" TEXT,
    "email" TEXT,
    "website" TEXT,
    "instagram" TEXT,
    "facebook" TEXT,
    "lineup" TEXT,
    "status" "BusinessStatus" NOT NULL DEFAULT 'DRAFT',
    "rejectionReason" TEXT,
    "submittedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "unmarkedDays" "UnmarkedDays" NOT NULL DEFAULT 'UNKNOWN',
    "currency" "Currency" NOT NULL DEFAULT 'EUR',
    "claimToken" TEXT,
    "claimExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_member" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "MemberRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "business_member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_invite" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "business_invite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_feature" (
    "businessId" TEXT NOT NULL,
    "featureId" TEXT NOT NULL,

    CONSTRAINT "business_feature_pkey" PRIMARY KEY ("businessId","featureId")
);

-- CreateTable
CREATE TABLE "business_genre" (
    "businessId" TEXT NOT NULL,
    "genreId" TEXT NOT NULL,

    CONSTRAINT "business_genre_pkey" PRIMARY KEY ("businessId","genreId")
);

-- CreateTable
CREATE TABLE "portfolio_gallery" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "portfolio_gallery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "photo" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "galleryId" TEXT,
    "url" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "photo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "video_link" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "video_link_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hall" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "capacityMin" INTEGER,
    "capacityMax" INTEGER NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hall_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menu_package" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "nameMk" TEXT NOT NULL,
    "nameSq" TEXT,
    "nameEn" TEXT,
    "pricePerPerson" INTEGER NOT NULL,
    "currency" "Currency" NOT NULL,
    "minGuests" INTEGER,
    "courses" TEXT[],
    "drinks" "DrinksIncluded" NOT NULL DEFAULT 'NONE',
    "drinksNote" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "menu_package_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "extra" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "nameMk" TEXT NOT NULL,
    "nameSq" TEXT,
    "nameEn" TEXT,
    "price" INTEGER NOT NULL,
    "currency" "Currency" NOT NULL,
    "unit" "ExtraUnit" NOT NULL DEFAULT 'FIXED',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "extra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_package" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "nameMk" TEXT NOT NULL,
    "nameSq" TEXT,
    "nameEn" TEXT,
    "price" INTEGER NOT NULL,
    "currency" "Currency" NOT NULL,
    "hours" INTEGER,
    "members" INTEGER,
    "extraHourPrice" INTEGER,
    "includes" TEXT[],
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_package_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "travel_fee" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "cityId" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "currency" "Currency" NOT NULL,

    CONSTRAINT "travel_fee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "availability_day" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "hallId" TEXT,
    "calendarKey" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "status" "DayStatus" NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "availability_day_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "music_genre_slug_key" ON "music_genre"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "business_slug_key" ON "business"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "business_claimToken_key" ON "business"("claimToken");

-- CreateIndex
CREATE INDEX "business_category_status_idx" ON "business"("category", "status");

-- CreateIndex
CREATE INDEX "business_cityId_idx" ON "business"("cityId");

-- CreateIndex
CREATE INDEX "business_member_userId_idx" ON "business_member"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "business_member_businessId_userId_key" ON "business_member"("businessId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "business_invite_token_key" ON "business_invite"("token");

-- CreateIndex
CREATE INDEX "business_invite_businessId_idx" ON "business_invite"("businessId");

-- CreateIndex
CREATE INDEX "portfolio_gallery_businessId_idx" ON "portfolio_gallery"("businessId");

-- CreateIndex
CREATE INDEX "photo_businessId_sortOrder_idx" ON "photo"("businessId", "sortOrder");

-- CreateIndex
CREATE INDEX "video_link_businessId_idx" ON "video_link"("businessId");

-- CreateIndex
CREATE INDEX "hall_businessId_idx" ON "hall"("businessId");

-- CreateIndex
CREATE INDEX "menu_package_businessId_idx" ON "menu_package"("businessId");

-- CreateIndex
CREATE INDEX "extra_businessId_idx" ON "extra"("businessId");

-- CreateIndex
CREATE INDEX "service_package_businessId_idx" ON "service_package"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX "travel_fee_businessId_cityId_key" ON "travel_fee"("businessId", "cityId");

-- CreateIndex
CREATE INDEX "availability_day_businessId_date_idx" ON "availability_day"("businessId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "availability_day_businessId_calendarKey_date_key" ON "availability_day"("businessId", "calendarKey", "date");

-- AddForeignKey
ALTER TABLE "business" ADD CONSTRAINT "business_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "city"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_member" ADD CONSTRAINT "business_member_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_member" ADD CONSTRAINT "business_member_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_invite" ADD CONSTRAINT "business_invite_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_feature" ADD CONSTRAINT "business_feature_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_feature" ADD CONSTRAINT "business_feature_featureId_fkey" FOREIGN KEY ("featureId") REFERENCES "venue_feature"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_genre" ADD CONSTRAINT "business_genre_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_genre" ADD CONSTRAINT "business_genre_genreId_fkey" FOREIGN KEY ("genreId") REFERENCES "music_genre"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "portfolio_gallery" ADD CONSTRAINT "portfolio_gallery_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "photo" ADD CONSTRAINT "photo_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "photo" ADD CONSTRAINT "photo_galleryId_fkey" FOREIGN KEY ("galleryId") REFERENCES "portfolio_gallery"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_link" ADD CONSTRAINT "video_link_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hall" ADD CONSTRAINT "hall_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_package" ADD CONSTRAINT "menu_package_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "extra" ADD CONSTRAINT "extra_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_package" ADD CONSTRAINT "service_package_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "travel_fee" ADD CONSTRAINT "travel_fee_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "travel_fee" ADD CONSTRAINT "travel_fee_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "city"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "availability_day" ADD CONSTRAINT "availability_day_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "availability_day" ADD CONSTRAINT "availability_day_hallId_fkey" FOREIGN KEY ("hallId") REFERENCES "hall"("id") ON DELETE CASCADE ON UPDATE CASCADE;
