Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Protect-Caesar([string]$plain, [int]$key) {
  if ($key -lt 1 -or $key -gt 25) { throw "Key must be 1..25" }
  $bytes = [System.Text.Encoding]::UTF8.GetBytes($plain)
  for ($i=0; $i -lt $bytes.Length; $i++) {
    # shift within byte range (not crypto; just obfuscation)
    $bytes[$i] = [byte](($bytes[$i] + $key) % 256)
  }
  [Convert]::ToBase64String($bytes)
}

# Prompt key and secrets
$key = Read-Host "Enter Caesar key (1-25)" | ForEach-Object { [int]$_ }

# Put your secrets here as prompts
$sessionSecret      = Read-Host "SESSION_SECRET"
$databaseUrl        = Read-Host "DATABASE_URL"
$mongoUri           = Read-Host "MONGO_URI"
$stripeApiKey       = Read-Host "STRIPE_API_KEY"
$googleClientId     = Read-Host "GOOGLE_CLIENT_ID"
$googleClientSecret = Read-Host "GOOGLE_CLIENT_SECRET"
$mailerUser         = Read-Host "MAILER_USER"
$mailerPassword     = Read-Host "MAILER_PASSWORD"

# Build a simple KEY=VALUE file (plaintext in memory only)
$plaintext = @"
SESSION_SECRET=$sessionSecret
DATABASE_URL=$databaseUrl
MONGO_URI=$mongoUri
STRIPE_API_KEY=$stripeApiKey
GOOGLE_CLIENT_ID=$googleClientId
GOOGLE_CLIENT_SECRET=$googleClientSecret
MAILER_USER=$mailerUser
MAILER_PASSWORD=$mailerPassword
"@.TrimEnd()

$enc = Protect-Caesar -plain $plaintext -key $key
Set-Content -Path "encrypted.txt" -Value $enc -Encoding ASCII
Write-Host "Wrote encrypted.txt"