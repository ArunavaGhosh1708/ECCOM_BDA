/**
 * heavy-commerce-mix.js (NO CHAOS)
 *
 * Heavy mixed traffic generator for realistic canary demos:
 * - Anonymous browsing
 * - Catalogue browsing
 * - Repeat customers
 * - Full purchase flow
 *
 * No /chaos/log calls are made in this script.
 *
 * Run:
 *   k6 run k6/no-chaos/heavy-commerce-mix.js
 *
 * Useful overrides:
 *   BASE_URL=http://34.122.199.244.nip.io
 *   TEST_DURATION=6m
 *   BROWSE_RPS=80
 *   CATALOG_RPS=55
 *   REPEAT_RPS=35
 *   PURCHASE_RPS=18
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://34.122.199.244.nip.io';
const TEST_DURATION = __ENV.TEST_DURATION || '6m';

const BROWSE_RPS = Number(__ENV.BROWSE_RPS || 80);
const CATALOG_RPS = Number(__ENV.CATALOG_RPS || 55);
const REPEAT_RPS = Number(__ENV.REPEAT_RPS || 35);
const PURCHASE_RPS = Number(__ENV.PURCHASE_RPS || 18);

const PRODUCT_IDS = [1, 2, 3, 4, 5, 6];
const CATEGORIES = ['shirts', 'pants', 'shoes', 'accessories'];
const SORT_OPTIONS = ['price', 'name', 'createdAt'];
const SIZES = ['S', 'M', 'L'];

const appErrorRate = new Rate('app_error_rate');
const auth5xxRate = new Rate('auth_5xx_rate');
const cart5xxRate = new Rate('cart_5xx_rate');
const browseLatency = new Trend('browse_latency_ms', true);
const purchaseLatency = new Trend('purchase_latency_ms', true);
const signups = new Counter('signups');
const logins = new Counter('logins');
const cartAdds = new Counter('cart_adds');
const checkouts = new Counter('checkouts');

export const options = {
    scenarios: {
        anonymous_browsing_heavy: {
            executor: 'constant-arrival-rate',
            rate: BROWSE_RPS,
            timeUnit: '1s',
            duration: TEST_DURATION,
            preAllocatedVUs: 110,
            maxVUs: 250,
            exec: 'anonymousBrowsing',
        },
        catalogue_browsing_heavy: {
            executor: 'constant-arrival-rate',
            rate: CATALOG_RPS,
            timeUnit: '1s',
            duration: TEST_DURATION,
            preAllocatedVUs: 90,
            maxVUs: 210,
            exec: 'catalogueBrowsing',
        },
        repeat_customers_heavy: {
            executor: 'constant-arrival-rate',
            rate: REPEAT_RPS,
            timeUnit: '1s',
            duration: TEST_DURATION,
            preAllocatedVUs: 70,
            maxVUs: 160,
            exec: 'repeatCustomerFlow',
        },
        purchase_flow_heavy: {
            executor: 'constant-arrival-rate',
            rate: PURCHASE_RPS,
            timeUnit: '1s',
            duration: TEST_DURATION,
            preAllocatedVUs: 60,
            maxVUs: 140,
            exec: 'purchaseFlow',
        },
    },
    thresholds: {
        http_req_failed: ['rate<0.35'],
        http_req_duration: ['p(95)<5000'],
        app_error_rate: ['rate<0.40'],
    },
};

function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function rand(min, max) {
    return Math.random() * (max - min) + min;
}

function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function record(res, trend) {
    appErrorRate.add(res.status >= 500);
    if (trend) trend.add(res.timings.duration);
}

function getAuthEmail(seed) {
    return `heavy_user_${seed}@loadtest.io`;
}

export function anonymousBrowsing() {
    group('anonymous: home + browse', () => {
        const responses = http.batch([
            ['GET', `${BASE_URL}/`],
            ['GET', `${BASE_URL}/products`],
            ['GET', `${BASE_URL}/about`],
        ]);
        for (const res of responses) {
            record(res, browseLatency);
            check(res, { 'anonymous page responds': (r) => r.status < 500 });
        }
    });

    const detailCount = randInt(2, 6);
    for (let i = 0; i < detailCount; i++) {
        const res = http.get(`${BASE_URL}/products/${pick(PRODUCT_IDS)}`);
        record(res, browseLatency);
        sleep(rand(0.1, 0.4));
    }
}

export function catalogueBrowsing() {
    const queries = [
        `/products?category=${pick(CATEGORIES)}`,
        `/products?sortBy=${pick(SORT_OPTIONS)}`,
        `/products?page=${randInt(1, 5)}&size=12`,
        `/products?priceMin=${randInt(10, 100)}&priceMax=${randInt(120, 1000)}`,
        `/products?search=${pick(['shirt', 'jacket', 'jeans', 'sneaker'])}`,
    ];

    const requestCount = randInt(5, 10);
    for (let i = 0; i < requestCount; i++) {
        const listRes = http.get(`${BASE_URL}${pick(queries)}`);
        record(listRes, browseLatency);

        const detailRes = http.get(`${BASE_URL}/products/${pick(PRODUCT_IDS)}`);
        record(detailRes, browseLatency);
        sleep(rand(0.05, 0.25));
    }
}

export function purchaseFlow() {
    const jar = http.cookieJar();
    const params = { jar, redirects: 5 };
    const email = `${getAuthEmail(`purchase_${__VU}_${__ITER}_${Date.now()}`)}`;
    const password = 'HeavyLoadPass123!';

    group('purchase: signup + login', () => {
        let res = http.post(
            `${BASE_URL}/auth/signup`,
            { name: `Heavy Buyer ${__VU}`, email, password, confirmPassword: password },
            params
        );
        signups.add(1);
        auth5xxRate.add(res.status >= 500);
        record(res, purchaseLatency);

        res = http.post(`${BASE_URL}/auth/login`, { email, password }, params);
        logins.add(1);
        auth5xxRate.add(res.status >= 500);
        record(res, purchaseLatency);
    });

    group('purchase: browse + cart', () => {
        const browseRes = http.get(`${BASE_URL}/products`, params);
        record(browseRes, purchaseLatency);

        const addCount = randInt(2, 5);
        for (let i = 0; i < addCount; i++) {
            const id = pick(PRODUCT_IDS);
            const addRes = http.post(
                `${BASE_URL}/cart/product/${id}/create`,
                { productId: String(id), quantity: String(randInt(1, 2)), size: pick(SIZES) },
                params
            );
            cartAdds.add(1);
            cart5xxRate.add(addRes.status >= 500);
            record(addRes, purchaseLatency);
            sleep(rand(0.1, 0.35));
        }
    });

    group('purchase: checkout', () => {
        const checkoutPage = http.get(`${BASE_URL}/cart/checkout`, params);
        checkouts.add(1);
        cart5xxRate.add(checkoutPage.status >= 500);
        record(checkoutPage, purchaseLatency);

        if (Math.random() < 0.55) {
            const submit = http.post(`${BASE_URL}/cart/checkout`, {}, params);
            cart5xxRate.add(submit.status >= 500);
            record(submit, purchaseLatency);
        }
    });

    http.get(`${BASE_URL}/auth/logout`, params);
    sleep(rand(0.1, 0.5));
}

export function repeatCustomerFlow() {
    const jar = http.cookieJar();
    const params = { jar, redirects: 5 };

    const accountId = ((__VU - 1) % 400) + 1;
    const email = getAuthEmail(`repeat_${accountId}`);
    const password = 'HeavyLoadPass123!';

    // If account does not exist yet, create it once on demand.
    let loginRes = http.post(`${BASE_URL}/auth/login`, { email, password }, params);
    if (loginRes.status >= 500 || loginRes.status === 401 || loginRes.status === 404) {
        const signupRes = http.post(
            `${BASE_URL}/auth/signup`,
            { name: `Repeat ${accountId}`, email, password, confirmPassword: password },
            params
        );
        signups.add(1);
        auth5xxRate.add(signupRes.status >= 500);
        record(signupRes, purchaseLatency);

        loginRes = http.post(`${BASE_URL}/auth/login`, { email, password }, params);
    }

    logins.add(1);
    auth5xxRate.add(loginRes.status >= 500);
    record(loginRes, purchaseLatency);

    const quickAdds = randInt(1, 3);
    for (let i = 0; i < quickAdds; i++) {
        const id = pick(PRODUCT_IDS);
        const res = http.post(
            `${BASE_URL}/cart/product/${id}/create`,
            { productId: String(id), quantity: '1', size: pick(SIZES) },
            params
        );
        cartAdds.add(1);
        cart5xxRate.add(res.status >= 500);
        record(res, purchaseLatency);
        sleep(rand(0.05, 0.2));
    }

    const cartView = http.get(`${BASE_URL}/cart`, params);
    record(cartView, purchaseLatency);

    const checkout = http.get(`${BASE_URL}/cart/checkout`, params);
    checkouts.add(1);
    cart5xxRate.add(checkout.status >= 500);
    record(checkout, purchaseLatency);

    http.get(`${BASE_URL}/auth/logout`, params);
    sleep(rand(0.05, 0.25));
}
