import { Controller, Get, Inject } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Permissions } from '../common/decorators/permissions.decorator';
import { PermissionsService } from './permissions.service';
@ApiTags('Permissions')
@Permissions('permissions.view')
@Controller('permissions')
export class PermissionsController { constructor(@Inject(PermissionsService) private readonly permissions: PermissionsService) {} @Get() list() { return this.permissions.list(); } }
