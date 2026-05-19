import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { CourierStatus, DeliveryStatus, RoleType, UserStatus } from '@prisma/client';
import type { Prisma } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { hash } from 'bcryptjs';
import { AuditService } from '../audit/audit.service';
import { ERROR_CODES } from '../common/constants/error-codes';
import { AppException } from '../common/exceptions/app.exception';
import type { AuthUser } from '../common/types/auth-user.type';
import { normalizePagination } from '../common/utils/pagination.util';
import { PrismaService } from '../database/prisma.service';
import type { CreateCourierDto } from './dto/create-courier.dto';
import type { QueryCouriersDto } from './dto/query-couriers.dto';
import type { UpdateCourierDto } from './dto/update-courier.dto';

const ACTIVE_DELIVERY_STATUSES: DeliveryStatus[] = [
  DeliveryStatus.ASSIGNED,
  DeliveryStatus.PICKED_UP,
  DeliveryStatus.OUT_FOR_DELIVERY,
];

const userPublicSelect = {
  id: true,
  firstName: true,
  lastName: true,
  phone: true,
  email: true,
  status: true,
} as const;

function canManageCouriers(user?: AuthUser): boolean {
  if (!user?.permissions?.length) return false;
  return user.permissions.includes('couriers.create') || user.permissions.includes('couriers.update');
}

@Injectable()
export class CouriersService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  async list(q: QueryCouriersDto, user?: AuthUser) {
    const { page, limit } = normalizePagination(q.page, q.limit);
    const includeRemoved = q.includeRemoved === true;
    if (includeRemoved && !canManageCouriers(user)) {
      throw new AppException(ERROR_CODES.FORBIDDEN, 'Forbidden', HttpStatus.FORBIDDEN);
    }
    const where: Prisma.CourierWhereInput = {
      ...(includeRemoved ? {} : { deletedAt: null }),
      ...(q.status ? { status: q.status } : {}),
      ...(q.search
        ? {
            user: {
              OR: [
                { firstName: { contains: q.search, mode: 'insensitive' } },
                { lastName: { contains: q.search, mode: 'insensitive' } },
                { phone: { contains: q.search } },
              ],
            },
          }
        : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.courier.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: { select: userPublicSelect },
          _count: { select: { deliveries: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.courier.count({ where }),
    ]);
    return { items, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async getById(id: string, user?: AuthUser) {
    const courier = await this.prisma.courier.findFirst({
      where: { id },
      include: {
        user: { select: userPublicSelect },
        _count: { select: { deliveries: true } },
      },
    });
    if (!courier) {
      throw new AppException(ERROR_CODES.COURIER_NOT_FOUND, 'Courier not found', HttpStatus.NOT_FOUND);
    }
    if (courier.deletedAt && !canManageCouriers(user)) {
      throw new AppException(ERROR_CODES.COURIER_NOT_FOUND, 'Courier not found', HttpStatus.NOT_FOUND);
    }
    return courier;
  }

  async create(dto: CreateCourierDto, actor?: AuthUser) {
    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ phone: dto.phone }, ...(dto.email ? [{ email: dto.email }] : [])] },
    });
    if (existing) {
      throw new AppException(ERROR_CODES.USER_ALREADY_EXISTS, 'User already exists', HttpStatus.CONFLICT);
    }
    const courierRole = await this.prisma.role.findUnique({ where: { name: RoleType.COURIER } });
    if (!courierRole) {
      throw new AppException(ERROR_CODES.ROLE_NOT_FOUND, 'Courier role not found', HttpStatus.INTERNAL_SERVER_ERROR);
    }
    const passwordHash = await hash(dto.password, 12);
    const status = dto.status ?? CourierStatus.ACTIVE;

    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const createdUser = await tx.user.create({
          data: {
            firstName: dto.firstName,
            lastName: dto.lastName,
            phone: dto.phone,
            email: dto.email ?? undefined,
            passwordHash,
            status: UserStatus.ACTIVE,
            roleId: courierRole.id,
          },
        });
        const createdCourier = await tx.courier.create({
          data: {
            userId: createdUser.id,
            vehicle: dto.vehicle ?? undefined,
            status,
          },
          include: { user: { select: userPublicSelect }, _count: { select: { deliveries: true } } },
        });
        await this.audit.log(
          {
            actorId: actor?.sub,
            action: 'couriers.create',
            entityType: 'Courier',
            entityId: createdCourier.id,
            newValues: {
              id: createdCourier.id,
              userId: createdCourier.userId,
              vehicle: createdCourier.vehicle,
              status: createdCourier.status,
            } as unknown as Prisma.InputJsonValue,
          },
          tx,
        );
        return createdCourier;
      });
      return result;
    } catch (e) {
      if (e instanceof PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new AppException(ERROR_CODES.USER_ALREADY_EXISTS, 'Phone or email already in use', HttpStatus.CONFLICT);
      }
      throw e;
    }
  }

  async update(id: string, dto: UpdateCourierDto, actor?: AuthUser) {
    const courier = await this.prisma.courier.findFirst({
      where: { id },
      include: { user: true },
    });
    if (!courier) {
      throw new AppException(ERROR_CODES.COURIER_NOT_FOUND, 'Courier not found', HttpStatus.NOT_FOUND);
    }
    if (courier.deletedAt && !canManageCouriers(actor)) {
      throw new AppException(ERROR_CODES.COURIER_NOT_FOUND, 'Courier not found', HttpStatus.NOT_FOUND);
    }

    if (dto.phone !== undefined || dto.email !== undefined) {
      const dup = await this.prisma.user.findFirst({
        where: {
          id: { not: courier.userId },
          OR: [...(dto.phone ? [{ phone: dto.phone }] : []), ...(dto.email ? [{ email: dto.email }] : [])],
        },
      });
      if (dup) {
        throw new AppException(ERROR_CODES.USER_ALREADY_EXISTS, 'Phone or email already in use', HttpStatus.CONFLICT);
      }
    }

    const passwordHash = dto.newPassword ? await hash(dto.newPassword, 12) : undefined;

    try {
      const updated = await this.prisma.$transaction(async (tx) => {
        const userData: Prisma.UserUpdateInput = {
          ...(dto.firstName !== undefined ? { firstName: dto.firstName } : {}),
          ...(dto.lastName !== undefined ? { lastName: dto.lastName } : {}),
          ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
          ...(dto.email !== undefined ? { email: dto.email } : {}),
          ...(passwordHash !== undefined ? { passwordHash } : {}),
        };
        if (Object.keys(userData).length > 0) {
          await tx.user.update({ where: { id: courier.userId }, data: userData });
        }
        const courierData: Prisma.CourierUpdateInput = {
          ...(dto.vehicle !== undefined ? { vehicle: dto.vehicle } : {}),
        };
        if (Object.keys(courierData).length > 0) {
          await tx.courier.update({
            where: { id },
            data: courierData,
          });
        }
        const fresh = await tx.courier.findFirstOrThrow({
          where: { id },
          include: { user: { select: userPublicSelect }, _count: { select: { deliveries: true } } },
        });
        await this.audit.log(
          {
            actorId: actor?.sub,
            action: 'couriers.update',
            entityType: 'Courier',
            entityId: id,
            oldValues: {
              vehicle: courier.vehicle,
              userId: courier.userId,
            } as unknown as Prisma.InputJsonValue,
            newValues: {
              vehicle: fresh.vehicle,
              userId: fresh.userId,
              user: fresh.user,
            } as unknown as Prisma.InputJsonValue,
          },
          tx,
        );
        return fresh;
      });
      return updated;
    } catch (e) {
      if (e instanceof PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new AppException(ERROR_CODES.USER_ALREADY_EXISTS, 'Phone or email already in use', HttpStatus.CONFLICT);
      }
      throw e;
    }
  }

  async deactivate(id: string, actor?: AuthUser) {
    const courier = await this.prisma.courier.findFirst({
      where: { id, deletedAt: null },
      include: { user: true },
    });
    if (!courier) {
      throw new AppException(ERROR_CODES.COURIER_NOT_FOUND, 'Courier not found', HttpStatus.NOT_FOUND);
    }
    const activeCount = await this.prisma.delivery.count({
      where: { courierId: id, status: { in: ACTIVE_DELIVERY_STATUSES } },
    });
    if (activeCount > 0) {
      throw new AppException(
        ERROR_CODES.COURIER_HAS_ACTIVE_DELIVERIES,
        'Courier has active deliveries',
        HttpStatus.CONFLICT,
      );
    }
    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      await tx.courier.update({
        where: { id },
        data: { status: CourierStatus.INACTIVE, deletedAt: now },
      });
      await tx.user.update({
        where: { id: courier.userId },
        data: { status: UserStatus.INACTIVE },
      });
      await tx.refreshToken.updateMany({
        where: { userId: courier.userId, revokedAt: null },
        data: { revokedAt: now },
      });
      await this.audit.log(
        {
          actorId: actor?.sub,
          action: 'couriers.deactivate',
          entityType: 'Courier',
          entityId: id,
          oldValues: { status: courier.status, deletedAt: courier.deletedAt } as unknown as Prisma.InputJsonValue,
          newValues: { status: CourierStatus.INACTIVE, deletedAt: now.toISOString() } as unknown as Prisma.InputJsonValue,
        },
        tx,
      );
    });
    return this.getById(id, actor);
  }

  async reactivate(id: string, actor?: AuthUser) {
    const courier = await this.prisma.courier.findFirst({
      where: { id },
      include: { user: true },
    });
    if (!courier) {
      throw new AppException(ERROR_CODES.COURIER_NOT_FOUND, 'Courier not found', HttpStatus.NOT_FOUND);
    }
    if (courier.deletedAt === null && courier.status === CourierStatus.ACTIVE) {
      return this.getById(id, actor);
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.courier.update({
        where: { id },
        data: { status: CourierStatus.ACTIVE, deletedAt: null },
      });
      await tx.user.update({
        where: { id: courier.userId },
        data: { status: UserStatus.ACTIVE },
      });
      await this.audit.log(
        {
          actorId: actor?.sub,
          action: 'couriers.reactivate',
          entityType: 'Courier',
          entityId: id,
          oldValues: {
            status: courier.status,
            deletedAt: courier.deletedAt?.toISOString() ?? null,
          } as unknown as Prisma.InputJsonValue,
          newValues: { status: CourierStatus.ACTIVE, deletedAt: null } as unknown as Prisma.InputJsonValue,
        },
        tx,
      );
    });
    return this.getById(id, actor);
  }
}
