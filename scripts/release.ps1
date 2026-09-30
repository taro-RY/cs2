# ============================================================
# CS2 CT-OS - one-shot release script
# Usage:
#   powershell -ExecutionPolicy Bypass -File scripts\release.ps1
#   powershell -ExecutionPolicy Bypass -File scripts\release.ps1 -Message "feat: xxx"
#   powershell -ExecutionPolicy Bypass -File scripts\release.ps1 -Tag patch
#   powershell -ExecutionPolicy Bypass -File scripts\release.ps1 -Tag minor -Deploy
# All console output is ASCII-only on purpose (PS 5.1 encoding safety).
# ============================================================
param(
    [string]$Message = "",
    [ValidateSet("", "patch", "minor", "major")]
    [string]$Tag = "",
    [switch]$Deploy
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

function Fail($text) { Write-Host "[release] X $text" -ForegroundColor Red; exit 1 }
function Info($text) { Write-Host "[release] $text" -ForegroundColor DarkYellow }
function Ok($text)   { Write-Host "[release] V $text" -ForegroundColor Green }

git rev-parse --is-inside-work-tree *> $null
if ($LASTEXITCODE -ne 0) { Fail "not a git repository: $root" }

$remote = git remote get-url origin 2>$null
if (-not $remote) { Fail "origin remote is not configured" }

$branch = (git rev-parse --abbrev-ref HEAD).Trim()
if ($branch -eq "HEAD") { Fail "detached HEAD - checkout a branch first" }

# ---------- semver bump ----------
$newVer = $null
if ($Tag) {
    $verPath = Join-Path $root "VERSION"
    $cur = "0.0.0"
    if (Test-Path $verPath) { $cur = (Get-Content $verPath -Raw).Trim() }
    if ($cur -notmatch '^\d+\.\d+\.\d+$') { Fail "VERSION is not x.y.z: $cur" }

    $major, $minor, $patch = [int[]]$cur.Split('.')
    switch ($Tag) {
        "major" { $major++; $minor = 0; $patch = 0 }
        "minor" { $minor++; $patch = 0 }
        "patch" { $patch++ }
    }
    $newVer = "$major.$minor.$patch"
    [System.IO.File]::WriteAllText($verPath, $newVer + "`n",
        (New-Object System.Text.UTF8Encoding($false)))
    Info "VERSION $cur -> $newVer"
}

# ---------- changeset ----------
$changes = @(git status --porcelain)
if ($changes.Count -eq 0 -and -not $Tag) {
    Info "working tree clean, nothing to commit"
    exit 0
}
if ($changes.Count -gt 0) {
    Write-Host "[release] changes:" -ForegroundColor DarkGray
    $changes | ForEach-Object { Write-Host "  $_" -ForegroundColor DarkGray }

    git add -A
    if ($LASTEXITCODE -ne 0) { Fail "git add failed" }

    if (-not $Message) {
        $stamp = Get-Date -Format "yyyy-MM-dd HH:mm"
        $Message = if ($newVer) { "release: v$newVer" } else { "release: iteration $stamp" }
    }
    $stat = (git diff --cached --stat) -join "`n"

    git commit -m $Message -m $stat | Out-Null
    if ($LASTEXITCODE -ne 0) { Fail "git commit failed" }
    Ok "committed: $Message"
}

# ---------- push branch ----------
Info "pushing $branch to origin ..."
git push origin $branch
if ($LASTEXITCODE -ne 0) { Fail "git push failed (check proxy/network)" }

# ---------- tag ----------
if ($newVer) {
    $tagName = "v$newVer"
    git tag $tagName
    if ($LASTEXITCODE -ne 0) { Fail "tag $tagName failed (maybe exists)" }
    git push origin $tagName
    if ($LASTEXITCODE -ne 0) { Fail "push tag $tagName failed" }
    Ok "tag $tagName pushed"
}

# ---------- optional Vercel ----------
if ($Deploy) {
    Info "deploying to Vercel production ..."
    npx vercel --prod --yes
    if ($LASTEXITCODE -ne 0) { Fail "vercel deploy failed (code is already on GitHub)" }
}

Ok "done https://github.com/taro-RY/cs2 ($branch)$(if ($newVer) { "  tag v$newVer" })"
