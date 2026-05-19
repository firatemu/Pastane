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
exports.CartService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../database/prisma.service");
const app_exception_1 = require("../common/exceptions/app.exception");
const error_codes_1 = require("../common/constants/error-codes");
let CartService = class CartService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async get(userId) { return this.prisma.cart.upsert({ where: { userId }, update: {}, create: { userId }, include: this.include() }); }
    async add(userId, dto) { const product = await this.getProduct(dto.productId); await this.validateOptions(product.id, dto.optionIds ?? []); const cart = await this.prisma.cart.upsert({ where: { userId }, update: {}, create: { userId } }); return this.prisma.cartItem.create({ data: { cartId: cart.id, productId: product.id, quantity: dto.quantity, unitPrice: product.discountedPrice ?? product.price, customNote: dto.customNote, options: { create: (dto.optionIds ?? []).map(optionId => ({ optionId })) } }, include: { options: true, product: true } }); }
    async update(userId, id, dto) { const item = await this.findItem(userId, id); if (dto.optionIds) {
        await this.validateOptions(item.productId, dto.optionIds);
        await this.prisma.cartItemOption.deleteMany({ where: { cartItemId: id } });
    } return this.prisma.cartItem.update({ where: { id }, data: { quantity: dto.quantity, customNote: dto.customNote, ...(dto.optionIds ? { options: { create: dto.optionIds.map(optionId => ({ optionId })) } } : {}) }, include: { options: true, product: true } }); }
    async remove(userId, id) { await this.findItem(userId, id); return this.prisma.cartItem.delete({ where: { id } }); }
    async clear(userId) { const cart = await this.get(userId); await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id } }); return { cleared: true }; }
    include() { return { items: { include: { product: true, options: { include: { option: true } } } } }; }
    async findItem(userId, id) { const x = await this.prisma.cartItem.findFirst({ where: { id, cart: { userId } } }); if (!x)
        throw new app_exception_1.AppException(error_codes_1.ERROR_CODES.CART_ITEM_NOT_FOUND, 'Cart item not found', common_1.HttpStatus.NOT_FOUND); return x; }
    async getProduct(id) { const p = await this.prisma.product.findFirst({ where: { id, deletedAt: null, status: client_1.ProductStatus.ACTIVE }, include: { optionGroups: { where: { deletedAt: null }, include: { options: { where: { deletedAt: null, isActive: true } } } } } }); if (!p)
        throw new app_exception_1.AppException(error_codes_1.ERROR_CODES.PRODUCT_NOT_ACTIVE, 'Product not active', common_1.HttpStatus.BAD_REQUEST); return p; }
    async validateOptions(productId, ids) { const groups = await this.prisma.productOptionGroup.findMany({ where: { productId, deletedAt: null }, include: { options: { where: { deletedAt: null, isActive: true } } } }); const selected = new Set(ids); const all = new Set(groups.flatMap(g => g.options.map(o => o.id))); if (ids.some(id => !all.has(id)))
        throw new app_exception_1.AppException(error_codes_1.ERROR_CODES.CART_ITEM_INVALID_OPTIONS, 'Invalid options', common_1.HttpStatus.BAD_REQUEST); for (const group of groups) {
        const count = group.options.filter(o => selected.has(o.id)).length;
        if (group.isRequired && count === 0)
            throw new app_exception_1.AppException(error_codes_1.ERROR_CODES.CART_ITEM_REQUIRED_OPTION_MISSING, 'Required option missing', common_1.HttpStatus.BAD_REQUEST);
        if (!group.isMultiple && count > 1)
            throw new app_exception_1.AppException(error_codes_1.ERROR_CODES.CART_ITEM_INVALID_OPTIONS, 'Too many options selected', common_1.HttpStatus.BAD_REQUEST);
    } }
};
exports.CartService = CartService;
exports.CartService = CartService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(prisma_service_1.PrismaService)),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CartService);
//# sourceMappingURL=cart.service.js.map