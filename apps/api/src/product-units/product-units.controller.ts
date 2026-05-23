import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBody, ApiTags } from '@nestjs/swagger';
import { Permissions } from '../common/decorators/permissions.decorator';
import { Public } from '../common/decorators/public.decorator';
import { CreateProductUnitDto } from './dto/create-product-unit.dto';
import { UpdateProductUnitDto } from './dto/update-product-unit.dto';
import { ProductUnitsService } from './product-units.service';

@ApiTags('Product Units')
@Controller('product-units')
export class ProductUnitsController {
  constructor(@Inject(ProductUnitsService) private readonly svc: ProductUnitsService) {}

  @Public()
  @Get()
  list(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('activeOnly') activeOnly?: string,
  ) {
    return this.svc.list(
      Number(page) || undefined,
      Number(limit) || undefined,
      activeOnly === 'true' || activeOnly === '1',
    );
  }

  @Permissions('productUnits.manage')
  @ApiBody({ type: CreateProductUnitDto })
  @Post()
  create(@Body() dto: CreateProductUnitDto) {
    return this.svc.create(dto);
  }

  @Permissions('productUnits.manage')
  @ApiBody({ type: UpdateProductUnitDto })
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateProductUnitDto) {
    return this.svc.update(id, dto);
  }

  @Permissions('productUnits.manage')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.svc.remove(id);
  }
}
