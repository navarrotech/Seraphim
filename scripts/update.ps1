<#
.SYNOPSIS
  Keep a Seraphim host deployment up to date on Windows (issue #346).

.DESCRIPTION
  One safe, idempotent update pass, mirroring scripts/update.sh:
    1. Confirm the checkout is on an updatable branch (main/develop) and clean.
    2. Fetch and confirm the branch is behind its upstream.
    3. Wait for the agent to catch up, then pause it so nothing new starts.
    4. git pull --ff-only, then rebuild and relaunch the compose stack.
    5. Resume the agent, unless the operator had it paused before we started.

  Run directly:   powershell -ExecutionPolicy Bypass -File .\scripts\update.ps1
  Install a task: powershell -ExecutionPolicy Bypass -File .\scripts\install.ps1

  Every knob is an environment variable with a sensible default. See scripts/README.md.
#>
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# Read an environment variable, falling back to a default. Kept 5.1-compatible
# (no `??`), since Windows 11 ships Windows PowerShell 5.1 by default.
function Get-Env([string]$Name, [string]$Default) {
  $value = [Environment]::GetEnvironmentVariable($Name)
  if ([string]::IsNullOrEmpty($value)) { return $Default } else { return $value }
}

# --- Configuration -----------------------------------------------------------

$RepoDir   = Get-Env 'SERAPHIM_REPO_DIR' (Resolve-Path "$PSScriptRoot\..").Path
$ApiUrl    = Get-Env 'SERAPHIM_API_URL' 'http://localhost:27182'
$Branches  = (Get-Env 'SERAPHIM_UPDATE_BRANCHES' 'main develop') -split '\s+'
$CaughtUpTimeout = [int](Get-Env 'SERAPHIM_CAUGHT_UP_TIMEOUT' '3600')
$DrainTimeout    = [int](Get-Env 'SERAPHIM_DRAIN_TIMEOUT' '1800')
$HealthTimeout   = [int](Get-Env 'SERAPHIM_HEALTH_TIMEOUT' '300')
$PollSeconds     = [int](Get-Env 'SERAPHIM_POLL_SECONDS' '10')

$Api = ($ApiUrl.TrimEnd('/')) + '/api/v1'

# --- Helpers -----------------------------------------------------------------

function Write-Log([string]$Message) {
  Write-Host ("{0} [seraphim-update] {1}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $Message)
}

function Assert-Command([string]$Name, [string]$Hint) {
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    Write-Log "Missing required command: $Name"
    Write-Log "Install it, then re-run: $Hint"
    exit 1
  }
}

function Test-ApiReachable {
  try { Invoke-RestMethod -Method Get -Uri "$Api/ping" -TimeoutSec 5 | Out-Null; return $true }
  catch { return $false }
}

function Get-AgentStatus {
  try { return Invoke-RestMethod -Method Get -Uri "$Api/update/status" -TimeoutSec 10 }
  catch { return $null }
}

function Set-Paused([bool]$Paused) {
  $body = @{ paused = $Paused } | ConvertTo-Json -Compress
  try { Invoke-RestMethod -Method Post -Uri "$Api/settings/pause" -Body $body -ContentType 'application/json' -TimeoutSec 10 | Out-Null; return $true }
  catch { return $false }
}

# --- Preconditions -----------------------------------------------------------

Assert-Command git 'https://git-scm.com/download/win'
Assert-Command docker 'https://docs.docker.com/desktop/install/windows-install/'
try { docker compose version | Out-Null }
catch { Write-Log 'The Docker Compose plugin is missing (install Docker Desktop).'; exit 1 }

Set-Location $RepoDir
if (-not (Test-Path (Join-Path $RepoDir '.git'))) { Write-Log "$RepoDir is not a git checkout."; exit 1 }

$Branch = (git rev-parse --abbrev-ref HEAD).Trim()
if ($Branches -notcontains $Branch) {
  Write-Log "On branch '$Branch', which is not in updatable branches ($($Branches -join ', ')). Nothing to do."
  exit 0
}

if ((git status --porcelain)) {
  Write-Log 'Working tree is not clean; refusing to update. Commit or stash local changes first.'
  exit 0
}

# --- Is there anything to pull? ----------------------------------------------

Write-Log "Fetching $Branch from origin..."
git fetch --quiet origin $Branch
if ($LASTEXITCODE -ne 0) { Write-Log 'git fetch failed (check network and repo access).'; exit 1 }

$Local  = (git rev-parse HEAD).Trim()
$Remote = (git rev-parse "origin/$Branch").Trim()
$Base   = (git merge-base HEAD "origin/$Branch").Trim()

if ($Local -eq $Remote) { Write-Log "Already up to date ($($Local.Substring(0,7))). Nothing to do."; exit 0 }
if ($Local -ne $Base)   { Write-Log "Local $Branch has diverged from origin (can't fast-forward); refusing to update."; exit 0 }
Write-Log "Update available: $($Local.Substring(0,7)) -> $($Remote.Substring(0,7))."

# --- Reach a stopping point, then pause --------------------------------------

# When we pause the agent ourselves, we resume it after the rebuild; when the
# operator already had it paused, we leave it paused.
$wasPaused = $null

if (Test-ApiReachable) {
  $status = Get-AgentStatus
  if ($null -ne $status) { $wasPaused = [bool]$status.agent_paused }

  # Nudge the UI to re-check for updates (best effort).
  try { Invoke-RestMethod -Method Post -Uri "$Api/update/check" -TimeoutSec 10 | Out-Null } catch { }

  Write-Log 'Waiting for the agent to catch up (no To Do / In Progress / In Review action items)...'
  $waited = 0
  while ($true) {
    $status = Get-AgentStatus
    if ($null -ne $status -and $status.agent_caught_up) { Write-Log 'Agent is caught up.'; break }
    if ($CaughtUpTimeout -ne 0 -and $waited -ge $CaughtUpTimeout) {
      Write-Log "Still busy after ${CaughtUpTimeout}s; pausing and draining the current turn instead."
      break
    }
    Start-Sleep -Seconds $PollSeconds
    $waited += $PollSeconds
  }

  Write-Log 'Pausing the agent for the update.'
  if (-not (Set-Paused $true)) { Write-Log 'Could not pause the agent via the API; continuing anyway.' }

  Write-Log 'Waiting for the current turn to finish...'
  $waited = 0
  while ($true) {
    $status = Get-AgentStatus
    if ($null -eq $status -or -not $status.agent_working) { Write-Log 'No turn in flight.'; break }
    if ($waited -ge $DrainTimeout) { Write-Log "Turn still running after ${DrainTimeout}s; proceeding with the update."; break }
    Start-Sleep -Seconds $PollSeconds
    $waited += $PollSeconds
  }
}
else {
  Write-Log "API not reachable at ${ApiUrl}; updating without pausing (the stack may be down)."
}

# --- Pull and relaunch -------------------------------------------------------

Write-Log 'Pulling latest source...'
git pull --ff-only --quiet origin $Branch
if ($LASTEXITCODE -ne 0) { Write-Log 'git pull failed.'; exit 1 }

Write-Log 'Rebuilding and relaunching the stack...'
if (-not (Test-Path (Join-Path $RepoDir '.env'))) {
  Write-Log 'No .env found. Copy .env.example to .env and fill it in first.'
  exit 1
}
# Mirror scripts/start.sh: stamp the running build with the host commit/branch and
# tell the API where the repo lives, so the in-app update check works too.
$env:GIT_SHA = $Local
$env:GIT_BRANCH = $Branch
if (-not $env:HOST_REPO_DIR) { $env:HOST_REPO_DIR = $RepoDir }
docker compose up -d --build
if ($LASTEXITCODE -ne 0) { Write-Log 'docker compose up failed.'; exit 1 }

# --- Resume ------------------------------------------------------------------

if ($wasPaused -eq $false) {
  Write-Log 'Waiting for the API to come back healthy before resuming the agent...'
  $waited = 0
  while (-not (Test-ApiReachable)) {
    if ($waited -ge $HealthTimeout) { Write-Log "API did not become healthy within ${HealthTimeout}s; leaving the agent paused."; exit 0 }
    Start-Sleep -Seconds $PollSeconds
    $waited += $PollSeconds
  }
  Write-Log 'Resuming the agent.'
  if (-not (Set-Paused $false)) { Write-Log 'Could not resume the agent via the API; resume it from the UI.' }
}
elseif ($wasPaused -eq $true) {
  Write-Log 'Agent was paused before the update; leaving it paused.'
}

Write-Log "Update complete: now on $($Remote.Substring(0,7))."
