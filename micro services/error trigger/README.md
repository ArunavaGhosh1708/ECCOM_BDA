# Error Trigger Service

Small internal gateway to fire structured chaos/telemetry events without touching app flows.

## Endpoints
- `GET /trigger/auth/login-fail?reason=<text>`  
  Forwards to the auth service chaos endpoint and logs two events:
  - `chaos.triggered` (category `system`, level `ERROR`, tags `trigger=auth-chaos-endpoint`, `reason`)
  - `user.login.failure` (category `user_session`, level `WARN`, with `auth_method=password`, `failure_reason=<reason>`, `ip_address`, `device_type=web`)

- `GET /healthz` – basic liveness probe.

## Environment Variables
- `PORT` (default `2000`)
- `AUTH_BASE` (default `http://auth-service:3000`) – in-cluster URL to auth service
- `AUTH_TRIGGER_PATH` (default `/chaos/trigger`)
- `SERVICE_NAME` (default `error-trigger`)
- `SERVICE_VERSION` (default `1.0.0`)
- `NODE_ENV` (default `development`)

## Usage
Port-forward (if running locally without ingress):
```sh
kubectl port-forward -n trendtrove svc/error-trigger 2000:2000
```

Trigger auth login failure log:
```sh
curl "http://127.0.0.1:2000/trigger/auth/login-fail?reason=test"
```

View logs:
```sh
kubectl logs -n trendtrove deploy/error-trigger -f
kubectl logs -n trendtrove deploy/trendtrove-auth -f   # see forwarded events
```

## Log Format
Single-line JSON compatible with the telemetry schema:
- Base fields: `timestamp, level, service, version, environment, trace_id, span_id, request_id, user_id, session_id, category, event, message, duration_ms, http, error, tags`.
- For `user.login.failure` the `user_session` object includes: `auth_method, failure_reason, ip_address, device_type`.

These logs can be shipped to any centralized backend (e.g., Loki/ELK) via container stdout.
