-- Drop stock reservation and entry tables
DROP TABLE IF EXISTS "stock_reservations";
DROP TABLE IF EXISTS "stock_movements";
DROP TABLE IF EXISTS "stock_entries";

-- Drop stock-related enums
DROP TYPE IF EXISTS "StockReservationStatus";
DROP TYPE IF EXISTS "StockMovementType";

-- Remove product default stock columns
ALTER TABLE "products" DROP COLUMN IF EXISTS "defaultStockQuantity";
ALTER TABLE "products" DROP COLUMN IF EXISTS "defaultAvailableFrom";
ALTER TABLE "products" DROP COLUMN IF EXISTS "defaultAvailableTo";

-- Add publication and sale window columns
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "isPublished" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "saleWindowStart" TEXT;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "saleWindowEnd" TEXT;
