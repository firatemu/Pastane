import { PartialType } from '@nestjs/mapped-types'

import { CreateAddressDto } from './create-address.dto'

/**
 * PATCH gövdesi. `@nestjs/swagger` içindeki `PartialType`, `@ApiProperty` tarayan bir yardımcı kullanır;
 * {@link CreateAddressDto} üzerinde Swagger alanı olmadığı için `latitude` / `longitude` gibi alanların
 * doğrulama meta verisi düşebilir ve global `forbidNonWhitelisted` 400 döner.
 */
export class UpdateAddressDto extends PartialType(CreateAddressDto) {}
