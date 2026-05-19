import { SettingsService } from './settings.service';

describe('SettingsService', () => {
  it('upserts settings and writes audit log', async () => {
    const prisma = { setting: { findUnique: jest.fn().mockResolvedValue(null), upsert: jest.fn().mockResolvedValue({ id: 's-1', key: 'paymentActive', value: true }) } };
    const audit = { log: jest.fn() };
    const service = new SettingsService(prisma as never, audit as never);
    await service.upsert('paymentActive', true);
    expect(prisma.setting.upsert).toHaveBeenCalledWith(expect.objectContaining({ where: { key: 'paymentActive' } }));
    expect(audit.log).toHaveBeenCalled();
  });
});
