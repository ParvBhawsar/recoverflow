param(
    [Parameter(Mandatory = $true)]
    [string]$BackendUrl,

    [Parameter(Mandatory = $true)]
    [string]$FrontendUrl
)

$ErrorActionPreference = 'Stop'

$BackendUrl = $BackendUrl.TrimEnd('/')
$FrontendUrl = $FrontendUrl.TrimEnd('/')
$RequestTimeoutSec = 90
$MaxAttempts = 3

function Step($message) {
    Write-Host "`n== $message ==" -ForegroundColor Cyan
}

function Pass($message) {
    Write-Host "[PASS] $message" -ForegroundColor Green
}

function Invoke-WithRetry($url, $method = 'Get', $headers = $null) {
    $lastError = $null

    for ($attempt = 1; $attempt -le $MaxAttempts; $attempt++) {
        try {
            $params = @{
                Uri = $url
                Method = $method
                UseBasicParsing = $true
                TimeoutSec = $RequestTimeoutSec
            }
            if ($headers) { $params.Headers = $headers }

            return Invoke-WebRequest @params
        } catch {
            $lastError = $_
            if ($attempt -lt $MaxAttempts) {
                Write-Host "[INFO] Attempt $attempt/$MaxAttempts failed for $url. Render may be waking up; retrying in 5s..." -ForegroundColor Yellow
                Start-Sleep -Seconds 5
            }
        }
    }

    throw "Request failed after $MaxAttempts attempts: $url`n$($lastError.Exception.Message)"
}

function Get-Json($url) {
    $response = Invoke-WithRetry $url
    if ($response.StatusCode -ne 200) {
        throw "$url returned HTTP $($response.StatusCode)"
    }
    return $response.Content | ConvertFrom-Json
}

function Check-Page($url, $label) {
    $response = Invoke-WithRetry $url
    if ($response.StatusCode -ne 200) {
        throw "$label returned HTTP $($response.StatusCode): $url"
    }
    Pass "$label responds"
}

Write-Host 'RecoverFlow production smoke test' -ForegroundColor Cyan
Write-Host "Backend:  $BackendUrl"
Write-Host "Frontend: $FrontendUrl"

Step 'Wake backend'
try {
    $wake = Invoke-WithRetry "$BackendUrl/health/ready"
    if ($wake.StatusCode -eq 200) { Pass 'Render backend is awake and ready' }
} catch {
    throw "Render backend could not become ready. Check Render logs. $($_.Exception.Message)"
}

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
Pass 'Merchant safeguard endpoint responds and duplicate protection is enabled'

$dataset = Get-Json "$BackendUrl/recovery/evaluation/dataset"
if (-not $dataset.synthetic -or $dataset.version -ne 'rf-synth-v1') {
    throw 'Synthetic evaluation dataset is unavailable or unexpected.'
}
Pass "Technical evaluation dataset responds ($($dataset.summary.total_cases) cases)"

Step 'Merchant product routes'
Check-Page $FrontendUrl 'Product landing page'
Check-Page "$FrontendUrl/dashboard" 'Recovery overview'
Check-Page "$FrontendUrl/cases" 'Recovery cases workspace'
Check-Page "$FrontendUrl/analytics" 'Recovery insights'
Check-Page "$FrontendUrl/settings/policy" 'Merchant safeguards'
Check-Page "$FrontendUrl/simulator" 'Test sandbox'

Step 'Technical validation routes'
Check-Page "$FrontendUrl/analytics/evaluation" 'Model validation'
Check-Page "$FrontendUrl/benchmark" 'Strategy benchmark'
Check-Page "$FrontendUrl/evaluation" 'Evaluation dataset'

Step 'CORS preflight'
$headers = @{
    Origin = $FrontendUrl
    'Access-Control-Request-Method' = 'GET'
}
$cors = Invoke-WithRetry "$BackendUrl/recovery/summary" 'Options' $headers
$allowOrigin = $cors.Headers['access-control-allow-origin']
if ($allowOrigin -ne $FrontendUrl) {
    throw "CORS does not allow frontend origin. Expected '$FrontendUrl', got '$allowOrigin'."
}
Pass 'Backend CORS allows deployed frontend origin'

Write-Host ''
Write-Host 'RecoverFlow production smoke test passed.' -ForegroundColor Green
Write-Host "Webhook URL: $BackendUrl/webhooks/razorpay"
