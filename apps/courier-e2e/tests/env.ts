export function courierCredential(): { phone: string; password: string } {
  return {
    phone: process.env.E2E_COURIER_PHONE ?? '905550000004',
    password: process.env.E2E_COURIER_PASSWORD ?? 'Courier123!',
  };
}
