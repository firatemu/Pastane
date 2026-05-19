import { Body, Controller, Get, Inject, Post } from '@nestjs/common';
import { ApiBody, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import type { AuthUser } from '../common/types/auth-user.type';
import { SendNotificationDto } from './dto/notification.dto';
import { NotificationsService } from './notifications.service';

@ApiTags('Notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(@Inject(NotificationsService) private readonly notifications: NotificationsService) {}
  @Permissions('notifications.viewOwn') @Get('me') mine(@CurrentUser() user: AuthUser) { return this.notifications.listOwn(user.sub); }
  @Permissions('notifications.send') @ApiBody({ type: SendNotificationDto }) @Post('send') send(@CurrentUser() user: AuthUser, @Body() dto: SendNotificationDto) { return this.notifications.enqueue(dto, user); }
}
