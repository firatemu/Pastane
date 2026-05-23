import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { ERROR_CODES } from '../common/constants/error-codes';
import { AppException } from '../common/exceptions/app.exception';
import { normalizePagination } from '../common/utils/pagination.util';
import { PrismaService } from '../database/prisma.service';
import type { CreateProductUnitDto } from './dto/create-product-unit.dto';
import type { UpdateProductUnitDto } from './dto/update-product-unit.dto';

@Injectable()
export class ProductUnitsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async list(page?: number, limit?: number, activeOnly = false) {
    const p = normalizePagination(page, limit);
    const where = {
      deletedAt: null,
      ...(activeOnly ? { isActive: true } : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.productUnit.findMany({
        where,
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        skip: (p.page - 1) * p.limit,
        take: p.limit,
        include: { _count: { select: { products: true } } },
      }),
      this.prisma.productUnit.count({ where }),
    ]);

    return {
      items: items.map(({ _count, ...unit }) => ({ ...unit, productCount: _count.products })),
      meta: { ...p, total, totalPages: Math.ceil(total / p.limit) },
    };
  }

  async get(id: string) {
    const unit = await this.prisma.productUnit.findFirst({
      where: { id, deletedAt: null },
      include: { _count: { select: { products: true } } },
    });
    if (!unit) {
      throw new AppException(ERROR_CODES.PRODUCT_UNIT_NOT_FOUND, 'Product unit not found', HttpStatus.NOT_FOUND);
    }
    const { _count, ...rest } = unit;
    return { ...rest, productCount: _count.products };
  }

  async create(dto: CreateProductUnitDto) {
    await this.assertUniqueSymbol(dto.symbol);
    return this.prisma.productUnit.create({
      data: {
        name: dto.name.trim(),
        symbol: dto.symbol.trim().toLowerCase(),
        kind: dto.kind,
        sortOrder: dto.sortOrder ?? 0,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async update(id: string, dto: UpdateProductUnitDto) {
    await this.get(id);
    if (dto.symbol) await this.assertUniqueSymbol(dto.symbol, id);
    return this.prisma.productUnit.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.symbol !== undefined ? { symbol: dto.symbol.trim().toLowerCase() } : {}),
        ...(dto.kind !== undefined ? { kind: dto.kind } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });
  }

  async remove(id: string) {
    await this.get(id);
    const productCount = await this.prisma.product.count({ where: { unitId: id, deletedAt: null } });
    if (productCount > 0) {
      throw new AppException(
        ERROR_CODES.PRODUCT_UNIT_HAS_PRODUCTS,
        'Product unit is used by products',
        HttpStatus.BAD_REQUEST,
      );
    }
    return this.prisma.productUnit.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } });
  }

  private async assertUniqueSymbol(symbol: string, excludeId?: string) {
    const existing = await this.prisma.productUnit.findFirst({
      where: {
        symbol: symbol.trim().toLowerCase(),
        deletedAt: null,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    });
    if (existing) {
      throw new AppException(ERROR_CODES.PRODUCT_UNIT_SYMBOL_EXISTS, 'Product unit symbol already exists', HttpStatus.BAD_REQUEST);
    }
  }
}
