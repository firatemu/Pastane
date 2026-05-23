-- CreateEnum
CREATE TYPE "ProductUnitKind" AS ENUM ('COUNT', 'WEIGHT', 'VOLUME');

-- CreateTable
CREATE TABLE "product_units" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "kind" "ProductUnitKind" NOT NULL DEFAULT 'COUNT',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_units_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "product_units_symbol_key" ON "product_units"("symbol");
CREATE INDEX "product_units_deletedAt_isActive_idx" ON "product_units"("deletedAt", "isActive");

INSERT INTO "product_units" ("id", "name", "symbol", "kind", "sortOrder", "isActive", "updatedAt") VALUES
('00000000-0000-4000-8000-000000000301', 'Adet', 'adet', 'COUNT', 1, true, CURRENT_TIMESTAMP),
('00000000-0000-4000-8000-000000000302', 'Tane', 'tane', 'COUNT', 2, true, CURRENT_TIMESTAMP),
('00000000-0000-4000-8000-000000000303', 'Gram', 'gr', 'WEIGHT', 3, true, CURRENT_TIMESTAMP),
('00000000-0000-4000-8000-000000000304', 'Kilogram', 'kg', 'WEIGHT', 4, true, CURRENT_TIMESTAMP);

ALTER TABLE "products" ADD COLUMN "unitId" TEXT;
ALTER TABLE "products" ADD COLUMN "unitQuantity" DECIMAL(10,3);

UPDATE "products" SET "unitId" = '00000000-0000-4000-8000-000000000301' WHERE "unitId" IS NULL;

ALTER TABLE "products" ALTER COLUMN "unitId" SET NOT NULL;

ALTER TABLE "products" ADD CONSTRAINT "products_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "product_units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "products_unitId_idx" ON "products"("unitId");

UPDATE "products" SET "unitQuantity" = 500, "unitId" = '00000000-0000-4000-8000-000000000303'
WHERE "slug" = 'sutlac';

UPDATE "products" SET "unitQuantity" = 1, "unitId" = '00000000-0000-4000-8000-000000000304'
WHERE "slug" = 'yas-pasta';
