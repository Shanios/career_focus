-- CreateEnum
CREATE TYPE "JournalMood" AS ENUM ('VERY_GOOD', 'GOOD', 'NEUTRAL', 'LOW', 'VERY_LOW');

-- CreateTable
CREATE TABLE "JournalEntry" (
    "id" VARCHAR(30) NOT NULL,
    "entryDate" DATE NOT NULL,
    "title" VARCHAR(160) NOT NULL,
    "content" TEXT NOT NULL,
    "mood" "JournalMood",
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "JournalEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "JournalEntry_entryDate_createdAt_idx" ON "JournalEntry"("entryDate", "createdAt");
