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
exports.AllergensController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const permissions_decorator_1 = require("../common/decorators/permissions.decorator");
const public_decorator_1 = require("../common/decorators/public.decorator");
const allergens_service_1 = require("./allergens.service");
const create_allergen_dto_1 = require("./dto/create-allergen.dto");
const update_allergen_dto_1 = require("./dto/update-allergen.dto");
let AllergensController = class AllergensController {
    svc;
    constructor(svc) {
        this.svc = svc;
    }
    list(page, limit) { return this.svc.list(Number(page) || undefined, Number(limit) || undefined); }
    create(dto) { return this.svc.create(dto); }
    update(id, dto) { return this.svc.update(id, dto); }
    remove(id) { return this.svc.remove(id); }
};
exports.AllergensController = AllergensController;
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number]),
    __metadata("design:returntype", void 0)
], AllergensController.prototype, "list", null);
__decorate([
    (0, permissions_decorator_1.Permissions)('permissions.manage'),
    (0, swagger_1.ApiBody)({ type: create_allergen_dto_1.CreateAllergenDto }),
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_allergen_dto_1.CreateAllergenDto]),
    __metadata("design:returntype", void 0)
], AllergensController.prototype, "create", null);
__decorate([
    (0, permissions_decorator_1.Permissions)('permissions.manage'),
    (0, swagger_1.ApiBody)({ type: update_allergen_dto_1.UpdateAllergenDto }),
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_allergen_dto_1.UpdateAllergenDto]),
    __metadata("design:returntype", void 0)
], AllergensController.prototype, "update", null);
__decorate([
    (0, permissions_decorator_1.Permissions)('permissions.manage'),
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AllergensController.prototype, "remove", null);
exports.AllergensController = AllergensController = __decorate([
    (0, swagger_1.ApiTags)('Allergens'),
    (0, common_1.Controller)('allergens'),
    __param(0, (0, common_1.Inject)(allergens_service_1.AllergensService)),
    __metadata("design:paramtypes", [allergens_service_1.AllergensService])
], AllergensController);
//# sourceMappingURL=allergens.controller.js.map