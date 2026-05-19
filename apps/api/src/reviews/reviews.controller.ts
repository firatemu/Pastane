import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, Query } from '@nestjs/common'
import { ApiBody, ApiExtraModels } from '@nestjs/swagger'

import { CurrentUser } from '../common/decorators/current-user.decorator'
import { Permissions } from '../common/decorators/permissions.decorator'
import { Public } from '../common/decorators/public.decorator'
import type { AuthUser } from '../common/types/auth-user.type'
import { CreateReviewDto } from './dto/create-review.dto'
import { QueryPendingReviewsDto } from './dto/query-pending-reviews.dto'
import { QueryProductReviewsDto } from './dto/query-product-reviews.dto'
import { RejectReviewDto } from './dto/reject-review.dto'
import { ReviewsService } from './reviews.service'

@ApiExtraModels(QueryPendingReviewsDto, QueryProductReviewsDto)
@Controller('reviews')
export class ReviewsController {
  constructor(@Inject(ReviewsService) private readonly svc: ReviewsService) {}

  @Permissions('reviews.create')
  @ApiBody({ type: CreateReviewDto })
  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateReviewDto) {
    return this.svc.create(user.sub, dto)
  }

  @Public()
  @Get('product/:productId')
  product(@Param('productId') productId: string, @Query() q: QueryProductReviewsDto) {
    return this.svc.product(productId, q)
  }

  @Permissions('reviews.view')
  @Get('me')
  mine(@CurrentUser() user: AuthUser) {
    return this.svc.mine(user.sub)
  }

  @Permissions('reviews.moderate')
  @Get('pending')
  pending(@Query() q: QueryPendingReviewsDto) {
    return this.svc.pending(q)
  }

  @Permissions('reviews.moderate')
  @Patch(':id/approve')
  approve(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.svc.approve(id, user.sub)
  }

  @Permissions('reviews.moderate')
  @ApiBody({ type: RejectReviewDto })
  @Patch(':id/reject')
  reject(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: RejectReviewDto) {
    return this.svc.reject(id, dto.reason, user.sub)
  }

  @Permissions('reviews.delete')
  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.svc.remove(id, user.sub)
  }
}
