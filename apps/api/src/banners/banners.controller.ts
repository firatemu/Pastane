import { Body, Controller, Delete, Get, HttpStatus, Inject, Param, Patch, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { Public } from '../common/decorators/public.decorator';
import { AppException } from '../common/exceptions/app.exception';
import { ERROR_CODES } from '../common/constants/error-codes';
import type { AuthUser } from '../common/types/auth-user.type';
import { BannersService } from './banners.service';
import { CreateBannerDto } from './dto/create-banner.dto';
import { ReorderBannersDto } from './dto/reorder-banners.dto';
import { UpdateBannerDto } from './dto/update-banner.dto';
import { UpdateBannerStatusDto } from './dto/update-banner-status.dto';
import { UploadBannerMediaBodyDto } from './dto/upload-banner-media-body.dto';

@ApiTags('Banners')
@Controller('banners')
export class BannersController {
  constructor(@Inject(BannersService) private readonly banners: BannersService) {}

  @Public()
  @Get('home')
  listHome() {
    return this.banners.listHome();
  }

  @Permissions('banners.view')
  @Get()
  listAdmin() {
    return this.banners.listAdmin();
  }

  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: UploadBannerMediaBodyDto })
  @UseInterceptors(FileInterceptor('file'))
  @Post('upload')
  upload(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: UploadBannerMediaBodyDto,
  ) {
    const ok =
      user.permissions.includes('banners.create') ||
      user.permissions.includes('banners.update');
    if (!ok) {
      throw new AppException(ERROR_CODES.FORBIDDEN, 'Forbidden', HttpStatus.FORBIDDEN);
    }
    return this.banners.uploadMedia(file, body.variant, body.expectKind);
  }

  @Permissions('banners.create')
  @ApiBody({ type: CreateBannerDto })
  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateBannerDto) {
    return this.banners.create(dto, user);
  }

  @Permissions('banners.reorder')
  @ApiBody({ type: ReorderBannersDto })
  @Patch('reorder')
  reorder(@CurrentUser() user: AuthUser, @Body() dto: ReorderBannersDto) {
    return this.banners.reorder(dto.ids, user);
  }

  @Permissions('banners.view')
  @Get(':id')
  get(@Param('id') id: string) {
    return this.banners.get(id);
  }

  @Permissions('banners.update')
  @ApiBody({ type: UpdateBannerDto })
  @Patch(':id')
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateBannerDto) {
    return this.banners.update(id, dto, user);
  }

  @Permissions('banners.delete')
  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.banners.remove(id, user);
  }

  @Permissions('banners.update')
  @ApiBody({ type: UpdateBannerStatusDto })
  @Patch(':id/status')
  setStatus(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateBannerStatusDto) {
    return this.banners.setStatus(id, dto.isActive, user);
  }
}
