import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import {
  CourierStatus,
  DeliveryStatus,
  OrderStatus,
  RoleType,
  UserStatus,
} from '@prisma/client';
import type { Prisma } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { compare, hash } from 'bcryptjs';
import { AuditService } from '../audit/audit.service';
import { ERROR_CODES } from '../common/constants/error-codes';
import { AppException } from '../common/exceptions/app.exception';
import type { AuthUser } from '../common/types/auth-user.type';
import { normalizePagination } from '../common/utils/pagination.util';
import { PrismaService } from '../database/prisma.service';
import type { ChangePasswordDto } from './dto/change-password.dto';
import type { QueryCustomersDto } from './dto/query-customers.dto';
import { QueryUsersDto, UserListScope } from './dto/query-users.dto';
import type { UpdateOwnProfileDto } from './dto/update-own-profile.dto';
import type { UpdateUserDto } from './dto/update-user.dto';

type MutationScope = 'any' | 'staff' | 'customer';

const NON_CUSTOMER_ROLES: RoleType[] = [
  RoleType.ADMIN,
  RoleType.ORDER_OPERATOR,
  RoleType.PRODUCT_MANAGER,
  RoleType.COURIER,
];

const ACTIVE_DELIVERY_STATUSES: DeliveryStatus[] = [
  DeliveryStatus.ASSIGNED,
  DeliveryStatus.PICKED_UP,
  DeliveryStatus.OUT_FOR_DELIVERY,
];

const VALUE_ORDER_EXCLUSIONS: OrderStatus[] = [
  OrderStatus.CANCELLED,
  OrderStatus.PAYMENT_PENDING,
];

const adminUserSelect = {
  id: true,
  firstName: true,
  lastName: true,
  phone: true,
  email: true,
  status: true,
  isPhoneVerified: true,
  createdAt: true,
  updatedAt: true,
  role: { select: { name: true } },
  courier: {
    select: {
      id: true,
      status: true,
      deletedAt: true,
      _count: { select: { deliveries: true } },
    },
  },
} satisfies Prisma.UserSelect;

const customerMutationSelect = {
  id: true,
  firstName: true,
  lastName: true,
  phone: true,
  email: true,
  status: true,
  isPhoneVerified: true,
  createdAt: true,
  updatedAt: true,
  role: { select: { name: true } },
  courier: {
    select: {
      id: true,
      status: true,
      deletedAt: true,
    },
  },
} satisfies Prisma.UserSelect;

function buildUserSearchFilter(search?: string): Prisma.UserWhereInput {
  const query = search?.trim();
  if (!query) return {};
  return {
    OR: [
      { firstName: { contains: query, mode: 'insensitive' } },
      { lastName: { contains: query, mode: 'insensitive' } },
      { phone: { contains: query } },
      { email: { contains: query, mode: 'insensitive' } },
    ],
  };
}

function formatMoney(value?: Prisma.Decimal | null): string {
  return value ? value.toString() : '0.00';
}

@Injectable()
export class UsersService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  list(query: QueryUsersDto = new QueryUsersDto()) {
    const scope = query.scope ?? UserListScope.ALL;
    if (scope === UserListScope.STAFF && query.roleName === RoleType.CUSTOMER) {
      return Promise.resolve([]);
    }

    const roleFilter =
      query.roleName !== undefined
        ? { role: { name: query.roleName } }
        : scope === UserListScope.STAFF
          ? { role: { name: { in: NON_CUSTOMER_ROLES } } }
          : {};

    return this.prisma.user.findMany({
      where: {
        deletedAt: null,
        ...roleFilter,
        ...(query.status ? { status: query.status } : {}),
        ...buildUserSearchFilter(query.search),
      },
      select: adminUserSelect,
      orderBy: [{ createdAt: 'desc' }, { firstName: 'asc' }],
    });
  }

  async listCustomers(query: QueryCustomersDto) {
    const { page, limit } = normalizePagination(query.page, query.limit);
    const where: Prisma.UserWhereInput = {
      deletedAt: null,
      role: { name: RoleType.CUSTOMER },
      ...(query.status ? { status: query.status } : {}),
      ...buildUserSearchFilter(query.search),
    };

    const [users, total, activeCount, inactiveCount, bannedCount, withOrdersCount, loyaltyCount] =
      await this.prisma.$transaction([
        this.prisma.user.findMany({
          where,
          skip: (page - 1) * limit,
          take: limit,
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
            status: true,
            isPhoneVerified: true,
            createdAt: true,
            updatedAt: true,
            addresses: {
              where: { deletedAt: null, isDefault: true },
              take: 1,
              select: {
                id: true,
                title: true,
                city: true,
                district: true,
              },
            },
            loyaltyAccount: {
              select: {
                id: true,
                points: true,
                qrCode: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.user.count({ where }),
        this.prisma.user.count({ where: { ...where, status: UserStatus.ACTIVE } }),
        this.prisma.user.count({ where: { ...where, status: UserStatus.INACTIVE } }),
        this.prisma.user.count({ where: { ...where, status: UserStatus.BANNED } }),
        this.prisma.user.count({
          where: {
            ...where,
            orders: {
              some: {
                deletedAt: null,
                status: { notIn: VALUE_ORDER_EXCLUSIONS },
              },
            },
          },
        }),
        this.prisma.user.count({
          where: {
            ...where,
            loyaltyAccount: { isNot: null },
          },
        }),
      ]);

    const userIds = users.map((user) => user.id);
    const orderStats =
      userIds.length > 0
        ? await this.prisma.order.groupBy({
            by: ['userId'],
            where: {
              userId: { in: userIds },
              deletedAt: null,
              status: { notIn: VALUE_ORDER_EXCLUSIONS },
            },
            _count: { _all: true },
            _sum: { grandTotal: true },
            _max: { createdAt: true },
          })
        : [];

    const statsByUserId = new Map(orderStats.map((item) => [item.userId, item]));

    return {
      items: users.map((user) => {
        const stat = statsByUserId.get(user.id);
        const defaultAddress = user.addresses[0] ?? null;

        return {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          email: user.email,
          status: user.status,
          isPhoneVerified: user.isPhoneVerified,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          defaultAddress,
          loyalty: user.loyaltyAccount
            ? {
                id: user.loyaltyAccount.id,
                points: user.loyaltyAccount.points,
                qrCode: user.loyaltyAccount.qrCode,
              }
            : null,
          metrics: {
            orderCount: stat?._count._all ?? 0,
            lifetimeSpent: formatMoney(stat?._sum.grandTotal),
            lastOrderAt: stat?._max.createdAt ?? null,
          },
        };
      }),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        summary: {
          activeCount,
          inactiveCount,
          bannedCount,
          withOrdersCount,
          loyaltyCount,
        },
      },
    };
  }

  async getById(id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: adminUserSelect,
    });

    if (!user) {
      throw new AppException(ERROR_CODES.USER_NOT_FOUND, 'User not found', HttpStatus.NOT_FOUND);
    }

    return user;
  }

  async getStaffById(id: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        id,
        deletedAt: null,
        role: { name: { in: NON_CUSTOMER_ROLES } },
      },
      select: adminUserSelect,
    });

    if (!user) {
      throw new AppException(ERROR_CODES.USER_NOT_FOUND, 'User not found', HttpStatus.NOT_FOUND);
    }

    return user;
  }

  async getCustomerDetail(id: string) {
    const [customer, totalOrders, deliveredOrders, valueAggregate, unreadNotificationsCount] =
      await this.prisma.$transaction([
        this.prisma.user.findFirst({
          where: {
            id,
            deletedAt: null,
            role: { name: RoleType.CUSTOMER },
          },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
            status: true,
            isPhoneVerified: true,
            createdAt: true,
            updatedAt: true,
            addresses: {
              where: { deletedAt: null },
              orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
              select: {
                id: true,
                title: true,
                city: true,
                district: true,
                neighborhood: true,
                fullAddress: true,
                building: true,
                floor: true,
                apartment: true,
                directions: true,
                isDefault: true,
                createdAt: true,
                updatedAt: true,
              },
            },
            loyaltyAccount: {
              select: {
                id: true,
                points: true,
                qrCode: true,
                createdAt: true,
                updatedAt: true,
                movements: {
                  orderBy: { createdAt: 'desc' },
                  take: 20,
                  select: {
                    id: true,
                    type: true,
                    points: true,
                    balanceAfter: true,
                    note: true,
                    createdAt: true,
                  },
                },
              },
            },
            notifications: {
              orderBy: { createdAt: 'desc' },
              take: 20,
              select: {
                id: true,
                type: true,
                title: true,
                body: true,
                metadata: true,
                readAt: true,
                createdAt: true,
              },
            },
            reviews: {
              where: { deletedAt: null },
              orderBy: { createdAt: 'desc' },
              take: 20,
              select: {
                id: true,
                rating: true,
                comment: true,
                status: true,
                rejectedReason: true,
                createdAt: true,
                product: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
                orderItem: {
                  select: {
                    orderId: true,
                    productNameSnapshot: true,
                  },
                },
              },
            },
            orders: {
              where: { deletedAt: null },
              orderBy: { createdAt: 'desc' },
              take: 12,
              select: {
                id: true,
                orderNumber: true,
                createdAt: true,
                scheduledAt: true,
                deliveryType: true,
                status: true,
                grandTotal: true,
                note: true,
                _count: { select: { items: true } },
                payments: {
                  orderBy: { createdAt: 'desc' },
                  take: 3,
                  select: {
                    id: true,
                    status: true,
                    amount: true,
                    providerStatus: true,
                    createdAt: true,
                  },
                },
                delivery: {
                  select: {
                    status: true,
                    courier: {
                      select: {
                        user: {
                          select: {
                            firstName: true,
                            lastName: true,
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        }),
        this.prisma.order.count({
          where: { userId: id, deletedAt: null },
        }),
        this.prisma.order.count({
          where: { userId: id, deletedAt: null, status: OrderStatus.DELIVERED },
        }),
        this.prisma.order.aggregate({
          where: {
            userId: id,
            deletedAt: null,
            status: { notIn: VALUE_ORDER_EXCLUSIONS },
          },
          _sum: { grandTotal: true },
        }),
        this.prisma.notification.count({
          where: { userId: id, readAt: null },
        }),
      ]);

    if (!customer) {
      throw new AppException(ERROR_CODES.USER_NOT_FOUND, 'Customer not found', HttpStatus.NOT_FOUND);
    }

    const recentOrders = customer.orders.map((order) => ({
      ...order,
      grandTotal: order.grandTotal.toString(),
      payments: order.payments.map((payment) => ({
        ...payment,
        amount: payment.amount.toString(),
      })),
    }));

    return {
      profile: {
        id: customer.id,
        firstName: customer.firstName,
        lastName: customer.lastName,
        phone: customer.phone,
        email: customer.email,
        status: customer.status,
        isPhoneVerified: customer.isPhoneVerified,
        createdAt: customer.createdAt,
        updatedAt: customer.updatedAt,
      },
      summary: {
        totalOrders,
        deliveredOrders,
        lifetimeSpent: formatMoney(valueAggregate._sum.grandTotal),
        lastOrderAt: recentOrders[0]?.createdAt ?? null,
        loyaltyPoints: customer.loyaltyAccount?.points ?? 0,
        addressCount: customer.addresses.length,
        reviewCount: customer.reviews.length,
        unreadNotificationsCount,
      },
      addresses: customer.addresses,
      loyaltyAccount: customer.loyaltyAccount,
      notifications: customer.notifications,
      reviews: customer.reviews,
      recentOrders,
    };
  }

  update(id: string, dto: UpdateUserDto, actor?: AuthUser) {
    return this.updateManagedUser(id, dto, actor, {
      scope: 'staff',
      allowRoleChange: true,
    });
  }

  updateCustomer(id: string, dto: UpdateUserDto, actor?: AuthUser) {
    return this.updateManagedUser(id, dto, actor, {
      scope: 'customer',
      allowRoleChange: false,
    });
  }

  async delete(id: string, actor?: AuthUser) {
    return this.softDelete(id, actor, 'staff');
  }

  async deleteCustomer(id: string, actor?: AuthUser) {
    return this.softDelete(id, actor, 'customer');
  }

  async updateOwn(id: string, dto: UpdateOwnProfileDto) {
    await this.getById(id);

    return this.prisma.user.update({
      where: { id },
      data: dto,
      select: adminUserSelect,
    });
  }

  async changeOwnPassword(id: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findFirst({ where: { id, deletedAt: null } });
    if (!user) {
      throw new AppException(ERROR_CODES.USER_NOT_FOUND, 'User not found', HttpStatus.NOT_FOUND);
    }

    if (!(await compare(dto.currentPassword, user.passwordHash))) {
      throw new AppException(
        ERROR_CODES.AUTH_INVALID_CREDENTIALS,
        'Current password is invalid',
        HttpStatus.UNAUTHORIZED,
      );
    }

    await this.prisma.user.update({
      where: { id },
      data: { passwordHash: await hash(dto.newPassword, 12) },
    });

    return { changed: true };
  }

  private async updateManagedUser(
    id: string,
    dto: UpdateUserDto,
    actor: AuthUser | undefined,
    options: { scope: MutationScope; allowRoleChange: boolean },
  ) {
    const current = await this.findManagedUser(id, options.scope);

    if (dto.roleName !== undefined && !options.allowRoleChange) {
      throw new AppException(
        ERROR_CODES.FORBIDDEN,
        'Role changes are not allowed for customer accounts',
        HttpStatus.FORBIDDEN,
      );
    }

    if (options.scope === 'staff' && dto.roleName === RoleType.CUSTOMER) {
      throw new AppException(
        ERROR_CODES.FORBIDDEN,
        'Staff accounts cannot be reassigned to the customer role from this route',
        HttpStatus.FORBIDDEN,
      );
    }

    await this.ensureUniqueContacts(id, dto);

    const trimmedPhone = dto.phone?.trim();
    const trimmedEmail = dto.email?.trim();

    const data: Prisma.UserUpdateInput = {
      ...(dto.firstName !== undefined ? { firstName: dto.firstName.trim() } : {}),
      ...(dto.lastName !== undefined ? { lastName: dto.lastName.trim() } : {}),
      ...(dto.phone !== undefined ? { phone: trimmedPhone ?? dto.phone } : {}),
      ...(dto.email !== undefined ? { email: trimmedEmail || null } : {}),
      ...(dto.status !== undefined ? { status: dto.status } : {}),
      ...(dto.roleName && options.allowRoleChange
        ? { role: { connect: { name: dto.roleName } } }
        : {}),
    };

    try {
      return await this.prisma.$transaction(async (tx) => {
        const updated = await tx.user.update({
          where: { id },
          data,
          select: adminUserSelect,
        });

        if (
          current.role.name === RoleType.COURIER &&
          current.courier?.deletedAt === null &&
          dto.status !== undefined
        ) {
          await tx.courier.update({
            where: { id: current.courier.id },
            data: {
              status: dto.status === UserStatus.ACTIVE ? CourierStatus.ACTIVE : CourierStatus.INACTIVE,
            },
          });
        }

        await this.audit.log(
          {
            actorId: actor?.sub,
            action: current.role.name === RoleType.CUSTOMER ? 'customers.update' : 'users.update',
            entityType: 'User',
            entityId: id,
            oldValues: {
              firstName: current.firstName,
              lastName: current.lastName,
              phone: current.phone,
              email: current.email,
              status: current.status,
              roleName: current.role.name,
            } as Prisma.InputJsonValue,
            newValues: {
              firstName: updated.firstName,
              lastName: updated.lastName,
              phone: updated.phone,
              email: updated.email,
              status: updated.status,
              roleName: updated.role.name,
            } as Prisma.InputJsonValue,
          },
          tx,
        );

        return updated;
      });
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new AppException(
          ERROR_CODES.USER_ALREADY_EXISTS,
          'Phone or email already in use',
          HttpStatus.CONFLICT,
        );
      }

      throw error;
    }
  }

  private async softDelete(id: string, actor: AuthUser | undefined, scope: MutationScope) {
    const user = await this.findManagedUser(id, scope);

    if (actor?.sub === id) {
      throw new AppException(
        ERROR_CODES.FORBIDDEN,
        'You cannot delete your own account',
        HttpStatus.FORBIDDEN,
      );
    }

    if (user.role.name === RoleType.CUSTOMER) {
      throw new AppException(
        ERROR_CODES.FORBIDDEN,
        'Customer accounts cannot be deleted',
        HttpStatus.FORBIDDEN,
      );
    }

    if (user.role.name === RoleType.ADMIN && user.status === UserStatus.ACTIVE) {
      const activeAdminCount = await this.prisma.user.count({
        where: {
          deletedAt: null,
          status: UserStatus.ACTIVE,
          role: { name: RoleType.ADMIN },
        },
      });

      if (activeAdminCount <= 1) {
        throw new AppException(
          ERROR_CODES.FORBIDDEN,
          'The last active administrator cannot be deleted',
          HttpStatus.FORBIDDEN,
        );
      }
    }

    if (user.courier?.id) {
      const activeDeliveries = await this.prisma.delivery.count({
        where: {
          courierId: user.courier.id,
          status: { in: ACTIVE_DELIVERY_STATUSES },
        },
      });

      if (activeDeliveries > 0) {
        throw new AppException(
          ERROR_CODES.COURIER_HAS_ACTIVE_DELIVERIES,
          'Courier account has active deliveries',
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    const deletedAt = new Date();

    return this.prisma.$transaction(async (tx) => {
      if (user.courier?.id && user.courier.deletedAt === null) {
        await tx.courier.update({
          where: { id: user.courier.id },
          data: { deletedAt, status: CourierStatus.INACTIVE },
        });
      }

      await tx.refreshToken.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: deletedAt },
      });

      await tx.user.update({
        where: { id },
        data: {
          deletedAt,
          status: UserStatus.INACTIVE,
        },
      });

      await this.audit.log(
        {
          actorId: actor?.sub,
          action: user.role.name === RoleType.CUSTOMER ? 'customers.delete' : 'users.delete',
          entityType: 'User',
          entityId: id,
          oldValues: {
            firstName: user.firstName,
            lastName: user.lastName,
            phone: user.phone,
            email: user.email,
            status: user.status,
            roleName: user.role.name,
          } as Prisma.InputJsonValue,
          newValues: {
            deletedAt: deletedAt.toISOString(),
            status: UserStatus.INACTIVE,
          } as Prisma.InputJsonValue,
        },
        tx,
      );

      return {
        deleted: true,
        id,
        deletedAt,
      };
    });
  }

  private async ensureUniqueContacts(id: string, dto: UpdateUserDto) {
    if (dto.phone === undefined && dto.email === undefined) {
      return;
    }

    const trimmedPhone = dto.phone?.trim();
    const trimmedEmail = dto.email?.trim();

    const duplicate = await this.prisma.user.findFirst({
      where: {
        id: { not: id },
        deletedAt: null,
        OR: [
          ...(trimmedPhone ? [{ phone: trimmedPhone }] : []),
          ...(trimmedEmail ? [{ email: trimmedEmail }] : []),
        ],
      },
    });

    if (duplicate) {
      throw new AppException(
        ERROR_CODES.USER_ALREADY_EXISTS,
        'Phone or email already in use',
        HttpStatus.CONFLICT,
      );
    }
  }

  private async findManagedUser(id: string, scope: MutationScope) {
    const user = await this.prisma.user.findFirst({
      where: {
        id,
        deletedAt: null,
        ...(scope === 'staff' ? { role: { name: { in: NON_CUSTOMER_ROLES } } } : {}),
        ...(scope === 'customer' ? { role: { name: RoleType.CUSTOMER } } : {}),
      },
      select: customerMutationSelect,
    });

    if (!user) {
      throw new AppException(ERROR_CODES.USER_NOT_FOUND, 'User not found', HttpStatus.NOT_FOUND);
    }

    return user;
  }
}
