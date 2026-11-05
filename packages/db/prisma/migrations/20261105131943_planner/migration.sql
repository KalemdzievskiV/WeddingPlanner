-- CreateEnum
CREATE TYPE "WeddingRole" AS ENUM ('OWNER', 'PARTNER', 'EDITOR', 'VIEWER');

-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('RECEPTION', 'ENGAGEMENT', 'BACHELORETTE', 'CHURCH', 'CIVIL', 'CUSTOM');

-- CreateEnum
CREATE TYPE "GuestSide" AS ENUM ('BRIDE', 'GROOM', 'BOTH');

-- CreateEnum
CREATE TYPE "AgeGroup" AS ENUM ('CHILD', 'YOUNG', 'ADULT', 'OLDER');

-- CreateEnum
CREATE TYPE "Rsvp" AS ENUM ('PENDING', 'YES', 'NO');

-- CreateEnum
CREATE TYPE "TableShape" AS ENUM ('LONG', 'ROUND', 'HEAD');

-- CreateEnum
CREATE TYPE "Payer" AS ENUM ('COUPLE', 'BRIDE_FAMILY', 'GROOM_FAMILY', 'KUM', 'OTHER');

-- CreateEnum
CREATE TYPE "CostType" AS ENUM ('FIXED', 'PER_PERSON');

-- CreateEnum
CREATE TYPE "PaymentKind" AS ENUM ('DEPOSIT', 'INSTALLMENT', 'FINAL');

-- CreateEnum
CREATE TYPE "PlannedVendorStatus" AS ENUM ('CONSIDERING', 'BOOKED');

-- CreateTable
CREATE TABLE "wedding" (
    "id" TEXT NOT NULL,
    "partner1" TEXT NOT NULL,
    "partner2" TEXT NOT NULL,
    "date" DATE,
    "cityId" TEXT,
    "estimatedGuests" INTEGER,
    "budgetTotal" INTEGER,
    "currency" "Currency" NOT NULL DEFAULT 'EUR',
    "premium" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wedding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wedding_member" (
    "id" TEXT NOT NULL,
    "weddingId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "WeddingRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wedding_member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wedding_invite" (
    "id" TEXT NOT NULL,
    "weddingId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "role" "WeddingRole" NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wedding_invite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wedding_event" (
    "id" TEXT NOT NULL,
    "weddingId" TEXT NOT NULL,
    "type" "EventType" NOT NULL,
    "name" TEXT,
    "date" DATE,
    "time" TEXT,
    "place" TEXT,
    "hasSeating" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wedding_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "household" (
    "id" TEXT NOT NULL,
    "weddingId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "side" "GuestSide" NOT NULL,
    "rsvpToken" TEXT NOT NULL,
    "notes" TEXT,
    "guestNote" TEXT,
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "household_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guest" (
    "id" TEXT NOT NULL,
    "weddingId" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ageGroup" "AgeGroup" NOT NULL DEFAULT 'ADULT',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "guest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guest_invitation" (
    "guestId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "rsvp" "Rsvp" NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "guest_invitation_pkey" PRIMARY KEY ("guestId","eventId")
);

-- CreateTable
CREATE TABLE "seating_table" (
    "id" TEXT NOT NULL,
    "weddingId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shape" "TableShape" NOT NULL,
    "seats" INTEGER NOT NULL,
    "x" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "y" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rotation" INTEGER NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "seating_table_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "table_seat" (
    "guestId" TEXT NOT NULL,
    "tableId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,

    CONSTRAINT "table_seat_pkey" PRIMARY KEY ("guestId","eventId")
);

-- CreateTable
CREATE TABLE "budget_category" (
    "id" TEXT NOT NULL,
    "weddingId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "budget_category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expense" (
    "id" TEXT NOT NULL,
    "weddingId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "costType" "CostType" NOT NULL DEFAULT 'FIXED',
    "amount" INTEGER NOT NULL,
    "childPrice" INTEGER,
    "currency" "Currency" NOT NULL,
    "eventId" TEXT,
    "guestsOverride" INTEGER,
    "payer" "Payer" NOT NULL DEFAULT 'COUPLE',
    "plannedVendorId" TEXT,
    "notes" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment" (
    "id" TEXT NOT NULL,
    "expenseId" TEXT NOT NULL,
    "kind" "PaymentKind" NOT NULL DEFAULT 'DEPOSIT',
    "amount" INTEGER NOT NULL,
    "currency" "Currency" NOT NULL,
    "dueDate" DATE,
    "paidAt" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task" (
    "id" TEXT NOT NULL,
    "weddingId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "monthsBefore" INTEGER,
    "dueDate" DATE,
    "assignee" TEXT,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "doneAt" TIMESTAMP(3),
    "templateSlug" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schedule_item" (
    "id" TEXT NOT NULL,
    "weddingId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "time" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "responsible" TEXT,
    "place" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "schedule_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "planned_vendor" (
    "id" TEXT NOT NULL,
    "weddingId" TEXT NOT NULL,
    "businessId" TEXT,
    "name" TEXT NOT NULL,
    "kind" TEXT,
    "contact" TEXT,
    "status" "PlannedVendorStatus" NOT NULL DEFAULT 'CONSIDERING',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "planned_vendor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "wedding_member_userId_key" ON "wedding_member"("userId");

-- CreateIndex
CREATE INDEX "wedding_member_weddingId_idx" ON "wedding_member"("weddingId");

-- CreateIndex
CREATE UNIQUE INDEX "wedding_invite_token_key" ON "wedding_invite"("token");

-- CreateIndex
CREATE INDEX "wedding_invite_weddingId_idx" ON "wedding_invite"("weddingId");

-- CreateIndex
CREATE INDEX "wedding_event_weddingId_idx" ON "wedding_event"("weddingId");

-- CreateIndex
CREATE UNIQUE INDEX "household_rsvpToken_key" ON "household"("rsvpToken");

-- CreateIndex
CREATE INDEX "household_weddingId_idx" ON "household"("weddingId");

-- CreateIndex
CREATE INDEX "guest_weddingId_idx" ON "guest"("weddingId");

-- CreateIndex
CREATE INDEX "guest_householdId_idx" ON "guest"("householdId");

-- CreateIndex
CREATE INDEX "guest_invitation_eventId_idx" ON "guest_invitation"("eventId");

-- CreateIndex
CREATE INDEX "seating_table_eventId_idx" ON "seating_table"("eventId");

-- CreateIndex
CREATE INDEX "table_seat_tableId_idx" ON "table_seat"("tableId");

-- CreateIndex
CREATE INDEX "budget_category_weddingId_idx" ON "budget_category"("weddingId");

-- CreateIndex
CREATE INDEX "expense_weddingId_idx" ON "expense"("weddingId");

-- CreateIndex
CREATE INDEX "expense_categoryId_idx" ON "expense"("categoryId");

-- CreateIndex
CREATE INDEX "payment_expenseId_idx" ON "payment"("expenseId");

-- CreateIndex
CREATE INDEX "task_weddingId_idx" ON "task"("weddingId");

-- CreateIndex
CREATE INDEX "schedule_item_eventId_idx" ON "schedule_item"("eventId");

-- CreateIndex
CREATE INDEX "planned_vendor_weddingId_idx" ON "planned_vendor"("weddingId");

-- AddForeignKey
ALTER TABLE "wedding" ADD CONSTRAINT "wedding_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "city"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wedding_member" ADD CONSTRAINT "wedding_member_weddingId_fkey" FOREIGN KEY ("weddingId") REFERENCES "wedding"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wedding_member" ADD CONSTRAINT "wedding_member_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wedding_invite" ADD CONSTRAINT "wedding_invite_weddingId_fkey" FOREIGN KEY ("weddingId") REFERENCES "wedding"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wedding_event" ADD CONSTRAINT "wedding_event_weddingId_fkey" FOREIGN KEY ("weddingId") REFERENCES "wedding"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "household" ADD CONSTRAINT "household_weddingId_fkey" FOREIGN KEY ("weddingId") REFERENCES "wedding"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guest" ADD CONSTRAINT "guest_weddingId_fkey" FOREIGN KEY ("weddingId") REFERENCES "wedding"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guest" ADD CONSTRAINT "guest_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guest_invitation" ADD CONSTRAINT "guest_invitation_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "guest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guest_invitation" ADD CONSTRAINT "guest_invitation_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "wedding_event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seating_table" ADD CONSTRAINT "seating_table_weddingId_fkey" FOREIGN KEY ("weddingId") REFERENCES "wedding"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seating_table" ADD CONSTRAINT "seating_table_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "wedding_event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "table_seat" ADD CONSTRAINT "table_seat_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "guest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "table_seat" ADD CONSTRAINT "table_seat_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "seating_table"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budget_category" ADD CONSTRAINT "budget_category_weddingId_fkey" FOREIGN KEY ("weddingId") REFERENCES "wedding"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense" ADD CONSTRAINT "expense_weddingId_fkey" FOREIGN KEY ("weddingId") REFERENCES "wedding"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense" ADD CONSTRAINT "expense_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "budget_category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense" ADD CONSTRAINT "expense_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "wedding_event"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense" ADD CONSTRAINT "expense_plannedVendorId_fkey" FOREIGN KEY ("plannedVendorId") REFERENCES "planned_vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment" ADD CONSTRAINT "payment_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "expense"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task" ADD CONSTRAINT "task_weddingId_fkey" FOREIGN KEY ("weddingId") REFERENCES "wedding"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_item" ADD CONSTRAINT "schedule_item_weddingId_fkey" FOREIGN KEY ("weddingId") REFERENCES "wedding"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_item" ADD CONSTRAINT "schedule_item_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "wedding_event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planned_vendor" ADD CONSTRAINT "planned_vendor_weddingId_fkey" FOREIGN KEY ("weddingId") REFERENCES "wedding"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planned_vendor" ADD CONSTRAINT "planned_vendor_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "business"("id") ON DELETE SET NULL ON UPDATE CASCADE;
