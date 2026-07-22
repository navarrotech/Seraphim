<#
.SYNOPSIS
  Install the Seraphim host self-updater as a Windows Scheduled Task (issue #346).

.DESCRIPTION
  Registers a task that runs scripts/update.ps1 on an interval (default every 15
  minutes) as the current user, so the host keeps itself up to date. Docker
  Desktop must be running for the update to rebuild the stack.

    powershell -ExecutionPolicy Bypass -File .\scripts\install.ps1

  Uninstall with scripts/uninstall.ps1.
#>
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Get-Env([string]$Name, [string]$Default) {
  $value = [Environment]::GetEnvironmentVariable($Name)
  if ([string]::IsNullOrEmpty($value)) { return $Default } else { return $value }
}

$RepoDir = Get-Env 'SERAPHIM_REPO_DIR' (Resolve-Path "$PSScriptRoot\..").Path
$IntervalMinutes = [int](Get-Env 'SERAPHIM_UPDATE_INTERVAL_MINUTES' '15')
$TaskName = 'SeraphimSelfUpdater'
$UpdateScript = Join-Path $RepoDir 'scripts\update.ps1'

function Write-Log([string]$Message) { Write-Host "[seraphim-install] $Message" }

if (-not (Test-Path $UpdateScript)) { Write-Log "Cannot find $UpdateScript"; exit 1 }
if (-not (Get-Command Register-ScheduledTask -ErrorAction SilentlyContinue)) {
  Write-Log 'The ScheduledTasks module is unavailable. Register a task manually with schtasks.exe, or run update.ps1 from your own scheduler.'
  exit 1
}

Write-Log "Installing scheduled task '$TaskName' (runs as '$env:USERNAME', every $IntervalMinutes min)."

$action = New-ScheduledTaskAction `
  -Execute 'powershell.exe' `
  -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$UpdateScript`"" `
  -WorkingDirectory $RepoDir

# Repeat from one minute after registration. A 10-year duration is effectively
# indefinite and avoids the out-of-range error some Windows builds raise for
# [TimeSpan]::MaxValue.
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) `
  -RepetitionInterval (New-TimeSpan -Minutes $IntervalMinutes) `
  -RepetitionDuration (New-TimeSpan -Days 3650)

$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -MultipleInstances IgnoreNew
$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Limited

Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger `
  -Settings $settings -Principal $principal -Force | Out-Null

Write-Log 'Done. The updater is installed and scheduled.'
Write-Log "Run now:   Start-ScheduledTask -TaskName $TaskName"
Write-Log "Inspect:   Get-ScheduledTask -TaskName $TaskName | Get-ScheduledTaskInfo"
Write-Log "Uninstall: powershell -ExecutionPolicy Bypass -File `"$($RepoDir)\scripts\uninstall.ps1`""
Write-Log 'Note: Docker Desktop must be running (and you logged on) for scheduled updates to rebuild the stack.'
