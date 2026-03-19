$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$logPath = Join-Path $projectRoot "data\rent-task.log"

Set-Location $projectRoot

$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
"[$timestamp] Starting rent refresh" | Out-File -FilePath $logPath -Append -Encoding utf8

try {
  python scripts/refresh-rent.py 2>&1 | Out-File -FilePath $logPath -Append -Encoding utf8
  "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] Rent refresh finished successfully" | Out-File -FilePath $logPath -Append -Encoding utf8
} catch {
  "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] Rent refresh failed: $($_.Exception.Message)" | Out-File -FilePath $logPath -Append -Encoding utf8
  throw
}
