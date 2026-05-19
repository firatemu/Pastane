import { Body, Controller, Get, Inject, Param, Patch } from '@nestjs/common';
import { ApiBody, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import type { AuthUser } from '../common/types/auth-user.type';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateOwnProfileDto } from './dto/update-own-profile.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';
@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(@Inject(UsersService) private readonly users: UsersService) {}
  @Get('me') me(@CurrentUser() user: AuthUser) { return this.users.getById(user.sub); }
  @ApiBody({ type: UpdateOwnProfileDto }) @Patch('me') updateMe(@CurrentUser() user: AuthUser, @Body() dto: UpdateOwnProfileDto) { return this.users.updateOwn(user.sub, dto); }
  @ApiBody({ type: ChangePasswordDto }) @Patch('me/password') changePassword(@CurrentUser() user: AuthUser, @Body() dto: ChangePasswordDto) { return this.users.changeOwnPassword(user.sub, dto); }
  @Permissions('users.view') @Get() list() { return this.users.list(); }
  @Permissions('users.view') @Get(':id') get(@Param('id') id: string) { return this.users.getById(id); }
  @Permissions('users.update') @ApiBody({ type: UpdateUserDto }) @Patch(':id') update(@Param('id') id: string, @Body() dto: UpdateUserDto) { return this.users.update(id, dto); }
}
