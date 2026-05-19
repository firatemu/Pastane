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
exports.NotificationsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const permissions_decorator_1 = require("../common/decorators/permissions.decorator");
const notification_dto_1 = require("./dto/notification.dto");
const notifications_service_1 = require("./notifications.service");
let NotificationsController = class NotificationsController {
    notifications;
    constructor(notifications) {
        this.notifications = notifications;
    }
    mine(user) { return this.notifications.listOwn(user.sub); }
    send(user, dto) { return this.notifications.enqueue(dto, user); }
};
exports.NotificationsController = NotificationsController;
__decorate([
    (0, permissions_decorator_1.Permissions)('notifications.viewOwn'),
    (0, common_1.Get)('me'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], NotificationsController.prototype, "mine", null);
__decorate([
    (0, permissions_decorator_1.Permissions)('notifications.send'),
    (0, swagger_1.ApiBody)({ type: notification_dto_1.SendNotificationDto }),
    (0, common_1.Post)('send'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, notification_dto_1.SendNotificationDto]),
    __metadata("design:returntype", void 0)
], NotificationsController.prototype, "send", null);
exports.NotificationsController = NotificationsController = __decorate([
    (0, swagger_1.ApiTags)('Notifications'),
    (0, common_1.Controller)('notifications'),
    __param(0, (0, common_1.Inject)(notifications_service_1.NotificationsService)),
    __metadata("design:paramtypes", [notifications_service_1.NotificationsService])
], NotificationsController);
//# sourceMappingURL=notifications.controller.js.map