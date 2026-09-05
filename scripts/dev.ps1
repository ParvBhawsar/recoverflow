$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$backend = Join-Path $root 'backend'
$frontend = Join-Path $root 'frontend'
$python = Join-Path $backend 'venv\Scripts\python.exe'

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

function Wait-BackendReady {
    $readyUrl = 'http://127.0.0.1:8000/health/ready'
    for ($attempt = 1; $attempt -le 30; $attempt++) {
        try {
            $response = Invoke-RestMethod -Uri $readyUrl -TimeoutSec 2
            if ($response.status -eq 'ready') {
                Write-Host 'Backend + Supabase are ready.' -ForegroundColor Green
                return
            }
        } catch {
            Start-Sleep -Seconds 1
        }
    }

    throw "Backend did not become ready within 30 seconds. Check the backend terminal and run .\scripts\check.ps1 for diagnostics."
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

Stop-PortProcess 8000
Stop-PortProcess 3000

Write-Host 'Starting RecoverFlow backend on http://127.0.0.1:8000 ...' -ForegroundColor Cyan
Start-Process powershell -ArgumentList '-NoExit','-Command',"Set-Location '$backend'; & '$python' -m uvicorn app.main:app --host 127.0.0.1 --port 8000"

Wait-BackendReady

Write-Host 'Starting RecoverFlow frontend on http://localhost:3000 ...' -ForegroundColor Cyan
Start-Process powershell -ArgumentList '-NoExit','-Command',"Set-Location '$frontend'; `$env:NEXT_PUBLIC_API_URL='http://127.0.0.1:8000'; npm run dev"

Write-Host ''
Write-Host 'RecoverFlow dev environment started.' -ForegroundColor Green
Write-Host 'Keep the backend and frontend terminals open while using localhost.'
Write-Host ''
Write-Host 'Product:            http://localhost:3000'
Write-Host 'Merchant overview:  http://localhost:3000/dashboard'
Write-Host 'Recovery cases:     http://localhost:3000/cases'
Write-Host 'Recovery insights:  http://localhost:3000/analytics'
Write-Host 'Merchant safeguards: http://localhost:3000/settings/policy'
Write-Host 'Test sandbox:       http://localhost:3000/simulator'
Write-Host ''
Write-Host 'Technical validation:'
Write-Host 'Model validation:   http://localhost:3000/analytics/evaluation'
Write-Host 'Strategy benchmark: http://localhost:3000/benchmark'
Write-Host 'Evaluation dataset: http://localhost:3000/evaluation'
Write-Host 'Backend API:        http://127.0.0.1:8000'
Write-Host 'Backend docs:       http://127.0.0.1:8000/docs'
Write-Host 'Backend readiness:  http://127.0.0.1:8000/health/ready'
Write-Host 'Database health:    http://127.0.0.1:8000/health/db'
