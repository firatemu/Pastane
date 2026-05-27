import { Body, Controller, Get, Inject, Param, ParseEnumPipe, Patch } from '@nestjs/common';
import { ApiBody, ApiTags } from '@nestjs/swagger';
import { RoleType } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import type { AuthUser } from '../common/types/auth-user.type';
import { UpdateRolePermissionsDto } from './dto/update-role-permissions.dto';
import { PermissionsService } from './permissions.service';

@ApiTags('Permissions')
@Permissions('permissions.view')
@Controller('permissions')
export class PermissionsController {
  constructor(@Inject(PermissionsService) private readonly permissions: PermissionsService) {}

  @Get()
  list() {
    return this.permissions.list();
  }

  @Get('management')
  management() {
    return this.permissions.management();
  }

  @Permissions('permissions.manage')
  @ApiBody({ type: UpdateRolePermissionsDto })
  @Patch('roles/:roleName')
  updateRolePermissions(
    @CurrentUser() user: AuthUser,
    @Param('roleName', new ParseEnumPipe(RoleType)) roleName: RoleType,
    @Body() dto: UpdateRolePermissionsDto,
  ) {
    return this.permissions.updateRolePermissions(roleName, dto.permissionIds, user);
  }
}
