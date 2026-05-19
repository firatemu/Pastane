import { LoyaltyService } from './loyalty.service';

describe('LoyaltyService', () => {
  it('redeems points transactionally and records movement/audit', async () => {
    const tx = {
      loyaltyAccount: { findUnique: jest.fn().mockResolvedValue({ id: 'loy-1', points: 10 }), update: jest.fn().mockResolvedValue({ id: 'loy-1', points: 7 }) },
      loyaltyMovement: { create: jest.fn().mockResolvedValue({ id: 'mov-1' }) },
      auditLog: { create: jest.fn() },
    };
    const prisma = { $transaction: jest.fn((fn) => fn(tx)) } as never;
    const service = new LoyaltyService(prisma, { log: jest.fn((_input, client) => client.auditLog.create({ data: {} })) } as never);
    await service.redeem({ userId: 'user-1', points: 3 });
    expect(tx.loyaltyAccount.update).toHaveBeenCalledWith({ where: { id: 'loy-1' }, data: { points: { decrement: 3 } } });
    expect(tx.loyaltyMovement.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ points: -3, balanceAfter: 7 }) }));
  });
});
