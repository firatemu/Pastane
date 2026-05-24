import { Body, Controller, Get, Inject, Param, Patch, Post } from '@nestjs/common';
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
  @Permissions('notifications.viewOwn') @Patch('me/read-all') markAllRead(@CurrentUser() user: AuthUser) { return this.notifications.markAllOwnRead(user.sub); }
  @Permissions('notifications.viewOwn') @Patch('me/:id/read') markRead(@CurrentUser() user: AuthUser, @Param('id') id: string) { return this.notifications.markOwnRead(user.sub, id); }
  @Permissions('notifications.send') @ApiBody({ type: SendNotificationDto }) @Post('send') send(@CurrentUser() user: AuthUser, @Body() dto: SendNotificationDto) { return this.notifications.enqueue(dto, user); }
}
