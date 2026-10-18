-- CreateEnum
CREATE TYPE "CodingQuestionType" AS ENUM ('DSA', 'INTERVIEW');

-- CreateTable
CREATE TABLE "CodingQuestion" (
    "id" VARCHAR(30) NOT NULL,
    "date" DATE NOT NULL,
    "type" "CodingQuestionType" NOT NULL,
    "questionContent" TEXT NOT NULL,
    "expectedOutput" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "CodingQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CodingQuestion_date_idx" ON "CodingQuestion"("date");

-- CreateIndex
CREATE INDEX "CodingQuestion_type_date_idx" ON "CodingQuestion"("type", "date");
