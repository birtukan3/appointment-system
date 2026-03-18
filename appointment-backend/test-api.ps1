Write-Host "🧪 Testing Appointment System API" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan

# 1. Register
Write-Host "`n📝 1. Registering user..." -ForegroundColor Yellow
$registerBody = @{
    name     = "Test User"
    email    = "test@example.com"
    password = "password123"
} | ConvertTo-Json

try {
    $register = Invoke-RestMethod -Uri "http://localhost:9999/auth/register" `
        -Method POST `
        -Body $registerBody `
        -ContentType "application/json"
    Write-Host "✅ Registration successful!" -ForegroundColor Green
    $register
}
catch {
    Write-Host "⚠️ User might already exist" -ForegroundColor Yellow
}

# 2. Login
Write-Host "`n🔑 2. Logging in..." -ForegroundColor Yellow
$loginBody = @{
    email    = "test@example.com"
    password = "password123"
} | ConvertTo-Json

$loginResponse = Invoke-RestMethod -Uri "http://localhost:9999/auth/login" `
    -Method POST `
    -Body $loginBody `
    -ContentType "application/json"

Write-Host "✅ Login successful!" -ForegroundColor Green
$loginResponse

$token = $loginResponse.access_token
$headers = @{ "Authorization" = "Bearer $token" }

# 3. Get Profile
Write-Host "`n👤 3. Getting profile..." -ForegroundColor Yellow
$profile = Invoke-RestMethod -Uri "http://localhost:9999/users/profile" `
    -Method GET `
    -Headers $headers
Write-Host "✅ Profile:" -ForegroundColor Green
$profile

# 4. Create Appointment
Write-Host "`n📅 4. Creating appointment..." -ForegroundColor Yellow
$appointmentBody = @{
    serviceName  = "Consultation"
    providerName = "Dr. Smith"
    datetime     = "2026-03-15T10:30"
    priority     = "Normal"
    forSelf      = $true
} | ConvertTo-Json

$appointment = Invoke-RestMethod -Uri "http://localhost:9999/appointments" `
    -Method POST `
    -Headers $headers `
    -Body $appointmentBody `
    -ContentType "application/json"
Write-Host "✅ Appointment created:" -ForegroundColor Green
$appointment

# 5. Get My Appointments
Write-Host "`n📋 5. Getting my appointments..." -ForegroundColor Yellow
$myApps = Invoke-RestMethod -Uri "http://localhost:9999/appointments/my" `
    -Method GET `
    -Headers $headers
Write-Host "✅ My appointments:" -ForegroundColor Green
$myApps

Write-Host "`n🎉 All tests completed successfully!" -ForegroundColor Green
