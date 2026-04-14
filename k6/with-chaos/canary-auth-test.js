/**
 * canary-auth-test.js
 *
 * Targets the v2 canary to surface auth failures in Grafana/Loki.
 * Run with:  k6 run k6/canary-auth-test.js
 *
 * What this does:
 *  - Hammers /auth routes so the ~50% canary weight sends enough traffic to v2
 *  - Runs valid signup→login flows (these 500 on v2, succeed on v1)
 *  - Runs bad-credential attempts (reveal the difference between v2 broken 500
 *    vs v1 proper 302-to-login redirect)
 *  - Injects labelled chaos events via /chaos/log so you get named log
 *    entries in Loki with level=ERROR and event=auth.* labels
 *  - Prints a per-scenario summary table at the end
 *
 * Grafana queries to watch while running:
 *   Loki:       {app="trendtrove-app-v2", level="ERROR"}
 *   Loki:       {service="app-service-v2"} | json | event=~"auth.*"
 *   Prometheus: rate(http_requests_total{status_code=~"5..",service="app-service-v2"}[1m])
 */

import http from 'k6/http';
import { sleep, check, group, fail } from 'k6';
import { Rate, Counter, Trend } from 'k6/metrics';

const BASE_URL = 'http://34.122.199.244.nip.io';

// ── Custom metrics ────────────────────────────────────────────────────────────
// These show up in k6 summary AND can be pushed to Prometheus remote_write
const auth500Rate     = new Rate('auth_5xx_rate');        // v2 broken responses
const auth302Rate     = new Rate('auth_redirect_rate');   // v1 correct redirects
const loginSuccess    = new Counter('login_success');
const loginFail5xx    = new Counter('login_fail_5xx');    // v2 broken
const loginFail4xx    = new Counter('login_fail_redirect'); // v1 correct reject
const signupSuccess   = new Counter('signup_success');
const signupFail5xx   = new Counter('signup_fail_5xx');
const authLatency     = new Trend('auth_latency_ms', true);

// ── Scenarios ─────────────────────────────────────────────────────────────────
export const options = {
    scenarios: {
        // Ramps up valid user flows through /auth — ~50% will hit v2 and get 500
        valid_auth_flow: {
            executor: 'ramping-vus',
            startVUs: 0,
            stages: [
                { duration: '30s', target: 20 },  // ramp up — gets canary attention fast
                { duration: '2m',  target: 20 },  // sustained — enough v2 hits for Grafana
                { duration: '30s', target: 0  },  // wind down
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

        // Inject named auth ERROR/WARN events directly into Loki via the
        // /chaos/log endpoint so you have readable labels in Grafana
        // NOTE: must use /chaos/log (root), NOT /auth/chaos/log — the /auth
        // prefix would be intercepted by failureInjectionMiddleware on v2 and
        // return 500 before the chaos endpoint ever runs.
        chaos_auth_events: {
            executor: 'constant-arrival-rate',
            rate: 3,
            timeUnit: '5s',
            duration: '3m',
            preAllocatedVUs: 3,
            exec: 'chaosAuthEvents',
            tags: { scenario: 'chaos' },
        },
    },

    thresholds: {
        // These are intentionally loose — v2 is broken, we expect failures
        http_req_duration:   ['p(95)<5000'],
        // Alert if MORE than 95% of ALL auth requests are 5xx
        // (should hover around 50% — the canary weight — since v2 fails every /auth request)
        auth_5xx_rate:       ['rate<0.95'],
    },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function randFloat(min, max) {
    return Math.random() * (max - min) + min;
}

// Tag every request with the service version we actually got back.
// v2 returns 500, v1 returns 200/302 — we use this to distinguish them.
function classifyAuthResponse(res, operation) {
    authLatency.add(res.timings.duration);

    const is5xx = res.status >= 500;
    const is3xx = res.status >= 300 && res.status < 400;
    const is2xx = res.status >= 200 && res.status < 300;

    auth500Rate.add(is5xx);
    auth302Rate.add(is3xx || is2xx);

    if (operation === 'login') {
        if (is5xx)        loginFail5xx.add(1);
        else if (is3xx)   loginFail4xx.add(1);
        else if (is2xx)   loginSuccess.add(1);
    }

    if (operation === 'signup') {
        if (is5xx) signupFail5xx.add(1);
        else       signupSuccess.add(1);
    }

    return { is5xx, is3xx, is2xx };
}

// ── Scenario 1: Valid auth flow (signup → login → logout) ────────────────────
// These users are doing the right thing — failures are 100% v2's fault

export function validAuthFlow() {
    const jar    = http.cookieJar();
    const params = { jar, redirects: 5, tags: { flow: 'valid_auth' } };

    const email    = `canary_test_${__VU}_${__ITER}@loadtest.io`;
    const password = 'ValidPass123!';

    // ── Signup ──────────────────────────────────────────────────────────────
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
            // Confirm which version likely served this — v2 is the broken one
            console.log(`[v2-hit] signup 5xx — VU=${__VU} ITER=${__ITER} status=${res.status}`);
        }
    });

    sleep(randFloat(0.5, 1.5));

    // ── Login with valid creds ───────────────────────────────────────────────
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

    // ── Logout ───────────────────────────────────────────────────────────────
    group('logout', () => {
        http.get(`${BASE_URL}/auth/logout`, params);
    });

    sleep(randFloat(1, 2));
}

// ── Scenario 2: Bad credentials ───────────────────────────────────────────────
// v1 → 302 back to /auth/login (passport local strategy rejects cleanly)
// v2 → 500 (FAIL_MODE=auth intercepts before passport even runs)
// This difference is exactly what the Grafana dashboard should show

export function badCredentials() {
    const params = {
        redirects: 0,       // don't follow — we want to see the raw status
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
            // v1 correct behaviour: redirect back to login page
            'v1: bad creds → 302':  (r) => !is5xx && is3xx,
            // v2 broken behaviour: 500 instead of redirect
            'v2: bad creds → 5xx (flag)': (r) => !is5xx, // inverted — fail = v2 hit
        });
    });

    sleep(randFloat(0.1, 0.5)); // tight loop to generate volume for 10% canary to register
}

// ── Scenario 3: Chaos auth event injection ────────────────────────────────────
// Pushes named ERROR/WARN events to Loki with proper labels.
// In Grafana you'll see these as: {level="ERROR", event="auth.login.5xx_spike"}

export function chaosAuthEvents() {
    const events = [
        {
            level:    'ERROR',
            category: 'auth',
            event:    'auth.login.5xx_spike',
            message:  'Login endpoint returning 500 — v2 canary FAIL_MODE=auth active',
        },
        {
            level:    'ERROR',
            category: 'auth',
            event:    'auth.signup.failed',
            message:  'Signup rejected by failure injection middleware on v2',
        },
        {
            level:    'WARN',
            category: 'auth',
            event:    'auth.canary.degraded',
            message:  'Canary v2 auth routes degraded — rollback may trigger',
        },
        {
            level:    'WARN',
            category: 'user_session',
            event:    'auth.session.blocked',
            message:  'Session creation blocked by FAIL_MODE on v2 pod',
        },
        {
            level:    'ERROR',
            category: 'system',
            event:    'canary.error_rate.high',
            message:  'Error rate on v2 above threshold — canary controller evaluating rollback',
        },
    ];

    const e = pick(events);
    const url = `${BASE_URL}/chaos/log`
        + `?level=${e.level}`
        + `&category=${encodeURIComponent(e.category)}`
        + `&event=${encodeURIComponent(e.event)}`
        + `&message=${encodeURIComponent(e.message)}`;

    const res = http.get(url, { tags: { flow: 'chaos' } });
    check(res, { 'chaos log accepted': (r) => r.status === 200 });

    sleep(1);
}

// ── End-of-test summary ───────────────────────────────────────────────────────

export function handleSummary(data) {
    const m = data.metrics;

    const total5xx    = m['login_fail_5xx']       ? m['login_fail_5xx'].values.count       : 0;
    const totalRedir  = m['login_fail_redirect']   ? m['login_fail_redirect'].values.count  : 0;
    const totalOk     = m['login_success']         ? m['login_success'].values.count        : 0;
    const signupOk    = m['signup_success']         ? m['signup_success'].values.count      : 0;
    const signup5xx   = m['signup_fail_5xx']        ? m['signup_fail_5xx'].values.count     : 0;
    const rate5xx     = m['auth_5xx_rate']          ? m['auth_5xx_rate'].values.rate        : 0;
    const p95Latency  = m['auth_latency_ms']        ? m['auth_latency_ms'].values['p(95)']  : 0;
    const totalReqs   = m['http_reqs']              ? m['http_reqs'].values.count            : 0;

    const canaryHitEstimate = Math.round(total5xx + totalRedir + totalOk) * 0.1;

    const summary = `
╔══════════════════════════════════════════════════════════╗
║           CANARY v2 AUTH TEST — SUMMARY                 ║
╠══════════════════════════════════════════════════════════╣
║  Total HTTP requests sent       : ${String(totalReqs).padEnd(20)}   ║
║  Estimated v2 canary hits (~10%): ${String(Math.round(canaryHitEstimate)).padEnd(20)}   ║
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
╠══════════════════════════════════════════════════════════╣
║  GRAFANA QUERIES TO CHECK                               ║
║  Loki: {app="trendtrove-app-v2", level="ERROR"}         ║
║  Loki: {service="app-service-v2"} | json                ║
║  PromQL: rate(http_requests_total                       ║
║    {status_code=~"5..",service="app-service-v2"}[1m])   ║
╚══════════════════════════════════════════════════════════╝
`;
    console.log(summary);

    return {
        stdout: summary,
    };
}
