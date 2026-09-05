$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$backend = Join-Path $root 'backend'
$frontend = Join-Path $root 'frontend'
$python = Join-Path $backend 'venv\Scripts\python.exe'
$checkDb = Join-Path $backend 'scripts\check_db.py'
$fallbackApi = if ($env:RECOVERFLOW_FALLBACK_API_URL) { $env:RECOVERFLOW_FALLBACK_API_URL.TrimEnd('/') } else { 'https://recoverflow-api-ul43.onrender.com' }

function Stop-PortProcess($port) {
    $lines = netstat -ano | Select-String ":$port" | Select-String 'LISTENING'
    foreach ($line in $lines) {
        $parts = ($line.ToString() -replace '\s+', ' ').Trim().Split(' ')
        $processId = $parts[-1]
        if ($processId -and $processId -ne '0') {
            Write-Host "Stopping process $processId on port $port..."
            taskkill /PID $processId /F | Out-Null
        }
    }
}

function Wait-BackendReady($readyUrl, $label, $attempts = 30, $delaySeconds = 1) {
    for ($attempt = 1; $attempt -le $attempts; $attempt++) {
        try {
            $response = Invoke-RestMethod -Uri $readyUrl -TimeoutSec 5
            if ($response.status -eq 'ready') {
                Write-Host "$label is ready." -ForegroundColor Green
                return $true
            }
        } catch {
            if ($attempt -lt $attempts) {
                Start-Sleep -Seconds $delaySeconds
            }
        }
    }
    return $false
}

if (-not (Test-Path $python)) {
    throw 'Python venv missing. Run .\scripts\setup.ps1 first.'
}

if (-not (Test-Path (Join-Path $backend '.env'))) {
    throw 'backend/.env is missing. Add Supabase + Razorpay values first.'
}

if (-not (Test-Path (Join-Path $frontend 'node_modules'))) {
    throw 'Frontend dependencies are missing. Run .\scripts\setup.ps1 first.'
}

if (-not (Test-Path $checkDb)) {
    throw 'Database helper is missing. Run git pull and try again.'
}

$useLocalBackend = $false
$selectedDbPort = $null
$dbResolution = @(& $python $checkDb --resolve-port)
$dbResolutionExit = $LASTEXITCODE

if ($dbResolutionExit -eq 0 -and $dbResolution.Count -gt 0) {
    $portLine = ($dbResolution | Select-Object -Last 1).Trim()
    $parsedPort = 0
    if ([int]::TryParse($portLine, [ref]$parsedPort)) {
        $selectedDbPort = $parsedPort
        $useLocalBackend = $true
    }
}

Stop-PortProcess 3000

if ($useLocalBackend) {
    Stop-PortProcess 8000

    if ($selectedDbPort -ne 5432) {
        Write-Host "Local Supabase session pooler is unavailable; using transaction pooler port $selectedDbPort for this dev session." -ForegroundColor Yellow
    }

    Write-Host 'Starting RecoverFlow backend on http://127.0.0.1:8000 ...' -ForegroundColor Cyan
    $backendCommand = "Set-Location '$backend'; `$env:DB_PORT='$selectedDbPort'; `$env:DB_GSSENCMODE='disable'; & '$python' -m uvicorn app.main:app --host 127.0.0.1 --port 8000"
    Start-Process powershell -ArgumentList '-NoExit','-Command',$backendCommand

    if (-not (Wait-BackendReady 'http://127.0.0.1:8000/health/ready' 'Local backend + Supabase' 30 1)) {
        throw 'Local backend did not become ready. Check the backend terminal.'
    }

    $apiUrl = 'http://127.0.0.1:8000'
    $modeLabel = "FULL LOCAL STACK (DB port $selectedDbPort)"
} else {
    Write-Host 'Direct local PostgreSQL access is unavailable. Starting frontend against the deployed Render Test Mode backend instead.' -ForegroundColor Yellow
    Write-Host 'No local database credentials are changed, and production configuration is not modified.' -ForegroundColor Yellow

    if (-not (Wait-BackendReady "$fallbackApi/health/ready" 'Deployed Render backend + Supabase' 18 5)) {
        throw "Neither local Supabase connectivity nor deployed backend fallback is currently available. Check network access and Render status."
    }

    $apiUrl = $fallbackApi
    $modeLabel = 'LOCAL FRONTEND + DEPLOYED TEST MODE BACKEND'
}

Write-Host "Starting RecoverFlow frontend on http://localhost:3000 using API $apiUrl ..." -ForegroundColor Cyan
$frontendCommand = "Set-Location '$frontend'; `$env:NEXT_PUBLIC_API_URL='$apiUrl'; npm run dev"
Start-Process powershell -ArgumentList '-NoExit','-Command',$frontendCommand

Write-Host ''
Write-Host 'RecoverFlow dev environment started.' -ForegroundColor Green
Write-Host "Mode: $modeLabel" -ForegroundColor Green
Write-Host 'Keep the frontend terminal open while using localhost.'
if ($useLocalBackend) {
    Write-Host 'Keep the backend terminal open too.'
} else {
    Write-Host 'Fallback mode uses the deployed Razorpay Test Mode backend; test actions affect the shared Test Mode database.' -ForegroundColor Yellow
}
Write-Host ''
Write-Host 'Product:             http://localhost:3000'
Write-Host 'Merchant overview:   http://localhost:3000/dashboard'
Write-Host 'Recovery cases:      http://localhost:3000/cases'
Write-Host 'Recovery insights:   http://localhost:3000/analytics'
Write-Host 'Merchant safeguards: http://localhost:3000/settings/policy'
Write-Host 'Test sandbox:        http://localhost:3000/simulator'
Write-Host ''
Write-Host 'Technical validation:'
Write-Host 'Model validation:    http://localhost:3000/analytics/evaluation'
Write-Host 'Strategy benchmark:  http://localhost:3000/benchmark'
Write-Host 'Evaluation dataset:  http://localhost:3000/evaluation'
if ($useLocalBackend) {
    Write-Host 'Backend API:         http://127.0.0.1:8000'
    Write-Host 'Backend docs:        http://127.0.0.1:8000/docs'
    Write-Host 'Database health:     http://127.0.0.1:8000/health/db'
} else {
    Write-Host "Backend API:         $apiUrl"
    Write-Host "Backend docs:        $apiUrl/docs"
}
