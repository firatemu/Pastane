-- CreateEnum
CREATE TYPE "BannerMediaType" AS ENUM ('IMAGE', 'VIDEO');

-- CreateTable
CREATE TABLE "banners" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "description" TEXT,
    "mediaType" "BannerMediaType" NOT NULL,
    "desktopMediaUrl" TEXT NOT NULL,
    "desktopMediaBucket" TEXT,
    "desktopMediaObjectKey" TEXT,
    "mobileMediaUrl" TEXT NOT NULL,
    "mobileMediaBucket" TEXT,
    "mobileMediaObjectKey" TEXT,
    "buttonText" TEXT,
    "buttonUrl" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "banners_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "banners_isActive_deletedAt_sortOrder_idx" ON "banners"("isActive", "deletedAt", "sortOrder");

-- CreateIndex
CREATE INDEX "banners_deletedAt_startsAt_endsAt_idx" ON "banners"("deletedAt", "startsAt", "endsAt");
