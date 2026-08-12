$services = @(
    "identity-service",
    "provider-service",
    "customer-service",
    "property-service",
    "catalog-service",
    "contract-service",
    "signature-service",
    "billing-service",
    "notification-service",
    "audit-service"
)

Write-Host "Syncing DB Schema to Neon..." -ForegroundColor Cyan

foreach ($svc in $services) {
    Write-Host "-> Pushing schema for $svc..." -ForegroundColor Yellow
    npx prisma db push --schema="apps/$svc/prisma/schema.prisma" --accept-data-loss
}

Write-Host "Success: All 10 schemas pushed to DB!" -ForegroundColor Green
