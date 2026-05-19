#!/usr/bin/env bash
set -euo pipefail
source ~/.nvm/nvm.sh
nvm use 22 >/dev/null
login=$(curl -s -X POST http://localhost:3003/api/v1/auth/login -H 'Content-Type: application/json' -d '{"phone":"905550000003","password":"Product123!"}')
token=$(node -e 'const x=JSON.parse(process.argv[1]); process.stdout.write(x.data.accessToken)' "$login")
products=$(curl -s 'http://localhost:3003/api/v1/products?page=1&limit=2')
productId=$(node -e 'const x=JSON.parse(process.argv[1]); process.stdout.write(x.data[0].id)' "$products")
printf '\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR' >/tmp/tiny.png
upload=$(curl -s -X POST http://localhost:3003/api/v1/media/upload -H "Authorization: Bearer $token" -F 'file=@/tmp/tiny.png;type=image/png' -F "productId=$productId" -F 'isPrimary=true' -F 'sortOrder=1')
mediaId=$(node -e 'const x=JSON.parse(process.argv[1]); process.stdout.write(x.data.id)' "$upload")
first=$(curl -s -o /tmp/first.json -w '%{http_code}' -X POST http://localhost:3003/api/v1/stock -H "Authorization: Bearer $token" -H 'Content-Type: application/json' -d "{\"productId\":\"$productId\",\"date\":\"2026-05-20\",\"quantity\":10,\"availableFrom\":\"08:00\",\"availableTo\":\"12:00\"}")
overlap=$(curl -s -o /tmp/overlap.json -w '%{http_code}' -X POST http://localhost:3003/api/v1/stock -H "Authorization: Bearer $token" -H 'Content-Type: application/json' -d "{\"productId\":\"$productId\",\"date\":\"2026-05-20\",\"quantity\":5,\"availableFrom\":\"11:00\",\"availableTo\":\"13:00\"}")
deleted=$(curl -s -X DELETE http://localhost:3003/api/v1/media/$mediaId -H "Authorization: Bearer $token")
health=$(curl -s http://localhost:3003/api/v1/health)
node -e 'const h=JSON.parse(process.argv[1]),p=JSON.parse(process.argv[2]),u=JSON.parse(process.argv[3]),d=JSON.parse(process.argv[4]); console.log(JSON.stringify({health:h.data.status,productCount:p.data.length,productMetaLimit:p.meta.limit,uploadMime:u.data.mimeType,uploadPrimary:u.data.isPrimary,objectKey:u.data.objectKey,firstStockStatus:process.argv[5],overlapStatus:process.argv[6],deletedAtSet:!!d.data.deletedAt}))' "$health" "$products" "$upload" "$deleted" "$first" "$overlap"