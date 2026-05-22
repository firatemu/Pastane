import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBody, ApiExtraModels, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import type { AuthUser } from '../common/types/auth-user.type';
import { Public } from '../common/decorators/public.decorator';
import { CreateOptionDto } from './dto/create-option.dto';
import { CreateOptionGroupDto } from './dto/create-option-group.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { QueryProductDto } from './dto/query-product.dto';
import { UpdateProductAllergensDto } from './dto/update-product-allergens.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductsService } from './products.service';

@ApiTags('Products')
@ApiExtraModels(QueryProductDto)
@Controller('products')
export class ProductsController {
  constructor(@Inject(ProductsService) private readonly svc: ProductsService) {}

  @Public()
  @Get()
  list(@Query() q: QueryProductDto) {
    return this.svc.list(q);
  }

  @Permissions('products.view')
  @Get('admin')
  adminList(@Query() q: QueryProductDto) {
    return this.svc.adminList(q);
  }

  @Public()
  @Get('slug/:slug')
  slug(@Param('slug') slug: string) {
    return this.svc.getBySlug(slug);
  }

  @Public()
  @Get(':id')
  get(@Param('id') id: string) {
    return this.svc.get(id, true);
  }

  @Permissions('products.create')
  @ApiBody({ type: CreateProductDto })
  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateProductDto) {
    return this.svc.create(dto, user);
  }

  @Permissions('products.update')
  @ApiBody({ type: UpdateProductDto })
  @Patch(':id')
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.svc.update(id, dto, user);
  }

  @Permissions('products.delete')
  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.svc.remove(id, user);
  }

  @Permissions('products.manageOptions')
  @ApiBody({ type: CreateOptionGroupDto })
  @Post(':id/option-groups')
  group(@Param('id') id: string, @Body() dto: CreateOptionGroupDto) {
    return this.svc.addGroup(id, dto);
  }

  @Permissions('products.manageOptions')
  @ApiBody({ type: CreateOptionDto })
  @Post(':id/option-groups/:groupId/options')
  option(@Param('id') id: string, @Param('groupId') groupId: string, @Body() dto: CreateOptionDto) {
    return this.svc.addOption(id, groupId, dto);
  }

  @Permissions('products.manageAllergens')
  @ApiBody({ type: UpdateProductAllergensDto })
  @Patch(':id/allergens')
  allergens(@Param('id') id: string, @Body() dto: UpdateProductAllergensDto) {
    return this.svc.setAllergens(id, dto.allergenIds);
  }
}
