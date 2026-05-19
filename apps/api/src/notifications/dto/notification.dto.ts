import { NotificationType } from '@prisma/client';
import { IsEnum, IsObject, IsOptional, IsString, IsUUID } from 'class-validator';

export class SendNotificationDto {
  @IsUUID() userId!: string;
  @IsEnum(NotificationType) type!: NotificationType;
  @IsString() title!: string;
  @IsString() body!: string;
  @IsOptional() @IsObject() metadata?: Record<string, unknown>;
}
