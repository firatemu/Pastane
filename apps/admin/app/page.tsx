import { redirect } from 'next/navigation';
import { getAdminSession } from '../lib/auth/session';

export const dynamic = 'force-dynamic';

export default async function HomePage(): Promise<never> {
  const session = await getAdminSession();
  redirect(session ? '/dashboard' : '/login');
}
