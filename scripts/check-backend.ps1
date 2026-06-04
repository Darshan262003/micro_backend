# Quick check: gateway + microservices (run from Backend_mono)
Write-Host "Checking local backend ports..." -ForegroundColor Cyan

$checks = @(
  @{ Name = "Gateway"; Url = "http://localhost:4000/health" },
  @{ Name = "Auth"; Url = "http://localhost:4001/health" },
  @{ Name = "User"; Url = "http://localhost:4002/health" },
  @{ Name = "Job"; Url = "http://localhost:4003/health" }
)

foreach ($c in $checks) {
  try {
    $r = Invoke-WebRequest -Uri $c.Url -UseBasicParsing -TimeoutSec 5
    Write-Host ("  OK   {0}  {1}" -f $c.Name, $c.Url) -ForegroundColor Green
  } catch {
    Write-Host ("  FAIL {0}  {1}" -f $c.Name, $c.Url) -ForegroundColor Red
    Write-Host "        $($_.Exception.Message)" -ForegroundColor DarkRed
  }
}

Write-Host ""
Write-Host "Frontend should use: http://localhost:4000 (gateway only)" -ForegroundColor Yellow
Write-Host "If Auth/User/Job FAIL, login will 504 until those services are running." -ForegroundColor Yellow
