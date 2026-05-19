import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { LoyaltyMovementType, OrderStatus, Prisma } from '@prisma/client';
import { createHash, randomUUID } from 'crypto';
import { AuditService } from '../audit/audit.service';
import { ERROR_CODES } from '../common/constants/error-codes';
import { AppException } from '../common/exceptions/app.exception';
import { money } from '../common/utils/money.util';
import type { AuthUser } from '../common/types/auth-user.type';
import { PrismaService } from '../database/prisma.service';
import type { AdjustLoyaltyDto, RedeemLoyaltyDto, UpdateLoyaltySettingDto } from './dto/loyalty.dto';

type Tx = Prisma.TransactionClient;

@Injectable()
export class LoyaltyService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService, @Inject(AuditService) private readonly audit: AuditService) {}

  private qrFor(userId: string) { return `LOY-${createHash('sha256').update(`${userId}:${randomUUID()}`).digest('hex').slice(0, 24).toUpperCase()}`; }

  async accountForUser(userId: string, client: PrismaService | Tx = this.prisma) {
    const existing = await client.loyaltyAccount.findUnique({ where: { userId }, include: { movements: { orderBy: { createdAt: 'desc' }, take: 20 } } });
    if (existing) return existing;
    return client.loyaltyAccount.create({ data: { userId, qrCode: this.qrFor(userId) }, include: { movements: true } });
  }

  me(userId: string) { return this.accountForUser(userId); }
  async movements(userId: string) { const account = await this.accountForUser(userId); return this.prisma.loyaltyMovement.findMany({ where: { loyaltyAccountId: account.id }, orderBy: { createdAt: 'desc' } }); }
  async scan(qrCode: string) { const account = await this.prisma.loyaltyAccount.findUnique({ where: { qrCode }, include: { user: { select: { id: true, firstName: true, lastName: true, phone: true } } } }); if (!account) throw new AppException(ERROR_CODES.LOYALTY_ACCOUNT_NOT_FOUND, 'Loyalty account not found', HttpStatus.NOT_FOUND); return account; }

  async redeem(dto: RedeemLoyaltyDto, actor?: AuthUser) {
    return this.prisma.$transaction(async (tx) => {
      const account = await this.findAccountForMutation(tx, dto);
      if (account.points < dto.points) throw new AppException(ERROR_CODES.INSUFFICIENT_LOYALTY_POINTS, 'Insufficient loyalty points', HttpStatus.BAD_REQUEST);
      const updated = await tx.loyaltyAccount.update({ where: { id: account.id }, data: { points: { decrement: dto.points } } });
      const movement = await tx.loyaltyMovement.create({ data: { loyaltyAccountId: account.id, type: LoyaltyMovementType.REDEEM, points: -dto.points, balanceAfter: updated.points, note: dto.note } });
      await this.audit.log({ actorId: actor?.sub, action: 'loyalty.redeem', entityType: 'LoyaltyAccount', entityId: account.id, newValues: { points: -dto.points, balanceAfter: updated.points } }, tx);
      return movement;
    });
  }

  async adjust(dto: AdjustLoyaltyDto, actor?: AuthUser) {
    return this.prisma.$transaction(async (tx) => {
      const account = await this.findAccountForMutation(tx, dto);
      const updated = await tx.loyaltyAccount.update({ where: { id: account.id }, data: { points: { increment: dto.points } } });
      const movement = await tx.loyaltyMovement.create({ data: { loyaltyAccountId: account.id, type: LoyaltyMovementType.ADJUSTMENT, points: dto.points, balanceAfter: updated.points, note: dto.note } });
      await this.audit.log({ actorId: actor?.sub, action: 'loyalty.adjust', entityType: 'LoyaltyAccount', entityId: account.id, newValues: { points: dto.points, balanceAfter: updated.points } }, tx);
      return movement;
    });
  }

  /** Teslim sonrası kazanılan puanları, sipariş iptalinde geri al (varsa). */
  async reverseEarnForDeliveredOrderIfAny(
    orderId: string,
    client: Tx,
    actorId: string | undefined | null,
    cancelReason: string,
  ): Promise<{ reversedPoints: number } | null> {
    const order = await client.order.findUnique({ where: { id: orderId } });
    if (!order) return null;
    const account = await client.loyaltyAccount.findUnique({ where: { userId: order.userId } });
    if (!account) return null;
    const earnNote = `Earned from order ${order.orderNumber}`;
    const movement = await client.loyaltyMovement.findFirst({
      where: { loyaltyAccountId: account.id, note: earnNote, type: LoyaltyMovementType.EARN },
      orderBy: { createdAt: 'desc' },
    });
    if (!movement || movement.points <= 0) return null;
    const updated = await client.loyaltyAccount.update({
      where: { id: account.id },
      data: { points: { decrement: movement.points } },
    });
    const reasonSafe = cancelReason.trim().slice(0, 400);
    await client.loyaltyMovement.create({
      data: {
        loyaltyAccountId: account.id,
        type: LoyaltyMovementType.ADJUSTMENT,
        points: -movement.points,
        balanceAfter: updated.points,
        note: `Teslimat iptali (${order.orderNumber}): ${reasonSafe}`,
      },
    });
    await this.audit.log(
      {
        actorId: actorId ?? null,
        action: 'loyalty.delivered_cancel_reverse',
        entityType: 'Order',
        entityId: order.id,
        newValues: { reversedPoints: movement.points },
      },
      client,
    );
    return { reversedPoints: movement.points };
  }

  async earnForDeliveredOrder(orderId: string, client: Tx, actorId?: string | null) {
    const order = await client.order.findUnique({ where: { id: orderId }, include: { payments: { where: { status: 'SUCCESS' }, take: 1 } } });
    if (!order || order.status !== OrderStatus.DELIVERED || !order.payments.length) return null;
    const existing = await client.loyaltyMovement.findFirst({ where: { note: `Earned from order ${order.orderNumber}` } });
    if (existing) return existing;
    const setting = await client.loyaltySetting.findFirst({ where: { isActive: true }, orderBy: { createdAt: 'desc' } });
    if (!setting) return null;
    const points = Math.floor(Number(money.multiply(order.grandTotal, setting.earnRate)));
    if (points <= 0) return null;
    const account = await this.accountForUser(order.userId, client);
    const updated = await client.loyaltyAccount.update({ where: { id: account.id }, data: { points: { increment: points } } });
    const movement = await client.loyaltyMovement.create({ data: { loyaltyAccountId: account.id, type: LoyaltyMovementType.EARN, points, balanceAfter: updated.points, note: `Earned from order ${order.orderNumber}` } });
    await this.audit.log({ actorId, action: 'loyalty.earn', entityType: 'Order', entityId: order.id, newValues: { points, balanceAfter: updated.points } }, client);
    return movement;
  }

  settings() { return this.prisma.loyaltySetting.findMany({ orderBy: { createdAt: 'desc' } }); }
  async updateSettings(dto: UpdateLoyaltySettingDto, actor?: AuthUser) {
    const current = await this.prisma.loyaltySetting.findFirst({ where: { isActive: true }, orderBy: { createdAt: 'desc' } });
    const setting = await this.prisma.loyaltySetting.create({ data: { earnRate: new Prisma.Decimal(dto.earnRate ?? Number(current?.earnRate ?? 0.01)), pointValue: new Prisma.Decimal(dto.pointValue ?? Number(current?.pointValue ?? 1)), minimumRedeem: dto.minimumRedeem ?? current?.minimumRedeem ?? 0, isActive: dto.isActive ?? true } });
    await this.audit.log({ actorId: actor?.sub, action: 'loyalty.settings.update', entityType: 'LoyaltySetting', entityId: setting.id, newValues: setting as unknown as Prisma.InputJsonValue });
    return setting;
  }

  private async findAccountForMutation(tx: Tx, dto: { userId?: string; qrCode?: string }) {
    const account = dto.userId ? await this.accountForUser(dto.userId, tx) : dto.qrCode ? await tx.loyaltyAccount.findUnique({ where: { qrCode: dto.qrCode } }) : null;
    if (!account) throw new AppException(ERROR_CODES.LOYALTY_ACCOUNT_NOT_FOUND, 'Loyalty account not found', HttpStatus.NOT_FOUND);
    return account;
  }
}
