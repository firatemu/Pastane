#!/bin/sh
set -e
cd /app/packages/database
npx prisma migrate deploy --schema=schema.prisma
cd /app
exec node apps/api/dist/main.js
