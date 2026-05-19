import { Body, Controller, Delete, Get, Inject, Param, Patch, Post } from '@nestjs/common';
import { ApiBody, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { Public } from '../common/decorators/public.decorator';
import type { AuthUser } from '../common/types/auth-user.type';
import { CampaignsService } from './campaigns.service';
import { CreateCampaignDto, UpdateCampaignDto } from './dto/campaign.dto';

@ApiTags('Campaigns')
@Controller('campaigns')
export class CampaignsController {
  constructor(@Inject(CampaignsService) private readonly campaigns: CampaignsService) {}
  @Permissions('campaigns.view') @Get() list() { return this.campaigns.list(); }
  @Public() @Get('active') active() { return this.campaigns.active(); }
  @Permissions('campaigns.create') @ApiBody({ type: CreateCampaignDto }) @Post() create(@CurrentUser() user: AuthUser, @Body() dto: CreateCampaignDto) { return this.campaigns.create(dto, user); }
  @Permissions('campaigns.update') @ApiBody({ type: UpdateCampaignDto }) @Patch(':id') update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateCampaignDto) { return this.campaigns.update(id, dto, user); }
  @Permissions('campaigns.delete') @Delete(':id') remove(@CurrentUser() user: AuthUser, @Param('id') id: string) { return this.campaigns.remove(id, user); }
}
