"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateAllergenDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const create_allergen_dto_1 = require("./create-allergen.dto");
class UpdateAllergenDto extends (0, swagger_1.PartialType)(create_allergen_dto_1.CreateAllergenDto) {
}
exports.UpdateAllergenDto = UpdateAllergenDto;
//# sourceMappingURL=update-allergen.dto.js.map