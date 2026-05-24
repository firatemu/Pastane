-- Staging-only: mask PII / secrets after prod dump restore.
BEGIN;

TRUNCATE TABLE "refresh_tokens";
TRUNCATE TABLE "otp_codes";

UPDATE "users"
SET "email" = CASE
  WHEN "email" IS NOT NULL THEN 'staging+' || "id" || '@example.test'
  ELSE NULL
END;

WITH ranked AS (
  SELECT
    u2."id",
    r."name" AS role_name,
    ROW_NUMBER() OVER (PARTITION BY r."name" ORDER BY u2."createdAt") AS rn
  FROM "users" u2
  JOIN "roles" r ON r."id" = u2."roleId"
)
UPDATE "users" u
SET "phone" = CASE
  WHEN v.role_name = 'ADMIN' AND v.rn = 1 THEN '905559000001'
  WHEN v.role_name = 'ORDER_OPERATOR' AND v.rn = 1 THEN '905559000002'
  WHEN v.role_name = 'PRODUCT_MANAGER' AND v.rn = 1 THEN '905559000003'
  WHEN v.role_name = 'COURIER' AND v.rn = 1 THEN '905559000004'
  WHEN v.role_name = 'COURIER' AND v.rn = 2 THEN '905559000005'
  WHEN v.role_name = 'CUSTOMER' AND v.rn = 1 THEN '905559000010'
  ELSE '905559' || lpad((900000 + (abs(hashtext(u."id")) % 99999))::text, 6, '0')
END
FROM ranked v
WHERE u."id" = v."id";

UPDATE "payments"
SET
  "providerPaymentId" = NULL,
  "conversationId" = NULL,
  "providerToken" = NULL,
  "responsePayload" = NULL,
  "callbackPayloadHash" = NULL,
  "idempotencyKey" = 'staging-' || "id";

UPDATE "notifications" SET "metadata" = NULL WHERE "metadata" IS NOT NULL;
UPDATE "audit_logs" SET "oldValues" = NULL, "newValues" = NULL;

COMMIT;
