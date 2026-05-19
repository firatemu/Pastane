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
exports.ProductsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const permissions_decorator_1 = require("../common/decorators/permissions.decorator");
const public_decorator_1 = require("../common/decorators/public.decorator");
const create_option_dto_1 = require("./dto/create-option.dto");
const create_option_group_dto_1 = require("./dto/create-option-group.dto");
const create_product_dto_1 = require("./dto/create-product.dto");
const query_product_dto_1 = require("./dto/query-product.dto");
const update_product_allergens_dto_1 = require("./dto/update-product-allergens.dto");
const update_product_dto_1 = require("./dto/update-product.dto");
const products_service_1 = require("./products.service");
let ProductsController = class ProductsController {
    svc;
    constructor(svc) {
        this.svc = svc;
    }
    list(q) { return this.svc.list(q); }
    slug(slug) { return this.svc.getBySlug(slug); }
    get(id) { return this.svc.get(id, true); }
    create(user, dto) { return this.svc.create(dto, user); }
    update(user, id, dto) { return this.svc.update(id, dto, user); }
    remove(user, id) { return this.svc.remove(id, user); }
    group(id, dto) { return this.svc.addGroup(id, dto); }
    option(id, groupId, dto) { return this.svc.addOption(id, groupId, dto); }
    allergens(id, dto) { return this.svc.setAllergens(id, dto.allergenIds); }
};
exports.ProductsController = ProductsController;
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [query_product_dto_1.QueryProductDto]),
    __metadata("design:returntype", void 0)
], ProductsController.prototype, "list", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)('slug/:slug'),
    __param(0, (0, common_1.Param)('slug')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ProductsController.prototype, "slug", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ProductsController.prototype, "get", null);
__decorate([
    (0, permissions_decorator_1.Permissions)('products.create'),
    (0, swagger_1.ApiBody)({ type: create_product_dto_1.CreateProductDto }),
    (0, common_1.Post)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_product_dto_1.CreateProductDto]),
    __metadata("design:returntype", void 0)
], ProductsController.prototype, "create", null);
__decorate([
    (0, permissions_decorator_1.Permissions)('products.update'),
    (0, swagger_1.ApiBody)({ type: update_product_dto_1.UpdateProductDto }),
    (0, common_1.Patch)(':id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, update_product_dto_1.UpdateProductDto]),
    __metadata("design:returntype", void 0)
], ProductsController.prototype, "update", null);
__decorate([
    (0, permissions_decorator_1.Permissions)('products.delete'),
    (0, common_1.Delete)(':id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], ProductsController.prototype, "remove", null);
__decorate([
    (0, permissions_decorator_1.Permissions)('products.manageOptions'),
    (0, swagger_1.ApiBody)({ type: create_option_group_dto_1.CreateOptionGroupDto }),
    (0, common_1.Post)(':id/option-groups'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_option_group_dto_1.CreateOptionGroupDto]),
    __metadata("design:returntype", void 0)
], ProductsController.prototype, "group", null);
__decorate([
    (0, permissions_decorator_1.Permissions)('products.manageOptions'),
    (0, swagger_1.ApiBody)({ type: create_option_dto_1.CreateOptionDto }),
    (0, common_1.Post)(':id/option-groups/:groupId/options'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('groupId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, create_option_dto_1.CreateOptionDto]),
    __metadata("design:returntype", void 0)
], ProductsController.prototype, "option", null);
__decorate([
    (0, permissions_decorator_1.Permissions)('products.manageAllergens'),
    (0, swagger_1.ApiBody)({ type: update_product_allergens_dto_1.UpdateProductAllergensDto }),
    (0, common_1.Patch)(':id/allergens'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_product_allergens_dto_1.UpdateProductAllergensDto]),
    __metadata("design:returntype", void 0)
], ProductsController.prototype, "allergens", null);
exports.ProductsController = ProductsController = __decorate([
    (0, swagger_1.ApiTags)('Products'),
    (0, swagger_1.ApiExtraModels)(query_product_dto_1.QueryProductDto),
    (0, common_1.Controller)('products'),
    __param(0, (0, common_1.Inject)(products_service_1.ProductsService)),
    __metadata("design:paramtypes", [products_service_1.ProductsService])
], ProductsController);
//# sourceMappingURL=products.controller.js.map