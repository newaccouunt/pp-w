// ============================================================
// BRONX OSINT V502 PRO — DEVELOPER EDITION
// ============================================================
const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
app.set('trust proxy', true);

// ---------- CONFIG ----------
const PORT = process.env.PORT || 3000;
const REAL_API_BASE = 'https://bronx-osint-api.duckdns.org/api';
const REAL_API_KEYS = ['bronx-bot-9999', 'bronx-ultra-king-ft-bro-op'];
let _ki = 0;
const getNextKey = () => { const k = REAL_API_KEYS[_ki]; _ki = (_ki + 1) % REAL_API_KEYS.length; return k; };

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'bronx';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '85095613';
const ADMIN_PATH = '/bronx-admin-panel';
const DATA_DIR = process.env.RENDER_DATA_DIR || '/tmp';
const F = n => path.join(DATA_DIR, n);
const DATA_FILE = F('bronx_v502.json');
const LOGS_FILE = F('bronx_v502_logs.json');

// ---------- STATE ----------
let keyStorage = {};
let customAPIs = [];
let requestLogs = [];
let keyMonitorLogs = [];
let adminSessions = {};
let permanentTokens = {};
let cooldownTimers = {};
let dailyLimits = {};
let perSecondLimits = {};
let protectedData = {};
let endpointResponses = {};
let auditLog = [];
let adminLogs = [];
let announcement = { enabled: false, text: '', type: 'info' };
let maintenance = { enabled: false, message: 'System under maintenance' };
let bans = { ip: {}, device: {}, key: {} };
let abuseTracker = { ip: {}, device: {}, key: {} };
let deviceFingerprints = {};
let whitelist = { ips: [], keys: [] };

let globalConfig = {
  developerName: '@BRONX_ULTRA',
  hiddenFields: 'credit, channel, by, api_by, developer, api_key, owner, source'
};

let customMessages = {
  keyNotFound: '🔑 Key not found. Purchase from @BRONX_ULTRA',
  limitReached: '🔴 Limit reached {used}/{limit}. Upgrade your plan.',
  keyStopped: '⛔ This key has been stopped by the administrator.',
  keyDisabled: '🚫 This key has been disabled.',
  keyExpired: '⏰ This key expired on {date}. Please renew.',
  missingKey: '🔑 API Key is required. Add ?key=YOUR_KEY to the URL.',
  scopeDenied: '🚫 Scope denied. Your key lacks access to this endpoint.'
};

let ddosConfig = {
  enabled: true,
  mode: 'smart',
  ip: { burst10s: 60, perMinute: 200, perHour: 1500, perDay: 15000 },
  device: { burst10s: 80, perMinute: 250, perHour: 2000 },
  key: { burst10s: 100, perMinute: 400, perHour: 3000 },
  strikes: { throttleAt: 2, tempBanAt: 3, longBanAt: 5, permanentAt: 10 },
  tempBanMs: 5 * 60 * 1000,
  longBanMs: 60 * 60 * 1000,
  login: { maxAttempts: 5, banMs: 30 * 60 * 1000 }
};

// ---------- THEME (Developer Dark) ----------
let theme = {
  preset: 'pro-dark',
  colors: {
    bgPrimary: '#0d1117', bgSecondary: '#161b22', bgCard: '#161b22', bgInput: '#0d1117',
    border: '#30363d', borderFocus: '#58a6ff',
    text: '#c9d1d9', textSecondary: '#8b949e', textMuted: '#6e7681',
    accent: '#58a6ff', accent2: '#1f6feb', success: '#238636', successText: '#3fb950',
    warning: '#d29922', danger: '#f85149', info: '#58a6ff', purple: '#a371f7'
  },
  fonts: { heading: 'Inter, system-ui, sans-serif', body: 'Inter, system-ui, sans-serif', mono: 'ui-monospace, "SF Mono", Consolas, monospace' },
  radius: 6
};

// ---------- ENDPOINTS ----------
const endpoints = {
  number:      { p: 'num',      i: 'phone',    e: '9876543210',    d: 'Mobile Number Lookup',   c: 'phone' },
  aadhar:      { p: 'num',      i: 'id-card',  e: '393933081942',  d: 'Aadhaar Lookup',         c: 'phone' },
  leakinfo:    { p: 'term',     i: 'search',   e: 'email@test.com',d: 'Leak Info',              c: 'phone' },
  name:        { p: 'name',     i: 'user',     e: 'abhiraaj',      d: 'Name Search',            c: 'phone' },
  numv2:       { p: 'num',      i: 'phone',    e: '6205949840',    d: 'Number v2',              c: 'phone' },
  adv:         { p: 'num',      i: 'radar',    e: '9876543210',    d: 'Advanced Intel',         c: 'phone' },
  adharfamily: { p: 'num',      i: 'users',    e: '984154610245',  d: 'Family Info',            c: 'phone' },
  adharration: { p: 'num',      i: 'scroll',   e: '701984830542',  d: 'Ration Card',            c: 'phone' },
  imei:        { p: 'imei',     i: 'smartphone', e: '357817383506298', d: 'IMEI Lookup',        c: 'phone' },
  calltracer:  { p: 'num',      i: 'phone',    e: '9876543210',    d: 'Call Tracer',            c: 'phone' },
  challan:     { p: 'vehicle',  i: 'receipt',  e: 'UP42BB2572',    d: 'Challan',                c: 'vehicle' },
  numleak:     { p: 'num',      i: 'unlock',   e: '9876543210',    d: 'Number Leak',            c: 'phone' },
  bomber:      { p: 'number',   i: 'bomb',     e: '9876543210',    d: 'SMS Bomber',             c: 'phone' },
  numtoupi:    { p: 'num',      i: 'credit-card', e: '8945996482', d: 'Number to UPI',          c: 'finance' },
  upi:         { p: 'upi',      i: 'wallet',   e: 'user@ybl',      d: 'UPI Lookup',             c: 'finance' },
  ifsc:        { p: 'ifsc',     i: 'bank',     e: 'SBIN0001234',   d: 'IFSC Lookup',            c: 'finance' },
  pan:         { p: 'pan',      i: 'file-text',e: 'AXDPR2606K',    d: 'PAN Lookup',             c: 'finance' },
  pincode:     { p: 'pin',      i: 'map-pin',  e: '110001',        d: 'Pincode Lookup',         c: 'location' },
  ip:          { p: 'ip',       i: 'globe',    e: '8.8.8.8',       d: 'IP Lookup',              c: 'location' },
  vehicle:     { p: 'vehicle',  i: 'car',      e: 'MH02FZ0555',    d: 'Vehicle Lookup',         c: 'vehicle' },
  rc:          { p: 'owner',    i: 'file',     e: 'UP92P2111',     d: 'Vehicle to Number',      c: 'vehicle' },
  veh2num:     { p: 'vehicle',  i: 'car',      e: 'KL41V3504',     d: 'Vehicle to Number v2',   c: 'vehicle' },
  ff:          { p: 'uid',      i: 'gamepad-2',e: '123456789',     d: 'Free Fire Info',         c: 'gaming' },
  bgmi:        { p: 'uid',      i: 'gamepad-2',e: '5121439477',    d: 'BGMI Info',              c: 'gaming' },
  insta:       { p: 'username', i: 'instagram',e: 'cristiano',     d: 'Instagram Info',         c: 'social' },
  git:         { p: 'username', i: 'github',   e: 'ftgamer2',      d: 'GitHub Info',            c: 'social' },
  tg:          { p: 'info',     i: 'send',     e: 'JAUUOWNER',     d: 'Telegram Info',          c: 'social' },
  tgidinfo:    { p: 'id',       i: 'send',     e: '7530266953',    d: 'Telegram ID Info',       c: 'social' },
  snap:        { p: 'username', i: 'ghost',    e: 'priyapanchal272',d: 'Snapchat Info',         c: 'social' },
  pk:          { p: 'num',      i: 'flag',     e: '03331234567',   d: 'Pakistan Info',          c: 'pakistan' },
  pkv2:        { p: 'num',      i: 'flag',     e: '3359736848',    d: 'Pakistan v2',            c: 'pakistan' }
};

// ---------- TIME ----------
const getIndiaTime = () => new Date(Date.now() + 5.5 * 3600 * 1000);
const getIndiaDate = () => getIndiaTime().toISOString().split('T')[0];
const getIndiaDateTime = () => getIndiaTime().toISOString().replace('T', ' ').substring(0, 19);
const isKeyExpired = d => d && d !== 'LIFETIME' && getIndiaTime() > new Date(d);
function parseExpiryDate(s) {
  if (!s || s === 'LIFETIME') return null;
  const p = String(s).split('-');
  if (p.length === 3) return p[0].length === 4 ? new Date(+p[0], +p[1] - 1, +p[2], 23, 59, 59) : new Date(+p[2], +p[1] - 1, +p[0], 23, 59, 59);
  const d = new Date(s); return isNaN(d) ? null : d;
}

// ---------- UTILS ----------
function getRealIP(req) {
  return (req.headers['x-forwarded-for']?.split(',')[0].trim())
    || req.headers['x-real-ip'] || req.headers['cf-connecting-ip']
    || req.socket?.remoteAddress || 'unknown';
}
function generateDeviceId(req) {
  const ua = req.headers['user-agent'] || '';
  const lang = req.headers['accept-language'] || '';
  return 'DEV_' + crypto.createHash('md5').update(`${ua}|${lang}`).digest('hex').substring(0, 16).toUpperCase();
}
function detectDeviceType(req) {
  const ua = (req.headers['user-agent'] || '').toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return { type: 'iOS', os: 'iOS' };
  if (/android/.test(ua)) return { type: 'Android', os: 'Android' };
  if (/windows/.test(ua)) return { type: 'Desktop', os: 'Windows' };
  if (/mac os|macintosh/.test(ua)) return { type: 'Desktop', os: 'macOS' };
  if (/linux/.test(ua)) return { type: 'Desktop', os: 'Linux' };
  if (/curl|wget|python|node|axios|go-http/.test(ua)) return { type: 'Bot/CLI', os: 'Bot' };
  return { type: 'Unknown', os: 'Unknown' };
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
const esc = s => s == null ? '' : String(s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
const genToken = () => crypto.randomBytes(24).toString('base64url');
const genRandomKey = (p = 'BRONX') => `${p}_${crypto.randomBytes(10).toString('hex').toUpperCase()}`;
function logAudit(user, action, details) {
  auditLog.push({ user, action, details, ts: getIndiaDateTime() });
  if (auditLog.length > 500) auditLog = auditLog.slice(-500);
}

// ---------- PERSISTENCE ----------
function saveToDisk() {
  try {
    const ks = {};
    Object.entries(keyStorage).forEach(([k, v]) => { if (!v._hardcoded) ks[k] = v; });
    const data = {
      keys: ks, apis: customAPIs, tokens: permanentTokens,
      protected: protectedData, endpointResponses,
      theme, bans, deviceFingerprints, whitelist,
      announcement, maintenance, auditLog: auditLog.slice(-500),
      adminLogs: adminLogs.slice(-500), globalConfig, customMessages, ddosConfig
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    fs.writeFileSync(LOGS_FILE, JSON.stringify({
      requestLogs: requestLogs.slice(-2000),
      keyMonitorLogs: keyMonitorLogs.slice(-2000)
    }, null, 2));
  } catch (e) { console.error('saveToDisk:', e.message); }
}
function loadFromDisk() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const d = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
      if (d.keys) Object.assign(keyStorage, d.keys);
      if (d.apis) customAPIs = d.apis;
      if (d.tokens) { permanentTokens = d.tokens; Object.keys(permanentTokens).forEach(t => { adminSessions[t] = { expiresAt: Date.now() + 365*24*3600*1000, permanent: true }; }); }
      if (d.protected) protectedData = d.protected;
      if (d.endpointResponses) endpointResponses = d.endpointResponses;
      if (d.theme) theme = { ...theme, ...d.theme, colors: { ...theme.colors, ...(d.theme.colors || {}) } };
      if (d.bans) bans = { ...bans, ...d.bans };
      if (d.deviceFingerprints) deviceFingerprints = d.deviceFingerprints;
      if (d.whitelist) whitelist = d.whitelist;
      if (d.announcement) announcement = d.announcement;
      if (d.maintenance) maintenance = d.maintenance;
      if (d.auditLog) auditLog = d.auditLog;
      if (d.adminLogs) adminLogs = d.adminLogs;
      if (d.globalConfig) globalConfig = { ...globalConfig, ...d.globalConfig };
      if (d.customMessages) customMessages = { ...customMessages, ...d.customMessages };
      if (d.ddosConfig) ddosConfig = { ...ddosConfig, ...d.ddosConfig };
    }
    if (fs.existsSync(LOGS_FILE)) {
      const l = JSON.parse(fs.readFileSync(LOGS_FILE, 'utf8'));
      if (l.requestLogs) requestLogs = l.requestLogs;
      if (l.keyMonitorLogs) keyMonitorLogs = l.keyMonitorLogs;
    }
  } catch (e) { console.error('loadFromDisk:', e.message); }
}
setInterval(saveToDisk, 2 * 60 * 1000);

// ---------- HARDCODED KEYS ----------
function initHardcoded() {
  const hc = [
    ['BRONX_PREMIUM_V100_01', 'Premium 01', '31-12-2028'],
    ['BRONX_PREMIUM_V100_02', 'Premium 02', '31-12-2028'],
    ['BRONX_ULTRA_OSINT_01', 'Ultra 01', '30-06-2029'],
    ['BRONX_KING_OP_V100', 'King OP', '31-12-2030'],
    ['BRONX_GOD_TIER_V100', 'God Tier', '31-12-2030']
  ];
  hc.forEach(([k, n, e]) => {
    if (!keyStorage[k]) {
      keyStorage[k] = {
        name: n, scopes: ['*'], type: 'hardcoded', limit: 999999, used: 0,
        cooldown: 0, dailyLimit: 0, perSecondLimit: 0,
        expiry: parseExpiryDate(e), expiryStr: e,
        created: getIndiaDateTime(), unlimited: true, _hardcoded: true,
        stopped: false, disabled: false, developerName: '', notes: ''
      };
    }
  });
}

// ---------- DEFAULT CUSTOM APIS ----------
function initCustomAPIs() {
  if (customAPIs.length > 0) return;
  customAPIs = [
    { id: 1, name: 'Number Advanced', endpoint: 'number-advanced', param: 'num', example: '9876543210', visible: true, realAPI: 'https://num-tg-info-api.vercel.app/info?number={param}' },
    { id: 2, name: 'Vehicle RC', endpoint: 'rc-details', param: 'ca_number', example: 'MH02FZ0555', visible: true, realAPI: 'https://simple-rc-info.vercel.app/rc?num={param}' },
    { id: 3, name: 'Aadhaar Verify', endpoint: 'aadhar-verify', param: 'aadhar', example: '393933081942', visible: true, realAPI: 'https://bronx-king-vip999.vercel.app/api/aadhaar?num={param}' },
    { id: 4, name: 'Email Lookup', endpoint: 'email-lookup', param: 'mail', example: 'user@gmail.com', visible: true, realAPI: 'https://bronx-king-mail-opi.vercel.app/mail={param}' },
    { id: 5, name: 'Telegram Scan', endpoint: 'telegram-scan', param: 'id', example: '7530266953', visible: true, realAPI: 'https://bronx-tg-king-bro.vercel.app/tg?key=BRONXop&query={param}' }
  ];
}

// ---------- SANITIZE ----------
function getHiddenFields() {
  return (globalConfig.hiddenFields || '').split(',').map(s => s.trim()).filter(Boolean);
}
function sanitize(d, devName) {
  if (!d || typeof d !== 'object') return d;
  try {
    const c = JSON.parse(JSON.stringify(d));
    const fields = getHiddenFields();
    fields.forEach(f => { delete c[f]; if (c.meta && typeof c.meta === 'object') delete c.meta[f]; });
    if (c.meta && Object.keys(c.meta).length === 0) delete c.meta;
    const name = devName || globalConfig.developerName;
    if (name) c.developer = name;
    return c;
  } catch { return d; }
}

// ---------- VALIDATION ----------
function checkCooldown(k) {
  const kd = keyStorage[k];
  if (!kd?.cooldown) return { ok: true };
  const n = Date.now();
  if (cooldownTimers[k] && (n - cooldownTimers[k]) < kd.cooldown * 1000) {
    return { ok: false, remaining: Math.ceil((kd.cooldown * 1000 - (n - cooldownTimers[k])) / 1000) };
  }
  cooldownTimers[k] = n;
  return { ok: true };
}
function checkPerSecond(k) {
  const kd = keyStorage[k];
  if (!kd?.perSecondLimit) return { ok: true };
  const wk = k + '_ps_' + Math.floor(Date.now() / 1000);
  perSecondLimits[wk] = (perSecondLimits[wk] || 0) + 1;
  if (perSecondLimits[wk] > kd.perSecondLimit) return { ok: false, msg: `⚡ ${kd.perSecondLimit}/s reached` };
  return { ok: true };
}
function checkDaily(k) {
  const kd = keyStorage[k];
  if (!kd?.dailyLimit) return { ok: true };
  const dk = k + '_' + getIndiaDate();
  dailyLimits[dk] = (dailyLimits[dk] || 0) + 1;
  if (dailyLimits[dk] > kd.dailyLimit) return { ok: false, msg: `🔴 Daily limit reached (${kd.dailyLimit})` };
  return { ok: true };
}
function isProtected(v) {
  for (const p of Object.keys(protectedData)) if (String(v).includes(p)) return p;
  return null;
}
function checkKey(k) {
  if (!k) return { valid: false, error: customMessages.missingKey };
  if (maintenance.enabled && !whitelist.keys.includes(k)) return { valid: false, error: '🔧 ' + maintenance.message };
  const kd = keyStorage[k];
  if (!kd) return { valid: false, error: customMessages.keyNotFound };
  if (kd.stopped) return { valid: false, error: customMessages.keyStopped };
  if (kd.disabled) return { valid: false, error: customMessages.keyDisabled };
  if (kd.expiry && isKeyExpired(kd.expiry)) return { valid: false, error: customMessages.keyExpired.replace('{date}', kd.expiryStr) };
  if (!kd.unlimited && kd.used >= kd.limit) return { valid: false, error: customMessages.limitReached.replace('{used}', kd.used).replace('{limit}', kd.limit) };
  const dl = checkDaily(k); if (!dl.ok) return { valid: false, error: dl.msg };
  const ps = checkPerSecond(k); if (!ps.ok) return { valid: false, error: ps.msg };
  const cd = checkCooldown(k); if (!cd.ok) return { valid: false, error: `⏱️ Cooldown: ${cd.remaining}s` };
  return { valid: true, kd };
}
function checkScope(kd, ep) {
  if (!kd.scopes || !kd.scopes.length) return { ok: false, error: customMessages.scopeDenied };
  if (kd.scopes.includes('*')) return { ok: true };
  if (kd.scopes.includes(ep)) return { ok: true };
  const cleanEp = ep.startsWith('c/') ? ep.substring(2) : ep;
  if (kd.scopes.includes('custom') || kd.scopes.includes('custom:' + cleanEp)) return { ok: true };
  return { ok: false, error: customMessages.scopeDenied + ' (' + ep + ')' };
}
function incrementUsage(k, ep, req) {
  const kd = keyStorage[k];
  if (!kd) return;
  if (!kd.unlimited) { kd.used++; const dk = k + '_' + getIndiaDate(); dailyLimits[dk] = (dailyLimits[dk] || 0) + 1; }
  const dev = generateDeviceId(req);
  const di = detectDeviceType(req);
  if (!deviceFingerprints[dev]) deviceFingerprints[dev] = { firstSeen: getIndiaDateTime(), lastSeen: '', requests: 0, browser: detectBrowser(req), deviceType: di.type, os: di.os, ips: [] };
  const df = deviceFingerprints[dev];
  df.lastSeen = getIndiaDateTime();
  df.requests++;
  const ip = getRealIP(req);
  if (!df.ips.includes(ip)) { df.ips.push(ip); if (df.ips.length > 10) df.ips = df.ips.slice(-10); }
  keyMonitorLogs.push({ key: k.substring(0, 10) + '***', endpoint: ep, ip, device: dev, browser: detectBrowser(req), deviceType: di.type, ts: getIndiaDateTime() });
  if (keyMonitorLogs.length > 2000) keyMonitorLogs = keyMonitorLogs.slice(-2000);
  requestLogs.push({ ts: getIndiaDateTime(), key: k.substring(0, 10) + '***', endpoint: ep, ip, status: 'ok' });
  if (requestLogs.length > 2000) requestLogs = requestLogs.slice(-2000);
}

// ---------- DDOS ----------
function isBanned(type, id) {
  const b = bans[type]?.[id];
  if (!b) return false;
  if (b.permanent) return true;
  if (Date.now() < (b.until || 0)) return true;
  delete bans[type][id];
  return false;
}
function pushHit(bucket, id) {
  const now = Date.now();
  if (!bucket[id]) bucket[id] = { hits: [], strikes: 0 };
  bucket[id].hits = bucket[id].hits.filter(t => t > now - 24 * 3600 * 1000);
  bucket[id].hits.push(now);
}
function countWin(bucket, id, ms) {
  const now = Date.now();
  return (bucket[id]?.hits || []).filter(t => t > now - ms).length;
}
function strike(bucket, id, reason, type) {
  if (!bucket[id]) bucket[id] = { hits: [], strikes: 0 };
  bucket[id].strikes++;
  const s = bucket[id].strikes;
  const c = ddosConfig.strikes;
  if (s >= c.permanentAt) { bans[type][id] = { permanent: true, reason, at: getIndiaDateTime(), strikes: s }; return { action: 'PERMANENT_BAN', message: '🚫 PERMANENT BAN' }; }
  if (s >= c.longBanAt) { bans[type][id] = { until: Date.now() + ddosConfig.longBanMs, reason, at: getIndiaDateTime(), strikes: s }; return { action: 'LONG_BAN', message: '⛔ 1 hour ban' }; }
  if (s >= c.tempBanAt) { bans[type][id] = { until: Date.now() + ddosConfig.tempBanMs, reason, at: getIndiaDateTime(), strikes: s }; return { action: 'TEMP_BAN', message: '⏸️ 5 min ban' }; }
  if (s >= c.throttleAt) return { action: 'THROTTLE', message: '🐢 Slow down' };
  return { action: 'WARN', message: '⚠️ Warning #' + s };
}
function smartDDoS(req) {
  if (!ddosConfig.enabled || ddosConfig.mode === 'off') return { allowed: true, action: 'OK' };
  const ip = getRealIP(req);
  const dev = generateDeviceId(req);
  const key = req.query.key || '';
  if (whitelist.ips.includes(ip)) return { allowed: true, action: 'WHITELISTED' };
  if (isBanned('ip', ip)) return { allowed: false, code: 403, reason: 'IP banned', type: 'ip', id: ip, action: 'BANNED' };
  if (isBanned('device', dev)) return { allowed: false, code: 403, reason: 'Device banned', type: 'device', id: dev, action: 'BANNED' };
  if (key && isBanned('key', key)) return { allowed: false, code: 403, reason: 'Key banned', type: 'key', id: key, action: 'BANNED' };
  pushHit(abuseTracker.ip, ip);
  pushHit(abuseTracker.device, dev);
  if (key) pushHit(abuseTracker.key, key);
  const mult = ddosConfig.mode === 'strict' ? 0.3 : 1;
  const check = (type, id, lim, bucket) => {
    if (countWin(bucket, id, 10000) > Math.floor(lim.burst10s * mult)) return strike(bucket, id, 'Burst', type);
    if (countWin(bucket, id, 60000) > Math.floor(lim.perMinute * mult)) return strike(bucket, id, 'Rate/min', type);
    if (countWin(bucket, id, 3600000) > Math.floor(lim.perHour * mult)) return strike(bucket, id, 'Rate/hour', type);
    return null;
  };
  let r = check('ip', ip, ddosConfig.ip, abuseTracker.ip);
  if (r) return { allowed: r.action === 'WARN' || r.action === 'THROTTLE', code: r.action.includes('BAN') ? 403 : 200, reason: r.message, action: r.action, type: 'ip', id: ip };
  r = check('device', dev, ddosConfig.device, abuseTracker.device);
  if (r) return { allowed: r.action === 'WARN' || r.action === 'THROTTLE', code: r.action.includes('BAN') ? 403 : 200, reason: r.message, action: r.action, type: 'device', id: dev };
  if (key) { r = check('key', key, ddosConfig.key, abuseTracker.key); if (r) return { allowed: r.action === 'WARN' || r.action === 'THROTTLE', code: r.action.includes('BAN') ? 403 : 200, reason: r.message, action: r.action, type: 'key', id: key }; }
  return { allowed: true, action: 'OK' };
}

// ---------- ADMIN AUTH ----------
function isAdminAuth(t) {
  if (!t) return false;
  const s = adminSessions[t];
  if (!s) return false;
  if (s.permanent) return true;
  if (Date.now() < s.expiresAt) return true;
  delete adminSessions[t]; delete permanentTokens[t];
  return false;
}
const adminAuth = (req, res, next) => {
  const t = req.headers['x-admin-token'] || req.query.token || req.body?.token;
  if (!isAdminAuth(t)) return res.status(401).json({ e: 'Unauthorized' });
  next();
};

// ---------- MIDDLEWARE ----------
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,x-api-key,x-admin-token');
  if (req.method === 'OPTIONS') return res.status(200).end();
  next();
});
app.use('/api', (req, res, next) => {
  const r = smartDDoS(req);
  if (!r.allowed) { res.setHeader('Content-Type', 'text/plain'); return res.status(r.code || 429).send(r.reason || 'Rate limited'); }
  if (r.action === 'THROTTLE') return setTimeout(next, 800);
  next();
});

// ---------- PUBLIC ROUTES ----------
app.get('/', (req, res) => res.send(renderHome()));

app.get('/test', (req, res) => res.json({
  status: 'online', version: '5.0.2', ddos: ddosConfig.mode,
  keys: Object.keys(keyStorage).filter(k => !keyStorage[k]._hardcoded).length,
  endpoints: Object.keys(endpoints).length,
  custom: customAPIs.length,
  uptime: process.uptime()
}));

// Universal custom API runner
app.get('/api/custom/:ep', async (req, res) => {
  try {
    const api = customAPIs.find(a => a.endpoint === req.params.ep && a.visible);
    if (!api) { res.setHeader('Content-Type', 'text/plain'); return res.status(404).send('API not found'); }
    const key = req.query.key;
    const kc = checkKey(key);
    if (!kc.valid) { res.setHeader('Content-Type', 'text/plain'); return res.status(403).send(kc.error); }
    const sc = checkScope(kc.kd, 'c/' + req.params.ep);
    if (!sc.ok) { res.setHeader('Content-Type', 'text/plain'); return res.status(403).send(sc.error); }
    const pv = req.query[api.param] || req.query.num;
    if (!pv) { res.setHeader('Content-Type', 'text/plain'); return res.status(400).send('Missing param: ' + api.param); }
    if (isProtected(pv)) { res.setHeader('Content-Type', 'text/plain'); return res.status(403).send('🔒 PROTECTED'); }
    const url = api.realAPI.replace(/\{param\}/gi, encodeURIComponent(pv));
    const r = await axios.get(url, { timeout: 30000 });
    incrementUsage(key, 'c/' + req.params.ep, req);
    const dev = kc.kd.developerName || globalConfig.developerName;
    res.json({ ...sanitize(r.data, dev), _meta: { key_owner: kc.kd.name, remaining: kc.kd.unlimited ? '∞' : Math.max(0, kc.kd.limit - kc.kd.used), expiry: kc.kd.expiryStr } });
  } catch (e) {
    res.setHeader('Content-Type', 'text/plain');
    res.status(500).send('API error: ' + e.message);
  }
});

// Built-in endpoint runner
app.get('/api/key-bronx/:ep', async (req, res) => {
  try {
    const ep = req.params.ep;
    const def = endpoints[ep];
    if (!def) { res.setHeader('Content-Type', 'text/plain'); return res.status(404).send('Endpoint not found'); }
    const key = req.query.key;
    const kc = checkKey(key);
    if (!kc.valid) { res.setHeader('Content-Type', 'text/plain'); return res.status(403).send(kc.error); }
    const sc = checkScope(kc.kd, ep);
    if (!sc.ok) { res.setHeader('Content-Type', 'text/plain'); return res.status(403).send(sc.error); }
    const pv = req.query[def.p];
    if (!pv) { res.setHeader('Content-Type', 'text/plain'); return res.status(400).send('Missing param: ' + def.p); }
    if (isProtected(pv)) { res.setHeader('Content-Type', 'text/plain'); return res.status(403).send('🔒 PROTECTED'); }
    if (endpointResponses[ep]) {
      incrementUsage(key, ep, req);
      const dev = kc.kd.developerName || globalConfig.developerName;
      return res.json({ ...sanitize(endpointResponses[ep], dev), _meta: { key_owner: kc.kd.name } });
    }
    const url = `${REAL_API_BASE}/${ep}?key=${getNextKey()}&${def.p}=${encodeURIComponent(pv)}`;
    const r = await axios.get(url, { timeout: 30000 });
    incrementUsage(key, ep, req);
    const dev = kc.kd.developerName || globalConfig.developerName;
    res.json({ ...sanitize(r.data, dev), _meta: { key_owner: kc.kd.name, remaining: kc.kd.unlimited ? '∞' : Math.max(0, kc.kd.limit - kc.kd.used) } });
  } catch (e) {
    res.setHeader('Content-Type', 'text/plain');
    res.status(500).send('API error: ' + e.message);
  }
});

// ---------- LOGIN ----------
app.get(ADMIN_PATH, (req, res) => {
  const token = req.query.token || req.headers['x-admin-token'];
  if (token && isAdminAuth(token)) return res.send(renderAdmin(token));
  res.send(renderLogin());
});
app.post(ADMIN_PATH + '/login', (req, res) => {
  const { username, password } = req.body;
  const ip = getRealIP(req);
  const lockKey = 'LOGIN_' + ip;
  if (bans.ip[lockKey] && (bans.ip[lockKey].permanent || Date.now() < bans.ip[lockKey].until)) {
    return res.json({ success: false, error: '🚫 Too many failed attempts' });
  }
  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    const token = genToken();
    adminSessions[token] = { expiresAt: Date.now() + 365 * 24 * 3600 * 1000, permanent: true };
    permanentTokens[token] = { createdAt: getIndiaDateTime() };
    delete abuseTracker.ip[lockKey];
    adminLogs.push({ user: username, action: 'LOGIN', ip, ts: getIndiaDateTime(), status: 'SUCCESS' });
    if (adminLogs.length > 500) adminLogs = adminLogs.slice(-500);
    logAudit(username, 'LOGIN_SUCCESS', { ip });
    saveToDisk();
    return res.json({ success: true, token, redirect: ADMIN_PATH + '?token=' + token });
  }
  pushHit(abuseTracker.ip, lockKey);
  const attempts = countWin(abuseTracker.ip, lockKey, 3600000);
  if (attempts >= ddosConfig.login.maxAttempts) {
    bans.ip[lockKey] = { until: Date.now() + ddosConfig.login.banMs, reason: 'Failed logins', at: getIndiaDateTime(), strikes: attempts };
  }
  adminLogs.push({ user: username, action: 'LOGIN_FAILED', ip, ts: getIndiaDateTime(), status: 'FAILED', attempts });
  if (adminLogs.length > 500) adminLogs = adminLogs.slice(-500);
  res.json({ success: false, error: `Invalid credentials. ${Math.max(0, ddosConfig.login.maxAttempts - attempts)} attempts left.` });
});

// ---------- ADMIN API ----------
app.post(ADMIN_PATH + '/generate-key', adminAuth, (req, res) => {
  const { keyName, keyOwner, scopes, limit, days, cooldown, dailyLimit, perSecondLimit, notes, developerName } = req.body;
  if (!keyOwner) return res.json({ e: 'Owner required' });
  const fk = keyName || genRandomKey();
  if (keyStorage[fk]) return res.json({ e: 'Key exists' });
  const d = parseInt(days) || 30;
  const exp = new Date(Date.now() + d * 24 * 3600 * 1000);
  keyStorage[fk] = {
    name: keyOwner, scopes: scopes || ['number'], type: 'generated',
    limit: parseInt(limit) || 100, used: 0, cooldown: parseInt(cooldown) || 0,
    dailyLimit: parseInt(dailyLimit) || 0, perSecondLimit: parseInt(perSecondLimit) || 0,
    expiry: exp, expiryStr: exp.toISOString().split('T')[0].split('-').reverse().join('-'),
    created: getIndiaDateTime(), unlimited: false, _hardcoded: false,
    stopped: false, disabled: false, notes: notes || '', developerName: developerName || ''
  };
  logAudit('admin', 'GENERATE_KEY', { key: fk, owner: keyOwner });
  saveToDisk();
  res.json({ success: true, key: fk, message: 'Key generated' });
});
app.post(ADMIN_PATH + '/edit-key', adminAuth, (req, res) => {
  const { keyName, newOwner, newLimit, newDailyLimit, newPerSecondLimit, newCooldown, newScopes, newNotes, newExpiry, newDeveloperName } = req.body;
  const kd = keyStorage[keyName];
  if (!kd) return res.json({ e: 'Not found' });
  if (kd._hardcoded) return res.json({ e: 'Hardcoded key cannot be edited' });
  if (newOwner !== undefined) kd.name = newOwner;
  if (newLimit !== undefined) kd.limit = parseInt(newLimit);
  if (newDailyLimit !== undefined) kd.dailyLimit = parseInt(newDailyLimit);
  if (newPerSecondLimit !== undefined) kd.perSecondLimit = parseInt(newPerSecondLimit);
  if (newCooldown !== undefined) kd.cooldown = parseInt(newCooldown);
  if (newScopes) kd.scopes = newScopes;
  if (newNotes !== undefined) kd.notes = newNotes;
  if (newDeveloperName !== undefined) kd.developerName = newDeveloperName;
  if (newExpiry) { const e = parseExpiryDate(newExpiry); if (e) { kd.expiry = e; kd.expiryStr = newExpiry; } }
  logAudit('admin', 'EDIT_KEY', { key: keyName });
  saveToDisk();
  res.json({ success: true });
});
app.post(ADMIN_PATH + '/delete-key', adminAuth, (req, res) => {
  const kd = keyStorage[req.body.keyName];
  if (!kd) return res.json({ e: 'Not found' });
  if (kd._hardcoded) return res.json({ e: 'Hardcoded key' });
  delete keyStorage[req.body.keyName];
  logAudit('admin', 'DELETE_KEY', { key: req.body.keyName });
  saveToDisk();
  res.json({ success: true });
});
app.post(ADMIN_PATH + '/reset-key-usage', adminAuth, (req, res) => {
  if (keyStorage[req.body.keyName]) { keyStorage[req.body.keyName].used = 0; saveToDisk(); return res.json({ success: true }); }
  res.json({ e: 'Not found' });
});
app.post(ADMIN_PATH + '/stop-key', adminAuth, (req, res) => {
  const kd = keyStorage[req.body.keyName];
  if (!kd) return res.json({ e: 'Not found' });
  if (kd._hardcoded) return res.json({ e: 'Hardcoded' });
  kd.stopped = !kd.stopped;
  saveToDisk();
  res.json({ success: true, stopped: kd.stopped });
});
app.post(ADMIN_PATH + '/disable-key', adminAuth, (req, res) => {
  const kd = keyStorage[req.body.keyName];
  if (!kd) return res.json({ e: 'Not found' });
  if (kd._hardcoded) return res.json({ e: 'Hardcoded' });
  kd.disabled = !kd.disabled;
  saveToDisk();
  res.json({ success: true, disabled: kd.disabled });
});
app.post(ADMIN_PATH + '/reset-all', adminAuth, (req, res) => {
  Object.values(keyStorage).forEach(k => { if (!k._hardcoded) k.used = 0; });
  dailyLimits = {}; perSecondLimits = {};
  saveToDisk();
  res.json({ success: true });
});
app.post(ADMIN_PATH + '/clear-logs', adminAuth, (req, res) => {
  requestLogs = []; keyMonitorLogs = [];
  saveToDisk();
  res.json({ success: true });
});
app.post(ADMIN_PATH + '/add-api', adminAuth, (req, res) => {
  const { name, endpoint, param, example, realAPI, visible } = req.body;
  if (!name || !endpoint) return res.json({ e: 'Name and endpoint required' });
  const ep = String(endpoint).toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  if (!ep) return res.json({ e: 'Invalid endpoint' });
  if (customAPIs.some(a => a.endpoint === ep)) return res.json({ e: 'Endpoint exists' });
  const newApi = { id: Date.now(), name, endpoint: ep, param: param || 'num', example: example || '', realAPI: realAPI || '', visible: visible !== false };
  customAPIs.push(newApi);
  logAudit('admin', 'ADD_API', { name, endpoint: ep });
  saveToDisk();
  res.json({ success: true, api: newApi });
});
app.post(ADMIN_PATH + '/toggle-api', adminAuth, (req, res) => {
  const a = customAPIs.find(x => x.id === parseInt(req.body.id));
  if (!a) return res.json({ e: 'Not found' });
  a.visible = !a.visible;
  saveToDisk();
  res.json({ success: true, visible: a.visible });
});
app.post(ADMIN_PATH + '/delete-api', adminAuth, (req, res) => {
  const i = customAPIs.findIndex(x => x.id === parseInt(req.body.id));
  if (i < 0) return res.json({ e: 'Not found' });
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
  const list = o => Object.entries(o).map(([id, d]) => ({ id, ...d }));
  res.json({ ip: list(bans.ip), device: list(bans.device), key: list(bans.key) });
});
app.post(ADMIN_PATH + '/ban', adminAuth, (req, res) => {
  const { type, id, reason, permanent, minutes } = req.body;
  if (!bans[type]) return res.json({ e: 'Bad type' });
  bans[type][id] = { permanent: !!permanent, until: permanent ? null : Date.now() + (parseInt(minutes) || 60) * 60000, reason: reason || 'Manual', at: getIndiaDateTime() };
  saveToDisk();
  res.json({ success: true });
});
app.post(ADMIN_PATH + '/unban', adminAuth, (req, res) => {
  const { type, id } = req.body;
  if (bans[type]) delete bans[type][id];
  if (abuseTracker[type]) delete abuseTracker[type][id];
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
  const list = Object.entries(deviceFingerprints).map(([id, d]) => ({ id, ...d, banned: !!bans.device[id] })).sort((a, b) => b.requests - a.requests);
  res.json({ devices: list, total: list.length });
});
app.get(ADMIN_PATH + '/ddos-config', adminAuth, (req, res) => res.json(ddosConfig));
app.post(ADMIN_PATH + '/ddos-config', adminAuth, (req, res) => {
  const c = req.body;
  if (c.enabled !== undefined) ddosConfig.enabled = !!c.enabled;
  if (c.mode) ddosConfig.mode = c.mode;
  ['ip', 'device', 'key'].forEach(k => {
    if (c[k]) {
      ['burst10s', 'perMinute', 'perHour', 'perDay'].forEach(f => { if (c[k][f] !== undefined) ddosConfig[k][f] = parseInt(c[k][f]); });
    }
  });
  if (c.strikes) Object.keys(c.strikes).forEach(x => { if (c.strikes[x] !== undefined) ddosConfig.strikes[x] = parseInt(c.strikes[x]); });
  saveToDisk();
  res.json({ success: true, config: ddosConfig });
});
app.post(ADMIN_PATH + '/clear-strikes', adminAuth, (req, res) => {
  ['ip', 'device', 'key'].forEach(t => Object.keys(abuseTracker[t] || {}).forEach(x => abuseTracker[t][x].strikes = 0));
  saveToDisk();
  res.json({ success: true });
});
app.get(ADMIN_PATH + '/monitor-logs', adminAuth, (req, res) => res.json({ logs: keyMonitorLogs.slice(-300), total: keyMonitorLogs.length }));
app.get(ADMIN_PATH + '/admin-logs', adminAuth, (req, res) => res.json({ logs: adminLogs.slice(-300), total: adminLogs.length }));
app.get(ADMIN_PATH + '/audit-log', adminAuth, (req, res) => res.json({ logs: auditLog.slice(-300), total: auditLog.length }));
app.get(ADMIN_PATH + '/stats', adminAuth, (req, res) => {
  const today = getIndiaDate();
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
  const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
  const todayL = keyMonitorLogs.filter(l => (l.ts || '').startsWith(today));
  const weekL = keyMonitorLogs.filter(l => (l.ts || '') >= weekAgo);
  const monthL = keyMonitorLogs.filter(l => (l.ts || '') >= monthAgo);
  const byEp = {};
  keyMonitorLogs.forEach(l => { byEp[l.endpoint] = (byEp[l.endpoint] || 0) + 1; });
  const byKey = {};
  keyMonitorLogs.forEach(l => { byKey[l.key] = (byKey[l.key] || 0) + 1; });
  const top = (o, n = 10) => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => ({ k, v }));
  res.json({
    total: keyMonitorLogs.length, today: todayL.length, week: weekL.length, month: monthL.length,
    topEndpoints: top(byEp), topKeys: top(byKey),
    devices: Object.keys(deviceFingerprints).length,
    bans: Object.keys(bans.ip).length + Object.keys(bans.device).length + Object.keys(bans.key).length
  });
});
app.get(ADMIN_PATH + '/theme', adminAuth, (req, res) => res.json(theme));
app.post(ADMIN_PATH + '/theme', adminAuth, (req, res) => {
  if (req.body.theme) theme = { ...theme, ...req.body.theme, colors: { ...theme.colors, ...(req.body.theme.colors || {}) } };
  saveToDisk();
  res.json({ success: true, theme });
});
app.get(ADMIN_PATH + '/response-settings', adminAuth, (req, res) => res.json({ globalConfig, customMessages }));
app.post(ADMIN_PATH + '/response-settings', adminAuth, (req, res) => {
  const { developerName, hiddenFields, messages } = req.body;
  if (developerName !== undefined) globalConfig.developerName = developerName;
  if (hiddenFields !== undefined) globalConfig.hiddenFields = hiddenFields;
  if (messages) Object.keys(messages).forEach(k => { if (customMessages[k] !== undefined) customMessages[k] = messages[k]; });
  saveToDisk();
  res.json({ success: true, globalConfig, customMessages });
});
app.get(ADMIN_PATH + '/export-keys', adminAuth, (req, res) => {
  const out = {};
  Object.entries(keyStorage).forEach(([k, v]) => { if (!v._hardcoded) out[k] = v; });
  res.json({ keys: out, total: Object.keys(out).length, exported_at: getIndiaDateTime() });
});
app.post(ADMIN_PATH + '/import-keys', adminAuth, (req, res) => {
  try {
    let payload = req.body.data || req.body;
    const keys = payload.keys || payload;
    let imported = 0, skipped = 0;
    Object.entries(keys).forEach(([k, d]) => {
      if (!d || typeof d !== 'object') return;
      if (k === 'success' || k === 'total' || k === 'keys' || k === 'exported_at') return;
      if (keyStorage[k] || d._hardcoded) { skipped++; return; }
      keyStorage[k] = { ...d, _hardcoded: false, type: 'generated' };
      imported++;
    });
    saveToDisk();
    res.json({ success: true, imported, skipped });
  } catch (e) { res.json({ e: e.message }); }
});
app.get(ADMIN_PATH + '/get-endpoint-response', adminAuth, (req, res) => res.json({ data: endpointResponses[req.query.endpoint] || null }));
app.post(ADMIN_PATH + '/update-endpoint-response', adminAuth, (req, res) => {
  const { endpoint, responseData } = req.body;
  if (!endpoint) return res.json({ e: 'Missing endpoint' });
  try {
    if (!responseData || String(responseData).trim() === '') delete endpointResponses[endpoint];
    else endpointResponses[endpoint] = typeof responseData === 'string' ? JSON.parse(responseData) : responseData;
    saveToDisk();
    res.json({ success: true });
  } catch { res.json({ e: 'Invalid JSON' }); }
});
app.get(ADMIN_PATH + '/full-backup', adminAuth, (req, res) => {
  const ks = {};
  Object.entries(keyStorage).forEach(([k, v]) => { if (!v._hardcoded) ks[k] = v; });
  res.json({
    version: '5.0.2', exported_at: getIndiaDateTime(),
    keys: ks, apis: customAPIs, protected: protectedData,
    endpointResponses, theme, ddosConfig, whitelist,
    announcement, maintenance, deviceFingerprints,
    globalConfig, customMessages
  });
});
app.post(ADMIN_PATH + '/restore', adminAuth, (req, res) => {
  try {
    const b = req.body;
    if (b.keys) Object.entries(b.keys).forEach(([k, v]) => { if (!v._hardcoded) keyStorage[k] = v; });
    if (b.apis) customAPIs = b.apis;
    if (b.protected) protectedData = b.protected;
    if (b.endpointResponses) endpointResponses = b.endpointResponses;
    if (b.theme) theme = { ...theme, ...b.theme };
    if (b.ddosConfig) ddosConfig = { ...ddosConfig, ...b.ddosConfig };
    if (b.whitelist) whitelist = b.whitelist;
    if (b.announcement) announcement = b.announcement;
    if (b.maintenance) maintenance = b.maintenance;
    if (b.globalConfig) globalConfig = { ...globalConfig, ...b.globalConfig };
    if (b.customMessages) customMessages = { ...customMessages, ...b.customMessages };
    saveToDisk();
    res.json({ success: true });
  } catch (e) { res.json({ e: e.message }); }
});
app.get(ADMIN_PATH + '/search-keys', adminAuth, (req, res) => {
  const q = (req.query.q || '').toLowerCase();
  const m = Object.entries(keyStorage).filter(([k, d]) => !d._hardcoded && (k.toLowerCase().includes(q) || (d.name || '').toLowerCase().includes(q))).slice(0, 50).map(([k, d]) => ({ key: k, name: d.name, used: d.used, limit: d.limit }));
  res.json({ matches: m, total: m.length });
});
app.post(ADMIN_PATH + '/bulk', adminAuth, (req, res) => {
  const { action, keys, days, state } = req.body;
  if (!Array.isArray(keys)) return res.json({ e: 'keys array required' });
  let n = 0;
  keys.forEach(k => {
    const kd = keyStorage[k];
    if (!kd || kd._hardcoded) return;
    switch (action) {
      case 'reset': kd.used = 0; break;
      case 'stop': kd.stopped = !!state; break;
      case 'disable': kd.disabled = !!state; break;
      case 'delete': delete keyStorage[k]; break;
      case 'push': { const d = parseInt(days) || 30; const e = new Date(Date.now() + d * 24 * 3600 * 1000); kd.expiry = e; kd.expiryStr = e.toISOString().split('T')[0].split('-').reverse().join('-'); break; }
      default: return;
    }
    n++;
  });
  saveToDisk();
  res.json({ success: true, count: n });
});
app.post(ADMIN_PATH + '/push-all', adminAuth, (req, res) => {
  const d = parseInt(req.body.days) || 30;
  const e = new Date(Date.now() + d * 24 * 3600 * 1000);
  let n = 0;
  Object.values(keyStorage).forEach(kd => { if (!kd._hardcoded) { kd.expiry = e; kd.expiryStr = e.toISOString().split('T')[0].split('-').reverse().join('-'); n++; } });
  saveToDisk();
  res.json({ success: true, count: n });
});
app.post(ADMIN_PATH + '/save-theme', adminAuth, (req, res) => {
  if (req.body.theme) theme = { ...theme, ...req.body.theme };
  saveToDisk();
  res.json({ success: true });
});
app.post(ADMIN_PATH + '/announcement', adminAuth, (req, res) => {
  announcement = { enabled: !!req.body.enabled, text: req.body.text || '', type: req.body.type || 'info' };
  saveToDisk();
  res.json({ success: true });
});
app.post(ADMIN_PATH + '/maintenance', adminAuth, (req, res) => {
  maintenance = { enabled: !!req.body.enabled, message: req.body.message || 'System under maintenance' };
  saveToDisk();
  res.json({ success: true });
});
app.get(ADMIN_PATH + '/announcement', adminAuth, (req, res) => res.json(announcement));
app.get(ADMIN_PATH + '/maintenance', adminAuth, (req, res) => res.json(maintenance));

// ---------- CSS (Professional Developer) ----------
function css() {
  const c = theme.colors;
  const r = theme.radius;
  return `
<style>
:root{
  --bg:${c.bgPrimary}; --bg2:${c.bgSecondary}; --card:${c.bgCard}; --input:${c.bgInput};
  --border:${c.border}; --focus:${c.borderFocus};
  --text:${c.text}; --text2:${c.textSecondary}; --muted:${c.textMuted};
  --accent:${c.accent}; --accent2:${c.accent2};
  --success:${c.success}; --successText:${c.successText};
  --warning:${c.warning}; --danger:${c.danger}; --info:${c.info};
  --radius:${r}px;
  --mono:${theme.fonts.mono}; --sans:${theme.fonts.body}; --heading:${theme.fonts.heading};
}
*{box-sizing:border-box;margin:0;padding:0}
body{background:var(--bg);color:var(--text);font-family:var(--sans);line-height:1.5;min-height:100vh;-webkit-font-smoothing:antialiased}
a{color:var(--accent);text-decoration:none}
a:hover{text-decoration:underline}
code,pre{font-family:var(--mono);font-size:12px}
::-webkit-scrollbar{width:8px;height:8px}
::-webkit-scrollbar-thumb{background:var(--border);border-radius:4px}
::-webkit-scrollbar-track{background:transparent}

/* Nav */
.nav{position:sticky;top:0;z-index:50;background:rgba(13,17,23,0.85);backdrop-filter:blur(12px);border-bottom:1px solid var(--border);padding:0 24px;height:56px;display:flex;align-items:center;justify-content:space-between}
.nav-brand{font-weight:700;font-size:15px;color:var(--text);letter-spacing:.3px;display:flex;align-items:center;gap:10px}
.nav-brand .dot{width:8px;height:8px;background:var(--successText);border-radius:50%;box-shadow:0 0 8px var(--successText)}
.nav-links{display:flex;gap:8px;align-items:center}
.nav-links a{color:var(--text2);font-size:13px;padding:6px 12px;border-radius:var(--radius);border:1px solid transparent;transition:.15s}
.nav-links a:hover{color:var(--text);border-color:var(--border);background:var(--bg2);text-decoration:none}

/* Container */
.wrap{max-width:1200px;margin:0 auto;padding:0 24px}
.hero{padding:56px 0 32px;text-align:center}
.hero h1{font-size:32px;font-weight:700;color:var(--text);margin-bottom:8px}
.hero p{color:var(--text2);font-size:15px}
.badge{display:inline-block;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:600;background:rgba(88,166,255,.15);color:var(--accent);border:1px solid rgba(88,166,255,.3)}
.badge.sm{font-size:10px;padding:1px 6px}

/* Endpoint cards */
.ep-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(360px,1fr));gap:16px;margin-bottom:32px}
.ep{background:var(--card);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;transition:.15s}
.ep:hover{border-color:var(--accent)}
.ep-head{padding:16px 16px 12px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:flex-start;gap:8px}
.ep-title{font-size:14px;font-weight:600;color:var(--text);display:flex;align-items:center;gap:8px}
.ep-desc{font-size:12px;color:var(--text2);margin-top:4px}
.ep-url{padding:12px 16px;font-family:var(--mono);font-size:11.5px;color:var(--successText);background:var(--bg);border-bottom:1px solid var(--border);word-break:break-all;line-height:1.6}
.ep-url .method{color:var(--accent);font-weight:600;margin-right:6px}
.ep-json{padding:0;max-height:240px;overflow:auto}
.ep-json pre{padding:12px 16px;background:var(--bg);color:var(--text2);font-size:11px;line-height:1.5;white-space:pre-wrap;word-break:break-all;margin:0}
.ep-json .label{padding:6px 16px;font-size:10px;text-transform:uppercase;letter-spacing:.5px;color:var(--muted);font-weight:600;background:var(--bg2);border-bottom:1px solid var(--border);display:flex;justify-content:space-between}
.ep-json .label .btn{background:transparent;border:none;color:var(--accent);cursor:pointer;font-size:10px;padding:0;font-family:var(--sans)}
.ep-json .label .btn:hover{text-decoration:underline}
.ep-foot{padding:10px 16px;border-top:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;font-size:11px;color:var(--muted)}

/* Buttons */
.btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:7px 14px;border-radius:var(--radius);border:1px solid var(--border);background:var(--bg2);color:var(--text);font-size:13px;font-weight:500;cursor:pointer;transition:.15s;font-family:var(--sans)}
.btn:hover{background:var(--border)}
.btn.primary{background:var(--accent2);border-color:var(--accent2);color:#fff}
.btn.primary:hover{background:var(--accent)}
.btn.success{background:var(--success);border-color:var(--success);color:#fff}
.btn.success:hover{background:#2ea043}
.btn.danger{background:var(--danger);border-color:var(--danger);color:#fff}
.btn.danger:hover{background:#da3633}
.btn.warning{background:var(--warning);border-color:var(--warning);color:#000}
.btn.sm{padding:4px 10px;font-size:12px}
.btn.block{width:100%}

/* Forms */
.form-group{margin-bottom:14px}
.form-group label{display:block;margin-bottom:6px;font-size:12px;font-weight:600;color:var(--text2);letter-spacing:.2px}
.form-input,.form-select,.form-textarea{width:100%;padding:8px 12px;background:var(--input);border:1px solid var(--border);border-radius:var(--radius);color:var(--text);font-size:13px;font-family:var(--sans);outline:none;transition:.15s}
.form-input:focus,.form-select:focus,.form-textarea:focus{border-color:var(--focus);box-shadow:0 0 0 3px rgba(88,166,255,.15)}
.form-textarea{font-family:var(--mono);font-size:12px;line-height:1.5;resize:vertical;min-height:80px}
.form-select{cursor:pointer}
.form-row{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px}
.hint{font-size:11px;color:var(--muted);margin-top:4px}

/* Table */
.table-wrap{border:1px solid var(--border);border-radius:var(--radius);overflow:auto;background:var(--card)}
table{width:100%;border-collapse:collapse;font-size:13px}
th{background:var(--bg2);color:var(--text2);padding:10px 12px;text-align:left;font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:.4px;border-bottom:1px solid var(--border);position:sticky;top:0;z-index:2}
td{padding:10px 12px;border-bottom:1px solid var(--border);color:var(--text);vertical-align:middle}
tr:last-child td{border-bottom:none}
tr:hover td{background:rgba(255,255,255,.02)}
.mono{font-family:var(--mono);font-size:12px}
.tag{display:inline-block;padding:1px 6px;border-radius:4px;font-size:10.5px;font-weight:600;letter-spacing:.2px}
.tag.ok{background:rgba(63,185,80,.15);color:var(--successText);border:1px solid rgba(63,185,80,.3)}
.tag.bad{background:rgba(248,81,73,.15);color:var(--danger);border:1px solid rgba(248,81,73,.3)}
.tag.warn{background:rgba(210,153,34,.15);color:var(--warning);border:1px solid rgba(210,153,34,.3)}
.tag.info{background:rgba(88,166,255,.15);color:var(--accent);border:1px solid rgba(88,166,255,.3)}

/* Layout */
.grid-2{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.grid-3{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
@media(max-width:900px){.grid-2,.grid-3{grid-template-columns:1fr}.ep-grid{grid-template-columns:1fr}}

.card{background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:20px;margin-bottom:16px}
.card h2{font-size:14px;font-weight:600;color:var(--text);margin-bottom:16px;display:flex;align-items:center;gap:8px;padding-bottom:12px;border-bottom:1px solid var(--border)}
.card h2 .ico{width:24px;height:24px;display:flex;align-items:center;justify-content:center;background:rgba(88,166,255,.15);border-radius:4px;color:var(--accent);font-size:12px}

.stat{background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:16px}
.stat .label{font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;font-weight:600;margin-bottom:4px}
.stat .value{font-size:24px;font-weight:700;color:var(--text);font-family:var(--mono)}

/* Toast */
.toast{position:fixed;top:20px;right:20px;z-index:9999;background:var(--card);border:1px solid var(--border);border-left:3px solid var(--accent);border-radius:var(--radius);padding:12px 16px;font-size:13px;color:var(--text);box-shadow:0 8px 24px rgba(0,0,0,.4);max-width:360px;animation:slideIn .2s ease}
.toast.ok{border-left-color:var(--successText)}
.toast.err{border-left-color:var(--danger)}
.toast.warn{border-left-color:var(--warning)}
@keyframes slideIn{from{transform:translateX(120%);opacity:0}to{transform:translateX(0);opacity:1}}

/* Tabs */
.tabs{display:flex;gap:2px;border-bottom:1px solid var(--border);margin-bottom:16px;overflow-x:auto}
.tab{padding:8px 14px;font-size:13px;font-weight:500;color:var(--text2);cursor:pointer;border-bottom:2px solid transparent;white-space:nowrap;transition:.15s}
.tab:hover{color:var(--text)}
.tab.active{color:var(--text);border-bottom-color:var(--accent)}

/* Sidebar */
.shell{display:flex;min-height:calc(100vh - 56px)}
.side{width:220px;background:var(--bg2);border-right:1px solid var(--border);padding:12px 8px;flex-shrink:0;overflow-y:auto;position:sticky;top:56px;height:calc(100vh - 56px)}
.side a{display:flex;align-items:center;gap:10px;padding:8px 12px;border-radius:var(--radius);color:var(--text2);font-size:13px;cursor:pointer;margin-bottom:1px;text-decoration:none}
.side a:hover{background:var(--bg);color:var(--text)}
.side a.active{background:var(--accent2);color:#fff;font-weight:600}
.side .ico{width:16px;height:16px;text-align:center;flex-shrink:0;opacity:.8}
.main{flex:1;padding:20px 24px;min-width:0}
@media(max-width:768px){.side{position:fixed;left:-220px;z-index:60;transition:.2s}.side.open{left:0}.main{padding:16px}}

/* Login */
.login-wrap{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px;background:radial-gradient(circle at 50% 0%,rgba(88,166,255,.08),transparent 50%)}
.login-card{width:380px;max-width:100%;background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:32px}
.login-card .logo{width:48px;height:48px;margin:0 auto 16px;background:var(--accent2);border-radius:12px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:22px;font-weight:700}
.login-card h1{text-align:center;font-size:18px;font-weight:600;margin-bottom:4px}
.login-card .sub{text-align:center;font-size:12px;color:var(--muted);margin-bottom:24px}
.login-card .msg{text-align:center;font-size:12px;margin-top:12px;min-height:18px}
</style>`;
}

// ---------- HOME PAGE ----------
function renderHome() {
  const visApis = customAPIs.filter(a => a.visible);
  const ann = announcement.enabled ? `<div style="background:${theme.colors.accent2};color:#fff;padding:10px 20px;text-align:center;font-size:13px;font-weight:500">${esc(announcement.text)}</div>` : '';
  const mt = maintenance.enabled ? `<div style="min-height:80vh;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:16px;padding:40px;text-align:center"><h1 style="color:${theme.colors.warning}">Maintenance</h1><p style="color:${theme.colors.textSecondary}">${esc(maintenance.message)}</p></div>` : '';

  let cards = '';
  Object.entries(endpoints).forEach(([n, e]) => {
    const sample = endpointResponses[n] ? JSON.stringify(endpointResponses[n], null, 2) : `{\n  "status": "success",\n  "result": "Sample response - admin can configure this",\n  "developer": "${esc(globalConfig.developerName)}"\n}`;
    cards += `
      <div class="ep">
        <div class="ep-head">
          <div>
            <div class="ep-title">/${esc(n)} <span class="badge sm">${esc(e.c)}</span></div>
            <div class="ep-desc">${esc(e.d)}</div>
          </div>
        </div>
        <div class="ep-url"><span class="method">GET</span>/api/key-bronx/${esc(n)}?key=YOUR_KEY&amp;${esc(e.p)}=${esc(e.e)}</div>
        <div class="ep-json">
          <div class="label">Sample Response <button class="btn" onclick="copy(this,'${esc(sample)}')">Copy</button></div>
          <pre>${esc(sample)}</pre>
        </div>
      </div>`;
  });
  visApis.forEach(a => {
    const sample = endpointResponses['c/' + a.endpoint] ? JSON.stringify(endpointResponses['c/' + a.endpoint], null, 2) : `{\n  "status": "success",\n  "endpoint": "${esc(a.endpoint)}",\n  "developer": "${esc(globalConfig.developerName)}"\n}`;
    cards += `
      <div class="ep">
        <div class="ep-head">
          <div>
            <div class="ep-title">/${esc(a.endpoint)} <span class="badge sm">custom</span></div>
            <div class="ep-desc">${esc(a.name)}</div>
          </div>
        </div>
        <div class="ep-url"><span class="method">GET</span>/api/custom/${esc(a.endpoint)}?key=YOUR_KEY&amp;${esc(a.param)}=${esc(a.example)}</div>
        <div class="ep-json">
          <div class="label">Sample Response <button class="btn" onclick="copy(this,'${esc(sample)}')">Copy</button></div>
          <pre>${esc(sample)}</pre>
        </div>
      </div>`;
  });

  return `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>BRONX OSINT API — Developer Docs</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
${css()}
</head><body>
${ann}
${mt}
<nav class="nav">
  <a href="/" class="nav-brand"><span class="dot"></span> BRONX OSINT <span style="color:${theme.colors.textMuted};font-weight:400;font-size:12px">v5.0.2</span></a>
  <div class="nav-links">
    <a href="/test">Status</a>
    <a href="${ADMIN_PATH}">Admin</a>
  </div>
</nav>
<div class="wrap">
  <div class="hero">
    <h1>OSINT API — Developer Reference</h1>
    <p>Production-grade OSINT endpoints. Authenticate with <code style="background:${theme.colors.bgSecondary};padding:2px 6px;border-radius:4px">?key=YOUR_KEY</code></p>
  </div>

  <div class="card" style="margin-bottom:32px">
    <h2><span class="ico">📖</span> Quick Start</h2>
    <div class="grid-2">
      <div>
        <div class="form-group">
          <label>Example Request</label>
          <div class="ep-url" style="border:1px solid ${theme.colors.border};border-radius:6px">
            <span class="method">GET</span>https://bronx-osint-api.duckdns.org/api/key-bronx/number?key=YOUR_KEY&amp;num=9876543210
          </div>
        </div>
      </div>
      <div>
        <div class="form-group">
          <label>Response</label>
          <pre style="background:${theme.colors.bgPrimary};padding:10px;border-radius:6px;border:1px solid ${theme.colors.border};font-family:${theme.fonts.mono};font-size:11px;color:${theme.colors.textSecondary};margin:0;overflow:auto">{
  "status": "success",
  "developer": "${esc(globalConfig.developerName)}"
}</pre>
        </div>
      </div>
    </div>
  </div>

  <h2 style="font-size:16px;font-weight:600;margin:24px 0 16px;color:${theme.colors.text}">${Object.keys(endpoints).length + visApis.length} Endpoints Available</h2>
  <div class="ep-grid">${cards}</div>

  <footer style="text-align:center;padding:32px 0;border-top:1px solid ${theme.colors.border};margin-top:32px;color:${theme.colors.textMuted};font-size:12px">
    Powered by <strong style="color:${theme.colors.text}">${esc(globalConfig.developerName)}</strong> · BRONX OSINT v5.0.2
  </footer>
</div>
<script>
function copy(el, txt) {
  navigator.clipboard.writeText(txt).then(() => {
    const old = el.textContent; el.textContent = 'Copied!';
    setTimeout(() => el.textContent = old, 1200);
  });
}
</script>
</body></html>`;
}

// ---------- LOGIN PAGE ----------
function renderLogin() {
  return `<!DOCTYPE html><html><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>BRONX · Login</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
${css()}
</head><body>
<div class="login-wrap">
  <div class="login-card">
    <div class="logo">B</div>
    <h1>BRONX Admin</h1>
    <div class="sub">Sign in to manage your OSINT platform</div>
    <div class="form-group"><label>Username</label><input class="form-input" id="u" placeholder="admin" autocomplete="username"></div>
    <div class="form-group"><label>Password</label><input class="form-input" id="p" type="password" placeholder="••••••••" autocomplete="current-password"></div>
    <button class="btn primary block" id="btn" onclick="login()">Sign In</button>
    <div class="msg" id="msg"></div>
  </div>
</div>
<script>
async function login(){
  const u = document.getElementById('u').value.trim();
  const p = document.getElementById('p').value.trim();
  const m = document.getElementById('msg');
  const b = document.getElementById('btn');
  if (!u || !p) { m.textContent = 'Fill both fields'; m.style.color = '${theme.colors.warning}'; return; }
  b.disabled = true; b.textContent = 'Signing in…';
  try {
    const r = await fetch('${ADMIN_PATH}/login', {
      method: 'POST', headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ username: u, password: p })
    });
    const d = await r.json();
    if (d.success) { m.textContent = 'Success. Redirecting…'; m.style.color = '${theme.colors.successText}'; setTimeout(() => location.href = d.redirect, 500); }
    else { m.textContent = d.error; m.style.color = '${theme.colors.danger}'; b.disabled = false; b.textContent = 'Sign In'; }
  } catch(e) { m.textContent = 'Network error'; m.style.color = '${theme.colors.danger}'; b.disabled = false; b.textContent = 'Sign In'; }
}
document.getElementById('p').addEventListener('keydown', e => e.key === 'Enter' && login());
</script>
</body></html>`;
}

// ---------- ADMIN PAGE ----------
function renderAdmin(token) {
  const safeToken = esc(token);
  const keyList = Object.entries(keyStorage).filter(([k, v]) => !v._hardcoded).map(([k, v]) => ({
    key: k, name: v.name, limit: v.unlimited ? '∞' : v.limit, used: v.used || 0,
    left: v.unlimited ? '∞' : Math.max(0, (v.limit || 0) - (v.used || 0)),
    expiry: v.expiryStr || 'Lifetime', expired: v.expiry ? isKeyExpired(v.expiry) : false,
    scopes: v.scopes || [], stopped: v.stopped || false, disabled: v.disabled || false,
    devName: v.developerName || '', notes: v.notes || ''
  }));
  const allScopes = Object.keys(endpoints).concat(customAPIs.map(a => 'custom:' + a.endpoint));

  return `<!DOCTYPE html><html><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>BRONX Admin · Dashboard</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
${css()}
</head><body>
<nav class="nav">
  <a href="/" class="nav-brand"><span class="dot"></span> BRONX Admin</a>
  <div class="nav-links">
    <span style="font-size:12px;color:${theme.colors.textMuted}">${esc(ADMIN_USERNAME)}</span>
    <a href="/">Docs</a>
    <a href="#" onclick="logout();return false">Sign Out</a>
  </div>
</nav>
<div class="shell">
  <aside class="side" id="side">
    <a class="active" data-sec="dashboard"><span class="ico">📊</span> Dashboard</a>
    <a data-sec="generate"><span class="ico">➕</span> Generate Key</a>
    <a data-sec="keys"><span class="ico">🔑</span> Keys</a>
    <a data-sec="endpoints"><span class="ico">🔌</span> Endpoints</a>
    <a data-sec="responses"><span class="ico">📝</span> Response Editor</a>
    <a data-sec="settings"><span class="ico">⚙️</span> Response Settings</a>
    <a data-sec="apis"><span class="ico">🧩</span> Custom APIs</a>
    <a data-sec="monitor"><span class="ico">👁️</span> Live Monitor</a>
    <a data-sec="stats"><span class="ico">📈</span> Statistics</a>
    <a data-sec="ddos"><span class="ico">🛡️</span> DDoS Protection</a>
    <a data-sec="bans"><span class="ico">🚫</span> Bans</a>
    <a data-sec="devices"><span class="ico">💻</span> Devices</a>
    <a data-sec="protect"><span class="ico">🔒</span> Data Protection</a>
    <a data-sec="backup"><span class="ico">💾</span> Backup & Import</a>
    <a data-sec="bulk"><span class="ico">📦</span> Bulk Actions</a>
    <a data-sec="pushall"><span class="ico">⬆️</span> Push All Keys</a>
    <a data-sec="announce"><span class="ico">📢</span> Announcement</a>
    <a data-sec="maintenance"><span class="ico">🔧</span> Maintenance</a>
    <a data-sec="audit"><span class="ico">📋</span> Audit Log</a>
    <a data-sec="adminlogs"><span class="ico">📜</span> Admin Logs</a>
  </aside>
  <main class="main">
    <!-- Dashboard -->
    <section id="sec-dashboard">
      <div class="grid-3" style="margin-bottom:16px" id="dashStats"></div>
      <div class="card"><h2><span class="ico">📊</span> Top Endpoints</h2><div class="table-wrap"><table><thead><tr><th>Endpoint</th><th>Requests</th></tr></thead><tbody id="topEndpoints"></tbody></table></div></div>
      <div class="card"><h2><span class="ico">🔑</span> Top Keys</h2><div class="table-wrap"><table><thead><tr><th>Key</th><th>Requests</th></tr></thead><tbody id="topKeys"></tbody></table></div></div>
    </section>

    <!-- Generate Key -->
    <section id="sec-generate" style="display:none">
      <div class="card"><h2><span class="ico">➕</span> Generate New API Key</h2>
        <div class="form-row">
          <div class="form-group"><label>Key ID (leave blank to auto-generate)</label><input class="form-input" id="g-key" placeholder="BRONX_MY_KEY"></div>
          <div class="form-group"><label>Owner Name *</label><input class="form-input" id="g-owner" placeholder="John Doe"></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Total Limit</label><input class="form-input" id="g-limit" type="number" value="100"></div>
          <div class="form-group"><label>Daily Limit (0 = unlimited)</label><input class="form-input" id="g-daily" type="number" value="0"></div>
          <div class="form-group"><label>Per-Second Limit (0 = unlimited)</label><input class="form-input" id="g-ps" type="number" value="0"></div>
          <div class="form-group"><label>Cooldown seconds (0 = none)</label><input class="form-input" id="g-cd" type="number" value="0"></div>
          <div class="form-group"><label>Valid Days</label><input class="form-input" id="g-days" type="number" value="30"></div>
        </div>
        <div class="form-group"><label>Custom Developer Name (overrides global for this key only)</label><input class="form-input" id="g-dev" placeholder="e.g. @MY_NAME (leave blank for global default)"><div class="hint">If set, only this key's responses will show this name in the "developer" field.</div></div>
        <div class="form-group"><label>Notes</label><input class="form-input" id="g-notes" placeholder="Optional"></div>
        <div class="form-group"><label>Scopes</label><div id="scopeGrid" style="display:flex;flex-wrap:wrap;gap:6px;padding:10px;background:${theme.colors.bgPrimary};border:1px solid ${theme.colors.border};border-radius:6px;max-height:200px;overflow:auto">
          <label class="tag info" style="cursor:pointer;padding:4px 8px"><input type="checkbox" value="*" checked> ALL ACCESS</label>
          ${allScopes.map(s => `<label class="tag" style="cursor:pointer;padding:4px 8px;background:${theme.colors.bgSecondary}"><input type="checkbox" value="${esc(s)}"> ${esc(s)}</label>`).join('')}
        </div></div>
        <button class="btn primary block" onclick="generateKey()">Generate Key</button>
      </div>
    </section>

    <!-- Keys -->
    <section id="sec-keys" style="display:none">
      <div class="card">
        <h2><span class="ico">🔑</span> API Keys <span style="margin-left:auto;font-weight:400;font-size:12px;color:${theme.colors.textMuted}" id="keysCount"></span></h2>
        <div class="form-group"><input class="form-input" id="keysFilter" placeholder="Search by key or owner…" oninput="renderKeys()"></div>
        <div class="table-wrap" style="max-height:600px">
          <table><thead><tr>
            <th><input type="checkbox" id="selectAll" onchange="toggleAll(this)"></th>
            <th>Key</th><th>Owner</th><th>Limit</th><th>Used</th><th>Left</th><th>Expiry</th><th>Dev Name</th><th>Status</th><th>Actions</th>
          </tr></thead><tbody id="keysBody"></tbody></table>
        </div>
      </div>
    </section>

    <!-- Endpoints -->
    <section id="sec-endpoints" style="display:none">
      <div class="card"><h2><span class="ico">🔌</span> Built-in Endpoints (${Object.keys(endpoints).length})</h2>
        <div class="table-wrap"><table><thead><tr><th>Endpoint</th><th>Description</th><th>Param</th><th>Example</th></tr></thead>
          <tbody>${Object.entries(endpoints).map(([n, e]) => `<tr><td class="mono">/${n}</td><td>${esc(e.d)}</td><td class="mono">${esc(e.p)}</td><td class="mono">${esc(e.e)}</td></tr>`).join('')}</tbody></table></div>
      </div>
    </section>

    <!-- Responses -->
    <section id="sec-responses" style="display:none">
      <div class="card"><h2><span class="ico">📝</span> Endpoint Sample Response Editor</h2>
        <p class="hint" style="margin-bottom:14px">Sample JSON shown to users on the docs homepage. When set, this response is also what this endpoint returns (unless you clear it).</p>
        <div class="form-group"><label>Endpoint</label>
          <select class="form-select" id="re-select" onchange="loadResponse()">
            <option value="">— Select —</option>
            ${Object.keys(endpoints).map(e => `<option value="${e}">/${e} — ${esc(endpoints[e].d)}</option>`).join('')}
            ${customAPIs.map(a => `<option value="c/${a.endpoint}">/${a.endpoint} — ${esc(a.name)} (custom)</option>`).join('')}
          </select></div>
        <div class="form-group"><label>Response JSON (empty = clear custom response)</label>
          <textarea class="form-textarea" id="re-data" rows="14" placeholder='{"status":"success"}'></textarea></div>
        <div style="display:flex;gap:8px"><button class="btn primary" onclick="saveResponse()">Save</button><button class="btn" onclick="formatJSON()">Format JSON</button><button class="btn danger" onclick="clearResponse()">Clear</button></div>
      </div>
    </section>

    <!-- Response Settings -->
    <section id="sec-settings" style="display:none">
      <div class="card"><h2><span class="ico">⚙️</span> Global Developer Name & Hidden Fields</h2>
        <div class="form-group"><label>Default Developer Name (shown in every response)</label><input class="form-input" id="rs-dev" value="${esc(globalConfig.developerName)}"></div>
        <div class="form-group"><label>Hidden Fields (comma-separated — removed from all responses)</label><textarea class="form-textarea" id="rs-hidden" rows="3">${esc(globalConfig.hiddenFields)}</textarea>
        <div class="hint">Common: credit, channel, by, api_by, developer, api_key, owner, source</div></div>
        <button class="btn primary" onclick="saveResponseSettings()">Save Settings</button>
      </div>
      <div class="card"><h2><span class="ico">💬</span> Custom Error Messages (Plain Text)</h2>
        <div class="form-group"><label>Missing Key</label><input class="form-input" id="cm-missingKey" value="${esc(customMessages.missingKey)}"></div>
        <div class="form-group"><label>Key Not Found</label><input class="form-input" id="cm-keyNotFound" value="${esc(customMessages.keyNotFound)}"></div>
        <div class="form-group"><label>Limit Reached (use {used} and {limit})</label><input class="form-input" id="cm-limitReached" value="${esc(customMessages.limitReached)}"></div>
        <div class="form-group"><label>Key Stopped</label><input class="form-input" id="cm-keyStopped" value="${esc(customMessages.keyStopped)}"></div>
        <div class="form-group"><label>Key Disabled</label><input class="form-input" id="cm-keyDisabled" value="${esc(customMessages.keyDisabled)}"></div>
        <div class="form-group"><label>Key Expired (use {date})</label><input class="form-input" id="cm-keyExpired" value="${esc(customMessages.keyExpired)}"></div>
        <div class="form-group"><label>Scope Denied</label><input class="form-input" id="cm-scopeDenied" value="${esc(customMessages.scopeDenied)}"></div>
        <button class="btn primary" onclick="saveMessages()">Save Messages</button>
      </div>
    </section>

    <!-- Custom APIs -->
    <section id="sec-apis" style="display:none">
      <div class="card"><h2><span class="ico">🧩</span> Custom APIs (<span id="apiCount">${customAPIs.length}</span>)</h2>
        <div class="table-wrap"><table><thead><tr><th>ID</th><th>Name</th><th>Endpoint</th><th>Param</th><th>Visible</th><th>Actions</th></tr></thead>
        <tbody id="apisBody"></tbody></table></div>
      </div>
      <div class="card"><h2><span class="ico">➕</span> Add New API</h2>
        <div class="form-row">
          <div class="form-group"><label>Name *</label><input class="form-input" id="a-name" placeholder="My API"></div>
          <div class="form-group"><label>Endpoint * (lowercase)</label><input class="form-input" id="a-ep" placeholder="my-endpoint"></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Param</label><input class="form-input" id="a-param" value="num"></div>
          <div class="form-group"><label>Example value</label><input class="form-input" id="a-example" placeholder="9876543210"></div>
        </div>
        <div class="form-group"><label>Real API URL (use {param} placeholder)</label><input class="form-input" id="a-url" placeholder="https://api.example.com/?num={param}"></div>
        <button class="btn primary block" onclick="addAPI()">Add API</button>
      </div>
    </section>

    <!-- Monitor -->
    <section id="sec-monitor" style="display:none">
      <div class="card"><h2><span class="ico">👁️</span> Live Request Monitor</h2>
        <div class="form-group"><input class="form-input" id="monFilter" placeholder="Filter…" oninput="renderMonitor()"></div>
        <div id="monBody" style="max-height:520px;overflow:auto;font-family:${theme.fonts.mono};font-size:12px;background:${theme.colors.bgPrimary};border:1px solid ${theme.colors.border};border-radius:6px;padding:8px"></div>
      </div>
    </section>

    <!-- Stats -->
    <section id="sec-stats" style="display:none">
      <div class="grid-3" id="statsBox" style="margin-bottom:16px"></div>
      <div class="card"><h2><span class="ico">📈</span> Endpoint Breakdown</h2><div class="table-wrap"><table><thead><tr><th>Endpoint</th><th>Requests</th></tr></thead><tbody id="statsEp"></tbody></table></div></div>
    </section>

    <!-- DDoS -->
    <section id="sec-ddos" style="display:none">
      <div class="card"><h2><span class="ico">🛡️</span> DDoS Protection</h2>
        <div class="form-group"><label>Mode</label>
          <select class="form-select" id="d-mode">
            <option value="off">Off</option>
            <option value="smart">Smart (recommended)</option>
            <option value="strict">Strict (70% stricter)</option>
          </select></div>
        <div class="form-row">
          <div class="form-group"><label>Enabled</label>
            <select class="form-select" id="d-enabled"><option value="true">Yes</option><option value="false">No</option></select></div>
          <div class="form-group"><label>IP Burst / 10s</label><input class="form-input" id="d-ip-10" type="number"></div>
          <div class="form-group"><label>IP / Minute</label><input class="form-input" id="d-ip-1m" type="number"></div>
          <div class="form-group"><label>IP / Hour</label><input class="form-input" id="d-ip-1h" type="number"></div>
          <div class="form-group"><label>Temp Ban (min)</label><input class="form-input" id="d-temp" type="number"></div>
          <div class="form-group"><label>Long Ban (min)</label><input class="form-input" id="d-long" type="number"></div>
        </div>
        <div style="display:flex;gap:8px"><button class="btn primary" onclick="saveDDOS()">Save</button><button class="btn warning" onclick="clearStrikes()">Clear All Strikes</button></div>
      </div>
    </section>

    <!-- Bans -->
    <section id="sec-bans" style="display:none">
      <div class="card"><h2><span class="ico">🚫</span> Manual Ban</h2>
        <div class="form-row">
          <div class="form-group"><label>Type</label><select class="form-select" id="b-type"><option value="ip">IP</option><option value="device">Device</option><option value="key">Key</option></select></div>
          <div class="form-group"><label>Value</label><input class="form-input" id="b-id" placeholder="IP / device ID / key"></div>
          <div class="form-group"><label>Minutes (blank = permanent)</label><input class="form-input" id="b-min" type="number"></div>
        </div>
        <div style="display:flex;gap:8px"><button class="btn danger" onclick="manualBan()">Ban</button><button class="btn warning" onclick="unbanAll()">Unban All</button></div>
      </div>
      <div class="card"><h2><span class="ico">📋</span> Active Bans</h2><div id="bansBody"></div></div>
    </section>

    <!-- Devices -->
    <section id="sec-devices" style="display:none">
      <div class="card"><h2><span class="ico">💻</span> Devices (<span id="devCount">0</span>)</h2>
        <div class="table-wrap" style="max-height:600px"><table><thead><tr><th>Device ID</th><th>Type</th><th>OS</th><th>Browser</th><th>Requests</th><th>Last Seen</th><th>Status</th></tr></thead><tbody id="devBody"></tbody></table></div>
      </div>
    </section>

    <!-- Protect -->
    <section id="sec-protect" style="display:none">
      <div class="card"><h2><span class="ico">🔒</span> Data Protection</h2>
        <p class="hint" style="margin-bottom:14px">Any request parameter containing a protected value returns 403.</p>
        <div class="form-row">
          <div class="form-group"><label>Value to protect</label><input class="form-input" id="p-val" placeholder="9876543210"></div>
          <div class="form-group" style="display:flex;align-items:flex-end"><button class="btn primary block" onclick="addProtection()">Add</button></div>
        </div>
        <div class="table-wrap"><table><thead><tr><th>Protected Value</th><th>Actions</th></tr></thead><tbody id="protBody"></tbody></table></div>
      </div>
    </section>

    <!-- Backup -->
    <section id="sec-backup" style="display:none">
      <div class="card"><h2><span class="ico">💾</span> Full Backup</h2>
        <p class="hint" style="margin-bottom:14px">Export all keys, APIs, responses, settings, and device fingerprints to a JSON file.</p>
        <button class="btn success block" onclick="downloadBackup()">Download Full Backup (.json)</button>
      </div>
      <div class="card"><h2><span class="ico">📥</span> Import / Restore</h2>
        <div class="form-group"><label>Upload backup file</label><input class="form-input" type="file" id="restoreFile" accept=".json" onchange="handleRestoreFile(this)"></div>
        <div class="form-group"><label>Or paste JSON</label><textarea class="form-textarea" id="restoreText" rows="8" placeholder='{"keys": {...}, "apis": [...]}'></textarea></div>
        <button class="btn primary block" onclick="doRestore()">Restore from JSON</button>
        <p class="hint" id="restoreMsg" style="margin-top:8px"></p>
      </div>
    </section>

    <!-- Bulk -->
    <section id="sec-bulk" style="display:none">
      <div class="card"><h2><span class="ico">📦</span> Bulk Actions</h2>
        <p class="hint" style="margin-bottom:14px">Select keys in the Keys tab first. <strong id="bulkCount" style="color:${theme.colors.accent}">0 selected</strong></p>
        <div class="grid-2" style="margin-bottom:14px">
          <button class="btn success" onclick="bulk('reset')">Reset Usage</button>
          <button class="btn warning" onclick="bulk('stop', true)">Stop</button>
          <button class="btn" onclick="bulk('stop', false)">Activate</button>
          <button class="btn danger" onclick="bulk('delete')">Delete</button>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Push Days</label><input class="form-input" id="bulk-days" type="number" value="30"></div>
          <div class="form-group" style="display:flex;align-items:flex-end"><button class="btn warning block" onclick="bulk('push')">Push Selected</button></div>
        </div>
      </div>
    </section>

    <!-- Push All -->
    <section id="sec-pushall" style="display:none">
      <div class="card"><h2><span class="ico">⬆️</span> Push All Keys</h2>
        <div class="form-group"><label>Days to add</label><input class="form-input" id="pa-days" type="number" value="30"></div>
        <button class="btn warning block" onclick="pushAll()">Push All Keys</button>
      </div>
    </section>

    <!-- Announcement -->
    <section id="sec-announce" style="display:none">
      <div class="card"><h2><span class="ico">📢</span> Announcement</h2>
        <div class="form-group"><label>Enabled</label><select class="form-select" id="an-enabled"><option value="false">Off</option><option value="true">On</option></select></div>
        <div class="form-group"><label>Text</label><input class="form-input" id="an-text" placeholder="Welcome to BRONX OSINT"></div>
        <button class="btn primary block" onclick="saveAnnouncement()">Save</button>
      </div>
    </section>

    <!-- Maintenance -->
    <section id="sec-maintenance" style="display:none">
      <div class="card"><h2><span class="ico">🔧</span> Maintenance Mode</h2>
        <div class="form-group"><label>Enabled</label><select class="form-select" id="mt-enabled"><option value="false">Off</option><option value="true">On</option></select></div>
        <div class="form-group"><label>Message</label><input class="form-input" id="mt-message" placeholder="System under maintenance"></div>
        <button class="btn warning block" onclick="saveMaintenance()">Save</button>
      </div>
    </section>

    <!-- Audit -->
    <section id="sec-audit" style="display:none">
      <div class="card"><h2><span class="ico">📋</span> Audit Log</h2>
        <div class="table-wrap" style="max-height:600px"><table><thead><tr><th>Time</th><th>User</th><th>Action</th><th>Details</th></tr></thead><tbody id="auditBody"></tbody></table></div>
      </div>
    </section>

    <!-- Admin Logs -->
    <section id="sec-adminlogs" style="display:none">
      <div class="card"><h2><span class="ico">📜</span> Admin Login Logs</h2>
        <div class="table-wrap" style="max-height:600px"><table><thead><tr><th>Time</th><th>User</th><th>Action</th><th>IP</th><th>Status</th></tr></thead><tbody id="adminLogsBody"></tbody></table></div>
      </div>
    </section>
  </main>
</div>

<script>
const TOKEN = '${safeToken}';
const API = '${ADMIN_PATH}';
const ALL_KEYS = ${JSON.stringify(keyList)};
let CUSTOM_APIS = ${JSON.stringify(customAPIs)};
let selectedKeys = new Set();
let monitorData = [];

// --- Helpers ---
const $ = id => document.getElementById(id);
function toast(msg, type) {
  type = type || 'ok';
  const t = document.createElement('div');
  t.className = 'toast ' + type;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3200);
}
async function api(path, body) {
  const opts = { headers: { 'x-admin-token': TOKEN } };
  if (body) { opts.method = 'POST'; opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body); }
  const r = await fetch(API + path, opts);
  return r.json();
}
function copyText(t) { navigator.clipboard.writeText(t).then(() => toast('Copied')); }

// --- Nav ---
document.querySelectorAll('.side a').forEach(el => {
  el.onclick = () => {
    document.querySelectorAll('.side a').forEach(x => x.classList.remove('active'));
    el.classList.add('active');
    document.querySelectorAll('main > section').forEach(s => s.style.display = 'none');
    $('sec-' + el.dataset.sec).style.display = 'block';
    const sec = el.dataset.sec;
    if (sec === 'dashboard') loadDashboard();
    if (sec === 'keys') renderKeys();
    if (sec === 'monitor') loadMonitor();
    if (sec === 'stats') loadStats();
    if (sec === 'ddos') loadDDOS();
    if (sec === 'bans') loadBans();
    if (sec === 'devices') loadDevices();
    if (sec === 'protect') loadProtect();
    if (sec === 'apis') renderAPIs();
    if (sec === 'audit') loadAudit();
    if (sec === 'adminlogs') loadAdminLogs();
    if (sec === 'announce') loadAnnouncement();
    if (sec === 'maintenance') loadMaintenance();
    if (sec === 'responses') loadEndpointsIntoResponseSelect();
  };
});

// --- Dashboard ---
async function loadDashboard() {
  const d = await api('/stats');
  $('dashStats').innerHTML = [
    ['Total', d.total], ['Today', d.today], ['This Week', d.week],
    ['This Month', d.month], ['Devices', d.devices], ['Bans', d.bans]
  ].map(([l, v]) => `<div class="stat"><div class="label">${l}</div><div class="value">${v ?? '-'}</div></div>`).join('');
  $('topEndpoints').innerHTML = (d.topEndpoints || []).map(x => `<tr><td class="mono">${x.k}</td><td>${x.v}</td></tr>`).join('') || '<tr><td colspan="2" style="text-align:center;color:' + '${theme.colors.textMuted}">No data</td></tr>';
  $('topKeys').innerHTML = (d.topKeys || []).map(x => `<tr><td class="mono">${x.k}</td><td>${x.v}</td></tr>`).join('') || '<tr><td colspan="2" style="text-align:center;color:' + '${theme.colors.textMuted}">No data</td></tr>';
}

// --- Keys ---
function renderKeys() {
  const q = ($('keysFilter')?.value || '').toLowerCase();
  const filtered = ALL_KEYS.filter(k => !q || k.key.toLowerCase().includes(q) || (k.name || '').toLowerCase().includes(q));
  $('keysCount').textContent = filtered.length + ' of ' + ALL_KEYS.length;
  $('keysBody').innerHTML = filtered.map(k => `
    <tr>
      <td><input type="checkbox" data-key="${esc(k.key)}" ${selectedKeys.has(k.key) ? 'checked' : ''} onchange="toggleSel('${esc(k.key)}',this.checked)"></td>
      <td class="mono">${esc(k.key)}</td>
      <td>${esc(k.name)}</td>
      <td>${k.limit}</td>
      <td>${k.used}</td>
      <td>${k.left}</td>
      <td>${esc(k.expiry)} ${k.expired ? '<span class="tag bad">expired</span>' : ''}</td>
      <td>${k.devName ? '<span class="tag info">' + esc(k.devName) + '</span>' : '<span style="color:${theme.colors.textMuted}">—</span>'}</td>
      <td>${k.disabled ? '<span class="tag bad">disabled</span>' : k.stopped ? '<span class="tag warn">stopped</span>' : '<span class="tag ok">active</span>'}</td>
      <td>
        <button class="btn sm" onclick="resetKey('${esc(k.key)}')">Reset</button>
        <button class="btn sm" onclick="toggleStop('${esc(k.key)}')">${k.stopped ? 'Resume' : 'Stop'}</button>
        <button class="btn sm danger" onclick="delKey('${esc(k.key)}')">Del</button>
      </td>
    </tr>
  `).join('');
  updateBulkCount();
}
function toggleSel(k, on) { on ? selectedKeys.add(k) : selectedKeys.delete(k); updateBulkCount(); }
function toggleAll(el) { document.querySelectorAll('#keysBody input[type=checkbox]').forEach(cb => { cb.checked = el.checked; toggleSel(cb.dataset.key, el.checked); }); }
function updateBulkCount() { const el = $('bulkCount'); if (el) el.textContent = selectedKeys.size + ' selected'; }
async function resetKey(k) { await api('/reset-key-usage', { keyName: k }); toast('Reset'); location.reload(); }
async function toggleStop(k) { await api('/stop-key', { keyName: k }); toast('Updated'); location.reload(); }
async function delKey(k) { if (!confirm('Delete ' + k + '?')) return; await api('/delete-key', { keyName: k }); toast('Deleted'); location.reload(); }

// --- Generate ---
function getScopes() {
  const checks = document.querySelectorAll('#scopeGrid input:checked');
  return Array.from(checks).map(c => c.value);
}
async function generateKey() {
  const scopes = getScopes();
  if (!scopes.length) return toast('Select at least one scope', 'err');
  const body = {
    keyName: $('g-key').value.trim(),
    keyOwner: $('g-owner').value.trim(),
    scopes,
    limit: $('g-limit').value,
    dailyLimit: $('g-daily').value,
    perSecondLimit: $('g-ps').value,
    cooldown: $('g-cd').value,
    days: $('g-days').value,
    notes: $('g-notes').value.trim(),
    developerName: $('g-dev').value.trim()
  };
  if (!body.keyOwner) return toast('Owner name required', 'err');
  const r = await api('/generate-key', body);
  if (r.e) return toast(r.e, 'err');
  toast('Key: ' + r.key, 'ok');
  setTimeout(() => location.reload(), 1200);
}

// --- Response Editor ---
function loadEndpointsIntoResponseSelect() { /* select already populated */ }
async function loadResponse() {
  const ep = $('re-select').value;
  if (!ep) return;
  const r = await fetch(API + '/get-endpoint-response?endpoint=' + encodeURIComponent(ep), { headers: { 'x-admin-token': TOKEN } });
  const d = await r.json();
  $('re-data').value = d.data ? JSON.stringify(d.data, null, 2) : '';
}
async function saveResponse() {
  const ep = $('re-select').value;
  if (!ep) return toast('Select endpoint', 'err');
  const r = await api('/update-endpoint-response', { endpoint: ep, responseData: $('re-data').value });
  if (r.e) return toast(r.e, 'err');
  toast('Response saved');
}
async function clearResponse() { $('re-data').value = ''; await saveResponse(); }
function formatJSON() {
  try { $('re-data').value = JSON.stringify(JSON.parse($('re-data').value), null, 2); toast('Formatted'); }
  catch (e) { toast('Invalid JSON', 'err'); }
}

// --- Settings ---
async function saveResponseSettings() {
  await api('/response-settings', { developerName: $('rs-dev').value, hiddenFields: $('rs-hidden').value });
  toast('Saved');
}
async function saveMessages() {
  const messages = {};
  ['missingKey', 'keyNotFound', 'limitReached', 'keyStopped', 'keyDisabled', 'keyExpired', 'scopeDenied'].forEach(k => { messages[k] = $('cm-' + k).value; });
  await api('/response-settings', { messages });
  toast('Messages saved');
}

// --- Custom APIs ---
function renderAPIs() {
  $('apiCount').textContent = CUSTOM_APIS.length;
  $('apisBody').innerHTML = CUSTOM_APIS.map(a => `<tr>
    <td>${a.id}</td><td>${esc(a.name)}</td><td class="mono">/${esc(a.endpoint)}</td><td class="mono">${esc(a.param)}</td>
    <td>${a.visible ? '<span class="tag ok">on</span>' : '<span class="tag bad">off</span>'}</td>
    <td><button class="btn sm" onclick="toggleAPI(${a.id})">Toggle</button><button class="btn sm danger" onclick="delAPI(${a.id})">Delete</button></td>
  </tr>`).join('');
}
async function addAPI() {
  const r = await api('/add-api', { name: $('a-name').value, endpoint: $('a-ep').value, param: $('a-param').value, example: $('a-example').value, realAPI: $('a-url').value, visible: true });
  if (r.e) return toast(r.e, 'err');
  toast('API added'); setTimeout(() => location.reload(), 800);
}
async function toggleAPI(id) { await api('/toggle-api', { id }); location.reload(); }
async function delAPI(id) { if (!confirm('Delete?')) return; await api('/delete-api', { id }); location.reload(); }

// --- Monitor ---
async function loadMonitor() {
  const r = await fetch(API + '/monitor-logs', { headers: { 'x-admin-token': TOKEN } });
  const d = await r.json();
  monitorData = d.logs || [];
  renderMonitor();
}
function renderMonitor() {
  const q = ($('monFilter')?.value || '').toLowerCase();
  const rows = monitorData.filter(l => !q || JSON.stringify(l).toLowerCase().includes(q)).slice(-300).reverse();
  $('monBody').innerHTML = rows.map(l => `<div style="padding:4px 6px;border-bottom:1px solid ${theme.colors.border};display:grid;grid-template-columns:70px 100px 90px 1fr;gap:8px;font-size:11px"><span style="color:${theme.colors.textMuted}">${esc(l.ts)}</span><span style="color:${theme.colors.accent}">${esc(l.key)}</span><span style="color:${theme.colors.successText}">${esc(l.endpoint)}</span><span style="color:${theme.colors.textSecondary}">${esc(l.ip)} · ${esc(l.browser || '?')} · ${esc(l.deviceType || '?')}</span></div>`).join('') || '<div style="padding:12px;text-align:center;color:' + theme.colors.textMuted + '">No logs</div>';
}

// --- Stats ---
async function loadStats() {
  const d = await api('/stats');
  $('statsBox').innerHTML = [['Total', d.total], ['Today', d.today], ['Week', d.week], ['Month', d.month], ['Devices', d.devices], ['Bans', d.bans]].map(([l, v]) => `<div class="stat"><div class="label">${l}</div><div class="value">${v ?? '-'}</div></div>`).join('');
  $('statsEp').innerHTML = (d.topEndpoints || []).map(x => `<tr><td class="mono">${esc(x.k)}</td><td>${x.v}</td></tr>`).join('') || '<tr><td colspan="2" style="text-align:center;color:' + theme.colors.textMuted + '">No data</td></tr>';
}

// --- DDoS ---
async function loadDDOS() {
  const d = await api('/ddos-config');
  $('d-mode').value = d.mode; $('d-enabled').value = d.enabled ? 'true' : 'false';
  $('d-ip-10').value = d.ip.burst10s; $('d-ip-1m').value = d.ip.perMinute; $('d-ip-1h').value = d.ip.perHour;
  $('d-temp').value = Math.round(d.tempBanMs / 60000); $('d-long').value = Math.round(d.longBanMs / 60000);
}
async function saveDDOS() {
  await api('/ddos-config', {
    enabled: $('d-enabled').value === 'true', mode: $('d-mode').value,
    ip: { burst10s: $('d-ip-10').value, perMinute: $('d-ip-1m').value, perHour: $('d-ip-1h').value },
    tempBanMs: (+$('d-temp').value) * 60000, longBanMs: (+$('d-long').value) * 60000
  });
  toast('DDoS config saved');
}
async function clearStrikes() { await api('/clear-strikes'); toast('Strikes cleared'); }

// --- Bans ---
async function loadBans() {
  const d = await api('/bans');
  const all = [...(d.ip || []).map(x => ['ip', x]), ...(d.device || []).map(x => ['device', x]), ...(d.key || []).map(x => ['key', x])];
  $('bansBody').innerHTML = '<div class="table-wrap"><table><thead><tr><th>Type</th><th>ID</th><th>Reason</th><th>Until</th><th>Action</th></tr></thead><tbody>' +
    (all.map(([t, x]) => `<tr><td class="mono">${t}</td><td class="mono">${esc(x.id)}</td><td>${esc(x.reason || '')}</td><td>${x.permanent ? 'permanent' : new Date(x.until).toLocaleString()}</td><td><button class="btn sm" onclick="unbanOne('${t}','${esc(x.id)}')">Unban</button></td></tr>`).join('') || '<tr><td colspan="5" style="text-align:center;color:' + theme.colors.textMuted + '">No bans</td></tr>') +
    '</tbody></table></div>';
}
async function manualBan() {
  const min = $('b-min').value;
  await api('/ban', { type: $('b-type').value, id: $('b-id').value.trim(), permanent: !min, minutes: min || 60 });
  toast('Banned'); location.reload();
}
async function unbanOne(t, id) { await api('/unban', { type: t, id }); location.reload(); }
async function unbanAll() { await api('/unban-all'); toast('All unbanned'); location.reload(); }

// --- Devices ---
async function loadDevices() {
  const d = await api('/devices');
  $('devCount').textContent = d.total;
  $('devBody').innerHTML = d.devices.slice(0, 200).map(x => `<tr><td class="mono" style="font-size:10px">${esc(x.id)}</td><td>${esc(x.deviceType || '?')}</td><td>${esc(x.os || '?')}</td><td>${esc(x.browser || '?')}</td><td>${x.requests}</td><td>${esc(x.lastSeen || '')}</td><td>${x.banned ? '<span class="tag bad">banned</span>' : '<span class="tag ok">active</span>'}</td></tr>`).join('');
}

// --- Protect ---
async function loadProtect() {
  const d = await api('/full-backup');
  const p = d.protected || {};
  $('protBody').innerHTML = Object.keys(p).map(k => `<tr><td class="mono">${esc(k)}</td><td><button class="btn sm danger" onclick="removeProtect('${esc(k)}')">Remove</button></td></tr>`).join('') || '<tr><td colspan="2" style="text-align:center;color:' + theme.colors.textMuted + '">None</td></tr>';
}
async function addProtection() { const v = $('p-val').value.trim(); if (!v) return; await api('/add-protection', { value: v }); toast('Added'); loadProtect(); $('p-val').value = ''; }
async function removeProtect(v) { await api('/remove-protection', { value: v }); loadProtect(); }

// --- Backup ---
async function downloadBackup() {
  const d = await api('/full-backup');
  const blob = new Blob([JSON.stringify(d, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'bronx-backup-' + new Date().toISOString().split('T')[0] + '.json';
  a.click();
  toast('Backup downloaded');
}
function handleRestoreFile(el) {
  const f = el.files[0];
  if (!f) return;
  const r = new FileReader();
  r.onload = e => { $('restoreText').value = e.target.result; toast('Loaded — click Restore'); };
  r.readAsText(f);
}
async function doRestore() {
  try {
    const data = JSON.parse($('restoreText').value);
    const r = await api('/restore', data);
    if (r.e) return toast(r.e, 'err');
    toast('Restored'); setTimeout(() => location.reload(), 800);
  } catch (e) { toast('Invalid JSON', 'err'); }
}

// --- Bulk ---
async function bulk(action, state) {
  if (!selectedKeys.size) return toast('Select keys first', 'err');
  if (action === 'delete' && !confirm('Delete ' + selectedKeys.size + ' keys?')) return;
  const body = { action, keys: [...selectedKeys], state, days: $('bulk-days')?.value };
  const r = await api('/bulk', body);
  if (r.e) return toast(r.e, 'err');
  toast('Done: ' + r.count); setTimeout(() => location.reload(), 800);
}
async function pushAll() {
  const d = $('pa-days').value || 30;
  const r = await api('/push-all', { days: d });
  toast('Pushed ' + d + ' days to ' + r.count + ' keys');
}

// --- Announcement / Maintenance ---
async function loadAnnouncement() {
  const d = await api('/announcement');
  $('an-enabled').value = d.enabled ? 'true' : 'false';
  $('an-text').value = d.text || '';
}
async function saveAnnouncement() {
  await api('/announcement', { enabled: $('an-enabled').value === 'true', text: $('an-text').value });
  toast('Announcement saved');
}
async function loadMaintenance() {
  const d = await api('/maintenance');
  $('mt-enabled').value = d.enabled ? 'true' : 'false';
  $('mt-message').value = d.message || '';
}
async function saveMaintenance() {
  await api('/maintenance', { enabled: $('mt-enabled').value === 'true', message: $('mt-message').value });
  toast('Maintenance saved');
}

// --- Audit / Logs ---
async function loadAudit() {
  const d = await api('/audit-log');
  $('auditBody').innerHTML = (d.logs || []).slice(-200).reverse().map(l => `<tr><td class="mono" style="font-size:11px">${esc(l.ts)}</td><td>${esc(l.user)}</td><td><span class="tag info">${esc(l.action)}</span></td><td class="mono" style="font-size:11px">${esc(JSON.stringify(l.details))}</td></tr>`).join('');
}
async function loadAdminLogs() {
  const d = await api('/admin-logs');
  $('adminLogsBody').innerHTML = (d.logs || []).slice(-200).reverse().map(l => `<tr><td class="mono" style="font-size:11px">${esc(l.ts)}</td><td>${esc(l.user)}</td><td>${esc(l.action)}</td><td class="mono">${esc(l.ip)}</td><td><span class="tag ${l.status === 'SUCCESS' ? 'ok' : 'bad'}">${l.status}</span></td></tr>`).join('');
}

// --- Logout ---
function logout() {
  localStorage.removeItem('bronx_admin');
  location.href = '${ADMIN_PATH}';
}

// Init
loadDashboard();
</script>
</body></html>`;
}

// ---------- BOOT ----------
loadFromDisk();
initHardcoded();
initCustomAPIs();
saveToDisk();
app.listen(PORT, () => {
  console.log('🚀 BRONX OSINT V502 PRO running on port ' + PORT);
  console.log('📋 Admin: ' + ADMIN_PATH);
});
