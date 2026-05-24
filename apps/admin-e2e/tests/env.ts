export function adminCredential(): { phone: string; password: string } {
  return {
    phone: process.env.E2E_ADMIN_PHONE ?? '905550000001',
    password: process.env.E2E_ADMIN_PASSWORD ?? 'Admin123!',
  };
}
