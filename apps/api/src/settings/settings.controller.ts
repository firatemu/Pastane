import { Body, Controller, Get, Inject, Param, Patch } from '@nestjs/common';
import { ApiBody, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import type { AuthUser } from '../common/types/auth-user.type';
import { UpdateSettingDto, UpdateSystemSettingsDto } from './dto/update-setting.dto';
import { SettingsService } from './settings.service';

@ApiTags('Settings')
@Controller('settings')
export class SettingsController {
  constructor(@Inject(SettingsService) private readonly settings: SettingsService) {}
  @Permissions('settings.view') @Get() list() { return this.settings.list(); }
  @Permissions('settings.view') @Get('system') system() { return this.settings.system(); }
  @Permissions('settings.update') @ApiBody({ type: UpdateSystemSettingsDto }) @Patch('system/flags') updateSystem(@CurrentUser() user: AuthUser, @Body() dto: UpdateSystemSettingsDto) { return this.settings.updateSystem(dto as Record<string, unknown>, user); }
  @Permissions('settings.update') @ApiBody({ type: UpdateSettingDto }) @Patch(':key') update(@CurrentUser() user: AuthUser, @Param('key') key: string, @Body() dto: UpdateSettingDto) { return this.settings.upsert(key, dto.value as never, user); }
}
