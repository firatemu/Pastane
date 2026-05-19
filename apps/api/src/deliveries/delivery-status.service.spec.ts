import { DeliveryStatus } from '@prisma/client';
import { DeliveryStatusService } from './delivery-status.service';
describe('DeliveryStatusService',()=>{const service=new DeliveryStatusService(); it('allows assigned deliveries to be picked up',()=>{expect(()=>service.assert(DeliveryStatus.ASSIGNED,DeliveryStatus.PICKED_UP)).not.toThrow()}); it('rejects delivered deliveries from changing again',()=>{expect(()=>service.assert(DeliveryStatus.DELIVERED,DeliveryStatus.FAILED)).toThrow('Invalid delivery status transition')})});
