/**
 * canary-auth-test.js  (NO chaos log injection)
 *
 * Targets the v2 canary to surface auth failures using ONLY real HTTP
 * traffic against /auth routes. No /chaos/log calls — every ERROR line
 * in Loki and every 5xx in Prometheus comes from an actual user flow.
 *
 * Use this variant when you want to validate that the failure signal is
 * visible purely from production-like traffic, without synthetic events.
 *
 * Run with:  k6 run k6/no-chaos/canary-auth-test.js
 *
 * Grafana queries to watch while running:
 *   Loki:       {app="trendtrove-app-v2", level="ERROR"}
 *   Prometheus: rate(http_requests_total{status_code=~"5..",service="app-service-v2"}[1m])
 */

import http from 'k6/http';
import { sleep, check, group } from 'k6';
import { Rate, Counter, Trend } from 'k6/metrics';

const BASE_URL = 'http://34.122.199.244.nip.io';

const auth500Rate     = new Rate('auth_5xx_rate');
const auth302Rate     = new Rate('auth_redirect_rate');
const loginSuccess    = new Counter('login_success');
const loginFail5xx    = new Counter('login_fail_5xx');
const loginFail4xx    = new Counter('login_fail_redirect');
const signupSuccess   = new Counter('signup_success');
const signupFail5xx   = new Counter('signup_fail_5xx');
const authLatency     = new Trend('auth_latency_ms', true);

export const options = {
    scenarios: {
        // Ramps up valid user flows through /auth — ~50% will hit v2 and get 500
        valid_auth_flow: {
            executor: 'ramping-vus',
            startVUs: 0,
            stages: [
                { duration: '30s', target: 20 },
                { duration: '2m',  target: 20 },
                { duration: '30s', target: 0  },
            ],
            exec: 'validAuthFlow',
            tags: { scenario: 'valid_auth' },
        },

        // Constant stream of bad-credential attempts — reveals v2 vs v1 difference:
        // v1 → 302 redirect back to /auth/login (correct)
        // v2 → 500 (broken)
        bad_credentials: {
            executor: 'constant-arrival-rate',
            rate: 20,
            timeUnit: '1s',
            duration: '3m',
            preAllocatedVUs: 25,
            exec: 'badCredentials',
            tags: { scenario: 'bad_creds' },
        },
    },

    thresholds: {
        http_req_duration: ['p(95)<5000'],
        auth_5xx_rate:     ['rate<0.95'],
    },
};

function pick(arr)             { return arr[Math.floor(Math.random() * arr.length)]; }
function randFloat(min, max)   { return Math.random() * (max - min) + min; }

function classifyAuthResponse(res, operation) {
    authLatency.add(res.timings.duration);

    const is5xx = res.status >= 500;
    const is3xx = res.status >= 300 && res.status < 400;
    const is2xx = res.status >= 200 && res.status < 300;

    auth500Rate.add(is5xx);
    auth302Rate.add(is3xx || is2xx);

    if (operation === 'login') {
        if (is5xx)      loginFail5xx.add(1);
        else if (is3xx) loginFail4xx.add(1);
        else if (is2xx) loginSuccess.add(1);
    }

    if (operation === 'signup') {
        if (is5xx) signupFail5xx.add(1);
        else       signupSuccess.add(1);
    }

    return { is5xx, is3xx, is2xx };
}

// ─── Scenario 1: Valid auth flow (signup → login → logout) ──────────────
export function validAuthFlow() {
    const jar    = http.cookieJar();
    const params = { jar, redirects: 5, tags: { flow: 'valid_auth' } };

    const email    = `canary_test_${__VU}_${__ITER}@loadtest.io`;
    const password = 'ValidPass123!';

    group('signup', () => {
        http.get(`${BASE_URL}/auth/signup`, params);
        sleep(randFloat(0.3, 0.8));

        const res = http.post(
            `${BASE_URL}/auth/signup`,
            { name: `Canary User ${__VU}`, email, password, confirmPassword: password },
            params
        );
        const { is5xx } = classifyAuthResponse(res, 'signup');

        check(res, {
            'signup: not 5xx (v2 broken if fails)': (r) => r.status < 500,
            'signup: success redirect or page':     (r) => r.status === 200 || r.status === 302,
        });

        if (is5xx) {
            console.log(`[v2-hit] signup 5xx — VU=${__VU} ITER=${__ITER} status=${res.status}`);
        }
    });

    sleep(randFloat(0.5, 1.5));

    group('login_valid', () => {
        http.get(`${BASE_URL}/auth/login`, params);
        sleep(randFloat(0.3, 0.8));

        const res = http.post(
            `${BASE_URL}/auth/login`,
            { email, password },
            params
        );
        const { is5xx } = classifyAuthResponse(res, 'login');

        check(res, {
            'login: not 5xx (v2 broken if fails)': (r) => r.status < 500,
            'login: reached destination':          (r) => r.status === 200 || r.status === 302,
        });

        if (is5xx) {
            console.log(`[v2-hit] login 5xx — VU=${__VU} ITER=${__ITER} status=${res.status}`);
        }
    });

    sleep(randFloat(0.5, 1.5));

    group('logout', () => {
        http.get(`${BASE_URL}/auth/logout`, params);
    });

    sleep(randFloat(1, 2));
}

// ─── Scenario 2: Bad credentials ────────────────────────────────────────
export function badCredentials() {
    const params = {
        redirects: 0,
        tags: { flow: 'bad_creds' },
    };

    const fakeEmails = [
        `fake_${__VU}@nowhere.com`,
        'admin@admin.com',
        'test@test.com',
        `user${Math.floor(Math.random() * 9999)}@example.com`,
        'hacker@evil.io',
    ];

    const wrongPasswords = [
        'wrongpassword',
        '123456',
        'password',
        'letmein',
        '',
    ];

    group('bad_login', () => {
        const res = http.post(
            `${BASE_URL}/auth/login`,
            { email: pick(fakeEmails), password: pick(wrongPasswords) },
            params
        );
        const { is5xx, is3xx } = classifyAuthResponse(res, 'login');

        check(res, {
            'v1: bad creds → 302':        (r) => !is5xx && is3xx,
            'v2: bad creds → 5xx (flag)': (r) => !is5xx,
        });
    });

    sleep(randFloat(0.1, 0.5));
}

export function handleSummary(data) {
    const m = data.metrics;

    const total5xx    = m['login_fail_5xx']       ? m['login_fail_5xx'].values.count       : 0;
    const totalRedir  = m['login_fail_redirect']  ? m['login_fail_redirect'].values.count  : 0;
    const totalOk     = m['login_success']        ? m['login_success'].values.count        : 0;
    const signupOk    = m['signup_success']       ? m['signup_success'].values.count       : 0;
    const signup5xx   = m['signup_fail_5xx']      ? m['signup_fail_5xx'].values.count      : 0;
    const rate5xx     = m['auth_5xx_rate']        ? m['auth_5xx_rate'].values.rate         : 0;
    const p95Latency  = m['auth_latency_ms']      ? m['auth_latency_ms'].values['p(95)']   : 0;
    const totalReqs   = m['http_reqs']            ? m['http_reqs'].values.count            : 0;

    const canaryHitEstimate = Math.round(total5xx + totalRedir + totalOk) * 0.5;

    const summary = `
╔══════════════════════════════════════════════════════════╗
║     CANARY v2 AUTH TEST — SUMMARY (NO CHAOS)            ║
╠══════════════════════════════════════════════════════════╣
║  Total HTTP requests sent       : ${String(totalReqs).padEnd(20)}   ║
║  Estimated v2 canary hits (~50%): ${String(Math.round(canaryHitEstimate)).padEnd(20)}   ║
╠══════════════════════════════════════════════════════════╣
║  LOGIN RESULTS                                          ║
║    Success (200/302 v1 or v2)   : ${String(totalOk).padEnd(20)}   ║
║    Failed → 302 redirect (v1 ✓) : ${String(totalRedir).padEnd(20)}   ║
║    Failed → 500 (v2 broken ✗)  : ${String(total5xx).padEnd(20)}   ║
╠══════════════════════════════════════════════════════════╣
║  SIGNUP RESULTS                                         ║
║    Success                      : ${String(signupOk).padEnd(20)}   ║
║    Failed → 500 (v2 broken ✗)  : ${String(signup5xx).padEnd(20)}   ║
╠══════════════════════════════════════════════════════════╣
║  auth_5xx_rate                  : ${String((rate5xx * 100).toFixed(1) + '%').padEnd(20)}   ║
║  auth_latency p95               : ${String(p95Latency.toFixed(0) + 'ms').padEnd(20)}   ║
╚══════════════════════════════════════════════════════════╝
`;
    console.log(summary);

    return {
        stdout: summary,
    };
}
