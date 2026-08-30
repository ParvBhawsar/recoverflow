$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$backend = Join-Path $root 'backend'
$frontend = Join-Path $root 'frontend'

Write-Host '== RecoverFlow setup ==' -ForegroundColor Cyan

if (-not (Test-Path (Join-Path $backend 'venv'))) {
    Write-Host 'Creating Python virtual environment...'
    python -m venv (Join-Path $backend 'venv')
}

$python = Join-Path $backend 'venv\Scripts\python.exe'
Write-Host 'Installing backend dependencies...'
& $python -m pip install --upgrade pip
& $python -m pip install -r (Join-Path $backend 'requirements.txt')

if (-not (Test-Path (Join-Path $backend '.env'))) {
    Write-Warning 'backend/.env is missing. Create it with your Supabase and Razorpay values before starting the backend.'
}

Write-Host 'Installing frontend dependencies...'
Push-Location $frontend
npm install
Pop-Location

Write-Host ''
Write-Host 'Setup complete.' -ForegroundColor Green
Write-Host 'Next: run .\scripts\dev.ps1 from the repo root.'
