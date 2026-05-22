import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AppException } from '../common/exceptions/app.exception';
import { ERROR_CODES } from '../common/constants/error-codes';
import { computeProductAvailability } from '../products/product-availability.util';
import type { AddToCartDto } from './dto/add-to-cart.dto';
import type { UpdateCartItemDto } from './dto/update-cart-item.dto';

@Injectable()
export class CartService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async get(userId: string) {
    return this.prisma.cart.upsert({ where: { userId }, update: {}, create: { userId }, include: this.include() });
  }

  async add(userId: string, dto: AddToCartDto) {
    const product = await this.getProduct(dto.productId);
    await this.validateOptions(product.id, dto.optionIds ?? []);
    const cart = await this.prisma.cart.upsert({ where: { userId }, update: {}, create: { userId } });
    return this.prisma.cartItem.create({
      data: {
        cartId: cart.id,
        productId: product.id,
        quantity: dto.quantity,
        unitPrice: product.discountedPrice ?? product.price,
        customNote: dto.customNote,
        options: { create: (dto.optionIds ?? []).map((optionId) => ({ optionId })) },
      },
      include: { options: true, product: true },
    });
  }

  async update(userId: string, id: string, dto: UpdateCartItemDto) {
    const item = await this.findItem(userId, id);
    if (dto.optionIds) {
      await this.validateOptions(item.productId, dto.optionIds);
      await this.prisma.cartItemOption.deleteMany({ where: { cartItemId: id } });
    }
    return this.prisma.cartItem.update({
      where: { id },
      data: {
        quantity: dto.quantity,
        customNote: dto.customNote,
        ...(dto.optionIds ? { options: { create: dto.optionIds.map((optionId) => ({ optionId })) } } : {}),
      },
      include: { options: true, product: true },
    });
  }

  async remove(userId: string, id: string) {
    await this.findItem(userId, id);
    return this.prisma.cartItem.delete({ where: { id } });
  }

  async clear(userId: string) {
    const cart = await this.get(userId);
    await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    return { cleared: true };
  }

  private include() {
    return { items: { include: { product: true, options: { include: { option: true } } } } } as const;
  }

  private async findItem(userId: string, id: string) {
    const x = await this.prisma.cartItem.findFirst({ where: { id, cart: { userId } } });
    if (!x) throw new AppException(ERROR_CODES.CART_ITEM_NOT_FOUND, 'Cart item not found', HttpStatus.NOT_FOUND);
    return x;
  }

  private async getProduct(id: string) {
    const p = await this.prisma.product.findFirst({
      where: { id, deletedAt: null, status: { not: 'INACTIVE' } },
      include: { optionGroups: { where: { deletedAt: null }, include: { options: { where: { deletedAt: null, isActive: true } } } } },
    });
    if (!p) throw new AppException(ERROR_CODES.PRODUCT_NOT_ACTIVE, 'Product not active', HttpStatus.BAD_REQUEST);
    const availability = computeProductAvailability(p);
    if (!availability.isPurchasable) {
      throw new AppException(ERROR_CODES.PRODUCT_NOT_AVAILABLE_FOR_SALE, 'Product not available for sale', HttpStatus.BAD_REQUEST);
    }
    return p;
  }

  private async validateOptions(productId: string, ids: string[]) {
    const groups = await this.prisma.productOptionGroup.findMany({
      where: { productId, deletedAt: null },
      include: { options: { where: { deletedAt: null, isActive: true } } },
    });
    const selected = new Set(ids);
    const all = new Set(groups.flatMap((g) => g.options.map((o) => o.id)));
    if (ids.some((id) => !all.has(id))) throw new AppException(ERROR_CODES.CART_ITEM_INVALID_OPTIONS, 'Invalid options', HttpStatus.BAD_REQUEST);
    for (const group of groups) {
      const count = group.options.filter((o) => selected.has(o.id)).length;
      if (group.isRequired && count === 0) throw new AppException(ERROR_CODES.CART_ITEM_REQUIRED_OPTION_MISSING, 'Required option missing', HttpStatus.BAD_REQUEST);
      if (!group.isMultiple && count > 1) throw new AppException(ERROR_CODES.CART_ITEM_INVALID_OPTIONS, 'Too many options selected', HttpStatus.BAD_REQUEST);
    }
  }
}
