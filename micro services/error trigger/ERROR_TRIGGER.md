# Error Trigger Service Cheat Sheet

## How to call the trigger (port-forwarded to 2000)

Forward once:
```
kubectl port-forward -n trendtrove svc/error-trigger 2000:2000
```

Fire a forced login failure (hits auth chaos endpoint and emits `chaos.triggered` + `user.login.failure`):
```
curl.exe "http://127.0.0.1:2000/trigger/auth/login-fail?reason=invalid_credentials"
```
Change `reason=` to any text (e.g., `account_locked`, `mfa_required`).

Health check:
```
curl.exe http://127.0.0.1:2000/healthz
```

Level-specific demo logs (no app impact):
```
curl.exe "http://127.0.0.1:2000/trigger/log/debug?service=trendtrove-app&category=system&message=debug-demo"
curl.exe "http://127.0.0.1:2000/trigger/log/info?service=trendtrove-app&category=system&message=info-demo"
curl.exe "http://127.0.0.1:2000/trigger/log/warn?service=trendtrove-app&category=system&message=warn-demo"
curl.exe "http://127.0.0.1:2000/trigger/log/error?service=trendtrove-app&category=system&message=error-demo"
curl.exe "http://127.0.0.1:2000/trigger/log/fatal?service=trendtrove-app&category=system&message=fatal-demo"
```
You can change `service=`, `category=`, `message=`, and `event=` as needed. Accepted levels: DEBUG, INFO, WARN, ERROR, FATAL.

Per-service examples (forwarded to target pods so logs appear in their containers):
```
# App
curl.exe "http://127.0.0.1:2000/trigger/app/log?level=debug&category=system&message=app-debug-demo"

# Auth
curl.exe "http://127.0.0.1:2000/trigger/auth/log?level=error&category=user_session&message=auth-error-demo"

# Product
curl.exe "http://127.0.0.1:2000/trigger/product/log?level=warn&category=system&message=product-warn-demo"

# Cart
curl.exe "http://127.0.0.1:2000/trigger/cart/log?level=info&category=cart_checkout&message=cart-info-demo"

# Mail
curl.exe "http://127.0.0.1:2000/trigger/mail/log?level=error&category=integration&message=mail-error-demo"
```

## Where to see the logs

Error-trigger service:
```
kubectl logs -n trendtrove deploy/error-trigger -f
```
Auth service (forwarded events):
```
kubectl logs -n trendtrove deploy/trendtrove-auth -f
```

## Env vars
- `PORT` (default `2000`)
- `AUTH_BASE` (default `http://auth-service:3000`)
- `AUTH_TRIGGER_PATH` (default `/chaos/trigger`)
- `APP_BASE` (default `http://app-service:3000`)
- `PRODUCT_BASE` (default `http://product-service:3000`)
- `CART_BASE` (default `http://cart-service:3000`)
- `MAIL_BASE` (default `http://mail-service:3000`)
- `SERVICE_NAME` (default `error-trigger`)
- `SERVICE_VERSION` (default `1.0.0`)
- `NODE_ENV` (default `development`)

## No chaos flags
All logging triggers now come solely from this error-trigger service hitting the auth `/chaos/trigger` endpoint. No config flags are required.

## Expected log schema

All logs are single-line JSON with the base envelope fields:
`timestamp, level, service, version, environment, trace_id, span_id, request_id, user_id, session_id, category, event, message, duration_ms, http, error, tags`.

Category-specific objects:
- `user_session` includes `auth_method, failure_reason, ip_address, device_type`.
- `system` is used for `session.store.unavailable` and `chaos.triggered`.
- `integration` is used for `integration.oauth.error` (provider_down).
