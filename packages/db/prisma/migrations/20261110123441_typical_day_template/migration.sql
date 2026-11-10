-- CreateTable
CREATE TABLE "typical_day_template" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "startTime" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "typical_day_template_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "typical_day_step" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "titleMk" TEXT NOT NULL,
    "titleSq" TEXT,
    "titleEn" TEXT,
    "durationMin" INTEGER NOT NULL,
    "eventType" "EventType",
    "forAll" BOOLEAN NOT NULL DEFAULT false,
    "forSides" "GuestSide"[],
    "forRoles" "GuestRole"[],

    CONSTRAINT "typical_day_step_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "typical_day_step_templateId_idx" ON "typical_day_step"("templateId");

-- AddForeignKey
ALTER TABLE "typical_day_step" ADD CONSTRAINT "typical_day_step_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "typical_day_template"("id") ON DELETE CASCADE ON UPDATE CASCADE;
