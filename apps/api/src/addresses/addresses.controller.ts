import { Body, Controller, Delete, Get, Inject, Param, Patch, Post } from '@nestjs/common'
import { ApiBody } from '@nestjs/swagger'

import { CurrentUser } from '../common/decorators/current-user.decorator'
import { Permissions } from '../common/decorators/permissions.decorator'
import type { AuthUser } from '../common/types/auth-user.type'
import { AddressesService } from './addresses.service'
import { CreateAddressDto } from './dto/create-address.dto'
import { UpdateAddressDto } from './dto/update-address.dto'

@Permissions('addresses.manageOwn')
@Controller('addresses')
export class AddressesController {
  constructor(@Inject(AddressesService) private readonly service: AddressesService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.service.list(user.sub)
  }

  @ApiBody({ type: CreateAddressDto })
  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateAddressDto) {
    return this.service.create(user.sub, dto)
  }

  @Patch(':id/default')
  setDefault(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.setDefault(user.sub, id)
  }

  @ApiBody({ type: UpdateAddressDto })
  @Patch(':id')
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateAddressDto) {
    return this.service.update(user.sub, id, dto)
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.remove(user.sub, id)
  }
}
