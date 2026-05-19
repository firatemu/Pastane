"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationsModule = void 0;
const common_1 = require("@nestjs/common");
const queue_module_1 = require("../jobs/queue.module");
const notifications_controller_1 = require("./notifications.controller");
const notifications_service_1 = require("./notifications.service");
const email_provider_1 = require("./providers/email.provider");
const fcm_provider_1 = require("./providers/fcm.provider");
const sms_provider_1 = require("./providers/sms.provider");
let NotificationsModule = class NotificationsModule {
};
exports.NotificationsModule = NotificationsModule;
exports.NotificationsModule = NotificationsModule = __decorate([
    (0, common_1.Module)({ imports: [queue_module_1.QueueModule], controllers: [notifications_controller_1.NotificationsController], providers: [notifications_service_1.NotificationsService, fcm_provider_1.FcmProvider, sms_provider_1.SmsProvider, email_provider_1.EmailProvider], exports: [notifications_service_1.NotificationsService] })
], NotificationsModule);
//# sourceMappingURL=notifications.module.js.map