import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Counter } from 'k6/metrics';
import { randomItem } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';

/**
 * Chaos/error probe that:
 *  - Hits each service's chaos endpoint (or auth login-fail trigger)
 *  - Emits ERROR-level logs you can see in Loki/Promtail
 *  - Records per-service latency and failure rates with thresholds
 *
 * Override any service URL via environment variables when running:
 *   APP_URL, AUTH_URL, PRODUCT_URL, CART_URL, MAIL_URL, ERROR_TRIGGER_URL, AUTH_TRIGGER_URL
 *
 * Example (ingress-hosted):
 *   APP_URL=https://your-host/chaos/log AUTH_URL=https://your-host/auth/chaos/log \
 *   PRODUCT_URL=https://your-host/products/chaos/log CART_URL=https://your-host/cart/chaos/log \
 *   MAIL_URL=https://your-host/mail/chaos/log ERROR_TRIGGER_URL=https://your-host/error/trigger/log/ERROR \
 *   AUTH_TRIGGER_URL=https://your-host/auth/chaos/trigger \
 *   k6 run chaos-errors-measurable.js
 */

const services = [
    { name: 'app', url: __ENV.APP_URL || 'http://app-service:3000/chaos/log' },
    { name: 'auth', url: __ENV.AUTH_URL || 'http://auth-service:3000/chaos/log' },
    { name: 'product', url: __ENV.PRODUCT_URL || 'http://product-service:3000/chaos/log' },
    { name: 'cart', url: __ENV.CART_URL || 'http://cart-service:3000/chaos/log' },
    { name: 'mail', url: __ENV.MAIL_URL || 'http://mail-service:3000/chaos/log' },
    // error-trigger sidecar (forwards to services)
    { name: 'error-trigger', url: __ENV.ERROR_TRIGGER_URL || 'http://error-trigger:2000/trigger/log/ERROR' },
    // auth chaos trigger that simulates login failure
    { name: 'auth-login-fail', url: __ENV.AUTH_TRIGGER_URL || 'http://auth-service:3000/chaos/trigger', post: true },
];

const latency = new Trend('latency_ms', true);
const failures = new Counter('failures');

export const options = {
    vus: 5,
    duration: '2m',
    thresholds: {
        'http_req_failed{service:app}': ['rate<0.05'],
        'http_req_failed{service:auth}': ['rate<0.05'],
        'http_req_failed{service:product}': ['rate<0.05'],
        'http_req_failed{service:cart}': ['rate<0.05'],
        'http_req_failed{service:mail}': ['rate<0.05'],
        'latency_ms{service:app}': ['p(95)<1500'],
        'latency_ms{service:auth}': ['p(95)<1500'],
        'latency_ms{service:product}': ['p(95)<1500'],
        'latency_ms{service:cart}': ['p(95)<1500'],
        'latency_ms{service:mail}': ['p(95)<1500'],
    },
};

export default function () {
    const t = randomItem(services);
    let res;

    if (t.post) {
        res = http.post(
            t.url,
            null,
            { params: { reason: 'k6-demo' }, tags: { service: t.name } }
        );
    } else {
        const url = `${t.url}?level=ERROR&category=system&event=chaos.k6&message=k6%20dummy%20error`;
        res = http.get(url, { tags: { service: t.name } });
    }

    const ok = check(
        res,
        { 'status 2xx/3xx': (r) => r.status >= 200 && r.status < 400 },
        { service: t.name }
    );

    latency.add(res.timings.duration, { service: t.name });
    if (!ok) failures.add(1, { service: t.name });

    sleep(1);
}
