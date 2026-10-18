-- CreateEnum
CREATE TYPE "JobApplicationStatus" AS ENUM ('SAVED', 'APPLIED', 'ASSESSMENT', 'INTERVIEW', 'OFFER', 'REJECTED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "JobType" AS ENUM ('FULL_TIME', 'INTERNSHIP', 'CONTRACT', 'OTHER');

-- CreateEnum
CREATE TYPE "WorkArrangement" AS ENUM ('ONSITE', 'HYBRID', 'REMOTE');

-- CreateTable
CREATE TABLE "JobApplication" (
    "id" VARCHAR(30) NOT NULL,
    "companyName" VARCHAR(160) NOT NULL,
    "jobTitle" VARCHAR(180) NOT NULL,
    "jobUrl" VARCHAR(2048),
    "jobDescription" TEXT,
    "applicationDate" DATE,
    "jobType" "JobType",
    "workArrangement" "WorkArrangement",
    "matchAssessment" TEXT,
    "resumeVersion" VARCHAR(160),
    "status" "JobApplicationStatus" NOT NULL DEFAULT 'SAVED',
    "followUpDate" DATE,
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "JobApplication_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "JobApplication_status_applicationDate_idx" ON "JobApplication"("status", "applicationDate");

-- CreateIndex
CREATE INDEX "JobApplication_applicationDate_idx" ON "JobApplication"("applicationDate");

-- CreateIndex
CREATE INDEX "JobApplication_followUpDate_idx" ON "JobApplication"("followUpDate");

-- CreateIndex
CREATE INDEX "JobApplication_companyName_jobTitle_idx" ON "JobApplication"("companyName", "jobTitle");
