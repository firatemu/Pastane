import { Controller, Get, Inject, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { RoleType } from '@prisma/client';
import { Permissions } from '../common/decorators/permissions.decorator';
import { RolesService } from './roles.service';
@ApiTags('Roles')
@Permissions('roles.view')
@Controller('roles')
export class RolesController {
  constructor(@Inject(RolesService) private readonly roles: RolesService) {}
  @Get() list() { return this.roles.list(); }
  @Get(':name') get(@Param('name') name: RoleType) { return this.roles.getByName(name); }
}
