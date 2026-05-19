$ErrorActionPreference = 'Stop'
$base = 'http://localhost:3003/api/v1'
$pm = Invoke-RestMethod -Method Post -Uri "$base/auth/login" -ContentType 'application/json' -Body '{"phone":"905550000003","password":"Product123!"}'
$customer = Invoke-RestMethod -Method Post -Uri "$base/auth/login" -ContentType 'application/json' -Body '{"phone":"905550000010","password":"Customer123!"}'
$pmHeaders = @{ Authorization = "Bearer $($pm.data.accessToken)" }
$customerHeaders = @{ Authorization = "Bearer $($customer.data.accessToken)" }
$products = Invoke-RestMethod -Uri "$base/products?page=1&limit=10"
$template = $products.data | Select-Object -First 1
$slugSuffix = [guid]::NewGuid().ToString('N').Substring(0, 8)
$product = Invoke-RestMethod -Method Post -Uri "$base/products" -Headers $pmHeaders -ContentType 'application/json' -Body (ConvertTo-Json @{ name = "Phase3 Smoke $slugSuffix"; price = 10; categoryId = $template.categoryId; status = 'ACTIVE' })
$today = [System.TimeZoneInfo]::ConvertTimeBySystemTimeZoneId([DateTime]::UtcNow, 'Turkey Standard Time').ToString('yyyy-MM-dd')
Invoke-RestMethod -Method Post -Uri "$base/stock" -Headers $pmHeaders -ContentType 'application/json' -Body (ConvertTo-Json @{ productId = $product.data.id; date = $today; quantity = 1 }) | Out-Null
$stores = Invoke-RestMethod -Uri "$base/stores"
$store = $stores.data | Where-Object { $_.id -match '-4000-8000-' } | Select-Object -First 1
Invoke-RestMethod -Method Delete -Uri "$base/cart" -Headers $customerHeaders | Out-Null
Invoke-RestMethod -Method Post -Uri "$base/cart/items" -Headers $customerHeaders -ContentType 'application/json' -Body (ConvertTo-Json @{ productId = $product.data.id; quantity = 1 }) | Out-Null
$order = Invoke-RestMethod -Method Post -Uri "$base/orders" -Headers $customerHeaders -ContentType 'application/json' -Body (ConvertTo-Json @{ deliveryType = 'PICKUP'; pickupStoreId = $store.id })
Invoke-RestMethod -Method Post -Uri "$base/cart/items" -Headers $customerHeaders -ContentType 'application/json' -Body (ConvertTo-Json @{ productId = $product.data.id; quantity = 1 }) | Out-Null
try {
  Invoke-RestMethod -Method Post -Uri "$base/orders" -Headers $customerHeaders -ContentType 'application/json' -Body (ConvertTo-Json @{ deliveryType = 'PICKUP'; pickupStoreId = $store.id }) | Out-Null
  throw 'Expected second order attempt to fail on limited stock.'
} catch {
  if ($_.Exception.Response.StatusCode.value__ -ne 400) { throw }
}
$payment = Invoke-RestMethod -Method Post -Uri "$base/payments/initiate" -Headers ($customerHeaders + @{ 'idempotency-key' = "phase3-smoke-$([guid]::NewGuid())" }) -ContentType 'application/json' -Body (ConvertTo-Json @{ orderId = $order.data.id; cardHolderName = 'Demo'; cardNumber = '4111111111111111'; expireMonth = '12'; expireYear = '2030'; cvc = '123' })
$body = ConvertTo-Json @{ conversationId = $payment.data.conversationId; providerPaymentId = $payment.data.providerPaymentId; status = 'SUCCESS' }
$j1 = Start-Job -ScriptBlock { param($uri, $payload) Invoke-RestMethod -Method Post -Uri $uri -ContentType 'application/json' -Body $payload } -ArgumentList "$base/payments/callback", $body
$j2 = Start-Job -ScriptBlock { param($uri, $payload) Invoke-RestMethod -Method Post -Uri $uri -ContentType 'application/json' -Body $payload } -ArgumentList "$base/payments/callback", $body
Wait-Job $j1, $j2 | Out-Null
$r1 = Receive-Job $j1
$r2 = Receive-Job $j2
Remove-Job $j1, $j2
$stockAfter = Invoke-RestMethod -Uri "$base/stock/product/$($product.data.id)" -Headers $pmHeaders
$remaining = ($stockAfter.data | Select-Object -First 1).quantity
if ($remaining -ne 0) { throw "Expected duplicate callbacks to deduct stock once; remaining stock was $remaining." }
[pscustomobject]@{
  firstOrderStatus = $order.data.status
  duplicateCallbackStatuses = @($r1.data.status, $r2.data.status)
  secondOrderRejected = $true
  remainingStock = $remaining
} | ConvertTo-Json -Compress
