-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('DRAFT', 'SCRIPTING', 'FETCHING_ASSETS', 'RENDERING', 'READY_TO_UPLOAD', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "VideoProject" (
    "id" TEXT NOT NULL,
    "niche" TEXT NOT NULL,
    "status" "ProjectStatus" NOT NULL DEFAULT 'DRAFT',
    "engineId" TEXT,
    "scriptData" JSONB,
    "audioPath" TEXT,
    "clipPaths" JSONB,
    "videoPath" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VideoProject_pkey" PRIMARY KEY ("id")
);
