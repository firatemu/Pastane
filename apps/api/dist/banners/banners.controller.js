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
exports.BannersController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const swagger_1 = require("@nestjs/swagger");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const permissions_decorator_1 = require("../common/decorators/permissions.decorator");
const public_decorator_1 = require("../common/decorators/public.decorator");
const app_exception_1 = require("../common/exceptions/app.exception");
const error_codes_1 = require("../common/constants/error-codes");
const banners_service_1 = require("./banners.service");
const create_banner_dto_1 = require("./dto/create-banner.dto");
const reorder_banners_dto_1 = require("./dto/reorder-banners.dto");
const update_banner_dto_1 = require("./dto/update-banner.dto");
const update_banner_status_dto_1 = require("./dto/update-banner-status.dto");
const upload_banner_media_body_dto_1 = require("./dto/upload-banner-media-body.dto");
let BannersController = class BannersController {
    banners;
    constructor(banners) {
        this.banners = banners;
    }
    listHome() {
        return this.banners.listHome();
    }
    listAdmin() {
        return this.banners.listAdmin();
    }
    upload(user, file, body) {
        const ok = user.permissions.includes('banners.create') ||
            user.permissions.includes('banners.update');
        if (!ok) {
            throw new app_exception_1.AppException(error_codes_1.ERROR_CODES.FORBIDDEN, 'Forbidden', common_1.HttpStatus.FORBIDDEN);
        }
        return this.banners.uploadMedia(file, body.variant, body.expectKind);
    }
    create(user, dto) {
        return this.banners.create(dto, user);
    }
    reorder(user, dto) {
        return this.banners.reorder(dto.ids, user);
    }
    get(id) {
        return this.banners.get(id);
    }
    update(user, id, dto) {
        return this.banners.update(id, dto, user);
    }
    remove(user, id) {
        return this.banners.remove(id, user);
    }
    setStatus(user, id, dto) {
        return this.banners.setStatus(id, dto.isActive, user);
    }
};
exports.BannersController = BannersController;
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)('home'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], BannersController.prototype, "listHome", null);
__decorate([
    (0, permissions_decorator_1.Permissions)('banners.view'),
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], BannersController.prototype, "listAdmin", null);
__decorate([
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    (0, swagger_1.ApiBody)({ type: upload_banner_media_body_dto_1.UploadBannerMediaBodyDto }),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file')),
    (0, common_1.Post)('upload'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.UploadedFile)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, upload_banner_media_body_dto_1.UploadBannerMediaBodyDto]),
    __metadata("design:returntype", void 0)
], BannersController.prototype, "upload", null);
__decorate([
    (0, permissions_decorator_1.Permissions)('banners.create'),
    (0, swagger_1.ApiBody)({ type: create_banner_dto_1.CreateBannerDto }),
    (0, common_1.Post)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_banner_dto_1.CreateBannerDto]),
    __metadata("design:returntype", void 0)
], BannersController.prototype, "create", null);
__decorate([
    (0, permissions_decorator_1.Permissions)('banners.reorder'),
    (0, swagger_1.ApiBody)({ type: reorder_banners_dto_1.ReorderBannersDto }),
    (0, common_1.Patch)('reorder'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, reorder_banners_dto_1.ReorderBannersDto]),
    __metadata("design:returntype", void 0)
], BannersController.prototype, "reorder", null);
__decorate([
    (0, permissions_decorator_1.Permissions)('banners.view'),
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], BannersController.prototype, "get", null);
__decorate([
    (0, permissions_decorator_1.Permissions)('banners.update'),
    (0, swagger_1.ApiBody)({ type: update_banner_dto_1.UpdateBannerDto }),
    (0, common_1.Patch)(':id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, update_banner_dto_1.UpdateBannerDto]),
    __metadata("design:returntype", void 0)
], BannersController.prototype, "update", null);
__decorate([
    (0, permissions_decorator_1.Permissions)('banners.delete'),
    (0, common_1.Delete)(':id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], BannersController.prototype, "remove", null);
__decorate([
    (0, permissions_decorator_1.Permissions)('banners.update'),
    (0, swagger_1.ApiBody)({ type: update_banner_status_dto_1.UpdateBannerStatusDto }),
    (0, common_1.Patch)(':id/status'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, update_banner_status_dto_1.UpdateBannerStatusDto]),
    __metadata("design:returntype", void 0)
], BannersController.prototype, "setStatus", null);
exports.BannersController = BannersController = __decorate([
    (0, swagger_1.ApiTags)('Banners'),
    (0, common_1.Controller)('banners'),
    __param(0, (0, common_1.Inject)(banners_service_1.BannersService)),
    __metadata("design:paramtypes", [banners_service_1.BannersService])
], BannersController);
//# sourceMappingURL=banners.controller.js.map