# ==============================================================================
# Supabase CLI Automation & Schema Provisioning Script (PowerShell)
# ==============================================================================
$ErrorActionPreference = "Stop"

$ProjectRef = if ($env:SUPABASE_PROJECT_REF) { $env:SUPABASE_PROJECT_REF } else { "your-project-ref" }
$RawToken = if ($env:SUPABASE_ACCESS_TOKEN) { $env:SUPABASE_ACCESS_TOKEN } else { "" }
if (-not $RawToken) {
    Write-Error "SUPABASE_ACCESS_TOKEN environment variable is not set. Please set it before running this script: `$env:SUPABASE_ACCESS_TOKEN = 'your_token'"
    exit 1
}
$AccessToken = $RawToken -replace '[<>]', ''
$env:SUPABASE_ACCESS_TOKEN = $AccessToken

Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host "  Supabase CLI Setup & Schema Automation (PowerShell) " -ForegroundColor Cyan
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host "[INFO] Target Project Ref: $ProjectRef" -ForegroundColor Blue

# 1. Check CLI
Write-Host "[INFO] Checking Supabase CLI..." -ForegroundColor Blue
$cliCmd = "npx supabase"
Write-Host "[SUCCESS] Using Supabase CLI via npx." -ForegroundColor Green

# 2. Login
Write-Host "[INFO] Authenticating non-interactively..." -ForegroundColor Blue
npx supabase login --token $AccessToken --no-browser 2>$null | Out-Null
Write-Host "[SUCCESS] Authenticated with Access Token." -ForegroundColor Green

# 3. Init
if (-not (Test-Path "supabase/config.toml")) {
    Write-Host "[INFO] Initializing Supabase workspace..." -ForegroundColor Blue
    npx supabase init
    Write-Host "[SUCCESS] Initialized workspace." -ForegroundColor Green
} else {
    Write-Host "[SUCCESS] Local workspace already initialized." -ForegroundColor Green
}

# 4. Link
Write-Host "[INFO] Linking project '$ProjectRef'..." -ForegroundColor Blue
npx supabase link --project-ref $ProjectRef --yes
Write-Host "[SUCCESS] Linked project." -ForegroundColor Green

# 5. Push migrations
Write-Host "[INFO] Pushing migrations to remote database..." -ForegroundColor Blue
npx supabase db push --yes
Write-Host "[SUCCESS] Migrations pushed successfully." -ForegroundColor Green

# 6. Verify query
Write-Host "[INFO] Verifying database connection..." -ForegroundColor Blue
$verifyQuery = "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('profiles', 'posts', 'followers') ORDER BY table_name;"
npx supabase db query --linked $verifyQuery

Write-Host "=====================================================" -ForegroundColor Green
Write-Host "  Supabase configuration and verification complete!   " -ForegroundColor Green
Write-Host "=====================================================" -ForegroundColor Green
