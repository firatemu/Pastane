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
exports.PublicFilesController = void 0;
const common_1 = require("@nestjs/common");
const skip_response_envelope_decorator_1 = require("../common/decorators/skip-response-envelope.decorator");
const public_decorator_1 = require("../common/decorators/public.decorator");
const public_files_service_1 = require("./public-files.service");
let PublicFilesController = class PublicFilesController {
    files;
    constructor(files) {
        this.files = files;
    }
    async stream(bucket, encodedKey) {
        let objectKey;
        try {
            objectKey = decodeURIComponent(encodedKey);
        }
        catch {
            throw new common_1.NotFoundException();
        }
        return this.files.stream(bucket, objectKey);
    }
};
exports.PublicFilesController = PublicFilesController;
__decorate([
    (0, common_1.Get)(':bucket/:encodedKey'),
    __param(0, (0, common_1.Param)('bucket')),
    __param(1, (0, common_1.Param)('encodedKey')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], PublicFilesController.prototype, "stream", null);
exports.PublicFilesController = PublicFilesController = __decorate([
    (0, skip_response_envelope_decorator_1.SkipResponseEnvelope)(),
    (0, public_decorator_1.Public)(),
    (0, common_1.Controller)('files'),
    __param(0, (0, common_1.Inject)(public_files_service_1.PublicFilesService)),
    __metadata("design:paramtypes", [public_files_service_1.PublicFilesService])
], PublicFilesController);
//# sourceMappingURL=public-files.controller.js.map