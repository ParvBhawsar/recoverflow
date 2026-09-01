param(
    [Parameter(Mandatory = $true)]
    [string]$BackendUrl,

    [Parameter(Mandatory = $true)]
    [string]$FrontendUrl
)

$ErrorActionPreference = 'Stop'

$BackendUrl = $BackendUrl.TrimEnd('/')
$FrontendUrl = $FrontendUrl.TrimEnd('/')

function Step($message) {
    Write-Host "`n== $message ==" -ForegroundColor Cyan
}

function Pass($message) {
    Write-Host "[PASS] $message" -ForegroundColor Green
}

function Get-Json($url) {
    $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 30
    if ($response.StatusCode -ne 200) {
        throw "$url returned HTTP $($response.StatusCode)"
    }
    return $response.Content | ConvertFrom-Json
}

function Check-Page($url, $label) {
    $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 30
    if ($response.StatusCode -ne 200) {
        throw "$label returned HTTP $($response.StatusCode): $url"
    }
    Pass "$label responds"
}

Write-Host 'RecoverFlow production smoke test' -ForegroundColor Cyan
Write-Host "Backend:  $BackendUrl"
Write-Host "Frontend: $FrontendUrl"

Step 'Backend service'
$root = Get-Json "$BackendUrl/"
if ($root.service -ne 'RecoverFlow') { throw 'Backend root response is not RecoverFlow.' }
Pass "Backend root responds (version $($root.version))"

$ready = Get-Json "$BackendUrl/health/ready"
if ($ready.status -ne 'ready') { throw 'Backend readiness check did not report ready.' }
Pass 'Backend + database + merchant policy are ready'

$db = Get-Json "$BackendUrl/health/db"
if ($db.database -ne 'connected') { throw 'Database health check did not report connected.' }
Pass 'Supabase PostgreSQL is connected'

$policy = Get-Json "$BackendUrl/recovery/policy"
if (-not $policy.duplicate_charge_protection_enabled) {
    throw 'Duplicate-charge protection invariant is not enabled.'
}
Pass 'Merchant safety policy endpoint responds and duplicate protection is enabled'

$dataset = Get-Json "$BackendUrl/recovery/evaluation/dataset"
if (-not $dataset.synthetic -or $dataset.version -ne 'rf-synth-v1') {
    throw 'Synthetic evaluation dataset is unavailable or unexpected.'
}
Pass "Synthetic evaluation dataset responds ($($dataset.summary.total_cases) cases)"

Step 'Frontend routes'
Check-Page $FrontendUrl 'Dashboard'
Check-Page "$FrontendUrl/simulator" 'Simulation Lab'
Check-Page "$FrontendUrl/evaluation" 'Evaluation Dataset'
Check-Page "$FrontendUrl/benchmark" 'Benchmark Lab'
Check-Page "$FrontendUrl/analytics/evaluation" 'Evaluation Analytics'
Check-Page "$FrontendUrl/settings/policy" 'Merchant Safety Rules'

Step 'CORS preflight'
$headers = @{
    Origin = $FrontendUrl
    'Access-Control-Request-Method' = 'GET'
}
$cors = Invoke-WebRequest -Uri "$BackendUrl/recovery/summary" -Method Options -Headers $headers -UseBasicParsing -TimeoutSec 30
$allowOrigin = $cors.Headers['access-control-allow-origin']
if ($allowOrigin -ne $FrontendUrl) {
    throw "CORS does not allow frontend origin. Expected '$FrontendUrl', got '$allowOrigin'."
}
Pass 'Backend CORS allows deployed frontend origin'

Write-Host ''
Write-Host 'RecoverFlow production smoke test passed.' -ForegroundColor Green
Write-Host "Webhook URL: $BackendUrl/webhooks/razorpay"
