import { redirect } from 'next/navigation';
import type { CourierSession } from './types';
import { canAccessCourier } from '../permissions/can';
export function requireCourierRole(session:CourierSession):void{if(!canAccessCourier(session.user.role.name))redirect('/access-denied')}
