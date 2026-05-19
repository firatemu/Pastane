import { redirect } from 'next/navigation';
import type { AdminSession } from './types';
import { can } from '../permissions/can';
export function requirePermission(session:AdminSession, required:string[]):void{ if(!can(session.permissions,required)) redirect('/access-denied'); }
