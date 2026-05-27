-- CreateEnum
CREATE TYPE "MediaAssetKind" AS ENUM ('IMAGE', 'VIDEO');

-- CreateEnum
CREATE TYPE "MediaAssetSource" AS ENUM ('PRODUCT_UPLOAD', 'BANNER_UPLOAD', 'GALLERY_UPLOAD');

-- AlterTable
ALTER TABLE "product_images" ADD COLUMN "mediaAssetId" TEXT;
ALTER TABLE "product_images" ADD COLUMN "updatedAt" TIMESTAMP(3);

UPDATE "product_images"
SET "updatedAt" = COALESCE("createdAt", CURRENT_TIMESTAMP)
WHERE "updatedAt" IS NULL;

ALTER TABLE "product_images" ALTER COLUMN "updatedAt" SET NOT NULL;

-- AlterTable
ALTER TABLE "banners" ADD COLUMN "desktopMediaAssetId" TEXT;
ALTER TABLE "banners" ADD COLUMN "mobileMediaAssetId" TEXT;
ALTER TABLE "banners" ALTER COLUMN "desktopMediaUrl" DROP NOT NULL;
ALTER TABLE "banners" ALTER COLUMN "mobileMediaUrl" DROP NOT NULL;

-- CreateTable
CREATE TABLE "media_assets" (
    "id" TEXT NOT NULL,
    "kind" "MediaAssetKind" NOT NULL,
    "source" "MediaAssetSource" NOT NULL,
    "bucket" TEXT NOT NULL,
    "objectKey" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "media_assets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "media_assets_bucket_objectKey_key" ON "media_assets"("bucket", "objectKey");

WITH product_asset_rows AS (
  SELECT DISTINCT
    pi."bucket",
    pi."objectKey",
    pi."url",
    COALESCE(
      pi."mimeType",
      CASE
        WHEN lower(pi."objectKey") LIKE '%.png' THEN 'image/png'
        WHEN lower(pi."objectKey") LIKE '%.jpg' OR lower(pi."objectKey") LIKE '%.jpeg' THEN 'image/jpeg'
        WHEN lower(pi."objectKey") LIKE '%.gif' THEN 'image/gif'
        WHEN lower(pi."objectKey") LIKE '%.webp' THEN 'image/webp'
        WHEN lower(pi."objectKey") LIKE '%.mp4' THEN 'video/mp4'
        WHEN lower(pi."objectKey") LIKE '%.webm' THEN 'video/webm'
        ELSE 'application/octet-stream'
      END
    ) AS "mimeType",
    COALESCE(pi."size", 0) AS "size",
    COALESCE(NULLIF(regexp_replace(pi."objectKey", '^.*/', ''), ''), 'product-upload') AS "title",
    pi."createdAt"
  FROM "product_images" pi
  WHERE pi."deletedAt" IS NULL
    AND pi."bucket" IS NOT NULL
    AND pi."objectKey" IS NOT NULL
),
prepared_product_assets AS (
  SELECT
    substr(digest, 1, 8) || '-' ||
    substr(digest, 9, 4) || '-' ||
    '4' || substr(digest, 14, 3) || '-' ||
    'a' || substr(digest, 17, 3) || '-' ||
    substr(digest, 20, 12) AS "id",
    CASE WHEN "mimeType" LIKE 'video/%' THEN 'VIDEO'::"MediaAssetKind" ELSE 'IMAGE'::"MediaAssetKind" END AS "kind",
    'PRODUCT_UPLOAD'::"MediaAssetSource" AS "source",
    "bucket",
    "objectKey",
    "url",
    "mimeType",
    "size",
    "title",
    COALESCE("createdAt", CURRENT_TIMESTAMP) AS "createdAt",
    CURRENT_TIMESTAMP AS "updatedAt"
  FROM (
    SELECT
      md5("bucket" || '/' || "objectKey") AS digest,
      *
    FROM product_asset_rows
  ) src
)
INSERT INTO "media_assets" (
  "id",
  "kind",
  "source",
  "bucket",
  "objectKey",
  "url",
  "mimeType",
  "size",
  "title",
  "createdAt",
  "updatedAt"
)
SELECT
  "id",
  "kind",
  "source",
  "bucket",
  "objectKey",
  "url",
  "mimeType",
  "size",
  "title",
  "createdAt",
  "updatedAt"
FROM prepared_product_assets
ON CONFLICT ("bucket", "objectKey") DO NOTHING;

WITH banner_asset_rows AS (
  SELECT DISTINCT
    b."mediaType",
    b."desktopMediaBucket" AS "bucket",
    b."desktopMediaObjectKey" AS "objectKey",
    b."desktopMediaUrl" AS "url",
    b."createdAt"
  FROM "banners" b
  WHERE b."deletedAt" IS NULL
    AND b."desktopMediaBucket" IS NOT NULL
    AND b."desktopMediaObjectKey" IS NOT NULL

  UNION

  SELECT DISTINCT
    b."mediaType",
    b."mobileMediaBucket" AS "bucket",
    b."mobileMediaObjectKey" AS "objectKey",
    b."mobileMediaUrl" AS "url",
    b."createdAt"
  FROM "banners" b
  WHERE b."deletedAt" IS NULL
    AND b."mobileMediaBucket" IS NOT NULL
    AND b."mobileMediaObjectKey" IS NOT NULL
),
prepared_banner_assets AS (
  SELECT
    substr(digest, 1, 8) || '-' ||
    substr(digest, 9, 4) || '-' ||
    '4' || substr(digest, 14, 3) || '-' ||
    'a' || substr(digest, 17, 3) || '-' ||
    substr(digest, 20, 12) AS "id",
    CASE WHEN "mediaType" = 'VIDEO'::"BannerMediaType" THEN 'VIDEO'::"MediaAssetKind" ELSE 'IMAGE'::"MediaAssetKind" END AS "kind",
    'BANNER_UPLOAD'::"MediaAssetSource" AS "source",
    "bucket",
    "objectKey",
    COALESCE("url", '') AS "url",
    CASE
      WHEN lower("objectKey") LIKE '%.png' THEN 'image/png'
      WHEN lower("objectKey") LIKE '%.jpg' OR lower("objectKey") LIKE '%.jpeg' THEN 'image/jpeg'
      WHEN lower("objectKey") LIKE '%.gif' THEN 'image/gif'
      WHEN lower("objectKey") LIKE '%.webp' THEN 'image/webp'
      WHEN lower("objectKey") LIKE '%.mp4' THEN 'video/mp4'
      WHEN lower("objectKey") LIKE '%.webm' THEN 'video/webm'
      WHEN "mediaType" = 'VIDEO'::"BannerMediaType" THEN 'video/mp4'
      ELSE 'image/jpeg'
    END AS "mimeType",
    0 AS "size",
    COALESCE(NULLIF(regexp_replace("objectKey", '^.*/', ''), ''), 'banner-upload') AS "title",
    COALESCE("createdAt", CURRENT_TIMESTAMP) AS "createdAt",
    CURRENT_TIMESTAMP AS "updatedAt"
  FROM (
    SELECT
      md5("bucket" || '/' || "objectKey") AS digest,
      *
    FROM banner_asset_rows
  ) src
)
INSERT INTO "media_assets" (
  "id",
  "kind",
  "source",
  "bucket",
  "objectKey",
  "url",
  "mimeType",
  "size",
  "title",
  "createdAt",
  "updatedAt"
)
SELECT
  "id",
  "kind",
  "source",
  "bucket",
  "objectKey",
  "url",
  "mimeType",
  "size",
  "title",
  "createdAt",
  "updatedAt"
FROM prepared_banner_assets
ON CONFLICT ("bucket", "objectKey") DO NOTHING;

UPDATE "product_images" pi
SET "mediaAssetId" = ma."id"
FROM "media_assets" ma
WHERE pi."mediaAssetId" IS NULL
  AND pi."bucket" = ma."bucket"
  AND pi."objectKey" = ma."objectKey";

UPDATE "banners" b
SET "desktopMediaAssetId" = ma."id"
FROM "media_assets" ma
WHERE b."desktopMediaAssetId" IS NULL
  AND b."desktopMediaBucket" = ma."bucket"
  AND b."desktopMediaObjectKey" = ma."objectKey";

UPDATE "banners" b
SET "mobileMediaAssetId" = ma."id"
FROM "media_assets" ma
WHERE b."mobileMediaAssetId" IS NULL
  AND b."mobileMediaBucket" = ma."bucket"
  AND b."mobileMediaObjectKey" = ma."objectKey";

-- CreateIndex
CREATE INDEX "media_assets_deletedAt_createdAt_idx" ON "media_assets"("deletedAt", "createdAt");

-- CreateIndex
CREATE INDEX "media_assets_kind_deletedAt_createdAt_idx" ON "media_assets"("kind", "deletedAt", "createdAt");

-- CreateIndex
CREATE INDEX "media_assets_source_deletedAt_createdAt_idx" ON "media_assets"("source", "deletedAt", "createdAt");

-- CreateIndex
CREATE INDEX "product_images_mediaAssetId_idx" ON "product_images"("mediaAssetId");

-- CreateIndex
CREATE INDEX "banners_desktopMediaAssetId_idx" ON "banners"("desktopMediaAssetId");

-- CreateIndex
CREATE INDEX "banners_mobileMediaAssetId_idx" ON "banners"("mobileMediaAssetId");

-- AddForeignKey
ALTER TABLE "product_images"
ADD CONSTRAINT "product_images_mediaAssetId_fkey"
FOREIGN KEY ("mediaAssetId") REFERENCES "media_assets"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "banners"
ADD CONSTRAINT "banners_desktopMediaAssetId_fkey"
FOREIGN KEY ("desktopMediaAssetId") REFERENCES "media_assets"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "banners"
ADD CONSTRAINT "banners_mobileMediaAssetId_fkey"
FOREIGN KEY ("mobileMediaAssetId") REFERENCES "media_assets"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
