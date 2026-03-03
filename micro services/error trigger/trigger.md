# Trigger Guide (Error Trigger Service)

Use this service to generate structured logs in each service pod without touching real business flows.

## 1) Port-forward (if needed)
```
kubectl port-forward -n trendtrove svc/error-trigger 2000:2000
```

## 2) Fire per-service logs (these hit the target service so logs appear in that pod)
- App:
  ```
  curl.exe "http://127.0.0.1:2000/trigger/app/log?level=debug&category=system&message=app-debug-demo"
  ```
- Auth:
  ```
  curl.exe "http://127.0.0.1:2000/trigger/auth/log?level=error&category=user_session&message=auth-error-demo"
  ```
- Product:
  ```
  curl.exe "http://127.0.0.1:2000/trigger/product/log?level=warn&category=system&message=product-warn-demo"
  ```
- Cart:
  ```
  curl.exe "http://127.0.0.1:2000/trigger/cart/log?level=info&category=cart_checkout&message=cart-info-demo"
  ```
- Mail:
  ```
  curl.exe "http://127.0.0.1:2000/trigger/mail/log?level=error&category=integration&message=mail-error-demo"
  ```

Parameters you can override on any call:
- `level`: DEBUG|INFO|WARN|ERROR|FATAL
- `category`: system|user_session|cart_checkout|integration|payment_fraud (or any string your telemetry accepts)
- `event`: optional, default `chaos.<level>`
- `message`: free text

## 3) Auth login-fail trigger (writes to auth pod)
```
curl.exe "http://127.0.0.1:2000/trigger/auth/login-fail?reason=test"
```
Emits `chaos.triggered` (system/ERROR) + `user.login.failure` (user_session/WARN) in the auth pod.

## 4) Local-only demo logs (stay in error-trigger pod)
```
curl.exe "http://127.0.0.1:2000/trigger/log/debug?service=demo&category=system&message=demo"
```

## 5) Check pods for output
```
kubectl logs -n trendtrove deploy/error-trigger -f
kubectl logs -n trendtrove deploy/trendtrove-app -f
kubectl logs -n trendtrove deploy/trendtrove-auth -f
kubectl logs -n trendtrove deploy/product-service -f
kubectl logs -n trendtrove deploy/cart-service -f
kubectl logs -n trendtrove deploy/mail-service -f
```

## 6) Env vars (error-trigger)
- `PORT` (default 2000)
- `AUTH_BASE` (default http://auth-service:3000)
- `AUTH_TRIGGER_PATH` (default /chaos/trigger)
- `APP_BASE` (default http://app-service:3000)
- `PRODUCT_BASE` (default http://product-service:3000)
- `CART_BASE` (default http://cart-service:3000)
- `MAIL_BASE` (default http://mail-service:3000)
- `SERVICE_NAME` (default error-trigger)
- `SERVICE_VERSION` (default 1.0.0)
- `NODE_ENV` (default development)

## 7) Redeploy after changes
```
powershell -ExecutionPolicy Bypass -File .\deploy-local.ps1
kubectl rollout status deploy/error-trigger -n trendtrove
```
