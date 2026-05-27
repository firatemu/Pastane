import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiExtraModels, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import type { AuthUser } from '../common/types/auth-user.type';
import { AttachMediaAssetProductImageDto } from './dto/attach-media-asset-product-image.dto';
import { QueryMediaAssetsDto } from './dto/query-media-assets.dto';
import { UploadMediaAssetDto } from './dto/upload-media-asset.dto';
import { UploadMediaDto } from './dto/upload-media.dto';
import { MediaService } from './media.service';

@ApiTags('Media')
@ApiExtraModels(QueryMediaAssetsDto)
@Controller('media')
export class MediaController {
  constructor(@Inject(MediaService) private readonly media: MediaService) {}

  @Permissions('media.view')
  @Get('assets')
  listAssets(@Query() query: QueryMediaAssetsDto) {
    return this.media.listAssets(query);
  }

  @Permissions('media.view')
  @Get('assets/:id')
  getAssetDetail(@Param('id') id: string) {
    return this.media.getAssetDetail(id);
  }

  @Permissions('media.upload')
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: UploadMediaAssetDto })
  @UseInterceptors(FileInterceptor('file'))
  @Post('assets/upload')
  uploadAsset(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadMediaAssetDto,
  ) {
    return this.media.uploadAsset(file, dto, user);
  }

  @Permissions('media.attach')
  @ApiBody({ type: AttachMediaAssetProductImageDto })
  @Post('assets/:id/attach-product-image')
  attachProductImage(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: AttachMediaAssetProductImageDto,
  ) {
    return this.media.attachProductImage(id, dto, user);
  }

  @Permissions('media.delete')
  @Delete('assets/:id')
  deleteAsset(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.media.deleteAsset(id, user);
  }

  @Permissions('media.upload')
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: UploadMediaDto })
  @UseInterceptors(FileInterceptor('file'))
  @Post('upload')
  uploadProductImage(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadMediaDto,
  ) {
    return this.media.upload(file, dto, user);
  }

  @Permissions('media.view')
  @Get(':id')
  get(@Param('id') id: string) {
    return this.media.get(id);
  }

  @Permissions('media.delete')
  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.media.remove(id, user);
  }
}
