#!/usr/bin/env bash
set -euo pipefail

# ---------- fill these in ----------
NAMESPACE="trendtrove"
DOMAIN="127.0.0.1.nip.io"       # used by ingress + cookies
CLUSTER_TYPE="docker-desktop"    # docker-desktop | kind | minikube
KIND_CLUSTER_NAME="kind"         # only if CLUSTER_TYPE=kind
TAG="local"                      # matches k8deploy image tags
USE_INGRESS="true"               # true/false
KUBE_CONTEXT=""                  # optional: e.g. "docker-desktop"
# ----------------------------------

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || { echo "$1 not found in PATH" >&2; exit 1; }
}

require_cmd docker
require_cmd kubectl
if [[ "$CLUSTER_TYPE" == "kind" ]]; then require_cmd kind; fi
if [[ "$CLUSTER_TYPE" == "minikube" ]]; then require_cmd minikube; fi
require_cmd python3

# ---- Caesar decrypt encrypted.txt and parse KEY=VALUE ----
unprotect_caesar() {
  local key="$1"
  python3 - "$key" <<'PY'
import base64, sys
key = int(sys.argv[1])
if not (1 <= key <= 25):
    raise SystemExit("Key must be 1..25")
cipher_b64 = sys.stdin.read().strip()
data = base64.b64decode(cipher_b64)
plain = bytes(((b - key) % 256) for b in data)
sys.stdout.buffer.write(plain)
PY
}

read_encrypted_secrets() {
  local path="$1"
  [[ -f "$path" ]] || { echo "Secrets file not found: $path" >&2; exit 1; }

  read -r -p "Enter Caesar key (1-25): " key
  if ! [[ "$key" =~ ^[0-9]+$ ]] || (( key < 1 || key > 25 )); then
    echo "Key must be 1..25" >&2
    exit 1
  fi

  local plain
  plain="$(unprotect_caesar "$key" < "$path")"

  # Export KEY=VALUE lines into env (ignores blanks and #comments)
  while IFS= read -r line; do
    line="${line%$'\r'}"
    [[ -z "$line" ]] && continue
    [[ "$line" == \#* ]] && continue
    if [[ "$line" == *"="* ]]; then
      k="${line%%=*}"
      v="${line#*=}"
      # prevent weird keys from doing anything dangerous
      if [[ "$k" =~ ^[A-Z0-9_]+$ ]]; then
        export "$k=$v"
      fi
    fi
  done <<< "$plain"

  # Fail fast
  local required=(
    SESSION_SECRET DATABASE_URL MONGO_URI STRIPE_API_KEY
    GOOGLE_CLIENT_ID GOOGLE_CLIENT_SECRET MAILER_USER MAILER_PASSWORD
  )
  for r in "${required[@]}"; do
    if [[ -z "${!r:-}" ]]; then
      echo "Missing required secret: $r" >&2
      exit 1
    fi
  done
}

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$SCRIPT_DIR"
cd "$REPO_ROOT"

if [[ -n "$KUBE_CONTEXT" ]]; then
  kubectl config use-context "$KUBE_CONTEXT" >/dev/null
fi

read_encrypted_secrets "$REPO_ROOT/encrypted.txt"

# ---- Build images ----
declare -a IMAGES=(
  "trendtrove-app:$TAG|Dockerfile|."
  "trendtrove-auth:$TAG|micro services/auth service/Dockerfile|."
  "trendtrove-product:$TAG|micro services/product service/Dockerfile|."
  "trendtrove-cart:$TAG|micro services/cart service/Dockerfile|."
  "trendtrove-mail:$TAG|micro services/mail service/Dockerfile|."
  "error-trigger:$TAG|micro services/error trigger/Dockerfile|micro services/error trigger"
)

for item in "${IMAGES[@]}"; do
  IFS="|" read -r tag dockerfile context <<< "$item"
  echo "Building $tag…"
  docker build -f "$dockerfile" -t "$tag" "$context"
done

# ---- Load images into cluster if needed ----
case "$CLUSTER_TYPE" in
  kind)
    for item in "${IMAGES[@]}"; do
      IFS="|" read -r tag _ _ <<< "$item"
      kind load docker-image "$tag" --name "$KIND_CLUSTER_NAME"
    done
    ;;
  minikube)
    for item in "${IMAGES[@]}"; do
      IFS="|" read -r tag _ _ <<< "$item"
      minikube image load "$tag"
    done
    ;;
  docker-desktop)
    # images are already in local docker daemon; nothing to do
    ;;
  *)
    echo "Unknown CLUSTER_TYPE: $CLUSTER_TYPE (use docker-desktop|kind|minikube)" >&2
    exit 1
    ;;
esac

# ---- K8s apply ----
kubectl create namespace "$NAMESPACE" --dry-run=client -o yaml | kubectl apply -f -

kubectl create configmap trendtrove-config \
  -n "$NAMESPACE" \
  --from-literal=NODE_ENV=development \
  --from-literal=APP_DOMAIN="http://$DOMAIN" \
  --from-literal=GOOGLE_CALLBACK_URL="http://$DOMAIN/auth/google/callback" \
  --from-literal=SESSION_COOKIE_SECURE="false" \
  --from-literal=SESSION_COOKIE_DOMAIN="$DOMAIN" \
  --from-literal=SESSION_COOKIE_SAME_SITE=lax \
  --dry-run=client -o yaml | kubectl apply -n "$NAMESPACE" -f -

kubectl create secret generic trendtrove-secrets \
  -n "$NAMESPACE" \
  --from-literal=SESSION_SECRET="$SESSION_SECRET" \
  --from-literal=DATABASE_URL="$DATABASE_URL" \
  --from-literal=MONGO_URI="$MONGO_URI" \
  --from-literal=STRIPE_API_KEY="$STRIPE_API_KEY" \
  --from-literal=GOOGLE_CLIENT_ID="$GOOGLE_CLIENT_ID" \
  --from-literal=GOOGLE_CLIENT_SECRET="$GOOGLE_CLIENT_SECRET" \
  --from-literal=MAILER_USER="$MAILER_USER" \
  --from-literal=MAILER_PASSWORD="$MAILER_PASSWORD" \
  --dry-run=client -o yaml | kubectl apply -n "$NAMESPACE" -f -

MANIFESTS=(postgres.yaml mongodb.yaml app.yaml auth.yaml product.yaml cart.yaml mail.yaml error-trigger.yaml)
if [[ "$USE_INGRESS" == "true" ]]; then
  MANIFESTS+=(ingress.yaml)
fi

for f in "${MANIFESTS[@]}"; do
  kubectl apply -n "$NAMESPACE" -f "$REPO_ROOT/k8deploy/$f"
done

kubectl rollout status deployment/postgres -n "$NAMESPACE" --timeout=180s
kubectl rollout status deployment/mongodb -n "$NAMESPACE" --timeout=180s

kubectl rollout restart deployment/trendtrove-app -n "$NAMESPACE"
kubectl rollout restart deployment/trendtrove-auth -n "$NAMESPACE"
kubectl rollout restart deployment/product-service -n "$NAMESPACE"
kubectl rollout restart deployment/cart-service -n "$NAMESPACE"
kubectl rollout restart deployment/mail-service -n "$NAMESPACE"
kubectl rollout restart deployment/postgres -n "$NAMESPACE"
kubectl rollout restart deployment/mongodb -n "$NAMESPACE"
kubectl rollout restart deployment/error-trigger -n "$NAMESPACE"

echo "Done. Open http://$DOMAIN/ (no hosts entry needed when using nip.io)."