-- AlterTable
ALTER TABLE "products" ADD COLUMN     "defaultAvailableFrom" TEXT,
ADD COLUMN     "defaultAvailableTo" TEXT,
ADD COLUMN     "defaultStockQuantity" INTEGER;
