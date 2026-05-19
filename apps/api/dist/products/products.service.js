"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var ProductsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductsService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const audit_service_1 = require("../audit/audit.service");
const error_codes_1 = require("../common/constants/error-codes");
const app_exception_1 = require("../common/exceptions/app.exception");
const pagination_util_1 = require("../common/utils/pagination.util");
const slug_util_1 = require("../common/utils/slug.util");
const prisma_service_1 = require("../database/prisma.service");
const minio_provider_1 = require("../media/providers/minio.provider");
let ProductsService = ProductsService_1 = class ProductsService {
    prisma;
    audit;
    minio;
    logger = new common_1.Logger(ProductsService_1.name);
    constructor(prisma, audit, minio) {
        this.prisma = prisma;
        this.audit = audit;
        this.minio = minio;
    }
    async list(query) { const { page, limit } = (0, pagination_util_1.normalizePagination)(query.page, query.limit); const where = { deletedAt: null, status: client_1.ProductStatus.ACTIVE, category: { deletedAt: null, isActive: true }, ...(query.categoryId ? { categoryId: query.categoryId } : {}), ...(query.search ? { OR: [{ name: { contains: query.search, mode: 'insensitive' } }, { description: { contains: query.search, mode: 'insensitive' } }] } : {}), ...(query.minPrice !== undefined || query.maxPrice !== undefined ? { price: { ...(query.minPrice !== undefined ? { gte: new client_1.Prisma.Decimal(query.minPrice) } : {}), ...(query.maxPrice !== undefined ? { lte: new client_1.Prisma.Decimal(query.maxPrice) } : {}) } } : {}) }; const [items, total] = await this.prisma.$transaction([this.prisma.product.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { [query.sortBy ?? 'createdAt']: query.sortOrder ?? 'desc' }, include: this.include() }), this.prisma.product.count({ where })]); return { items, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } }; }
    async get(id, publicOnly = false) { const x = await this.prisma.product.findFirst({ where: { id, deletedAt: null, ...(publicOnly ? { status: client_1.ProductStatus.ACTIVE, category: { deletedAt: null, isActive: true } } : {}) }, include: this.include() }); if (!x)
        throw new app_exception_1.AppException(error_codes_1.ERROR_CODES.PRODUCT_NOT_FOUND, 'Product not found', common_1.HttpStatus.NOT_FOUND); return x; }
    async getBySlug(slug) { const x = await this.prisma.product.findFirst({ where: { slug, deletedAt: null, status: client_1.ProductStatus.ACTIVE, category: { deletedAt: null, isActive: true } }, include: this.include() }); if (!x)
        throw new app_exception_1.AppException(error_codes_1.ERROR_CODES.PRODUCT_NOT_FOUND, 'Product not found', common_1.HttpStatus.NOT_FOUND); return x; }
    async create(dto, actor) { await this.assertCategory(dto.categoryId); this.assertDiscount(dto.price, dto.discountedPrice); await this.assertAllergens(dto.allergenIds ?? []); const slug = await this.uniqueSlug(dto.name); const created = await this.prisma.product.create({ data: { name: dto.name, description: dto.description, shortDescription: dto.shortDescription, price: new client_1.Prisma.Decimal(dto.price), discountedPrice: dto.discountedPrice === undefined ? undefined : new client_1.Prisma.Decimal(dto.discountedPrice), categoryId: dto.categoryId, status: dto.status, preparationMinutes: dto.preparationMinutes, slug, allergens: { create: (dto.allergenIds ?? []).map(allergenId => ({ allergenId })) } }, include: this.include() }); await this.audit.log({ actorId: actor?.sub, action: 'products.create', entityType: 'Product', entityId: created.id, newValues: { name: created.name, slug: created.slug } }); return created; }
    async update(id, dto, actor) { const current = await this.get(id); if (dto.categoryId)
        await this.assertCategory(dto.categoryId); this.assertDiscount(dto.price ?? Number(current.price), dto.discountedPrice); const data = { ...this.productData(dto), ...(dto.name ? { slug: await this.uniqueSlug(dto.name, id) } : {}) }; const updated = await this.prisma.product.update({ where: { id }, data, include: this.include() }); await this.audit.log({ actorId: actor?.sub, action: 'products.update', entityType: 'Product', entityId: id, oldValues: { name: current.name, status: current.status }, newValues: { name: updated.name, status: updated.status } }); return updated; }
    async remove(id, actor) {
        const current = await this.get(id);
        for (const img of current.images) {
            if (img.bucket && img.objectKey) {
                try {
                    await this.minio.removeObject(img.bucket, img.objectKey);
                }
                catch (err) {
                    this.logger.warn(`MinIO removeObject failed (${img.bucket}/${img.objectKey}): ${err instanceof Error ? err.message : err}`);
                }
            }
        }
        const removed = await this.prisma.$transaction([
            this.prisma.productImage.updateMany({
                where: { productId: id, deletedAt: null },
                data: { deletedAt: new Date(), isPrimary: false },
            }),
            this.prisma.product.update({ where: { id }, data: { deletedAt: new Date(), status: client_1.ProductStatus.INACTIVE } }),
        ]);
        const productRow = removed[1];
        await this.audit.log({ actorId: actor?.sub, action: 'products.delete', entityType: 'Product', entityId: id, oldValues: { name: current.name, status: current.status } });
        return productRow;
    }
    async addGroup(productId, dto) { await this.get(productId); return this.prisma.productOptionGroup.create({ data: { productId, ...dto } }); }
    async addOption(productId, groupId, dto) { await this.get(productId); const group = await this.prisma.productOptionGroup.findFirst({ where: { id: groupId, productId, deletedAt: null } }); if (!group)
        throw new app_exception_1.AppException(error_codes_1.ERROR_CODES.PRODUCT_NOT_FOUND, 'Option group not found for product', common_1.HttpStatus.NOT_FOUND); return this.prisma.productOption.create({ data: { optionGroupId: groupId, ...dto, priceModifier: new client_1.Prisma.Decimal(dto.priceModifier ?? 0) } }); }
    async setAllergens(productId, ids) { await this.get(productId); await this.assertAllergens(ids); await this.prisma.$transaction([this.prisma.productAllergen.deleteMany({ where: { productId } }), ...ids.map(allergenId => this.prisma.productAllergen.create({ data: { productId, allergenId } }))]); return this.get(productId); }
    include() { return { category: true, images: { where: { deletedAt: null }, orderBy: { sortOrder: 'asc' } }, allergens: { include: { allergen: true } }, optionGroups: { where: { deletedAt: null }, include: { options: { where: { deletedAt: null }, orderBy: { sortOrder: 'asc' } } }, orderBy: { sortOrder: 'asc' } } }; }
    async assertCategory(id) { const x = await this.prisma.category.findFirst({ where: { id, deletedAt: null } }); if (!x)
        throw new app_exception_1.AppException(error_codes_1.ERROR_CODES.CATEGORY_NOT_FOUND, 'Category not found', common_1.HttpStatus.NOT_FOUND); }
    async assertAllergens(ids) { if (!ids.length)
        return; const count = await this.prisma.allergen.count({ where: { id: { in: ids }, deletedAt: null } }); if (count !== ids.length)
        throw new app_exception_1.AppException(error_codes_1.ERROR_CODES.ALLERGEN_NOT_FOUND, 'Allergen not found', common_1.HttpStatus.NOT_FOUND); }
    assertDiscount(price, discount) { if (discount !== undefined && discount > price)
        throw new app_exception_1.AppException(error_codes_1.ERROR_CODES.VALIDATION_FAILED, 'Discounted price cannot exceed price', common_1.HttpStatus.BAD_REQUEST); }
    productData(dto) { const rest = { ...dto }; delete rest.allergenIds; return { ...rest, ...(rest.price !== undefined ? { price: new client_1.Prisma.Decimal(rest.price) } : {}), ...(rest.discountedPrice !== undefined ? { discountedPrice: new client_1.Prisma.Decimal(rest.discountedPrice) } : {}) }; }
    async uniqueSlug(name, excludeId) { const base = (0, slug_util_1.slugify)(name); let slug = base; let i = 2; while (await this.prisma.product.findFirst({ where: { slug, ...(excludeId ? { id: { not: excludeId } } : {}) } })) {
        slug = `${base}-${i++}`;
    } return slug; }
};
exports.ProductsService = ProductsService;
exports.ProductsService = ProductsService = ProductsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(prisma_service_1.PrismaService)),
    __param(1, (0, common_1.Inject)(audit_service_1.AuditService)),
    __param(2, (0, common_1.Inject)(minio_provider_1.MINIO_CLIENT)),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_service_1.AuditService, Function])
], ProductsService);
//# sourceMappingURL=products.service.js.map