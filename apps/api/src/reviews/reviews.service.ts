import { HttpStatus, Inject, Injectable } from '@nestjs/common'
import { OrderStatus, ReviewStatus } from '@prisma/client'
import type { Prisma } from '@prisma/client'

import { AuditService } from '../audit/audit.service'
import { ERROR_CODES } from '../common/constants/error-codes'
import { AppException } from '../common/exceptions/app.exception'
import { normalizePagination } from '../common/utils/pagination.util'
import { PrismaService } from '../database/prisma.service'
import type { CreateReviewDto } from './dto/create-review.dto'
import type { QueryPendingReviewsDto } from './dto/query-pending-reviews.dto'
import type { QueryProductReviewsDto } from './dto/query-product-reviews.dto'

@Injectable()
export class ReviewsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService, @Inject(AuditService) private readonly audit: AuditService) {}

  async create(userId: string, dto: CreateReviewDto) {
    const orderItem = await this.prisma.orderItem.findFirst({
      where: {
        id: dto.orderItemId,
        order: { userId, deletedAt: null, status: OrderStatus.DELIVERED },
      },
      include: { review: true },
    })
    if (!orderItem) {
      throw new AppException(
        ERROR_CODES.REVIEW_ORDER_ITEM_INVALID,
        'Review requires a delivered own order item',
        HttpStatus.BAD_REQUEST,
      )
    }
    if (orderItem.review) {
      throw new AppException(
        ERROR_CODES.REVIEW_ALREADY_EXISTS,
        'Review already exists for order item',
        HttpStatus.BAD_REQUEST,
      )
    }
    return this.prisma.review.create({
      data: {
        userId,
        productId: orderItem.productId,
        orderItemId: orderItem.id,
        rating: dto.rating,
        comment: dto.comment,
        status: ReviewStatus.PENDING,
      },
    })
  }

  async product(productId: string, q: QueryProductReviewsDto) {
    const { page, limit } = normalizePagination(q.page, q.limit)
    const where: Prisma.ReviewWhereInput = {
      productId,
      status: ReviewStatus.APPROVED,
      deletedAt: null,
    }
    const [items, total] = await this.prisma.$transaction([
      this.prisma.review.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: { user: { select: { firstName: true, lastName: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.review.count({ where }),
    ])
    return { items, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } }
  }

  async mine(userId: string) {
    return this.prisma.review.findMany({
      where: { userId, deletedAt: null },
      include: { product: { select: { id: true, name: true, slug: true } }, orderItem: { select: { id: true, orderId: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
  }

  async pending(q: QueryPendingReviewsDto) {
    const { page, limit } = normalizePagination(q.page, q.limit)
    const where: Prisma.ReviewWhereInput = {
      status: ReviewStatus.PENDING,
      deletedAt: null,
      ...(q.productId ? { productId: q.productId } : {}),
      ...(q.startDate || q.endDate
        ? {
            createdAt: {
              ...(q.startDate ? { gte: new Date(q.startDate) } : {}),
              ...(q.endDate ? { lte: new Date(q.endDate) } : {}),
            },
          }
        : {}),
      ...(q.search
        ? {
            OR: [
              { comment: { contains: q.search, mode: 'insensitive' } },
              { product: { name: { contains: q.search, mode: 'insensitive' } } },
              { user: { firstName: { contains: q.search, mode: 'insensitive' } } },
              { user: { lastName: { contains: q.search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    }
    const [items, total] = await this.prisma.$transaction([
      this.prisma.review.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: { select: { id: true, firstName: true, lastName: true } },
          product: { select: { id: true, name: true } },
          orderItem: { select: { id: true, orderId: true } },
        },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.review.count({ where }),
    ])
    return { items, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } }
  }

  async approve(id: string, actorId?: string) {
    await this.getPending(id)
    const updated = await this.prisma.review.update({
      where: { id },
      data: { status: ReviewStatus.APPROVED, rejectedReason: null },
    })
    await this.audit.log({ actorId, action: 'reviews.approve', entityType: 'Review', entityId: id, newValues: { status: ReviewStatus.APPROVED } })
    return updated
  }

  async reject(id: string, reason: string, actorId?: string) {
    await this.getPending(id)
    const updated = await this.prisma.review.update({
      where: { id },
      data: { status: ReviewStatus.REJECTED, rejectedReason: reason },
    })
    await this.audit.log({ actorId, action: 'reviews.reject', entityType: 'Review', entityId: id, newValues: { status: ReviewStatus.REJECTED, reason } })
    return updated
  }

  async remove(id: string, actorId?: string) {
    const x = await this.prisma.review.findFirst({ where: { id, deletedAt: null } })
    if (!x) {
      throw new AppException(ERROR_CODES.REVIEW_NOT_FOUND, 'Review not found', HttpStatus.NOT_FOUND)
    }
    const removed = await this.prisma.review.update({ where: { id }, data: { deletedAt: new Date() } })
    await this.audit.log({ actorId, action: 'reviews.delete', entityType: 'Review', entityId: id })
    return removed
  }

  private async getPending(id: string) {
    const x = await this.prisma.review.findFirst({ where: { id, deletedAt: null } })
    if (!x) {
      throw new AppException(ERROR_CODES.REVIEW_NOT_FOUND, 'Review not found', HttpStatus.NOT_FOUND)
    }
    if (x.status !== ReviewStatus.PENDING) {
      throw new AppException(
        ERROR_CODES.REVIEW_STATUS_INVALID,
        'Review is not pending',
        HttpStatus.BAD_REQUEST,
      )
    }
    return x
  }
}
