# CanaryGuard Demo Runbook

Step-by-step guide to execute the demo: v1 (healthy) -> v2 canary (broken auth) -> rollback to v1.

---

## Prerequisites

Make sure the following are already running on the cluster:
- PostgreSQL, MongoDB (data layer)
- Prometheus + Grafana + kube-state-metrics (metrics & dashboards — via Helm)
- Loki + Promtail (logs)
- Jaeger (traces)
- OTel Collector (trace pipeline)

### Install Prometheus + Grafana with persistent storage

```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update
helm upgrade --install prometheus prometheus-community/kube-prometheus-stack \
  -n ecommerce --create-namespace \
  -f k8deploy/prometheus-values.yaml
```

This creates persistent volumes for Prometheus TSDB (5Gi) and Grafana (2Gi) so data survives pod restarts.

```bash
# Verify core infra is up
kubectl get pods
kubectl get svc
```

### Build and push app images (v1 + v2)

```bash
# v1 (stable)
docker build -t us-central1-docker.pkg.dev/canaryguard-bda/canaryguard/trendtrove-app:latest .
docker push us-central1-docker.pkg.dev/canaryguard-bda/canaryguard/trendtrove-app:latest

# v2 (same code, different tag — FAIL_MODE=auth is set via env var, not baked in)
docker tag us-central1-docker.pkg.dev/canaryguard-bda/canaryguard/trendtrove-app:latest \
           us-central1-docker.pkg.dev/canaryguard-bda/canaryguard/trendtrove-app:v2
docker push us-central1-docker.pkg.dev/canaryguard-bda/canaryguard/trendtrove-app:v2
```

### Deploy base infrastructure (one-time)

```bash
kubectl apply -f k8deploy/secrets.yaml
kubectl apply -f k8deploy/configmap.yaml
kubectl apply -f k8deploy/postgres.yaml
kubectl apply -f k8deploy/mongodb.yaml
kubectl apply -f k8deploy/auth.yaml
kubectl apply -f k8deploy/product.yaml
kubectl apply -f k8deploy/cart.yaml
kubectl apply -f k8deploy/mail.yaml
kubectl apply -f k8deploy/ingress.yaml
kubectl apply -f k8deploy/servicemonitors.yaml
kubectl apply -f k8deploy/loki-stack.yaml
kubectl apply -f k8deploy/jaeger.yaml
kubectl apply -f k8deploy/otel-collector.yaml
```

### Deploy error-trigger service (optional fallback — for manual chaos injection)

```bash
kubectl apply -f k8deploy/error-trigger.yaml
```

### Import Grafana dashboards

Import these JSON files into Grafana (Settings > Dashboards > Import):
- `k6/main-dashboard.json` — Operations Centre (primary demo dashboard)
- `k6/failure-detection-dashboard.json` — Cart & Auth Health
- `k6/grafana-dashboard.json` — Application Observability
- `k6/service-graph-dashboard.json` — Service Graph

### Port-forward Grafana and Prometheus (if not exposed via ingress)

```bash
# Grafana (open http://localhost:3001)
kubectl port-forward svc/grafana 3001:80

# Prometheus (open http://localhost:9090)
kubectl port-forward svc/prometheus-kube-prometheus-prometheus 9090:9090

# Jaeger (open http://localhost:16686)
kubectl port-forward svc/jaeger-query 16686:16686
```

### Demo traffic script

The demo uses one script for both steps:

| Script | What it does |
|--------|-------------|
| `k6/no-chaos/heavy-commerce-mix.js` | Heavy realistic mix — anonymous browsing + catalogue + repeat customers + full purchase flow. No chaos log injection. |

Run locally:
```bash
k6 run k6/no-chaos/heavy-commerce-mix.js
```

---

## Step 1: Deploy v1 (Healthy Baseline — 100% traffic)

### 1.1 Deploy the stable app

```bash
kubectl apply -f k8deploy/app.yaml
```

### 1.2 Wait for it to be ready

```bash
kubectl rollout status deployment/trendtrove-app
```

### 1.3 Generate traffic

```bash
k6 run k6/no-chaos/heavy-commerce-mix.js
```

### 1.4 Monitor pods and logs while traffic runs

```bash
# Watch pods in real-time
kubectl get pods -w

# Stream app logs
kubectl logs -f deployment/trendtrove-app
```

### 1.5 Show the dashboard

Open Grafana and show:
- **Operations Centre**: all green, low error rate, healthy purchase funnel
- **Cart & Auth Health**: both services active, zero errors
- Point out: "This is our stable v1 — 100% of traffic hits it, everything works."

---

## Step 2: Deploy v2 Canary (Broken Signup — 10% traffic)

> v2 runs the same image with `FAIL_MODE=auth` — all `/auth` routes return 500.

### 2.1 Deploy v2 canary + ingress split + controller

```bash
# Deploy the broken canary
kubectl apply -f k8deploy/app-v2.yaml

# Route 10% traffic to v2
kubectl apply -f k8deploy/ingress-canary.yaml

# Start the canary controller (monitors v2 error rate)
kubectl apply -f k8deploy/canary-controller.yaml
```

### 2.2 Wait for v2 to be ready

```bash
kubectl rollout status deployment/trendtrove-app-v2
```

### 2.3 Generate traffic (same no-chaos script)

```bash
k6 run k6/no-chaos/heavy-commerce-mix.js
```

### 2.3.1 Monitor traffic and v2 pod

```bash
# Watch v2 pod logs (you'll see 500 errors on /auth routes)
kubectl logs -f deployment/trendtrove-app-v2

# Quick check: are 5xx errors showing up in Prometheus?
kubectl port-forward svc/prometheus-kube-prometheus-prometheus 9090:9090
# Then query: rate(http_requests_total{service="app-service-v2",status_code=~"5.."}[1m])
```

### 2.4 Show the dashboard

Open Grafana and point out:
- **Operations Centre**: error rate climbing, auth error spikes in "Error Rate by Service"
- **Cart & Auth Health**: auth service errors lighting up red, cart still green
- **Live Error Feed**: `Auth service unavailable (FAIL_MODE=auth)` messages
- Point out: "10% of traffic is going to v2 and it's failing signup — the dashboard caught it immediately."

### 2.5 Show canary controller logs (auto-rollback)

```bash
kubectl logs canary-controller -f
```

The controller should detect error rate > 5% and trigger rollback automatically. If you want to show manual awareness before auto-rollback, skip deploying the controller and just show the dashboard.

---

## Step 3: Rollback to v1 (Clean Dashboard)

### 3.1 Tear down v2 canary

```bash
kubectl delete -f k8deploy/ingress-canary.yaml --ignore-not-found
kubectl delete pod canary-controller --ignore-not-found
kubectl delete -f k8deploy/app-v2.yaml --ignore-not-found
```

### 3.2 Verify only v1 is running

```bash
kubectl get deployments
# Should only show: trendtrove-app, trendtrove-auth, product-service, cart-service, mail-service
```

### 3.3 Generate clean traffic

```bash
k6 run k6/no-chaos/heavy-commerce-mix.js
```

### 3.4 Show the dashboard

- **Operations Centre**: back to all green, zero errors, healthy funnel
- Point out: "We rolled back — 100% of traffic is on v1 again and the dashboard confirms a clean, healthy system."

---

## Useful Grafana / Loki / Prometheus Queries

Use these to manually verify things during the demo if needed.

### Loki (Explore > Loki datasource)

```logql
# All errors across services
{app=~"trendtrove-app|trendtrove-app-v2|cart-service|trendtrove-auth"} | json | level="ERROR"

# v2 auth errors specifically
{app="trendtrove-app-v2"} | json | level="ERROR"

# Cart events (item added, checkout, payment)
{app=~"trendtrove-app|cart-service"} | json | event=~"cart.*|checkout.*|payment.*"

# Auth events (login, signup, logout)
{app="trendtrove-auth"} | json | event=~"user.*"

# Orders per minute (checkout initiated)
sum(count_over_time({app=~"trendtrove-app|cart-service"} | json | event="checkout.initiated" [1m]))
```

### Prometheus (Explore > Prometheus datasource)

```promql
# Request rate by service
sum by (service) (rate(http_requests_total[1m]))

# Error rate for v2 canary
sum(rate(http_requests_total{service="app-service-v2",status_code=~"5.."}[1m]))

# p95 latency
histogram_quantile(0.95, sum by (le) (rate(http_request_duration_seconds_bucket{job="app-service"}[5m]))) * 1000

# Pod restarts (canary crash detection)
sum(kube_pod_container_status_restarts_total{pod=~"trendtrove-app-v2.*"})
```

---

## Talking Points During Demo

| Step | Key Message |
|------|-------------|
| v1 (100%) | "This is our baseline — observability confirms everything is healthy." |
| v2 canary (10%) | "A bad canary broke auth — Grafana caught it in real-time, canary controller auto-rolled back." |
| Rollback | "Back to stable — dashboard confirms full recovery." |

## Quick Reference: What Each Version Does

| Version | FAIL_MODE | Signup | Cart | Image Tag |
|---------|-----------|--------|------|-----------|
| v1 | none | Works | Works | `latest` |
| v2 | `auth` | Broken (500) | Works | `v2` |

## Troubleshooting

**Canary controller not detecting errors:**
```bash
kubectl port-forward svc/prometheus-kube-prometheus-prometheus 9090:9090
# Visit http://localhost:9090 and query: http_requests_total{service="app-service-v2"}
```

**Ingress not routing to canary:**
```bash
kubectl get ingress
# Should show both trendtrove-ingress and the canary ingress
```

**Dashboard not showing canary data:**
- Make sure ServiceMonitors are applied: `kubectl apply -f k8deploy/servicemonitors.yaml`
- Re-import the dashboard JSON files into Grafana

**k6 not installed locally:**
```bash
# macOS
brew install k6

# or run via Docker
docker run --rm -i grafana/k6 run - < k6/no-chaos/heavy-commerce-mix.js
```

---

## Manual Chaos Injection (Optional Fallback)

If the error-trigger service is deployed, you can manually inject error logs:

```bash
# Inject an auth error log
curl "http://34.122.199.244.nip.io/auth/chaos/log?level=ERROR&category=auth&event=auth.failed&message=Manual+auth+failure+injection"

# Inject a cart error log
curl "http://34.122.199.244.nip.io/cart/chaos/log?level=ERROR&category=cart_checkout&event=cart.sync.failed&message=Manual+cart+failure+injection"

# Inject a payment error log
curl "http://34.122.199.244.nip.io/cart/chaos/log?level=ERROR&category=payment_fraud&event=payment.failed&message=Stripe+payment+declined"
```

---

## Full Cleanup (tear down everything)

```bash
# Remove canary deployment + ingress + controller
kubectl delete -f k8deploy/app-v2.yaml --ignore-not-found
kubectl delete -f k8deploy/ingress-canary.yaml --ignore-not-found
kubectl delete pod canary-controller --ignore-not-found
kubectl delete configmap canary-controller-script --ignore-not-found

# Remove error trigger
kubectl delete -f k8deploy/error-trigger.yaml --ignore-not-found
```
