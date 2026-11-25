// ============================================================
// 🛡️ BRONX OSINT V503 PRO — ULTRA DEVELOPER EDITION
// ✅ Complete rewrite — no truncation, no glitch
// ✅ Professional developer-style UI (no cartoon)
// ✅ JSON preview on public dashboard (admin sets it)
// ✅ Global + Per-Key custom developer name
// ✅ Dynamic hidden-field removal
// ✅ Plain-text custom error messages (emoji supported)
// ✅ Full backup / export / import (download + manual paste)
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
const getNextKey = () => {
  const k = REAL_API_KEYS[currentKeyIndex];
  currentKeyIndex = (currentKeyIndex + 1) % REAL_API_KEYS.length;
  return k;
};

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'bronx';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '85095613';
const ADMIN_PATH = '/bronx-admin-panel';
const DATA_DIR = process.env.RENDER_DATA_DIR || '/tmp';
const F = (n) => path.join(DATA_DIR, n);
const DATA_FILE = F('bronx_v503_data.json');
const LOGS_FILE = F('bronx_v503_logs.json');

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
  hiddenFields:
    'credit, truecaller_name, cached, cached_at, api_by, by, channel, developer, api_key, real_url, source_url, owner, key_note, response_time_ms'
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
    Object.entries(keyStorage).forEach(([k, v]) => {
      if (!v._hardcoded) ks[k] = v;
    });
    fs.writeFileSync(
      DATA_FILE,
      JSON.stringify(
        {
          keys: ks,
          apis: customAPIs,
          logs: requestLogs.slice(-2000),
          protected: protectedData,
          endpointResponses,
          theme,
          bans,
          ddosConfig,
          whitelist,
          announcement,
          maintenance,
          auditLog: auditLog.slice(-500),
          customMessages,
          globalConfig
        },
        null,
        2
      )
    );
    fs.writeFileSync(LOGS_FILE, JSON.stringify(keyMonitorLogs.slice(-1000), null, 2));
  } catch (e) {
    console.log('Save err:', e.message);
  }
}
function loadFromDisk() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const d = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
      if (d.keys) Object.entries(d.keys).forEach(([k, v]) => (keyStorage[k] = v));
      if (d.apis?.length) customAPIs = d.apis;
      if (d.logs) requestLogs = d.logs;
      if (d.protected) protectedData = d.protected;
      if (d.endpointResponses) endpointResponses = d.endpointResponses;
      if (d.theme) {
        Object.assign(theme, d.theme);
        Object.assign(theme.colors, d.theme.colors || {});
      }
      if (d.bans) bans = { ...bans, ...d.bans };
      if (d.ddosConfig) ddosConfig = { ...ddosConfig, ...d.ddosConfig };
      if (d.whitelist) whitelist = d.whitelist;
      if (d.announcement) announcement = d.announcement;
      if (d.maintenance) maintenance = d.maintenance;
      if (d.auditLog) auditLog = d.auditLog;
      if (d.customMessages) customMessages = { ...customMessages, ...d.customMessages };
      if (d.globalConfig) globalConfig = { ...globalConfig, ...d.globalConfig };
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
const getIndiaTime = () => new Date(Date.now() + 5.5 * 3600 * 1000);
const getIndiaDate = () => getIndiaTime().toISOString().split('T')[0];
const getIndiaDateTime = () => getIndiaTime().toISOString().replace('T', ' ').substring(0, 19);
const isKeyExpired = (d) => d && d !== 'LIFETIME' && getIndiaTime() > new Date(d);
function parseExpiryDate(s) {
  if (!s || s === 'LIFETIME') return null;
  const p = String(s).split('-');
  if (p.length === 3)
    return p[0].length === 4
      ? new Date(+p[0], +p[1] - 1, +p[2], 23, 59, 59)
      : new Date(+p[2], +p[1] - 1, +p[0], 23, 59, 59);
  const d = new Date(s);
  return isNaN(d) ? null : d;
}
function logAudit(user, action, details) {
  auditLog.push({ user, action, details, timestamp: getIndiaDateTime() });
  if (auditLog.length > 500) auditLog = auditLog.slice(-500);
}

// ============================================================
// 📱 DEVICE & UTILS
// ============================================================
function getRealIP(req) {
  return (
    req.headers['x-forwarded-for']?.split(',')[0].trim() ||
    req.headers['x-real-ip'] ||
    req.headers['cf-connecting-ip'] ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    'Unknown'
  );
}
function generateDeviceId(req) {
  const ua = req.headers['user-agent'] || '';
  const lang = req.headers['accept-language'] || '';
  return (
    'DEV_' +
    crypto.createHash('md5').update(`${ua}|${lang}`).digest('hex').substring(0, 16).toUpperCase()
  );
}
function detectDeviceType(req) {
  const ua = (req.headers['user-agent'] || '').toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return { type: 'iOS', icon: '📱', os: 'iOS' };
  if (/android/.test(ua)) return { type: 'Android', icon: '📱', os: 'Android' };
  if (/windows/.test(ua)) return { type: 'Windows', icon: '💻', os: 'Windows' };
  if (/macintosh|mac os x/.test(ua)) return { type: 'macOS', icon: '💻', os: 'macOS' };
  if (/linux/.test(ua)) return { type: 'Linux', icon: '💻', os: 'Linux' };
  if (/curl|wget|python|node|axios|java|php|ruby|go-http/.test(ua))
    return { type: 'Bot/CLI', icon: '🤖', os: 'Bot' };
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
  const b = bans[type]?.[id];
  if (!b) return false;
  if (b.permanent) return true;
  if (Date.now() < b.until) return true;
  delete bans[type][id];
  return false;
}
function pushHit(bucket, id, maxWindow = 24 * 3600000) {
  const now = Date.now();
  if (!bucket[id]) bucket[id] = { hits: [], strikes: 0 };
  bucket[id].hits = bucket[id].hits.filter((t) => t > now - maxWindow);
  bucket[id].hits.push(now);
}
function countWindow(bucket, id, ms) {
  const now = Date.now();
  return (bucket[id]?.hits || []).filter((t) => t > now - ms).length;
}
function strike(bucket, id, reason, ctx = {}) {
  if (!bucket[id]) bucket[id] = { hits: [], strikes: 0 };
  bucket[id].strikes++;
  const s = bucket[id].strikes;
  const c = ddosConfig.strikes;
  if (s >= c.permanentAt) {
    if (!bans[ctx.type]) bans[ctx.type] = {};
    bans[ctx.type][id] = { permanent: true, reason, at: getIndiaDateTime(), strikes: s };
    return { action: 'PERMANENT_BAN', message: '🚫 PERMANENT BAN' };
  }
  if (s >= c.longBanAt) {
    if (!bans[ctx.type]) bans[ctx.type] = {};
    bans[ctx.type][id] = {
      until: Date.now() + ddosConfig.longBanMs,
      reason,
      at: getIndiaDateTime(),
      strikes: s
    };
    return { action: 'LONG_BAN', message: '⛔ 1 hour ban' };
  }
  if (s >= c.tempBanAt) {
    if (!bans[ctx.type]) bans[ctx.type] = {};
    bans[ctx.type][id] = {
      until: Date.now() + ddosConfig.tempBanMs,
      reason,
      at: getIndiaDateTime(),
      strikes: s
    };
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

  if (whitelist.ips.includes(ip)) return { allowed: true, action: 'WHITELISTED' };
  if (isBanned('ip', ip)) return { allowed: false, code: 403, reason: 'IP banned', action: 'BANNED' };
  if (isBanned('device', deviceId))
    return { allowed: false, code: 403, reason: 'Device banned', action: 'BANNED' };
  if (key && isBanned('key', key))
    return { allowed: false, code: 403, reason: 'Key banned', action: 'BANNED' };

  pushHit(abuseTracker.ip, ip);
  pushHit(abuseTracker.device, deviceId);
  if (key) pushHit(abuseTracker.key, key);

  const mult = ddosConfig.mode === 'strict' ? 0.3 : 1;
  const check = (type, id, base, bucket) => {
    const limits = {
      burst10s: Math.floor(base.burst10s * mult),
      perMinute: Math.floor(base.perMinute * mult),
      perHour: Math.floor(base.perHour * mult)
    };
    const b10 = countWindow(bucket, id, 10000);
    const b1m = countWindow(bucket, id, 60000);
    const b1h = countWindow(bucket, id, 3600000);
    if (b10 > limits.burst10s) return strike(bucket, id, `Burst ${b10}/${limits.burst10s}/10s`, { type });
    if (b1m > limits.perMinute) return strike(bucket, id, `Rate ${b1m}/${limits.perMinute}/min`, { type });
    if (b1h > limits.perHour) return strike(bucket, id, `Rate ${b1h}/${limits.perHour}/hour`, { type });
    return null;
  };

  let r = check('ip', ip, ddosConfig.ip, abuseTracker.ip);
  if (r)
    return {
      allowed: r.action === 'WARN' || r.action === 'THROTTLE',
      code: r.action.includes('BAN') ? 403 : 200,
      reason: r.message,
      action: r.action
    };
  r = check('device', deviceId, ddosConfig.device, abuseTracker.device);
  if (r)
    return {
      allowed: r.action === 'WARN' || r.action === 'THROTTLE',
      code: r.action.includes('BAN') ? 403 : 200,
      reason: r.message,
      action: r.action
    };
  if (key) {
    r = check('key', key, ddosConfig.key, abuseTracker.key);
    if (r)
      return {
        allowed: r.action === 'WARN' || r.action === 'THROTTLE',
        code: r.action.includes('BAN') ? 403 : 200,
        reason: r.message,
        action: r.action
      };
  }
  return { allowed: true, action: 'OK' };
}

// ============================================================
// 🔑 KEY VALIDATION
// ============================================================
function checkCooldown(k) {
  const kd = keyStorage[k];
  if (!kd?.cooldown) return { allowed: true };
  const n = Date.now();
  if (cooldownTimers[k] && n - cooldownTimers[k] < kd.cooldown * 1000)
    return { allowed: false, remaining: Math.ceil((kd.cooldown * 1000 - (n - cooldownTimers[k])) / 1000) };
  cooldownTimers[k] = n;
  return { allowed: true };
}
function checkPerSecondLimit(k) {
  const kd = keyStorage[k];
  if (!kd?.perSecondLimit) return { allowed: true };
  const wk = k + '_ps_' + Math.floor(Date.now() / 1000);
  if (!perSecondLimits[wk]) perSecondLimits[wk] = 0;
  if (perSecondLimits[wk] >= kd.perSecondLimit)
    return { allowed: false, message: `⚡ ${kd.perSecondLimit}/s reached` };
  perSecondLimits[wk]++;
  return { allowed: true };
}
function checkDailyLimit(k) {
  const kd = keyStorage[k];
  if (!kd?.dailyLimit) return { allowed: true };
  const dk = k + '_' + getIndiaDate();
  if (!dailyLimits[dk]) dailyLimits[dk] = 0;
  if (dailyLimits[dk] >= kd.dailyLimit)
    return { allowed: false, message: '🔴 Daily limit reached' };
  return { allowed: true };
}
function isProtected(value) {
  for (const key in protectedData)
    if (String(value).includes(protectedData[key])) return protectedData[key];
  return null;
}
function checkKeyValid(k) {
  if (!k) return { valid: false, error: customMessages.missingKey };
  if (maintenance.enabled && !whitelist.keys.includes(k))
    return { valid: false, error: '🔧 ' + maintenance.message };
  const kd = keyStorage[k];
  if (!kd) return { valid: false, error: customMessages.keyNotFound };
  if (kd.stopped) return { valid: false, error: customMessages.keyStopped };
  if (kd.disabled) return { valid: false, error: customMessages.keyDisabled };
  if (kd.expiry && isKeyExpired(kd.expiry))
    return { valid: false, error: customMessages.keyExpired.replace('{date}', kd.expiryStr) };
  if (!kd.unlimited && kd.used >= kd.limit)
    return {
      valid: false,
      error: customMessages.limitReached.replace('{used}', kd.used).replace('{limit}', kd.limit)
    };
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
    ip,
    deviceId,
    deviceIcon: di.icon,
    deviceType: di.type,
    browser,
    country,
    timestamp: getIndiaDateTime(),
    date: getIndiaDate()
  });
  if (keyMonitorLogs.length > 1000) keyMonitorLogs = keyMonitorLogs.slice(-1000);
  requestLogs.push({
    timestamp: getIndiaDateTime(),
    key: k.substring(0, 8) + '***',
    endpoint: ep,
    ip,
    clientType: browser
  });
  if (requestLogs.length > 2000) requestLogs = requestLogs.slice(-2000);
}
function checkKeyScope(kd, ep) {
  if (!kd?.scopes?.length) return { valid: false, error: 'No scopes assigned' };
  if (kd.scopes.includes('*')) return { valid: true };
  if (kd.scopes.includes(ep)) return { valid: true };
  const cleanEp = ep.startsWith('c/') ? ep.substring(2) : ep;
  const isCustom = customAPIs.some((a) => a.endpoint === cleanEp);
  if (isCustom) {
    if (kd.scopes.includes('custom')) return { valid: true };
    if (kd.scopes.includes('custom:' + cleanEp)) return { valid: true };
  }
  return { valid: false, error: customMessages.scopeDenied + ': ' + ep };
}
const genToken = () => crypto.randomBytes(24).toString('base64url');
const genRandomKey = (p = 'BRONX') => `${p}_${crypto.randomBytes(10).toString('hex').toUpperCase()}`;

function isAdminAuth(t) {
  if (!t) return false;
  if (adminSessions[t]) {
    if (Date.now() < adminSessions[t].expiresAt) return true;
    delete adminSessions[t];
  }
  return false;
}

function getHiddenFields() {
  return (globalConfig.hiddenFields || '')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s);
}
function sanitizeResponse(d, devName) {
  if (!d || typeof d !== 'object') return d;
  try {
    const c = JSON.parse(JSON.stringify(d));
    const toRemove = getHiddenFields();
    const del = (obj) => {
      if (!obj || typeof obj !== 'object') return;
      toRemove.forEach((x) => {
        if (obj[x] !== undefined) delete obj[x];
      });
      Object.values(obj).forEach((v) => {
        if (v && typeof v === 'object') del(v);
      });
    };
    del(c);
    c.powered_by = devName || globalConfig.developerName || '@BRONX_ULTRA';
    return c;
  } catch (e) {
    return d;
  }
}
function esc(s) {
  return s
    ? String(s).replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m]))
    : '';
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
  hc.forEach(([k, n, e, s]) => {
    if (!keyStorage[k])
      keyStorage[k] = {
        name: n, scopes: s, type: 'hardcoded', limit: 999999, used: 0, cooldown: 0,
        dailyLimit: 0, perSecondLimit: 0,
        expiry: parseExpiryDate(e), expiryStr: e, created: now,
        unlimited: true, hidden: true, _hardcoded: true, developerName: ''
      };
  });
  if (customAPIs.length === 0) {
    customAPIs = [
      {
        id: 1, name: 'Number Info', endpoint: 'number-advanced', param: 'num',
        example: '9876543210', visible: true,
        realAPI: 'https://num-tg-info-api.vercel.app/info?number={param}',
        scopeKey: 'custom:number-advanced', createdAt: now
      },
      {
        id: 2, name: 'Vehicle RC', endpoint: 'rc-details', param: 'ca_number',
        example: 'MH02FZ0555', visible: true,
        realAPI: 'https://simple-rc-info.vercel.app/rc?num={param}',
        scopeKey: 'custom:rc-details', createdAt: now
      },
      {
        id: 3, name: 'Aadhar', endpoint: 'aadhar-verify', param: 'aadhar',
        example: '393933081942', visible: true,
        realAPI: 'https://bronx-king-vip999.vercel.app/api/aadhaar?num={param}',
        scopeKey: 'custom:aadhar-verify', createdAt: now
      },
      {
        id: 4, name: 'Telegram', endpoint: 'telegram-scan', param: 'id',
        example: '7530266953', visible: true,
        realAPI: 'https://bronx-tg-king-bro.vercel.app/tg?key=BRONXop&query={param}',
        scopeKey: 'custom:telegram-scan', createdAt: now
      }
    ];
  }
}

// ============================================================
// 🌐 MIDDLEWARE
// ============================================================
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.set('json spaces', 2);
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,x-api-key,x-admin-token');
  if (req.method === 'OPTIONS') return res.status(200).end();
  next();
});
app.use('/api', (req, res, next) => {
  const r = smartDDoS(req);
  res.setHeader('X-RateLimit-Mode', ddosConfig.mode);
  if (r.action && r.action !== 'OK') res.setHeader('X-Bronx-Warning', r.reason || 'ok');
  if (!r.allowed) {
    res.setHeader('Content-Type', 'text/plain');
    return res.status(r.code || 429).send(r.reason || 'Rate limited');
  }
  if (r.action === 'THROTTLE') return setTimeout(() => next(), 800);
  next();
});

// ============================================================
// 🏠 PUBLIC ROUTES
// ============================================================
app.get('/', (req, res) => {
  try {
    res.send(renderHome());
  } catch (e) {
    res.send('err: ' + e.message);
  }
});
app.get('/test', (req, res) =>
  res.json({
    status: '✅ BRONX V503 ONLINE',
    version: '5.0.3',
    ddos: ddosConfig.mode,
    keys: Object.keys(keyStorage).length,
    endpoints: Object.keys(endpoints).length,
    custom: customAPIs.length,
    bannedIPs: Object.keys(bans.ip).length,
    devicesTracked: Object.keys(deviceFingerprints).length,
    theme: theme.preset,
    maintenance: maintenance.enabled
  })
);

// Public dashboard JSON preview data
app.get('/api/public/preview/:ep', (req, res) => {
  const ep = req.params.ep;
  if (!endpoints[ep] && !customAPIs.some((a) => a.endpoint === ep)) {
    return res.status(404).json({ error: 'Not found' });
  }
  res.json(endpointResponses[ep] || { status: 'success', data: 'Sample response — admin can set this in the admin panel.' });
});

// ============================================================
// 🚀 API ROUTES — CUSTOM APIS
// ============================================================
app.get('/api/custom/:ep', async (req, res) => {
  try {
    const api = customAPIs.find((a) => a.endpoint === req.params.ep && a.visible);
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
      return res.json({
        ...sanitizeResponse(endpointResponses[api.endpoint], devName),
        api_info: { key_owner: kc.keyData.name }
      });
    }

    const url = api.realAPI.replace(/\{param\}/gi, encodeURIComponent(pv));
    const r = await axios.get(url, { timeout: 30000 });
    incrementKeyUsage(key, 'c/' + req.params.ep, req);
    const devName = kc.keyData.developerName || globalConfig.developerName;
    res.json({
      ...sanitizeResponse(r.data, devName),
      api_info: {
        key_owner: kc.keyData.name,
        remaining: kc.keyData.unlimited ? '∞' : Math.max(0, kc.keyData.limit - kc.keyData.used),
        expiry: kc.keyData.expiryStr || 'LIFETIME'
      }
    });
  } catch (e) {
    res.setHeader('Content-Type', 'text/plain');
    res.status(500).send('API error: ' + e.message);
  }
});

// ============================================================
// 🚀 API ROUTES — MAIN ENDPOINTS
// ============================================================
app.get('/api/key-bronx/:ep', async (req, res) => {
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
      return res.json({
        ...sanitizeResponse(endpointResponses[ep], devName),
        api_info: { key_owner: kc.keyData.name }
      });
    }
    const url = `${REAL_API_BASE}/${ep}?key=${getNextKey()}&${endpoints[ep].p}=${encodeURIComponent(pv)}`;
    const r = await axios.get(url, { timeout: 30000 });
    incrementKeyUsage(key, ep, req);
    res.json({
      ...sanitizeResponse(r.data, devName),
      api_info: {
        key_owner: kc.keyData.name,
        remaining: kc.keyData.unlimited ? '∞' : Math.max(0, kc.keyData.limit - kc.keyData.used),
        expiry: kc.keyData.expiryStr || 'LIFETIME'
      }
    });
  } catch (e) {
    res.setHeader('Content-Type', 'text/plain');
    res.status(500).send('API error: ' + e.message);
  }
});

// ============================================================
// 🔐 ADMIN AUTH
// ============================================================
app.get(ADMIN_PATH, (req, res) => {
  try {
    const token = req.query.token || req.headers['x-admin-token'];
    if (token && isAdminAuth(token)) return res.send(renderAdmin(token));
    res.send(renderLogin());
  } catch (e) {
    res.send('err: ' + e.message);
  }
});

app.post(ADMIN_PATH + '/login', (req, res) => {
  const { username, password } = req.body;
  const ip = getRealIP(req);
  const ua = req.headers['user-agent'] || '';
  if (bans.ip['LOGIN_' + ip] && (bans.ip['LOGIN_' + ip].permanent || Date.now() < bans.ip['LOGIN_' + ip].until))
    return res.json({ success: false, error: '🚫 Too many failed attempts. Try again later.' });

  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    const token = genToken();
    adminSessions[token] = { expiresAt: Date.now() + 365 * 24 * 3600 * 1000 };
    delete abuseTracker.ip['LOGIN_' + ip];
    adminLogs.push({
      user: username, action: 'LOGIN', ip, browser: ua,
      timestamp: getIndiaDateTime(), status: 'SUCCESS'
    });
    saveToDisk();
    res.json({ success: true, token, message: '✅ Access Granted', redirect: ADMIN_PATH + '?token=' + token });
  } else {
    pushHit(abuseTracker.ip, 'LOGIN_' + ip, 3600000);
    const attempts = countWindow(abuseTracker.ip, 'LOGIN_' + ip, 3600000);
    if (attempts >= ddosConfig.login.maxAttempts)
      bans.ip['LOGIN_' + ip] = {
        until: Date.now() + ddosConfig.login.banMs,
        reason: 'Failed logins', at: getIndiaDateTime(), strikes: attempts
      };
    adminLogs.push({
      user: username, action: 'LOGIN_FAILED', ip, browser: ua,
      attempts, timestamp: getIndiaDateTime(), status: 'FAILED'
    });
    res.json({
      success: false,
      error: `Invalid credentials! ${ddosConfig.login.maxAttempts - attempts} attempts left.`
    });
  }
});

const adminAuth = (req, res, next) => {
  const t = req.headers['x-admin-token'] || req.query.token;
  if (!isAdminAuth(t)) return res.json({ e: 'Unauthorized' });
  next();
};

// ============================================================
// 🎛️ ADMIN APIs
// ============================================================
app.post(ADMIN_PATH + '/generate-key', adminAuth, (req, res) => {
  const {
    keyName, keyOwner, scopes, limit, days, cooldown, dailyLimit,
    perSecondLimit, notes, developerName
  } = req.body;
  let fk = keyName && keyName.trim() ? keyName.trim() : genRandomKey();
  if (!keyOwner) return res.json({ e: 'Owner required' });
  if (keyStorage[fk]) return res.json({ e: 'Key already exists' });

  let exp = null;
  let es = 'LIFETIME';
  if (days && !isNaN(days)) {
    const d = new Date(Date.now() + parseInt(days) * 24 * 3600 * 1000);
    exp = d;
    es = d.toISOString().split('T')[0].split('-').reverse().join('-');
  }
  keyStorage[fk] = {
    name: keyOwner, scopes: scopes || ['number'], type: 'generated',
    limit: parseInt(limit) || 100, used: 0,
    cooldown: parseInt(cooldown) || 0,
    dailyLimit: parseInt(dailyLimit) || 0,
    perSecondLimit: parseInt(perSecondLimit) || 0,
    expiry: exp, expiryStr: es, created: getIndiaDateTime(),
    unlimited: false, hidden: false, _hardcoded: false,
    stopped: false, disabled: false,
    notes: notes || '',
    developerName: developerName || ''
  };
  logAudit('admin', 'GENERATE_KEY', { key: fk });
  saveToDisk();
  res.json({ success: true, key: fk, message: '🔑 Key Generated!' });
});

app.post(ADMIN_PATH + '/edit-key', adminAuth, (req, res) => {
  const {
    keyName, newOwner, newLimit, newDailyLimit, newPerSecondLimit,
    newCooldown, newScopes, newNotes, newExpiry, newDeveloperName
  } = req.body;
  const kd = keyStorage[keyName];
  if (!kd) return res.json({ e: 'Not found' });
  if (kd._hardcoded) return res.json({ e: 'Hardcoded key — cannot edit' });

  if (newOwner !== undefined) kd.name = newOwner;
  if (newLimit !== undefined) kd.limit = parseInt(newLimit);
  if (newDailyLimit !== undefined) kd.dailyLimit = parseInt(newDailyLimit);
  if (newPerSecondLimit !== undefined) kd.perSecondLimit = parseInt(newPerSecondLimit);
  if (newCooldown !== undefined) kd.cooldown = parseInt(newCooldown);
  if (newScopes) kd.scopes = newScopes;
  if (newNotes !== undefined) kd.notes = newNotes;
  if (newDeveloperName !== undefined) kd.developerName = newDeveloperName;
  if (newExpiry) {
    const e = parseExpiryDate(newExpiry);
    if (e) { kd.expiry = e; kd.expiryStr = newExpiry; }
  }
  logAudit('admin', 'EDIT_KEY', { key: keyName });
  saveToDisk();
  res.json({ success: true, message: '✅ Updated!' });
});

app.post(ADMIN_PATH + '/delete-key', adminAuth, (req, res) => {
  const k = req.body.keyName;
  if (keyStorage[k]?._hardcoded) return res.json({ e: 'Protected' });
  delete keyStorage[k];
  saveToDisk();
  res.json({ success: true });
});

app.post(ADMIN_PATH + '/reset-key-usage', adminAuth, (req, res) => {
  const k = req.body.keyName;
  if (!keyStorage[k]) return res.json({ e: 'Not found' });
  keyStorage[k].used = 0;
  saveToDisk();
  res.json({ success: true });
});

app.post(ADMIN_PATH + '/reset-all', adminAuth, (req, res) => {
  Object.keys(keyStorage).forEach((k) => {
    if (!keyStorage[k]._hardcoded) keyStorage[k].used = 0;
  });
  dailyLimits = {};
  perSecondLimits = {};
  saveToDisk();
  res.json({ success: true });
});

app.post(ADMIN_PATH + '/clear-logs', adminAuth, (req, res) => {
  requestLogs = [];
  keyMonitorLogs = [];
  saveToDisk();
  res.json({ success: true });
});

app.post(ADMIN_PATH + '/stop-key', adminAuth, (req, res) => {
  const k = req.body.keyName;
  if (!keyStorage[k]) return res.json({ e: 'Not found' });
  if (keyStorage[k]._hardcoded) return res.json({ e: 'Hardcoded' });
  keyStorage[k].stopped = !keyStorage[k].stopped;
  saveToDisk();
  res.json({ success: true, stopped: keyStorage[k].stopped });
});

app.post(ADMIN_PATH + '/disable-key', adminAuth, (req, res) => {
  const k = req.body.keyName;
  if (!keyStorage[k]) return res.json({ e: 'Not found' });
  if (keyStorage[k]._hardcoded) return res.json({ e: 'Hardcoded' });
  keyStorage[k].disabled = !keyStorage[k].disabled;
  saveToDisk();
  res.json({ success: true, disabled: keyStorage[k].disabled });
});

app.post(ADMIN_PATH + '/update-scopes', adminAuth, (req, res) => {
  const { keyName, scopes } = req.body;
  if (!keyStorage[keyName]) return res.json({ e: 'Not found' });
  if (keyStorage[keyName]._hardcoded) return res.json({ e: 'Hardcoded' });
  keyStorage[keyName].scopes = scopes;
  saveToDisk();
  res.json({ success: true });
});

app.post(ADMIN_PATH + '/push-key', adminAuth, (req, res) => {
  const { keyName, days } = req.body;
  if (!keyStorage[keyName]) return res.json({ e: 'Not found' });
  if (keyStorage[keyName]._hardcoded) return res.json({ e: 'Hardcoded' });
  const d = parseInt(days) || 30;
  const ne = new Date(Date.now() + d * 24 * 3600 * 1000);
  keyStorage[keyName].expiry = ne;
  keyStorage[keyName].expiryStr = ne.toISOString().split('T')[0].split('-').reverse().join('-');
  keyStorage[keyName].used = 0;
  saveToDisk();
  res.json({ success: true, message: `⬆ Pushed ${d} days!` });
});

app.post(ADMIN_PATH + '/push-all', adminAuth, (req, res) => {
  const d = parseInt(req.body.days) || 30;
  const ne = new Date(Date.now() + d * 24 * 3600 * 1000);
  let count = 0;
  Object.keys(keyStorage).forEach((k) => {
    if (!keyStorage[k]._hardcoded) {
      keyStorage[k].expiry = ne;
      keyStorage[k].expiryStr = ne.toISOString().split('T')[0].split('-').reverse().join('-');
      count++;
    }
  });
  saveToDisk();
  res.json({ success: true, count, message: `⬆ Pushed ${d} days to ${count} keys!` });
});

app.post(ADMIN_PATH + '/add-api', adminAuth, (req, res) => {
  const { name, endpoint, param, example, realAPI, visible } = req.body;
  if (!name || !endpoint) return res.json({ e: 'Name and endpoint required' });
  const cleanEp = String(endpoint).toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  if (!cleanEp) return res.json({ e: 'Invalid endpoint' });
  if (customAPIs.some((a) => a.endpoint === cleanEp)) return res.json({ e: 'Endpoint exists' });
  const api = {
    id: Date.now(), name, endpoint: cleanEp,
    param: param || 'num', example: example || '9876543210',
    visible: visible !== false, realAPI: realAPI || '',
    scopeKey: 'custom:' + cleanEp, createdAt: getIndiaDateTime()
  };
  customAPIs.push(api);
  saveToDisk();
  res.json({ success: true, api, message: '✅ API Added!' });
});

app.post(ADMIN_PATH + '/toggle-api', adminAuth, (req, res) => {
  const a = customAPIs.find((x) => x.id === parseInt(req.body.id));
  if (!a) return res.json({ e: 'Not found' });
  a.visible = !a.visible;
  saveToDisk();
  res.json({ success: true, visible: a.visible });
});

app.post(ADMIN_PATH + '/delete-api', adminAuth, (req, res) => {
  const i = customAPIs.findIndex((x) => x.id === parseInt(req.body.id));
  if (i === -1) return res.json({ e: 'Not found' });
  customAPIs.splice(i, 1);
  saveToDisk();
  res.json({ success: true });
});

app.post(ADMIN_PATH + '/add-protection', adminAuth, (req, res) => {
  const v = req.body.value;
  if (!v) return res.json({ e: 'Missing' });
  protectedData[v] = v;
  saveToDisk();
  res.json({ success: true });
});

app.post(ADMIN_PATH + '/remove-protection', adminAuth, (req, res) => {
  delete protectedData[req.body.value];
  saveToDisk();
  res.json({ success: true });
});

app.get(ADMIN_PATH + '/bans', adminAuth, (req, res) => {
  const list = (o) => Object.entries(o).map(([id, d]) => ({ id, ...d }));
  res.json({ ip: list(bans.ip), device: list(bans.device), key: list(bans.key) });
});

app.post(ADMIN_PATH + '/ban', adminAuth, (req, res) => {
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

app.post(ADMIN_PATH + '/unban', adminAuth, (req, res) => {
  const { type, id } = req.body;
  if (bans[type]) delete bans[type][id];
  if (abuseTracker[type]?.[id]) delete abuseTracker[type][id];
  saveToDisk();
  res.json({ success: true });
});

app.post(ADMIN_PATH + '/unban-all', adminAuth, (req, res) => {
  bans = { ip: {}, device: {}, key: {} };
  abuseTracker = { ip: {}, device: {}, key: {} };
  saveToDisk();
  res.json({ success: true });
});

app.get(ADMIN_PATH + '/devices', adminAuth, (req, res) => {
  const list = Object.entries(deviceFingerprints)
    .map(([id, d]) => ({ id, ...d, banned: !!bans.device[id] }))
    .sort((a, b) => (b.requests || 0) - (a.requests || 0));
  res.json({ devices: list, total: list.length });
});

app.get(ADMIN_PATH + '/ddos-config', adminAuth, (req, res) => res.json(ddosConfig));

app.post(ADMIN_PATH + '/ddos-config', adminAuth, (req, res) => {
  const c = req.body;
  if (c.mode) ddosConfig.mode = c.mode;
  if (c.enabled !== undefined) ddosConfig.enabled = !!c.enabled;
  ['ip', 'device', 'key'].forEach((k) => {
    if (c[k]) {
      if (c[k].burst10s) ddosConfig[k].burst10s = parseInt(c[k].burst10s);
      if (c[k].perMinute) ddosConfig[k].perMinute = parseInt(c[k].perMinute);
      if (c[k].perHour) ddosConfig[k].perHour = parseInt(c[k].perHour);
    }
  });
  saveToDisk();
  res.json({ success: true, config: ddosConfig });
});

app.post(ADMIN_PATH + '/clear-strikes', adminAuth, (req, res) => {
  ['ip', 'device', 'key'].forEach((t) => {
    Object.keys(abuseTracker[t] || {}).forEach((x) => (abuseTracker[t][x].strikes = 0));
  });
  saveToDisk();
  res.json({ success: true });
});

app.get(ADMIN_PATH + '/monitor-logs', adminAuth, (req, res) => {
  res.json({ logs: keyMonitorLogs.slice(-300), total: keyMonitorLogs.length });
});

app.get(ADMIN_PATH + '/stats', adminAuth, (req, res) => {
  if (statsCache.data && Date.now() < statsCache.expiresAt) return res.json(statsCache.data);
  const today = getIndiaDate();
  const todayL = keyMonitorLogs.filter((l) => l.date === today);
  const byKey = {}, byEp = {};
  keyMonitorLogs.forEach((l) => {
    byKey[l.key] = (byKey[l.key] || 0) + 1;
    byEp[l.endpoint] = (byEp[l.endpoint] || 0) + 1;
  });
  const top = (o, n = 10) =>
    Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => ({ k, v }));
  const data = {
    totalRequests: keyMonitorLogs.length,
    todayRequests: todayL.length,
    topKeys: top(byKey, 5),
    topEndpoints: top(byEp, 10)
  };
  statsCache = { data, expiresAt: Date.now() + 10000 };
  res.json(data);
});

app.get(ADMIN_PATH + '/theme', adminAuth, (req, res) =>
  res.json({ theme, presets: Object.keys(PRESETS) })
);

app.post(ADMIN_PATH + '/theme/preset', adminAuth, (req, res) => {
  if (!applyPreset(req.body.preset)) return res.json({ e: 'Invalid preset' });
  saveToDisk();
  res.json({ success: true, theme });
});

app.get(ADMIN_PATH + '/response-settings', adminAuth, (req, res) => {
  res.json({ globalConfig, customMessages });
});

app.post(ADMIN_PATH + '/update-response-settings', adminAuth, (req, res) => {
  const { developerName, hiddenFields, messages } = req.body;
  if (developerName !== undefined) globalConfig.developerName = developerName;
  if (hiddenFields !== undefined) globalConfig.hiddenFields = hiddenFields;
  if (messages) {
    Object.keys(messages).forEach((k) => {
      if (customMessages[k] !== undefined) customMessages[k] = messages[k];
    });
  }
  saveToDisk();
  res.json({ success: true, globalConfig, customMessages });
});

app.post(ADMIN_PATH + '/update-endpoint-response', adminAuth, (req, res) => {
  const { endpoint, responseData } = req.body;
  if (!endpoint) return res.json({ e: 'Missing endpoint' });
  try {
    if (!responseData || (typeof responseData === 'string' && responseData.trim() === '')) {
      delete endpointResponses[endpoint];
    } else {
      endpointResponses[endpoint] =
        typeof responseData === 'string' ? JSON.parse(responseData) : responseData;
    }
    saveToDisk();
    res.json({ success: true });
  } catch (e) {
    res.json({ e: 'Invalid JSON' });
  }
});

app.get(ADMIN_PATH + '/get-endpoint-response', adminAuth, (req, res) => {
  res.json({ data: endpointResponses[req.query.endpoint] || null });
});

app.get(ADMIN_PATH + '/export-keys', adminAuth, (req, res) => {
  const out = {};
  Object.entries(keyStorage).forEach(([k, v]) => {
    if (!v._hardcoded) out[k] = v;
  });
  res.json({ success: true, total: Object.keys(out).length, keys: out, exported_at: getIndiaDateTime() });
});

app.post(ADMIN_PATH + '/import-keys', adminAuth, (req, res) => {
  try {
    let body = req.body;
    let toImport = body.keys || body;
    if (toImport.keys && typeof toImport.keys === 'object' && !Array.isArray(toImport.keys))
      toImport = toImport.keys;
    const meta = ['success', 'total', 'keys', 'exported_at'];
    let imported = 0, skipped = 0;
    Object.entries(toImport).forEach(([k, d]) => {
      if (meta.includes(k) && typeof d !== 'object') return;
      if (!d || typeof d !== 'object') return;
      if (keyStorage[k] || d._hardcoded) { skipped++; return; }
      keyStorage[k] = { ...d, _hardcoded: false, hidden: false, type: 'generated' };
      imported++;
    });
    saveToDisk();
    res.json({ success: true, imported, skipped, message: `✅ ${imported} imported, ${skipped} skipped` });
  } catch (e) {
    res.json({ e: 'Error: ' + e.message });
  }
});

app.get(ADMIN_PATH + '/backup', adminAuth, (req, res) => {
  const ks = {};
  Object.entries(keyStorage).forEach(([k, v]) => {
    if (!v._hardcoded) ks[k] = v;
  });
  res.json({
    version: '5.0.3',
    exported_at: getIndiaDateTime(),
    keys: ks,
    apis: customAPIs,
    protected: protectedData,
    endpointResponses,
    theme,
    ddosConfig,
    whitelist,
    announcement,
    maintenance,
    globalConfig,
    customMessages
  });
});

app.post(ADMIN_PATH + '/restore', adminAuth, (req, res) => {
  try {
    const b = req.body;
    if (b.keys) Object.entries(b.keys).forEach(([k, v]) => {
      if (!v._hardcoded) keyStorage[k] = v;
    });
    if (b.apis) customAPIs = b.apis;
    if (b.protected) protectedData = b.protected;
    if (b.endpointResponses) endpointResponses = b.endpointResponses;
    if (b.theme) {
      Object.assign(theme, b.theme);
      Object.assign(theme.colors, b.theme.colors || {});
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

app.get(ADMIN_PATH + '/announcement', adminAuth, (req, res) => res.json({ announcement }));
app.post(ADMIN_PATH + '/announcement', adminAuth, (req, res) => {
  const { enabled, text } = req.body;
  announcement = { enabled: !!enabled, text: text || '', type: 'info' };
  saveToDisk();
  res.json({ success: true, announcement });
});

app.get(ADMIN_PATH + '/maintenance', adminAuth, (req, res) => res.json({ maintenance }));
app.post(ADMIN_PATH + '/maintenance', adminAuth, (req, res) => {
  const { enabled, message } = req.body;
  maintenance = { enabled: !!enabled, message: message || 'System under maintenance' };
  saveToDisk();
  res.json({ success: true, maintenance });
});

app.get(ADMIN_PATH + '/audit-log', adminAuth, (req, res) => {
  res.json({ logs: auditLog.slice(-300), total: auditLog.length });
});
app.get(ADMIN_PATH + '/admin-logs', adminAuth, (req, res) => {
  res.json({ logs: adminLogs.slice(-300), total: adminLogs.length });
});

// 404
app.use((req, res) => res.status(404).json({ error: 'Not found' }));

// ============================================================
// 🎨 CSS GENERATOR
// ============================================================
function generateCSS() {
  const c = theme.colors;
  const r = theme.radius;
  return `
<style id="bronx-theme">
:root{
  --bg-primary:${c.bgPrimary};--bg-secondary:${c.bgSecondary};--bg-card:${c.bgCard};
  --border-color:${c.borderColor};--text-primary:${c.textPrimary};
  --text-secondary:${c.textSecondary};--text-muted:${c.textMuted};
  --accent:${c.accent};--accent2:${c.accent2};
  --success:${c.success};--warning:${c.warning};--danger:${c.danger};--info:${c.info};
  --radius:${r}px;--tr:all .15s ease;
}
*{margin:0;padding:0;box-sizing:border-box}
html,body{background:var(--bg-primary);color:var(--text-primary);font-family:${theme.fonts.body};line-height:1.5;-webkit-font-smoothing:antialiased}
body{min-height:100vh;position:relative}
.grid-bg{position:fixed;inset:0;background-image:radial-gradient(rgba(88,166,255,0.06) 1px,transparent 1px);background-size:22px 22px;z-index:0;pointer-events:none}
a{color:var(--accent);text-decoration:none}
::-webkit-scrollbar{width:10px;height:10px}
::-webkit-scrollbar-track{background:var(--bg-primary)}
::-webkit-scrollbar-thumb{background:#30363d;border-radius:5px;border:2px solid var(--bg-primary)}
::-webkit-scrollbar-thumb:hover{background:#484f58}
.code{font-family:${theme.fonts.mono}}

/* LAYOUT */
.admin-container{display:flex;min-height:100vh;position:relative;z-index:10}
.sidebar{width:260px;background:var(--bg-secondary);border-right:1px solid var(--border-color);padding:16px 0;position:fixed;height:100vh;overflow-y:auto;top:0;left:0}
.sidebar-header{padding:0 20px 16px;border-bottom:1px solid var(--border-color);margin-bottom:12px}
.sidebar-logo{font-size:22px;font-weight:700;color:var(--text-primary);font-family:${theme.fonts.heading};letter-spacing:-0.5px;display:flex;align-items:center;gap:8px}
.sidebar-logo span{color:var(--accent)}
.sidebar-subtitle{font-size:11px;color:var(--text-muted);margin-top:2px;font-family:${theme.fonts.mono}}
.sidebar-nav{list-style:none;padding:0 8px}
.sidebar-nav li{margin-bottom:1px}
.sidebar-nav a{display:flex;align-items:center;gap:10px;padding:8px 12px;color:var(--text-secondary);border-radius:6px;transition:var(--tr);font-size:13px;font-weight:500;cursor:pointer;border-left:2px solid transparent}
.sidebar-nav a:hover{background:#1f2630;color:var(--text-primary)}
.sidebar-nav a.active{background:#1f2630;color:var(--accent);border-left-color:var(--accent)}
.sidebar-nav i{width:16px;text-align:center;font-size:13px;opacity:0.8}
.main-content{flex:1;margin-left:260px;padding:24px;max-width:calc(100vw - 260px)}

/* CARDS */
.glow-card{background:var(--bg-card);border:1px solid var(--border-color);border-radius:var(--radius);padding:24px;margin-bottom:20px}
.glow-card h3{margin-bottom:18px;font-size:15px;font-weight:600;display:flex;align-items:center;gap:8px;color:var(--text-primary);font-family:${theme.fonts.heading}}
.glow-card h3 i{color:var(--accent);font-size:14px}
.glow-card h4{font-size:13px;color:var(--text-secondary);font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:12px}

/* STATS */
.stats-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-bottom:20px}
.stat-card{background:var(--bg-secondary);border:1px solid var(--border-color);border-radius:8px;padding:16px;transition:var(--tr)}
.stat-card:hover{border-color:var(--accent)}
.stat-icon{font-size:20px;margin-bottom:8px}
.stat-value{font-size:24px;font-weight:700;color:var(--accent);margin-bottom:2px;font-family:${theme.fonts.mono}}
.stat-label{font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.8px;font-weight:600}

/* FORMS */
.form-group{margin-bottom:14px}
.form-group label{display:block;margin-bottom:6px;color:var(--text-secondary);font-size:12px;font-weight:600;letter-spacing:0.2px}
.form-input{width:100%;padding:9px 12px;background:var(--bg-primary);border:1px solid var(--border-color);border-radius:5px;color:var(--text-primary);font-size:13px;transition:var(--tr);outline:none;font-family:${theme.fonts.body}}
.form-input:focus{border-color:var(--accent);box-shadow:0 0 0 3px rgba(88,166,255,0.15)}
textarea.form-input{font-family:${theme.fonts.mono};font-size:12px;line-height:1.5;resize:vertical}
.form-input option{background:var(--bg-secondary);color:var(--text-primary)}

/* BUTTONS */
.btn-primary{display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:9px 16px;background:var(--accent);color:#fff;border:none;border-radius:6px;cursor:pointer;font-weight:600;font-size:13px;transition:var(--tr);font-family:${theme.fonts.body};text-decoration:none}
.btn-primary:hover{opacity:0.9;transform:translateY(-1px)}
.btn-primary:active{transform:translateY(0)}
.btn-primary.btn-success{background:var(--success)}
.btn-primary.btn-danger{background:var(--danger)}
.btn-primary.btn-warning{background:var(--warning);color:#000}
.btn-primary.btn-info{background:var(--info)}
.btn-action{display:inline-flex;align-items:center;gap:4px;padding:5px 10px;border-radius:5px;border:1px solid var(--border-color);cursor:pointer;font-size:11px;font-weight:500;transition:var(--tr);background:var(--bg-secondary);color:var(--text-secondary);margin:2px}
.btn-action:hover{border-color:var(--accent);color:var(--accent)}
.btn-action.danger{border-color:rgba(248,81,73,0.4);color:var(--danger)}
.btn-action.danger:hover{background:rgba(248,81,73,0.1)}
.btn-action.success{border-color:rgba(63,185,80,0.4);color:var(--success)}
.btn-action.success:hover{background:rgba(63,185,80,0.1)}

/* TABLES */
.table-container{overflow:auto;border-radius:6px;border:1px solid var(--border-color);background:var(--bg-secondary)}
.table-container table{width:100%;border-collapse:collapse;font-size:12.5px}
.table-container th{background:#1c2128;color:var(--text-secondary);padding:10px 12px;text-align:left;font-weight:600;text-transform:uppercase;font-size:10.5px;letter-spacing:0.6px;position:sticky;top:0;z-index:2;border-bottom:1px solid var(--border-color);white-space:nowrap}
.table-container td{padding:10px 12px;border-bottom:1px solid var(--border-color);color:var(--text-primary);vertical-align:middle}
.table-container tr:hover td{background:#1f2630}
.table-container tr:last-child td{border-bottom:none}
code{background:#1c2128;padding:2px 6px;border-radius:4px;color:#79c0ff;font-family:${theme.fonts.mono};font-size:11.5px;border:1px solid var(--border-color);word-break:break-all}

/* ENDPOINT CARDS */
.endpoint-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:16px}
.endpoint-card{background:var(--bg-secondary);border:1px solid var(--border-color);border-radius:8px;padding:20px;transition:var(--tr)}
.endpoint-card:hover{border-color:#484f58}
.ep-header{display:flex;align-items:center;gap:10px;margin-bottom:12px}
.ep-icon{font-size:18px;flex-shrink:0}
.ep-name{font-size:14px;font-weight:600;color:var(--text-primary);font-family:${theme.fonts.mono};word-break:break-all}
.ep-desc{font-size:12.5px;color:var(--text-secondary);margin-bottom:12px;line-height:1.5}
.ep-url{font-size:11.5px;color:#79c0ff;background:#0d1117;padding:10px 12px;border-radius:6px;font-family:${theme.fonts.mono};word-break:break-all;border:1px solid var(--border-color);margin-bottom:12px;line-height:1.6}
.json-preview{background:#0d1117;border:1px solid var(--border-color);border-radius:6px;padding:14px;max-height:280px;overflow-y:auto;position:relative}
.json-preview::before{content:'JSON Response';position:absolute;top:6px;right:10px;font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;font-weight:600}
.json-preview pre{font-family:${theme.fonts.mono};font-size:11.5px;color:#c9d1d9;margin:0;padding-top:14px;white-space:pre-wrap;word-break:break-word;line-height:1.6}
.json-key{color:#79c0ff}
.json-string{color:#a5d6ff}
.json-number{color:#ffa657}
.json-bool{color:#ff7b72}

/* LOGS */
.live-logs{background:#0d1117;border:1px solid var(--border-color);border-radius:6px;padding:14px;max-height:520px;overflow-y:auto;font-family:${theme.fonts.mono};font-size:11.5px}
.log-entry{padding:8px;border-bottom:1px solid var(--border-color);display:flex;gap:10px;flex-wrap:wrap;transition:var(--tr);align-items:center}
.log-entry:hover{background:#161b22}
.log-entry:last-child{border-bottom:none}
.log-time{color:var(--text-muted);font-size:10.5px}
.log-key{color:#79c0ff;font-weight:600}
.log-endpoint{color:#3fb950}
.log-ip{color:#58a6ff}

/* TOAST */
.toast{position:fixed;top:20px;right:20px;z-index:99999;padding:12px 18px;border-radius:6px;color:#fff;font-weight:500;font-size:13px;animation:slideIn .25s ease;max-width:400px;background:var(--bg-secondary);border:1px solid var(--border-color);box-shadow:0 8px 24px rgba(0,0,0,0.4)}
.toast.success{border-color:var(--success);color:var(--success)}
.toast.error{border-color:var(--danger);color:var(--danger)}
.toast.warning{border-color:var(--warning);color:var(--warning)}
.toast.info{border-color:var(--info);color:var(--info)}
@keyframes slideIn{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}

/* TABS */
.tabs{display:flex;gap:0;border-bottom:1px solid var(--border-color);margin-bottom:18px}
.tab{padding:9px 16px;cursor:pointer;font-size:12.5px;font-weight:500;color:var(--text-muted);border-bottom:2px solid transparent;transition:var(--tr);margin-bottom:-1px}
.tab:hover{color:var(--text-primary)}
.tab.active{color:var(--accent);border-bottom-color:var(--accent)}

/* SCOPE BOX */
.scope-box{display:flex;flex-wrap:wrap;gap:6px;padding:12px;background:var(--bg-primary);border-radius:5px;border:1px solid var(--border-color);max-height:280px;overflow-y:auto}
.scope-item{cursor:pointer;font-size:11.5px;display:inline-flex;align-items:center;gap:6px;padding:5px 10px;border-radius:4px;background:var(--bg-secondary);border:1px solid var(--border-color);color:var(--text-secondary);transition:var(--tr);user-select:none}
.scope-item:hover{border-color:var(--accent);color:var(--text-primary)}
.scope-item input[type=checkbox]{accent-color:var(--accent);margin:0}
.scope-item:has(input:checked){background:rgba(88,166,255,0.12);border-color:var(--accent);color:var(--accent)}

/* PROGRESS */
.progress-bar{height:6px;background:var(--bg-primary);border-radius:3px;overflow:hidden;margin-top:4px}
.progress-bar > div{height:100%;background:var(--accent);border-radius:3px;transition:width .3s}

/* PUBLIC */
.pub-nav{position:sticky;top:0;z-index:100;background:rgba(13,17,23,0.95);backdrop-filter:blur(12px);border-bottom:1px solid var(--border-color);padding:14px 28px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px}
.pub-brand{font-size:14px;font-weight:700;letter-spacing:0.5px;color:var(--text-primary);display:flex;align-items:center;gap:10px;font-family:${theme.fonts.heading}}
.pub-brand .logo{width:28px;height:28px;border-radius:6px;background:linear-gradient(135deg,var(--accent),var(--accent2));display:flex;align-items:center;justify-content:center;font-size:14px}
.pub-links{display:flex;gap:8px;align-items:center}
.pub-links a{color:var(--text-secondary);font-size:12.5px;font-weight:500;padding:7px 14px;border-radius:6px;transition:var(--tr);border:1px solid transparent}
.pub-links a:hover{color:var(--text-primary);border-color:var(--border-color);background:var(--bg-secondary)}
.pub-hero{text-align:center;padding:64px 24px 48px;position:relative;z-index:10;border-bottom:1px solid var(--border-color)}
.pub-hero h1{font-size:clamp(28px,5vw,42px);font-weight:700;font-family:${theme.fonts.heading};letter-spacing:-1px;margin-bottom:12px;background:linear-gradient(135deg,var(--text-primary),var(--accent));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.pub-hero p{color:var(--text-secondary);font-size:14px;max-width:600px;margin:0 auto;line-height:1.7}
.pub-hero .badges{display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-top:20px}
.pub-hero .badge{padding:5px 12px;border-radius:20px;font-size:11px;font-weight:600;background:var(--bg-secondary);border:1px solid var(--border-color);color:var(--text-secondary);display:inline-flex;align-items:center;gap:5px}
.pub-container{max-width:1280px;margin:0 auto;padding:32px 24px;position:relative;z-index:10}
.pub-footer{text-align:center;padding:32px 24px;border-top:1px solid var(--border-color);color:var(--text-muted);font-size:12px;position:relative;z-index:10}
.pub-footer a{color:var(--accent);font-weight:600}
.search-bar{position:relative;max-width:480px;margin:24px auto 0}
.search-bar input{width:100%;padding:11px 16px 11px 40px;background:var(--bg-secondary);border:1px solid var(--border-color);border-radius:8px;color:var(--text-primary);font-size:13px;outline:none;font-family:${theme.fonts.body}}
.search-bar input:focus{border-color:var(--accent);box-shadow:0 0 0 3px rgba(88,166,255,0.1)}
.search-bar i{position:absolute;left:14px;top:50%;transform:translateY(-50%);color:var(--text-muted);font-size:13px}

@media(max-width:768px){
  .sidebar{width:64px;padding:12px 0}
  .sidebar-header{padding:0 8px 12px}
  .sidebar-logo{font-size:16px;justify-content:center}
  .sidebar-logo span{display:none}
  .sidebar-subtitle{display:none}
  .sidebar-nav{padding:0 6px}
  .sidebar-nav a{justify-content:center;padding:10px;gap:0}
  .sidebar-nav a span{display:none}
  .main-content{margin-left:64px;padding:16px;max-width:calc(100vw - 64px)}
  .stats-grid{grid-template-columns:repeat(2,1fr)}
  .endpoint-grid{grid-template-columns:1fr}
}
</style>`;
}

// ============================================================
// LOGIN PAGE
// ============================================================
function renderLogin() {
  return `<!DOCTYPE html><html lang="en"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>BRONX V503 · Admin Login</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
${generateCSS()}
<style>
body{display:flex;align-items:center;justify-content:center;min-height:100vh}
.login-wrap{width:400px;max-width:92vw;position:relative;z-index:10}
.login-card{background:var(--bg-card);border:1px solid var(--border-color);border-radius:12px;padding:40px 32px}
.login-head{text-align:center;margin-bottom:32px}
.login-head .logo{width:56px;height:56px;border-radius:12px;background:linear-gradient(135deg,var(--accent),var(--accent2));display:inline-flex;align-items:center;justify-content:center;font-size:26px;margin-bottom:16px}
.login-head h1{font-size:22px;font-weight:700;color:var(--text-primary);font-family:${theme.fonts.heading};margin-bottom:4px}
.login-head p{color:var(--text-muted);font-size:12.5px;font-family:${theme.fonts.mono}}
.input-group{position:relative;margin-bottom:16px}
.input-group .icon{position:absolute;left:14px;top:50%;transform:translateY(-50%);color:var(--text-muted);font-size:13px}
.input-group input{width:100%;padding:12px 14px 12px 40px;background:var(--bg-primary);border:1px solid var(--border-color);border-radius:6px;color:var(--text-primary);font-size:13.5px;outline:none;font-family:${theme.fonts.body};transition:var(--tr)}
.input-group input:focus{border-color:var(--accent);box-shadow:0 0 0 3px rgba(88,166,255,0.12)}
.login-btn{width:100%;padding:12px;background:var(--accent);color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:13.5px;font-weight:600;transition:var(--tr);font-family:${theme.fonts.body};display:flex;align-items:center;justify-content:center;gap:8px}
.login-btn:hover{opacity:0.9}
.login-btn:disabled{opacity:0.6;cursor:not-allowed}
.msg{text-align:center;margin-top:16px;font-size:12.5px;font-weight:500;min-height:18px}
.login-foot{text-align:center;margin-top:24px;font-size:11px;color:var(--text-muted);font-family:${theme.fonts.mono}}
</style></head><body>
<div class="grid-bg"></div>
<div class="login-wrap">
<div class="login-card">
<div class="login-head">
<div class="logo">🛡️</div>
<h1>BRONX V503 PRO</h1>
<p>// ADMIN AUTHENTICATION</p>
</div>
<div class="input-group"><i class="fas fa-user icon"></i><input type="text" id="username" placeholder="Username" autocomplete="username"></div>
<div class="input-group"><i class="fas fa-lock icon"></i><input type="password" id="password" placeholder="Password" autocomplete="current-password"></div>
<button class="login-btn" id="loginBtn" onclick="doLogin()"><i class="fas fa-shield-halved"></i> AUTHENTICATE</button>
<div class="msg" id="msg"></div>
<div class="login-foot">SECURE · ENCRYPTED SESSION</div>
</div>
</div>
<script>
async function doLogin(){
  const u=document.getElementById('username').value.trim();
  const p=document.getElementById('password').value;
  const m=document.getElementById('msg');
  const b=document.getElementById('loginBtn');
  if(!u||!p){m.style.color='var(--warning)';m.textContent='⚠ Fill all fields';return}
  b.disabled=true; m.style.color='var(--info)'; m.innerHTML='<i class="fas fa-spinner fa-spin"></i> Authenticating...';
  try{
    const r=await fetch('${ADMIN_PATH}/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:u,password:p})});
    const d=await r.json();
    if(d.success){m.style.color='var(--success)';m.textContent='✓ '+d.message;setTimeout(()=>location.href=d.redirect,400)}
    else{m.style.color='var(--danger)';m.textContent='✗ '+d.error;b.disabled=false}
  }catch(e){m.style.color='var(--danger)';m.textContent='Connection error';b.disabled=false}
}
document.addEventListener('keydown',e=>{if(e.key==='Enter')doLogin()});
</script></body></html>`;
}

// ============================================================
// PUBLIC HOME
// ============================================================
function renderHome() {
  let cards = '';
  Object.entries(endpoints).forEach(([n, e]) => {
    const preview = endpointResponses[n]
      ? JSON.stringify(endpointResponses[n], null, 2)
      : JSON.stringify({ status: 'success', message: 'Response preview not configured yet — admin can set this in the admin panel.', endpoint: '/' + n, example_param: e.e }, null, 2);
    cards += `<div class="endpoint-card" data-search="${esc(n + ' ' + e.d)}">
      <div class="ep-header"><span class="ep-icon">${e.i}</span><div class="ep-name">/api/key-bronx/${esc(n)}</div></div>
      <div class="ep-desc">${esc(e.d)}</div>
      <div class="ep-url">GET /api/key-bronx/${n}?key=YOUR_KEY&${e.p}=${e.e}</div>
      <div class="json-preview"><pre>${esc(preview)}</pre></div>
    </div>`;
  });
  customAPIs.filter((a) => a.visible).forEach((a) => {
    const preview = endpointResponses[a.endpoint]
      ? JSON.stringify(endpointResponses[a.endpoint], null, 2)
      : JSON.stringify({ status: 'success', message: 'Response preview not configured yet — admin can set this.', endpoint: '/' + a.endpoint }, null, 2);
    cards += `<div class="endpoint-card" data-search="${esc(a.name + ' ' + a.endpoint)}">
      <div class="ep-header"><span class="ep-icon">🔧</span><div class="ep-name">/api/custom/${esc(a.endpoint)}</div></div>
      <div class="ep-desc">${esc(a.name)}</div>
      <div class="ep-url">GET /api/custom/${a.endpoint}?key=YOUR_KEY&${a.param}=${a.example || 'value'}</div>
      <div class="json-preview"><pre>${esc(preview)}</pre></div>
    </div>`;
  });

  const annHTML = announcement.enabled
    ? `<div style="padding:10px 20px;text-align:center;font-size:12.5px;background:rgba(88,166,255,0.12);color:var(--accent);border-bottom:1px solid var(--border-color);font-weight:500">📢 ${esc(announcement.text)}</div>`
    : '';
  const mainHTML = maintenance.enabled
    ? `<div style="position:fixed;inset:0;z-index:99999;background:var(--bg-primary);display:flex;align-items:center;justify-content:center;flex-direction:column;gap:16px;padding:40px;text-align:center">
        <div style="width:80px;height:80px;border-radius:20px;background:rgba(210,153,34,0.12);display:flex;align-items:center;justify-content:center;font-size:40px">🔧</div>
        <h1 style="font-family:${theme.fonts.heading};color:var(--warning);font-size:26px;letter-spacing:1px;font-weight:700">UNDER MAINTENANCE</h1>
        <p style="color:var(--text-secondary);font-size:13.5px;max-width:400px">${esc(maintenance.message)}</p>
      </div>`
    : '';

  return `<!DOCTYPE html><html lang="en"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>BRONX OSINT API · V503 PRO</title>
<meta name="description" content="Professional OSINT API platform. Fast, reliable, developer-friendly.">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
${generateCSS()}
</head><body>
<div class="grid-bg"></div>
${mainHTML}
${annHTML}
<nav class="pub-nav">
  <div class="pub-brand"><span class="logo">🛡️</span> BRONX OSINT <span style="color:var(--text-muted);font-weight:400;font-size:11px;font-family:${theme.fonts.mono}">v5.0.3</span></div>
  <div class="pub-links">
    <a href="/test"><i class="fas fa-heartbeat"></i> Status</a>
    <span style="padding:5px 12px;border-radius:20px;font-size:11px;font-weight:600;background:rgba(63,185,80,0.12);color:var(--success);border:1px solid rgba(63,185,80,0.3)">● ONLINE</span>
  </div>
</nav>
<header class="pub-hero">
  <h1>BRONX OSINT API</h1>
  <p>Professional-grade OSINT API platform. Fast responses, real-time monitoring, developer-friendly endpoints.</p>
  <div class="badges">
    <span class="badge"><i class="fas fa-bolt"></i> Fast</span>
    <span class="badge"><i class="fas fa-shield-halved"></i> Secured</span>
    <span class="badge"><i class="fas fa-code"></i> JSON API</span>
    <span class="badge"><i class="fas fa-infinity"></i> Reliable</span>
  </div>
  <div class="search-bar"><i class="fas fa-search"></i><input id="searchInput" placeholder="Search endpoints..."></div>
</header>
<div class="pub-container">
  <div class="endpoint-grid" id="endpointGrid">${cards}</div>
</div>
<footer class="pub-footer">Powered by <a href="#">${esc(globalConfig.developerName)}</a> · BRONX OSINT V503 PRO · © ${new Date().getFullYear()}</footer>
<script>
document.getElementById('searchInput').addEventListener('input',e=>{
  const q=e.target.value.toLowerCase();
  document.querySelectorAll('.endpoint-card').forEach(c=>{
    const s=(c.dataset.search||'').toLowerCase();
    c.style.display = s.includes(q) ? '' : 'none';
  });
});
</script>
</body></html>`;
}

// ============================================================
// ADMIN PANEL — FULL SPA
// ============================================================
function renderAdmin(token) {
  const stoken = esc(token);
  const keys = Object.entries(keyStorage)
    .filter(([k, d]) => !d._hardcoded && !d.hidden)
    .map(([k, d]) => ({
      key: k,
      name: d.name || '?',
      limit: d.unlimited ? '∞' : d.limit,
      used: d.used || 0,
      left: d.unlimited ? '∞' : Math.max(0, (d.limit || 0) - (d.used || 0)),
      dailyLimit: d.dailyLimit || 0,
      perSecondLimit: d.perSecondLimit || 0,
      expiry: d.expiryStr || 'LIFETIME',
      isExpired: d.expiry ? isKeyExpired(d.expiry) : false,
      scopes: d.scopes || [],
      cooldown: d.cooldown || 0,
      created: d.created || '',
      stopped: d.stopped || false,
      disabled: d.disabled || false,
      notes: d.notes || '',
      developerName: d.developerName || ''
    }));
  const apis = customAPIs;
  const scopeOpts = [...Object.keys(endpoints), 'custom:*', 'custom'];
  const scopeCheckboxes = (prefix) =>
    `<label class="scope-item"><input type="checkbox" value="*" ${prefix === 'g' ? 'checked' : ''}> <span>🌟 ALL ACCESS</span></label>` +
    scopeOpts.map((s) => `<label class="scope-item"><input type="checkbox" value="${s}"> <span>${s}</span></label>`).join('');

  return `<!DOCTYPE html><html lang="en"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>BRONX V503 · Admin</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
${generateCSS()}
</head><body>
<div class="grid-bg"></div>
<div class="admin-container">
<div class="sidebar">
  <div class="sidebar-header">
    <div class="sidebar-logo"><span>🛡️</span> BRONX</div>
    <div class="sidebar-subtitle">// V503 PRO ADMIN</div>
  </div>
  <ul class="sidebar-nav">
    <li><a class="active" data-sec="dashboard" onclick="nav('dashboard',this)"><i class="fas fa-chart-pie"></i><span>Dashboard</span></a></li>
    <li><a data-sec="generate" onclick="nav('generate',this)"><i class="fas fa-plus-circle"></i><span>Generate Key</span></a></li>
    <li><a data-sec="keys" onclick="nav('keys',this)"><i class="fas fa-key"></i><span>All Keys</span></a></li>
    <li><a data-sec="endpoints" onclick="nav('endpoints',this)"><i class="fas fa-list"></i><span>Endpoints</span></a></li>
    <li><a data-sec="responses" onclick="nav('responses',this)"><i class="fas fa-code"></i><span>Edit Responses</span></a></li>
    <li><a data-sec="response-settings" onclick="nav('response-settings',this)"><i class="fas fa-sliders-h"></i><span>Response Settings</span></a></li>
    <li><a data-sec="monitor" onclick="nav('monitor',this)"><i class="fas fa-desktop"></i><span>Live Monitor</span></a></li>
    <li><a data-sec="stats" onclick="nav('stats',this)"><i class="fas fa-chart-bar"></i><span>Statistics</span></a></li>
    <li><a data-sec="theme" onclick="nav('theme',this)"><i class="fas fa-palette"></i><span>Theme</span></a></li>
    <li><a data-sec="apis" onclick="nav('apis',this)"><i class="fas fa-plug"></i><span>Custom APIs</span></a></li>
    <li><a data-sec="addapi" onclick="nav('addapi',this)"><i class="fas fa-plus"></i><span>Add API</span></a></li>
    <li><a data-sec="scopes" onclick="nav('scopes',this)"><i class="fas fa-crosshairs"></i><span>Update Scopes</span></a></li>
    <li><a data-sec="protect" onclick="nav('protect',this)"><i class="fas fa-shield-alt"></i><span>Data Protection</span></a></li>
    <li><a data-sec="ddos" onclick="nav('ddos',this)"><i class="fas fa-shield-virus"></i><span>DDoS Config</span></a></li>
    <li><a data-sec="bans" onclick="nav('bans',this)"><i class="fas fa-ban"></i><span>Bans Manager</span></a></li>
    <li><a data-sec="devices" onclick="nav('devices',this)"><i class="fas fa-laptop"></i><span>Devices</span></a></li>
    <li><a data-sec="backup" onclick="nav('backup',this)"><i class="fas fa-database"></i><span>Backup / Restore</span></a></li>
    <li><a data-sec="audit" onclick="nav('audit',this)"><i class="fas fa-clipboard-list"></i><span>Audit Log</span></a></li>
    <li><a data-sec="settings" onclick="nav('settings',this)"><i class="fas fa-cog"></i><span>Settings</span></a></li>
  </ul>
</div>
<div class="main-content">
  <div class="stats-grid">
    <div class="stat-card"><div class="stat-icon">🔑</div><div class="stat-value" id="sKeys">${keys.length}</div><div class="stat-label">Keys</div></div>
    <div class="stat-card"><div class="stat-icon">📊</div><div class="stat-value" id="sToday">-</div><div class="stat-label">Today</div></div>
    <div class="stat-card"><div class="stat-icon">📈</div><div class="stat-value" id="sTotal">-</div><div class="stat-label">Total</div></div>
    <div class="stat-card"><div class="stat-icon">🚫</div><div class="stat-value" id="sBans">-</div><div class="stat-label">Bans</div></div>
    <div class="stat-card"><div class="stat-icon">📱</div><div class="stat-value" id="sDevices">-</div><div class="stat-label">Devices</div></div>
    <div class="stat-card"><div class="stat-icon">🔧</div><div class="stat-value" id="sAPIs">${apis.length}</div><div class="stat-label">Custom APIs</div></div>
  </div>

  <!-- DASHBOARD -->
  <div class="glow-card" id="sec-dashboard">
    <h3><i class="fas fa-fire"></i> Overview</h3>
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-value" id="dToday">-</div><div class="stat-label">Today Requests</div></div>
      <div class="stat-card"><div class="stat-value" id="dTotal">-</div><div class="stat-label">Total Requests</div></div>
      <div class="stat-card"><div class="stat-value" id="dTopKey">-</div><div class="stat-label">Top Key</div></div>
      <div class="stat-card"><div class="stat-value" id="dTopEp">-</div><div class="stat-label">Top Endpoint</div></div>
    </div>
    <h4>Top Keys</h4>
    <div class="table-container"><table><thead><tr><th>Key</th><th>Requests</th></tr></thead><tbody id="topKeysBody"><tr><td colspan="2" style="text-align:center;color:var(--text-muted)">Loading...</td></tr></tbody></table></div>
  </div>

  <!-- GENERATE -->
  <div class="glow-card" id="sec-generate" style="display:none">
    <h3><i class="fas fa-plus-circle"></i> Generate New Key</h3>
    <div class="form-group"><label>Key ID (leave blank for random)</label><input class="form-input" id="gk" placeholder="e.g. MY_CLIENT_KEY"></div>
    <div class="form-group"><label>Owner Name *</label><input class="form-input" id="go" placeholder="Client Name"></div>
    <div class="form-group"><label>Custom Developer Name for This Key (Optional — overrides global)</label><input class="form-input" id="gdev" placeholder="e.g. @CUSTOM_NAME (leave blank for global)"></div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px">
      <div class="form-group"><label>Total Limit</label><input class="form-input" id="gl" type="number" value="100"></div>
      <div class="form-group"><label>Daily (0=∞)</label><input class="form-input" id="gdl" type="number" value="0"></div>
      <div class="form-group"><label>Per Sec (0=∞)</label><input class="form-input" id="gpsl" type="number" value="0"></div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px">
      <div class="form-group"><label>Cooldown (s)</label><input class="form-input" id="gc" type="number" value="0"></div>
      <div class="form-group"><label>Days Valid</label><input class="form-input" id="gd" type="number" value="30"></div>
    </div>
    <div class="form-group"><label>Notes</label><input class="form-input" id="gnotes" placeholder="Optional notes"></div>
    <div class="form-group"><label>Scopes</label><div class="scope-box" id="scopeGenerate">${scopeCheckboxes('g')}</div></div>
    <button class="btn-primary" style="width:100%" onclick="generateKey()"><i class="fas fa-rocket"></i> GENERATE KEY</button>
  </div>

  <!-- KEYS -->
  <div class="glow-card" id="sec-keys" style="display:none">
    <h3><i class="fas fa-key"></i> All Keys (<span id="keysCount">${keys.length}</span>)</h3>
    <div style="display:flex;gap:10px;margin-bottom:14px;flex-wrap:wrap">
      <input class="form-input" id="keysFilter" placeholder="🔍 Filter by key or owner..." style="flex:1;min-width:200px" oninput="filterKeys()">
    </div>
    <div class="table-container" style="max-height:650px">
      <table>
        <thead><tr>
          <th>KEY</th><th>OWNER</th><th>LIMIT</th><th>USED</th><th>LEFT</th><th>EXPIRY</th><th>DEV NAME</th><th>STATUS</th><th>ACTIONS</th>
        </tr></thead>
        <tbody id="keysBody"></tbody>
      </table>
    </div>
  </div>

  <!-- ENDPOINTS -->
  <div class="glow-card" id="sec-endpoints" style="display:none">
    <h3><i class="fas fa-list"></i> Endpoints (${Object.keys(endpoints).length})</h3>
    <div class="endpoint-grid">
      ${Object.entries(endpoints).map(([n, e]) => `<div class="endpoint-card">
        <div class="ep-header"><span class="ep-icon">${e.i}</span><div class="ep-name">/${esc(n)}</div></div>
        <div class="ep-desc">${esc(e.d)}</div>
        <div class="ep-url">GET /api/key-bronx/${n}?key=YOUR_KEY&${e.p}=${e.e}</div>
      </div>`).join('')}
    </div>
  </div>

  <!-- EDIT RESPONSES -->
  <div class="glow-card" id="sec-responses" style="display:none">
    <h3><i class="fas fa-code"></i> Edit Endpoint Responses</h3>
    <p style="color:var(--text-secondary);font-size:12.5px;margin-bottom:14px">Yahan jo JSON set karoge wahi public dashboard aur actual API response mein dikhega.</p>
    <div class="form-group"><label>Endpoint</label>
      <select class="form-input" id="respEndpoint" onchange="loadResp()">
        ${Object.keys(endpoints).map((e) => `<option value="${e}">${endpoints[e].d} (/${e})</option>`).join('')}
        ${apis.map((a) => `<option value="${esc(a.endpoint)}">${esc(a.name)} (/${esc(a.endpoint)})</option>`).join('')}
      </select>
    </div>
    <div class="form-group"><label>Response JSON (leave empty to reset to default)</label>
      <textarea class="form-input" id="respData" rows="14" placeholder='{"status":"success","data":{"name":"John"}}'></textarea>
    </div>
    <button class="btn-primary" style="width:100%" onclick="saveResp()"><i class="fas fa-save"></i> SAVE RESPONSE</button>
  </div>

  <!-- RESPONSE SETTINGS -->
  <div class="glow-card" id="sec-response-settings" style="display:none">
    <h3><i class="fas fa-sliders-h"></i> Global Response Settings</h3>
    <div class="form-group"><label>Global Developer Name</label>
      <input class="form-input" id="rsDevName" value="${esc(globalConfig.developerName)}" placeholder="@BRONX_ULTRA">
    </div>
    <div class="form-group"><label>Hidden Fields (comma separated — removed from every response)</label>
      <textarea class="form-input" id="rsHidden" rows="3">${esc(globalConfig.hiddenFields)}</textarea>
    </div>
    <h4 style="margin-top:22px">Custom Error Messages (plain text, emoji allowed)</h4>
    <div class="form-group"><label>Key Not Found</label><input class="form-input" id="msgKeyNotFound" value="${esc(customMessages.keyNotFound)}"></div>
    <div class="form-group"><label>Limit Reached ({used}/{limit} placeholders)</label><input class="form-input" id="msgLimitReached" value="${esc(customMessages.limitReached)}"></div>
    <div class="form-group"><label>Key Stopped</label><input class="form-input" id="msgKeyStopped" value="${esc(customMessages.keyStopped)}"></div>
    <div class="form-group"><label>Key Disabled</label><input class="form-input" id="msgKeyDisabled" value="${esc(customMessages.keyDisabled)}"></div>
    <div class="form-group"><label>Key Expired ({date} placeholder)</label><input class="form-input" id="msgKeyExpired" value="${esc(customMessages.keyExpired)}"></div>
    <div class="form-group"><label>Missing Key</label><input class="form-input" id="msgMissingKey" value="${esc(customMessages.missingKey)}"></div>
    <div class="form-group"><label>Scope Denied</label><input class="form-input" id="msgScopeDenied" value="${esc(customMessages.scopeDenied)}"></div>
    <button class="btn-primary" style="width:100%" onclick="saveResponseSettings()"><i class="fas fa-save"></i> SAVE ALL SETTINGS</button>
  </div>

  <!-- MONITOR -->
  <div class="glow-card" id="sec-monitor" style="display:none">
    <h3><i class="fas fa-desktop"></i> Live Monitor</h3>
    <div style="display:flex;gap:10px;margin-bottom:14px;flex-wrap:wrap">
      <input class="form-input" id="monitorFilter" placeholder="🔍 Filter" style="flex:1;min-width:180px" oninput="renderMonitor()">
      <button class="btn-primary" onclick="loadMonitor()"><i class="fas fa-sync"></i> Refresh</button>
    </div>
    <div class="live-logs" id="monitorLogs"><div style="text-align:center;color:var(--text-muted);padding:20px">Loading...</div></div>
  </div>

  <!-- STATS -->
  <div class="glow-card" id="sec-stats" style="display:none">
    <h3><i class="fas fa-chart-bar"></i> Statistics</h3>
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-value" id="stTotal">-</div><div class="stat-label">Total</div></div>
      <div class="stat-card"><div class="stat-value" id="stToday">-</div><div class="stat-label">Today</div></div>
    </div>
    <h4>Top Endpoints</h4>
    <div class="table-container"><table><thead><tr><th>Endpoint</th><th>Requests</th></tr></thead><tbody id="topEpBody"><tr><td colspan="2" style="text-align:center;color:var(--text-muted)">Loading...</td></tr></tbody></table></div>
  </div>

  <!-- THEME -->
  <div class="glow-card" id="sec-theme" style="display:none">
    <h3><i class="fas fa-palette"></i> Theme Presets</h3>
    <div class="endpoint-grid">
      ${Object.keys(PRESETS).map((name) => `<div class="endpoint-card" style="cursor:pointer" onclick="applyTheme('${name}')">
        <div style="height:50px;border-radius:6px;margin-bottom:12px;background:linear-gradient(135deg,${PRESETS[name].accent},${PRESETS[name].accent2})"></div>
        <div style="font-weight:600;color:var(--text-primary)">${name}</div>
      </div>`).join('')}
    </div>
  </div>

  <!-- CUSTOM APIS -->
  <div class="glow-card" id="sec-apis" style="display:none">
    <h3><i class="fas fa-plug"></i> Custom APIs (${apis.length})</h3>
    <div class="table-container" style="max-height:520px">
      <table><thead><tr><th>ID</th><th>Name</th><th>Endpoint</th><th>Param</th><th>Visible</th><th>Actions</th></tr></thead>
      <tbody>${apis.map((a) => `<tr>
        <td>${a.id}</td>
        <td>${esc(a.name)}</td>
        <td><code>${esc(a.endpoint)}</code></td>
        <td>${esc(a.param)}</td>
        <td>${a.visible ? '✅' : '❌'}</td>
        <td>
          <button class="btn-action" onclick="toggleAPI(${a.id})">Toggle</button>
          <button class="btn-action danger" onclick="deleteAPI(${a.id})">Delete</button>
        </td>
      </tr>`).join('')}</tbody></table>
    </div>
  </div>

  <!-- ADD API -->
  <div class="glow-card" id="sec-addapi" style="display:none">
    <h3><i class="fas fa-plus"></i> Add Custom API</h3>
    <div class="form-group"><label>Name *</label><input class="form-input" id="aName" placeholder="My API"></div>
    <div class="form-group"><label>Endpoint * (lowercase, no spaces)</label><input class="form-input" id="aEndpoint" placeholder="my-api"></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <div class="form-group"><label>Param Name</label><input class="form-input" id="aParam" value="num"></div>
      <div class="form-group"><label>Example Value</label><input class="form-input" id="aExample" placeholder="9876543210"></div>
    </div>
    <div class="form-group"><label>Real API URL — use {param} as placeholder</label><input class="form-input" id="aRealURL" placeholder="https://api.example.com?number={param}"></div>
    <button class="btn-primary" style="width:100%" onclick="addAPI()"><i class="fas fa-plus"></i> ADD API</button>
  </div>

  <!-- UPDATE SCOPES -->
  <div class="glow-card" id="sec-scopes" style="display:none">
    <h3><i class="fas fa-crosshairs"></i> Update Key Scopes</h3>
    <div class="form-group"><label>Key Name</label><input class="form-input" id="upKeyName" placeholder="Enter exact key"></div>
    <div class="form-group"><label>Scopes</label><div class="scope-box" id="scopeUpdate">${scopeCheckboxes('u')}</div></div>
    <button class="btn-primary" style="width:100%" onclick="updateScopes()"><i class="fas fa-save"></i> UPDATE SCOPES</button>
  </div>

  <!-- PROTECTION -->
  <div class="glow-card" id="sec-protect" style="display:none">
    <h3><i class="fas fa-shield-alt"></i> Data Protection</h3>
    <div class="form-group"><label>Value to Protect (e.g. phone number)</label><input class="form-input" id="protValue" placeholder="9876543210"></div>
    <button class="btn-primary" style="width:100%" onclick="addProtection()"><i class="fas fa-lock"></i> ADD</button>
    <h4 style="margin-top:20px">Protected Values</h4>
    <div class="table-container"><table><thead><tr><th>Value</th><th>Action</th></tr></thead><tbody id="protBody"></tbody></table></div>
  </div>

  <!-- DDOS -->
  <div class="glow-card" id="sec-ddos" style="display:none">
    <h3><i class="fas fa-shield-virus"></i> DDoS Protection Config</h3>
    <div class="form-group"><label>Mode</label>
      <select class="form-input" id="ddosMode">
        <option value="off" ${ddosConfig.mode === 'off' ? 'selected' : ''}>🔴 Off</option>
        <option value="smart" ${ddosConfig.mode === 'smart' ? 'selected' : ''}>🟢 Smart (Recommended)</option>
        <option value="strict" ${ddosConfig.mode === 'strict' ? 'selected' : ''}>🟠 Strict (70% stricter)</option>
      </select>
    </div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px">
      <div class="form-group"><label>IP Burst/10s</label><input class="form-input" id="dIP10" type="number" value="${ddosConfig.ip.burst10s}"></div>
      <div class="form-group"><label>IP/Minute</label><input class="form-input" id="dIP1M" type="number" value="${ddosConfig.ip.perMinute}"></div>
      <div class="form-group"><label>IP/Hour</label><input class="form-input" id="dIP1H" type="number" value="${ddosConfig.ip.perHour}"></div>
    </div>
    <button class="btn-primary" style="width:100%" onclick="saveDDOS()"><i class="fas fa-save"></i> SAVE</button>
    <button class="btn-primary btn-warning" style="width:100%;margin-top:10px" onclick="clearStrikes()"><i class="fas fa-eraser"></i> CLEAR ALL STRIKES</button>
  </div>

  <!-- BANS -->
  <div class="glow-card" id="sec-bans" style="display:none">
    <h3><i class="fas fa-ban"></i> Bans Manager</h3>
    <div style="display:grid;grid-template-columns:1fr 1fr auto;gap:10px;margin-bottom:16px">
      <select class="form-input" id="banType"><option value="ip">IP</option><option value="device">Device</option><option value="key">Key</option></select>
      <input class="form-input" id="banId" placeholder="Value to ban">
      <button class="btn-primary btn-danger" onclick="manualBan()"><i class="fas fa-ban"></i> BAN</button>
    </div>
    <h4>Banned IPs</h4>
    <div class="table-container"><table><thead><tr><th>IP</th><th>Reason</th><th>Until</th><th>Actions</th></tr></thead><tbody id="banIPBody"></tbody></table></div>
    <button class="btn-primary btn-warning" style="width:100%;margin-top:14px" onclick="unbanAll()"><i class="fas fa-unlock"></i> UNBAN ALL</button>
  </div>

  <!-- DEVICES -->
  <div class="glow-card" id="sec-devices" style="display:none">
    <h3><i class="fas fa-laptop"></i> Connected Devices</h3>
    <div class="table-container" style="max-height:600px">
      <table><thead><tr><th>Device ID</th><th>Type</th><th>OS</th><th>Requests</th><th>Last Seen</th><th>Banned</th></tr></thead>
      <tbody id="devicesBody"><tr><td colspan="6" style="text-align:center;color:var(--text-muted)">Loading...</td></tr></tbody></table>
    </div>
  </div>

  <!-- BACKUP -->
  <div class="glow-card" id="sec-backup" style="display:none">
    <h3><i class="fas fa-database"></i> Backup / Restore</h3>
    <h4>Download Full Backup</h4>
    <p style="color:var(--text-secondary);font-size:12.5px;margin-bottom:12px">Ye JSON me pura data (keys + APIs + settings) download karega.</p>
    <button class="btn-primary btn-success" style="width:100%;margin-bottom:24px" onclick="downloadBackup()"><i class="fas fa-download"></i> DOWNLOAD FULL BACKUP (.JSON)</button>
    <h4>Restore From JSON</h4>
    <div style="display:flex;gap:10px;margin-bottom:12px;flex-wrap:wrap">
      <button class="btn-primary" onclick="document.getElementById('restoreFile').click()"><i class="fas fa-upload"></i> Choose File</button>
      <input type="file" id="restoreFile" accept=".json" style="display:none" onchange="handleRestoreFile(this)">
    </div>
    <div class="form-group"><label>Or Paste JSON Manually</label>
      <textarea class="form-input" id="restoreJson" rows="10" placeholder='{"keys":{},"apis":[]...}'></textarea>
    </div>
    <button class="btn-primary btn-warning" style="width:100%" onclick="restoreData()"><i class="fas fa-upload"></i> RESTORE FROM PASTE</button>
  </div>

  <!-- AUDIT -->
  <div class="glow-card" id="sec-audit" style="display:none">
    <h3><i class="fas fa-clipboard-list"></i> Audit Log</h3>
    <div class="table-container" style="max-height:500px">
      <table><thead><tr><th>Time</th><th>User</th><th>Action</th><th>Details</th></tr></thead><tbody id="auditBody"></tbody></table>
    </div>
  </div>

  <!-- SETTINGS -->
  <div class="glow-card" id="sec-settings" style="display:none">
    <h3><i class="fas fa-cog"></i> Settings</h3>
    <div style="display:grid;gap:10px">
      <button class="btn-primary btn-warning" style="width:100%" onclick="action('/reset-all','Reset all key usage?')"><i class="fas fa-sync-alt"></i> RESET ALL USAGE</button>
      <button class="btn-primary btn-danger" style="width:100%" onclick="action('/clear-logs','Clear all logs?')"><i class="fas fa-trash"></i> CLEAR ALL LOGS</button>
      <button class="btn-primary btn-warning" style="width:100%" onclick="action('/unban-all','Unban everything?')"><i class="fas fa-unlock"></i> UNBAN ALL</button>
      <button class="btn-primary btn-warning" style="width:100%" onclick="clearStrikes()"><i class="fas fa-eraser"></i> CLEAR ALL STRIKES</button>
    </div>
  </div>
</div>
</div>

<script>
const TOKEN='${stoken}';
const ADMIN_PATH='${ADMIN_PATH}';
const INITIAL_KEYS=${JSON.stringify(keys)};
let CURRENT_KEYS=INITIAL_KEYS.slice();
let CURRENT_APIS=${JSON.stringify(apis)};

function toast(msg, type='success'){
  const t=document.createElement('div');
  t.className='toast '+type;
  t.textContent=msg;
  document.body.appendChild(t);
  setTimeout(()=>t.remove(),3200);
}
async function api(path, body){
  const r=await fetch(ADMIN_PATH+path, {
    method:'POST',
    headers:{'Content-Type':'application/json','x-admin-token':TOKEN},
    body:JSON.stringify(body||{})
  });
  return r.json();
}
async function apiGet(path){
  const r=await fetch(ADMIN_PATH+path, {headers:{'x-admin-token':TOKEN}});
  return r.json();
}

function nav(name, el){
  document.querySelectorAll('[id^="sec-"]').forEach(s=>s.style.display='none');
  const sec=document.getElementById('sec-'+name);
  if(sec) sec.style.display='block';
  document.querySelectorAll('.sidebar-nav a').forEach(a=>a.classList.remove('active'));
  if(el) el.classList.add('active');
  if(name==='dashboard') loadDashboard();
  if(name==='keys') renderKeys();
  if(name==='monitor') loadMonitor();
  if(name==='stats') loadStats();
  if(name==='bans') loadBans();
  if(name==='devices') loadDevices();
  if(name==='audit') loadAudit();
  if(name==='protect') loadProtection();
  if(name==='responses') loadResp();
}

// DASHBOARD
async function loadDashboard(){
  try{
    const s=await apiGet('/stats');
    document.getElementById('sToday').textContent=s.todayRequests||0;
    document.getElementById('sTotal').textContent=s.totalRequests||0;
    document.getElementById('dToday').textContent=s.todayRequests||0;
    document.getElementById('dTotal').textContent=s.totalRequests||0;
    const topK=s.topKeys||[];
    document.getElementById('dTopKey').textContent=topK[0]?.k?.substring(0,10)||'-';
    const topE=s.topEndpoints||[];
    document.getElementById('dTopEp').textContent=topE[0]?.k||'-';
    document.getElementById('topKeysBody').innerHTML=topK.length?topK.map(r=>`<tr><td><code>${r.k}</code></td><td>${r.v}</td></tr>`).join(''):'<tr><td colspan="2" style="text-align:center;color:var(--text-muted)">No data</td></tr>';
    const b=await apiGet('/bans');
    document.getElementById('sBans').textContent=(b.ip?.length||0)+(b.device?.length||0)+(b.key?.length||0);
    const d=await apiGet('/devices');
    document.getElementById('sDevices').textContent=d.total||0;
  }catch(e){console.error(e)}
}

// GENERATE
async function generateKey(){
  const scopes=[...document.querySelectorAll('#scopeGenerate input:checked')].map(i=>i.value);
  const body={
    keyName:document.getElementById('gk').value.trim(),
    keyOwner:document.getElementById('go').value.trim(),
    developerName:document.getElementById('gdev').value.trim(),
    limit:document.getElementById('gl').value,
    dailyLimit:document.getElementById('gdl').value,
    perSecondLimit:document.getElementById('gpsl').value,
    cooldown:document.getElementById('gc').value,
    days:document.getElementById('gd').value,
    notes:document.getElementById('gnotes').value,
    scopes:scopes.length?scopes:['number']
  };
  if(!body.keyOwner){toast('Owner name required','error');return}
  const r=await api('/generate-key', body);
  if(r.success){toast('✓ '+r.message);setTimeout(()=>location.reload(),800)}
  else toast(r.e||'Error','error');
}

// KEYS TABLE
function renderKeys(){
  const filter=(document.getElementById('keysFilter')?.value||'').toLowerCase();
  const filtered=CURRENT_KEYS.filter(k=>!filter||k.key.toLowerCase().includes(filter)||k.name.toLowerCase().includes(filter));
  const b=document.getElementById('keysBody');
  if(!b)return;
  if(!filtered.length){b.innerHTML='<tr><td colspan="9" style="text-align:center;color:var(--text-muted);padding:20px">No keys</td></tr>';return}
  b.innerHTML=filtered.map(k=>`<tr>
    <td><code style="font-size:11px">${esc(k.key)}</code></td>
    <td>${esc(k.name)}</td>
    <td>${k.limit}</td>
    <td>${k.used}</td>
    <td>${k.left}</td>
    <td style="color:${k.isExpired?'var(--danger)':'var(--text-primary)'}">${esc(k.expiry)}</td>
    <td>${esc(k.developerName||'—')}</td>
    <td>${k.stopped?'<span style="color:var(--warning)">⏸ STOPPED</span>':k.disabled?'<span style="color:var(--danger)">🚫 DISABLED</span>':'<span style="color:var(--success)">● ACTIVE</span>'}</td>
    <td>
      <button class="btn-action" onclick="editKey('${esc(k.key)}')">Edit</button>
      <button class="btn-action" onclick="resetKey('${esc(k.key)}')">Reset</button>
      <button class="btn-action ${k.stopped?'success':'danger'}" onclick="toggleStop('${esc(k.key)}')">${k.stopped?'Resume':'Stop'}</button>
      <button class="btn-action ${k.disabled?'success':'danger'}" onclick="toggleDisable('${esc(k.key)}')">${k.disabled?'Enable':'Disable'}</button>
      <button class="btn-action danger" onclick="deleteKey('${esc(k.key)}')">Del</button>
    </td>
  </tr>`).join('');
}
function filterKeys(){renderKeys()}
async function resetKey(k){
  const r=await api('/reset-key-usage',{keyName:k});
  if(r.success){toast('✓ Reset');setTimeout(()=>location.reload(),500)}
}
async function toggleStop(k){
  const r=await api('/stop-key',{keyName:k});
  if(r.success){toast('✓ Updated');setTimeout(()=>location.reload(),500)}
}
async function toggleDisable(k){
  const r=await api('/disable-key',{keyName:k});
  if(r.success){toast('✓ Updated');setTimeout(()=>location.reload(),500)}
}
async function deleteKey(k){
  if(!confirm('Delete key '+k+'?'))return;
  const r=await api('/delete-key',{keyName:k});
  if(r.success){toast('✓ Deleted');setTimeout(()=>location.reload(),500)}
}
function editKey(k){
  const kd=CURRENT_KEYS.find(x=>x.key===k);
  if(!kd)return;
  const newOwner=prompt('Owner name:',kd.name);if(newOwner===null)return;
  const newLimit=prompt('Limit:',kd.limit);if(newLimit===null)return;
  const newDev=prompt('Custom developer name (blank = use global):',kd.developerName||'');if(newDev===null)return;
  api('/edit-key',{keyName:k,newOwner,newLimit,newDeveloperName:newDev}).then(r=>{
    if(r.success){toast('✓ Updated');setTimeout(()=>location.reload(),500)}
    else toast(r.e||'Error','error');
  });
}

// RESPONSES
async function loadResp(){
  const ep=document.getElementById('respEndpoint').value;
  if(!ep)return;
  const r=await apiGet('/get-endpoint-response?endpoint='+encodeURIComponent(ep));
  document.getElementById('respData').value=r.data?JSON.stringify(r.data,null,2):'';
}
async function saveResp(){
  const endpoint=document.getElementById('respEndpoint').value;
  const responseData=document.getElementById('respData').value;
  const r=await api('/update-endpoint-response',{endpoint, responseData});
  if(r.success)toast('✓ Saved');
  else toast(r.e||'Error','error');
}

// RESPONSE SETTINGS
async function saveResponseSettings(){
  const body={
    developerName:document.getElementById('rsDevName').value,
    hiddenFields:document.getElementById('rsHidden').value,
    messages:{
      keyNotFound:document.getElementById('msgKeyNotFound').value,
      limitReached:document.getElementById('msgLimitReached').value,
      keyStopped:document.getElementById('msgKeyStopped').value,
      keyDisabled:document.getElementById('msgKeyDisabled').value,
      keyExpired:document.getElementById('msgKeyExpired').value,
      missingKey:document.getElementById('msgMissingKey').value,
      scopeDenied:document.getElementById('msgScopeDenied').value
    }
  };
  const r=await api('/update-response-settings',body);
  if(r.success)toast('✓ Settings saved');
}

// MONITOR
let MONITOR_DATA=[];
async function loadMonitor(){
  const r=await apiGet('/monitor-logs');
  MONITOR_DATA=r.logs||[];
  renderMonitor();
}
function renderMonitor(){
  const f=(document.getElementById('monitorFilter')?.value||'').toLowerCase();
  const el=document.getElementById('monitorLogs');
  if(!el)return;
  const filtered=MONITOR_DATA.filter(l=>!f||JSON.stringify(l).toLowerCase().includes(f));
  if(!filtered.length){el.innerHTML='<div style="text-align:center;color:var(--text-muted);padding:20px">No logs</div>';return}
  el.innerHTML=filtered.slice().reverse().map(l=>`<div class="log-entry">
    <span class="log-time">${esc(l.timestamp)}</span>
    <span class="log-key">${esc(l.key)}</span>
    <span class="log-endpoint">/${esc(l.endpoint)}</span>
    <span class="log-ip">${esc(l.ip)}</span>
    <span style="color:var(--text-muted)">${esc(l.deviceIcon||'')} ${esc(l.browser||'')}</span>
  </div>`).join('');
}

// STATS
async function loadStats(){
  const s=await apiGet('/stats');
  document.getElementById('stTotal').textContent=s.totalRequests||0;
  document.getElementById('stToday').textContent=s.todayRequests||0;
  const topE=s.topEndpoints||[];
  document.getElementById('topEpBody').innerHTML=topE.length?topE.map(r=>`<tr><td><code>/${esc(r.k)}</code></td><td>${r.v}</td></tr>`).join(''):'<tr><td colspan="2" style="text-align:center;color:var(--text-muted)">No data</td></tr>';
}

// THEME
async function applyTheme(name){
  const r=await api('/theme/preset',{preset:name});
  if(r.success){toast('✓ Theme applied');setTimeout(()=>location.reload(),600)}
}

// CUSTOM APIS
async function addAPI(){
  const body={
    name:document.getElementById('aName').value.trim(),
    endpoint:document.getElementById('aEndpoint').value.trim(),
    param:document.getElementById('aParam').value.trim(),
    example:document.getElementById('aExample').value.trim(),
    realAPI:document.getElementById('aRealURL').value.trim()
  };
  if(!body.name||!body.endpoint){toast('Name & endpoint required','error');return}
  const r=await api('/add-api',body);
  if(r.success){toast('✓ API added');setTimeout(()=>location.reload(),600)}
  else toast(r.e||'Error','error');
}
async function toggleAPI(id){
  const r=await api('/toggle-api',{id});
  if(r.success){toast('✓ Toggled');setTimeout(()=>location.reload(),500)}
}
async function deleteAPI(id){
  if(!confirm('Delete this API?'))return;
  const r=await api('/delete-api',{id});
  if(r.success){toast('✓ Deleted');setTimeout(()=>location.reload(),500)}
}

// SCOPES
async function updateScopes(){
  const keyName=document.getElementById('upKeyName').value.trim();
  if(!keyName){toast('Key required','error');return}
  const scopes=[...document.querySelectorAll('#scopeUpdate input:checked')].map(i=>i.value);
  if(!scopes.length){toast('Select at least one scope','error');return}
  const r=await api('/update-scopes',{keyName, scopes});
  if(r.success)toast('✓ Updated');
  else toast(r.e||'Error','error');
}

// PROTECTION
async function loadProtection(){
  const r=await apiGet('/bans'); // dummy, we just list protectedData via backup
  const backup=await apiGet('/backup');
  const prot=backup.protected||{};
  const body=document.getElementById('protBody');
  body.innerHTML=Object.keys(prot).length?Object.keys(prot).map(v=>`<tr><td><code>${esc(v)}</code></td><td><button class="btn-action danger" onclick="removeProtection('${esc(v)}')">Remove</button></td></tr>`).join(''):'<tr><td colspan="2" style="text-align:center;color:var(--text-muted)">None</td></tr>';
}
async function addProtection(){
  const v=document.getElementById('protValue').value.trim();
  if(!v){toast('Value required','error');return}
  const r=await api('/add-protection',{value:v});
  if(r.success){toast('✓ Protected');loadProtection()}
}
async function removeProtection(v){
  const r=await api('/remove-protection',{value:v});
  if(r.success){toast('✓ Removed');loadProtection()}
}

// DDOS
async function saveDDOS(){
  const body={
    mode:document.getElementById('ddosMode').value,
    ip:{
      burst10s:document.getElementById('dIP10').value,
      perMinute:document.getElementById('dIP1M').value,
      perHour:document.getElementById('dIP1H').value
    }
  };
  const r=await api('/ddos-config',body);
  if(r.success)toast('✓ DDoS config saved');
}
async function clearStrikes(){
  const r=await api('/clear-strikes',{});
  if(r.success)toast('✓ Strikes cleared');
}

// BANS
async function loadBans(){
  const b=await apiGet('/bans');
  const body=document.getElementById('banIPBody');
  const all=[...(b.ip||[]).map(x=>({...x,type:'ip'})),...(b.device||[]).map(x=>({...x,type:'device'})),...(b.key||[]).map(x=>({...x,type:'key'}))];
  if(!all.length){body.innerHTML='<tr><td colspan="4" style="text-align:center;color:var(--text-muted)">No bans</td></tr>';return}
  body.innerHTML=all.map(x=>`<tr>
    <td><code>${esc(x.id)}</code> <span style="color:var(--text-muted);font-size:10px">(${x.type})</span></td>
    <td>${esc(x.reason||'-')}</td>
    <td>${x.permanent?'PERMANENT':new Date(x.until).toLocaleString()}</td>
    <td><button class="btn-action success" onclick="unban('${x.type}','${esc(x.id)}')">Unban</button></td>
  </tr>`).join('');
}
async function manualBan(){
  const type=document.getElementById('banType').value;
  const id=document.getElementById('banId').value.trim();
  if(!id){toast('Value required','error');return}
  const r=await api('/ban',{type,id,reason:'Manual',permanent:false,minutes:60});
  if(r.success){toast('✓ Banned');loadBans()}
}
async function unban(type,id){
  const r=await api('/unban',{type,id});
  if(r.success){toast('✓ Unbanned');loadBans()}
}
async function unbanAll(){
  if(!confirm('Unban everything?'))return;
  const r=await api('/unban-all',{});
  if(r.success){toast('✓ All unbanned');loadBans()}
}

// DEVICES
async function loadDevices(){
  const d=await apiGet('/devices');
  const body=document.getElementById('devicesBody');
  if(!d.devices?.length){body.innerHTML='<tr><td colspan="6" style="text-align:center;color:var(--text-muted)">No devices</td></tr>';return}
  body.innerHTML=d.devices.slice(0,100).map(x=>`<tr>
    <td><code style="font-size:10px">${esc(x.id)}</code></td>
    <td>${esc(x.deviceType||'?')}</td>
    <td>${esc(x.os||'?')}</td>
    <td>${x.requests||0}</td>
    <td>${esc(x.lastSeen||'-')}</td>
    <td>${x.banned?'<span style="color:var(--danger)">BANNED</span>':'<span style="color:var(--success)">OK</span>'}</td>
  </tr>`).join('');
}

// AUDIT
async function loadAudit(){
  const r=await apiGet('/audit-log');
  const body=document.getElementById('auditBody');
  if(!r.logs?.length){body.innerHTML='<tr><td colspan="4" style="text-align:center;color:var(--text-muted)">No logs</td></tr>';return}
  body.innerHTML=r.logs.slice().reverse().map(l=>`<tr>
    <td style="font-size:11px">${esc(l.timestamp)}</td>
    <td>${esc(l.user)}</td>
    <td><code>${esc(l.action)}</code></td>
    <td style="font-size:11px">${esc(JSON.stringify(l.details||{}))}</td>
  </tr>`).join('');
}

// BACKUP
async function downloadBackup(){
  const r=await apiGet('/backup');
  const blob=new Blob([JSON.stringify(r,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;a.download='bronx-backup-'+Date.now()+'.json';
  a.click();URL.revokeObjectURL(url);
  toast('✓ Backup downloaded');
}
function handleRestoreFile(input){
  const f=input.files[0];if(!f)return;
  const reader=new FileReader();
  reader.onload=e=>{document.getElementById('restoreJson').value=e.target.result;toast('File loaded, click Restore')};
  reader.readAsText(f);
}
async function restoreData(){
  const txt=document.getElementById('restoreJson').value.trim();
  if(!txt){toast('Nothing to restore','error');return}
  let data;
  try{data=JSON.parse(txt)}catch(e){toast('Invalid JSON','error');return}
  const r=await api('/restore',data);
  if(r.success){toast('✓ Restored');setTimeout(()=>location.reload(),800)}
  else toast(r.e||'Error','error');
}

// MISC
async function action(path, msg){
  if(!confirm(msg||'Are you sure?'))return;
  const r=await api(path,{});
  if(r.success){toast('✓ Done');setTimeout(()=>location.reload(),600)}
}

// HELPERS
function esc(s){return s?String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m])):''}

// AUTO LOAD
loadDashboard();
</script>
</body></html>`;
}

// ============================================================
// 🚀 BOOT
// ============================================================
loadFromDisk();
initDefaults();

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('===========================================');
  console.log('🛡️  BRONX OSINT V503 PRO — ULTRA DEV EDITION');
  console.log('===========================================');
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🔐 Admin path: ${ADMIN_PATH}`);
  console.log(`👤 Admin user: ${ADMIN_USERNAME}`);
  console.log(`🔑 Loaded ${Object.keys(keyStorage).length} keys`);
  console.log(`🔧 Loaded ${customAPIs.length} custom APIs`);
  console.log(`🛡️  DDoS mode: ${ddosConfig.mode}`);
  console.log('===========================================');
});
