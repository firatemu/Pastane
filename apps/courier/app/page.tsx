import { redirect } from 'next/navigation';
import { getCourierSession } from '../lib/auth/session';

export const dynamic = 'force-dynamic';

export default async function HomePage(): Promise<never> { const session=await getCourierSession(); redirect(session?'/deliveries':'/login'); }
