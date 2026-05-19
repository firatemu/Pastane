import { Inject, Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import type { AuthUser } from '../common/types/auth-user.type';
import { PrismaService } from '../database/prisma.service';

const DEFAULTS: Record<string, Prisma.InputJsonValue> = {
  otpActive: false,
  deliveryActive: true,
  pickupActive: true,
  loyaltyActive: true,
  paymentActive: true,
  minimumOrderValue: 0,
};

@Injectable()
export class SettingsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService, @Inject(AuditService) private readonly audit: AuditService) {}

  async list() {
    await this.ensureDefaults();
    return this.prisma.setting.findMany({ orderBy: { key: 'asc' } });
  }

  async system() {
    await this.ensureDefaults();
    const rows = await this.prisma.setting.findMany({ where: { key: { in: Object.keys(DEFAULTS) } } });
    return Object.fromEntries(rows.map((row) => [row.key, row.value]));
  }

  async isEnabled(key: keyof typeof DEFAULTS): Promise<boolean> {
    const setting = await this.prisma.setting.findUnique({ where: { key } });
    return Boolean(setting?.value ?? DEFAULTS[key]);
  }

  async upsert(key: string, value: Prisma.InputJsonValue, actor?: AuthUser) {
    const old = await this.prisma.setting.findUnique({ where: { key } });
    const setting = await this.prisma.setting.upsert({ where: { key }, update: { value }, create: { key, value } });
    await this.audit.log({ actorId: actor?.sub, action: old ? 'settings.update' : 'settings.create', entityType: 'Setting', entityId: setting.id, oldValues: old?.value as Prisma.InputJsonValue | undefined, newValues: value });
    return setting;
  }

  async updateSystem(values: Record<string, unknown>, actor?: AuthUser) {
    const allowed = Object.keys(DEFAULTS);
    const entries = Object.entries(values).filter(([key, value]) => allowed.includes(key) && value !== undefined);
    const updated = [];
    for (const [key, value] of entries) updated.push(await this.upsert(key, value as Prisma.InputJsonValue, actor));
    return updated;
  }

  async ensureDefaults() {
    for (const [key, value] of Object.entries(DEFAULTS)) await this.prisma.setting.upsert({ where: { key }, update: {}, create: { key, value } });
  }
}
