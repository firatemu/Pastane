import { Body, Controller, Get, Inject, Param, Patch, Query } from '@nestjs/common';
import { RoleType } from '@prisma/client';
import { ApiBody, ApiExtraModels } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import type { AuthUser } from '../common/types/auth-user.type';
import { DeliveriesService } from './deliveries.service';
import { FailDeliveryDto } from './dto/fail-delivery.dto';
import { QueryMyDeliveriesDto } from './dto/query-my-deliveries.dto';
@ApiExtraModels(QueryMyDeliveriesDto,FailDeliveryDto) @Roles(RoleType.COURIER) @Controller('deliveries') export class DeliveriesController {
  constructor(@Inject(DeliveriesService) private readonly svc:DeliveriesService){}
  @Permissions('deliveries.viewOwn') @Get('my') mine(@CurrentUser()u:AuthUser,@Query()q:QueryMyDeliveriesDto){return this.svc.mine(u.sub,q)}
  @Permissions('deliveries.viewOwn') @Get('my/:id') get(@CurrentUser()u:AuthUser,@Param('id')id:string){return this.svc.getMine(u.sub,id)}
  @Permissions('deliveries.updateOwn') @Patch('my/:id/pick-up') pickUp(@CurrentUser()u:AuthUser,@Param('id')id:string){return this.svc.pickUp(u.sub,id)}
  @Permissions('deliveries.updateOwn') @Patch('my/:id/deliver') deliver(@CurrentUser()u:AuthUser,@Param('id')id:string){return this.svc.deliver(u.sub,id)}
  @Permissions('deliveries.updateOwn') @ApiBody({type:FailDeliveryDto}) @Patch('my/:id/fail') fail(@CurrentUser()u:AuthUser,@Param('id')id:string,@Body()d:FailDeliveryDto){return this.svc.fail(u.sub,id,d)}
}
