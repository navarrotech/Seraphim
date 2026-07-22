<#
.SYNOPSIS
  Remove the Seraphim host self-updater Scheduled Task (issue #346).

    powershell -ExecutionPolicy Bypass -File .\scripts\uninstall.ps1
#>
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$TaskName = 'SeraphimSelfUpdater'

function Write-Log([string]$Message) { Write-Host "[seraphim-uninstall] $Message" }

if (Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue) {
  Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
  Write-Log "Removed scheduled task '$TaskName'."
}
else {
  Write-Log "No scheduled task named '$TaskName' found."
}
