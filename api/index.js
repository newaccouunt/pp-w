// ============================================================
// 🛡️ BRONX OSINT V504 — ULTRA DEVELOPER EDITION
// ✅ No syntax errors — pure string concat, no nested backticks
// ✅ Professional developer UI
// ✅ JSON preview on public dashboard
// ✅ Global + Per-Key developer name
// ✅ Dynamic hidden-field removal
// ✅ Plain-text custom errors (emoji)
// ✅ Full backup/export/import (file + paste)
// ✅ Smart + Strict DDoS with real enforcement
// ============================================================
const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();

// ============================================================
// ⚙️ CONFIG
// ============================================================
const REAL_API_BASE = 'https://bronx-osint-api.duckdns.org/api';
const REAL_API_KEYS = ['bronx-bot-9999', 'bronx-ultra-king-ft-bro-op'];
let currentKeyIndex = 0;
function getNextKey() {
  const k = REAL_API_KEYS[currentKeyIndex];
  currentKeyIndex = (currentKeyIndex + 1) % REAL_API_KEYS.length;
  return k;
}

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'bronx';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '85095613';
const ADMIN_PATH = '/bronx-admin-panel';
const DATA_DIR = process.env.RENDER_DATA_DIR || '/tmp';
const F = function (n) { return path.join(DATA_DIR, n); };
const DATA_FILE = F('bronx_v504_data.json');
const LOGS_FILE = F('bronx_v504_logs.json');

// ============================================================
// 🗄️ STATE
// ============================================================
let keyStorage = {};
let customAPIs = [];
let requestLogs = [];
let adminSessions = {};
let cooldownTimers = {};
let protectedData = {};
let dailyLimits = {};
let perSecondLimits = {};
let adminLogs = [];
let keyMonitorLogs = [];
let endpointResponses = {};
let auditLog = [];
let announcement = { enabled: false, text: '', type: 'info' };
let maintenance = { enabled: false, message: 'System under maintenance' };
let statsCache = { data: null, expiresAt: 0 };

let customMessages = {
  keyNotFound: '🔑 Key not found! Purchase: @BRONX_ULTRA',
  limitReached: '🔴 Limit reached {used}/{limit}. Upgrade your plan.',
  keyStopped: '⛔ This key has been stopped by the administrator.',
  keyDisabled: '🚫 This key has been disabled.',
  keyExpired: '⏰ This key expired on {date}. Please renew.',
  missingKey: '🔑 API Key is required. Add ?key=YOUR_KEY to the URL.',
  scopeDenied: '🚫 Scope denied. Your key does not have access to this endpoint.'
};

let globalConfig = {
  developerName: '@BRONX_ULTRA',
  hiddenFields: 'credit, truecaller_name, cached, cached_at, api_by, by, channel, developer, api_key, real_url, source_url, owner, key_note, response_time_ms'
};

// ============================================================
// 🎨 THEME
// ============================================================
const theme = {
  preset: 'pro-dark',
  colors: {
    bgPrimary: '#0d1117', bgSecondary: '#161b22', bgCard: '#161b22',
    borderColor: '#30363d',
    textPrimary: '#c9d1d9', textSecondary: '#8b949e', textMuted: '#6e7681',
    accent: '#58a6ff', accent2: '#238636',
    success: '#3fb950', warning: '#d29922', danger: '#f85149', info: '#58a6ff'
  },
  fonts: {
    heading: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    body: 'Inter, sans-serif',
    mono: '"JetBrains Mono", "Fira Code", Monaco, Consolas, monospace'
  },
  radius: 6
};

const PRESETS = {
  'pro-dark': { accent: '#58a6ff', accent2: '#238636', bgPrimary: '#0d1117', bgSecondary: '#161b22' },
  'pro-light': { accent: '#0969da', accent2: '#1a7f37', bgPrimary: '#ffffff', bgSecondary: '#f6f8fa' },
  'midnight': { accent: '#79c0ff', accent2: '#d2a8ff', bgPrimary: '#010409', bgSecondary: '#0d1117' }
};

function applyPreset(name) {
  const p = PRESETS[name];
  if (!p) return false;
  theme.preset = name;
  theme.colors.accent = p.accent;
  theme.colors.accent2 = p.accent2;
  theme.colors.bgPrimary = p.bgPrimary;
  theme.colors.bgSecondary = p.bgSecondary;
  theme.colors.bgCard = p.bgSecondary;
  theme.colors.borderColor = name === 'pro-light' ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)';
  return true;
}

// ============================================================
// 🔐 SECURITY
// ============================================================
let bans = { ip: {}, device: {}, key: {} };
let abuseTracker = { ip: {}, device: {}, key: {} };
let deviceFingerprints = {};
let whitelist = { ips: [], keys: [] };

let ddosConfig = {
  enabled: true,
  mode: 'smart',
  ip: { burst10s: 60, perMinute: 200, perHour: 1500 },
  device: { burst10s: 80, perMinute: 250, perHour: 2000 },
  key: { burst10s: 100, perMinute: 400, perHour: 3000 },
  strikes: { warnAt: 1, throttleAt: 2, tempBanAt: 3, longBanAt: 5, permanentAt: 10 },
  tempBanMs: 5 * 60 * 1000,
  longBanMs: 60 * 60 * 1000,
  login: { maxAttempts: 5, banMs: 30 * 60 * 1000 }
};

// ============================================================
// 💾 SAVE / LOAD
// ============================================================
function saveToDisk() {
  try {
    const ks = {};
    Object.keys(keyStorage).forEach(function (k) {
      if (!keyStorage[k]._hardcoded) ks[k] = keyStorage[k];
    });
    fs.writeFileSync(DATA_FILE, JSON.stringify({
      keys: ks,
      apis: customAPIs,
      logs: requestLogs.slice(-2000),
      protected: protectedData,
      endpointResponses: endpointResponses,
      theme: theme,
      bans: bans,
      ddosConfig: ddosConfig,
      whitelist: whitelist,
      announcement: announcement,
      maintenance: maintenance,
      auditLog: auditLog.slice(-500),
      customMessages: customMessages,
      globalConfig: globalConfig
    }, null, 2));
    fs.writeFileSync(LOGS_FILE, JSON.stringify(keyMonitorLogs.slice(-1000), null, 2));
  } catch (e) {
    console.log('Save err:', e.message);
  }
}

function loadFromDisk() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const d = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
      if (d.keys) Object.keys(d.keys).forEach(function (k) { keyStorage[k] = d.keys[k]; });
      if (d.apis && d.apis.length) customAPIs = d.apis;
      if (d.logs) requestLogs = d.logs;
      if (d.protected) protectedData = d.protected;
      if (d.endpointResponses) endpointResponses = d.endpointResponses;
      if (d.theme) {
        Object.assign(theme, d.theme);
        if (d.theme.colors) Object.assign(theme.colors, d.theme.colors);
      }
      if (d.bans) {
        bans.ip = d.bans.ip || {};
        bans.device = d.bans.device || {};
        bans.key = d.bans.key || {};
      }
      if (d.ddosConfig) Object.assign(ddosConfig, d.ddosConfig);
      if (d.whitelist) whitelist = d.whitelist;
      if (d.announcement) announcement = d.announcement;
      if (d.maintenance) maintenance = d.maintenance;
      if (d.auditLog) auditLog = d.auditLog;
      if (d.customMessages) Object.assign(customMessages, d.customMessages);
      if (d.globalConfig) Object.assign(globalConfig, d.globalConfig);
      return true;
    }
  } catch (e) {
    console.log('Load err:', e.message);
  }
  return false;
}

setInterval(saveToDisk, 2 * 60 * 1000);

// ============================================================
// ⏰ TIME
// ============================================================
function getIndiaTime() { return new Date(Date.now() + 5.5 * 3600 * 1000); }
function getIndiaDate() { return getIndiaTime().toISOString().split('T')[0]; }
function getIndiaDateTime() { return getIndiaTime().toISOString().replace('T', ' ').substring(0, 19); }
function isKeyExpired(d) { return d && d !== 'LIFETIME' && getIndiaTime() > new Date(d); }

function parseExpiryDate(s) {
  if (!s || s === 'LIFETIME') return null;
  const p = String(s).split('-');
  if (p.length === 3) {
    return p[0].length === 4
      ? new Date(+p[0], +p[1] - 1, +p[2], 23, 59, 59)
      : new Date(+p[2], +p[1] - 1, +p[0], 23, 59, 59);
  }
  const d = new Date(s);
  return isNaN(d) ? null : d;
}

function logAudit(user, action, details) {
  auditLog.push({ user: user, action: action, details: details, timestamp: getIndiaDateTime() });
  if (auditLog.length > 500) auditLog = auditLog.slice(-500);
}

// ============================================================
// 📱 DEVICE & UTILS
// ============================================================
function getRealIP(req) {
  if (req.headers['x-forwarded-for']) return req.headers['x-forwarded-for'].split(',')[0].trim();
  return req.headers['x-real-ip'] || req.headers['cf-connecting-ip'] ||
    (req.connection && req.connection.remoteAddress) ||
    (req.socket && req.socket.remoteAddress) || 'Unknown';
}

function generateDeviceId(req) {
  const ua = req.headers['user-agent'] || '';
  const lang = req.headers['accept-language'] || '';
  return 'DEV_' + crypto.createHash('md5').update(ua + '|' + lang).digest('hex').substring(0, 16).toUpperCase();
}

function detectDeviceType(req) {
  const ua = (req.headers['user-agent'] || '').toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return { type: 'iOS', icon: '📱', os: 'iOS' };
  if (/android/.test(ua)) return { type: 'Android', icon: '📱', os: 'Android' };
  if (/windows/.test(ua)) return { type: 'Windows', icon: '💻', os: 'Windows' };
  if (/macintosh|mac os x/.test(ua)) return { type: 'macOS', icon: '💻', os: 'macOS' };
  if (/linux/.test(ua)) return { type: 'Linux', icon: '💻', os: 'Linux' };
  if (/curl|wget|python|node|axios|java|php|ruby|go-http/.test(ua)) return { type: 'Bot/CLI', icon: '🤖', os: 'Bot' };
  return { type: 'Unknown', icon: '❓', os: 'Unknown' };
}

function detectBrowser(req) {
  const ua = (req.headers['user-agent'] || '').toLowerCase();
  if (/chrome|crios/.test(ua)) return 'Chrome';
  if (/firefox|fxios/.test(ua)) return 'Firefox';
  if (/safari/.test(ua)) return 'Safari';
  if (/curl/.test(ua)) return 'cURL';
  if (/python/.test(ua)) return 'Python';
  if (/node|axios/.test(ua)) return 'Node.js';
  return 'Unknown';
}

function detectCountry(req) {
  return req.headers['cf-ipcountry'] || req.headers['x-country'] || 'Unknown';
}

// ============================================================
// 🧠 SMART DDOS
// ============================================================
function isBanned(type, id) {
  const b = bans[type] && bans[type][id];
  if (!b) return false;
  if (b.permanent) return true;
  if (Date.now() < b.until) return true;
  delete bans[type][id];
  return false;
}

function pushHit(bucket, id, maxWindow) {
  maxWindow = maxWindow || 24 * 3600000;
  const now = Date.now();
  if (!bucket[id]) bucket[id] = { hits: [], strikes: 0 };
  bucket[id].hits = bucket[id].hits.filter(function (t) { return t > now - maxWindow; });
  bucket[id].hits.push(now);
}

function countWindow(bucket, id, ms) {
  const now = Date.now();
  if (!bucket[id] || !bucket[id].hits) return 0;
  return bucket[id].hits.filter(function (t) { return t > now - ms; }).length;
}

function strike(bucket, id, reason, ctx) {
  ctx = ctx || {};
  if (!bucket[id]) bucket[id] = { hits: [], strikes: 0 };
  bucket[id].strikes++;
  const s = bucket[id].strikes;
  const c = ddosConfig.strikes;
  if (s >= c.permanentAt) {
    if (!bans[ctx.type]) bans[ctx.type] = {};
    bans[ctx.type][id] = { permanent: true, reason: reason, at: getIndiaDateTime(), strikes: s };
    return { action: 'PERMANENT_BAN', message: '🚫 PERMANENT BAN' };
  }
  if (s >= c.longBanAt) {
    if (!bans[ctx.type]) bans[ctx.type] = {};
    bans[ctx.type][id] = { until: Date.now() + ddosConfig.longBanMs, reason: reason, at: getIndiaDateTime(), strikes: s };
    return { action: 'LONG_BAN', message: '⛔ 1 hour ban' };
  }
  if (s >= c.tempBanAt) {
    if (!bans[ctx.type]) bans[ctx.type] = {};
    bans[ctx.type][id] = { until: Date.now() + ddosConfig.tempBanMs, reason: reason, at: getIndiaDateTime(), strikes: s };
    return { action: 'TEMP_BAN', message: '⏸️ 5 min ban' };
  }
  if (s >= c.throttleAt) return { action: 'THROTTLE', message: '🐢 Slow down' };
  return { action: 'WARN', message: '⚠️ Warning #' + s };
}

function smartDDoS(req) {
  if (!ddosConfig.enabled || ddosConfig.mode === 'off') return { allowed: true };
  const ip = getRealIP(req);
  const deviceId = generateDeviceId(req);
  const key = req.query.key || req.headers['x-api-key'] || '';

  if (whitelist.ips.indexOf(ip) >= 0) return { allowed: true, action: 'WHITELISTED' };
  if (isBanned('ip', ip)) return { allowed: false, code: 403, reason: 'IP banned', action: 'BANNED' };
  if (isBanned('device', deviceId)) return { allowed: false, code: 403, reason: 'Device banned', action: 'BANNED' };
  if (key && isBanned('key', key)) return { allowed: false, code: 403, reason: 'Key banned', action: 'BANNED' };

  pushHit(abuseTracker.ip, ip);
  pushHit(abuseTracker.device, deviceId);
  if (key) pushHit(abuseTracker.key, key);

  const mult = ddosConfig.mode === 'strict' ? 0.3 : 1;

  function check(type, id, base, bucket) {
    const limits = {
      burst10s: Math.floor(base.burst10s * mult),
      perMinute: Math.floor(base.perMinute * mult),
      perHour: Math.floor(base.perHour * mult)
    };
    const b10 = countWindow(bucket, id, 10000);
    const b1m = countWindow(bucket, id, 60000);
    const b1h = countWindow(bucket, id, 3600000);
    if (b10 > limits.burst10s) return strike(bucket, id, 'Burst ' + b10 + '/' + limits.burst10s + '/10s', { type: type });
    if (b1m > limits.perMinute) return strike(bucket, id, 'Rate ' + b1m + '/' + limits.perMinute + '/min', { type: type });
    if (b1h > limits.perHour) return strike(bucket, id, 'Rate ' + b1h + '/' + limits.perHour + '/hour', { type: type });
    return null;
  }

  let r = check('ip', ip, ddosConfig.ip, abuseTracker.ip);
  if (r) return { allowed: r.action === 'WARN' || r.action === 'THROTTLE', code: r.action.indexOf('BAN') >= 0 ? 403 : 200, reason: r.message, action: r.action };
  r = check('device', deviceId, ddosConfig.device, abuseTracker.device);
  if (r) return { allowed: r.action === 'WARN' || r.action === 'THROTTLE', code: r.action.indexOf('BAN') >= 0 ? 403 : 200, reason: r.message, action: r.action };
  if (key) {
    r = check('key', key, ddosConfig.key, abuseTracker.key);
    if (r) return { allowed: r.action === 'WARN' || r.action === 'THROTTLE', code: r.action.indexOf('BAN') >= 0 ? 403 : 200, reason: r.message, action: r.action };
  }
  return { allowed: true, action: 'OK' };
}

// ============================================================
// 🔑 KEY VALIDATION
// ============================================================
function checkCooldown(k) {
  const kd = keyStorage[k];
  if (!kd || !kd.cooldown) return { allowed: true };
  const n = Date.now();
  if (cooldownTimers[k] && n - cooldownTimers[k] < kd.cooldown * 1000)
    return { allowed: false, remaining: Math.ceil((kd.cooldown * 1000 - (n - cooldownTimers[k])) / 1000) };
  cooldownTimers[k] = n;
  return { allowed: true };
}

function checkPerSecondLimit(k) {
  const kd = keyStorage[k];
  if (!kd || !kd.perSecondLimit) return { allowed: true };
  const wk = k + '_ps_' + Math.floor(Date.now() / 1000);
  if (!perSecondLimits[wk]) perSecondLimits[wk] = 0;
  if (perSecondLimits[wk] >= kd.perSecondLimit)
    return { allowed: false, message: '⚡ ' + kd.perSecondLimit + '/s reached' };
  perSecondLimits[wk]++;
  return { allowed: true };
}

function checkDailyLimit(k) {
  const kd = keyStorage[k];
  if (!kd || !kd.dailyLimit) return { allowed: true };
  const dk = k + '_' + getIndiaDate();
  if (!dailyLimits[dk]) dailyLimits[dk] = 0;
  if (dailyLimits[dk] >= kd.dailyLimit) return { allowed: false, message: '🔴 Daily limit reached' };
  return { allowed: true };
}

function isProtected(value) {
  const keys = Object.keys(protectedData);
  for (let i = 0; i < keys.length; i++) {
    if (String(value).indexOf(protectedData[keys[i]]) >= 0) return protectedData[keys[i]];
  }
  return null;
}

function checkKeyValid(k) {
  if (!k) return { valid: false, error: customMessages.missingKey };
  if (maintenance.enabled && whitelist.keys.indexOf(k) === -1)
    return { valid: false, error: '🔧 ' + maintenance.message };
  const kd = keyStorage[k];
  if (!kd) return { valid: false, error: customMessages.keyNotFound };
  if (kd.stopped) return { valid: false, error: customMessages.keyStopped };
  if (kd.disabled) return { valid: false, error: customMessages.keyDisabled };
  if (kd.expiry && isKeyExpired(kd.expiry))
    return { valid: false, error: customMessages.keyExpired.replace('{date}', kd.expiryStr || '') };
  if (!kd.unlimited && kd.used >= kd.limit)
    return { valid: false, error: customMessages.limitReached.replace('{used}', kd.used).replace('{limit}', kd.limit) };
  const dl = checkDailyLimit(k);
  if (!dl.allowed) return { valid: false, error: dl.message };
  const ps = checkPerSecondLimit(k);
  if (!ps.allowed) return { valid: false, error: ps.message };
  const cd = checkCooldown(k);
  if (!cd.allowed) return { valid: false, error: '⏱️ Cooldown ' + cd.remaining + 's' };
  return { valid: true, keyData: kd };
}

function incrementKeyUsage(k, ep, req) {
  const ip = getRealIP(req);
  const deviceId = generateDeviceId(req);
  const di = detectDeviceType(req);
  const browser = detectBrowser(req);
  const country = detectCountry(req);

  if (keyStorage[k] && !keyStorage[k].unlimited) {
    keyStorage[k].used++;
    const dk = k + '_' + getIndiaDate();
    dailyLimits[dk] = (dailyLimits[dk] || 0) + 1;
  }

  keyMonitorLogs.push({
    key: k.substring(0, 8) + '***',
    endpoint: ep,
    ip: ip,
    deviceId: deviceId,
    deviceIcon: di.icon,
    deviceType: di.type,
    browser: browser,
    country: country,
    timestamp: getIndiaDateTime(),
    date: getIndiaDate()
  });
  if (keyMonitorLogs.length > 1000) keyMonitorLogs = keyMonitorLogs.slice(-1000);

  requestLogs.push({
    timestamp: getIndiaDateTime(),
    key: k.substring(0, 8) + '***',
    endpoint: ep,
    ip: ip,
    clientType: browser
  });
  if (requestLogs.length > 2000) requestLogs = requestLogs.slice(-2000);
}

function checkKeyScope(kd, ep) {
  if (!kd || !kd.scopes || !kd.scopes.length) return { valid: false, error: 'No scopes assigned' };
  if (kd.scopes.indexOf('*') >= 0) return { valid: true };
  if (kd.scopes.indexOf(ep) >= 0) return { valid: true };
  const cleanEp = ep.indexOf('c/') === 0 ? ep.substring(2) : ep;
  const isCustom = customAPIs.some(function (a) { return a.endpoint === cleanEp; });
  if (isCustom) {
    if (kd.scopes.indexOf('custom') >= 0) return { valid: true };
    if (kd.scopes.indexOf('custom:' + cleanEp) >= 0) return { valid: true };
  }
  return { valid: false, error: customMessages.scopeDenied + ': ' + ep };
}

function genToken() { return crypto.randomBytes(24).toString('base64url'); }
function genRandomKey(p) { p = p || 'BRONX'; return p + '_' + crypto.randomBytes(10).toString('hex').toUpperCase(); }

function isAdminAuth(t) {
  if (!t) return false;
  if (adminSessions[t]) {
    if (Date.now() < adminSessions[t].expiresAt) return true;
    delete adminSessions[t];
  }
  return false;
}

function getHiddenFields() {
  return (globalConfig.hiddenFields || '').split(',').map(function (s) { return s.trim(); }).filter(function (s) { return s; });
}

function sanitizeResponse(d, devName) {
  if (!d || typeof d !== 'object') return d;
  try {
    const c = JSON.parse(JSON.stringify(d));
    const toRemove = getHiddenFields();
    function del(obj) {
      if (!obj || typeof obj !== 'object') return;
      toRemove.forEach(function (x) { if (obj[x] !== undefined) delete obj[x]; });
      Object.keys(obj).forEach(function (k) {
        if (obj[k] && typeof obj[k] === 'object') del(obj[k]);
      });
    }
    del(c);
    c.powered_by = devName || globalConfig.developerName || '@BRONX_ULTRA';
    return c;
  } catch (e) {
    return d;
  }
}

function esc(s) {
  if (!s) return '';
  return String(s).replace(/[&<>"']/g, function (m) {
    return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[m];
  });
}

// ============================================================
// 📋 ENDPOINTS
// ============================================================
const endpoints = {
  number: { p: 'num', i: '📱', e: '9876543210', d: 'Mobile Lookup' },
  aadhar: { p: 'num', i: '🆔', e: '393933081942', d: 'Aadhaar' },
  leakinfo: { p: 'term', i: '🕵️', e: 'email@example.com', d: 'Leak Info' },
  name: { p: 'name', i: '🔍', e: 'abhiraaj', d: 'Name Search' },
  numv2: { p: 'num', i: '📱', e: '6205949840', d: 'Number v2' },
  adv: { p: 'num', i: '📱', e: '9876543210', d: 'Advanced Intel' },
  adharfamily: { p: 'num', i: '👨‍👩‍👧‍👦', e: '984154610245', d: 'Family' },
  adharration: { p: 'num', i: '📋', e: '701984830542', d: 'Ration Card' },
  imei: { p: 'imei', i: '📱', e: '357817383506298', d: 'IMEI' },
  calltracer: { p: 'num', i: '📞', e: '9876543210', d: 'Call Tracer' },
  challan: { p: 'vehicle', i: '📋', e: 'UP42BB2572', d: 'Challan' },
  numleak: { p: 'num', i: '🔓', e: '9876543210', d: 'Number Leak' },
  bomber: { p: 'number', i: '💣', e: '9876543210', d: 'SMS Bomber' },
  numtoupi: { p: 'num', i: '💳', e: '8945996482', d: 'Num to UPI' },
  upi: { p: 'upi', i: '💰', e: 'example@ybl', d: 'UPI' },
  ifsc: { p: 'ifsc', i: '🏦', e: 'SBIN0001234', d: 'IFSC' },
  pan: { p: 'pan', i: '📄', e: 'AXDPR2606K', d: 'PAN' },
  pincode: { p: 'pin', i: '📍', e: '110001', d: 'Pincode' },
  ip: { p: 'ip', i: '🌐', e: '8.8.8.8', d: 'IP Lookup' },
  vehicle: { p: 'vehicle', i: '🚗', e: 'MH02FZ0555', d: 'Vehicle' },
  rc: { p: 'owner', i: '📋', e: 'UP92P2111', d: 'veh2num' },
  veh2num: { p: 'vehicle', i: '🚗', e: 'KL41V3504', d: 'Veh to Num' },
  ff: { p: 'uid', i: '🎮', e: '123456789', d: 'Free Fire' },
  bgmi: { p: 'uid', i: '🎮', e: '5121439477', d: 'BGMI' },
  insta: { p: 'username', i: '📸', e: 'cristiano', d: 'Instagram' },
  git: { p: 'username', i: '💻', e: 'ftgamer2', d: 'GitHub' },
  tg: { p: 'info', i: '📲', e: 'JAUUOWNER', d: 'Telegram' },
  tgidinfo: { p: 'id', i: '📲', e: '7530266953', d: 'TG ID Info' },
  snap: { p: 'username', i: '👻', e: 'priyapanchal272', d: 'Snapchat' },
  pk: { p: 'num', i: '🇵🇰', e: '03331234567', d: 'Pakistan' },
  pkv2: { p: 'num', i: '🇵🇰', e: '3359736848', d: 'Pakistan v2' }
};

// ============================================================
// 🎬 INIT DEFAULTS
// ============================================================
function initDefaults() {
  const now = getIndiaDateTime();
  const hc = [
    ['BRONX_PREMIUM_V100_01', 'Premium 01', '31-12-2028', ['*']],
    ['BRONX_ULTRA_OSINT_01', 'Ultra 01', '30-06-2029', ['number', 'aadhar', 'upi', 'pan']],
    ['BRONX_KING_OP_V100', 'King OP', '31-12-2030', ['*']]
  ];
  hc.forEach(function (item) {
    const k = item[0], n = item[1], e = item[2], s = item[3];
    if (!keyStorage[k]) {
      keyStorage[k] = {
        name: n, scopes: s, type: 'hardcoded', limit: 999999, used: 0, cooldown: 0,
        dailyLimit: 0, perSecondLimit: 0,
        expiry: parseExpiryDate(e), expiryStr: e, created: now,
        unlimited: true, hidden: true, _hardcoded: true, developerName: ''
      };
    }
  });

  if (customAPIs.length === 0) {
    customAPIs = [
      { id: 1, name: 'Number Info', endpoint: 'number-advanced', param: 'num', example: '9876543210', visible: true, realAPI: 'https://num-tg-info-api.vercel.app/info?number={param}', scopeKey: 'custom:number-advanced', createdAt: now },
      { id: 2, name: 'Vehicle RC', endpoint: 'rc-details', param: 'ca_number', example: 'MH02FZ0555', visible: true, realAPI: 'https://simple-rc-info.vercel.app/rc?num={param}', scopeKey: 'custom:rc-details', createdAt: now },
      { id: 3, name: 'Aadhar', endpoint: 'aadhar-verify', param: 'aadhar', example: '393933081942', visible: true, realAPI: 'https://bronx-king-vip999.vercel.app/api/aadhaar?num={param}', scopeKey: 'custom:aadhar-verify', createdAt: now },
      { id: 4, name: 'Telegram', endpoint: 'telegram-scan', param: 'id', example: '7530266953', visible: true, realAPI: 'https://bronx-tg-king-bro.vercel.app/tg?key=BRONXop&query={param}', scopeKey: 'custom:telegram-scan', createdAt: now }
    ];
  }
}

// ============================================================
// 🌐 MIDDLEWARE
// ============================================================
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.set('json spaces', 2);
app.use(function (req, res, next) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,x-api-key,x-admin-token');
  if (req.method === 'OPTIONS') return res.status(200).end();
  next();
});
app.use('/api', function (req, res, next) {
  const r = smartDDoS(req);
  res.setHeader('X-RateLimit-Mode', ddosConfig.mode);
  if (r.action && r.action !== 'OK') res.setHeader('X-Bronx-Warning', r.reason || 'ok');
  if (!r.allowed) {
    res.setHeader('Content-Type', 'text/plain');
    return res.status(r.code || 429).send(r.reason || 'Rate limited');
  }
  if (r.action === 'THROTTLE') return setTimeout(next, 800);
  next();
});

// ============================================================
// 🏠 PUBLIC ROUTES
// ============================================================
app.get('/', function (req, res) {
  try { res.send(renderHome()); }
  catch (e) { res.send('err: ' + e.message); }
});

app.get('/test', function (req, res) {
  res.json({
    status: '✅ BRONX V504 ONLINE',
    version: '5.0.4',
    ddos: ddosConfig.mode,
    keys: Object.keys(keyStorage).length,
    endpoints: Object.keys(endpoints).length,
    custom: customAPIs.length,
    bannedIPs: Object.keys(bans.ip).length,
    devicesTracked: Object.keys(deviceFingerprints).length,
    theme: theme.preset,
    maintenance: maintenance.enabled
  });
});

app.get('/api/public/preview/:ep', function (req, res) {
  const ep = req.params.ep;
  const exists = endpoints[ep] || customAPIs.some(function (a) { return a.endpoint === ep; });
  if (!exists) return res.status(404).json({ error: 'Not found' });
  res.json(endpointResponses[ep] || { status: 'success', data: 'Sample response — admin can set this in the admin panel.' });
});

// ============================================================
// 🚀 API — CUSTOM
// ============================================================
app.get('/api/custom/:ep', async function (req, res) {
  try {
    const api = customAPIs.find(function (a) { return a.endpoint === req.params.ep && a.visible; });
    if (!api) {
      res.setHeader('Content-Type', 'text/plain');
      return res.status(404).send('API not found or disabled');
    }
    const key = req.query.key;
    if (!key) {
      res.setHeader('Content-Type', 'text/plain');
      return res.status(400).send(customMessages.missingKey);
    }
    const kc = checkKeyValid(key);
    if (!kc.valid) {
      res.setHeader('Content-Type', 'text/plain');
      return res.status(403).send(kc.error);
    }
    const sc = checkKeyScope(kc.keyData, req.params.ep);
    if (!sc.valid) {
      res.setHeader('Content-Type', 'text/plain');
      return res.status(403).send(sc.error);
    }
    const pv = req.query[api.param] || req.query.number || req.query.num;
    if (!pv) {
      res.setHeader('Content-Type', 'text/plain');
      return res.status(400).send('Missing param: ' + api.param);
    }
    if (isProtected(pv)) {
      res.setHeader('Content-Type', 'text/plain');
      return res.status(403).send('🔒 PROTECTED');
    }

    if (endpointResponses[api.endpoint]) {
      const devName = kc.keyData.developerName || globalConfig.developerName;
      incrementKeyUsage(key, 'c/' + req.params.ep, req);
      return res.json(Object.assign({}, sanitizeResponse(endpointResponses[api.endpoint], devName), { api_info: { key_owner: kc.keyData.name } }));
    }

    const url = api.realAPI.replace(/\{param\}/gi, encodeURIComponent(pv));
    const r = await axios.get(url, { timeout: 30000 });
    incrementKeyUsage(key, 'c/' + req.params.ep, req);
    const devName = kc.keyData.developerName || globalConfig.developerName;
    res.json(Object.assign({}, sanitizeResponse(r.data, devName), {
      api_info: {
        key_owner: kc.keyData.name,
        remaining: kc.keyData.unlimited ? '∞' : Math.max(0, kc.keyData.limit - kc.keyData.used),
        expiry: kc.keyData.expiryStr || 'LIFETIME'
      }
    }));
  } catch (e) {
    res.setHeader('Content-Type', 'text/plain');
    res.status(500).send('API error: ' + e.message);
  }
});

// ============================================================
// 🚀 API — MAIN
// ============================================================
app.get('/api/key-bronx/:ep', async function (req, res) {
  try {
    const ep = req.params.ep;
    if (!endpoints[ep]) {
      res.setHeader('Content-Type', 'text/plain');
      return res.status(404).send('Endpoint not found');
    }
    const key = req.query.key;
    if (!key) {
      res.setHeader('Content-Type', 'text/plain');
      return res.status(400).send(customMessages.missingKey);
    }
    const kc = checkKeyValid(key);
    if (!kc.valid) {
      res.setHeader('Content-Type', 'text/plain');
      return res.status(403).send(kc.error);
    }
    const sc = checkKeyScope(kc.keyData, ep);
    if (!sc.valid) {
      res.setHeader('Content-Type', 'text/plain');
      return res.status(403).send(sc.error);
    }
    const pv = req.query[endpoints[ep].p];
    if (!pv) {
      res.setHeader('Content-Type', 'text/plain');
      return res.status(400).send('Missing parameter: ' + endpoints[ep].p);
    }
    if (isProtected(pv)) {
      res.setHeader('Content-Type', 'text/plain');
      return res.status(403).send('🔒 PROTECTED');
    }

    const devName = kc.keyData.developerName || globalConfig.developerName;

    if (endpointResponses[ep]) {
      incrementKeyUsage(key, ep, req);
      return res.json(Object.assign({}, sanitizeResponse(endpointResponses[ep], devName), { api_info: { key_owner: kc.keyData.name } }));
    }

    const url = REAL_API_BASE + '/' + ep + '?key=' + getNextKey() + '&' + endpoints[ep].p + '=' + encodeURIComponent(pv);
    const r = await axios.get(url, { timeout: 30000 });
    incrementKeyUsage(key, ep, req);
    res.json(Object.assign({}, sanitizeResponse(r.data, devName), {
      api_info: {
        key_owner: kc.keyData.name,
        remaining: kc.keyData.unlimited ? '∞' : Math.max(0, kc.keyData.limit - kc.keyData.used),
        expiry: kc.keyData.expiryStr || 'LIFETIME'
      }
    }));
  } catch (e) {
    res.setHeader('Content-Type', 'text/plain');
    res.status(500).send('API error: ' + e.message);
  }
});

// ============================================================
// 🔐 ADMIN AUTH
// ============================================================
app.get(ADMIN_PATH, function (req, res) {
  try {
    const token = req.query.token || req.headers['x-admin-token'];
    if (token && isAdminAuth(token)) return res.send(renderAdmin(token));
    res.send(renderLogin());
  } catch (e) {
    res.send('err: ' + e.message);
  }
});

app.post(ADMIN_PATH + '/login', function (req, res) {
  const { username, password } = req.body;
  const ip = getRealIP(req);
  const ua = req.headers['user-agent'] || '';
  if (bans.ip['LOGIN_' + ip] && (bans.ip['LOGIN_' + ip].permanent || Date.now() < bans.ip['LOGIN_' + ip].until)) {
    return res.json({ success: false, error: '🚫 Too many failed attempts. Try later.' });
  }
  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    const token = genToken();
    adminSessions[token] = { expiresAt: Date.now() + 365 * 24 * 3600 * 1000 };
    delete abuseTracker.ip['LOGIN_' + ip];
    adminLogs.push({ user: username, action: 'LOGIN', ip: ip, browser: ua, timestamp: getIndiaDateTime(), status: 'SUCCESS' });
    saveToDisk();
    res.json({ success: true, token: token, message: '✅ Access Granted', redirect: ADMIN_PATH + '?token=' + token });
  } else {
    pushHit(abuseTracker.ip, 'LOGIN_' + ip, 3600000);
    const attempts = countWindow(abuseTracker.ip, 'LOGIN_' + ip, 3600000);
    if (attempts >= ddosConfig.login.maxAttempts) {
      bans.ip['LOGIN_' + ip] = { until: Date.now() + ddosConfig.login.banMs, reason: 'Failed logins', at: getIndiaDateTime(), strikes: attempts };
    }
    adminLogs.push({ user: username, action: 'LOGIN_FAILED', ip: ip, browser: ua, attempts: attempts, timestamp: getIndiaDateTime(), status: 'FAILED' });
    res.json({ success: false, error: 'Invalid credentials! ' + (ddosConfig.login.maxAttempts - attempts) + ' attempts left.' });
  }
});

function adminAuth(req, res, next) {
  const t = req.headers['x-admin-token'] || req.query.token;
  if (!isAdminAuth(t)) return res.json({ e: 'Unauthorized' });
  next();
}

// ============================================================
// 🎛️ ADMIN APIs
// ============================================================
app.post(ADMIN_PATH + '/generate-key', adminAuth, function (req, res) {
  const b = req.body;
  let fk = b.keyName && b.keyName.trim() ? b.keyName.trim() : genRandomKey();
  if (!b.keyOwner) return res.json({ e: 'Owner required' });
  if (keyStorage[fk]) return res.json({ e: 'Key already exists' });

  let exp = null, es = 'LIFETIME';
  if (b.days && !isNaN(b.days)) {
    const d = new Date(Date.now() + parseInt(b.days) * 24 * 3600 * 1000);
    exp = d;
    es = d.toISOString().split('T')[0].split('-').reverse().join('-');
  }

  keyStorage[fk] = {
    name: b.keyOwner,
    scopes: b.scopes || ['number'],
    type: 'generated',
    limit: parseInt(b.limit) || 100,
    used: 0,
    cooldown: parseInt(b.cooldown) || 0,
    dailyLimit: parseInt(b.dailyLimit) || 0,
    perSecondLimit: parseInt(b.perSecondLimit) || 0,
    expiry: exp, expiryStr: es, created: getIndiaDateTime(),
    unlimited: false, hidden: false, _hardcoded: false,
    stopped: false, disabled: false,
    notes: b.notes || '',
    developerName: b.developerName || ''
  };
  logAudit('admin', 'GENERATE_KEY', { key: fk });
  saveToDisk();
  res.json({ success: true, key: fk, message: '🔑 Key Generated!' });
});

app.post(ADMIN_PATH + '/edit-key', adminAuth, function (req, res) {
  const b = req.body;
  const kd = keyStorage[b.keyName];
  if (!kd) return res.json({ e: 'Not found' });
  if (kd._hardcoded) return res.json({ e: 'Hardcoded — cannot edit' });
  if (b.newOwner !== undefined) kd.name = b.newOwner;
  if (b.newLimit !== undefined) kd.limit = parseInt(b.newLimit);
  if (b.newDailyLimit !== undefined) kd.dailyLimit = parseInt(b.newDailyLimit);
  if (b.newPerSecondLimit !== undefined) kd.perSecondLimit = parseInt(b.newPerSecondLimit);
  if (b.newCooldown !== undefined) kd.cooldown = parseInt(b.newCooldown);
  if (b.newScopes) kd.scopes = b.newScopes;
  if (b.newNotes !== undefined) kd.notes = b.newNotes;
  if (b.newDeveloperName !== undefined) kd.developerName = b.newDeveloperName;
  if (b.newExpiry) {
    const e = parseExpiryDate(b.newExpiry);
    if (e) { kd.expiry = e; kd.expiryStr = b.newExpiry; }
  }
  logAudit('admin', 'EDIT_KEY', { key: b.keyName });
  saveToDisk();
  res.json({ success: true, message: '✅ Updated!' });
});

app.post(ADMIN_PATH + '/delete-key', adminAuth, function (req, res) {
  const k = req.body.keyName;
  if (keyStorage[k] && keyStorage[k]._hardcoded) return res.json({ e: 'Protected' });
  delete keyStorage[k];
  saveToDisk();
  res.json({ success: true });
});

app.post(ADMIN_PATH + '/reset-key-usage', adminAuth, function (req, res) {
  const k = req.body.keyName;
  if (!keyStorage[k]) return res.json({ e: 'Not found' });
  keyStorage[k].used = 0;
  saveToDisk();
  res.json({ success: true });
});

app.post(ADMIN_PATH + '/reset-all', adminAuth, function (req, res) {
  Object.keys(keyStorage).forEach(function (k) {
    if (!keyStorage[k]._hardcoded) keyStorage[k].used = 0;
  });
  dailyLimits = {};
  perSecondLimits = {};
  saveToDisk();
  res.json({ success: true });
});

app.post(ADMIN_PATH + '/clear-logs', adminAuth, function (req, res) {
  requestLogs = [];
  keyMonitorLogs = [];
  saveToDisk();
  res.json({ success: true });
});

app.post(ADMIN_PATH + '/stop-key', adminAuth, function (req, res) {
  const k = req.body.keyName;
  if (!keyStorage[k]) return res.json({ e: 'Not found' });
  if (keyStorage[k]._hardcoded) return res.json({ e: 'Hardcoded' });
  keyStorage[k].stopped = !keyStorage[k].stopped;
  saveToDisk();
  res.json({ success: true, stopped: keyStorage[k].stopped });
});

app.post(ADMIN_PATH + '/disable-key', adminAuth, function (req, res) {
  const k = req.body.keyName;
  if (!keyStorage[k]) return res.json({ e: 'Not found' });
  if (keyStorage[k]._hardcoded) return res.json({ e: 'Hardcoded' });
  keyStorage[k].disabled = !keyStorage[k].disabled;
  saveToDisk();
  res.json({ success: true, disabled: keyStorage[k].disabled });
});

app.post(ADMIN_PATH + '/update-scopes', adminAuth, function (req, res) {
  const { keyName, scopes } = req.body;
  if (!keyStorage[keyName]) return res.json({ e: 'Not found' });
  if (keyStorage[keyName]._hardcoded) return res.json({ e: 'Hardcoded' });
  keyStorage[keyName].scopes = scopes;
  saveToDisk();
  res.json({ success: true });
});

app.post(ADMIN_PATH + '/push-key', adminAuth, function (req, res) {
  const { keyName, days } = req.body;
  if (!keyStorage[keyName]) return res.json({ e: 'Not found' });
  if (keyStorage[keyName]._hardcoded) return res.json({ e: 'Hardcoded' });
  const d = parseInt(days) || 30;
  const ne = new Date(Date.now() + d * 24 * 3600 * 1000);
  keyStorage[keyName].expiry = ne;
  keyStorage[keyName].expiryStr = ne.toISOString().split('T')[0].split('-').reverse().join('-');
  keyStorage[keyName].used = 0;
  saveToDisk();
  res.json({ success: true, message: '⬆ Pushed ' + d + ' days!' });
});

app.post(ADMIN_PATH + '/push-all', adminAuth, function (req, res) {
  const d = parseInt(req.body.days) || 30;
  const ne = new Date(Date.now() + d * 24 * 3600 * 1000);
  let count = 0;
  Object.keys(keyStorage).forEach(function (k) {
    if (!keyStorage[k]._hardcoded) {
      keyStorage[k].expiry = ne;
      keyStorage[k].expiryStr = ne.toISOString().split('T')[0].split('-').reverse().join('-');
      count++;
    }
  });
  saveToDisk();
  res.json({ success: true, count: count, message: '⬆ Pushed ' + d + ' days to ' + count + ' keys!' });
});

app.post(ADMIN_PATH + '/add-api', adminAuth, function (req, res) {
  const b = req.body;
  if (!b.name || !b.endpoint) return res.json({ e: 'Name and endpoint required' });
  const cleanEp = String(b.endpoint).toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  if (!cleanEp) return res.json({ e: 'Invalid endpoint' });
  if (customAPIs.some(function (a) { return a.endpoint === cleanEp; })) return res.json({ e: 'Endpoint exists' });
  const api = {
    id: Date.now(), name: b.name, endpoint: cleanEp,
    param: b.param || 'num', example: b.example || '9876543210',
    visible: b.visible !== false, realAPI: b.realAPI || '',
    scopeKey: 'custom:' + cleanEp, createdAt: getIndiaDateTime()
  };
  customAPIs.push(api);
  saveToDisk();
  res.json({ success: true, api: api, message: '✅ API Added!' });
});

app.post(ADMIN_PATH + '/toggle-api', adminAuth, function (req, res) {
  const a = customAPIs.find(function (x) { return x.id === parseInt(req.body.id); });
  if (!a) return res.json({ e: 'Not found' });
  a.visible = !a.visible;
  saveToDisk();
  res.json({ success: true, visible: a.visible });
});

app.post(ADMIN_PATH + '/delete-api', adminAuth, function (req, res) {
  const i = customAPIs.findIndex(function (x) { return x.id === parseInt(req.body.id); });
  if (i === -1) return res.json({ e: 'Not found' });
  customAPIs.splice(i, 1);
  saveToDisk();
  res.json({ success: true });
});

app.post(ADMIN_PATH + '/add-protection', adminAuth, function (req, res) {
  const v = req.body.value;
  if (!v) return res.json({ e: 'Missing' });
  protectedData[v] = v;
  saveToDisk();
  res.json({ success: true });
});

app.post(ADMIN_PATH + '/remove-protection', adminAuth, function (req, res) {
  delete protectedData[req.body.value];
  saveToDisk();
  res.json({ success: true });
});

app.get(ADMIN_PATH + '/bans', adminAuth, function (req, res) {
  function list(o) {
    return Object.keys(o).map(function (id) {
      const d = o[id];
      return {
        id: id,
        permanent: d.permanent || false,
        until: d.until || null,
        reason: d.reason || '',
        at: d.at || '',
        strikes: d.strikes || 0
      };
    });
  }
  res.json({ ip: list(bans.ip), device: list(bans.device), key: list(bans.key) });
});

app.post(ADMIN_PATH + '/ban', adminAuth, function (req, res) {
  const { type, id, reason, permanent, minutes } = req.body;
  if (!type || !id) return res.json({ e: 'Missing' });
  if (!bans[type]) bans[type] = {};
  bans[type][id] = {
    permanent: !!permanent,
    until: permanent ? null : Date.now() + (parseInt(minutes) || 60) * 60000,
    reason: reason || 'Manual ban',
    at: getIndiaDateTime()
  };
  saveToDisk();
  res.json({ success: true });
});

app.post(ADMIN_PATH + '/unban', adminAuth, function (req, res) {
  const { type, id } = req.body;
  if (bans[type]) delete bans[type][id];
  if (abuseTracker[type] && abuseTracker[type][id]) delete abuseTracker[type][id];
  saveToDisk();
  res.json({ success: true });
});

app.post(ADMIN_PATH + '/unban-all', adminAuth, function (req, res) {
  bans = { ip: {}, device: {}, key: {} };
  abuseTracker = { ip: {}, device: {}, key: {} };
  saveToDisk();
  res.json({ success: true });
});

app.get(ADMIN_PATH + '/devices', adminAuth, function (req, res) {
  const list = Object.keys(deviceFingerprints).map(function (id) {
    const d = deviceFingerprints[id];
    return {
      id: id,
      deviceType: d.deviceType || '?',
      os: d.os || '?',
      browser: d.browser || '?',
      requests: d.requests || 0,
      lastSeen: d.lastSeen || '',
      banned: !!bans.device[id]
    };
  }).sort(function (a, b) { return b.requests - a.requests; });
  res.json({ devices: list, total: list.length });
});

app.get(ADMIN_PATH + '/ddos-config', adminAuth, function (req, res) {
  res.json(ddosConfig);
});

app.post(ADMIN_PATH + '/ddos-config', adminAuth, function (req, res) {
  const c = req.body;
  if (c.mode) ddosConfig.mode = c.mode;
  if (c.enabled !== undefined) ddosConfig.enabled = !!c.enabled;
  ['ip', 'device', 'key'].forEach(function (k) {
    if (c[k]) {
      if (c[k].burst10s) ddosConfig[k].burst10s = parseInt(c[k].burst10s);
      if (c[k].perMinute) ddosConfig[k].perMinute = parseInt(c[k].perMinute);
      if (c[k].perHour) ddosConfig[k].perHour = parseInt(c[k].perHour);
    }
  });
  saveToDisk();
  res.json({ success: true, config: ddosConfig });
});

app.post(ADMIN_PATH + '/clear-strikes', adminAuth, function (req, res) {
  ['ip', 'device', 'key'].forEach(function (t) {
    Object.keys(abuseTracker[t] || {}).forEach(function (x) { abuseTracker[t][x].strikes = 0; });
  });
  saveToDisk();
  res.json({ success: true });
});

app.get(ADMIN_PATH + '/monitor-logs', adminAuth, function (req, res) {
  res.json({ logs: keyMonitorLogs.slice(-300), total: keyMonitorLogs.length });
});

app.get(ADMIN_PATH + '/stats', adminAuth, function (req, res) {
  if (statsCache.data && Date.now() < statsCache.expiresAt) return res.json(statsCache.data);
  const today = getIndiaDate();
  const todayL = keyMonitorLogs.filter(function (l) { return l.date === today; });
  const byKey = {}, byEp = {};
  keyMonitorLogs.forEach(function (l) {
    byKey[l.key] = (byKey[l.key] || 0) + 1;
    byEp[l.endpoint] = (byEp[l.endpoint] || 0) + 1;
  });
  function top(o, n) {
    n = n || 10;
    return Object.keys(o).map(function (k) { return { k: k, v: o[k] }; })
      .sort(function (a, b) { return b.v - a.v; }).slice(0, n);
  }
  const data = {
    totalRequests: keyMonitorLogs.length,
    todayRequests: todayL.length,
    topKeys: top(byKey, 5),
    topEndpoints: top(byEp, 10)
  };
  statsCache = { data: data, expiresAt: Date.now() + 10000 };
  res.json(data);
});

app.get(ADMIN_PATH + '/theme', adminAuth, function (req, res) {
  res.json({ theme: theme, presets: Object.keys(PRESETS) });
});

app.post(ADMIN_PATH + '/theme/preset', adminAuth, function (req, res) {
  if (!applyPreset(req.body.preset)) return res.json({ e: 'Invalid preset' });
  saveToDisk();
  res.json({ success: true, theme: theme });
});

app.get(ADMIN_PATH + '/response-settings', adminAuth, function (req, res) {
  res.json({ globalConfig: globalConfig, customMessages: customMessages });
});

app.post(ADMIN_PATH + '/update-response-settings', adminAuth, function (req, res) {
  const { developerName, hiddenFields, messages } = req.body;
  if (developerName !== undefined) globalConfig.developerName = developerName;
  if (hiddenFields !== undefined) globalConfig.hiddenFields = hiddenFields;
  if (messages) {
    Object.keys(messages).forEach(function (k) {
      if (customMessages[k] !== undefined) customMessages[k] = messages[k];
    });
  }
  saveToDisk();
  res.json({ success: true, globalConfig: globalConfig, customMessages: customMessages });
});

app.post(ADMIN_PATH + '/update-endpoint-response', adminAuth, function (req, res) {
  const { endpoint, responseData } = req.body;
  if (!endpoint) return res.json({ e: 'Missing endpoint' });
  try {
    if (!responseData || (typeof responseData === 'string' && responseData.trim() === '')) {
      delete endpointResponses[endpoint];
    } else {
      endpointResponses[endpoint] = typeof responseData === 'string' ? JSON.parse(responseData) : responseData;
    }
    saveToDisk();
    res.json({ success: true });
  } catch (e) {
    res.json({ e: 'Invalid JSON' });
  }
});

app.get(ADMIN_PATH + '/get-endpoint-response', adminAuth, function (req, res) {
  res.json({ data: endpointResponses[req.query.endpoint] || null });
});

app.get(ADMIN_PATH + '/export-keys', adminAuth, function (req, res) {
  const out = {};
  Object.keys(keyStorage).forEach(function (k) {
    if (!keyStorage[k]._hardcoded) out[k] = keyStorage[k];
  });
  res.json({ success: true, total: Object.keys(out).length, keys: out, exported_at: getIndiaDateTime() });
});

app.post(ADMIN_PATH + '/import-keys', adminAuth, function (req, res) {
  try {
    let body = req.body;
    let toImport = body.keys || body;
    if (toImport.keys && typeof toImport.keys === 'object' && !Array.isArray(toImport.keys)) toImport = toImport.keys;
    const meta = ['success', 'total', 'keys', 'exported_at'];
    let imported = 0, skipped = 0;
    Object.keys(toImport).forEach(function (k) {
      const d = toImport[k];
      if (meta.indexOf(k) >= 0 && typeof d !== 'object') return;
      if (!d || typeof d !== 'object') return;
      if (keyStorage[k] || d._hardcoded) { skipped++; return; }
      keyStorage[k] = Object.assign({}, d, { _hardcoded: false, hidden: false, type: 'generated' });
      imported++;
    });
    saveToDisk();
    res.json({ success: true, imported: imported, skipped: skipped, message: '✅ ' + imported + ' imported, ' + skipped + ' skipped' });
  } catch (e) {
    res.json({ e: 'Error: ' + e.message });
  }
});

app.get(ADMIN_PATH + '/backup', adminAuth, function (req, res) {
  const ks = {};
  Object.keys(keyStorage).forEach(function (k) {
    if (!keyStorage[k]._hardcoded) ks[k] = keyStorage[k];
  });
  res.json({
    version: '5.0.4',
    exported_at: getIndiaDateTime(),
    keys: ks,
    apis: customAPIs,
    protected: protectedData,
    endpointResponses: endpointResponses,
    theme: theme,
    ddosConfig: ddosConfig,
    whitelist: whitelist,
    announcement: announcement,
    maintenance: maintenance,
    globalConfig: globalConfig,
    customMessages: customMessages
  });
});

app.post(ADMIN_PATH + '/restore', adminAuth, function (req, res) {
  try {
    const b = req.body;
    if (b.keys) Object.keys(b.keys).forEach(function (k) {
      if (!b.keys[k]._hardcoded) keyStorage[k] = b.keys[k];
    });
    if (b.apis) customAPIs = b.apis;
    if (b.protected) protectedData = b.protected;
    if (b.endpointResponses) endpointResponses = b.endpointResponses;
    if (b.theme) {
      Object.assign(theme, b.theme);
      if (b.theme.colors) Object.assign(theme.colors, b.theme.colors);
    }
    if (b.ddosConfig) Object.assign(ddosConfig, b.ddosConfig);
    if (b.whitelist) whitelist = b.whitelist;
    if (b.announcement) announcement = b.announcement;
    if (b.maintenance) maintenance = b.maintenance;
    if (b.globalConfig) Object.assign(globalConfig, b.globalConfig);
    if (b.customMessages) Object.assign(customMessages, b.customMessages);
    saveToDisk();
    res.json({ success: true, message: '✅ Restored' });
  } catch (e) {
    res.json({ e: 'Restore failed: ' + e.message });
  }
});

app.get(ADMIN_PATH + '/announcement', adminAuth, function (req, res) {
  res.json({ announcement: announcement });
});
app.post(ADMIN_PATH + '/announcement', adminAuth, function (req, res) {
  const { enabled, text } = req.body;
  announcement = { enabled: !!enabled, text: text || '', type: 'info' };
  saveToDisk();
  res.json({ success: true, announcement: announcement });
});

app.get(ADMIN_PATH + '/maintenance', adminAuth, function (req, res) {
  res.json({ maintenance: maintenance });
});
app.post(ADMIN_PATH + '/maintenance', adminAuth, function (req, res) {
  const { enabled, message } = req.body;
  maintenance = { enabled: !!enabled, message: message || 'System under maintenance' };
  saveToDisk();
  res.json({ success: true, maintenance: maintenance });
});

app.get(ADMIN_PATH + '/audit-log', adminAuth, function (req, res) {
  res.json({ logs: auditLog.slice(-300), total: auditLog.length });
});
app.get(ADMIN_PATH + '/admin-logs', adminAuth, function (req, res) {
  res.json({ logs: adminLogs.slice(-300), total: adminLogs.length });
});

// 404
app.use(function (req, res) {
  res.status(404).json({ error: 'Not found' });
});

// ============================================================
// 🎨 CSS GENERATOR (no backticks inside — pure concatenation)
// ============================================================
function generateCSS() {
  const c = theme.colors;
  const r = theme.radius;
  let css = '<style id="bronx-theme">\n';
  css += ':root{\n';
  css += '  --bg-primary:' + c.bgPrimary + ';--bg-secondary:' + c.bgSecondary + ';--bg-card:' + c.bgCard + ';\n';
  css += '  --border-color:' + c.borderColor + ';--text-primary:' + c.textPrimary + ';\n';
  css += '  --text-secondary:' + c.textSecondary + ';--text-muted:' + c.textMuted + ';\n';
  css += '  --accent:' + c.accent + ';--accent2:' + c.accent2 + ';\n';
  css += '  --success:' + c.success + ';--warning:' + c.warning + ';--danger:' + c.danger + ';--info:' + c.info + ';\n';
  css += '  --radius:' + r + 'px;--tr:all .15s ease;\n';
  css += '}\n';
  css += '*{margin:0;padding:0;box-sizing:border-box}\n';
  css += 'html,body{background:var(--bg-primary);color:var(--text-primary);font-family:' + theme.fonts.body + ';line-height:1.5;-webkit-font-smoothing:antialiased}\n';
  css += 'body{min-height:100vh;position:relative}\n';
  css += '.grid-bg{position:fixed;inset:0;background-image:radial-gradient(rgba(88,166,255,0.06) 1px,transparent 1px);background-size:22px 22px;z-index:0;pointer-events:none}\n';
  css += 'a{color:var(--accent);text-decoration:none}\n';
  css += '::-webkit-scrollbar{width:10px;height:10px}\n';
  css += '::-webkit-scrollbar-track{background:var(--bg-primary)}\n';
  css += '::-webkit-scrollbar-thumb{background:#30363d;border-radius:5px;border:2px solid var(--bg-primary)}\n';
  css += '::-webkit-scrollbar-thumb:hover{background:#484f58}\n';
  css += '.code{font-family:' + theme.fonts.mono + '}\n';
  css += '.admin-container{display:flex;min-height:100vh;position:relative;z-index:10}\n';
  css += '.sidebar{width:260px;background:var(--bg-secondary);border-right:1px solid var(--border-color);padding:16px 0;position:fixed;height:100vh;overflow-y:auto;top:0;left:0}\n';
  css += '.sidebar-header{padding:0 20px 16px;border-bottom:1px solid var(--border-color);margin-bottom:12px}\n';
  css += '.sidebar-logo{font-size:22px;font-weight:700;color:var(--text-primary);font-family:' + theme.fonts.heading + ';letter-spacing:-0.5px;display:flex;align-items:center;gap:8px}\n';
  css += '.sidebar-logo span{color:var(--accent)}\n';
  css += '.sidebar-subtitle{font-size:11px;color:var(--text-muted);margin-top:2px;font-family:' + theme.fonts.mono + '}\n';
  css += '.sidebar-nav{list-style:none;padding:0 8px}\n';
  css += '.sidebar-nav li{margin-bottom:1px}\n';
  css += '.sidebar-nav a{display:flex;align-items:center;gap:10px;padding:8px 12px;color:var(--text-secondary);border-radius:6px;transition:var(--tr);font-size:13px;font-weight:500;cursor:pointer;border-left:2px solid transparent}\n';
  css += '.sidebar-nav a:hover{background:#1f2630;color:var(--text-primary)}\n';
  css += '.sidebar-nav a.active{background:#1f2630;color:var(--accent);border-left-color:var(--accent)}\n';
  css += '.sidebar-nav i{width:16px;text-align:center;font-size:13px;opacity:0.8}\n';
  css += '.main-content{flex:1;margin-left:260px;padding:24px;max-width:calc(100vw - 260px)}\n';
  css += '.glow-card{background:var(--bg-card);border:1px solid var(--border-color);border-radius:var(--radius);padding:24px;margin-bottom:20px}\n';
  css += '.glow-card h3{margin-bottom:18px;font-size:15px;font-weight:600;display:flex;align-items:center;gap:8px;color:var(--text-primary);font-family:' + theme.fonts.heading + '}\n';
  css += '.glow-card h3 i{color:var(--accent);font-size:14px}\n';
  css += '.glow-card h4{font-size:13px;color:var(--text-secondary);font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:12px}\n';
  css += '.stats-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-bottom:20px}\n';
  css += '.stat-card{background:var(--bg-secondary);border:1px solid var(--border-color);border-radius:8px;padding:16px;transition:var(--tr)}\n';
  css += '.stat-card:hover{border-color:var(--accent)}\n';
  css += '.stat-icon{font-size:20px;margin-bottom:8px}\n';
  css += '.stat-value{font-size:24px;font-weight:700;color:var(--accent);margin-bottom:2px;font-family:' + theme.fonts.mono + '}\n';
  css += '.stat-label{font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.8px;font-weight:600}\n';
  css += '.form-group{margin-bottom:14px}\n';
  css += '.form-group label{display:block;margin-bottom:6px;color:var(--text-secondary);font-size:12px;font-weight:600;letter-spacing:0.2px}\n';
  css += '.form-input{width:100%;padding:9px 12px;background:var(--bg-primary);border:1px solid var(--border-color);border-radius:5px;color:var(--text-primary);font-size:13px;transition:var(--tr);outline:none;font-family:' + theme.fonts.body + '}\n';
  css += '.form-input:focus{border-color:var(--accent);box-shadow:0 0 0 3px rgba(88,166,255,0.15)}\n';
  css += 'textarea.form-input{font-family:' + theme.fonts.mono + ';font-size:12px;line-height:1.5;resize:vertical}\n';
  css += '.form-input option{background:var(--bg-secondary);color:var(--text-primary)}\n';
  css += '.btn-primary{display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:9px 16px;background:var(--accent);color:#fff;border:none;border-radius:6px;cursor:pointer;font-weight:600;font-size:13px;transition:var(--tr);font-family:' + theme.fonts.body + ';text-decoration:none}\n';
  css += '.btn-primary:hover{opacity:0.9;transform:translateY(-1px)}\n';
  css += '.btn-primary.btn-success{background:var(--success)}\n';
  css += '.btn-primary.btn-danger{background:var(--danger)}\n';
  css += '.btn-primary.btn-warning{background:var(--warning);color:#000}\n';
  css += '.btn-primary.btn-info{background:var(--info)}\n';
  css += '.btn-action{display:inline-flex;align-items:center;gap:4px;padding:5px 10px;border-radius:5px;border:1px solid var(--border-color);cursor:pointer;font-size:11px;font-weight:500;transition:var(--tr);background:var(--bg-secondary);color:var(--text-secondary);margin:2px}\n';
  css += '.btn-action:hover{border-color:var(--accent);color:var(--accent)}\n';
  css += '.btn-action.danger{border-color:rgba(248,81,73,0.4);color:var(--danger)}\n';
  css += '.btn-action.success{border-color:rgba(63,185,80,0.4);color:var(--success)}\n';
  css += '.table-container{overflow:auto;border-radius:6px;border:1px solid var(--border-color);background:var(--bg-secondary)}\n';
  css += '.table-container table{width:100%;border-collapse:collapse;font-size:12.5px}\n';
  css += '.table-container th{background:#1c2128;color:var(--text-secondary);padding:10px 12px;text-align:left;font-weight:600;text-transform:uppercase;font-size:10.5px;letter-spacing:0.6px;position:sticky;top:0;z-index:2;border-bottom:1px solid var(--border-color);white-space:nowrap}\n';
  css += '.table-container td{padding:10px 12px;border-bottom:1px solid var(--border-color);color:var(--text-primary);vertical-align:middle}\n';
  css += '.table-container tr:hover td{background:#1f2630}\n';
  css += '.table-container tr:last-child td{border-bottom:none}\n';
  css += 'code{background:#1c2128;padding:2px 6px;border-radius:4px;color:#79c0ff;font-family:' + theme.fonts.mono + ';font-size:11.5px;border:1px solid var(--border-color);word-break:break-all}\n';
  css += '.endpoint-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:16px}\n';
  css += '.endpoint-card{background:var(--bg-secondary);border:1px solid var(--border-color);border-radius:8px;padding:20px;transition:var(--tr)}\n';
  css += '.endpoint-card:hover{border-color:#484f58}\n';
  css += '.ep-header{display:flex;align-items:center;gap:10px;margin-bottom:12px}\n';
  css += '.ep-icon{font-size:18px;flex-shrink:0}\n';
  css += '.ep-name{font-size:14px;font-weight:600;color:var(--text-primary);font-family:' + theme.fonts.mono + ';word-break:break-all}\n';
  css += '.ep-desc{font-size:12.5px;color:var(--text-secondary);margin-bottom:12px;line-height:1.5}\n';
  css += '.ep-url{font-size:11.5px;color:#79c0ff;background:#0d1117;padding:10px 12px;border-radius:6px;font-family:' + theme.fonts.mono + ';word-break:break-all;border:1px solid var(--border-color);margin-bottom:12px;line-height:1.6}\n';
  css += '.json-preview{background:#0d1117;border:1px solid var(--border-color);border-radius:6px;padding:14px;max-height:280px;overflow-y:auto;position:relative}\n';
  css += '.json-preview::before{content:"JSON Response";position:absolute;top:6px;right:10px;font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;font-weight:600}\n';
  css += '.json-preview pre{font-family:' + theme.fonts.mono + ';font-size:11.5px;color:#c9d1d9;margin:0;padding-top:14px;white-space:pre-wrap;word-break:break-word;line-height:1.6}\n';
  css += '.live-logs{background:#0d1117;border:1px solid var(--border-color);border-radius:6px;padding:14px;max-height:520px;overflow-y:auto;font-family:' + theme.fonts.mono + ';font-size:11.5px}\n';
  css += '.log-entry{padding:8px;border-bottom:1px solid var(--border-color);display:flex;gap:10px;flex-wrap:wrap;transition:var(--tr);align-items:center}\n';
  css += '.log-entry:hover{background:#161b22}\n';
  css += '.log-entry:last-child{border-bottom:none}\n';
  css += '.log-time{color:var(--text-muted);font-size:10.5px}\n';
  css += '.log-key{color:#79c0ff;font-weight:600}\n';
  css += '.log-endpoint{color:#3fb950}\n';
  css += '.log-ip{color:#58a6ff}\n';
  css += '.toast{position:fixed;top:20px;right:20px;z-index:99999;padding:12px 18px;border-radius:6px;color:#fff;font-weight:500;font-size:13px;animation:slideIn .25s ease;max-width:400px;background:var(--bg-secondary);border:1px solid var(--border-color);box-shadow:0 8px 24px rgba(0,0,0,0.4)}\n';
  css += '.toast.success{border-color:var(--success);color:var(--success)}\n';
  css += '.toast.error{border-color:var(--danger);color:var(--danger)}\n';
  css += '.toast.warning{border-color:var(--warning);color:var(--warning)}\n';
  css += '.toast.info{border-color:var(--info);color:var(--info)}\n';
  css += '@keyframes slideIn{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}\n';
  css += '.tabs{display:flex;gap:0;border-bottom:1px solid var(--border-color);margin-bottom:18px}\n';
  css += '.tab{padding:9px 16px;cursor:pointer;font-size:12.5px;font-weight:500;color:var(--text-muted);border-bottom:2px solid transparent;transition:var(--tr);margin-bottom:-1px}\n';
  css += '.tab:hover{color:var(--text-primary)}\n';
  css += '.tab.active{color:var(--accent);border-bottom-color:var(--accent)}\n';
  css += '.scope-box{display:flex;flex-wrap:wrap;gap:6px;padding:12px;background:var(--bg-primary);border-radius:5px;border:1px solid var(--border-color);max-height:280px;overflow-y:auto}\n';
  css += '.scope-item{cursor:pointer;font-size:11.5px;display:inline-flex;align-items:center;gap:6px;padding:5px 10px;border-radius:4px;background:var(--bg-secondary);border:1px solid var(--border-color);color:var(--text-secondary);transition:var(--tr);user-select:none}\n';
  css += '.scope-item:hover{border-color:var(--accent);color:var(--text-primary)}\n';
  css += '.scope-item input[type=checkbox]{accent-color:var(--accent);margin:0}\n';
  css += '.pub-nav{position:sticky;top:0;z-index:100;background:rgba(13,17,23,0.95);backdrop-filter:blur(12px);border-bottom:1px solid var(--border-color);padding:14px 28px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px}\n';
  css += '.pub-brand{font-size:14px;font-weight:700;letter-spacing:0.5px;color:var(--text-primary);display:flex;align-items:center;gap:10px;font-family:' + theme.fonts.heading + '}\n';
  css += '.pub-brand .logo{width:28px;height:28px;border-radius:6px;background:linear-gradient(135deg,var(--accent),var(--accent2));display:flex;align-items:center;justify-content:center;font-size:14px}\n';
  css += '.pub-links{display:flex;gap:8px;align-items:center}\n';
  css += '.pub-links a{color:var(--text-secondary);font-size:12.5px;font-weight:500;padding:7px 14px;border-radius:6px;transition:var(--tr);border:1px solid transparent}\n';
  css += '.pub-links a:hover{color:var(--text-primary);border-color:var(--border-color);background:var(--bg-secondary)}\n';
  css += '.pub-hero{text-align:center;padding:64px 24px 48px;position:relative;z-index:10;border-bottom:1px solid var(--border-color)}\n';
  css += '.pub-hero h1{font-size:clamp(28px,5vw,42px);font-weight:700;font-family:' + theme.fonts.heading + ';letter-spacing:-1px;margin-bottom:12px;background:linear-gradient(135deg,var(--text-primary),var(--accent));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}\n';
  css += '.pub-hero p{color:var(--text-secondary);font-size:14px;max-width:600px;margin:0 auto;line-height:1.7}\n';
  css += '.pub-hero .badges{display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-top:20px}\n';
  css += '.pub-hero .badge{padding:5px 12px;border-radius:20px;font-size:11px;font-weight:600;background:var(--bg-secondary);border:1px solid var(--border-color);color:var(--text-secondary);display:inline-flex;align-items:center;gap:5px}\n';
  css += '.pub-container{max-width:1280px;margin:0 auto;padding:32px 24px;position:relative;z-index:10}\n';
  css += '.pub-footer{text-align:center;padding:32px 24px;border-top:1px solid var(--border-color);color:var(--text-muted);font-size:12px;position:relative;z-index:10}\n';
  css += '.pub-footer a{color:var(--accent);font-weight:600}\n';
  css += '.search-bar{position:relative;max-width:480px;margin:24px auto 0}\n';
  css += '.search-bar input{width:100%;padding:11px 16px 11px 40px;background:var(--bg-secondary);border:1px solid var(--border-color);border-radius:8px;color:var(--text-primary);font-size:13px;outline:none;font-family:' + theme.fonts.body + '}\n';
  css += '.search-bar input:focus{border-color:var(--accent);box-shadow:0 0 0 3px rgba(88,166,255,0.1)}\n';
  css += '.search-bar i{position:absolute;left:14px;top:50%;transform:translateY(-50%);color:var(--text-muted);font-size:13px}\n';
  css += '@media(max-width:768px){.sidebar{width:64px;padding:12px 0}.sidebar-header{padding:0 8px 12px}.sidebar-logo{font-size:16px;justify-content:center}.sidebar-logo span{display:none}.sidebar-subtitle{display:none}.sidebar-nav{padding:0 6px}.sidebar-nav a{justify-content:center;padding:10px;gap:0}.sidebar-nav a span{display:none}.main-content{margin-left:64px;padding:16px;max-width:calc(100vw - 64px)}.stats-grid{grid-template-columns:repeat(2,1fr)}.endpoint-grid{grid-template-columns:1fr}}\n';
  css += '</style>';
  return css;
}

// ============================================================
// LOGIN PAGE
// ============================================================
function renderLogin() {
  let h = '<!DOCTYPE html><html lang="en"><head>';
  h += '<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">';
  h += '<title>BRONX V504 · Admin Login</title>';
  h += '<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">';
  h += '<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">';
  h += generateCSS();
  h += '<style>body{display:flex;align-items:center;justify-content:center;min-height:100vh}';
  h += '.login-wrap{width:400px;max-width:92vw;position:relative;z-index:10}';
  h += '.login-card{background:var(--bg-card);border:1px solid var(--border-color);border-radius:12px;padding:40px 32px}';
  h += '.login-head{text-align:center;margin-bottom:32px}';
  h += '.login-head .logo{width:56px;height:56px;border-radius:12px;background:linear-gradient(135deg,var(--accent),var(--accent2));display:inline-flex;align-items:center;justify-content:center;font-size:26px;margin-bottom:16px}';
  h += '.login-head h1{font-size:22px;font-weight:700;color:var(--text-primary);font-family:' + theme.fonts.heading + ';margin-bottom:4px}';
  h += '.login-head p{color:var(--text-muted);font-size:12.5px;font-family:' + theme.fonts.mono + '}';
  h += '.input-group{position:relative;margin-bottom:16px}';
  h += '.input-group .icon{position:absolute;left:14px;top:50%;transform:translateY(-50%);color:var(--text-muted);font-size:13px}';
  h += '.input-group input{width:100%;padding:12px 14px 12px 40px;background:var(--bg-primary);border:1px solid var(--border-color);border-radius:6px;color:var(--text-primary);font-size:13.5px;outline:none;font-family:' + theme.fonts.body + '}';
  h += '.input-group input:focus{border-color:var(--accent);box-shadow:0 0 0 3px rgba(88,166,255,0.12)}';
  h += '.login-btn{width:100%;padding:12px;background:var(--accent);color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:13.5px;font-weight:600;transition:var(--tr);font-family:' + theme.fonts.body + ';display:flex;align-items:center;justify-content:center;gap:8px}';
  h += '.login-btn:hover{opacity:0.9}.login-btn:disabled{opacity:0.6}';
  h += '.msg{text-align:center;margin-top:16px;font-size:12.5px;font-weight:500;min-height:18px}';
  h += '.login-foot{text-align:center;margin-top:24px;font-size:11px;color:var(--text-muted);font-family:' + theme.fonts.mono + '}';
  h += '</style></head><body>';
  h += '<div class="grid-bg"></div>';
  h += '<div class="login-wrap"><div class="login-card">';
  h += '<div class="login-head"><div class="logo">🛡️</div><h1>BRONX V504 PRO</h1><p>// ADMIN AUTHENTICATION</p></div>';
  h += '<div class="input-group"><i class="fas fa-user icon"></i><input type="text" id="username" placeholder="Username" autocomplete="username"></div>';
  h += '<div class="input-group"><i class="fas fa-lock icon"></i><input type="password" id="password" placeholder="Password" autocomplete="current-password"></div>';
  h += '<button class="login-btn" id="loginBtn" onclick="doLogin()"><i class="fas fa-shield-halved"></i> AUTHENTICATE</button>';
  h += '<div class="msg" id="msg"></div>';
  h += '<div class="login-foot">SECURE · ENCRYPTED SESSION</div>';
  h += '</div></div>';
  h += '<script>';
  h += 'async function doLogin(){';
  h += 'var u=document.getElementById("username").value.trim();';
  h += 'var p=document.getElementById("password").value;';
  h += 'var m=document.getElementById("msg");';
  h += 'var b=document.getElementById("loginBtn");';
  h += 'if(!u||!p){m.style.color="var(--warning)";m.textContent="⚠ Fill all fields";return}';
  h += 'b.disabled=true;m.style.color="var(--info)";m.textContent="Authenticating...";';
  h += 'try{';
  h += 'var r=await fetch("' + ADMIN_PATH + '/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({username:u,password:p})});';
  h += 'var d=await r.json();';
  h += 'if(d.success){m.style.color="var(--success)";m.textContent="✓ "+d.message;setTimeout(function(){location.href=d.redirect},400)}';
  h += 'else{m.style.color="var(--danger)";m.textContent="✗ "+d.error;b.disabled=false}';
  h += '}catch(e){m.style.color="var(--danger)";m.textContent="Connection error";b.disabled=false}';
  h += '}';
  h += 'document.addEventListener("keydown",function(e){if(e.key==="Enter")doLogin()});';
  h += '</script></body></html>';
  return h;
}

// ============================================================
// PUBLIC HOME
// ============================================================
function renderHome() {
  let cards = '';
  Object.keys(endpoints).forEach(function (n) {
    const e = endpoints[n];
    const preview = endpointResponses[n]
      ? JSON.stringify(endpointResponses[n], null, 2)
      : JSON.stringify({ status: 'success', message: 'Response preview not configured — admin can set this in the admin panel.', endpoint: '/' + n, example_param: e.e }, null, 2);
    cards += '<div class="endpoint-card" data-search="' + esc(n + ' ' + e.d) + '">';
    cards += '<div class="ep-header"><span class="ep-icon">' + e.i + '</span><div class="ep-name">/api/key-bronx/' + esc(n) + '</div></div>';
    cards += '<div class="ep-desc">' + esc(e.d) + '</div>';
    cards += '<div class="ep-url">GET /api/key-bronx/' + n + '?key=YOUR_KEY&' + e.p + '=' + e.e + '</div>';
    cards += '<div class="json-preview"><pre>' + esc(preview) + '</pre></div>';
    cards += '</div>';
  });
  customAPIs.forEach(function (a) {
    if (!a.visible) return;
    const preview = endpointResponses[a.endpoint]
      ? JSON.stringify(endpointResponses[a.endpoint], null, 2)
      : JSON.stringify({ status: 'success', message: 'Response preview not configured.', endpoint: '/' + a.endpoint }, null, 2);
    cards += '<div class="endpoint-card" data-search="' + esc(a.name + ' ' + a.endpoint) + '">';
    cards += '<div class="ep-header"><span class="ep-icon">🔧</span><div class="ep-name">/api/custom/' + esc(a.endpoint) + '</div></div>';
    cards += '<div class="ep-desc">' + esc(a.name) + '</div>';
    cards += '<div class="ep-url">GET /api/custom/' + a.endpoint + '?key=YOUR_KEY&' + a.param + '=' + (a.example || 'value') + '</div>';
    cards += '<div class="json-preview"><pre>' + esc(preview) + '</pre></div>';
    cards += '</div>';
  });

  const annHTML = announcement.enabled
    ? '<div style="padding:10px 20px;text-align:center;font-size:12.5px;background:rgba(88,166,255,0.12);color:var(--accent);border-bottom:1px solid var(--border-color);font-weight:500">📢 ' + esc(announcement.text) + '</div>'
    : '';
  const mainHTML = maintenance.enabled
    ? '<div style="position:fixed;inset:0;z-index:99999;background:var(--bg-primary);display:flex;align-items:center;justify-content:center;flex-direction:column;gap:16px;padding:40px;text-align:center"><div style="width:80px;height:80px;border-radius:20px;background:rgba(210,153,34,0.12);display:flex;align-items:center;justify-content:center;font-size:40px">🔧</div><h1 style="font-family:' + theme.fonts.heading + ';color:var(--warning);font-size:26px;letter-spacing:1px;font-weight:700">UNDER MAINTENANCE</h1><p style="color:var(--text-secondary);font-size:13.5px;max-width:400px">' + esc(maintenance.message) + '</p></div>'
    : '';

  let h = '<!DOCTYPE html><html lang="en"><head>';
  h += '<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">';
  h += '<title>BRONX OSINT API · V504 PRO</title>';
  h += '<meta name="description" content="Professional OSINT API platform.">';
  h += '<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">';
  h += '<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">';
  h += generateCSS();
  h += '</head><body>';
  h += '<div class="grid-bg"></div>';
  h += mainHTML;
  h += annHTML;
  h += '<nav class="pub-nav">';
  h += '<div class="pub-brand"><span class="logo">🛡️</span> BRONX OSINT <span style="color:var(--text-muted);font-weight:400;font-size:11px;font-family:' + theme.fonts.mono + '">v5.0.4</span></div>';
  h += '<div class="pub-links"><a href="/test"><i class="fas fa-heartbeat"></i> Status</a>';
  h += '<span style="padding:5px 12px;border-radius:20px;font-size:11px;font-weight:600;background:rgba(63,185,80,0.12);color:var(--success);border:1px solid rgba(63,185,80,0.3)">● ONLINE</span></div>';
  h += '</nav>';
  h += '<header class="pub-hero"><h1>BRONX OSINT API</h1>';
  h += '<p>Professional-grade OSINT API platform. Fast responses, real-time monitoring, developer-friendly endpoints.</p>';
  h += '<div class="badges"><span class="badge"><i class="fas fa-bolt"></i> Fast</span><span class="badge"><i class="fas fa-shield-halved"></i> Secured</span><span class="badge"><i class="fas fa-code"></i> JSON API</span><span class="badge"><i class="fas fa-infinity"></i> Reliable</span></div>';
  h += '<div class="search-bar"><i class="fas fa-search"></i><input id="searchInput" placeholder="Search endpoints..."></div>';
  h += '</header>';
  h += '<div class="pub-container"><div class="endpoint-grid" id="endpointGrid">' + cards + '</div></div>';
  h += '<footer class="pub-footer">Powered by <a href="#">' + esc(globalConfig.developerName) + '</a> · BRONX OSINT V504 PRO · © ' + new Date().getFullYear() + '</footer>';
  h += '<script>';
  h += 'document.getElementById("searchInput").addEventListener("input",function(e){';
  h += 'var q=e.target.value.toLowerCase();';
  h += 'document.querySelectorAll(".endpoint-card").forEach(function(c){';
  h += 'var s=(c.dataset.search||"").toLowerCase();';
  h += 'c.style.display=s.indexOf(q)>=0?"":"none";';
  h += '});';
  h += '});';
  h += '</script></body></html>';
  return h;
}

// ============================================================
// ADMIN PANEL
// ============================================================
function renderAdmin(token) {
  const stoken = esc(token);
  const keysList = [];
  Object.keys(keyStorage).forEach(function (k) {
    const d = keyStorage[k];
    if (d._hardcoded || d.hidden) return;
    keysList.push({
      key: k,
      name: d.name || '?',
      limit: d.unlimited ? '∞' : d.limit,
      used: d.used || 0,
      left: d.unlimited ? '∞' : Math.max(0, (d.limit || 0) - (d.used || 0)),
      expiry: d.expiryStr || 'LIFETIME',
      isExpired: d.expiry ? isKeyExpired(d.expiry) : false,
      developerName: d.developerName || '',
      stopped: d.stopped || false,
      disabled: d.disabled || false,
      scopes: d.scopes || []
    });
  });

  const scopeOptions = Object.keys(endpoints).concat(['custom:*', 'custom']);
  let scopeChecksG = '<label class="scope-item"><input type="checkbox" value="*" checked> <span>🌟 ALL ACCESS</span></label>';
  scopeOptions.forEach(function (s) {
    scopeChecksG += '<label class="scope-item"><input type="checkbox" value="' + s + '"> <span>' + s + '</span></label>';
  });
  let scopeChecksU = '<label class="scope-item"><input type="checkbox" value="*"> <span>🌟 ALL ACCESS</span></label>';
  scopeOptions.forEach(function (s) {
    scopeChecksU += '<label class="scope-item"><input type="checkbox" value="' + s + '"> <span>' + s + '</span></label>';
  });

  let apisHtml = '';
  customAPIs.forEach(function (a) {
    apisHtml += '<tr>';
    apisHtml += '<td>' + a.id + '</td>';
    apisHtml += '<td>' + esc(a.name) + '</td>';
    apisHtml += '<td><code>' + esc(a.endpoint) + '</code></td>';
    apisHtml += '<td>' + esc(a.param) + '</td>';
    apisHtml += '<td>' + (a.visible ? '✅' : '❌') + '</td>';
    apisHtml += '<td><button class="btn-action" onclick="toggleAPI(' + a.id + ')">Toggle</button>';
    apisHtml += '<button class="btn-action danger" onclick="deleteAPI(' + a.id + ')">Delete</button></td>';
    apisHtml += '</tr>';
  });

  let endpointsList = '';
  Object.keys(endpoints).forEach(function (n) {
    const e = endpoints[n];
    endpointsList += '<div class="endpoint-card">';
    endpointsList += '<div class="ep-header"><span class="ep-icon">' + e.i + '</span><div class="ep-name">/' + esc(n) + '</div></div>';
    endpointsList += '<div class="ep-desc">' + esc(e.d) + '</div>';
    endpointsList += '<div class="ep-url">GET /api/key-bronx/' + n + '?key=YOUR_KEY&' + e.p + '=' + e.e + '</div>';
    endpointsList += '</div>';
  });

  let respOptions = '';
  Object.keys(endpoints).forEach(function (e) {
    respOptions += '<option value="' + e + '">' + endpoints[e].d + ' (/' + e + ')</option>';
  });
  customAPIs.forEach(function (a) {
    respOptions += '<option value="' + esc(a.endpoint) + '">' + esc(a.name) + ' (/' + esc(a.endpoint) + ')</option>';
  });

  let presetsHtml = '';
  Object.keys(PRESETS).forEach(function (name) {
    const p = PRESETS[name];
    presetsHtml += '<div class="endpoint-card" style="cursor:pointer" onclick="applyTheme(\'' + name + '\')">';
    presetsHtml += '<div style="height:50px;border-radius:6px;margin-bottom:12px;background:linear-gradient(135deg,' + p.accent + ',' + p.accent2 + ')"></div>';
    presetsHtml += '<div style="font-weight:600;color:var(--text-primary)">' + name + '</div>';
    presetsHtml += '</div>';
  });

  let h = '<!DOCTYPE html><html lang="en"><head>';
  h += '<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">';
  h += '<title>BRONX V504 · Admin</title>';
  h += '<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">';
  h += '<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">';
  h += generateCSS();
  h += '</head><body>';
  h += '<div class="grid-bg"></div>';
  h += '<div class="admin-container">';

  // SIDEBAR
  h += '<div class="sidebar"><div class="sidebar-header"><div class="sidebar-logo"><span>🛡️</span> BRONX</div><div class="sidebar-subtitle">// V504 PRO ADMIN</div></div>';
  h += '<ul class="sidebar-nav">';
  const menuItems = [
    ['dashboard', 'fa-chart-pie', 'Dashboard'],
    ['generate', 'fa-plus-circle', 'Generate Key'],
    ['keys', 'fa-key', 'All Keys'],
    ['endpoints', 'fa-list', 'Endpoints'],
    ['responses', 'fa-code', 'Edit Responses'],
    ['response-settings', 'fa-sliders-h', 'Response Settings'],
    ['monitor', 'fa-desktop', 'Live Monitor'],
    ['stats', 'fa-chart-bar', 'Statistics'],
    ['theme', 'fa-palette', 'Theme'],
    ['apis', 'fa-plug', 'Custom APIs'],
    ['addapi', 'fa-plus', 'Add API'],
    ['scopes', 'fa-crosshairs', 'Update Scopes'],
    ['protect', 'fa-shield-alt', 'Data Protection'],
    ['ddos', 'fa-shield-virus', 'DDoS Config'],
    ['bans', 'fa-ban', 'Bans Manager'],
    ['devices', 'fa-laptop', 'Devices'],
    ['backup', 'fa-database', 'Backup / Restore'],
    ['audit', 'fa-clipboard-list', 'Audit Log'],
    ['settings', 'fa-cog', 'Settings']
  ];
  menuItems.forEach(function (m, i) {
    h += '<li><a ' + (i === 0 ? 'class="active" ' : '') + 'data-sec="' + m[0] + '" onclick="nav(\'' + m[0] + '\',this)"><i class="fas ' + m[1] + '"></i><span>' + m[2] + '</span></a></li>';
  });
  h += '</ul></div>';

  // MAIN
  h += '<div class="main-content">';

  // Top stats
  h += '<div class="stats-grid">';
  h += '<div class="stat-card"><div class="stat-icon">🔑</div><div class="stat-value" id="sKeys">' + keysList.length + '</div><div class="stat-label">Keys</div></div>';
  h += '<div class="stat-card"><div class="stat-icon">📊</div><div class="stat-value" id="sToday">-</div><div class="stat-label">Today</div></div>';
  h += '<div class="stat-card"><div class="stat-icon">📈</div><div class="stat-value" id="sTotal">-</div><div class="stat-label">Total</div></div>';
  h += '<div class="stat-card"><div class="stat-icon">🚫</div><div class="stat-value" id="sBans">-</div><div class="stat-label">Bans</div></div>';
  h += '<div class="stat-card"><div class="stat-icon">📱</div><div class="stat-value" id="sDevices">-</div><div class="stat-label">Devices</div></div>';
  h += '<div class="stat-card"><div class="stat-icon">🔧</div><div class="stat-value" id="sAPIs">' + customAPIs.length + '</div><div class="stat-label">Custom APIs</div></div>';
  h += '</div>';

  // Dashboard
  h += '<div class="glow-card" id="sec-dashboard">';
  h += '<h3><i class="fas fa-fire"></i> Overview</h3>';
  h += '<div class="stats-grid">';
  h += '<div class="stat-card"><div class="stat-value" id="dToday">-</div><div class="stat-label">Today Requests</div></div>';
  h += '<div class="stat-card"><div class="stat-value" id="dTotal">-</div><div class="stat-label">Total Requests</div></div>';
  h += '<div class="stat-card"><div class="stat-value" id="dTopKey">-</div><div class="stat-label">Top Key</div></div>';
  h += '<div class="stat-card"><div class="stat-value" id="dTopEp">-</div><div class="stat-label">Top Endpoint</div></div>';
  h += '</div>';
  h += '<h4>Top Keys</h4>';
  h += '<div class="table-container"><table><thead><tr><th>Key</th><th>Requests</th></tr></thead><tbody id="topKeysBody"><tr><td colspan="2" style="text-align:center;color:var(--text-muted)">Loading...</td></tr></tbody></table></div>';
  h += '</div>';

  // Generate
  h += '<div class="glow-card" id="sec-generate" style="display:none">';
  h += '<h3><i class="fas fa-plus-circle"></i> Generate New Key</h3>';
  h += '<div class="form-group"><label>Key ID (blank = random)</label><input class="form-input" id="gk" placeholder="e.g. MY_CLIENT_KEY"></div>';
  h += '<div class="form-group"><label>Owner Name *</label><input class="form-input" id="go" placeholder="Client Name"></div>';
  h += '<div class="form-group"><label>Custom Developer Name (Optional — overrides global)</label><input class="form-input" id="gdev" placeholder="e.g. @CUSTOM_NAME"></div>';
  h += '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px">';
  h += '<div class="form-group"><label>Total Limit</label><input class="form-input" id="gl" type="number" value="100"></div>';
  h += '<div class="form-group"><label>Daily (0=∞)</label><input class="form-input" id="gdl" type="number" value="0"></div>';
  h += '<div class="form-group"><label>Per Sec (0=∞)</label><input class="form-input" id="gpsl" type="number" value="0"></div>';
  h += '</div>';
  h += '<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px">';
  h += '<div class="form-group"><label>Cooldown (s)</label><input class="form-input" id="gc" type="number" value="0"></div>';
  h += '<div class="form-group"><label>Days Valid</label><input class="form-input" id="gd" type="number" value="30"></div>';
  h += '</div>';
  h += '<div class="form-group"><label>Notes</label><input class="form-input" id="gnotes" placeholder="Optional notes"></div>';
  h += '<div class="form-group"><label>Scopes</label><div class="scope-box" id="scopeGenerate">' + scopeChecksG + '</div></div>';
  h += '<button class="btn-primary" style="width:100%" onclick="generateKey()"><i class="fas fa-rocket"></i> GENERATE KEY</button>';
  h += '</div>';

  // Keys
  h += '<div class="glow-card" id="sec-keys" style="display:none">';
  h += '<h3><i class="fas fa-key"></i> All Keys (<span id="keysCount">' + keysList.length + '</span>)</h3>';
  h += '<div style="display:flex;gap:10px;margin-bottom:14px"><input class="form-input" id="keysFilter" placeholder="🔍 Filter..." style="flex:1" oninput="filterKeys()"></div>';
  h += '<div class="table-container" style="max-height:650px">';
  h += '<table><thead><tr><th>KEY</th><th>OWNER</th><th>LIMIT</th><th>USED</th><th>LEFT</th><th>EXPIRY</th><th>DEV NAME</th><th>STATUS</th><th>ACTIONS</th></tr></thead><tbody id="keysBody"></tbody></table>';
  h += '</div></div>';

  // Endpoints
  h += '<div class="glow-card" id="sec-endpoints" style="display:none">';
  h += '<h3><i class="fas fa-list"></i> Endpoints (' + Object.keys(endpoints).length + ')</h3>';
  h += '<div class="endpoint-grid">' + endpointsList + '</div>';
  h += '</div>';

  // Edit Responses
  h += '<div class="glow-card" id="sec-responses" style="display:none">';
  h += '<h3><i class="fas fa-code"></i> Edit Endpoint Responses</h3>';
  h += '<p style="color:var(--text-secondary);font-size:12.5px;margin-bottom:14px">Yahan JSON set karoge to public dashboard aur actual API response me wahi dikhega.</p>';
  h += '<div class="form-group"><label>Endpoint</label><select class="form-input" id="respEndpoint" onchange="loadResp()">' + respOptions + '</select></div>';
  h += '<div class="form-group"><label>Response JSON (empty = reset)</label><textarea class="form-input" id="respData" rows="14" placeholder=\'{"status":"success"}\'></textarea></div>';
  h += '<button class="btn-primary" style="width:100%" onclick="saveResp()"><i class="fas fa-save"></i> SAVE RESPONSE</button>';
  h += '</div>';

  // Response Settings
  h += '<div class="glow-card" id="sec-response-settings" style="display:none">';
  h += '<h3><i class="fas fa-sliders-h"></i> Global Response Settings</h3>';
  h += '<div class="form-group"><label>Global Developer Name</label><input class="form-input" id="rsDevName" value="' + esc(globalConfig.developerName) + '"></div>';
  h += '<div class="form-group"><label>Hidden Fields (comma separated — removed from every response)</label><textarea class="form-input" id="rsHidden" rows="3">' + esc(globalConfig.hiddenFields) + '</textarea></div>';
  h += '<h4 style="margin-top:22px">Custom Error Messages (plain text, emoji allowed)</h4>';
  h += '<div class="form-group"><label>Key Not Found</label><input class="form-input" id="msgKeyNotFound" value="' + esc(customMessages.keyNotFound) + '"></div>';
  h += '<div class="form-group"><label>Limit Reached ({used}/{limit} placeholders)</label><input class="form-input" id="msgLimitReached" value="' + esc(customMessages.limitReached) + '"></div>';
  h += '<div class="form-group"><label>Key Stopped</label><input class="form-input" id="msgKeyStopped" value="' + esc(customMessages.keyStopped) + '"></div>';
  h += '<div class="form-group"><label>Key Disabled</label><input class="form-input" id="msgKeyDisabled" value="' + esc(customMessages.keyDisabled) + '"></div>';
  h += '<div class="form-group"><label>Key Expired ({date})</label><input class="form-input" id="msgKeyExpired" value="' + esc(customMessages.keyExpired) + '"></div>';
  h += '<div class="form-group"><label>Missing Key</label><input class="form-input" id="msgMissingKey" value="' + esc(customMessages.missingKey) + '"></div>';
  h += '<div class="form-group"><label>Scope Denied</label><input class="form-input" id="msgScopeDenied" value="' + esc(customMessages.scopeDenied) + '"></div>';
  h += '<button class="btn-primary" style="width:100%" onclick="saveResponseSettings()"><i class="fas fa-save"></i> SAVE ALL</button>';
  h += '</div>';

  // Monitor
  h += '<div class="glow-card" id="sec-monitor" style="display:none">';
  h += '<h3><i class="fas fa-desktop"></i> Live Monitor</h3>';
  h += '<div style="display:flex;gap:10px;margin-bottom:14px"><input class="form-input" id="monitorFilter" placeholder="🔍 Filter..." style="flex:1" oninput="renderMonitor()"><button class="btn-primary" onclick="loadMonitor()"><i class="fas fa-sync"></i> Refresh</button></div>';
  h += '<div class="live-logs" id="monitorLogs"><div style="text-align:center;color:var(--text-muted);padding:20px">Loading...</div></div>';
  h += '</div>';

  // Stats
  h += '<div class="glow-card" id="sec-stats" style="display:none">';
  h += '<h3><i class="fas fa-chart-bar"></i> Statistics</h3>';
  h += '<div class="stats-grid">';
  h += '<div class="stat-card"><div class="stat-value" id="stTotal">-</div><div class="stat-label">Total</div></div>';
  h += '<div class="stat-card"><div class="stat-value" id="stToday">-</div><div class="stat-label">Today</div></div>';
  h += '</div>';
  h += '<h4>Top Endpoints</h4><div class="table-container"><table><thead><tr><th>Endpoint</th><th>Requests</th></tr></thead><tbody id="topEpBody"><tr><td colspan="2" style="text-align:center;color:var(--text-muted)">Loading...</td></tr></tbody></table></div>';
  h += '</div>';

  // Theme
  h += '<div class="glow-card" id="sec-theme" style="display:none">';
  h += '<h3><i class="fas fa-palette"></i> Theme Presets</h3><div class="endpoint-grid">' + presetsHtml + '</div>';
  h += '</div>';

  // APIs
  h += '<div class="glow-card" id="sec-apis" style="display:none">';
  h += '<h3><i class="fas fa-plug"></i> Custom APIs (' + customAPIs.length + ')</h3>';
  h += '<div class="table-container" style="max-height:520px"><table><thead><tr><th>ID</th><th>Name</th><th>Endpoint</th><th>Param</th><th>Visible</th><th>Actions</th></tr></thead><tbody>' + apisHtml + '</tbody></table></div>';
  h += '</div>';

  // Add API
  h += '<div class="glow-card" id="sec-addapi" style="display:none">';
  h += '<h3><i class="fas fa-plus"></i> Add Custom API</h3>';
  h += '<div class="form-group"><label>Name *</label><input class="form-input" id="aName" placeholder="My API"></div>';
  h += '<div class="form-group"><label>Endpoint * (lowercase, no spaces)</label><input class="form-input" id="aEndpoint" placeholder="my-api"></div>';
  h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">';
  h += '<div class="form-group"><label>Param Name</label><input class="form-input" id="aParam" value="num"></div>';
  h += '<div class="form-group"><label>Example Value</label><input class="form-input" id="aExample" placeholder="9876543210"></div>';
  h += '</div>';
  h += '<div class="form-group"><label>Real API URL — {param} placeholder</label><input class="form-input" id="aRealURL" placeholder="https://api.example.com?number={param}"></div>';
  h += '<button class="btn-primary" style="width:100%" onclick="addAPI()"><i class="fas fa-plus"></i> ADD API</button>';
  h += '</div>';

  // Scopes
  h += '<div class="glow-card" id="sec-scopes" style="display:none">';
  h += '<h3><i class="fas fa-crosshairs"></i> Update Key Scopes</h3>';
  h += '<div class="form-group"><label>Key Name</label><input class="form-input" id="upKeyName" placeholder="Enter exact key"></div>';
  h += '<div class="form-group"><label>Scopes</label><div class="scope-box" id="scopeUpdate">' + scopeChecksU + '</div></div>';
  h += '<button class="btn-primary" style="width:100%" onclick="updateScopes()"><i class="fas fa-save"></i> UPDATE SCOPES</button>';
  h += '</div>';

  // Protection
  h += '<div class="glow-card" id="sec-protect" style="display:none">';
  h += '<h3><i class="fas fa-shield-alt"></i> Data Protection</h3>';
  h += '<div class="form-group"><label>Value to Protect</label><input class="form-input" id="protValue" placeholder="9876543210"></div>';
  h += '<button class="btn-primary" style="width:100%" onclick="addProtection()"><i class="fas fa-lock"></i> ADD</button>';
  h += '<h4 style="margin-top:20px">Protected Values</h4>';
  h += '<div class="table-container"><table><thead><tr><th>Value</th><th>Action</th></tr></thead><tbody id="protBody"></tbody></table></div>';
  h += '</div>';

  // DDoS
  h += '<div class="glow-card" id="sec-ddos" style="display:none">';
  h += '<h3><i class="fas fa-shield-virus"></i> DDoS Protection Config</h3>';
  h += '<div class="form-group"><label>Mode</label><select class="form-input" id="ddosMode">';
  h += '<option value="off"' + (ddosConfig.mode === 'off' ? ' selected' : '') + '>🔴 Off</option>';
  h += '<option value="smart"' + (ddosConfig.mode === 'smart' ? ' selected' : '') + '>🟢 Smart</option>';
  h += '<option value="strict"' + (ddosConfig.mode === 'strict' ? ' selected' : '') + '>🟠 Strict</option>';
  h += '</select></div>';
  h += '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px">';
  h += '<div class="form-group"><label>IP Burst/10s</label><input class="form-input" id="dIP10" type="number" value="' + ddosConfig.ip.burst10s + '"></div>';
  h += '<div class="form-group"><label>IP/Minute</label><input class="form-input" id="dIP1M" type="number" value="' + ddosConfig.ip.perMinute + '"></div>';
  h += '<div class="form-group"><label>IP/Hour</label><input class="form-input" id="dIP1H" type="number" value="' + ddosConfig.ip.perHour + '"></div>';
  h += '</div>';
  h += '<button class="btn-primary" style="width:100%" onclick="saveDDOS()"><i class="fas fa-save"></i> SAVE</button>';
  h += '<button class="btn-primary btn-warning" style="width:100%;margin-top:10px" onclick="clearStrikes()"><i class="fas fa-eraser"></i> CLEAR STRIKES</button>';
  h += '</div>';

  // Bans
  h += '<div class="glow-card" id="sec-bans" style="display:none">';
  h += '<h3><i class="fas fa-ban"></i> Bans Manager</h3>';
  h += '<div style="display:grid;grid-template-columns:1fr 1fr auto;gap:10px;margin-bottom:16px">';
  h += '<select class="form-input" id="banType"><option value="ip">IP</option><option value="device">Device</option><option value="key">Key</option></select>';
  h += '<input class="form-input" id="banId" placeholder="Value to ban">';
  h += '<button class="btn-primary btn-danger" onclick="manualBan()"><i class="fas fa-ban"></i> BAN</button>';
  h += '</div>';
  h += '<div class="table-container"><table><thead><tr><th>ID</th><th>Reason</th><th>Until</th><th>Action</th></tr></thead><tbody id="banIPBody"></tbody></table></div>';
  h += '<button class="btn-primary btn-warning" style="width:100%;margin-top:14px" onclick="unbanAll()"><i class="fas fa-unlock"></i> UNBAN ALL</button>';
  h += '</div>';

  // Devices
  h += '<div class="glow-card" id="sec-devices" style="display:none">';
  h += '<h3><i class="fas fa-laptop"></i> Connected Devices</h3>';
  h += '<div class="table-container" style="max-height:600px"><table><thead><tr><th>Device ID</th><th>Type</th><th>OS</th><th>Requests</th><th>Last Seen</th><th>Banned</th></tr></thead><tbody id="devicesBody"><tr><td colspan="6" style="text-align:center;color:var(--text-muted)">Loading...</td></tr></tbody></table></div>';
  h += '</div>';

  // Backup
  h += '<div class="glow-card" id="sec-backup" style="display:none">';
  h += '<h3><i class="fas fa-database"></i> Backup / Restore</h3>';
  h += '<h4>Download Full Backup</h4>';
  h += '<p style="color:var(--text-secondary);font-size:12.5px;margin-bottom:12px">Ye JSON me pura data (keys + APIs + settings) download karega.</p>';
  h += '<button class="btn-primary btn-success" style="width:100%;margin-bottom:24px" onclick="downloadBackup()"><i class="fas fa-download"></i> DOWNLOAD BACKUP (.JSON)</button>';
  h += '<h4>Restore From JSON</h4>';
  h += '<div style="display:flex;gap:10px;margin-bottom:12px"><button class="btn-primary" onclick="document.getElementById(\'restoreFile\').click()"><i class="fas fa-upload"></i> Choose File</button>';
  h += '<input type="file" id="restoreFile" accept=".json" style="display:none" onchange="handleRestoreFile(this)"></div>';
  h += '<div class="form-group"><label>Or Paste JSON</label><textarea class="form-input" id="restoreJson" rows="10"></textarea></div>';
  h += '<button class="btn-primary btn-warning" style="width:100%" onclick="restoreData()"><i class="fas fa-upload"></i> RESTORE FROM PASTE</button>';
  h += '</div>';

  // Audit
  h += '<div class="glow-card" id="sec-audit" style="display:none">';
  h += '<h3><i class="fas fa-clipboard-list"></i> Audit Log</h3>';
  h += '<div class="table-container" style="max-height:500px"><table><thead><tr><th>Time</th><th>User</th><th>Action</th><th>Details</th></tr></thead><tbody id="auditBody"></tbody></table></div>';
  h += '</div>';

  // Settings
  h += '<div class="glow-card" id="sec-settings" style="display:none">';
  h += '<h3><i class="fas fa-cog"></i> Settings</h3>';
  h += '<div style="display:grid;gap:10px">';
  h += '<button class="btn-primary btn-warning" style="width:100%" onclick="action(\'/reset-all\',\'Reset all key usage?\')"><i class="fas fa-sync-alt"></i> RESET ALL USAGE</button>';
  h += '<button class="btn-primary btn-danger" style="width:100%" onclick="action(\'/clear-logs\',\'Clear all logs?\')"><i class="fas fa-trash"></i> CLEAR ALL LOGS</button>';
  h += '<button class="btn-primary btn-warning" style="width:100%" onclick="unbanAll()"><i class="fas fa-unlock"></i> UNBAN ALL</button>';
  h += '<button class="btn-primary btn-warning" style="width:100%" onclick="clearStrikes()"><i class="fas fa-eraser"></i> CLEAR ALL STRIKES</button>';
  h += '</div></div>';

  h += '</div></div>';

  // ============================================================
  // ADMIN JS — NO BACKTICKS AT ALL
  // ============================================================
  h += '<script>';
  h += 'var TOKEN=' + JSON.stringify(stoken) + ';';
  h += 'var ADMIN_PATH=' + JSON.stringify(ADMIN_PATH) + ';';
  h += 'var INITIAL_KEYS=' + JSON.stringify(keysList) + ';';
  h += 'var CURRENT_KEYS=INITIAL_KEYS.slice();';
  h += '';

  h += 'function toast(msg,type){type=type||"success";var t=document.createElement("div");t.className="toast "+type;t.textContent=msg;document.body.appendChild(t);setTimeout(function(){t.remove()},3200)}';
  h += 'function api(path,body){return fetch(ADMIN_PATH+path,{method:"POST",headers:{"Content-Type":"application/json","x-admin-token":TOKEN},body:JSON.stringify(body||{})}).then(function(r){return r.json()})}';
  h += 'function apiGet(path){return fetch(ADMIN_PATH+path,{headers:{"x-admin-token":TOKEN}}).then(function(r){return r.json()})}';
  h += '';

  h += 'function nav(name,el){';
  h += 'document.querySelectorAll("[id^=sec-]").forEach(function(s){s.style.display="none"});';
  h += 'var sec=document.getElementById("sec-"+name);';
  h += 'if(sec)sec.style.display="block";';
  h += 'document.querySelectorAll(".sidebar-nav a").forEach(function(a){a.classList.remove("active")});';
  h += 'if(el)el.classList.add("active");';
  h += 'if(name==="dashboard")loadDashboard();';
  h += 'if(name==="keys")renderKeys();';
  h += 'if(name==="monitor")loadMonitor();';
  h += 'if(name==="stats")loadStats();';
  h += 'if(name==="bans")loadBans();';
  h += 'if(name==="devices")loadDevices();';
  h += 'if(name==="audit")loadAudit();';
  h += 'if(name==="protect")loadProtection();';
  h += 'if(name==="responses")loadResp();';
  h += '}';
  h += '';

  h += 'function loadDashboard(){';
  h += 'apiGet("/stats").then(function(s){';
  h += 'document.getElementById("sToday").textContent=s.todayRequests||0;';
  h += 'document.getElementById("sTotal").textContent=s.totalRequests||0;';
  h += 'document.getElementById("dToday").textContent=s.todayRequests||0;';
  h += 'document.getElementById("dTotal").textContent=s.totalRequests||0;';
  h += 'var topK=s.topKeys||[];';
  h += 'document.getElementById("dTopKey").textContent=topK[0]&&topK[0].k?topK[0].k.substring(0,10):"-";';
  h += 'var topE=s.topEndpoints||[];';
  h += 'document.getElementById("dTopEp").textContent=topE[0]&&topE[0].k?topE[0].k:"-";';
  h += 'var html="";';
  h += 'if(topK.length){for(var i=0;i<topK.length;i++){html+="<tr><td><code>"+topK[i].k+"</code></td><td>"+topK[i].v+"</td></tr>"}}';
  h += 'else{html=\'<tr><td colspan="2" style="text-align:center;color:var(--text-muted)">No data</td></tr>\'}';
  h += 'document.getElementById("topKeysBody").innerHTML=html;';
  h += '}).catch(function(e){console.error(e)});';
  h += 'apiGet("/bans").then(function(b){';
  h += 'var total=(b.ip?b.ip.length:0)+(b.device?b.device.length:0)+(b.key?b.key.length:0);';
  h += 'document.getElementById("sBans").textContent=total;';
  h += '}).catch(function(){});';
  h += 'apiGet("/devices").then(function(d){';
  h += 'document.getElementById("sDevices").textContent=d.total||0;';
  h += '}).catch(function(){});';
  h += '}';
  h += '';

  h += 'function generateKey(){';
  h += 'var scopes=[];';
  h += 'document.querySelectorAll("#scopeGenerate input:checked").forEach(function(i){scopes.push(i.value)});';
  h += 'var body={keyName:document.getElementById("gk").value.trim(),keyOwner:document.getElementById("go").value.trim(),developerName:document.getElementById("gdev").value.trim(),limit:document.getElementById("gl").value,dailyLimit:document.getElementById("gdl").value,perSecondLimit:document.getElementById("gpsl").value,cooldown:document.getElementById("gc").value,days:document.getElementById("gd").value,notes:document.getElementById("gnotes").value,scopes:scopes.length?scopes:["number"]};';
  h += 'if(!body.keyOwner){toast("Owner name required","error");return}';
  h += 'api("/generate-key",body).then(function(r){';
  h += 'if(r.success){toast("✓ "+r.message);setTimeout(function(){location.reload()},800)}';
  h += 'else toast(r.e||"Error","error")';
  h += '})';
  h += '}';
  h += '';

  h += 'function renderKeys(){';
  h += 'var filterEl=document.getElementById("keysFilter");';
  h += 'var filter=(filterEl?filterEl.value:"").toLowerCase();';
  h += 'var filtered=CURRENT_KEYS.filter(function(k){return !filter||k.key.toLowerCase().indexOf(filter)>=0||k.name.toLowerCase().indexOf(filter)>=0});';
  h += 'var b=document.getElementById("keysBody");';
  h += 'if(!b)return;';
  h += 'if(!filtered.length){b.innerHTML=\'<tr><td colspan="9" style="text-align:center;color:var(--text-muted);padding:20px">No keys</td></tr>\';return}';
  h += 'var html="";';
  h += 'for(var i=0;i<filtered.length;i++){';
  h += 'var k=filtered[i];';
  h += 'var devName=k.developerName||"—";';
  h += 'var status=k.stopped?\'<span style="color:var(--warning)">⏸ STOPPED</span>\':(k.disabled?\'<span style="color:var(--danger)">🚫 DISABLED</span>\':\'<span style="color:var(--success)">● ACTIVE</span>\');';
  h += 'html+="<tr>";';
  h += 'html+="<td><code style=\'font-size:11px\'>"+k.key+"</code></td>";';
  h += 'html+="<td>"+k.name+"</td>";';
  h += 'html+="<td>"+k.limit+"</td>";';
  h += 'html+="<td>"+k.used+"</td>";';
  h += 'html+="<td>"+k.left+"</td>";';
  h += 'html+="<td style=\'color:"+(k.isExpired?"var(--danger)":"var(--text-primary)")+"\'>"+k.expiry+"</td>";';
  h += 'html+="<td>"+devName+"</td>";';
  h += 'html+="<td>"+status+"</td>";';
  h += 'html+="<td>";';
  h += 'html+="<button class=\'btn-action\' onclick=\'editKey(\""+k.key+"\")\'>Edit</button>";';
  h += 'html+="<button class=\'btn-action\' onclick=\'resetKey(\""+k.key+"\")\'>Reset</button>";';
  h += 'html+="<button class=\'btn-action "+(k.stopped?"success":"danger")+"\' onclick=\'toggleStop(\""+k.key+"\")\'>"+(k.stopped?"Resume":"Stop")+"</button>";';
  h += 'html+="<button class=\'btn-action danger\' onclick=\'deleteKey(\""+k.key+"\")\'>Del</button>";';
  h += 'html+="</td></tr>";';
  h += '}';
  h += 'b.innerHTML=html;';
  h += '}';
  h += 'function filterKeys(){renderKeys()}';

  h += 'function resetKey(k){api("/reset-key-usage",{keyName:k}).then(function(r){if(r.success){toast("✓ Reset");setTimeout(function(){location.reload()},500)}})}';
  h += 'function toggleStop(k){api("/stop-key",{keyName:k}).then(function(r){if(r.success){toast("✓ Updated");setTimeout(function(){location.reload()},500)}})}';
  h += 'function deleteKey(k){if(!confirm("Delete "+k+"?"))return;api("/delete-key",{keyName:k}).then(function(r){if(r.success){toast("✓ Deleted");setTimeout(function(){location.reload()},500)}})}';
  h += 'function editKey(k){';
  h += 'var kd=CURRENT_KEYS.filter(function(x){return x.key===k})[0];';
  h += 'if(!kd)return;';
  h += 'var newOwner=prompt("Owner:",kd.name);if(newOwner===null)return;';
  h += 'var newLimit=prompt("Limit:",kd.limit);if(newLimit===null)return;';
  h += 'var newDev=prompt("Custom dev name (blank=global):",kd.developerName||"");if(newDev===null)return;';
  h += 'api("/edit-key",{keyName:k,newOwner:newOwner,newLimit:newLimit,newDeveloperName:newDev}).then(function(r){';
  h += 'if(r.success){toast("✓ Updated");setTimeout(function(){location.reload()},500)}else toast(r.e||"Error","error")';
  h += '})}';
  h += '';

  h += 'function loadResp(){var ep=document.getElementById("respEndpoint").value;if(!ep)return;apiGet("/get-endpoint-response?endpoint="+encodeURIComponent(ep)).then(function(r){document.getElementById("respData").value=r.data?JSON.stringify(r.data,null,2):""})}';
  h += 'function saveResp(){var endpoint=document.getElementById("respEndpoint").value;var responseData=document.getElementById("respData").value;api("/update-endpoint-response",{endpoint:endpoint,responseData:responseData}).then(function(r){if(r.success)toast("✓ Saved");else toast(r.e||"Error","error")})}';
  h += '';

  h += 'function saveResponseSettings(){';
  h += 'var body={developerName:document.getElementById("rsDevName").value,hiddenFields:document.getElementById("rsHidden").value,messages:{keyNotFound:document.getElementById("msgKeyNotFound").value,limitReached:document.getElementById("msgLimitReached").value,keyStopped:document.getElementById("msgKeyStopped").value,keyDisabled:document.getElementById("msgKeyDisabled").value,keyExpired:document.getElementById("msgKeyExpired").value,missingKey:document.getElementById("msgMissingKey").value,scopeDenied:document.getElementById("msgScopeDenied").value}};';
  h += 'api("/update-response-settings",body).then(function(r){if(r.success)toast("✓ Settings saved")})}';
  h += '';

  h += 'var MONITOR_DATA=[];';
  h += 'function loadMonitor(){apiGet("/monitor-logs").then(function(r){MONITOR_DATA=r.logs||[];renderMonitor()})}';
  h += 'function renderMonitor(){';
  h += 'var filterEl=document.getElementById("monitorFilter");';
  h += 'var f=(filterEl?filterEl.value:"").toLowerCase();';
  h += 'var el=document.getElementById("monitorLogs");';
  h += 'if(!el)return;';
  h += 'var filtered=MONITOR_DATA.filter(function(l){return !f||JSON.stringify(l).toLowerCase().indexOf(f)>=0});';
  h += 'if(!filtered.length){el.innerHTML=\'<div style="text-align:center;color:var(--text-muted);padding:20px">No logs</div>\';return}';
  h += 'var html="";';
  h += 'var arr=filtered.slice().reverse();';
  h += 'for(var i=0;i<arr.length;i++){';
  h += 'var l=arr[i];';
  h += 'html+=\'<div class="log-entry"><span class="log-time">\'+(l.timestamp||"")+\'</span><span class="log-key">\'+(l.key||"")+\'</span><span class="log-endpoint">/\'+(l.endpoint||"")+\'</span><span class="log-ip">\'+(l.ip||"")+\'</span><span style="color:var(--text-muted)">\'+(l.deviceIcon||"")+" "+(l.browser||"")+\'</span></div>\';';
  h += '}';
  h += 'el.innerHTML=html;';
  h += '}';
  h += '';

  h += 'function loadStats(){';
  h += 'apiGet("/stats").then(function(s){';
  h += 'document.getElementById("stTotal").textContent=s.totalRequests||0;';
  h += 'document.getElementById("stToday").textContent=s.todayRequests||0;';
  h += 'var topE=s.topEndpoints||[];';
  h += 'var html="";';
  h += 'if(topE.length){for(var i=0;i<topE.length;i++){html+="<tr><td><code>/"+topE[i].k+"</code></td><td>"+topE[i].v+"</td></tr>"}}';
  h += 'else{html=\'<tr><td colspan="2" style="text-align:center;color:var(--text-muted)">No data</td></tr>\'}';
  h += 'document.getElementById("topEpBody").innerHTML=html;';
  h += '})}';
  h += '';

  h += 'function applyTheme(name){api("/theme/preset",{preset:name}).then(function(r){if(r.success){toast("✓ Theme applied");setTimeout(function(){location.reload()},600)}})}';
  h += '';

  h += 'function addAPI(){';
  h += 'var body={name:document.getElementById("aName").value.trim(),endpoint:document.getElementById("aEndpoint").value.trim(),param:document.getElementById("aParam").value.trim(),example:document.getElementById("aExample").value.trim(),realAPI:document.getElementById("aRealURL").value.trim()};';
  h += 'if(!body.name||!body.endpoint){toast("Name & endpoint required","error");return}';
  h += 'api("/add-api",body).then(function(r){if(r.success){toast("✓ API added");setTimeout(function(){location.reload()},600)}else toast(r.e||"Error","error")})}';
  h += 'function toggleAPI(id){api("/toggle-api",{id:id}).then(function(r){if(r.success){toast("✓ Toggled");setTimeout(function(){location.reload()},500)}})}';
  h += 'function deleteAPI(id){if(!confirm("Delete this API?"))return;api("/delete-api",{id:id}).then(function(r){if(r.success){toast("✓ Deleted");setTimeout(function(){location.reload()},500)}})}';
  h += '';

  h += 'function updateScopes(){';
  h += 'var keyName=document.getElementById("upKeyName").value.trim();';
  h += 'if(!keyName){toast("Key required","error");return}';
  h += 'var scopes=[];document.querySelectorAll("#scopeUpdate input:checked").forEach(function(i){scopes.push(i.value)});';
  h += 'if(!scopes.length){toast("Select scopes","error");return}';
  h += 'api("/update-scopes",{keyName:keyName,scopes:scopes}).then(function(r){if(r.success)toast("✓ Updated");else toast(r.e||"Error","error")})}';
  h += '';

  h += 'function loadProtection(){apiGet("/backup").then(function(b){';
  h += 'var prot=b.protected||{};';
  h += 'var body=document.getElementById("protBody");';
  h += 'var keys=Object.keys(prot);';
  h += 'if(!keys.length){body.innerHTML=\'<tr><td colspan="2" style="text-align:center;color:var(--text-muted)">None</td></tr>\';return}';
  h += 'var html="";';
  h += 'for(var i=0;i<keys.length;i++){html+="<tr><td><code>"+keys[i]+"</code></td><td><button class=\'btn-action danger\' onclick=\'removeProtection(\\""+keys[i]+"\\")\'>Remove</button></td></tr>"}';
  h += 'body.innerHTML=html;';
  h += '})}';
  h += 'function addProtection(){var v=document.getElementById("protValue").value.trim();if(!v){toast("Value required","error");return}api("/add-protection",{value:v}).then(function(r){if(r.success){toast("✓ Protected");loadProtection()}})}';
  h += 'function removeProtection(v){api("/remove-protection",{value:v}).then(function(r){if(r.success){toast("✓ Removed");loadProtection()}})}';
  h += '';

  h += 'function saveDDOS(){';
  h += 'var body={mode:document.getElementById("ddosMode").value,ip:{burst10s:document.getElementById("dIP10").value,perMinute:document.getElementById("dIP1M").value,perHour:document.getElementById("dIP1H").value}};';
  h += 'api("/ddos-config",body).then(function(r){if(r.success)toast("✓ DDoS config saved")})}';
  h += 'function clearStrikes(){api("/clear-strikes",{}).then(function(r){if(r.success)toast("✓ Strikes cleared")})}';
  h += '';

  h += 'function loadBans(){apiGet("/bans").then(function(b){';
  h += 'var body=document.getElementById("banIPBody");';
  h += 'var all=[];';
  h += '(b.ip||[]).forEach(function(x){x.type="ip";all.push(x)});';
  h += '(b.device||[]).forEach(function(x){x.type="device";all.push(x)});';
  h += '(b.key||[]).forEach(function(x){x.type="key";all.push(x)});';
  h += 'if(!all.length){body.innerHTML=\'<tr><td colspan="4" style="text-align:center;color:var(--text-muted)">No bans</td></tr>\';return}';
  h += 'var html="";';
  h += 'for(var i=0;i<all.length;i++){';
  h += 'var x=all[i];';
  h += 'html+="<tr><td><code>"+x.id+"</code> <span style=\'color:var(--text-muted);font-size:10px\'>("+x.type+")</span></td><td>"+(x.reason||"-")+"</td><td>"+(x.permanent?"PERMANENT":new Date(x.until).toLocaleString())+"</td><td><button class=\'btn-action success\' onclick=\'unban(\\""+x.type+"\\",\\""+x.id+"\\")\'>Unban</button></td></tr>";';
  h += '}';
  h += 'body.innerHTML=html;';
  h += '})}';
  h += 'function manualBan(){var type=document.getElementById("banType").value;var id=document.getElementById("banId").value.trim();if(!id){toast("Required","error");return}api("/ban",{type:type,id:id,reason:"Manual",permanent:false,minutes:60}).then(function(r){if(r.success){toast("✓ Banned");loadBans()}})}';
  h += 'function unban(type,id){api("/unban",{type:type,id:id}).then(function(r){if(r.success){toast("✓ Unbanned");loadBans()}})}';
  h += 'function unbanAll(){if(!confirm("Unban everything?"))return;api("/unban-all",{}).then(function(r){if(r.success){toast("✓ Done");setTimeout(function(){location.reload()},600)}})}';
  h += '';

  h += 'function loadDevices(){apiGet("/devices").then(function(d){';
  h += 'var body=document.getElementById("devicesBody");';
  h += 'if(!d.devices||!d.devices.length){body.innerHTML=\'<tr><td colspan="6" style="text-align:center;color:var(--text-muted)">No devices</td></tr>\';return}';
  h += 'var html="";';
  h += 'var arr=d.devices.slice(0,100);';
  h += 'for(var i=0;i<arr.length;i++){';
  h += 'var x=arr[i];';
  h += 'html+="<tr><td><code style=\'font-size:10px\'>"+x.id+"</code></td><td>"+(x.deviceType||"?")+"</td><td>"+(x.os||"?")+"</td><td>"+(x.requests||0)+"</td><td>"+(x.lastSeen||"-")+"</td><td>"+(x.banned?\'<span style="color:var(--danger)">BANNED</span>\':\'<span style="color:var(--success)">OK</span>\')+"</td></tr>";';
  h += '}';
  h += 'body.innerHTML=html;';
  h += '})}';
  h += '';

  h += 'function loadAudit(){apiGet("/audit-log").then(function(r){';
  h += 'var body=document.getElementById("auditBody");';
  h += 'if(!r.logs||!r.logs.length){body.innerHTML=\'<tr><td colspan="4" style="text-align:center;color:var(--text-muted)">No logs</td></tr>\';return}';
  h += 'var html="";';
  h += 'var arr=r.logs.slice().reverse();';
  h += 'for(var i=0;i<arr.length;i++){';
  h += 'var l=arr[i];';
  h += 'html+="<tr><td style=\'font-size:11px\'>"+(l.timestamp||"")+"</td><td>"+(l.user||"")+"</td><td><code>"+(l.action||"")+"</code></td><td style=\'font-size:11px\'>"+JSON.stringify(l.details||{})+"</td></tr>";';
  h += '}';
  h += 'body.innerHTML=html;';
  h += '})}';
  h += '';

  h += 'function downloadBackup(){apiGet("/backup").then(function(r){';
  h += 'var blob=new Blob([JSON.stringify(r,null,2)],{type:"application/json"});';
  h += 'var url=URL.createObjectURL(blob);';
  h += 'var a=document.createElement("a");';
  h += 'a.href=url;a.download="bronx-backup-"+Date.now()+".json";';
  h += 'a.click();URL.revokeObjectURL(url);';
  h += 'toast("✓ Backup downloaded");';
  h += '})}';
  h += 'function handleRestoreFile(input){var f=input.files[0];if(!f)return;var reader=new FileReader();reader.onload=function(e){document.getElementById("restoreJson").value=e.target.result;toast("File loaded")};reader.readAsText(f)}';
  h += 'function restoreData(){var txt=document.getElementById("restoreJson").value.trim();if(!txt){toast("Nothing to restore","error");return}var data;try{data=JSON.parse(txt)}catch(e){toast("Invalid JSON","error");return}api("/restore",data).then(function(r){if(r.success){toast("✓ Restored");setTimeout(function(){location.reload()},800)}else toast(r.e||"Error","error")})}';
  h += '';

  h += 'function action(path,msg){if(!confirm(msg||"Are you sure?"))return;api(path,{}).then(function(r){if(r.success){toast("✓ Done");setTimeout(function(){location.reload()},600)}})}';
  h += '';

  h += 'loadDashboard();';
  h += '</script>';
  h += '</body></html>';
  return h;
}

// ============================================================
// 🚀 BOOT
// ============================================================
loadFromDisk();
initDefaults();

const PORT = process.env.PORT || 3000;
app.listen(PORT, function () {
  console.log('===========================================');
  console.log('🛡️  BRONX OSINT V504 — ULTRA DEV EDITION');
  console.log('===========================================');
  console.log('✅ Server running on port ' + PORT);
  console.log('🔐 Admin path: ' + ADMIN_PATH);
  console.log('👤 Admin user: ' + ADMIN_USERNAME);
  console.log('🔑 Loaded ' + Object.keys(keyStorage).length + ' keys');
  console.log('🔧 Loaded ' + customAPIs.length + ' custom APIs');
  console.log('🛡️  DDoS mode: ' + ddosConfig.mode);
  console.log('===========================================');
});
