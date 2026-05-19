import type { AppRole } from '../auth/types';
export function canAccessCourier(role:AppRole):boolean{return role==='COURIER'}
