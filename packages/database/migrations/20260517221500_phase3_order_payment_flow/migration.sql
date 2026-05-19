-- CreateEnum
CREATE TYPE "StockReservationStatus" AS ENUM ('ACTIVE', 'CONFIRMED', 'RELEASED', 'EXPIRED');

-- AlterTable
ALTER TABLE "order_item_options" DROP COLUMN "optionName",
DROP COLUMN "priceModifier",
ADD COLUMN     "optionNameSnapshot" TEXT NOT NULL,
ADD COLUMN     "priceModifierSnapshot" DECIMAL(10,2) NOT NULL;

-- AlterTable
ALTER TABLE "order_items" DROP COLUMN "productName",
DROP COLUMN "unitPrice",
ADD COLUMN     "productNameSnapshot" TEXT NOT NULL,
ADD COLUMN     "skuSnapshot" TEXT,
ADD COLUMN     "taxRateSnapshot" DECIMAL(5,2),
ADD COLUMN     "unitPriceSnapshot" DECIMAL(10,2) NOT NULL;

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "loyaltyPointsUsed" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "callbackPayloadHash" TEXT,
ADD COLUMN     "failureReason" TEXT,
ADD COLUMN     "idempotencyKey" TEXT NOT NULL,
ADD COLUMN     "processedAt" TIMESTAMP(3),
ADD COLUMN     "processingResult" TEXT,
ADD COLUMN     "providerStatus" TEXT,
ADD COLUMN     "providerToken" TEXT,
ADD COLUMN     "receivedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "stock_reservations" ADD COLUMN     "confirmedAt" TIMESTAMP(3),
ADD COLUMN     "orderItemId" TEXT,
ADD COLUMN     "releasedAt" TIMESTAMP(3),
ADD COLUMN     "stockEntryId" TEXT NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" "StockReservationStatus" NOT NULL DEFAULT 'ACTIVE';

-- CreateIndex
CREATE UNIQUE INDEX "carts_userId_key" ON "carts"("userId");

-- CreateIndex
CREATE INDEX "order_status_history_orderId_createdAt_idx" ON "order_status_history"("orderId", "createdAt");

-- CreateIndex
CREATE INDEX "orders_userId_status_idx" ON "orders"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "payments_idempotencyKey_key" ON "payments"("idempotencyKey");

-- CreateIndex
CREATE INDEX "payments_orderId_status_idx" ON "payments"("orderId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "payments_providerPaymentId_key" ON "payments"("providerPaymentId");

-- CreateIndex
CREATE UNIQUE INDEX "payments_conversationId_key" ON "payments"("conversationId");

-- CreateIndex
CREATE INDEX "stock_reservations_orderId_status_idx" ON "stock_reservations"("orderId", "status");

-- CreateIndex
CREATE INDEX "stock_reservations_stockEntryId_status_idx" ON "stock_reservations"("stockEntryId", "status");

-- CreateIndex
CREATE INDEX "stock_reservations_expiresAt_status_idx" ON "stock_reservations"("expiresAt", "status");

-- AddForeignKey
ALTER TABLE "stock_reservations" ADD CONSTRAINT "stock_reservations_stockEntryId_fkey" FOREIGN KEY ("stockEntryId") REFERENCES "stock_entries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

