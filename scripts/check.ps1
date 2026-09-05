$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$backend = Join-Path $root 'backend'
$frontend = Join-Path $root 'frontend'
$python = Join-Path $backend 'venv\Scripts\python.exe'
$checkApp = Join-Path $backend 'scripts\check_app.py'
$checkDb = Join-Path $backend 'scripts\check_db.py'

function Pass($message) {
    Write-Host "[PASS] $message" -ForegroundColor Green
}

function Step($message) {
    Write-Host "`n== $message ==" -ForegroundColor Cyan
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
    Write-Host ''
    Write-Host 'Move or delete stale local tests before running diagnostics.' -ForegroundColor Yellow
    throw 'Local-only pytest files would make local checks differ from CI.'
}
Pass 'No unexpected local-only pytest files'

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
    $targetOutput = @(& $python $checkDb --target)
    if ($LASTEXITCODE -ne 0 -or $targetOutput.Count -lt 2) {
        throw 'Could not read database target from backend configuration.'
    }

    $dbHost = $targetOutput[0].Trim()
    $dbPort = [int]$targetOutput[1].Trim()
    $dbConnected = $false
    $dbOutput = @()

    for ($attempt = 1; $attempt -le 3; $attempt++) {
        $dbOutput = @(& $python $checkDb)
        $dbExitCode = $LASTEXITCODE

        if ($dbExitCode -eq 0) {
            $dbConnected = $true
            $dbOutput | ForEach-Object { Write-Host $_ }
            if ($attempt -gt 1) {
                Write-Host "[INFO] Supabase connected on retry $attempt/3." -ForegroundColor Yellow
            }
            break
        }

        if ($attempt -lt 3) {
            Write-Host "[INFO] Database connection attempt $attempt/3 failed; retrying in 4 seconds..." -ForegroundColor Yellow
            Start-Sleep -Seconds 4
        }
    }

    if (-not $dbConnected) {
        Write-Host "[ERROR] PostgreSQL connection failed after 3 attempts." -ForegroundColor Red
        Write-Host "Target: ${dbHost}:${dbPort}" -ForegroundColor Yellow

        try {
            $tcpOk = Test-NetConnection -ComputerName $dbHost -Port $dbPort -InformationLevel Quiet -WarningAction SilentlyContinue
        } catch {
            $tcpOk = $false
        }

        if ($tcpOk) {
            Write-Host '[PASS] DNS/TCP reachability to the Supabase pooler works.' -ForegroundColor Green
            Write-Host '[INFO] The network path is open. If the DB error persists, verify the current pooler username/password and SSL settings in backend/.env.' -ForegroundColor Yellow
        } else {
            Write-Host '[ERROR] This machine cannot currently reach the Supabase pooler on TCP 5432.' -ForegroundColor Red
            Write-Host '[INFO] Try another network/mobile hotspot, disable a restrictive VPN/proxy, and verify outbound TCP 5432 is allowed.' -ForegroundColor Yellow
        }

        Write-Host ''
        Write-Host 'Last database error:' -ForegroundColor Yellow
        $dbOutput | Select-Object -Last 4 | ForEach-Object { Write-Host $_ }
        throw 'Local Supabase connectivity check failed.'
    }
    Pass 'Supabase PostgreSQL connection works'
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
    if ($ready.status -eq 'ready') { Pass 'Running backend is ready' }
} catch {
    Write-Host '[INFO] Backend is not currently running; mandatory checks already passed.' -ForegroundColor Yellow
}

try {
    $frontendResponse = Invoke-WebRequest -Uri 'http://localhost:3000' -UseBasicParsing -TimeoutSec 3
    if ($frontendResponse.StatusCode -eq 200) { Pass 'Running frontend responds on port 3000' }
} catch {
    Write-Host '[INFO] Frontend is not currently running; production build already passed.' -ForegroundColor Yellow
}

Write-Host ''
Write-Host 'All mandatory RecoverFlow checks passed.' -ForegroundColor Green
Write-Host 'Start app: .\scripts\dev.ps1'
Write-Host 'Product: http://localhost:3000'
Write-Host 'Merchant overview: http://localhost:3000/dashboard'
Write-Host 'Recovery cases: http://localhost:3000/cases'
Write-Host 'Recovery insights: http://localhost:3000/analytics'
Write-Host 'Merchant safeguards: http://localhost:3000/settings/policy'
Write-Host 'API docs: http://127.0.0.1:8000/docs'
Write-Host 'Readiness: http://127.0.0.1:8000/health/ready'
