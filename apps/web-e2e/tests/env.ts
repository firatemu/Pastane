/** Defaults match packages/database prisma seed data. */

export function customerCredential(): { phone: string; password: string } {
  return {
    phone: process.env.E2E_CUSTOMER_PHONE ?? '905550000010',
    password: process.env.E2E_CUSTOMER_PASSWORD ?? 'Customer123!',
  };
}
