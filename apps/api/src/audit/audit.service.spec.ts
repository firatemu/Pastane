import { AuditService } from './audit.service';

describe('AuditService', () => {
  it('persists audit records', async () => {
    const create = jest.fn().mockResolvedValue({ id: 'audit-1' });
    const service = new AuditService({ auditLog: { create } } as never);
    await service.log({ action: 'x', entityType: 'Thing', entityId: '1' });
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: 'x', entityType: 'Thing', entityId: '1' }) }));
  });
});
