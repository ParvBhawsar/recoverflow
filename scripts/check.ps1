$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$backend = Join-Path $root 'backend'
$frontend = Join-Path $root 'frontend'
$python = Join-Path $backend 'venv\Scripts\python.exe'

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

Step 'Backend syntax + imports'
Push-Location $backend
& $python -m compileall -q app
if ($LASTEXITCODE -ne 0) { throw 'Backend Python compilation failed.' }
Pass 'Backend Python files compile'

& $python -c "from app.main import app; print(app.title)"
if ($LASTEXITCODE -ne 0) { throw 'FastAPI import failed.' }
Pass 'FastAPI application imports'

Step 'Supabase database'
& $python -c "from sqlalchemy import text; from app.database import engine; c=engine.connect(); print('SELECT 1 =', c.execute(text('SELECT 1')).scalar()); c.close()"
if ($LASTEXITCODE -ne 0) { throw 'Database connectivity check failed.' }
Pass 'Supabase PostgreSQL connection works'
Pop-Location

Step 'Frontend production build'
Push-Location $frontend
$previousApiUrl = $env:NEXT_PUBLIC_API_URL
$env:NEXT_PUBLIC_API_URL = 'http://127.0.0.1:8000'
npm run build
$buildExit = $LASTEXITCODE
if ($null -eq $previousApiUrl) {
    Remove-Item Env:NEXT_PUBLIC_API_URL -ErrorAction SilentlyContinue
} else {
    $env:NEXT_PUBLIC_API_URL = $previousApiUrl
}
Pop-Location
if ($buildExit -ne 0) { throw 'Next.js production build failed.' }
Pass 'Next.js production build succeeds'

Step 'Optional running-service checks'
try {
    $ready = Invoke-RestMethod -Uri 'http://127.0.0.1:8000/health/ready' -TimeoutSec 3
    if ($ready.status -eq 'ready') { Pass 'Running backend is ready' }
} catch {
    Write-Host '[INFO] Backend is not currently running; static/database checks already passed.' -ForegroundColor Yellow
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
Write-Host 'Dashboard: http://localhost:3000'
Write-Host 'API docs: http://127.0.0.1:8000/docs'
Write-Host 'Readiness: http://127.0.0.1:8000/health/ready'
