Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# ---------- fill these in ----------
$Namespace        = "trendtrove"
$Domain           = "127.0.0.1.nip.io"      # used by ingress + cookies
$ClusterType      = "docker-desktop"         # docker-desktop | kind | minikube
$KindClusterName  = "kind"                   # only if ClusterType = kind
$Tag              = "local"                  # matches k8deploy image tags
$UseIngress       = $true
$KubeContext      = ""                       # optional: e.g. "docker-desktop"

function Unprotect-Caesar([string]$cipherB64, [int]$key) {
  if ($key -lt 1 -or $key -gt 25) { throw "Key must be 1..25" }
  $bytes = [Convert]::FromBase64String($cipherB64)
  for ($i=0; $i -lt $bytes.Length; $i++) {
    $bytes[$i] = [byte](($bytes[$i] - $key + 256) % 256)
  }
  [System.Text.Encoding]::UTF8.GetString($bytes)
}

function Read-EncryptedSecretsFile([string]$path) {
  if (-not (Test-Path $path)) { throw "Secrets file not found: $path" }
  $key = Read-Host "Enter Caesar key (1-25)" | ForEach-Object { [int]$_ }
  $cipher = (Get-Content -Path $path -Raw).Trim()
  $plain = Unprotect-Caesar -cipherB64 $cipher -key $key

  # Parse KEY=VALUE lines into hashtable
  $map = @{}
  foreach ($line in ($plain -split "`n")) {
    $l = $line.Trim()
    if (-not $l -or $l.StartsWith("#")) { continue }
    $idx = $l.IndexOf("=")
    if ($idx -lt 1) { continue }
    $k = $l.Substring(0, $idx).Trim()
    $v = $l.Substring($idx + 1) # keep value as-is
    $map[$k] = $v
  }
  return $map
}

$secrets = Read-EncryptedSecretsFile -path (Join-Path $PSScriptRoot "encrypted.txt")

$SessionSecret      = $secrets["SESSION_SECRET"]
$DatabaseUrl        = $secrets["DATABASE_URL"]
$MongoUri           = $secrets["MONGO_URI"]
$StripeApiKey       = $secrets["STRIPE_API_KEY"]
$GoogleClientId     = $secrets["GOOGLE_CLIENT_ID"]
$GoogleClientSecret = $secrets["GOOGLE_CLIENT_SECRET"]
$MailerUser         = $secrets["MAILER_USER"]
$MailerPassword     = $secrets["MAILER_PASSWORD"]

# Optional: fail fast if any are missing
$required = @(
  "SESSION_SECRET","DATABASE_URL","MONGO_URI","STRIPE_API_KEY",
  "GOOGLE_CLIENT_ID","GOOGLE_CLIENT_SECRET","MAILER_USER","MAILER_PASSWORD"
)
foreach ($r in $required) {
  if (-not $secrets.ContainsKey($r) -or [string]::IsNullOrWhiteSpace($secrets[$r])) {
    throw "Missing required secret: $r"
  }
}
# ------------------------------------

function Require-Cmd($name) {
  if (-not (Get-Command $name -ErrorAction SilentlyContinue)) { throw "$name not found in PATH" }
}
Require-Cmd docker
Require-Cmd kubectl
if ($ClusterType -eq "kind") { Require-Cmd kind }
if ($ClusterType -eq "minikube") { Require-Cmd minikube }

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Push-Location $repoRoot
if ($KubeContext) { kubectl config use-context $KubeContext | Out-Null }

$images = @(
  @{ tag="trendtrove-app:$Tag";     dockerfile="Dockerfile";                              context="." },
  @{ tag="trendtrove-auth:$Tag";    dockerfile="micro services/auth service/Dockerfile";  context="." },
  @{ tag="trendtrove-product:$Tag"; dockerfile="micro services/product service/Dockerfile"; context="." },
  @{ tag="trendtrove-cart:$Tag";    dockerfile="micro services/cart service/Dockerfile";  context="." },
  @{ tag="trendtrove-mail:$Tag";    dockerfile="micro services/mail service/Dockerfile";  context="." },
  @{ tag="error-trigger:$Tag";      dockerfile="micro services/error trigger/Dockerfile"; context="micro services/error trigger" }
)

foreach ($img in $images) {
  Write-Host "Building $($img.tag)…"
  docker build -f "$($img.dockerfile)" -t "$($img.tag)" "$($img.context)"
}

switch ($ClusterType) {
  "kind" {
    foreach ($img in $images) { kind load docker-image $img.tag --name $KindClusterName }
  }
  "minikube" {
    foreach ($img in $images) { minikube image load $img.tag }
  }
}

kubectl create namespace $Namespace --dry-run=client -o yaml | kubectl apply -f -

kubectl create configmap trendtrove-config `
  --from-literal=NODE_ENV=development `
  --from-literal=APP_DOMAIN="http://$Domain" `
  --from-literal=GOOGLE_CALLBACK_URL="http://$Domain/auth/google/callback" `
  --from-literal=SESSION_COOKIE_SECURE="false" `
  --from-literal=SESSION_COOKIE_DOMAIN=$Domain `
  --from-literal=SESSION_COOKIE_SAME_SITE=lax `
  --dry-run=client -o yaml | kubectl apply -n $Namespace -f -

kubectl create secret generic trendtrove-secrets `
  --from-literal=SESSION_SECRET=$SessionSecret `
  --from-literal=DATABASE_URL=$DatabaseUrl `
  --from-literal=MONGO_URI=$MongoUri `
  --from-literal=STRIPE_API_KEY=$StripeApiKey `
  --from-literal=GOOGLE_CLIENT_ID=$GoogleClientId `
  --from-literal=GOOGLE_CLIENT_SECRET=$GoogleClientSecret `
  --from-literal=MAILER_USER=$MailerUser `
  --from-literal=MAILER_PASSWORD=$MailerPassword `
  --dry-run=client -o yaml | kubectl apply -n $Namespace -f -

$manifests = @("postgres.yaml","mongodb.yaml","app.yaml","auth.yaml","product.yaml","cart.yaml","mail.yaml","error-trigger.yaml")
if ($UseIngress) { $manifests += "ingress.yaml" }

foreach ($file in $manifests) {
  kubectl apply -n $Namespace -f (Join-Path "k8deploy" $file)
}

# Wait for databases before bouncing app pods (reduces startup connection errors)
kubectl rollout status deployment/postgres -n $Namespace --timeout=180s
kubectl rollout status deployment/mongodb -n $Namespace --timeout=180s

# Rebuild images are already loaded locally; force deployments to pick them up
kubectl rollout restart deployment/trendtrove-app -n $Namespace
kubectl rollout restart deployment/trendtrove-auth -n $Namespace
kubectl rollout restart deployment/product-service -n $Namespace
kubectl rollout restart deployment/cart-service -n $Namespace
kubectl rollout restart deployment/mail-service -n $Namespace
kubectl rollout restart deployment/postgres -n $Namespace
kubectl rollout restart deployment/mongodb -n $Namespace
kubectl rollout restart deployment/error-trigger -n $Namespace

Write-Host "Done. Open http://$Domain/ (no hosts entry needed when using nip.io)."
Pop-Location
