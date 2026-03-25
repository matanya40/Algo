# Push this repo to GitHub (remote: origin, branch: main)
# Requires Git for Windows: https://git-scm.com/download/win
# Usage: .\push-to-github.ps1 "commit message"

$ErrorActionPreference = "Stop"
$repo = $PSScriptRoot

$gitExe = $null
foreach ($c in @(
        "${env:ProgramFiles}\Git\cmd\git.exe",
        "${env:ProgramFiles}\Git\bin\git.exe",
        "${env:LocalAppData}\Programs\Git\cmd\git.exe"
    )) {
    if (Test-Path $c) { $gitExe = $c; break }
}
if (-not $gitExe) {
    $cmd = Get-Command git -ErrorAction SilentlyContinue
    if ($cmd) { $gitExe = $cmd.Source }
}

if (-not $gitExe) {
    Write-Host "Git not found. Install from https://git-scm.com/download/win then reopen PowerShell." -ForegroundColor Red
    exit 1
}

Set-Location $repo
Write-Host "Using: $gitExe"
& $gitExe add -A
$msg = if ($args[0]) { $args[0] } else { "Update project" }
& $gitExe commit -m $msg 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "Commit skipped or failed (nothing new?). Exit: $LASTEXITCODE"
}
& $gitExe push -u origin main
Write-Host "Done."
