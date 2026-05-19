-- AlterTable
ALTER TABLE "product_images" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "product_option_groups" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "product_options" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "stock_entries" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "allergens_deletedAt_idx" ON "allergens"("deletedAt");

-- CreateIndex
CREATE INDEX "categories_parentId_idx" ON "categories"("parentId");

-- CreateIndex
CREATE INDEX "categories_isActive_deletedAt_idx" ON "categories"("isActive", "deletedAt");

-- CreateIndex
CREATE INDEX "delivery_zones_isActive_deletedAt_idx" ON "delivery_zones"("isActive", "deletedAt");

-- CreateIndex
CREATE INDEX "product_images_productId_sortOrder_idx" ON "product_images"("productId", "sortOrder");

-- CreateIndex
CREATE INDEX "product_images_productId_isPrimary_idx" ON "product_images"("productId", "isPrimary");

-- CreateIndex
CREATE INDEX "product_option_groups_productId_deletedAt_idx" ON "product_option_groups"("productId", "deletedAt");

-- CreateIndex
CREATE INDEX "product_options_optionGroupId_deletedAt_idx" ON "product_options"("optionGroupId", "deletedAt");

-- CreateIndex
CREATE INDEX "products_categoryId_idx" ON "products"("categoryId");

-- CreateIndex
CREATE INDEX "products_status_deletedAt_idx" ON "products"("status", "deletedAt");

-- CreateIndex
CREATE INDEX "stock_entries_productId_date_deletedAt_idx" ON "stock_entries"("productId", "date", "deletedAt");

-- CreateIndex
CREATE INDEX "stores_isActive_deletedAt_idx" ON "stores"("isActive", "deletedAt");
