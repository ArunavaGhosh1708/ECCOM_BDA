/**
 * canary-cart-test.js  (NO chaos log injection)
 *
 * Targets the v3 canary to surface cart failures using ONLY real user
 * flows — signup → login → add-to-cart → checkout. No /chaos/log
 * injection, so every ERROR log and every 5xx metric comes from an
 * actual HTTP request a user could have made.
 *
 * Use this variant to validate that the failure signal is visible from
 * production-like traffic alone, without synthetic events.
 *
 * Run with:  k6 run k6/no-chaos/canary-cart-test.js
 *
 * Grafana queries:
 *   Loki:       {app="trendtrove-app-v3", level="ERROR"}
 *   Prometheus: rate(http_requests_total{status_code=~"5..",service="app-service-v3"}[1m])
 */

import http from 'k6/http';
import { sleep, check } from 'k6';
import { Rate, Counter, Trend } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://34.122.199.244.nip.io';

const errorRate        = new Rate('error_rate');
const cart5xxRate      = new Rate('cart_5xx_rate');
const cartAdditions    = new Counter('cart_additions');
const checkoutAttempts = new Counter('checkout_attempts');
const cartLatency      = new Trend('cart_latency_ms');

let total2xx = 0, total5xx = 0;
let cartOk = 0, cart5xx = 0;

export const options = {
    scenarios: {
        cart_flow: {
            executor: 'ramping-vus',
            startVUs: 0,
            stages: [
                { duration: '20s', target: 5 },
                { duration: '2m',  target: 5 },
                { duration: '10s', target: 0 },
            ],
            exec: 'cartFlow',
        },
    },
    thresholds: {
        http_req_failed: ['rate<0.25'],
        cart_5xx_rate:   ['rate<0.20'],
    },
};

const PRODUCT_IDS = [1, 2, 3, 4, 5, 6];
const SIZES = ['S', 'M', 'L'];

function randInt(min, max)   { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randFloat(min, max) { return Math.random() * (max - min) + min; }
function randomProduct()     { return PRODUCT_IDS[Math.floor(Math.random() * PRODUCT_IDS.length)]; }

// ─── Signup → Login → Add to cart → View cart → Checkout ─────────────────
export function cartFlow() {
    const jar    = http.cookieJar();
    const params = { jar, redirects: 5 };

    const email    = `cart_test_${__VU}_${__ITER}@loadtest.io`;
    const password = 'Password123!';

    let res = http.post(`${BASE_URL}/auth/signup`,
        { name: `Cart Tester ${__VU}`, email, password, confirmPassword: password },
        params
    );
    const is5xx = res.status >= 500;
    errorRate.add(is5xx);
    check(res, { 'signup: not 5xx (v3 auth should work)': (r) => r.status < 500 });
    if (is5xx) { total5xx++; } else { total2xx++; }

    sleep(randFloat(0.5, 1));

    res = http.post(`${BASE_URL}/auth/login`, { email, password }, params);
    errorRate.add(res.status >= 500);
    check(res, { 'login: not 5xx': (r) => r.status < 500 });

    sleep(randFloat(0.5, 1));

    http.get(`${BASE_URL}/products`, params);
    sleep(randFloat(0.3, 0.8));

    const addCount = randInt(1, 3);
    for (let i = 0; i < addCount; i++) {
        const id    = randomProduct();
        const start = Date.now();
        res = http.post(
            `${BASE_URL}/cart/product/${id}/create`,
            { productId: String(id), quantity: '1', size: SIZES[randInt(0, 2)] },
            params
        );
        cartLatency.add(Date.now() - start);
        const cartFail = res.status >= 500;
        cart5xxRate.add(cartFail);
        errorRate.add(cartFail);
        check(res, { 'cart add: not 5xx (v3 broken if fails)': (r) => !cartFail });
        if (cartFail) { cart5xx++; } else { cartOk++; cartAdditions.add(1); }
        sleep(randFloat(0.3, 0.8));
    }

    res = http.get(`${BASE_URL}/cart`, params);
    cart5xxRate.add(res.status >= 500);
    check(res, { 'cart view: not 5xx': (r) => r.status < 500 });

    sleep(randFloat(0.5, 1));

    res = http.get(`${BASE_URL}/cart/checkout`, params);
    cart5xxRate.add(res.status >= 500);
    checkoutAttempts.add(1);
    check(res, { 'checkout: not 5xx': (r) => r.status < 500 });

    sleep(randFloat(1, 2));

    http.get(`${BASE_URL}/auth/logout`, params);
    sleep(1);
}

export function handleSummary(data) {
    const rate5xx  = total5xx / Math.max(total2xx + total5xx, 1);
    const cartRate = cart5xx  / Math.max(cartOk + cart5xx, 1);
    console.log(`
=== CANARY v3 CART TEST SUMMARY (NO CHAOS) ===
Auth:
  Healthy -> 2xx    : ${total2xx}

Cart:
  OK      -> 2xx    : ${cartOk}
  Broken  -> 500 v3 : ${cart5xx}
  cart_5xx_rate     : ${(cartRate*100).toFixed(1)}%

Overall 5xx rate    : ${(rate5xx*100).toFixed(1)}%

--- Grafana / Loki queries ---
  {app="trendtrove-app-v3", level="ERROR"}
  rate(http_requests_total{status_code=~"5..",service="app-service-v3"}[1m])
===================================
`);
    return {};
}
