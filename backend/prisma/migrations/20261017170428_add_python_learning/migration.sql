-- CreateTable
CREATE TABLE "PythonLearningEntry" (
    "id" VARCHAR(30) NOT NULL,
    "practiceDate" DATE NOT NULL,
    "topic" VARCHAR(180) NOT NULL,
    "notes" TEXT,
    "exerciseDescription" TEXT,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "PythonLearningEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PythonLearningEntry_practiceDate_idx" ON "PythonLearningEntry"("practiceDate");

-- CreateIndex
CREATE INDEX "PythonLearningEntry_completed_practiceDate_idx" ON "PythonLearningEntry"("completed", "practiceDate");
