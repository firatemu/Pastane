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
Object.defineProperty(exports, "__esModule", { value: true });
exports.CategoriesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../database/prisma.service");
const app_exception_1 = require("../common/exceptions/app.exception");
const error_codes_1 = require("../common/constants/error-codes");
const slug_util_1 = require("../common/utils/slug.util");
let CategoriesService = class CategoriesService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async tree() { const rows = await this.prisma.category.findMany({ where: { deletedAt: null, isActive: true }, orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] }); const map = new Map(rows.map(x => [x.id, { ...x, children: [] }])); const roots = []; for (const row of rows) {
        const node = map.get(row.id);
        if (row.parentId && map.has(row.parentId))
            map.get(row.parentId).children.push(node);
        else
            roots.push(node);
    } return roots; }
    async get(id) { const row = await this.prisma.category.findFirst({ where: { id, deletedAt: null }, include: { children: { where: { deletedAt: null } }, products: { where: { deletedAt: null } } } }); if (!row)
        throw new app_exception_1.AppException(error_codes_1.ERROR_CODES.CATEGORY_NOT_FOUND, 'Category not found', common_1.HttpStatus.NOT_FOUND); return row; }
    async getBySlug(slug) { const row = await this.prisma.category.findFirst({ where: { slug, deletedAt: null, isActive: true }, include: { children: { where: { deletedAt: null, isActive: true } }, products: { where: { deletedAt: null, status: 'ACTIVE' } } } }); if (!row)
        throw new app_exception_1.AppException(error_codes_1.ERROR_CODES.CATEGORY_NOT_FOUND, 'Category not found', common_1.HttpStatus.NOT_FOUND); return row; }
    async create(dto) { if (dto.parentId)
        await this.get(dto.parentId); const slug = await this.uniqueSlug(dto.name); return this.prisma.category.create({ data: { ...dto, slug } }); }
    async update(id, dto) { await this.get(id); if (dto.parentId === id)
        throw new app_exception_1.AppException(error_codes_1.ERROR_CODES.VALIDATION_FAILED, 'Category cannot be its own parent', common_1.HttpStatus.BAD_REQUEST); if (dto.parentId)
        await this.get(dto.parentId); const data = { ...dto, ...(dto.name ? { slug: await this.uniqueSlug(dto.name, id) } : {}) }; return this.prisma.category.update({ where: { id }, data }); }
    async remove(id) { await this.get(id); const count = await this.prisma.product.count({ where: { categoryId: id, deletedAt: null } }); if (count)
        throw new app_exception_1.AppException(error_codes_1.ERROR_CODES.CATEGORY_HAS_PRODUCTS, 'Category has products', common_1.HttpStatus.BAD_REQUEST); return this.prisma.category.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } }); }
    async uniqueSlug(name, excludeId) { const base = (0, slug_util_1.slugify)(name); let slug = base; let i = 2; while (await this.prisma.category.findFirst({ where: { slug, ...(excludeId ? { id: { not: excludeId } } : {}) } })) {
        slug = `${base}-${i++}`;
    } return slug; }
};
exports.CategoriesService = CategoriesService;
exports.CategoriesService = CategoriesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(prisma_service_1.PrismaService)),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CategoriesService);
//# sourceMappingURL=categories.service.js.map