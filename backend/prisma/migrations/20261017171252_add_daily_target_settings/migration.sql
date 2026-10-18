-- CreateTable
CREATE TABLE "DailyTargetSettings" (
    "id" VARCHAR(30) NOT NULL DEFAULT 'daily',
    "jobApplications" INTEGER NOT NULL DEFAULT 2,
    "dsaQuestions" INTEGER NOT NULL DEFAULT 2,
    "interviewQuestions" INTEGER NOT NULL DEFAULT 1,
    "pythonLessons" INTEGER NOT NULL DEFAULT 1,
    "communicationSessions" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "DailyTargetSettings_pkey" PRIMARY KEY ("id")
);
