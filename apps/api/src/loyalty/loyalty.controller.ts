import { Body, Controller, Get, Inject, Patch, Post } from '@nestjs/common';
import { ApiBody, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import type { AuthUser } from '../common/types/auth-user.type';
import { AdjustLoyaltyDto, RedeemLoyaltyDto, ScanLoyaltyDto, UpdateLoyaltySettingDto } from './dto/loyalty.dto';
import { LoyaltyService } from './loyalty.service';

@ApiTags('Loyalty')
@Controller('loyalty')
export class LoyaltyController {
  constructor(@Inject(LoyaltyService) private readonly loyalty: LoyaltyService) {}
  @Permissions('loyalty.viewOwn') @Get('me') me(@CurrentUser() user: AuthUser) { return this.loyalty.me(user.sub); }
  @Permissions('loyalty.viewOwn') @Get('me/movements') movements(@CurrentUser() user: AuthUser) { return this.loyalty.movements(user.sub); }
  @Permissions('loyalty.scan') @ApiBody({ type: ScanLoyaltyDto }) @Post('scan') scan(@Body() dto: ScanLoyaltyDto) { return this.loyalty.scan(dto.qrCode); }
  @Permissions('loyalty.redeem') @ApiBody({ type: RedeemLoyaltyDto }) @Post('redeem') redeem(@CurrentUser() user: AuthUser, @Body() dto: RedeemLoyaltyDto) { return this.loyalty.redeem(dto, user); }
  @Permissions('loyalty.manageSettings') @ApiBody({ type: AdjustLoyaltyDto }) @Post('adjust') adjust(@CurrentUser() user: AuthUser, @Body() dto: AdjustLoyaltyDto) { return this.loyalty.adjust(dto, user); }
  @Permissions('loyalty.manageSettings') @Get('settings') settings() { return this.loyalty.settings(); }
  @Permissions('loyalty.manageSettings') @ApiBody({ type: UpdateLoyaltySettingDto }) @Patch('settings') updateSettings(@CurrentUser() user: AuthUser, @Body() dto: UpdateLoyaltySettingDto) { return this.loyalty.updateSettings(dto, user); }
}
