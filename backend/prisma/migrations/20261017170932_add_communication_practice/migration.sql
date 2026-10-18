-- CreateTable
CREATE TABLE "CommunicationPractice" (
    "id" VARCHAR(30) NOT NULL,
    "practiceDate" DATE NOT NULL,
    "topic" VARCHAR(180) NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "notes" TEXT,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "CommunicationPractice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CommunicationPractice_practiceDate_idx" ON "CommunicationPractice"("practiceDate");

-- CreateIndex
CREATE INDEX "CommunicationPractice_completed_practiceDate_idx" ON "CommunicationPractice"("completed", "practiceDate");
