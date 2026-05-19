import { NotificationType } from '@prisma/client';
import { NotificationsService } from './notifications.service';

describe('NotificationsService', () => {
  it('creates and queues notifications', async () => {
    const prisma = { notification: { create: jest.fn().mockResolvedValue({ id: 'n-1', type: NotificationType.IN_APP }) } } as never;
    const queues = { enqueueNotification: jest.fn() };
    const service = new NotificationsService(prisma, queues as never, { log: jest.fn() } as never, {} as never, {} as never, {} as never);
    await service.enqueue({ userId: 'user-1', type: NotificationType.IN_APP, title: 'T', body: 'B' });
    expect(queues.enqueueNotification).toHaveBeenCalledWith('n-1');
  });
});
