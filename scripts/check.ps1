$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$backend = Join-Path $root 'backend'
$frontend = Join-Path $root 'frontend'
$python = Join-Path $backend 'venv\Scripts\python.exe'
$checkApp = Join-Path $backend 'scripts\check_app.py'
$checkDb = Join-Path $backend 'scripts\check_db.py'
$fallbackApi = if ($env:RECOVERFLOW_FALLBACK_API_URL) { $env:RECOVERFLOW_FALLBACK_API_URL.TrimEnd('/') } else { 'https://recoverflow-api-ul43.onrender.com' }

function Pass($message) {
    Write-Host "[PASS] $message" -ForegroundColor Green
}

function Step($message) {
    Write-Host "`n== $message ==" -ForegroundColor Cyan
}

function Warn($message) {
    Write-Host "[WARN] $message" -ForegroundColor Yellow
}

Write-Host 'RecoverFlow diagnostic check' -ForegroundColor Cyan
Write-Host "Repo: $root"

Step 'Prerequisites'
if (-not (Test-Path $python)) {
    throw 'Python venv missing. Run .\scripts\setup.ps1 first.'
}
Pass 'Python venv found'

if (-not (Test-Path (Join-Path $backend '.env'))) {
    throw 'backend/.env is missing.'
}
Pass 'backend/.env found'

if (-not (Test-Path (Join-Path $frontend 'node_modules'))) {
    throw 'frontend/node_modules is missing. Run .\scripts\setup.ps1 first.'
}
Pass 'Frontend dependencies found'

if (-not (Test-Path $checkApp) -or -not (Test-Path $checkDb)) {
    throw 'Diagnostic helper scripts are missing. Run git pull and try again.'
}
Pass 'Diagnostic helper scripts found'

Step 'Repository test hygiene'
$strayTests = @(git -C $root ls-files --others --exclude-standard -- 'backend/tests/test_*.py')
if ($LASTEXITCODE -ne 0) {
    throw 'Could not inspect Git status for local-only tests.'
}
if ($strayTests.Count -gt 0) {
    Write-Host '[ERROR] Local-only pytest files were found. These are not part of the GitHub test suite:' -ForegroundColor Red
    foreach ($file in $strayTests) {
        Write-Host "  - $file" -ForegroundColor Yellow
    }
    throw 'Local-only pytest files would make local checks differ from CI.'
}
Pass 'No unexpected local-only pytest files'

$localDbAvailable = $false
$selectedDbPort = $null
$productionReady = $false

Push-Location $backend
try {
    Step 'Backend syntax + imports'
    & $python -m compileall -q app scripts
    if ($LASTEXITCODE -ne 0) { throw 'Backend Python compilation failed.' }
    Pass 'Backend Python files compile'

    & $python $checkApp
    if ($LASTEXITCODE -ne 0) { throw 'FastAPI import failed.' }
    Pass 'FastAPI application imports'

    Step 'Backend unit tests'
    & $python -m pytest
    if ($LASTEXITCODE -ne 0) { throw 'Backend pytest suite failed.' }
    Pass 'Backend unit tests pass'

    Step 'Supabase database'
    $dbOutput = @(& $python $checkDb)
    $dbExitCode = $LASTEXITCODE
    $dbOutput | ForEach-Object { Write-Host $_ }

    if ($dbExitCode -eq 0) {
        $selectedLine = $dbOutput | Where-Object { $_ -match '^DB_PORT_SELECTED=(\d+)$' } | Select-Object -Last 1
        if ($selectedLine -and $selectedLine -match '^DB_PORT_SELECTED=(\d+)$') {
            $selectedDbPort = [int]$Matches[1]
        }
        $localDbAvailable = $true
        Pass 'Local Supabase PostgreSQL connection works'
    } else {
        Warn 'Local Supabase PostgreSQL is not reachable from this Windows/network session.'
        Write-Host '[INFO] Continuing with code/build validation and checking the deployed Test Mode backend fallback.' -ForegroundColor Yellow

        try {
            $ready = Invoke-RestMethod -Uri "$fallbackApi/health/ready" -TimeoutSec 90
            if ($ready.status -eq 'ready' -and $ready.database -eq 'connected') {
                $productionReady = $true
                Pass 'Deployed Render backend + Supabase are ready'
                Write-Host '[INFO] dev.ps1 will automatically use the deployed Test Mode API for the local frontend if direct local DB access remains unavailable.' -ForegroundColor Yellow
            }
        } catch {
            Warn "Could not verify deployed backend fallback at $fallbackApi during this check."
        }
    }
}
finally {
    Pop-Location
}

Step 'Frontend lint + production build'
Push-Location $frontend
try {
    npm run lint
    if ($LASTEXITCODE -ne 0) { throw 'Frontend ESLint failed.' }
    Pass 'Frontend ESLint passes'

    $previousApiUrl = $env:NEXT_PUBLIC_API_URL
    try {
        $env:NEXT_PUBLIC_API_URL = 'http://127.0.0.1:8000'
        npm run build
        $buildExit = $LASTEXITCODE
    }
    finally {
        if ($null -eq $previousApiUrl) {
            Remove-Item Env:NEXT_PUBLIC_API_URL -ErrorAction SilentlyContinue
        } else {
            $env:NEXT_PUBLIC_API_URL = $previousApiUrl
        }
    }

    if ($buildExit -ne 0) { throw 'Next.js production build failed.' }
    Pass 'Next.js production build succeeds'
}
finally {
    Pop-Location
}

Step 'Optional running-service checks'
try {
    $ready = Invoke-RestMethod -Uri 'http://127.0.0.1:8000/health/ready' -TimeoutSec 3
    if ($ready.status -eq 'ready') { Pass 'Running local backend is ready' }
} catch {
    Write-Host '[INFO] Local backend is not currently running.' -ForegroundColor Yellow
}

try {
    $frontendResponse = Invoke-WebRequest -Uri 'http://localhost:3000' -UseBasicParsing -TimeoutSec 3
    if ($frontendResponse.StatusCode -eq 200) { Pass 'Running frontend responds on port 3000' }
} catch {
    Write-Host '[INFO] Frontend is not currently running; production build already passed.' -ForegroundColor Yellow
}

Write-Host ''
Write-Host 'RecoverFlow checks completed.' -ForegroundColor Green
if ($localDbAvailable) {
    Write-Host "Local database mode: available on port $selectedDbPort" -ForegroundColor Green
    Write-Host 'Start full local stack: .\scripts\dev.ps1' -ForegroundColor Green
} elseif ($productionReady) {
    Write-Host 'Local database mode: unavailable on this network' -ForegroundColor Yellow
    Write-Host 'Fallback mode: READY (local frontend + deployed Render Test Mode backend)' -ForegroundColor Green
    Write-Host 'Start with: .\scripts\dev.ps1' -ForegroundColor Green
} else {
    Warn 'Local DB and deployed fallback could not both be verified, but code/tests/lint/build passed.'
    Write-Host 'You can retry .\scripts\dev.ps1; it performs its own backend selection and Render wake-up.' -ForegroundColor Yellow
}

Write-Host ''
Write-Host 'Product: http://localhost:3000'
Write-Host 'Merchant overview: http://localhost:3000/dashboard'
Write-Host 'Recovery cases: http://localhost:3000/cases'
Write-Host 'Recovery insights: http://localhost:3000/analytics'
Write-Host 'Merchant safeguards: http://localhost:3000/settings/policy'
Write-Host 'API docs (local backend only): http://127.0.0.1:8000/docs'
