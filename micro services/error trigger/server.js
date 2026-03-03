const express = require('express');
const axios = require('axios');

const PORT = process.env.PORT || 2000;
const AUTH_BASE = process.env.AUTH_BASE || 'http://auth-service:3000';
const AUTH_TRIGGER_PATH = process.env.AUTH_TRIGGER_PATH || '/chaos/trigger';
const APP_BASE = process.env.APP_BASE || 'http://app-service:3000';
const PRODUCT_BASE = process.env.PRODUCT_BASE || 'http://product-service:3000';
const CART_BASE = process.env.CART_BASE || 'http://cart-service:3000';
const MAIL_BASE = process.env.MAIL_BASE || 'http://mail-service:3000';
const SERVICE_NAME = process.env.SERVICE_NAME || 'error-trigger';
const SERVICE_VERSION = process.env.SERVICE_VERSION || '1.0.0';
const ENV = process.env.NODE_ENV || 'local';

function logTelemetry(event, level, category, message, extra = {}, serviceOverride) {
  const now = new Date().toISOString();
  const entry = {
    timestamp: now,
    level,
    service: serviceOverride || SERVICE_NAME,
    version: SERVICE_VERSION,
    environment: ENV,
    trace_id: 'manual_trigger',
    span_id: 'manual_trigger',
    request_id: 'manual_trigger',
    user_id: null,
    session_id: null,
    category,
    event,
    message,
    duration_ms: null,
    http: null,
    error: extra.error || null,
    tags: extra.tags || {}
  };
  if (extra.payload) entry[category] = extra.payload;
  console.log(JSON.stringify(entry));
}

async function forwardLog(base, targetService, req, res) {
  const level = (req.query.level || 'INFO').toString();
  const category = (req.query.category || 'system').toString();
  const event = (req.query.event || `chaos.${level.toLowerCase()}`).toString();
  const message =
    req.query.message ||
    `Chaos log ${level.toLowerCase()} forwarded to ${targetService}`;

  try {
    await axios.get(`${base}/chaos/log`, {
      params: { level, category, event, message }
    });
    logTelemetry(
      `${targetService}.chaos.forwarded`,
      'INFO',
      'system',
      `Forwarded chaos log to ${targetService}`,
      { tags: { level, category, service: targetService } }
    );
    res.json({
      status: 'ok',
      forwarded: true,
      target: targetService,
      level,
      category,
      event
    });
  } catch (err) {
    logTelemetry(
      `${targetService}.chaos.forward.error`,
      'ERROR',
      'system',
      `Failed to forward chaos log to ${targetService}`,
      {
        error: { type: err.name, message: err.message, code: err.code || null },
        tags: { level, category, service: targetService }
      }
    );
    res.status(502).json({ status: 'error', error: err.message });
  }
}

const app = express();

// Trigger auth chaos: /trigger/auth/login-fail?reason=invalid_credentials
app.get('/trigger/auth/login-fail', async (req, res) => {
  const reason = req.query.reason || 'manual_trigger';
  try {
    await axios.post(`${AUTH_BASE}${AUTH_TRIGGER_PATH}`, null, { params: { reason } });
    logTelemetry('auth.chaos.forwarded', 'INFO', 'system', `Forwarded auth chaos: ${reason}`, {
      tags: { reason }
    });
    res.json({ status: 'ok', forwarded: true, target: 'auth', reason });
  } catch (err) {
    logTelemetry('auth.chaos.forward.error', 'ERROR', 'system', 'Failed to forward auth chaos', {
      error: { type: err.name, message: err.message, code: err.code || null },
      tags: { reason }
    });
    res.status(502).json({ status: 'error', error: err.message });
  }
});

// Health
app.get('/healthz', (_req, res) => res.json({ status: 'ok' }));

// Local demo log trigger (logs only in this pod)
app.get('/trigger/log/:level', (req, res) => {
  const level = (req.params.level || '').toUpperCase();
  const allowed = ['DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL'];
  if (!allowed.includes(level)) {
    res.status(400).json({ status: 'error', error: 'Invalid level' });
    return;
  }
  const category = (req.query.category || 'system').toString();
  const service = (req.query.service || SERVICE_NAME).toString();
  const event = (req.query.event || `demo.${level.toLowerCase()}`).toString();
  const message =
    req.query.message || `Demo ${level.toLowerCase()} log from ${service}`;
  logTelemetry(event, level, category, message, {}, service);
  res.json({ status: 'ok', level, category, service, event });
});

// Forwarded log triggers to each service (logs appear in target pods)
app.get('/trigger/app/log', (req, res) =>
  forwardLog(APP_BASE, 'trendtrove-app', req, res)
);
app.get('/trigger/auth/log', (req, res) =>
  forwardLog(AUTH_BASE, 'trendtrove-auth', req, res)
);
app.get('/trigger/product/log', (req, res) =>
  forwardLog(PRODUCT_BASE, 'product-service', req, res)
);
app.get('/trigger/cart/log', (req, res) =>
  forwardLog(CART_BASE, 'cart-service', req, res)
);
app.get('/trigger/mail/log', (req, res) =>
  forwardLog(MAIL_BASE, 'mail-service', req, res)
);

app.listen(PORT, () => {
  console.log(`[error-trigger] listening on ${PORT}`);
});
