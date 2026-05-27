import { Body, Controller, Delete, Get, Inject, Param, Patch, Query } from '@nestjs/common';
import { ApiBody, ApiExtraModels, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import type { AuthUser } from '../common/types/auth-user.type';
import { ChangePasswordDto } from './dto/change-password.dto';
import { QueryCustomersDto } from './dto/query-customers.dto';
import { QueryUsersDto } from './dto/query-users.dto';
import { UpdateOwnProfileDto } from './dto/update-own-profile.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

@ApiTags('Users')
@ApiExtraModels(QueryUsersDto, QueryCustomersDto, UpdateUserDto)
@Controller('users')
export class UsersController {
  constructor(@Inject(UsersService) private readonly users: UsersService) {}

  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return this.users.getById(user.sub);
  }

  @ApiBody({ type: UpdateOwnProfileDto })
  @Patch('me')
  updateMe(@CurrentUser() user: AuthUser, @Body() dto: UpdateOwnProfileDto) {
    return this.users.updateOwn(user.sub, dto);
  }

  @ApiBody({ type: ChangePasswordDto })
  @Patch('me/password')
  changePassword(@CurrentUser() user: AuthUser, @Body() dto: ChangePasswordDto) {
    return this.users.changeOwnPassword(user.sub, dto);
  }

  @Permissions('customers.view')
  @Get('customers')
  listCustomers(@Query() query: QueryCustomersDto) {
    return this.users.listCustomers(query);
  }

  @Permissions('customers.view')
  @Get('customers/:id')
  getCustomer(@Param('id') id: string) {
    return this.users.getCustomerDetail(id);
  }

  @Permissions('customers.update')
  @ApiBody({ type: UpdateUserDto })
  @Patch('customers/:id')
  updateCustomer(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.users.updateCustomer(id, dto, user);
  }

  @Permissions('customers.delete')
  @Delete('customers/:id')
  deleteCustomer(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.users.deleteCustomer(id, user);
  }

  @Permissions('users.view')
  @Get()
  list(@Query() query: QueryUsersDto) {
    return this.users.list(query);
  }

  @Permissions('users.view')
  @Get(':id')
  get(@Param('id') id: string) {
    return this.users.getStaffById(id);
  }

  @Permissions('users.update')
  @ApiBody({ type: UpdateUserDto })
  @Patch(':id')
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.users.update(id, dto, user);
  }

  @Permissions('users.delete')
  @Delete(':id')
  delete(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.users.delete(id, user);
  }
}
