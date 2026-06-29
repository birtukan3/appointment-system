# full-test.ps1 - Complete System Test

Write-Host @"
╔══════════════════════════════════════════════════════════════╗
║     🧪 SMART OFFICE - COMPLETE SYSTEM TEST                  ║
╚══════════════════════════════════════════════════════════════╝
"@ -ForegroundColor Cyan

$API_URL = "http://localhost:3002/api"
$TEST_USER = @{
    name = "Test User"
    email = "testuser$(Get-Date -Format 'yyyyMMddHHmmss')@example.com"
    password = "Test1234"
    company = "Test Company"
}

# ============================================
# 1. HEALTH CHECK
# ============================================
Write-Host "`n📡 1. Testing Server Health..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "$API_URL/health" -TimeoutSec 5
    Write-Host "✅ Server is healthy!" -ForegroundColor Green
    Write-Host "   Status: $($health.status)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Server not responding!" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# ============================================
# 2. REGISTER USER
# ============================================
Write-Host "`n📝 2. Testing User Registration..." -ForegroundColor Yellow
$registerBody = $TEST_USER | ConvertTo-Json

try {
    $register = Invoke-RestMethod -Uri "$API_URL/auth/register" `
        -Method Post `
        -Body $registerBody `
        -ContentType "application/json"
    
    Write-Host "✅ Registration successful!" -ForegroundColor Green
    Write-Host "   User ID: $($register.data.id)" -ForegroundColor Gray
    Write-Host "   Email: $($register.data.email)" -ForegroundColor Gray
    Write-Host "   Name: $($register.data.name)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Registration failed!" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# ============================================
# 3. LOGIN
# ============================================
Write-Host "`n🔑 3. Testing Login..." -ForegroundColor Yellow
$loginBody = @{
    email = $TEST_USER.email
    password = $TEST_USER.password
} | ConvertTo-Json

try {
    $login = Invoke-RestMethod -Uri "$API_URL/auth/login" `
        -Method Post `
        -Body $loginBody `
        -ContentType "application/json"
    
    Write-Host "✅ Login successful!" -ForegroundColor Green
    Write-Host "   User: $($login.user.name)" -ForegroundColor Gray
    Write-Host "   Role: $($login.user.role)" -ForegroundColor Gray
    
    $TOKEN = $login.access_token
    Write-Host "   Token: $($TOKEN.Substring(0, 30))..." -ForegroundColor Gray
} catch {
    Write-Host "❌ Login failed!" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# ============================================
# 4. GET PROFILE
# ============================================
Write-Host "`n👤 4. Testing Protected Route (Profile)..." -ForegroundColor Yellow
try {
    $profile = Invoke-RestMethod -Uri "$API_URL/users/profile" `
        -Headers @{ Authorization = "Bearer $TOKEN" }
    
    Write-Host "✅ Profile retrieved!" -ForegroundColor Green
    Write-Host "   Name: $($profile.name)" -ForegroundColor Gray
    Write-Host "   Email: $($profile.email)" -ForegroundColor Gray
    Write-Host "   Role: $($profile.role)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Profile retrieval failed!" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# ============================================
# 5. GET STAFF LIST (using seeded data)
# ============================================
Write-Host "`n👨‍⚕️ 5. Testing Staff List..." -ForegroundColor Yellow
try {
    $staff = Invoke-RestMethod -Uri "$API_URL/users/staff" `
        -Headers @{ Authorization = "Bearer $TOKEN" }
    
    if ($staff.Count -gt 0 -or ($staff.data -and $staff.data.Count -gt 0)) {
        $staffData = if ($staff.data) { $staff.data } else { $staff }
        Write-Host "✅ Staff list retrieved!" -ForegroundColor Green
        Write-Host "   Total staff: $($staffData.Count)" -ForegroundColor Gray
        foreach ($s in $staffData | Select-Object -First 3) {
            Write-Host "   - $($s.name) ($($s.department))" -ForegroundColor Gray
        }
    } else {
        Write-Host "⚠️ No staff members found - run seed first" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Staff list retrieval failed!" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
}

# ============================================
# 6. CREATE APPOINTMENT
# ============================================
Write-Host "`n📅 6. Testing Appointment Creation..." -ForegroundColor Yellow

$tomorrow = (Get-Date).AddDays(1).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")

# Try to get a real staff member
try {
    $staffResponse = Invoke-RestMethod -Uri "$API_URL/users/staff" `
        -Headers @{ Authorization = "Bearer $TOKEN" }
    $staffData = if ($staffResponse.data) { $staffResponse.data } else { $staffResponse }
    $providerName = if ($staffData.Count -gt 0) { $staffData[0].name } else { "Dr. Test" }
} catch {
    $providerName = "Dr. Test"
}

$appointmentBody = @{
    serviceName = "Test Consultation"
    providerName = $providerName
    datetime = $tomorrow
    duration = 60
    notes = "Test appointment from API"
} | ConvertTo-Json

try {
    $appointment = Invoke-RestMethod -Uri "$API_URL/appointments" `
        -Method Post `
        -Body $appointmentBody `
        -ContentType "application/json" `
        -Headers @{ Authorization = "Bearer $TOKEN" }
    
    Write-Host "✅ Appointment created!" -ForegroundColor Green
    Write-Host "   ID: $($appointment.data.id)" -ForegroundColor Gray
    Write-Host "   Service: $($appointment.data.serviceName)" -ForegroundColor Gray
    Write-Host "   Status: $($appointment.data.status)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Appointment creation failed!" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
}

# ============================================
# 7. GET MY APPOINTMENTS
# ============================================
Write-Host "`n📋 7. Testing My Appointments..." -ForegroundColor Yellow
try {
    $myApps = Invoke-RestMethod -Uri "$API_URL/appointments/my" `
        -Headers @{ Authorization = "Bearer $TOKEN" }
    
    $apps = if ($myApps.data) { $myApps.data } else { $myApps }
    Write-Host "✅ Appointments retrieved!" -ForegroundColor Green
    Write-Host "   Total: $($apps.Count)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Appointments retrieval failed!" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
}

# ============================================
# 8. GET STATS
# ============================================
Write-Host "`n📊 8. Testing Appointment Stats..." -ForegroundColor Yellow
try {
    $stats = Invoke-RestMethod -Uri "$API_URL/appointments/stats" `
        -Headers @{ Authorization = "Bearer $TOKEN" }
    
    Write-Host "✅ Stats retrieved!" -ForegroundColor Green
    Write-Host "   Total: $($stats.total)" -ForegroundColor Gray
    Write-Host "   Pending: $($stats.pending)" -ForegroundColor Gray
    Write-Host "   Approved: $($stats.approved)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Stats retrieval failed!" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
}

# ============================================
# 9. GET BOOKING LIMITS
# ============================================
Write-Host "`n📈 9. Testing Booking Limits..." -ForegroundColor Yellow
try {
    $limits = Invoke-RestMethod -Uri "$API_URL/appointments/my-limits" `
        -Headers @{ Authorization = "Bearer $TOKEN" }
    
    Write-Host "✅ Limits retrieved!" -ForegroundColor Green
    Write-Host "   Daily Limit: $($limits.limits.daily)" -ForegroundColor Gray
    Write-Host "   Remaining Today: $($limits.remaining.daily)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Limits retrieval failed!" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
}

# ============================================
# 10. USER STATS
# ============================================
Write-Host "`n📊 10. Testing User Stats..." -ForegroundColor Yellow
try {
    $userStats = Invoke-RestMethod -Uri "$API_URL/appointments/user-stats" `
        -Headers @{ Authorization = "Bearer $TOKEN" }
    
    Write-Host "✅ User stats retrieved!" -ForegroundColor Green
    Write-Host "   Today's Count: $($userStats.todayCount)" -ForegroundColor Gray
    Write-Host "   Daily Limit: $($userStats.dailyLimit)" -ForegroundColor Gray
} catch {
    Write-Host "❌ User stats retrieval failed!" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
}

# ============================================
# 11. LOGOUT
# ============================================
Write-Host "`n🚪 11. Testing Logout..." -ForegroundColor Yellow
try {
    $logout = Invoke-RestMethod -Uri "$API_URL/auth/logout" `
        -Method Post `
        -Headers @{ Authorization = "Bearer $TOKEN" }
    
    Write-Host "✅ Logout successful!" -ForegroundColor Green
} catch {
    Write-Host "❌ Logout failed!" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
}

# ============================================
# SUMMARY
# ============================================
Write-Host @"

╔══════════════════════════════════════════════════════════════╗
║     ✅ TEST COMPLETE!                                       ║
╚══════════════════════════════════════════════════════════════╝

🔑 Credentials Used:
   Email: $($TEST_USER.email)
   Password: $($TEST_USER.password)

🌐 API Base URL: $API_URL

💡 Next Steps:
   1. Test the frontend at http://localhost:3000
   2. Login with your new credentials
   3. Explore admin features at /admin

"@ -ForegroundColor Cyan