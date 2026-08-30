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

if (-not (Test-Path $python)) {
    throw 'Python venv missing. Run .\scripts\setup.ps1 first.'
}

if (-not (Test-Path (Join-Path $backend '.env'))) {
    throw 'backend/.env is missing. Add Supabase + Razorpay values first.'
}

Stop-PortProcess 8000
Stop-PortProcess 3000

Write-Host 'Starting RecoverFlow backend on http://127.0.0.1:8000 ...' -ForegroundColor Cyan
Start-Process powershell -ArgumentList '-NoExit','-Command',"Set-Location '$backend'; & '$python' -m uvicorn app.main:app --host 127.0.0.1 --port 8000"

Start-Sleep -Seconds 2

Write-Host 'Starting RecoverFlow frontend on http://localhost:3000 ...' -ForegroundColor Cyan
Start-Process powershell -ArgumentList '-NoExit','-Command',"Set-Location '$frontend'; `$env:NEXT_PUBLIC_API_URL='http://127.0.0.1:8000'; npm run dev"

Write-Host ''
Write-Host 'RecoverFlow dev environment started.' -ForegroundColor Green
Write-Host 'Frontend: http://localhost:3000'
Write-Host 'Backend docs: http://127.0.0.1:8000/docs'
Write-Host 'Recovery cases: http://127.0.0.1:8000/recovery/cases'
Write-Host 'Recovery summary: http://127.0.0.1:8000/recovery/summary'
