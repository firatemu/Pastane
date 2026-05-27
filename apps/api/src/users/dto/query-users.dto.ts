import { RoleType, UserStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export enum UserListScope {
  ALL = 'all',
  STAFF = 'staff',
}

export class QueryUsersDto {
  @IsOptional()
  @IsEnum(UserListScope)
  scope?: UserListScope;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @IsOptional()
  @IsEnum(RoleType)
  roleName?: RoleType;
}
