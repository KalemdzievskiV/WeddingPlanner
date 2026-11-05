-- CreateEnum
CREATE TYPE "Role" AS ENUM ('COUPLE', 'VENDOR', 'ADMIN');

-- CreateEnum
CREATE TYPE "VendorCategoryKey" AS ENUM ('VENUE', 'BAND', 'PHOTO_VIDEO');

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "roles" "Role"[] DEFAULT ARRAY[]::"Role"[],
    "locale" TEXT NOT NULL DEFAULT 'mk',

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "city" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "nameMk" TEXT NOT NULL,
    "nameSq" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "region" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "city_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_category" (
    "id" TEXT NOT NULL,
    "key" "VendorCategoryKey" NOT NULL,
    "nameMk" TEXT NOT NULL,
    "nameSq" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vendor_category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "venue_feature" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "nameMk" TEXT NOT NULL,
    "nameSq" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "venue_feature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "budget_template_category" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "nameMk" TEXT NOT NULL,
    "nameSq" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "budget_template_category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checklist_template_item" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "titleMk" TEXT NOT NULL,
    "titleSq" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "monthsBefore" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "checklist_template_item_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "session_token_key" ON "session"("token");

-- CreateIndex
CREATE INDEX "session_userId_idx" ON "session"("userId");

-- CreateIndex
CREATE INDEX "account_userId_idx" ON "account"("userId");

-- CreateIndex
CREATE INDEX "verification_identifier_idx" ON "verification"("identifier");

-- CreateIndex
CREATE UNIQUE INDEX "city_slug_key" ON "city"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "vendor_category_key_key" ON "vendor_category"("key");

-- CreateIndex
CREATE UNIQUE INDEX "venue_feature_slug_key" ON "venue_feature"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "budget_template_category_slug_key" ON "budget_template_category"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "checklist_template_item_slug_key" ON "checklist_template_item"("slug");

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account" ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
