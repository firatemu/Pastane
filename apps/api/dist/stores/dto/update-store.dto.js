"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateStoreDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const create_store_dto_1 = require("./create-store.dto");
class UpdateStoreDto extends (0, swagger_1.PartialType)(create_store_dto_1.CreateStoreDto) {
}
exports.UpdateStoreDto = UpdateStoreDto;
//# sourceMappingURL=update-store.dto.js.map