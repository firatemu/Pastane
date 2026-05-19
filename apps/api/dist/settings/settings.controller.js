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
exports.SettingsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const permissions_decorator_1 = require("../common/decorators/permissions.decorator");
const update_setting_dto_1 = require("./dto/update-setting.dto");
const settings_service_1 = require("./settings.service");
let SettingsController = class SettingsController {
    settings;
    constructor(settings) {
        this.settings = settings;
    }
    list() { return this.settings.list(); }
    system() { return this.settings.system(); }
    updateSystem(user, dto) { return this.settings.updateSystem(dto, user); }
    update(user, key, dto) { return this.settings.upsert(key, dto.value, user); }
};
exports.SettingsController = SettingsController;
__decorate([
    (0, permissions_decorator_1.Permissions)('settings.view'),
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], SettingsController.prototype, "list", null);
__decorate([
    (0, permissions_decorator_1.Permissions)('settings.view'),
    (0, common_1.Get)('system'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], SettingsController.prototype, "system", null);
__decorate([
    (0, permissions_decorator_1.Permissions)('settings.update'),
    (0, swagger_1.ApiBody)({ type: update_setting_dto_1.UpdateSystemSettingsDto }),
    (0, common_1.Patch)('system/flags'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, update_setting_dto_1.UpdateSystemSettingsDto]),
    __metadata("design:returntype", void 0)
], SettingsController.prototype, "updateSystem", null);
__decorate([
    (0, permissions_decorator_1.Permissions)('settings.update'),
    (0, swagger_1.ApiBody)({ type: update_setting_dto_1.UpdateSettingDto }),
    (0, common_1.Patch)(':key'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('key')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, update_setting_dto_1.UpdateSettingDto]),
    __metadata("design:returntype", void 0)
], SettingsController.prototype, "update", null);
exports.SettingsController = SettingsController = __decorate([
    (0, swagger_1.ApiTags)('Settings'),
    (0, common_1.Controller)('settings'),
    __param(0, (0, common_1.Inject)(settings_service_1.SettingsService)),
    __metadata("design:paramtypes", [settings_service_1.SettingsService])
], SettingsController);
//# sourceMappingURL=settings.controller.js.map