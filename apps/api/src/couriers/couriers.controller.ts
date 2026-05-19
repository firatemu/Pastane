import { Body, Controller, Get, Inject, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBody, ApiExtraModels, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import type { AuthUser } from '../common/types/auth-user.type';
import { CouriersService } from './couriers.service';
import { CreateCourierDto } from './dto/create-courier.dto';
import { QueryCouriersDto } from './dto/query-couriers.dto';
import { UpdateCourierDto } from './dto/update-courier.dto';

@ApiTags('Couriers')
@ApiExtraModels(QueryCouriersDto, CreateCourierDto, UpdateCourierDto)
@Controller('couriers')
export class CouriersController {
  constructor(@Inject(CouriersService) private readonly svc: CouriersService) {}

  @Permissions('couriers.view')
  @Get()
  list(@CurrentUser() user: AuthUser, @Query() q: QueryCouriersDto) {
    return this.svc.list(q, user);
  }

  @Permissions('couriers.view')
  @Get(':id')
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.svc.getById(id, user);
  }

  @Permissions('couriers.create')
  @ApiBody({ type: CreateCourierDto })
  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateCourierDto) {
    return this.svc.create(dto, user);
  }

  @Permissions('couriers.update')
  @ApiBody({ type: UpdateCourierDto })
  @Patch(':id')
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateCourierDto) {
    return this.svc.update(id, dto, user);
  }

  @Permissions('couriers.update')
  @Post(':id/deactivate')
  deactivate(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.svc.deactivate(id, user);
  }

  @Permissions('couriers.update')
  @Post(':id/reactivate')
  reactivate(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.svc.reactivate(id, user);
  }
}
