"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateAddressDto = void 0;
const mapped_types_1 = require("@nestjs/mapped-types");
const create_address_dto_1 = require("./create-address.dto");
/**
 * PATCH gövdesi. `@nestjs/swagger` içindeki `PartialType`, `@ApiProperty` tarayan bir yardımcı kullanır;
 * {@link CreateAddressDto} üzerinde Swagger alanı olmadığı için `latitude` / `longitude` gibi alanların
 * doğrulama meta verisi düşebilir ve global `forbidNonWhitelisted` 400 döner.
 */
class UpdateAddressDto extends (0, mapped_types_1.PartialType)(create_address_dto_1.CreateAddressDto) {
}
exports.UpdateAddressDto = UpdateAddressDto;
//# sourceMappingURL=update-address.dto.js.map