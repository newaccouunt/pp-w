// ============================================================
// 🛡️ BRONX OSINT V600 ULTRA PRO — ALL IN ONE
// ✅ Professional UI  ✅ Per-Key Branding  ✅ Custom Messages
// ✅ Full Backup/Restore  ✅ Strict DDoS  ✅ All Features Intact
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
const REAL_API_BASE = 'https://ft-osint-api.duckdns.org/api';
const REAL_API_KEYS = ['bronx-king', 'bronx-ultra-king-ft-bro-op'];
let currentKeyIndex = 0;
const getNextKey = () => { const k = REAL_API_KEYS[currentKeyIndex]; currentKeyIndex = (currentKeyIndex + 1) % REAL_API_KEYS.length; return k; };

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'bronx';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '85095613';
const MASTER_API_KEY = process.env.MASTER_API_KEY || 'BRONX_MASTER_' + crypto.randomBytes(4).toString('hex').toUpperCase();
const ADMIN_PATH = '/bronx-admin-panel';

const DATA_DIR = process.env.RENDER_DATA_DIR || '/tmp';
const F = (n) => path.join(DATA_DIR, n);
const DATA_FILE = F('bronx_v600_data.json');
const LOGS_FILE = F('bronx_v600_logs.json');
const ADMIN_LOGS_FILE = F('bronx_v600_admin_logs.json');
const BACKUP_DIR = F('bronx_backups');

// ============================================================
// 🗄️ STATE
// ============================================================
let keyStorage = {};
let customAPIs = [];
let requestLogs = [];
let adminSessions = {};
let permanentTokens = {};
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

// ============================================================
// 🆕 V600 — GLOBAL BRANDING & CUSTOM MESSAGES
// ============================================================
let branding = {
  enabled: true,
  defaultName: '@BRONX_ULTRA',
  hideFields: ['api_by','by','channel','credit','developer','owner','source','source_url','api_key','key_note'],
  position: 'bottom'
};

let customMessages = {
  keyNotFound:     '🔑 Key not found!\n\n🛒 Purchase: @BRONX_ULTRA',
  limitReached:    '🔴 Daily/Total limit reached',
  keyStopped:      '⛔ This key is stopped by admin',
  keyDisabled:     '🚫 This key is disabled',
  keyExpired:      '⏰ This key has expired',
  scopeDenied:     '🎯 You do not have access to this endpoint',
  maintenance:     '🔧 System under maintenance. Please try again later.',
  bannedIP:        '🚫 Your IP has been banned',
  bannedDevice:    '🚫 Your device has been banned',
  bannedKey:       '🚫 This key has been banned',
  rateLimited:     '🐢 Too many requests. Please slow down.',
  protectedData:   '🔒 This data is protected',
  missingParam:    '⚠️ Missing required parameter',
  invalidKey:      '❌ Invalid or unauthorized key'
};

// ============================================================
// 🎨 THEME
// ============================================================
let theme = {
  preset: 'pro-dark',
  colors: {
    bgPrimary: '#0b0d10', bgSecondary: '#12161b', bgCard: '#161b22',
    borderColor: '#21262d',
    textPrimary: '#e6edf3', textSecondary: '#8b949e', textMuted: '#6e7681',
    accent: '#2f81f7', accent2: '#1f6feb', success: '#3fb950', warning: '#d29922',
    danger: '#f85149', info: '#58a6ff', pink: '#db61a2', purple: '#a371f7', yellow: '#e3b341'
  },
  effects: { snowfall: false, glow: false, rainbowAnim: false, gridBg: false, scanLines: false, particles: false },
  fonts: { heading: 'Inter', body: 'Inter' },
  radius: 8,
  version: 2
};

const PRESETS = {
  'pro-dark': { accent: '#2f81f7', accent2: '#1f6feb', bgPrimary: '#0b0d10', bgSecondary: '#12161b' },
  'pro-light': { accent: '#0969da', accent2: '#0550ae', bgPrimary: '#ffffff', bgSecondary: '#f6f8fa' },
  'midnight': { accent: '#8b5cf6', accent2: '#7c3aed', bgPrimary: '#0a0a14', bgSecondary: '#141428' },
  'neon-red': { accent: '#ff2d2d', accent2: '#ff9500', bgPrimary: '#0a0505', bgSecondary: '#140808' },
  'matrix': { accent: '#00ff00', accent2: '#00aa00', bgPrimary: '#000000', bgSecondary: '#0a0a0a' },
  'ocean': { accent: '#00b8d4', accent2: '#0055aa', bgPrimary: '#020810', bgSecondary: '#0a1424' },
  'sunset': { accent: '#ff6b35', accent2: '#f7b801', bgPrimary: '#1a0e0a', bgSecondary: '#26140e' },
  'gold': { accent: '#ffd700', accent2: '#ff9500', bgPrimary: '#0a0800', bgSecondary: '#141008' }
};

function hexToRgb(hex){ const h=String(hex).replace('#',''); const n=parseInt(h.length===3?h.split('').map(c=>c+c).join(''):h,16); return `${(n>>16)&255},${(n>>8)&255},${n&255}`; }
function hexToRgbStr(hex, alpha=1){ return `rgba(${hexToRgb(hex)},${alpha})`; }
function applyPreset(name){ const p=PRESETS[name]; if(!p) return false; theme.preset=name; theme.colors.accent=p.accent; theme.colors.accent2=p.accent2; theme.colors.bgPrimary=p.bgPrimary; theme.colors.bgSecondary=p.bgSecondary; theme.colors.bgCard=p.bgSecondary; theme.colors.borderColor=`rgba(${hexToRgb(p.accent)},0.2)`; theme.version++; return true; }

// ============================================================
// 🔐 SECURITY
// ============================================================
let bans = { ip: {}, device: {}, key: {} };
let abuseTracker = { ip: {}, device: {}, key: {} };
let deviceFingerprints = {};
let ipRequestCounts = {};
let behaviorTracker = {};
let blocklist = { userAgents: [], paths: [], patterns: [] };
let whitelist = { ips: [], keys: [] };

let ddosConfig = {
  enabled: true, mode: 'smart',
  ip:     { burst10s: 60, perMinute: 200, perHour: 1500, perDay: 15000 },
  device: { burst10s: 80, perMinute: 250, perHour: 2000 },
  key:    { burst10s: 100, perMinute: 400, perHour: 3000 },
  strikes: { warnAt: 1, throttleAt: 2, tempBanAt: 3, longBanAt: 5, permanentAt: 10 },
  tempBanMs: 5 * 60 * 1000,
  longBanMs: 60 * 60 * 1000,
  login: { maxAttempts: 5, banMs: 30 * 60 * 1000 },
  strictConfig: { burst10s: 20, perMinute: 60, perHour: 300 }
};

// ============================================================
// 💾 SAVE / LOAD
// ============================================================
function ensureDirs(){
  try { if(!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true }); } catch(e){}
}

function saveToDisk(){
  try{
    ensureDirs();
    const ks = {};
    Object.entries(keyStorage).forEach(([k,v]) => { if(!v._hardcoded) ks[k] = v; });
    fs.writeFileSync(DATA_FILE, JSON.stringify({
      version: '6.0.0',
      keys: ks, apis: customAPIs, tokens: permanentTokens,
      logs: requestLogs.slice(-2000), protected: protectedData,
      endpointResponses, theme, bans, abuseTracker,
      deviceFingerprints, ddosConfig, blocklist, whitelist,
      announcement, maintenance, auditLog: auditLog.slice(-500),
      branding, customMessages
    }, null, 2));
    fs.writeFileSync(LOGS_FILE, JSON.stringify(keyMonitorLogs.slice(-1000), null, 2));
    fs.writeFileSync(ADMIN_LOGS_FILE, JSON.stringify(adminLogs.slice(-500), null, 2));
  }catch(e){ console.log('Save err:', e.message); }
}

function loadFromDisk(){
  try{
    if(fs.existsSync(DATA_FILE)){
      const d = JSON.parse(fs.readFileSync(DATA_FILE,'utf8'));
      if(d.keys) Object.entries(d.keys).forEach(([k,v]) => keyStorage[k] = v);
      if(d.apis?.length) customAPIs = d.apis;
      if(d.tokens){ permanentTokens = d.tokens; Object.keys(permanentTokens).forEach(t => { adminSessions[t] = { expiresAt: Date.now()+(365*24*60*60*1000), permanent: true }; }); }
      if(d.logs) requestLogs = d.logs;
      if(d.protected) protectedData = d.protected;
      if(d.endpointResponses) endpointResponses = d.endpointResponses;
      if(d.theme) theme = { ...theme, ...d.theme, colors: { ...theme.colors, ...(d.theme.colors||{}) }, effects: { ...theme.effects, ...(d.theme.effects||{}) } };
      if(d.bans) bans = { ...bans, ...d.bans };
      if(d.abuseTracker) abuseTracker = { ...abuseTracker, ...d.abuseTracker };
      if(d.deviceFingerprints) deviceFingerprints = d.deviceFingerprints;
      if(d.ddosConfig) ddosConfig = { ...ddosConfig, ...d.ddosConfig };
      if(d.blocklist) blocklist = d.blocklist;
      if(d.whitelist) whitelist = d.whitelist;
      if(d.announcement) announcement = d.announcement;
      if(d.maintenance) maintenance = d.maintenance;
      if(d.auditLog) auditLog = d.auditLog;
      if(d.branding) branding = { ...branding, ...d.branding };
      if(d.customMessages) customMessages = { ...customMessages, ...d.customMessages };
      return true;
    }
  }catch(e){ console.log('Load err:', e.message); }
  return false;
}
setInterval(saveToDisk, 2 * 60 * 1000);

// ============================================================
// ⏰ TIME
// ============================================================
const getIndiaTime = () => new Date(Date.now() + 5.5*3600*1000);
const getIndiaDate = () => getIndiaTime().toISOString().split('T')[0];
const getIndiaDateTime = () => getIndiaTime().toISOString().replace('T',' ').substring(0,19);
const isKeyExpired = (d) => d && d !== 'LIFETIME' && getIndiaTime() > new Date(d);
function parseExpiryDate(s){
  if(!s || s === 'LIFETIME') return null;
  const p = String(s).split('-');
  if(p.length === 3) return p[0].length === 4 ? new Date(+p[0], +p[1]-1, +p[2], 23, 59, 59) : new Date(+p[2], +p[1]-1, +p[0], 23, 59, 59);
  const d = new Date(s); return isNaN(d) ? null : d;
}
function logAudit(user, action, details){
  auditLog.push({ user, action, details, timestamp: getIndiaDateTime() });
  if(auditLog.length > 500) auditLog = auditLog.slice(-500);
}

// ============================================================
// 📱 DEVICE
// ============================================================
function getRealIP(req){
  return (req.headers['x-forwarded-for']?.split(',')[0].trim()) || req.headers['x-real-ip'] || req.headers['cf-connecting-ip'] || req.connection?.remoteAddress || req.socket?.remoteAddress || 'Unknown';
}
function generateDeviceId(req){
  const ua = req.headers['user-agent'] || '';
  const lang = req.headers['accept-language'] || '';
  const enc = req.headers['accept-encoding'] || '';
  const plat = req.headers['sec-ch-ua-platform'] || '';
  return 'DEV_' + crypto.createHash('md5').update(`${ua}|${lang}|${enc}|${plat}`).digest('hex').substring(0, 16).toUpperCase();
}
function detectDeviceType(req){
  const ua = (req.headers['user-agent'] || '').toLowerCase();
  if(/iphone|ipad|ipod/.test(ua)) return { type:'iPhone/iPad', icon:'📱', os:'iOS' };
  if(/samsung|sm-/.test(ua)) return { type:'Samsung', icon:'📱', os:'Android' };
  if(/infinix/.test(ua)) return { type:'Infinix', icon:'📱', os:'Android' };
  if(/xiaomi|redmi|poco|mi /.test(ua)) return { type:'Xiaomi/Redmi', icon:'📱', os:'Android' };
  if(/oppo|cph/.test(ua)) return { type:'Oppo', icon:'📱', os:'Android' };
  if(/vivo/.test(ua)) return { type:'Vivo', icon:'📱', os:'Android' };
  if(/oneplus/.test(ua)) return { type:'OnePlus', icon:'📱', os:'Android' };
  if(/realme/.test(ua)) return { type:'Realme', icon:'📱', os:'Android' };
  if(/huawei|honor/.test(ua)) return { type:'Huawei/Honor', icon:'📱', os:'Android' };
  if(/android/.test(ua)) return { type:'Android', icon:'📱', os:'Android' };
  if(/windows nt 10/.test(ua)) return { type:'Windows 10/11', icon:'💻', os:'Windows' };
  if(/windows/.test(ua)) return { type:'Windows', icon:'💻', os:'Windows' };
  if(/macintosh|mac os x/.test(ua)) return { type:'MacBook/Mac', icon:'💻', os:'macOS' };
  if(/linux/.test(ua)) return { type:'Linux PC', icon:'💻', os:'Linux' };
  if(/curl|wget|python|node|axios|java|php|ruby|go-http/.test(ua)) return { type:'Bot/CLI', icon:'🤖', os:'Bot' };
  return { type:'Unknown', icon:'❓', os:'Unknown' };
}
function detectBrowser(req){
  const ua = (req.headers['user-agent'] || '').toLowerCase();
  if(/edg\//.test(ua)) return 'Edge';
  if(/opr\/|opera/.test(ua)) return 'Opera';
  if(/brave/.test(ua)) return 'Brave';
  if(/chrome|crios/.test(ua)) return 'Chrome';
  if(/firefox|fxios/.test(ua)) return 'Firefox';
  if(/safari/.test(ua)) return 'Safari';
  if(/postman/.test(ua)) return 'Postman';
  if(/curl/.test(ua)) return 'cURL';
  if(/python/.test(ua)) return 'Python';
  if(/node|axios/.test(ua)) return 'Node.js';
  return 'Unknown';
}
function detectCountry(req){ return req.headers['cf-ipcountry'] || req.headers['x-country'] || 'Unknown'; }

// ============================================================
// 🧠 SMART DDOS
// ============================================================
function isBanned(type, id){
  const b = bans[type]?.[id]; if(!b) return false;
  if(b.permanent) return true;
  if(Date.now() < b.until) return true;
  delete bans[type][id]; return false;
}
function pushHit(bucket, id, maxWindow = 24*3600000){
  const now = Date.now();
  if(!bucket[id]) bucket[id] = { hits: [], strikes: 0, warned: 0 };
  bucket[id].hits = bucket[id].hits.filter(t => t > now - maxWindow);
  bucket[id].hits.push(now);
}
function countWindow(bucket, id, ms){
  const now = Date.now();
  return (bucket[id]?.hits || []).filter(t => t > now - ms).length;
}
function strike(bucket, id, reason, ctx = {}){
  if(!bucket[id]) bucket[id] = { hits: [], strikes: 0, warned: 0 };
  bucket[id].strikes++;
  const s = bucket[id].strikes; const c = ddosConfig.strikes;
  if(s >= c.permanentAt){ if(!bans[ctx.type]) bans[ctx.type] = {}; bans[ctx.type][id] = { permanent: true, reason, at: getIndiaDateTime(), strikes: s }; return { action:'PERMANENT_BAN' }; }
  if(s >= c.longBanAt){ if(!bans[ctx.type]) bans[ctx.type] = {}; bans[ctx.type][id] = { until: Date.now() + ddosConfig.longBanMs, reason, at: getIndiaDateTime(), strikes: s }; return { action:'LONG_BAN' }; }
  if(s >= c.tempBanAt){ if(!bans[ctx.type]) bans[ctx.type] = {}; bans[ctx.type][id] = { until: Date.now() + ddosConfig.tempBanMs, reason, at: getIndiaDateTime(), strikes: s }; return { action:'TEMP_BAN' }; }
  if(s >= c.throttleAt) return { action:'THROTTLE' };
  return { action:'WARN' };
}
function smartDDoS(req){
  if(!ddosConfig.enabled || ddosConfig.mode === 'off') return { allowed: true };
  const ip = getRealIP(req);
  const deviceId = generateDeviceId(req);
  const key = req.query.key || req.headers['x-api-key'] || '';
  if(whitelist.ips.includes(ip)) return { allowed: true, action: 'WHITELISTED' };
  if(isBanned('ip', ip)) return { allowed:false, code:403, reason: customMessages.bannedIP, type:'ip', id:ip, action:'BANNED' };
  if(isBanned('device', deviceId)) return { allowed:false, code:403, reason: customMessages.bannedDevice, type:'device', id:deviceId, action:'BANNED' };
  if(key && isBanned('key', key)) return { allowed:false, code:403, reason: customMessages.bannedKey, type:'key', id:key, action:'BANNED' };

  const ipLim = ddosConfig.mode === 'strict' ? { ...ddosConfig.ip, ...ddosConfig.strictConfig } : ddosConfig.ip;
  const devLim = ddosConfig.mode === 'strict' ? { ...ddosConfig.device, ...ddosConfig.strictConfig } : ddosConfig.device;
  const keyLim = ddosConfig.mode === 'strict' ? { ...ddosConfig.key, ...ddosConfig.strictConfig } : ddosConfig.key;

  pushHit(abuseTracker.ip, ip);
  pushHit(abuseTracker.device, deviceId);
  if(key) pushHit(abuseTracker.key, key);

  const check = (type, id, limits, bucket) => {
    const b10 = countWindow(bucket, id, 10000);
    const b1m = countWindow(bucket, id, 60000);
    const b1h = countWindow(bucket, id, 3600000);
    if(b10 > limits.burst10s) return strike(bucket, id, `Burst ${b10}/10s`, { type });
    if(b1m > limits.perMinute) return strike(bucket, id, `Rate ${b1m}/min`, { type });
    if(b1h > limits.perHour) return strike(bucket, id, `Rate ${b1h}/hour`, { type });
    return null;
  };
  let r = check('ip', ip, ipLim, abuseTracker.ip);
  if(r) return { allowed: !r.action.includes('BAN'), code: r.action.includes('BAN') ? 403 : 200, reason: customMessages.rateLimited, action: r.action, type:'ip', id:ip };
  r = check('device', deviceId, devLim, abuseTracker.device);
  if(r) return { allowed: !r.action.includes('BAN'), code: r.action.includes('BAN') ? 403 : 200, reason: customMessages.rateLimited, action: r.action, type:'device', id:deviceId };
  if(key){
    r = check('key', key, keyLim, abuseTracker.key);
    if(r) return { allowed: !r.action.includes('BAN'), code: r.action.includes('BAN') ? 403 : 200, reason: customMessages.rateLimited, action: r.action, type:'key', id:key };
  }
  return { allowed: true, action: 'OK' };
}

// ============================================================
// 🔑 KEY VALIDATION
// ============================================================
function checkCooldown(k){
  const kd = keyStorage[k]; if(!kd?.cooldown) return { allowed: true };
  const n = Date.now();
  if(cooldownTimers[k] && (n - cooldownTimers[k]) < kd.cooldown*1000)
    return { allowed: false, remaining: Math.ceil((kd.cooldown*1000 - (n - cooldownTimers[k]))/1000) };
  cooldownTimers[k] = n; return { allowed: true };
}
function checkPerSecondLimit(k){
  const kd = keyStorage[k]; if(!kd?.perSecondLimit) return { allowed: true };
  const wk = k + '_ps_' + Math.floor(Date.now()/1000);
  if(!perSecondLimits[wk]) perSecondLimits[wk] = 0;
  if(perSecondLimits[wk] >= kd.perSecondLimit) return { allowed: false, message: `⚡ ${kd.perSecondLimit}/s reached` };
  perSecondLimits[wk]++; return { allowed: true };
}
function checkDailyLimit(k){
  const kd = keyStorage[k]; if(!kd?.dailyLimit) return { allowed: true };
  const dk = k + '_' + getIndiaDate();
  if(!dailyLimits[dk]) dailyLimits[dk] = 0;
  if(dailyLimits[dk] >= kd.dailyLimit) return { allowed: false, message: customMessages.limitReached };
  return { allowed: true };
}
function isProtected(value){
  for(const key in protectedData){ if(String(value).includes(protectedData[key])) return protectedData[key]; }
  return null;
}
function checkKeyValid(k){
  if(!k) return { valid: false, error: customMessages.invalidKey };
  if(maintenance.enabled && !whitelist.keys.includes(k)) return { valid: false, error: customMessages.maintenance };
  const kd = keyStorage[k];
  if(!kd) return { valid: false, error: customMessages.keyNotFound };
  if(kd.stopped) return { valid: false, error: customMessages.keyStopped };
  if(kd.disabled) return { valid: false, error: customMessages.keyDisabled };
  if(kd.expiry && isKeyExpired(kd.expiry)) return { valid: false, error: customMessages.keyExpired };
  if(!kd.unlimited && kd.used >= kd.limit) return { valid: false, error: customMessages.limitReached };
  const dl = checkDailyLimit(k); if(!dl.allowed) return { valid: false, error: dl.message };
  const ps = checkPerSecondLimit(k); if(!ps.allowed) return { valid: false, error: ps.message };
  const cd = checkCooldown(k); if(!cd.allowed) return { valid: false, error: '⏱️ Cooldown ' + cd.remaining + 's' };
  return { valid: true, keyData: kd };
}
function incrementKeyUsage(k, ep, req){
  const ip = getRealIP(req);
  const deviceId = generateDeviceId(req);
  const di = detectDeviceType(req);
  const browser = detectBrowser(req);
  const country = detectCountry(req);
  if(keyStorage[k] && !keyStorage[k].unlimited){
    keyStorage[k].used++;
    const dk = k + '_' + getIndiaDate();
    dailyLimits[dk] = (dailyLimits[dk] || 0) + 1;
    if(keyStorage[k].used % 5 === 0) saveToDisk();
  }
  if(!deviceFingerprints[deviceId]){
    deviceFingerprints[deviceId] = { firstSeen: getIndiaDateTime(), lastSeen:'', requests: 0, userAgent: req.headers['user-agent']||'', browser, deviceType: di.type, deviceIcon: di.icon, os: di.os, ips: [], countries: [] };
  }
  const df = deviceFingerprints[deviceId];
  df.lastSeen = getIndiaDateTime(); df.requests++;
  if(!df.ips.includes(ip)){ df.ips.push(ip); if(df.ips.length>10) df.ips = df.ips.slice(-10); }
  if(country !== 'Unknown' && !df.countries.includes(country)) df.countries.push(country);
  if(!ipRequestCounts[ip] || ipRequestCounts[ip].date !== getIndiaDate()) ipRequestCounts[ip] = { count: 0, date: getIndiaDate() };
  ipRequestCounts[ip].count++;
  keyMonitorLogs.push({ key: k.substring(0,8)+'***', fullKey: k, endpoint: ep, ip, deviceId, deviceIcon: di.icon, deviceType: di.type, browser, clientType: browser, country, timestamp: getIndiaDateTime(), date: getIndiaDate() });
  if(keyMonitorLogs.length > 1000) keyMonitorLogs = keyMonitorLogs.slice(-1000);
}

function checkKeyScope(kd, ep){
  if(!kd?.scopes?.length) return { valid: false, error: customMessages.scopeDenied };
  if(kd.scopes.includes('*')) return { valid: true };
  if(kd.scopes.includes(ep)) return { valid: true };
  const cleanEp = ep.startsWith('c/') ? ep.substring(2) : ep;
  const isCustom = customAPIs.some(a => a.endpoint === cleanEp);
  if(isCustom){
    if(kd.scopes.includes('custom')) return { valid: true };
    if(kd.scopes.includes('custom:' + cleanEp)) return { valid: true };
  }
  return { valid: false, error: customMessages.scopeDenied };
}

const genToken = () => crypto.randomBytes(24).toString('base64url');
const genRandomKey = (p='BRONX') => `${p}_${crypto.randomBytes(10).toString('hex').toUpperCase()}`;
function isAdminAuth(t){
  if(!t) return false;
  if(adminSessions[t]){
    if(adminSessions[t].permanent) return true;
    if(Date.now() < adminSessions[t].expiresAt) return true;
    delete adminSessions[t]; delete permanentTokens[t];
  }
  return false;
}

function applyBranding(data, keyData){
  if(!data) return data;
  try{
    const c = JSON.parse(JSON.stringify(data));
    const hideList = [...(branding.hideFields||[])];
    if(keyData?.hideFields?.length) hideList.push(...keyData.hideFields);
    hideList.forEach(x => { delete c[x]; if(c.meta) delete c.meta[x]; });
    if(c.meta && !Object.keys(c.meta).length) delete c.meta;
    if(branding.enabled && branding.position !== 'off'){
      const name = keyData?.customDeveloperName || branding.defaultName || '@BRONX_ULTRA';
      if(branding.position === 'top') return { developer: name, ...c };
      c.developer = name;
    }
    return c;
  }catch(e){ return data; }
}
function sanitizeResponse(d){ return applyBranding(d, null); }
function esc(s){ return s ? String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'})[m]) : ''; }

// ============================================================
// 📋 ENDPOINTS
// ============================================================
const endpoints = {
  number:{p:'num',i:'📱',e:'9876543210',d:'Mobile Lookup',c:'phone'},
  aadhar:{p:'num',i:'🆔',e:'393933081942',d:'Aadhaar',c:'phone'},
  leakinfo:{p:'term',i:'🕵️',e:'email@example.com',d:'Leak Info',c:'phone'},
  name:{p:'name',i:'🔍',e:'abhiraaj',d:'Name Search',c:'phone'},
  numv2:{p:'num',i:'📱',e:'6205949840',d:'Number v2',c:'phone'},
  adv:{p:'num',i:'📱',e:'9876543210',d:'Advanced Intel',c:'phone'},
  adharfamily:{p:'num',i:'👨‍👩‍👧‍👦',e:'984154610245',d:'Family',c:'phone'},
  adharration:{p:'num',i:'📋',e:'701984830542',d:'Ration Card',c:'phone'},
  imei:{p:'imei',i:'📱',e:'357817383506298',d:'IMEI',c:'phone'},
  calltracer:{p:'num',i:'📞',e:'9876543210',d:'Call Tracer',c:'phone'},
  challan:{p:'vehicle',i:'📋',e:'UP42BB2572',d:'Challan',c:'vehicle'},
  numleak:{p:'num',i:'🔓',e:'9876543210',d:'Number Leak',c:'phone'},
  bomber:{p:'number',i:'💣',e:'9876543210',d:'SMS Bomber',c:'phone'},
  numtoupi:{p:'num',i:'💳',e:'8945996482',d:'Num to UPI',c:'finance'},
  upi:{p:'upi',i:'💰',e:'example@ybl',d:'UPI',c:'finance'},
  ifsc:{p:'ifsc',i:'🏦',e:'SBIN0001234',d:'IFSC',c:'finance'},
  pan:{p:'pan',i:'📄',e:'AXDPR2606K',d:'PAN',c:'finance'},
  pincode:{p:'pin',i:'📍',e:'110001',d:'Pincode',c:'location'},
  ip:{p:'ip',i:'🌐',e:'8.8.8.8',d:'IP Lookup',c:'location'},
  vehicle:{p:'vehicle',i:'🚗',e:'MH02FZ0555',d:'Vehicle',c:'vehicle'},
  rc:{p:'owner',i:'📋',e:'UP92P2111',d:'veh2num',c:'vehicle'},
  veh2num:{p:'vehicle',i:'🚗',e:'KL41V3504',d:'Veh to Num',c:'vehicle'},
  ff:{p:'uid',i:'🎮',e:'123456789',d:'Free Fire',c:'gaming'},
  bgmi:{p:'uid',i:'🎮',e:'5121439477',d:'BGMI',c:'gaming'},
  insta:{p:'username',i:'📸',e:'cristiano',d:'Instagram',c:'social'},
  git:{p:'username',i:'💻',e:'ftgamer2',d:'GitHub',c:'social'},
  tg:{p:'info',i:'📲',e:'JAUUOWNER',d:'Telegram',c:'social'},
  tgidinfo:{p:'id',i:'📲',e:'7530266953',d:'TG ID Info',c:'social'},
  snap:{p:'username',i:'👻',e:'priyapanchal272',d:'Snapchat',c:'social'},
  pk:{p:'num',i:'🇵🇰',e:'03331234567',d:'Pakistan',c:'pakistan'},
  pkv2:{p:'num',i:'🇵🇰',e:'3359736848',d:'Pakistan v2',c:'pakistan'}
};

// ============================================================
// 🎬 INIT
// ============================================================
function initHardcoded(){
  const now = getIndiaDateTime();
  const hc = [
    ['BRONX_PREMIUM_V100_01','Premium 01',999999,'31-12-2028',['*']],
    ['BRONX_PREMIUM_V100_02','Premium 02',999999,'31-12-2028',['*']],
    ['BRONX_ULTRA_OSINT_01','Ultra 01',888888,'30-06-2029',['number','aadhar','upi','pan']],
    ['BRONX_KING_OP_V100','King OP',999999,'31-12-2030',['*']],
    ['BRONX_GOD_TIER_V100','God Tier',999999,'31-12-2030',['*']]
  ];
  hc.forEach(([k,n,l,e,s]) => {
    if(!keyStorage[k]) keyStorage[k] = { name:n, scopes:s, type:'hardcoded', limit:l, used:0, cooldown:0, dailyLimit:0, perSecondLimit:0, expiry:parseExpiryDate(e), expiryStr:e, created:now, unlimited:true, hidden:true, _hardcoded:true };
  });
}
function initCustomAPIs(){
  customAPIs = [
    { id: Date.now()+1, name:'Number Info', endpoint:'number-advanced', param:'num', example:'9876543210', visible:true, realAPI:'https://num-tg-info-api.vercel.app/info?number={param}', scopeKey:'custom:number-advanced' },
    { id: Date.now()+2, name:'Vehicle RC', endpoint:'rc-details', param:'ca_number', example:'MH02FZ0555', visible:true, realAPI:'https://simple-rc-info.vercel.app/rc?num={param}', scopeKey:'custom:rc-details' },
    { id: Date.now()+3, name:'Aadhar', endpoint:'aadhar-verify', param:'aadhar', example:'393933081942', visible:true, realAPI:'https://bronx-king-vip999.vercel.app/api/aadhaar?num={param}', scopeKey:'custom:aadhar-verify' },
    { id: Date.now()+4, name:'Email', endpoint:'email-lookup', param:'mail', example:'user@gmail.com', visible:true, realAPI:'https://bronx-king-mail-opi.vercel.app/mail={param}', scopeKey:'custom:email-lookup' },
    { id: Date.now()+5, name:'Telegram', endpoint:'telegram-scan', param:'id', example:'7530266953', visible:true, realAPI:'https://bronx-tg-king-bro.vercel.app/tg?key=BRONXop&query={param}', scopeKey:'custom:telegram-scan' },
    { id: Date.now()+6, name:'SMS Bomber', endpoint:'sms-bomber', param:'number', example:'1234567890', visible:true, realAPI:'https://bronx-sms-api-ulimate.vercel.app/api/key-bronx-paid-vip?number={param}&counter=10', scopeKey:'custom:sms-bomber' },
    { id: Date.now()+7, name:'Number Backup', endpoint:'num-op', param:'num', example:'9876543210', visible:true, realAPI:'https://tfqdeadlo-inddataapi.hf.space/search?mobile={param}', scopeKey:'custom:num-op' }
  ];
}

// ============================================================
// 🌐 MIDDLEWARE
// ============================================================
app.use(express.json({limit:'50mb'}));
app.use(express.urlencoded({extended:true, limit:'50mb'}));
app.set('json spaces', 2);
app.use((req,res,next) => {
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type,x-api-key,x-admin-token');
  if(req.method === 'OPTIONS') return res.status(200).end();
  next();
});
app.use('/api', (req,res,next) => {
  const r = smartDDoS(req);
  res.setHeader('X-RateLimit-Mode', ddosConfig.mode);
  if(!r.allowed) return res.status(r.code || 429).json({ error: r.reason || customMessages.rateLimited, type: r.type || 'unknown', action: r.action || 'BLOCKED' });
  if(r.action === 'THROTTLE') return setTimeout(() => next(), 800);
  next();
});

// ============================================================
// 🔧 FIX #1 — generateCSS() (MISSING THA — ADDED)
// ============================================================
function generateCSS(){
  const c = theme.colors;
  return `<style>
:root{
  --bg-primary:${c.bgPrimary};
  --bg-secondary:${c.bgSecondary};
  --bg-card:${c.bgCard};
  --border-color:${c.borderColor};
  --text-primary:${c.textPrimary};
  --text-secondary:${c.textSecondary};
  --text-muted:${c.textMuted};
  --accent:${c.accent};
  --accent2:${c.accent2};
  --success:${c.success};
  --warning:${c.warning};
  --danger:${c.danger};
  --info:${c.info};
  --pink:${c.pink};
  --purple:${c.purple};
  --yellow:${c.yellow};
  --font-main:'Inter',sans-serif;
  --font-mono:'JetBrains Mono',monospace;
  --radius:${theme.radius}px;
  --tr:all .18s ease;
  --shadow-md:0 6px 24px rgba(0,0,0,.35);
}
*{margin:0;padding:0;box-sizing:border-box}
html,body{font-family:var(--font-main);color:var(--text-primary);-webkit-font-smoothing:antialiased}
a{color:var(--accent);text-decoration:none}
a:hover{text-decoration:underline}
code,pre{font-family:var(--font-mono)}
::-webkit-scrollbar{width:8px;height:8px}
::-webkit-scrollbar-track{background:var(--bg-secondary)}
::-webkit-scrollbar-thumb{background:${hexToRgbStr(c.accent,.35)};border-radius:4px}
::-webkit-scrollbar-thumb:hover{background:${hexToRgbStr(c.accent,.55)}}
button{font-family:inherit;cursor:pointer}
input,select,textarea{font-family:inherit}
${theme.effects.glow ? `*{text-shadow:0 0 8px ${hexToRgbStr(c.accent,.4)}}` : ''}
${theme.effects.gridBg ? `body{background-image:linear-gradient(${hexToRgbStr(c.accent,.06)} 1px,transparent 1px),linear-gradient(90deg,${hexToRgbStr(c.accent,.06)} 1px,transparent 1px);background-size:40px 40px}` : ''}
${theme.effects.scanLines ? `body::after{content:'';position:fixed;inset:0;background:repeating-linear-gradient(0deg,rgba(0,0,0,.1) 0,rgba(0,0,0,.1) 1px,transparent 1px,transparent 3px);pointer-events:none;z-index:9999}` : ''}
</style>`;
}


// ============================================================
// 🏠 PUBLIC HOME PAGE — FTOSINT STYLE (BRONX BRANDED)
// ✅ Admin-controlled response section
// ✅ Professional docs layout
// ============================================================
function renderHome(){
  const c = theme.colors;
  const endpCount = Object.keys(endpoints).length;
  const customVisible = customAPIs.filter(a => a.visible);
  const customCount = customVisible.length;
  const totalKeys = Object.keys(keyStorage).length;

  // Group built-in endpoints by category
  const grouped = {};
  Object.entries(endpoints).forEach(([name, e]) => {
    const cat = e.c || 'other';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push({ name, ...e });
  });

  const catMeta = {
    phone:    { icon:'fa-mobile-screen', label:'Phone Intelligence',   color: c.info },
    finance:  { icon:'fa-building-columns', label:'Financial',         color: c.success },
    location: { icon:'fa-location-dot', label:'Location',             color: c.warning },
    vehicle:  { icon:'fa-car', label:'Vehicle',                       color: c.pink },
    gaming:   { icon:'fa-gamepad', label:'Gaming',                    color: c.purple },
    social:   { icon:'fa-hashtag', label:'Social',                    color: c.accent },
    pakistan: { icon:'fa-flag', label:'Pakistan',                     color: c.success },
    other:    { icon:'fa-wrench', label:'Other',                      color: c.textMuted }
  };

  // Admin-controlled response sample (per endpoint)
const getResponse = (ep) => {
  const custom = endpointResponses[ep];
  if (custom) {
    // 🔧 FIX: object ho ya string ho — dono handle karo
    if (typeof custom === 'string') {
      try {
        const parsed = JSON.parse(custom);
        return JSON.stringify(parsed, null, 2);
      } catch {
        return custom;
      }
    }
    return JSON.stringify(custom, null, 2);
  }
  return `{
  "success": true,
  "endpoint": "${ep}",
  "data": "Add response sample from Admin Panel"
}`;
};

  const annBanner = announcement.enabled ? (() => {
    const typeColor = {
      info:    { bg:'rgba(88,166,255,.15)',  border: c.info,    color: c.info },
      warning: { bg:'rgba(210,153,34,.15)',  border: c.warning, color: c.warning },
      success: { bg:'rgba(63,185,80,.15)',   border: c.success, color: c.success }
    }[announcement.type || 'info'];
    return `<div class="announce-bar" style="background:${typeColor.bg};border-color:${typeColor.border};color:${typeColor.color}"><i class="fas fa-bullhorn"></i><span>${esc(announcement.text)}</span></div>`;
  })() : '';

  const maintBanner = maintenance.enabled ? `
    <div class="announce-bar" style="background:rgba(248,81,73,.15);border-color:${c.danger};color:${c.danger}">
      <i class="fas fa-wrench"></i><span>🔧 ${esc(maintenance.message)}</span>
    </div>` : '';

  const brandName = branding.enabled ? (branding.defaultName || '@BRONX_ULTRA') : 'BRONX';

  const navCats = Object.keys(grouped).map(cat => {
    const meta = catMeta[cat] || catMeta.other;
    return `<a href="#cat-${cat}" onclick="scrollToCat(event,'cat-${cat}')"><i class="fas ${meta.icon}"></i> ${meta.label}</a>`;
  }).join('');

  // Build all endpoint sections
  const buildEndpoints = () => {
    let html = '';
    Object.keys(grouped).forEach(cat => {
      const meta = catMeta[cat] || catMeta.other;
      const list = grouped[cat];
      html += `
      <section class="cat-section" id="cat-${cat}">
        <div class="cat-header">
          <div class="cat-icon" style="background:${hexToRgbStr(meta.color,.12)};border-color:${hexToRgbStr(meta.color,.3)}">
            <i class="fas ${meta.icon}" style="color:${meta.color}"></i>
          </div>
          <div>
            <div class="cat-name">${meta.label}</div>
            <div class="cat-count">${list.length} endpoint${list.length>1?'s':''}</div>
          </div>
        </div>
        ${list.map(e => `
          <div class="ep" id="ep-${e.name}">
            <div class="ep-h" onclick="toggleEp(this)">
              <span class="meth get">GET</span>
              <span class="ep-path">/api/key-bronx/${e.name}</span>
              <span class="ep-desc">${e.d}</span>
              <i class="fas fa-chevron-down arrow"></i>
            </div>
            <div class="ep-b"><div class="ep-bi">
              <table class="pt">
                <thead><tr><th>Param</th><th>Type</th><th>Required</th><th>Description</th></tr></thead>
                <tbody>
                  <tr><td><code>key</code></td><td>string</td><td><span class="req">required</span></td><td>Your API key</td></tr>
                  <tr><td><code>${e.p}</code></td><td>string</td><td><span class="req">required</span></td><td>${e.d} value (e.g. ${e.e})</td></tr>
                </tbody>
              </table>
              <div class="cb-wrap">
                <div class="cb-label">REQUEST <button class="cp-btn" onclick="copyText('/api/key-bronx/${e.name}?key=YOUR_KEY&${e.p}=${e.e}')"><i class="far fa-copy"></i> COPY</button></div>
                <div class="req-line">GET /api/key-bronx/${e.name}?key=YOUR_KEY&${e.p}=${e.e}</div>
              </div>
              <div class="cb-wrap">
                <div class="cb-label">RESPONSE</div>
                <pre>${esc(getResponse(e.name))}</pre>
              </div>
            </div></div>
          </div>
        `).join('')}
      </section>`;
    });
    return html;
  };

  // Custom APIs section
  const buildCustom = () => {
    if(!customCount) return '';
    return `
    <section class="cat-section" id="cat-custom">
      <div class="cat-header">
        <div class="cat-icon" style="background:${hexToRgbStr(c.accent,.12)};border-color:${hexToRgbStr(c.accent,.3)}">
          <i class="fas fa-plug" style="color:${c.accent}"></i>
        </div>
        <div>
          <div class="cat-name">Custom APIs</div>
          <div class="cat-count">${customCount} available</div>
        </div>
      </div>
      ${customVisible.map(a => `
        <div class="ep" id="ep-custom-${a.endpoint}">
          <div class="ep-h" onclick="toggleEp(this)">
            <span class="meth get">GET</span>
            <span class="ep-path">/api/custom/${a.endpoint}</span>
            <span class="ep-desc">${esc(a.name)}</span>
            <i class="fas fa-chevron-down arrow"></i>
          </div>
          <div class="ep-b"><div class="ep-bi">
            <table class="pt">
              <thead><tr><th>Param</th><th>Type</th><th>Required</th><th>Description</th></tr></thead>
              <tbody>
                <tr><td><code>key</code></td><td>string</td><td><span class="req">required</span></td><td>Your API key</td></tr>
                <tr><td><code>${a.param || 'number'}</code></td><td>string</td><td><span class="req">required</span></td><td>${esc(a.name)} value (e.g. ${esc(a.example)})</td></tr>
              </tbody>
            </table>
            <div class="cb-wrap">
              <div class="cb-label">REQUEST <button class="cp-btn" onclick="copyText('/api/custom/${a.endpoint}?key=YOUR_KEY&${a.param||'number'}=${a.example||''}')"><i class="far fa-copy"></i> COPY</button></div>
              <div class="req-line">GET /api/custom/${a.endpoint}?key=YOUR_KEY&${a.param||'number'}=${esc(a.example||'')}</div>
            </div>
            <div class="cb-wrap">
              <div class="cb-label">RESPONSE</div>
              <pre>${esc(getResponse(a.endpoint))}</pre>
            </div>
          </div></div>
        </div>
      `).join('')}
    </section>`;
  };

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>BRONX OSINT V600 ULTRA — API Documentation</title>
<meta name="description" content="BRONX API documentation — authentication, rate limits, error codes & full endpoint reference.">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;600;700&family=DM+Sans:wght@400;500;700&family=JetBrains+Mono:wght@400&display=swap" rel="stylesheet">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:${c.bgPrimary};--bg1:${c.bgSecondary};--bg2:${c.bgCard};--bg3:${c.borderColor};
  --bd:${c.borderColor};--bd2:${hexToRgbStr(c.accent,.35)};
  --tx:${c.textPrimary};--tx2:${c.textSecondary};--tx3:${c.textMuted};
  --ac:${c.accent};--acv:${c.accent2};--ac2:${hexToRgbStr(c.accent,.12)};--ac3:${hexToRgbStr(c.accent,.06)};
  --gr:${c.success};--gr2:${hexToRgbStr(c.success,.1)};
  --rd:${c.danger};--rd2:${hexToRgbStr(c.danger,.15)};--yw:${c.warning};
  --font:'DM Sans',system-ui,sans-serif;--mono:'JetBrains Mono',monospace;--display:'Space Grotesk',sans-serif;
}
html{scroll-behavior:smooth;scrollbar-width:thin;scrollbar-color:var(--bd2) transparent;overflow-x:hidden}
body{font-family:var(--font);background:var(--bg);background-image:radial-gradient(at top center, ${hexToRgbStr(c.accent,.08)} 0%, transparent 80%);color:var(--tx);font-size:14px;line-height:1.6;-webkit-font-smoothing:antialiased;overflow-x:hidden}
a{color:var(--ac);text-decoration:none}a:hover{opacity:.8}
::-webkit-scrollbar{width:6px;height:6px}::-webkit-scrollbar-thumb{background:var(--bd2);border-radius:99px}
.wrap{display:flex;min-height:100vh}
.sb-overlay{position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:150;pointer-events:none;opacity:0;backdrop-filter:blur(6px);transition:opacity .3s}
.sb-overlay.show{pointer-events:auto;opacity:1}
.sb{width:270px;flex-shrink:0;background:rgba(1,2,4,.85);border-right:1px solid var(--bd);backdrop-filter:blur(24px);position:sticky;top:0;height:100vh;overflow-y:auto;display:flex;flex-direction:column;transition:transform .3s}
.sb-head{padding:24px 20px 18px;border-bottom:1px solid var(--bd);background:linear-gradient(135deg,${hexToRgbStr(c.accent,.10)} 0%,transparent 60%)}
.sb-title{font-family:var(--display);font-size:26px;letter-spacing:1px;line-height:1;margin-bottom:4px;background:linear-gradient(135deg,var(--ac),${hexToRgbStr(c.accent2,1)});-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.sb-sub{font-size:11px;color:var(--tx3);letter-spacing:3px;text-transform:uppercase;margin-bottom:10px}
.docs-sb-search{position:relative;padding:12px 10px;border-bottom:1px solid var(--bd)}
.docs-sb-search i{position:absolute;left:18px;top:50%;transform:translateY(-50%);color:var(--tx3);font-size:12px;pointer-events:none;z-index:1}
.docs-sb-search input{width:100%;background:var(--bg2);border:1px solid var(--bd);border-radius:8px;padding:7px 10px 7px 28px;color:var(--tx);font-size:12px;font-family:var(--font);outline:none;transition:border-color .2s,box-shadow .2s}
.docs-sb-search input:focus{border-color:var(--ac);box-shadow:0 0 0 3px var(--ac3)}
.sb-body{flex:1;padding:12px 10px;overflow-y:auto}
.sb-sec{font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--tx3);padding:14px 8px 6px;display:flex;align-items:center;gap:7px}
.sb-sec i{color:var(--ac);opacity:.7}
.sba{display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:8px;font-size:12px;font-weight:500;color:var(--tx2);transition:all .15s;border-left:2px solid transparent;margin-bottom:2px;cursor:pointer}
.sba:hover{background:var(--bg3);color:var(--tx);border-left-color:var(--bd2)}
.sba.on{background:var(--ac2);color:var(--ac);border-left-color:var(--ac)}
.sba i{width:16px;text-align:center;font-size:14px;opacity:.7}
.mtag{background:var(--gr2);color:var(--gr);border:1px solid ${hexToRgbStr(c.success,.2)};border-radius:4px;font-size:9px;font-weight:700;padding:2px 6px;letter-spacing:1px;flex-shrink:0}
.sb-foot{padding:12px 10px;border-top:1px solid var(--bd)}
.sb-link{display:flex;align-items:center;gap:8px;padding:8px 9px;border-radius:8px;font-size:12px;color:var(--ac);font-weight:600;transition:all .15s}
.sb-link:hover{background:var(--ac2)}
.main{flex:1;min-width:0}
.topbar{display:flex;align-items:center;justify-content:space-between;gap:12px;height:60px;padding:0 24px;border-bottom:1px solid ${hexToRgbStr(c.accent,.08)};background:rgba(7,10,19,.72);backdrop-filter:blur(18px);position:sticky;top:0;z-index:90}
.tb-link{font-size:12.5px;font-weight:600;color:var(--tx2);transition:color .2s}
.tb-link:hover{color:#fff;opacity:1}
.tb-cta{background:rgba(15,23,42,.6);color:#e2e8f0;font-weight:700;padding:9px 16px;border-radius:999px;border:1px solid ${hexToRgbStr(c.accent,.25)};font-size:12px;letter-spacing:.5px;display:inline-flex;align-items:center;gap:7px;transition:all .2s;white-space:nowrap}
.tb-cta:hover{border-color:${hexToRgbStr(c.accent,.45)};background:${hexToRgbStr(c.accent,.08)};transform:translateY(-1px);opacity:1}
@media(max-width:640px){.tb-link{display:none}}
.mob-btn{display:none;background:none;border:none;color:var(--tx2);cursor:pointer;font-size:20px;padding:4px}
.sb-close{display:none}
.content{padding:48px 52px 80px;max-width:900px;margin:0 auto}
.hero{margin-bottom:48px}
.hero-eyebrow{font-size:11px;letter-spacing:4px;text-transform:uppercase;color:var(--ac);margin-bottom:12px;display:flex;align-items:center;gap:8px}
.hero-eyebrow::before{content:'';width:24px;height:2px;background:var(--ac);border-radius:2px}
.hero-title{font-family:var(--display);font-size:54px;letter-spacing:1px;line-height:1.1;color:var(--tx);margin-bottom:16px;background:linear-gradient(135deg,#fff 20%,${c.accent});-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.hero-sub{font-size:16px;color:var(--tx2);line-height:1.7;max-width:560px;margin-bottom:24px}
.hero-sub strong{color:var(--tx);display:block;font-size:15px;font-weight:600;margin-top:6px}
.hero-tags{display:flex;gap:10px;flex-wrap:wrap}
.htag{background:var(--bg2);border:1px solid var(--bd);border-radius:20px;padding:6px 14px;font-size:11px;color:var(--tx2);font-weight:600;letter-spacing:1px;display:flex;align-items:center;gap:6px}
.htag i{color:var(--ac)}
.burl{background:var(--bg2);border:1px solid var(--bd);border-radius:12px;padding:14px 20px;display:flex;align-items:center;gap:12px;margin-bottom:40px}
.burl code{font-size:14px;flex:1;color:var(--gr);font-family:var(--mono);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cbtn{background:linear-gradient(135deg,var(--ac),var(--acv));color:#fff;border:none;border-radius:6px;padding:8px 16px;font-size:12px;font-weight:700;cursor:pointer;font-family:var(--font);letter-spacing:1px;flex-shrink:0}
.cbtn:hover{transform:translateY(-1px)}
.cbtn.ok{background:var(--gr);color:#000}
.auth{background:linear-gradient(135deg,${hexToRgbStr(c.accent,.08)},${hexToRgbStr(c.accent,.02)});border:1px solid ${hexToRgbStr(c.accent,.2)};border-radius:12px;padding:20px;margin-bottom:32px}
.auth-title{font-size:13px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--ac);margin-bottom:8px;display:flex;align-items:center;gap:8px}
.auth p{color:var(--tx2);font-size:14px;line-height:1.7}
h2{font-family:var(--display);font-size:18px;letter-spacing:1px;color:var(--tx);margin:50px 0 20px;padding-top:40px;border-top:1px solid var(--bd);text-transform:uppercase;display:flex;align-items:center;gap:12px}
h2:first-of-type{margin-top:0;padding-top:0;border:none}
h2 i{color:var(--ac);font-size:16px}
.rl-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:32px}
.rl-item{background:var(--bg1);border:1px solid var(--bd);border-radius:12px;padding:20px;text-align:center}
.rl-val{font-family:var(--display);font-size:32px;letter-spacing:1px;color:var(--tx);margin-bottom:4px}
.rl-lbl{font-size:11px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:var(--tx3)}
.etable{width:100%;border-collapse:collapse;margin-bottom:32px;font-size:14px}
.etable th{text-align:left;padding:12px;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--tx3);border-bottom:1px solid var(--bd)}
.etable td{padding:14px 12px;border-bottom:1px solid var(--bd);color:var(--tx2)}
.ecode{display:inline-flex;align-items:center;padding:4px 10px;border-radius:6px;font-family:var(--mono);font-size:12px;font-weight:700}
.e2xx{background:${hexToRgbStr(c.success,.15)};color:var(--gr);border:1px solid ${hexToRgbStr(c.success,.3)}}
.e4xx{background:${hexToRgbStr(c.warning,.15)};color:var(--yw);border:1px solid ${hexToRgbStr(c.warning,.3)}}
.e5xx{background:${hexToRgbStr(c.danger,.15)};color:var(--rd);border:1px solid ${hexToRgbStr(c.danger,.3)}}
.cat-section{margin-bottom:50px}
.cat-header{display:flex;align-items:center;gap:12px;margin-bottom:20px;flex-wrap:wrap}
.cat-icon{width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0;border:1px solid}
.cat-icon i{font-size:16px}
.cat-name{font-family:var(--display);font-size:20px;letter-spacing:1px;color:var(--tx);text-transform:uppercase}
.cat-count{font-size:11px;font-weight:700;color:var(--tx3);background:var(--bg3);border:1px solid var(--bd);border-radius:20px;padding:3px 10px;margin-left:8px;white-space:nowrap;font-family:var(--font);display:inline-block}
.ep{border:1px solid var(--bd);border-radius:12px;margin-bottom:12px;overflow:hidden;background:var(--bg1);transition:all .25s}
.ep:hover{border-color:var(--ac)}
.ep.open{border-color:var(--ac);box-shadow:0 0 0 1px ${hexToRgbStr(c.accent,.1)}}
.ep-h{display:flex;align-items:center;gap:12px;padding:16px 20px;cursor:pointer;user-select:none;transition:background .2s}
.ep.open .ep-h{background:var(--ac3)}
.meth{display:inline-flex;align-items:center;padding:4px 10px;border-radius:6px;font-size:11px;font-weight:700;letter-spacing:1px;flex-shrink:0;font-family:var(--mono)}
.get{background:var(--gr2);color:var(--gr);border:1px solid ${hexToRgbStr(c.success,.3)}}
.ep-path{font-family:var(--mono);font-size:14px;font-weight:600;color:var(--tx);flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ep-desc{font-size:13px;color:var(--tx3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:300px}
.arrow{color:var(--tx3);font-size:14px;flex-shrink:0;transition:transform .4s}
.ep.open .arrow{transform:rotate(180deg);color:var(--ac)}
.ep-b{display:block;max-height:0;overflow:hidden;background:var(--bg2);opacity:0;transition:max-height .5s ease,opacity .3s;border-top:1px solid transparent}
.ep.open .ep-b{max-height:3000px;opacity:1;border-top-color:var(--bd)}
.ep-b>.ep-bi{padding:20px}
.pt{width:100%;border-collapse:collapse;margin-bottom:20px;font-size:13px}
.pt th{text-align:left;padding:10px 12px;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--tx3);border-bottom:1px solid var(--bd);white-space:nowrap}
.pt td{padding:12px;border-bottom:1px solid var(--bd);color:var(--tx2);vertical-align:top}
.req{color:var(--rd);font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;background:var(--rd2);padding:2px 6px;border-radius:4px}
code{background:var(--bg3);padding:3px 8px;border-radius:6px;font-family:var(--mono);font-size:12px;color:var(--tx);border:1px solid var(--bd)}
.cb-wrap{margin:16px 0}
.cb-label{font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--tx3);margin-bottom:8px;display:flex;align-items:center;justify-content:space-between}
.cp-btn{background:var(--bg3);border:1px solid var(--bd);border-radius:6px;padding:4px 12px;color:var(--tx2);font-size:10px;font-weight:600;letter-spacing:1px;cursor:pointer;font-family:var(--font);text-transform:uppercase}
.cp-btn:hover{background:var(--ac);color:#fff;border-color:var(--ac)}
pre{background:var(--bg);border:1px solid var(--bd);border-radius:10px;padding:16px 20px;overflow-x:auto;font-family:var(--mono);font-size:12px;line-height:1.8;color:var(--tx2);white-space:pre-wrap;word-wrap:break-word}
.req-line{background:var(--bg);border:1px solid var(--bd);border-radius:10px;padding:14px 20px;font-family:var(--mono);font-size:13px;color:var(--gr);white-space:nowrap;overflow-x:auto;margin:12px 0}
.announce-bar{display:flex;align-items:center;gap:10px;padding:11px 16px;border:1px solid;border-radius:10px;margin-bottom:20px;font-size:13px;font-weight:500}
.home-foot{text-align:center;padding:24px 0 8px;font-size:11px;color:var(--tx3);line-height:1.8;border-top:1px solid var(--bd);margin-top:30px}
.home-foot .brand{color:var(--ac);font-weight:700}
@media(max-width:768px){
  .sb{position:fixed;z-index:300;height:100%;width:280px;box-shadow:4px 0 32px rgba(0,0,0,.6);transform:translateX(-100%)}
  .sb.open{transform:translateX(0)}
  .sb-close{display:block;position:absolute;top:16px;right:16px;background:var(--bg3);border:1px solid var(--bd);border-radius:8px;color:var(--tx2);cursor:pointer;font-size:16px;padding:6px 12px}
  .mob-btn{display:block}
  .content{padding:20px 14px 60px;max-width:100%}
  .topbar{padding:0 14px;height:56px}
  .hero-title{font-size:32px}
  .hero-sub{font-size:14px}
  .rl-grid{grid-template-columns:1fr 1fr;gap:10px}
  .rl-item{padding:14px 10px}
  .rl-val{font-size:24px}
  .ep-desc{display:none}
  .ep-h{padding:12px 14px;gap:8px}
  .ep-path{font-size:12px}
  .ep-b>.ep-bi{padding:14px}
  pre{padding:12px 14px;font-size:11px}
  .burl{padding:10px 14px;flex-wrap:wrap;gap:8px}
  .cat-name{font-size:17px}
  h2{font-size:16px;margin:32px 0 14px;padding-top:28px}
  .etable{font-size:13px}
  .etable td,.etable th{padding:10px}
}
@media(max-width:500px){
  .hero-title{font-size:24px}
  .rl-grid{grid-template-columns:1fr}
}
</style>
</head>
<body>
<div class="sb-overlay" id="overlay" onclick="closeSidebar()"></div>
<div class="wrap">
<aside class="sb" id="sb" aria-label="Endpoint navigation">
  <button class="sb-close" onclick="closeSidebar()"><i class="fas fa-xmark"></i></button>
  <div class="sb-head">
    <h1 class="sb-title" style="margin:0"><a href="/" style="color:inherit;text-decoration:none;display:block">BRONX</a></h1>
    <div class="sb-sub">${endpCount + customCount} endpoints · REST · JSON</div>
  </div>
  <div class="docs-sb-search">
    <i class="fas fa-search"></i>
    <input type="text" id="epSearch" placeholder="Search endpoints..." oninput="filterEndpoints()">
  </div>
  <div class="sb-body">
    <div class="sb-sec"><i class="fas fa-book-open"></i> Overview</div>
    <a href="#intro" class="sba" onclick="scrollToId('intro')"><i class="fas fa-house"></i> Introduction</a>
    <a href="#auth" class="sba" onclick="scrollToId('auth')"><i class="fas fa-shield-halved"></i> Authentication</a>
    <a href="#limits" class="sba" onclick="scrollToId('limits')"><i class="fas fa-gauge-high"></i> Rate Limits</a>
    <a href="#errors" class="sba" onclick="scrollToId('errors')"><i class="fas fa-triangle-exclamation"></i> Error Codes</a>
    ${Object.keys(grouped).map(cat => {
      const meta = catMeta[cat] || catMeta.other;
      return `
      <div class="sb-sec"><i class="fas ${meta.icon}"></i> ${meta.label}</div>
      ${grouped[cat].map(e => `<a href="#ep-${e.name}" class="sba" onclick="scrollToId('ep-${e.name}')"><span class="mtag">GET</span> ${e.d}</a>`).join('')}
      `;
    }).join('')}
    ${customCount ? `
    <div class="sb-sec"><i class="fas fa-plug"></i> Custom APIs</div>
    ${customVisible.map(a => `<a href="#ep-custom-${a.endpoint}" class="sba" onclick="scrollToId('ep-custom-${a.endpoint}')"><span class="mtag">GET</span> ${esc(a.name)}</a>`).join('')}
    ` : ''}
  </div>
  <div class="sb-foot">
    <a href="${ADMIN_PATH}" class="sb-link"><i class="fas fa-gauge-high"></i> Admin Panel</a>
  </div>
</aside>
<div class="main">
  <div class="topbar">
    <div style="display:flex;align-items:center;gap:10px;min-width:0">
      <button class="mob-btn" onclick="openSidebar()"><i class="fas fa-bars"></i></button>
      <a href="/" style="display:flex;align-items:center;gap:10px;text-decoration:none">
        <div style="width:34px;height:34px;border-radius:9px;background:linear-gradient(135deg,var(--ac),var(--acv));display:flex;align-items:center;justify-content:center;font-size:18px">🛡️</div>
        <span style="font-family:var(--display);font-weight:700;letter-spacing:.5px;font-size:17px;color:var(--tx)">BRONX<b style="color:var(--acv)">OSINT</b></span>
      </a>
    </div>
    <div style="display:flex;align-items:center;gap:16px">
      <a href="${ADMIN_PATH}" class="tb-cta"><i class="fas fa-gauge-high"></i> Admin Panel</a>
    </div>
  </div>
  <div class="content">
    ${maintBanner}
    ${annBanner}
    <section id="intro" class="hero">
      <div class="hero-eyebrow">Private Intelligence API</div>
      <h2 class="hero-title" style="font-weight:inherit;margin:0">BRONX API reference</h2>
      <div class="hero-sub">
        Private OSINT APIs for fast and reliable data intelligence.
        <strong>Optimized performance. Controlled access. Real results.</strong>
      </div>
      <div class="hero-tags">
        <span class="htag"><i class="fas fa-server"></i> ${endpCount + customCount} ENDPOINTS</span>
        <span class="htag"><i class="fas fa-code"></i> JSON RESPONSES</span>
        <span class="htag"><i class="fas fa-key"></i> KEY-BASED ACCESS</span>
        <span class="htag"><i class="fas fa-chart-pie"></i> DAILY QUOTA</span>
        <span class="htag"><i class="fas fa-bolt"></i> SMART DDOS</span>
      </div>
    </section>
    <div class="burl">
      <i class="fas fa-link" style="color:var(--ac)"></i>
      <code id="baseUrl">https://${'your-domain.com'}</code>
      <button class="cbtn" onclick="copyText('https://'+location.host)" id="copyBtn"><i class="far fa-copy"></i> COPY</button>
    </div>
    <section id="auth">
      <h2><i class="fas fa-shield-halved"></i> AUTHENTICATION</h2>
      <div class="auth">
        <div class="auth-title"><i class="fas fa-lock"></i> API Key Required</div>
        <p>Every request needs a valid API key. Pass via query param or header.</p>
      </div>
      <div class="cb-wrap">
        <div class="cb-label">QUERY PARAM</div>
        <div class="req-line">GET /api/key-bronx/number?key=YOUR_KEY&num=9876543210</div>
      </div>
      <div class="cb-wrap">
        <div class="cb-label">HEADER</div>
        <div class="req-line">curl -H "X-Api-Key: YOUR_KEY" https://your-domain.com/api/key-bronx/number?num=9876543210</div>
      </div>
    </section>
    <section id="limits">
      <h2><i class="fas fa-gauge-high"></i> RATE LIMITS</h2>
      <div class="rl-grid">
        <div class="rl-item"><div class="rl-val">${Object.keys(keyStorage).length}</div><div class="rl-lbl">Active Keys</div></div>
        <div class="rl-item"><div class="rl-val">${endpCount}</div><div class="rl-lbl">Built-in APIs</div></div>
        <div class="rl-item"><div class="rl-val">${customCount}</div><div class="rl-lbl">Custom APIs</div></div>
      </div>
      <p style="font-size:14px;color:var(--tx2);line-height:1.8;background:var(--bg2);padding:16px;border-radius:12px;border:1px solid var(--bd);">
        Quota resets at <strong style="color:var(--tx)">midnight IST</strong> daily. DDoS mode: <strong style="color:var(--tx)">${ddosConfig.mode.toUpperCase()}</strong>. Response headers include rate limit info.
      </p>
    </section>
    <section id="errors">
      <h2><i class="fas fa-triangle-exclamation"></i> ERROR CODES</h2>
      <table class="etable">
        <thead><tr><th>Code</th><th>Meaning</th></tr></thead>
        <tbody>
          <tr><td><span class="ecode e4xx">400</span></td><td>Bad request — missing or invalid parameter</td></tr>
          <tr><td><span class="ecode e4xx">401</span></td><td>No API key provided</td></tr>
          <tr><td><span class="ecode e4xx">403</span></td><td>Invalid key, expired, scope denied, or IP blocked</td></tr>
          <tr><td><span class="ecode e4xx">429</span></td><td>Daily quota exceeded or abuse detected</td></tr>
          <tr><td><span class="ecode e5xx">503</span></td><td>Upstream timeout — retry in a moment</td></tr>
          <tr><td><span class="ecode e5xx">504</span></td><td>No data found within timeout</td></tr>
        </tbody>
      </table>
    </section>
    ${buildEndpoints()}
    ${buildCustom()}
    <div class="home-foot">
      🛡️ <span class="brand">BRONX V600 ULTRA</span> · Professional OSINT Platform<br>
      Server time: ${getIndiaDateTime()} IST · Version 6.0.0${brandName ? ' · ' + esc(brandName) : ''}
    </div>
  </div>
</div>
</div>
<script>
function toggleEp(el){
  const ep = el.parentElement;
  ep.classList.toggle('open');
}
function scrollToId(id){
  const el = document.getElementById(id);
  if(el){
    el.scrollIntoView({behavior:'smooth', block:'start'});
    el.style.boxShadow = '0 0 0 3px rgba(47,129,247,.35)';
    setTimeout(()=>{el.style.boxShadow='';}, 1200);
  }
}
function scrollToCat(e,id){ e.preventDefault(); scrollToId(id); }
function openSidebar(){
  document.getElementById('sb').classList.add('open');
  document.getElementById('overlay').classList.add('show');
  document.body.style.overflow = 'hidden';
}
function closeSidebar(){
  document.getElementById('sb').classList.remove('open');
  document.getElementById('overlay').classList.remove('show');
  document.body.style.overflow = '';
}
function copyText(txt){
  if(txt.startsWith('https://')){
    navigator.clipboard.writeText(txt);
    const btn = document.getElementById('copyBtn');
    if(btn){
      const orig = btn.innerHTML;
      btn.innerHTML = '<i class="fas fa-check"></i> COPIED';
      btn.classList.add('ok');
      setTimeout(()=>{ btn.innerHTML = orig; btn.classList.remove('ok'); }, 1500);
    }
    return;
  }
  navigator.clipboard.writeText(txt);
  const el = event?.target?.closest('.cp-btn') || event?.target;
  if(el && el.innerHTML){
    const orig = el.innerHTML;
    el.innerHTML = '<i class="fas fa-check"></i> COPIED';
    setTimeout(()=>{ el.innerHTML = orig; }, 1500);
  }
}
function filterEndpoints(){
  const q = document.getElementById('epSearch').value.toLowerCase().trim();
  document.querySelectorAll('.ep').forEach(ep => {
    const path = (ep.querySelector('.ep-path')?.textContent || '').toLowerCase();
    const desc = (ep.querySelector('.ep-desc')?.textContent || '').toLowerCase();
    const id = ep.id.toLowerCase();
    if(!q || path.includes(q) || desc.includes(q) || id.includes(q)) {
      ep.style.display = '';
    } else {
      ep.style.display = 'none';
    }
  });
  document.querySelectorAll('.cat-section').forEach(sec => {
    const visibleEps = sec.querySelectorAll('.ep:not([style*="display: none"])');
    sec.style.display = visibleEps.length ? '' : 'none';
  });
}
document.addEventListener('DOMContentLoaded', function(){
  document.querySelectorAll('.sba').forEach(a => {
    a.addEventListener('click', function(){ closeSidebar(); });
  });
});
</script>
</body>
</html>`;
}


// ============================================================
// 🔧 FIX — ROOT ROUTE '/' (MISSING THA — ADDED)
// ============================================================
// ✅ Sahi tarika:
app.get('/', (req, res) => {
  res.type('html').send(renderHome());
});

// ---------- BUILT-IN: /api/key-bronx/:endpoint ----------
app.get('/api/key-bronx/:endpoint', async (req, res) => {
  try {
    const ep = req.params.endpoint;
    const key = getKeyFromReq(req);
    if (!key) return errRes(res, 401, customMessages.invalidKey, { hint: 'Pass ?key=YOUR_KEY' });

    const kv = checkKeyValid(key);
    if (!kv.valid) return errRes(res, 403, kv.error);

    const sc = checkKeyScope(kv.keyData, ep);
    if (!sc.valid) return errRes(res, 403, sc.error);

    const epInfo = endpoints[ep];
    if (!epInfo) return errRes(res, 404, `Endpoint "${ep}" not found`, { available: Object.keys(endpoints).slice(0, 10) });

    const paramValue = req.query[epInfo.p];
    if (!paramValue) return errRes(res, 400, customMessages.missingParam, { required_param: epInfo.p, example: epInfo.e });

    const prot = isProtected(paramValue);
    if (prot && !whitelist.keys.includes(key)) return errRes(res, 403, customMessages.protectedData);

    incrementKeyUsage(key, ep, req);

    const realKey = getNextKey();
    const targetUrl = `${REAL_API_BASE}/${ep}?${epInfo.p}=${encodeURIComponent(paramValue)}&key=${realKey}`;

    let upstream;
    try {
      upstream = await axios.get(targetUrl, {
        timeout: 25000,
        headers: { 'User-Agent': 'BRONX-V600/1.0', 'Accept': 'application/json' },
        validateStatus: () => true
      });
    } catch (e) {
      return errRes(res, 502, 'Upstream API unreachable', { detail: e.message });
    }

    requestLogs.push({ key: key.substring(0, 8) + '***', endpoint: ep, param: epInfo.p, status: upstream.status, timestamp: getIndiaDateTime(), ip: getRealIP(req) });
    if (requestLogs.length > 2000) requestLogs = requestLogs.slice(-2000);

    const branded = applyBranding(upstream.data, kv.keyData);
    res.setHeader('X-RateLimit-Mode', ddosConfig.mode);
    res.setHeader('X-Bronx-Endpoint', ep);
    return res.status(upstream.status).json(branded);
  } catch (e) {
    console.log('Endpoint err:', e.message);
    return errRes(res, 500, 'Internal server error', { detail: e.message });
  }
});

// ---------- CUSTOM: /api/custom/:endpoint ----------
app.get('/api/custom/:endpoint', async (req, res) => {
  try {
    const ep = req.params.endpoint;
    const key = getKeyFromReq(req);
    if (!key) return errRes(res, 401, customMessages.invalidKey, { hint: 'Pass ?key=YOUR_KEY' });

    const kv = checkKeyValid(key);
    if (!kv.valid) return errRes(res, 403, kv.error);

    const apiConf = customAPIs.find(a => a.endpoint === ep);
    if (!apiConf) return errRes(res, 404, `Custom endpoint "${ep}" not found`);

    const sc = checkKeyScope(kv.keyData, 'c/' + ep);
    if (!sc.valid) return errRes(res, 403, sc.error);

    const paramValue = req.query[apiConf.param || 'number'] || req.query.number;
    if (!paramValue) return errRes(res, 400, customMessages.missingParam, { required_param: apiConf.param, example: apiConf.example });

    const prot = isProtected(paramValue);
    if (prot && !whitelist.keys.includes(key)) return errRes(res, 403, customMessages.protectedData);

    incrementKeyUsage(key, 'custom:' + ep, req);

    const finalUrl = apiConf.realAPI.replace('{param}', encodeURIComponent(paramValue));

    let upstream;
    try {
      upstream = await axios.get(finalUrl, {
        timeout: 25000,
        headers: { 'User-Agent': 'BRONX-V600/1.0', 'Accept': 'application/json' },
        validateStatus: () => true
      });
    } catch (e) {
      return errRes(res, 502, 'Upstream custom API unreachable', { detail: e.message });
    }

    requestLogs.push({ key: key.substring(0, 8) + '***', endpoint: 'custom:' + ep, param: apiConf.param, status: upstream.status, timestamp: getIndiaDateTime(), ip: getRealIP(req) });
    if (requestLogs.length > 2000) requestLogs = requestLogs.slice(-2000);

    const branded = applyBranding(upstream.data, kv.keyData);
    res.setHeader('X-RateLimit-Mode', ddosConfig.mode);
    res.setHeader('X-Bronx-Endpoint', 'custom:' + ep);
    return res.status(upstream.status).json(branded);
  } catch (e) {
    console.log('Custom endpoint err:', e.message);
    return errRes(res, 500, 'Internal server error', { detail: e.message });
  }
});

// ============================================================
// 🔧 FIX — ENDPOINT RESPONSE ROUTES
// ============================================================
app.get('/api/admin/get-endpoint-response', (req, res) => {
  if (!isAdminAuth(req.headers['x-admin-token'])) {
    return res.status(401).json({ success: false, e: 'Unauthorized' });
  }
  const ep = req.query.endpoint;
  if (!ep) return res.status(400).json({ success: false, e: 'endpoint required' });
  const data = endpointResponses[ep] || null;
  res.json({ success: true, data });
});

app.post('/api/admin/update-endpoint-response', (req, res) => {
  if (!isAdminAuth(req.headers['x-admin-token'])) {
    return res.status(401).json({ success: false, e: 'Unauthorized' });
  }
  const { endpoint, responseData } = req.body || {};
  if (!endpoint) return res.status(400).json({ success: false, e: 'endpoint required' });

  if (typeof responseData === 'string') {
    try {
      endpointResponses[endpoint] = JSON.parse(responseData);
    } catch (e) {
      return res.status(400).json({ success: false, e: 'Invalid JSON: ' + e.message });
    }
  } else {
    endpointResponses[endpoint] = responseData;
  }

  saveToDisk();
  logAudit(ADMIN_USERNAME, 'UPDATE_RESPONSE', { endpoint });
  res.json({ success: true, message: 'Response saved' });
});

// ---------- RESPONSE SAMPLE (docs ke liye) ----------
app.get('/api/response/:endpoint', (req, res) => {
  const ep = req.params.endpoint;
  if (endpointResponses[ep]) return res.type('text/plain').send(endpointResponses[ep]);
  res.type('text/plain').send('{\n  "success": true,\n  "message": "Sample not configured"\n}');
});

// ---------- HEALTH ----------
app.get('/health', (req, res) => {
  // ... (agar pehle se hai toh skip karo)
});

// ---------- HEALTH ----------
app.get('/health', (req, res) => {
  res.json({
    status: 'ok', version: '6.0.0', uptime: process.uptime(),
    keys: Object.keys(keyStorage).length, apis: customAPIs.length,
    ddos: ddosConfig.mode, time: getIndiaDateTime()
  });
});

// ============================================================
// 🔐 ADMIN AUTH
// ============================================================
app.get(ADMIN_PATH, (req,res) => {
  try{
    const token = req.query.token || req.headers['x-admin-token'];
    if(token && isAdminAuth(token)) return res.send(renderAdmin(token));
    res.send(renderLogin());
  }catch(e){ res.send('err: ' + e.message); }
});

app.post(ADMIN_PATH + '/login', (req,res) => {
  const { username, password } = req.body;
  const ip = getRealIP(req);
  const ua = req.headers['user-agent'] || '';
  const di = detectDeviceType(req);
  if(bans.ip['LOGIN_'+ip] && (bans.ip['LOGIN_'+ip].permanent || Date.now() < bans.ip['LOGIN_'+ip].until))
    return res.json({ success:false, error:'🚫 Too many failed attempts.' });
  if(username === ADMIN_USERNAME && password === ADMIN_PASSWORD){
    const token = genToken();
    adminSessions[token] = { expiresAt: Date.now() + 365*24*3600*1000, permanent: true };
    permanentTokens[token] = { createdAt: getIndiaDateTime() };
    delete abuseTracker.ip['LOGIN_'+ip];
    adminLogs.push({ user:username, action:'LOGIN', ip, browser:ua, device:di.type, timestamp:getIndiaDateTime(), status:'SUCCESS' });
    logAudit(username, 'LOGIN_SUCCESS', { ip });
    saveToDisk();
    res.json({ success:true, token, message:'✅ Access Granted', redirect: ADMIN_PATH + '?token=' + token });
  } else {
    pushHit(abuseTracker.ip, 'LOGIN_'+ip, 3600000);
    const attempts = countWindow(abuseTracker.ip, 'LOGIN_'+ip, 3600000);
    if(attempts >= ddosConfig.login.maxAttempts)
      bans.ip['LOGIN_'+ip] = { until: Date.now() + ddosConfig.login.banMs, reason:'Failed logins', at:getIndiaDateTime(), strikes:attempts };
    adminLogs.push({ user:username, action:'LOGIN_FAILED', ip, browser:ua, device:di.type, attempts, timestamp:getIndiaDateTime(), status:'FAILED' });
    logAudit(username, 'LOGIN_FAILED', { ip, attempts });
    res.json({ success:false, error:`Invalid credentials! ${ddosConfig.login.maxAttempts - attempts} attempts left.` });
  }
});

const adminAuth = (req,res,next) => {
  const t = req.headers['x-admin-token'] || req.query.token;
  if(!isAdminAuth(t)) return res.json({e:'Unauthorized'});
  next();
};

// ============================================================
// 🎛️ ADMIN APIs
// ============================================================
app.post(ADMIN_PATH + '/generate-key', adminAuth, (req,res) => {
  const { keyName, keyOwner, scopes, limit, expiryDate, days, cooldown, dailyLimit, perSecondLimit, autoGenerate, notes, customDeveloperName, hideFields } = req.body;
  let fk = keyName; if(autoGenerate || !keyName) fk = genRandomKey();
  if(!fk || !keyOwner) return res.json({e:'Missing fields'});
  if(keyStorage[fk]) return res.json({e:'Key already exists'});
  const ks = scopes || ['number'];
  let exp = null, es = expiryDate || 'LIFETIME';
  if(days && !isNaN(days)){
    const d = new Date(Date.now() + parseInt(days)*24*3600*1000);
    exp = d; es = d.toISOString().split('T')[0].split('-').reverse().join('-');
  } else if(expiryDate && expiryDate !== 'LIFETIME'){ exp = parseExpiryDate(expiryDate); es = expiryDate; }
  keyStorage[fk] = {
    name:keyOwner, scopes:ks, type:'generated', limit:parseInt(limit)||100, used:0,
    cooldown:parseInt(cooldown)||0, dailyLimit:parseInt(dailyLimit)||0, perSecondLimit:parseInt(perSecondLimit)||0,
    expiry:exp, expiryStr:es, created:getIndiaDateTime(), unlimited:false, hidden:false, _hardcoded:false,
    stopped:false, disabled:false, notes:notes||'',
    customDeveloperName: customDeveloperName || '',   // 🆕
    hideFields: hideFields || []                      // 🆕
  };
  logAudit('admin', 'GENERATE_KEY', { key:fk, scopes:ks });
  saveToDisk();
  res.json({ success:true, key:fk, message:'🔑 Key Generated!' });
});

app.post(ADMIN_PATH + '/edit-key', adminAuth, (req,res) => {
  const { keyName, newName, newOwner, newLimit, newDailyLimit, newPerSecondLimit, newCooldown, newScopes, newNotes, newExpiry, newCustomDeveloperName, newHideFields } = req.body;
  if(!keyStorage[keyName]) return res.json({e:'Not found'});
  if(keyStorage[keyName]._hardcoded) return res.json({e:'Hardcoded'});
  const kd = keyStorage[keyName];
  if(newName && newName !== keyName){
    if(keyStorage[newName]) return res.json({e:'New name exists'});
    keyStorage[newName] = { ...kd }; delete keyStorage[keyName];
  }
  const t = keyStorage[newName || keyName];
  if(newOwner !== undefined) t.name = newOwner;
  if(newLimit !== undefined) t.limit = parseInt(newLimit);
  if(newDailyLimit !== undefined) t.dailyLimit = parseInt(newDailyLimit);
  if(newPerSecondLimit !== undefined) t.perSecondLimit = parseInt(newPerSecondLimit);
  if(newCooldown !== undefined) t.cooldown = parseInt(newCooldown);
  if(newScopes) t.scopes = newScopes;
  if(newNotes !== undefined) t.notes = newNotes;
  if(newExpiry){ const e = parseExpiryDate(newExpiry); if(e){ t.expiry = e; t.expiryStr = newExpiry; } }
  if(newCustomDeveloperName !== undefined) t.customDeveloperName = newCustomDeveloperName; // 🆕
  if(newHideFields !== undefined) t.hideFields = newHideFields;                           // 🆕
  logAudit('admin', 'EDIT_KEY', { key:keyName });
  saveToDisk(); res.json({ success:true, message:'✅ Updated!' });
});

app.post(ADMIN_PATH + '/clone-key', adminAuth, (req,res) => {
  const { keyName } = req.body;
  if(!keyStorage[keyName]) return res.json({e:'Not found'});
  const kd = keyStorage[keyName];
  const nk = genRandomKey();
  keyStorage[nk] = { ...kd, used:0, created:getIndiaDateTime(), _hardcoded:false, hidden:false, name:(kd.name||'Clone')+' (Copy)' };
  logAudit('admin', 'CLONE_KEY', { from:keyName, to:nk });
  saveToDisk(); res.json({ success:true, key:nk, message:'✅ Cloned!' });
});

app.post(ADMIN_PATH + '/delete-key', adminAuth, (req,res) => {
  if(req.body.keyName === MASTER_API_KEY || keyStorage[req.body.keyName]?._hardcoded) return res.json({e:'Protected'});
  logAudit('admin', 'DELETE_KEY', { key:req.body.keyName });
  delete keyStorage[req.body.keyName]; saveToDisk(); res.json({success:true});
});

app.post(ADMIN_PATH + '/reset-key-usage', adminAuth, (req,res) => {
  if(keyStorage[req.body.keyName]){ keyStorage[req.body.keyName].used = 0; saveToDisk(); res.json({success:true}); }
  else res.json({e:'Not found'});
});

app.post(ADMIN_PATH + '/reset-all', adminAuth, (req,res) => {
  Object.keys(keyStorage).forEach(k => { if(k !== MASTER_API_KEY && !keyStorage[k]._hardcoded) keyStorage[k].used = 0; });
  dailyLimits = {}; perSecondLimits = {};
  saveToDisk(); res.json({success:true});
});

app.post(ADMIN_PATH + '/clear-logs', adminAuth, (req,res) => {
  requestLogs = []; keyMonitorLogs = []; saveToDisk(); res.json({success:true});
});

app.post(ADMIN_PATH + '/push-key', adminAuth, (req,res) => {
  const { keyName, days } = req.body;
  if(!keyStorage[keyName]) return res.json({e:'Not found'});
  if(keyStorage[keyName]._hardcoded) return res.json({e:'Hardcoded'});
  const d = parseInt(days) || 30;
  const ne = new Date(Date.now() + d*24*3600*1000);
  keyStorage[keyName].expiry = ne;
  keyStorage[keyName].expiryStr = ne.toISOString().split('T')[0].split('-').reverse().join('-');
  keyStorage[keyName].used = 0;
  logAudit('admin', 'PUSH_KEY', { key:keyName, days:d });
  saveToDisk(); res.json({success:true, message:`⬆ Pushed ${d} days!`});
});

app.post(ADMIN_PATH + '/push-all', adminAuth, (req,res) => {
  const d = parseInt(req.body.days) || 30;
  const ne = new Date(Date.now() + d*24*3600*1000);
  let count = 0;
  Object.keys(keyStorage).forEach(k => {
    if(!keyStorage[k]._hardcoded){
      keyStorage[k].expiry = ne;
      keyStorage[k].expiryStr = ne.toISOString().split('T')[0].split('-').reverse().join('-');
      count++;
    }
  });
  saveToDisk(); res.json({success:true, count, message:`⬆ Pushed ${d} days to ${count} keys!`});
});

app.post(ADMIN_PATH + '/stop-key', adminAuth, (req,res) => {
  const k = req.body.keyName;
  if(!keyStorage[k]) return res.json({e:'Not found'});
  if(keyStorage[k]._hardcoded) return res.json({e:'Hardcoded'});
  keyStorage[k].stopped = !keyStorage[k].stopped;
  saveToDisk(); res.json({success:true, stopped:keyStorage[k].stopped});
});

app.post(ADMIN_PATH + '/disable-key', adminAuth, (req,res) => {
  const k = req.body.keyName;
  if(!keyStorage[k]) return res.json({e:'Not found'});
  if(keyStorage[k]._hardcoded) return res.json({e:'Hardcoded'});
  keyStorage[k].disabled = !keyStorage[k].disabled;
  saveToDisk(); res.json({success:true, disabled:keyStorage[k].disabled});
});

app.post(ADMIN_PATH + '/update-scopes', adminAuth, (req,res) => {
  const { keyName, scopes } = req.body;
  if(!keyStorage[keyName]) return res.json({e:'Not found'});
  if(keyStorage[keyName]._hardcoded) return res.json({e:'Hardcoded'});
  keyStorage[keyName].scopes = scopes; saveToDisk(); res.json({success:true});
});

// ============================================================
// 🆕 V600 — BRANDING & CUSTOM MESSAGES APIs
// ============================================================
app.get(ADMIN_PATH + '/branding', adminAuth, (req,res) => res.json(branding));
app.post(ADMIN_PATH + '/branding', adminAuth, (req,res) => {
  const b = req.body;
  if(b.enabled !== undefined) branding.enabled = !!b.enabled;
  if(b.defaultName !== undefined) branding.defaultName = String(b.defaultName);
  if(b.hideFields) branding.hideFields = Array.isArray(b.hideFields) ? b.hideFields : [];
  if(b.position) branding.position = b.position;
  saveToDisk(); res.json({ success:true, branding });
});

app.get(ADMIN_PATH + '/custom-messages', adminAuth, (req,res) => res.json(customMessages));
app.post(ADMIN_PATH + '/custom-messages', adminAuth, (req,res) => {
  Object.keys(customMessages).forEach(k => {
    if(req.body[k] !== undefined) customMessages[k] = String(req.body[k]);
  });
  saveToDisk(); res.json({ success:true, customMessages });
});

// ============================================================
// 🆕 V600 — FULL BACKUP/RESTORE
// ============================================================
app.get(ADMIN_PATH + '/full-backup', adminAuth, (req,res) => {
  const ks = {};
  Object.entries(keyStorage).forEach(([k,v]) => { if(!v._hardcoded) ks[k]=v; });
  const backup = {
    version: '6.0.0',
    exported_at: getIndiaDateTime(),
    keys: ks,
    apis: customAPIs,
    protected: protectedData,
    endpointResponses,
    theme, ddosConfig, blocklist, whitelist,
    announcement, maintenance, bans, deviceFingerprints,
    branding, customMessages
  };
  // also save to disk file for re-download
  try { ensureDirs(); fs.writeFileSync(path.join(BACKUP_DIR, 'backup_'+Date.now()+'.json'), JSON.stringify(backup,null,2)); } catch(e){}
  res.json(backup);
});
app.post(ADMIN_PATH + '/full-restore', adminAuth, (req,res) => {
  try{
    const b = req.body;
    if(b.keys) Object.entries(b.keys).forEach(([k,v]) => { if(!v._hardcoded) keyStorage[k] = v; });
    if(b.apis) customAPIs = b.apis;
    if(b.protected) protectedData = b.protected;
    if(b.endpointResponses) endpointResponses = b.endpointResponses;
    if(b.theme) theme = { ...theme, ...b.theme };
    if(b.ddosConfig) ddosConfig = { ...ddosConfig, ...b.ddosConfig };
    if(b.blocklist) blocklist = b.blocklist;
    if(b.whitelist) whitelist = b.whitelist;
    if(b.announcement) announcement = b.announcement;
    if(b.maintenance) maintenance = b.maintenance;
    if(b.branding) branding = { ...branding, ...b.branding };
    if(b.customMessages) customMessages = { ...customMessages, ...b.customMessages };
    saveToDisk(); res.json({success:true, message:'✅ Restored'});
  }catch(e){ res.json({e:'Restore failed: ' + e.message}); }
});

// ============================================================
// 🆕 V600 — SAMPLE RESULT (for API Dashboard JSON preview)
// ============================================================
app.get('/api/sample/:ep', (req,res) => {
  const ep = req.params.ep;
  const cleanEp = ep.startsWith('c/') ? ep.substring(2) : ep;
  if(endpointResponses[ep]) return res.json(endpointResponses[ep]);
  if(endpointResponses[cleanEp]) return res.json(endpointResponses[cleanEp]);
  res.json({ note: 'Sample not configured by admin yet', endpoint: ep });
});

// (remaining bulk/apiv/ban/device/etc routes — same as before, saare intact)

// ✅ SAHI
app.get('/', ...);
app.use((req,res) => res.status(404).json({error:'Not found'}));


// ============================================================
// 🎨 PROFESSIONAL CSS (V600)
// ============================================================
function generateCSS(){
  const c = theme.colors;
  return `
<style id="bronx-theme">
:root{
--bg-primary:${c.bgPrimary}; --bg-secondary:${c.bgSecondary}; --bg-card:${c.bgCard};
--border-color:${c.borderColor}; --text-primary:${c.textPrimary};
--text-secondary:${c.textSecondary}; --text-muted:${c.textMuted};
--accent:${c.accent}; --accent2:${c.accent2};
--success:${c.success}; --warning:${c.warning}; --danger:${c.danger}; --info:${c.info};
--radius:${theme.radius}px;
--font-mono:'JetBrains Mono','SF Mono',Consolas,monospace;
--font-sans:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
--shadow-sm:0 1px 3px rgba(0,0,0,.3);
--shadow-md:0 4px 12px rgba(0,0,0,.4);
--shadow-lg:0 12px 32px rgba(0,0,0,.5);
--tr:all .15s ease;
}
*{margin:0;padding:0;box-sizing:border-box}
html,body{height:100%}
body{background:var(--bg-primary);color:var(--text-primary);font-family:var(--font-sans);font-size:14px;line-height:1.5;-webkit-font-smoothing:antialiased;min-height:100vh}
::-webkit-scrollbar{width:10px;height:10px}
::-webkit-scrollbar-track{background:var(--bg-primary)}
::-webkit-scrollbar-thumb{background:#30363d;border-radius:6px;border:2px solid var(--bg-primary)}
::-webkit-scrollbar-thumb:hover{background:#484f58}
a{color:var(--accent);text-decoration:none}
a:hover{text-decoration:underline}
code{font-family:var(--font-mono);font-size:12px;background:rgba(110,118,129,.15);padding:2px 6px;border-radius:4px;color:var(--info)}
pre{font-family:var(--font-mono);font-size:12px;background:var(--bg-primary);padding:14px;border-radius:8px;overflow:auto;border:1px solid var(--border-color);line-height:1.6}

/* ===== LAYOUT ===== */
.admin-layout{display:flex;min-height:100vh}
.sidebar{width:240px;background:var(--bg-secondary);border-right:1px solid var(--border-color);padding:16px 12px;position:fixed;height:100vh;overflow-y:auto;display:flex;flex-direction:column}
.sidebar-brand{padding:0 8px 16px;border-bottom:1px solid var(--border-color);margin-bottom:12px}
.sidebar-brand .logo{font-size:20px;font-weight:700;color:var(--text-primary);letter-spacing:-0.5px;display:flex;align-items:center;gap:8px}
.sidebar-brand .logo-dot{width:8px;height:8px;background:var(--success);border-radius:50%;box-shadow:0 0 8px var(--success);animation:pulse 2s infinite}
.sidebar-brand .sub{font-size:11px;color:var(--text-muted);margin-top:2px;text-transform:uppercase;letter-spacing:1px;font-weight:500}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
.sidebar-section{font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;font-weight:600;padding:14px 8px 6px;margin-top:4px}
.sidebar-nav{list-style:none;flex:1}
.sidebar-nav li{margin-bottom:1px}
.sidebar-nav a{display:flex;align-items:center;gap:10px;padding:8px 10px;color:var(--text-secondary);border-radius:6px;transition:var(--tr);font-size:13px;font-weight:500;cursor:pointer;border-left:2px solid transparent}
.sidebar-nav a:hover{background:rgba(110,118,129,.1);color:var(--text-primary);text-decoration:none}
.sidebar-nav a.active{background:rgba(47,129,247,.15);color:var(--accent);border-left-color:var(--accent);font-weight:600}
.sidebar-nav i{width:16px;text-align:center;font-size:14px;opacity:.85}
.sidebar-footer{padding:12px 8px;border-top:1px solid var(--border-color);margin-top:12px;font-size:11px;color:var(--text-muted)}

.main-content{flex:1;margin-left:240px;padding:24px 32px;max-width:calc(100vw - 240px)}
.page-header{margin-bottom:24px;padding-bottom:16px;border-bottom:1px solid var(--border-color);display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px}
.page-title{font-size:22px;font-weight:700;color:var(--text-primary);letter-spacing:-0.5px}
.page-subtitle{font-size:13px;color:var(--text-muted);margin-top:4px}

/* ===== CARDS ===== */
.card{background:var(--bg-card);border:1px solid var(--border-color);border-radius:var(--radius);padding:20px;margin-bottom:16px;box-shadow:var(--shadow-sm)}
.card-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:8px}
.card-title{font-size:15px;font-weight:600;color:var(--text-primary);display:flex;align-items:center;gap:8px}
.card-title i{color:var(--accent);font-size:14px}
.card-description{font-size:12px;color:var(--text-muted);margin-top:4px}

/* ===== STATS ===== */
.stats-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin-bottom:20px}
.stat-card{background:var(--bg-card);border:1px solid var(--border-color);border-radius:var(--radius);padding:16px;transition:var(--tr);position:relative;overflow:hidden}
.stat-card:hover{border-color:#30363d;transform:translateY(-1px)}
.stat-card::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:var(--accent);opacity:.7}
.stat-card.success::before{background:var(--success)}
.stat-card.warning::before{background:var(--warning)}
.stat-card.danger::before{background:var(--danger)}
.stat-card.info::before{background:var(--info)}
.stat-icon{font-size:18px;margin-bottom:8px;opacity:.9}
.stat-value{font-size:26px;font-weight:700;color:var(--text-primary);letter-spacing:-0.5px;line-height:1.1;margin-bottom:4px;font-family:var(--font-sans)}
.stat-label{font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;font-weight:500}

/* ===== FORMS ===== */
.form-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px}
.form-group{margin-bottom:14px}
.form-label{display:block;font-size:12px;font-weight:500;color:var(--text-secondary);margin-bottom:6px}
.form-label .required{color:var(--danger);margin-left:2px}
.form-hint{font-size:11px;color:var(--text-muted);margin-top:4px}
.form-input,.form-select,.form-textarea{width:100%;padding:8px 12px;background:var(--bg-primary);border:1px solid var(--border-color);border-radius:6px;color:var(--text-primary);font-size:13px;font-family:var(--font-sans);transition:var(--tr);outline:none}
.form-input:focus,.form-select:focus,.form-textarea:focus{border-color:var(--accent);box-shadow:0 0 0 3px rgba(47,129,247,.15)}
.form-textarea{font-family:var(--font-mono);font-size:12px;resize:vertical;min-height:100px;line-height:1.6}
.form-select{cursor:pointer}
.form-select option{background:var(--bg-secondary);color:var(--text-primary)}
.form-checkbox{width:16px;height:16px;cursor:pointer;accent-color:var(--accent)}

/* ===== BUTTONS ===== */
.btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:8px 16px;border:none;border-radius:6px;font-size:13px;font-weight:500;cursor:pointer;transition:var(--tr);font-family:var(--font-sans);white-space:nowrap}
.btn:hover{transform:translateY(-1px);text-decoration:none}
.btn:active{transform:translateY(0)}
.btn-primary{background:var(--accent);color:#fff}
.btn-primary:hover{background:var(--accent2)}
.btn-success{background:var(--success);color:#000}
.btn-danger{background:var(--danger);color:#fff}
.btn-warning{background:var(--warning);color:#000}
.btn-info{background:var(--info);color:#000}
.btn-secondary{background:var(--bg-secondary);color:var(--text-primary);border:1px solid var(--border-color)}
.btn-secondary:hover{background:#21262d}
.btn-block{width:100%}
.btn-sm{padding:5px 10px;font-size:12px}
.btn-xs{padding:3px 8px;font-size:11px;border-radius:4px}

/* Action buttons in tables */
.btn-action{padding:4px 8px;border-radius:4px;border:1px solid;cursor:pointer;font-size:11px;transition:var(--tr);background:transparent;margin:1px;font-weight:500;display:inline-flex;align-items:center;gap:4px}
.btn-action i{font-size:11px}
.btn-action:hover{background:rgba(255,255,255,.05)}
.btn-reset{color:var(--success);border-color:rgba(63,185,80,.3)}
.btn-push{color:var(--warning);border-color:rgba(210,153,34,.3)}
.btn-stop{color:var(--danger);border-color:rgba(248,81,73,.3)}
.btn-delete{color:var(--danger);border-color:rgba(248,81,73,.3)}
.btn-edit{color:var(--info);border-color:rgba(88,166,255,.3)}
.btn-disable{color:var(--warning);border-color:rgba(210,153,34,.3)}
.btn-clone{color:var(--purple,#a371f7);border-color:rgba(163,113,247,.3)}

/* ===== TABLES ===== */
.table-container{overflow-x:auto;border-radius:var(--radius);border:1px solid var(--border-color);background:var(--bg-card)}
table{width:100%;border-collapse:collapse;font-size:13px}
thead{background:var(--bg-secondary);position:sticky;top:0;z-index:2}
th{padding:10px 12px;text-align:left;font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:.5px;color:var(--text-muted);border-bottom:1px solid var(--border-color);white-space:nowrap}
td{padding:10px 12px;border-bottom:1px solid var(--border-color);color:var(--text-secondary);vertical-align:middle}
tbody tr{transition:var(--tr)}
tbody tr:hover td{background:rgba(110,118,129,.05)}
tbody tr:last-child td{border-bottom:none}
td code{font-size:11px;padding:2px 6px}

/* Badges */
.badge{display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:500;white-space:nowrap}
.badge-success{background:rgba(63,185,80,.15);color:var(--success)}
.badge-warning{background:rgba(210,153,34,.15);color:var(--warning)}
.badge-danger{background:rgba(248,81,73,.15);color:var(--danger)}
.badge-info{background:rgba(88,166,255,.15);color:var(--info)}
.badge-muted{background:rgba(110,118,129,.15);color:var(--text-muted)}

/* ===== SCOPE BOX ===== */
.scope-box{display:flex;flex-wrap:wrap;gap:6px;padding:12px;background:var(--bg-primary);border-radius:8px;border:1px solid var(--border-color);max-height:280px;overflow-y:auto}
.scope-item{cursor:pointer;font-size:11px;display:inline-flex;align-items:center;gap:5px;padding:5px 10px;border-radius:6px;background:var(--bg-secondary);border:1px solid var(--border-color);transition:var(--tr);user-select:none}
.scope-item:hover{border-color:var(--accent)}
.scope-item input{margin:0;cursor:pointer;accent-color:var(--accent)}
.scope-item:has(input:checked){background:rgba(47,129,247,.15);border-color:var(--accent);color:var(--accent)}
.scope-item.custom:has(input:checked){background:rgba(88,166,255,.15);border-color:var(--info);color:var(--info)}

/* ===== PRESETS ===== */
.preset-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px}
.preset-card{padding:12px;border-radius:8px;cursor:pointer;border:2px solid var(--border-color);transition:var(--tr);text-align:center;background:var(--bg-secondary)}
.preset-card:hover{border-color:var(--accent);transform:translateY(-2px)}
.preset-card.active{border-color:var(--accent);box-shadow:0 0 0 3px rgba(47,129,247,.2)}
.preset-swatch{height:32px;border-radius:6px;margin-bottom:8px;border:1px solid rgba(255,255,255,.1)}
.preset-name{font-size:11px;font-weight:600;text-transform:capitalize;color:var(--text-primary);letter-spacing:.3px}

/* ===== TABS ===== */
.tabs{display:flex;gap:2px;border-bottom:1px solid var(--border-color);margin-bottom:16px;overflow-x:auto}
.tab{padding:10px 16px;cursor:pointer;font-size:13px;font-weight:500;color:var(--text-muted);border-bottom:2px solid transparent;transition:var(--tr);white-space:nowrap}
.tab:hover{color:var(--text-primary)}
.tab.active{color:var(--accent);border-bottom-color:var(--accent);font-weight:600}

/* ===== LIVE LOGS ===== */
.live-logs{background:var(--bg-primary);border:1px solid var(--border-color);border-radius:8px;padding:12px;max-height:500px;overflow-y:auto;font-family:var(--font-mono);font-size:12px}
.log-entry{padding:8px;border-bottom:1px solid var(--border-color);display:flex;gap:10px;flex-wrap:wrap;align-items:center;transition:var(--tr)}
.log-entry:hover{background:rgba(110,118,129,.08)}
.log-entry:last-child{border-bottom:none}
.log-time{color:var(--text-muted);font-size:11px;font-family:var(--font-mono)}
.log-key{color:var(--accent);font-weight:600;font-size:11px}
.log-endpoint{color:var(--info);font-size:11px}
.log-ip{color:var(--warning);font-size:11px}
.log-device{font-size:14px}
.log-browser{color:var(--text-secondary);font-size:11px}

/* ===== TOAST ===== */
.toast-container{position:fixed;top:20px;right:20px;z-index:99999;display:flex;flex-direction:column;gap:8px;pointer-events:none}
.toast{padding:12px 16px;border-radius:8px;color:#fff;font-weight:500;font-size:13px;box-shadow:var(--shadow-lg);animation:slideIn .3s ease;backdrop-filter:blur(20px);border:1px solid;min-width:280px;max-width:400px;pointer-events:auto;display:flex;align-items:center;gap:10px}
.toast.success{background:rgba(63,185,80,.15);border-color:var(--success);color:var(--success)}
.toast.error{background:rgba(248,81,73,.15);border-color:var(--danger);color:var(--danger)}
.toast.warning{background:rgba(210,153,34,.15);border-color:var(--warning);color:var(--warning)}
.toast.info{background:rgba(88,166,255,.15);border-color:var(--info);color:var(--info)}
@keyframes slideIn{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}

/* ===== COLOR PICKER ===== */
.color-picker-row{display:flex;align-items:center;gap:12px;padding:8px 12px;border-radius:6px;background:var(--bg-primary);margin-bottom:6px;border:1px solid var(--border-color)}
.color-picker-row label{flex:1;font-size:12px;color:var(--text-secondary);text-transform:capitalize;font-weight:500}
.color-picker-row input[type=color]{width:44px;height:30px;border:1px solid var(--border-color);border-radius:6px;cursor:pointer;background:transparent;padding:2px}
.color-picker-row input[type=color]::-webkit-color-swatch-wrapper{padding:2px}
.color-picker-row input[type=color]::-webkit-color-swatch{border:none;border-radius:4px}
.color-picker-row input[type=checkbox]{width:18px;height:18px;cursor:pointer;accent-color:var(--accent)}

/* ===== FILE UPLOAD ===== */
.file-upload{border:2px dashed var(--border-color);border-radius:8px;padding:32px;text-align:center;cursor:pointer;transition:var(--tr);background:var(--bg-primary)}
.file-upload:hover{border-color:var(--accent);background:rgba(47,129,247,.05)}
.file-upload.dragover{border-color:var(--accent);background:rgba(47,129,247,.1)}
.file-upload-icon{font-size:36px;color:var(--text-muted);margin-bottom:10px}
.file-upload-text{font-size:14px;color:var(--text-primary);font-weight:500}
.file-upload-hint{font-size:12px;color:var(--text-muted);margin-top:4px}

/* ===== MISC ===== */
.section-hidden{display:none !important}
.divider{height:1px;background:var(--border-color);margin:16px 0}
.empty-state{text-align:center;padding:40px 20px;color:var(--text-muted)}
.empty-state i{font-size:36px;opacity:.4;margin-bottom:10px;display:block}
.btn-row{display:flex;gap:8px;flex-wrap:wrap}
.info-row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border-color);font-size:13px}
.info-row:last-child{border-bottom:none}
.info-row-label{color:var(--text-muted)}
.info-row-value{color:var(--text-primary);font-weight:500;font-family:var(--font-mono);font-size:12px}

/* ===== RESPONSIVE ===== */
@media(max-width:900px){
.sidebar{width:56px;padding:8px 4px}
.sidebar-brand .logo span,.sidebar-brand .sub,.sidebar-nav a span,.sidebar-section,.sidebar-footer{display:none}
.sidebar-brand .logo{justify-content:center}
.sidebar-nav a{justify-content:center;padding:10px 4px}
.main-content{margin-left:56px;padding:16px;max-width:calc(100vw - 56px)}
.stats-grid{grid-template-columns:repeat(2,1fr)}
.form-grid{grid-template-columns:1fr}
}
@media(max-width:600px){
.page-header{flex-direction:column}
.stats-grid{grid-template-columns:1fr}
.card{padding:14px}
}
</style>`;
}

// ============================================================
// 🔐 PROFESSIONAL LOGIN
// ============================================================
function renderLogin(){
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Admin Login — BRONX</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
${generateCSS()}
<style>
body{display:flex;align-items:center;justify-content:center;background:radial-gradient(ellipse at top,#161b22 0%,#0b0d10 100%)}
.login-wrap{width:400px;max-width:92vw}
.login-card{background:var(--bg-card);border:1px solid var(--border-color);border-radius:12px;padding:32px;box-shadow:var(--shadow-lg)}
.login-header{text-align:center;margin-bottom:28px}
.login-logo{width:56px;height:56px;margin:0 auto 16px;background:linear-gradient(135deg,var(--accent),var(--accent2));border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:26px;box-shadow:0 8px 24px rgba(47,129,247,.3)}
.login-title{font-size:20px;font-weight:700;color:var(--text-primary);margin-bottom:4px}
.login-subtitle{font-size:13px;color:var(--text-muted)}
.login-field{position:relative;margin-bottom:14px}
.login-field i{position:absolute;left:14px;top:50%;transform:translateY(-50%);color:var(--text-muted);font-size:14px}
.login-field input{width:100%;padding:11px 14px 11px 40px;background:var(--bg-primary);border:1px solid var(--border-color);border-radius:8px;color:var(--text-primary);font-size:14px;outline:none;transition:var(--tr);font-family:var(--font-sans)}
.login-field input:focus{border-color:var(--accent);box-shadow:0 0 0 3px rgba(47,129,247,.15)}
.login-btn{width:100%;padding:11px;background:var(--accent);color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:14px;font-weight:600;transition:var(--tr);font-family:var(--font-sans)}
.login-btn:hover{background:var(--accent2)}
.login-btn:disabled{opacity:.6;cursor:not-allowed}
.login-msg{text-align:center;margin-top:14px;font-size:13px;font-weight:500;min-height:20px}
.login-footer{text-align:center;margin-top:24px;font-size:11px;color:var(--text-muted);letter-spacing:.5px}
</style></head><body>
<div class="login-wrap"><div class="login-card">
<div class="login-header">
<div class="login-logo">🛡️</div>
<h1 class="login-title">Admin Panel</h1>
<p class="login-subtitle">BRONX OSINT V600 ULTRA</p>
</div>
<div class="login-field"><i class="fas fa-user"></i><input type="text" id="username" placeholder="Username" autocomplete="username" autofocus></div>
<div class="login-field"><i class="fas fa-lock"></i><input type="password" id="password" placeholder="Password" autocomplete="current-password"></div>
<button class="login-btn" id="loginBtn" onclick="doLogin()">Sign In</button>
<div class="login-msg" id="message"></div>
<div class="login-footer">🔒 Secure Admin Access · V600</div>
</div></div>
<script>
async function doLogin(){
  const u=document.getElementById('username').value.trim(),p=document.getElementById('password').value.trim(),m=document.getElementById('message'),b=document.getElementById('loginBtn');
  if(!u||!p){m.style.color='#d29922';m.textContent='Please fill all fields';return}
  b.disabled=true;b.innerHTML='<i class="fas fa-spinner fa-spin"></i> Signing in...';m.textContent='';
  try{
    const r=await fetch('${ADMIN_PATH}/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:u,password:p})});
    const d=await r.json();
    if(d.success){m.style.color='#3fb950';m.textContent='✅ '+d.message;setTimeout(()=>location.href=d.redirect,500)}
    else{m.style.color='#f85149';m.textContent='❌ '+d.error;b.disabled=false;b.textContent='Sign In'}
  }catch(e){m.style.color='#f85149';m.textContent='❌ Connection error';b.disabled=false;b.textContent='Sign In'}
}
document.addEventListener('keydown',e=>{if(e.key==='Enter'&&!document.getElementById('loginBtn').disabled)doLogin()});
</script></body></html>`;
}

// ============================================================
// 🎛️ PROFESSIONAL ADMIN PANEL
// ============================================================
function renderAdmin(token){
  try{
    const stoken = esc(token);
    const themesList = Object.keys(PRESETS);
    const allKeys = Object.entries(keyStorage).filter(([k,d]) => !d._hardcoded && !d.hidden).map(([k,d]) => ({
      key:k, name:d.name||'?', limit:d.unlimited?'∞':d.limit, used:d.used||0,
      left:d.unlimited?'∞':Math.max(0,(d.limit||0)-(d.used||0)),
      dailyLimit:d.dailyLimit||0, perSecondLimit:d.perSecondLimit||0,
      expiry:d.expiryStr||'Lifetime', isExpired:d.expiry ? isKeyExpired(d.expiry) : false,
      scopes:d.scopes||[], cooldown:d.cooldown||0, created:d.created||'',
      stopped:d.stopped||false, disabled:d.disabled||false, notes:d.notes||'',
      customDeveloperName:d.customDeveloperName||'', hideFields:d.hideFields||[]
    }));

    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Admin — BRONX V600</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
${generateCSS()}
</head><body>
<div class="toast-container" id="toastContainer"></div>
<div class="admin-layout">
<aside class="sidebar">
<div class="sidebar-brand">
<div class="logo"><span class="logo-dot"></span><span>BRONX</span></div>
<div class="sub">V600 ULTRA PRO</div>
</div>
<div class="sidebar-section">Overview</div>
<ul class="sidebar-nav">
<li><a class="active" onclick="switchSection('dashboard',this)"><i class="fas fa-chart-pie"></i><span>Dashboard</span></a></li>
<li><a onclick="switchSection('stats',this)"><i class="fas fa-chart-bar"></i><span>Statistics</span></a></li>
<li><a onclick="switchSection('monitor',this)"><i class="fas fa-desktop"></i><span>Live Monitor</span></a></li>
</ul>
<div class="sidebar-section">Key Management</div>
<ul class="sidebar-nav">
<li><a onclick="switchSection('generate',this)"><i class="fas fa-plus-circle"></i><span>Generate Key</span></a></li>
<li><a onclick="switchSection('keys',this)"><i class="fas fa-key"></i><span>All Keys</span></a></li>
<li><a onclick="switchSection('bulk',this)"><i class="fas fa-layer-group"></i><span>Bulk Actions</span></a></li>
<li><a onclick="switchSection('pushall',this)"><i class="fas fa-arrow-up"></i><span>Push All</span></a></li>
<li><a onclick="switchSection('scopes',this)"><i class="fas fa-crosshairs"></i><span>Update Scopes</span></a></li>
</ul>
<div class="sidebar-section">API & Branding</div>
<ul class="sidebar-nav">
<li><a onclick="switchSection('endpoints',this)"><i class="fas fa-list"></i><span>Endpoints</span></a></li>
<li><a onclick="switchSection('apis',this)"><i class="fas fa-plug"></i><span>Custom APIs</span></a></li>
<li><a onclick="switchSection('addapi',this)"><i class="fas fa-puzzle-piece"></i><span>Add API</span></a></li>
<li><a onclick="switchSection('responses',this)"><i class="fas fa-code"></i><span>Sample Results</span></a></li>
<li><a onclick="switchSection('branding',this)"><i class="fas fa-fingerprint"></i><span>Branding</span></a></li>
<li><a onclick="switchSection('messages',this)"><i class="fas fa-comment-dots"></i><span>Custom Messages</span></a></li>
</ul>
<div class="sidebar-section">Backup & Data</div>
<ul class="sidebar-nav">
<li><a onclick="switchSection('backup',this)"><i class="fas fa-database"></i><span>Backup / Restore</span></a></li>
<li><a onclick="switchSection('import',this)"><i class="fas fa-download"></i><span>Import Keys</span></a></li>
<li><a onclick="switchSection('export',this)"><i class="fas fa-upload"></i><span>Export Keys</span></a></li>
</ul>
<div class="sidebar-section">Security</div>
<ul class="sidebar-nav">
<li><a onclick="switchSection('ddos',this)"><i class="fas fa-shield-virus"></i><span>DDoS Protection</span></a></li>
<li><a onclick="switchSection('bans',this)"><i class="fas fa-ban"></i><span>Bans Manager</span></a></li>
<li><a onclick="switchSection('devices',this)"><i class="fas fa-laptop"></i><span>Devices</span></a></li>
<li><a onclick="switchSection('protect',this)"><i class="fas fa-shield-alt"></i><span>Data Protection</span></a></li>
</ul>
<div class="sidebar-section">System</div>
<ul class="sidebar-nav">
<li><a onclick="switchSection('theme',this)"><i class="fas fa-palette"></i><span>Theme</span></a></li>
<li><a onclick="switchSection('announce',this)"><i class="fas fa-bullhorn"></i><span>Announcement</span></a></li>
<li><a onclick="switchSection('maintenance',this)"><i class="fas fa-wrench"></i><span>Maintenance</span></a></li>
<li><a onclick="switchSection('audit',this)"><i class="fas fa-clipboard-list"></i><span>Audit Log</span></a></li>
<li><a onclick="switchSection('adminlogs',this)"><i class="fas fa-history"></i><span>Admin Logs</span></a></li>
<li><a onclick="switchSection('settings',this)"><i class="fas fa-cog"></i><span>Settings</span></a></li>
</ul>
<div class="sidebar-footer">🛡️ BRONX V600 · <span style="color:var(--success)">● Online</span></div>
</aside>

<main class="main-content">

<!-- ================= DASHBOARD ================= -->
<div id="section-dashboard">
<div class="page-header"><div><h1 class="page-title">Dashboard</h1><p class="page-subtitle">Overview of your API system</p></div></div>
<div class="stats-grid">
<div class="stat-card"><div class="stat-icon">🔑</div><div class="stat-value" id="hdKeys">${allKeys.length}</div><div class="stat-label">Total Keys</div></div>
<div class="stat-card success"><div class="stat-icon">📊</div><div class="stat-value" id="statToday">-</div><div class="stat-label">Today Requests</div></div>
<div class="stat-card info"><div class="stat-icon">📈</div><div class="stat-value" id="statTotal">-</div><div class="stat-label">Total Requests</div></div>
<div class="stat-card danger"><div class="stat-icon">🚫</div><div class="stat-value" id="statBans">-</div><div class="stat-label">Banned</div></div>
<div class="stat-card warning"><div class="stat-icon">📱</div><div class="stat-value" id="statDevices">-</div><div class="stat-label">Devices</div></div>
<div class="stat-card info"><div class="stat-icon">🔧</div><div class="stat-value" id="hdAPIs">${customAPIs.length}</div><div class="stat-label">Custom APIs</div></div>
</div>
<div class="card">
<div class="card-header"><div><h2 class="card-title"><i class="fas fa-trophy"></i> Top Keys</h2></div></div>
<div class="table-container"><table><thead><tr><th>Key</th><th>Requests</th></tr></thead><tbody id="topKeysBody"></tbody></table></div>
</div>
<div class="card">
<div class="card-header"><div><h2 class="card-title"><i class="fas fa-globe"></i> Top IPs</h2></div></div>
<div class="table-container"><table><thead><tr><th>IP</th><th>Requests</th></tr></thead><tbody id="topIPsBody"></tbody></table></div>
</div>
<div class="card">
<div class="card-header"><div><h2 class="card-title"><i class="fas fa-mobile-alt"></i> Top Devices</h2></div></div>
<div class="table-container"><table><thead><tr><th>Device</th><th>Requests</th></tr></thead><tbody id="topDevicesBody"></tbody></table></div>
</div>
<div class="card">
<div class="card-header"><div><h2 class="card-title"><i class="fas fa-chart-line"></i> Top Endpoints</h2></div></div>
<div class="table-container"><table><thead><tr><th>Endpoint</th><th>Requests</th></tr></thead><tbody id="topEpDash"></tbody></table></div>
</div>
</div>

<!-- ================= STATS ================= -->
<div id="section-stats" class="section-hidden">
<div class="page-header"><div><h1 class="page-title">Statistics</h1><p class="page-subtitle">Detailed analytics</p></div></div>
<div class="stats-grid">
<div class="stat-card"><div class="stat-value" id="statTotalReqs">-</div><div class="stat-label">Total</div></div>
<div class="stat-card success"><div class="stat-value" id="statTodayReqs">-</div><div class="stat-label">Today</div></div>
<div class="stat-card info"><div class="stat-value" id="statWeekReqs">-</div><div class="stat-label">Week</div></div>
<div class="stat-card warning"><div class="stat-value" id="statMonthReqs">-</div><div class="stat-label">Month</div></div>
</div>
<div class="card"><div class="card-header"><div><h2 class="card-title"><i class="fas fa-chart-pie"></i> Endpoints</h2></div></div>
<div class="table-container"><table><thead><tr><th>Endpoint</th><th>Requests</th></tr></thead><tbody id="topEndpointsBody"></tbody></table></div></div>
<div class="card"><div class="card-header"><div><h2 class="card-title"><i class="fas fa-laptop"></i> Clients</h2></div></div>
<div class="table-container"><table><thead><tr><th>Client</th><th>Requests</th></tr></thead><tbody id="clientStatsBody"></tbody></table></div></div>
<div class="card"><div class="card-header"><div><h2 class="card-title"><i class="fas fa-globe"></i> Browsers</h2></div></div>
<div class="table-container"><table><thead><tr><th>Browser</th><th>Requests</th></tr></thead><tbody id="browserStatsBody"></tbody></table></div></div>
<div class="card"><div class="card-header"><div><h2 class="card-title"><i class="fas fa-flag"></i> Countries</h2></div></div>
<div class="table-container"><table><thead><tr><th>Country</th><th>Requests</th></tr></thead><tbody id="countryStatsBody"></tbody></table></div></div>
<div class="card"><div class="card-header"><div><h2 class="card-title"><i class="fas fa-microchip"></i> OS</h2></div></div>
<div class="table-container"><table><thead><tr><th>OS</th><th>Count</th></tr></thead><tbody id="osStatsBody"></tbody></table></div></div>
</div>

<!-- ================= MONITOR ================= -->
<div id="section-monitor" class="section-hidden">
<div class="page-header"><div><h1 class="page-title">Live Monitor</h1><p class="page-subtitle">Real-time API requests</p></div></div>
<div class="card">
<div class="btn-row" style="margin-bottom:12px">
<input class="form-input" id="monitorFilter" placeholder="🔍 Filter logs..." style="flex:1;min-width:200px" oninput="renderMonitor()">
<button class="btn btn-secondary" onclick="loadMonitorLogs()"><i class="fas fa-sync"></i> Refresh</button>
</div>
<div class="live-logs" id="monitorLogs"></div>
</div>
</div>

<!-- ================= GENERATE ================= -->
<div id="section-generate" class="section-hidden">
<div class="page-header"><div><h1 class="page-title">Generate Key</h1><p class="page-subtitle">Create a new API access key</p></div></div>
<div class="card">
<div class="form-grid">
<div class="form-group"><label class="form-label">Key ID <span class="form-hint">(empty = random)</span></label><input class="form-input" id="gk" placeholder="MY_KEY_01"></div>
<div class="form-group"><label class="form-label">Owner Name <span class="required">*</span></label><input class="form-input" id="go" placeholder="Client name"></div>
</div>
<button class="btn btn-secondary btn-sm" onclick="randomKey()" style="margin-bottom:14px"><i class="fas fa-dice"></i> Generate Random ID</button>
<div class="form-grid">
<div class="form-group"><label class="form-label">Total Limit</label><input class="form-input" id="gl" type="number" value="100"></div>
<div class="form-group"><label class="form-label">Daily Limit <span class="form-hint">(0 = ∞)</span></label><input class="form-input" id="gdl" type="number" value="0"></div>
<div class="form-group"><label class="form-label">Per Second <span class="form-hint">(0 = ∞)</span></label><input class="form-input" id="gpsl" type="number" value="0"></div>
<div class="form-group"><label class="form-label">Cooldown (sec)</label><input class="form-input" id="gc" type="number" value="0"></div>
<div class="form-group"><label class="form-label">Valid Days</label><input class="form-input" id="gd" type="number" value="30"></div>
<div class="form-group"><label class="form-label">Notes</label><input class="form-input" id="gnotes" placeholder="Optional"></div>
</div>
<div class="form-grid">
<div class="form-group"><label class="form-label">🆕 Custom Developer Name <span class="form-hint">(default: global)</span></label><input class="form-input" id="gDevName" placeholder="@YourName (leave empty for default)"></div>
</div>
<div class="form-group"><label class="form-label">Scopes</label>
<div class="scope-box" id="scopeBoxGenerate">
<label class="scope-item"><input type="checkbox" value="*" id="scope-all" checked> <span>🌟 ALL ACCESS</span></label>
</div></div>
<button class="btn btn-primary btn-block" onclick="generateKey()"><i class="fas fa-rocket"></i> Generate Key</button>
</div>
</div>

<!-- ================= KEYS ================= -->
<div id="section-keys" class="section-hidden">
<div class="page-header"><div><h1 class="page-title">All Keys</h1><p class="page-subtitle">Manage all API keys · <span id="keysCount">${allKeys.length}</span> total</p></div></div>
<div class="card">
<div class="btn-row" style="margin-bottom:12px">
<input class="form-input" id="keysFilter" placeholder="🔍 Filter by name or key..." style="flex:1;min-width:200px" oninput="filterKeys()">
<button class="btn btn-secondary" onclick="location.reload()"><i class="fas fa-sync"></i></button>
</div>
<div class="table-container" style="max-height:650px">
<table>
<thead><tr><th><input type="checkbox" onclick="toggleAllKeys(this)"></th><th>Key</th><th>Owner</th><th>Limit</th><th>Used</th><th>Left</th><th>Expiry</th><th>Scopes</th><th>Status</th><th>Actions</th></tr></thead>
<tbody id="keysBody"></tbody>
</table>
</div>
</div>
</div>

<!-- ================= BULK ================= -->
<div id="section-bulk" class="section-hidden">
<div class="page-header"><div><h1 class="page-title">Bulk Actions</h1><p class="page-subtitle">Apply actions to multiple keys</p></div></div>
<div class="card">
<p style="color:var(--warning);font-size:13px;margin-bottom:12px"><i class="fas fa-info-circle"></i> Select keys from "All Keys" section first.</p>
<p id="bulkCount" style="text-align:center;font-size:14px;margin-bottom:16px;color:var(--info)">0 keys selected</p>
<div class="btn-row">
<button class="btn btn-success" onclick="bulkAction('bulk-reset')"><i class="fas fa-sync-alt"></i> Reset</button>
<button class="btn btn-warning" onclick="bulkAction('bulk-stop',true)"><i class="fas fa-pause"></i> Stop</button>
<button class="btn btn-primary" onclick="bulkAction('bulk-stop',false)"><i class="fas fa-play"></i> Activate</button>
<button class="btn btn-info" onclick="bulkAction('bulk-disable',true)"><i class="fas fa-ban"></i> Disable</button>
<button class="btn btn-info" onclick="bulkAction('bulk-disable',false)"><i class="fas fa-check"></i> Enable</button>
<button class="btn btn-danger" onclick="bulkAction('bulk-delete')"><i class="fas fa-trash"></i> Delete</button>
</div>
<div style="margin-top:16px;display:flex;gap:8px">
<input class="form-input" id="bulkPushDays" type="number" value="30" style="flex:1">
<button class="btn btn-warning" onclick="bulkPush()"><i class="fas fa-arrow-up"></i> Push Days</button>
</div>
</div>
</div>

<!-- ================= PUSH ALL ================= -->
<div id="section-pushall" class="section-hidden">
<div class="page-header"><div><h1 class="page-title">Push All Keys</h1><p class="page-subtitle">Extend expiry for all keys</p></div></div>
<div class="card">
<div class="form-group"><label class="form-label">Days to add to ALL keys</label><input class="form-input" id="pushAllDays" type="number" value="30"></div>
<button class="btn btn-warning btn-block" onclick="pushAllKeys()"><i class="fas fa-arrow-up"></i> Push All</button>
<div class="divider"></div>
<div class="form-group"><label class="form-label">Single key</label><input class="form-input" id="pk" placeholder="Key name"></div>
<div class="form-group"><label class="form-label">Days</label><input class="form-input" id="pd" type="number" value="30"></div>
<button class="btn btn-primary btn-block" onclick="pushKeyAction()"><i class="fas fa-arrow-up"></i> Push Single</button>
</div>
</div>

<!-- ================= SCOPES ================= -->
<div id="section-scopes" class="section-hidden">
<div class="page-header"><div><h1 class="page-title">Update Scopes</h1><p class="page-subtitle">Change what a key can access</p></div></div>
<div class="card">
<div class="form-group"><label class="form-label">Key Name</label><input class="form-input" id="sk" placeholder="Enter key"></div>
<div class="form-group"><label class="form-label">Scopes</label>
<div class="scope-box" id="scopeBoxUpdate">
<label class="scope-item"><input type="checkbox" value="*" id="scope-all2"> <span>🌟 ALL</span></label>
</div></div>
<button class="btn btn-primary btn-block" onclick="updateScopes()"><i class="fas fa-save"></i> Update Scopes</button>
</div>
</div>

<!-- ================= ENDPOINTS ================= -->
<div id="section-endpoints" class="section-hidden">
<div class="page-header"><div><h1 class="page-title">Endpoints</h1><p class="page-subtitle">${Object.keys(endpoints).length} built-in endpoints</p></div></div>
<div class="card"><div class="endpoint-grid" id="endpointsList"></div></div>
</div>

<!-- ================= APIS ================= -->
<div id="section-apis" class="section-hidden">
<div class="page-header"><div><h1 class="page-title">Custom APIs</h1><p class="page-subtitle"><span id="apiCount">${customAPIs.length}</span> custom integrations</p></div></div>
<div class="card"><div class="table-container" style="max-height:600px">
<table><thead><tr><th>ID</th><th>Name</th><th>Endpoint</th><th>Scope Key</th><th>Param</th><th>Visible</th><th>Actions</th></tr></thead><tbody id="apisBody"></tbody></table>
</div></div>
</div>

<!-- ================= ADD API ================= -->
<div id="section-addapi" class="section-hidden">
<div class="page-header"><div><h1 class="page-title">Add Custom API</h1><p class="page-subtitle">Create a new API integration</p></div></div>
<div class="card">
<div class="form-grid">
<div class="form-group"><label class="form-label">Name <span class="required">*</span></label><input class="form-input" id="aname" placeholder="My API"></div>
<div class="form-group"><label class="form-label">Endpoint <span class="required">*</span> <span class="form-hint">(lowercase)</span></label><input class="form-input" id="aep" placeholder="my-api"></div>
<div class="form-group"><label class="form-label">Param Name</label><input class="form-input" id="aparam" value="num"></div>
<div class="form-group"><label class="form-label">Example Value</label><input class="form-input" id="aex" placeholder="9876543210"></div>
</div>
<div class="form-group"><label class="form-label">Real URL <span class="form-hint">(use {param})</span></label><input class="form-input" id="aurl" placeholder="https://api.com?param={param}"></div>
<button class="btn btn-primary btn-block" onclick="addAPI()"><i class="fas fa-plus"></i> Add API</button>
</div>
</div>

<!-- ================= RESPONSES ================= -->
<div id="section-responses" class="section-hidden">
<div class="page-header"><div><h1 class="page-title">Sample Results</h1><p class="page-subtitle">Set sample JSON shown on API dashboard</p></div></div>
<div class="card">
<div class="form-group"><label class="form-label">Endpoint</label>
<select class="form-select" id="responseEndpoint" onchange="loadResponse()">
${Object.keys(endpoints).map(e => `<option value="${e}">${endpoints[e].d} (/${e})</option>`).join('')}
${customAPIs.map(a => `<option value="c/${a.endpoint}">${a.name} (custom)</option>`).join('')}
</select></div>
<div class="form-group"><label class="form-label">Sample JSON Response <span class="form-hint">(shown to users on dashboard)</span></label>
<textarea class="form-textarea" id="responseData" rows="14" placeholder='{"status":"success","data":{...}}'></textarea></div>
<button class="btn btn-primary btn-block" onclick="updateResponse()"><i class="fas fa-save"></i> Save Sample</button>
</div>
</div>

<!-- ================= BRANDING ================= -->
<div id="section-branding" class="section-hidden">
<div class="page-header"><div><h1 class="page-title">🆕 Branding</h1><p class="page-subtitle">Developer name and watermark control</p></div></div>
<div class="card">
<div class="form-group"><label class="form-label">Show Developer Name in Results</label>
<select class="form-select" id="brandEnabled"><option value="true">Yes</option><option value="false">No</option></select></div>
<div class="form-group"><label class="form-label">Default Developer Name <span class="form-hint">(used when key has no custom name)</span></label>
<input class="form-input" id="brandDefaultName" placeholder="@BRONX_ULTRA"></div>
<div class="form-group"><label class="form-label">Position</label>
<select class="form-select" id="brandPosition">
<option value="bottom">Bottom of result</option>
<option value="top">Top of result</option>
<option value="off">Hidden</option>
</select></div>
<div class="form-group"><label class="form-label">Hide These Fields from Results <span class="form-hint">(comma separated)</span></label>
<input class="form-input" id="brandHideFields" placeholder="api_by, by, channel, credit, developer, owner">
<div class="form-hint">These fields will be removed from ALL API responses.</div></div>
<button class="btn btn-primary btn-block" onclick="saveBranding()"><i class="fas fa-save"></i> Save Branding</button>
</div>
</div>

<!-- ================= MESSAGES ================= -->
<div id="section-messages" class="section-hidden">
<div class="page-header"><div><h1 class="page-title">🆕 Custom Messages</h1><p class="page-subtitle">Customize error messages shown to users</p></div></div>
<div class="card">
<div class="form-group"><label class="form-label">Key Not Found</label><textarea class="form-input" id="msg_keyNotFound" rows="2"></textarea></div>
<div class="form-group"><label class="form-label">Limit Reached</label><textarea class="form-input" id="msg_limitReached" rows="2"></textarea></div>
<div class="form-group"><label class="form-label">Key Stopped</label><textarea class="form-input" id="msg_keyStopped" rows="2"></textarea></div>
<div class="form-group"><label class="form-label">Key Disabled</label><textarea class="form-input" id="msg_keyDisabled" rows="2"></textarea></div>
<div class="form-group"><label class="form-label">Key Expired</label><textarea class="form-input" id="msg_keyExpired" rows="2"></textarea></div>
<div class="form-group"><label class="form-label">Scope Denied</label><textarea class="form-input" id="msg_scopeDenied" rows="2"></textarea></div>
<div class="form-group"><label class="form-label">Maintenance</label><textarea class="form-input" id="msg_maintenance" rows="2"></textarea></div>
<div class="form-group"><label class="form-label">Rate Limited</label><textarea class="form-input" id="msg_rateLimited" rows="2"></textarea></div>
<div class="form-group"><label class="form-label">Protected Data</label><textarea class="form-input" id="msg_protectedData" rows="2"></textarea></div>
<div class="form-group"><label class="form-label">Missing Parameter</label><textarea class="form-input" id="msg_missingParam" rows="2"></textarea></div>
<button class="btn btn-primary btn-block" onclick="saveMessages()"><i class="fas fa-save"></i> Save Messages</button>
</div>
</div>

<!-- ================= BACKUP ================= -->
<div id="section-backup" class="section-hidden">
<div class="page-header"><div><h1 class="page-title">🆕 Backup / Restore</h1><p class="page-subtitle">Full system backup with file upload</p></div></div>
<div class="card">
<h2 class="card-title"><i class="fas fa-download"></i> Full Backup</h2>
<p class="card-description">Download ALL data: keys, APIs, branding, messages, settings, etc.</p>
<button class="btn btn-success btn-block" onclick="downloadFullBackup()" style="margin-top:12px"><i class="fas fa-download"></i> Download Full Backup (.json)</button>
</div>
<div class="card">
<h2 class="card-title"><i class="fas fa-upload"></i> Restore from File</h2>
<p class="card-description">Upload backup JSON file to restore everything</p>
<div class="file-upload" id="fileUploadBox" onclick="document.getElementById('backupFile').click()">
<div class="file-upload-icon"><i class="fas fa-cloud-upload-alt"></i></div>
<div class="file-upload-text">Click to upload or drag & drop</div>
<div class="file-upload-hint">Backup .json file</div>
</div>
<input type="file" id="backupFile" accept=".json,application/json" style="display:none" onchange="handleFileUpload(event)">
<div id="uploadStatus" style="margin-top:12px;text-align:center;font-size:13px"></div>
</div>
<div class="card">
<h2 class="card-title"><i class="fas fa-paste"></i> Manual Restore (Paste JSON)</h2>
<textarea class="form-textarea" id="restoreData" rows="10" placeholder='Paste backup JSON here...'></textarea>
<button class="btn btn-warning btn-block" onclick="restoreData()" style="margin-top:12px"><i class="fas fa-upload"></i> Restore from Text</button>
</div>
</div>

<!-- ================= IMPORT ================= -->
<div id="section-import" class="section-hidden">
<div class="page-header"><div><h1 class="page-title">Import Keys</h1><p class="page-subtitle">Import keys from JSON</p></div></div>
<div class="card">
<textarea class="form-textarea" id="importData" rows="12" placeholder='{"MY_KEY":{...}}'></textarea>
<button class="btn btn-primary btn-block" onclick="importKeys()" style="margin-top:12px"><i class="fas fa-download"></i> Import</button>
<p id="importMsg" style="margin-top:12px;text-align:center;font-size:13px"></p>
</div>
</div>

<!-- ================= EXPORT ================= -->
<div id="section-export" class="section-hidden">
<div class="page-header"><div><h1 class="page-title">Export Keys</h1><p class="page-subtitle">Export all keys to JSON</p></div></div>
<div class="card">
<textarea class="form-textarea" id="exportData" rows="12" readonly placeholder="Click Load to fetch keys..."></textarea>
<div class="btn-row" style="margin-top:12px">
<button class="btn btn-primary" onclick="loadExport()" style="flex:1"><i class="fas fa-sync"></i> Load</button>
<button class="btn btn-success" onclick="copyExport()" style="flex:1"><i class="fas fa-copy"></i> Copy</button>
</div>
</div>
</div>

<!-- ================= DDOS ================= -->
<div id="section-ddos" class="section-hidden">
<div class="page-header"><div><h1 class="page-title">DDoS Protection</h1><p class="page-subtitle">Rate limiting and abuse prevention</p></div></div>
<div class="card">
<div class="form-group"><label class="form-label">Protection Mode</label>
<select class="form-select" id="ddosMode">
<option value="off">🔴 Off — No protection</option>
<option value="smart">🟢 Smart — Balanced (recommended)</option>
<option value="strict">🟠 Strict — Aggressive limits</option>
</select></div>
<div class="form-grid">
<div class="form-group"><label class="form-label">IP Burst/10s</label><input class="form-input" id="ddosIP10" type="number" value="${ddosConfig.ip.burst10s}"></div>
<div class="form-group"><label class="form-label">IP/Minute</label><input class="form-input" id="ddosIP1M" type="number" value="${ddosConfig.ip.perMinute}"></div>
<div class="form-group"><label class="form-label">IP/Hour</label><input class="form-input" id="ddosIP1H" type="number" value="${ddosConfig.ip.perHour}"></div>
<div class="form-group"><label class="form-label">Device Burst/10s</label><input class="form-input" id="ddosDEV10" type="number" value="${ddosConfig.device.burst10s}"></div>
<div class="form-group"><label class="form-label">Device/Minute</label><input class="form-input" id="ddosDEV1M" type="number" value="${ddosConfig.device.perMinute}"></div>
<div class="form-group"><label class="form-label">Device/Hour</label><input class="form-input" id="ddosDEV1H" type="number" value="${ddosConfig.device.perHour}"></div>
</div>
<div class="form-grid">
<div class="form-group"><label class="form-label">Temp Ban (minutes)</label><input class="form-input" id="ddosTempBan" type="number" value="${Math.round(ddosConfig.tempBanMs/60000)}"></div>
<div class="form-group"><label class="form-label">Long Ban (minutes)</label><input class="form-input" id="ddosLongBan" type="number" value="${Math.round(ddosConfig.longBanMs/60000)}"></div>
</div>
<button class="btn btn-primary btn-block" onclick="saveDDOS()"><i class="fas fa-save"></i> Save Config</button>
<button class="btn btn-warning btn-block" onclick="clearAllStrikes()" style="margin-top:8px"><i class="fas fa-eraser"></i> Clear All Strikes</button>
</div>
</div>

<!-- ================= BANS ================= -->
<div id="section-bans" class="section-hidden">
<div class="page-header"><div><h1 class="page-title">Bans Manager</h1><p class="page-subtitle">Manage banned IPs, devices, keys</p></div></div>
<div class="card">
<div class="form-grid" style="grid-template-columns:2fr 3fr 1fr">
<select class="form-select" id="banType"><option value="ip">IP</option><option value="device">Device</option><option value="key">Key</option></select>
<input class="form-input" id="banId" placeholder="Value to ban">
<button class="btn btn-danger" onclick="manualBan()"><i class="fas fa-ban"></i> Ban</button>
</div>
</div>
<div class="card"><h2 class="card-title"><i class="fas fa-network-wired"></i> Banned IPs</h2>
<div class="table-container" style="margin-top:12px"><table><thead><tr><th>IP</th><th>Reason</th><th>At</th><th>Until</th><th>Strikes</th><th>Action</th></tr></thead><tbody id="banIPBody"></tbody></table></div></div>
<div class="card"><h2 class="card-title"><i class="fas fa-mobile-alt"></i> Banned Devices</h2>
<div class="table-container" style="margin-top:12px"><table><thead><tr><th>Device ID</th><th>Reason</th><th>At</th><th>Until</th><th>Strikes</th><th>Action</th></tr></thead><tbody id="banDeviceBody"></tbody></table></div></div>
<div class="card"><h2 class="card-title"><i class="fas fa-key"></i> Banned Keys</h2>
<div class="table-container" style="margin-top:12px"><table><thead><tr><th>Key</th><th>Reason</th><th>At</th><th>Until</th><th>Strikes</th><th>Action</th></tr></thead><tbody id="banKeyBody"></tbody></table></div></div>
<div class="card"><button class="btn btn-warning btn-block" onclick="unbanAll()"><i class="fas fa-unlock"></i> Unban All</button></div>
</div>

<!-- ================= DEVICES ================= -->
<div id="section-devices" class="section-hidden">
<div class="page-header"><div><h1 class="page-title">Devices</h1><p class="page-subtitle">All devices that used your API</p></div></div>
<div class="card"><div class="table-container" style="max-height:650px">
<table><thead><tr><th>Device ID</th><th>Type</th><th>OS</th><th>Browser</th><th>Requests</th><th>Last Seen</th><th>Status</th><th>Action</th></tr></thead><tbody id="devicesBody"></tbody></table>
</div></div>
</div>

<!-- ================= PROTECT ================= -->
<div id="section-protect" class="section-hidden">
<div class="page-header"><div><h1 class="page-title">Data Protection</h1><p class="page-subtitle">Block specific values from being queried</p></div></div>
<div class="card">
<div class="form-group"><label class="form-label">Value to Protect</label><input class="form-input" id="protVal" placeholder="e.g. 9876543210"></div>
<button class="btn btn-primary btn-block" onclick="addProtection()"><i class="fas fa-lock"></i> Add Protection</button>
<div id="protectList" style="margin-top:16px"></div>
</div>
</div>

<!-- ================= THEME ================= -->
<div id="section-theme" class="section-hidden">
<div class="page-header"><div><h1 class="page-title">Theme</h1><p class="page-subtitle">Customize colors and appearance</p></div></div>
<div class="card">
<div class="tabs">
<div class="tab active" onclick="switchTab('presets',this)">Presets</div>
<div class="tab" onclick="switchTab('colors',this)">Colors</div>
</div>
<div id="themeTab-presets">
<div class="preset-grid" id="presetsGrid">
${themesList.map(name => `<div class="preset-card" data-preset="${name}" onclick="applyPresetByName('${name}')"><div class="preset-swatch" style="background:linear-gradient(135deg,${PRESETS[name].accent},${PRESETS[name].accent2})"></div><div class="preset-name">${name}</div></div>`).join('')}
</div>
</div>
<div id="themeTab-colors" style="display:none">
<div id="colorPickers"></div>
<button class="btn btn-primary btn-block" onclick="saveCustomColors()" style="margin-top:12px"><i class="fas fa-save"></i> Save Colors</button>
</div>
<button class="btn btn-warning btn-block" onclick="resetTheme()" style="margin-top:16px"><i class="fas fa-undo"></i> Reset to Default</button>
</div>
</div>

<!-- ================= ANNOUNCE ================= -->
<div id="section-announce" class="section-hidden">
<div class="page-header"><div><h1 class="page-title">Announcement</h1><p class="page-subtitle">Banner shown on homepage</p></div></div>
<div class="card">
<div class="form-group"><label class="form-label">Status</label>
<select class="form-select" id="annEnabled"><option value="false">Off</option><option value="true">On</option></select></div>
<div class="form-group"><label class="form-label">Text</label><input class="form-input" id="annText" placeholder="Welcome to BRONX!"></div>
<div class="form-group"><label class="form-label">Type</label>
<select class="form-select" id="annType"><option value="info">Info</option><option value="warning">Warning</option><option value="success">Success</option></select></div>
<button class="btn btn-primary btn-block" onclick="saveAnnouncement()"><i class="fas fa-save"></i> Save</button>
</div>
</div>

<!-- ================= MAINTENANCE ================= -->
<div id="section-maintenance" class="section-hidden">
<div class="page-header"><div><h1 class="page-title">Maintenance Mode</h1><p class="page-subtitle">Temporarily block API access</p></div></div>
<div class="card">
<div class="form-group"><label class="form-label">Status</label>
<select class="form-select" id="mtEnabled"><option value="false">Off</option><option value="true">On</option></select></div>
<div class="form-group"><label class="form-label">Message</label><input class="form-input" id="mtMessage" placeholder="System under maintenance"></div>
<button class="btn btn-warning btn-block" onclick="saveMaintenance()"><i class="fas fa-save"></i> Save</button>
</div>
</div>

<!-- ================= AUDIT ================= -->
<div id="section-audit" class="section-hidden">
<div class="page-header"><div><h1 class="page-title">Audit Log</h1><p class="page-subtitle">All admin actions</p></div></div>
<div class="card"><div class="table-container" style="max-height:600px">
<table><thead><tr><th>Time</th><th>User</th><th>Action</th><th>Details</th></tr></thead><tbody id="auditBody"></tbody></table>
</div></div>
</div>

<!-- ================= ADMIN LOGS ================= -->
<div id="section-adminlogs" class="section-hidden">
<div class="page-header"><div><h1 class="page-title">Admin Logs</h1><p class="page-subtitle">Login history</p></div></div>
<div class="card"><div class="table-container" style="max-height:600px">
<table><thead><tr><th>Time</th><th>User</th><th>Action</th><th>IP</th><th>Device</th><th>Status</th></tr></thead><tbody id="adminLogsBody"></tbody></table>
</div></div>
</div>

<!-- ================= SETTINGS ================= -->
<div id="section-settings" class="section-hidden">
<div class="page-header"><div><h1 class="page-title">Settings</h1><p class="page-subtitle">System operations</p></div></div>
<div class="card">
<div class="btn-row" style="flex-direction:column">
<button class="btn btn-danger btn-block" onclick="resetAll()"><i class="fas fa-sync-alt"></i> Reset All Usage</button>
<button class="btn btn-danger btn-block" onclick="clearLogs()"><i class="fas fa-trash"></i> Clear All Logs</button>
<button class="btn btn-warning btn-block" onclick="unbanAll()"><i class="fas fa-unlock"></i> Unban All</button>
<button class="btn btn-warning btn-block" onclick="clearAllStrikes()"><i class="fas fa-eraser"></i> Clear All Strikes</button>
</div>
</div>
</div>

</main>
</div>

<script>
const TOKEN='${stoken}';
const ADMIN_PATH='${ADMIN_PATH}';
const ENDPOINTS = ${JSON.stringify(Object.entries(endpoints).map(([n,e]) => ({name:n, p:e.p, i:e.i, e:e.e, d:e.d, c:e.c})))};
const INITIAL_KEYS = ${JSON.stringify(allKeys)};
let CUSTOM_APIS = ${JSON.stringify(customAPIs)};
let CURRENT_THEME = ${JSON.stringify(theme)};
const PRESETS = ${JSON.stringify(PRESETS)};

// ===== TOASTS =====
function showToast(msg,type='success'){
  const c=document.getElementById('toastContainer');
  const t=document.createElement('div');t.className='toast '+type;
  const icons={success:'check-circle',error:'times-circle',warning:'exclamation-triangle',info:'info-circle'};
  t.innerHTML='<i class="fas fa-'+icons[type]+'"></i><span>'+msg+'</span>';
  c.appendChild(t);
  setTimeout(()=>{t.style.opacity='0';setTimeout(()=>t.remove(),300)},3500);
}

// ===== API HELPER =====
async function api(url,data=null){
  const o={method:data?'POST':'GET',headers:{'Content-Type':'application/json','x-admin-token':TOKEN}};
  if(data)o.body=JSON.stringify(data);
  const r=await fetch(ADMIN_PATH+url,o);
  return await r.json();
}

// ===== SECTION SWITCHER =====
function switchSection(name, el){
  document.querySelectorAll('[id^="section-"]').forEach(c=>c.classList.add('section-hidden'));
  const s=document.getElementById('section-'+name); if(s) s.classList.remove('section-hidden');
  document.querySelectorAll('.sidebar-nav a').forEach(a=>a.classList.remove('active'));
  if(el) el.classList.add('active');
  const loaders={
    dashboard:loadDashboard, keys:renderKeys, endpoints:renderEndpoints, monitor:loadMonitorLogs,
    adminlogs:loadAdminLogs, stats:loadStats, responses:loadResponse, bans:loadBans, devices:loadDevices,
    theme:renderThemeTab, apis:renderAPIs, protect:renderProtect, audit:loadAudit,
    announce:loadAnnouncement, maintenance:loadMaintenance, branding:loadBranding, messages:loadMessages
  };
  if(loaders[name]) loaders[name]();
  window.scrollTo(0,0);
}

// ===== SCOPE LISTS =====
function buildScopeHTML(cls){
  let html='';
  ENDPOINTS.forEach(e=>{html+='<label class="scope-item"><input type="checkbox" value="'+e.name+'" class="'+cls+'"> <span>'+e.i+' '+e.name+'</span></label>'});
  html+='<label class="scope-item custom"><input type="checkbox" value="custom" class="'+cls+'"> <span>🔧 ALL Custom APIs</span></label>';
  CUSTOM_APIS.forEach(a=>{html+='<label class="scope-item custom"><input type="checkbox" value="custom:'+a.endpoint+'" class="'+cls+'"> <span>🔧 '+a.name+'</span></label>'});
  return html;
}
function renderScopeLists(){
  const g=document.getElementById('scopeBoxGenerate');
  if(g){const all=g.querySelector('#scope-all');const wasChecked=all?.checked;g.innerHTML='<label class="scope-item"><input type="checkbox" value="*" id="scope-all" '+(wasChecked?'checked':'')+'> <span>🌟 ALL ACCESS</span></label>'+buildScopeHTML('scope-cb');}
  const u=document.getElementById('scopeBoxUpdate');
  if(u){const all=u.querySelector('#scope-all2');const wasChecked=all?.checked;u.innerHTML='<label class="scope-item"><input type="checkbox" value="*" id="scope-all2" '+(wasChecked?'checked':'')+'> <span>🌟 ALL</span></label>'+buildScopeHTML('scope-cb2');}
}

// ===== KEYS =====
function renderKeys(filter){
  const f=(filter||document.getElementById('keysFilter')?.value||'').toLowerCase();
  const filtered=f?INITIAL_KEYS.filter(k=>k.key.toLowerCase().includes(f)||(k.name||'').toLowerCase().includes(f)):INITIAL_KEYS;
  const tb=document.getElementById('keysBody'); if(!tb) return;
  tb.innerHTML=filtered.map(k=>{
    let status='<span class="badge badge-success">Active</span>';
    if(k.isExpired)status='<span class="badge badge-danger">Expired</span>';
    else if(k.left==0)status='<span class="badge badge-warning">Limit</span>';
    else if(k.stopped)status='<span class="badge badge-warning">Stopped</span>';
    else if(k.disabled)status='<span class="badge badge-danger">Disabled</span>';
    const sd=k.scopes.includes('*')?'<span class="badge badge-info">ALL</span>':k.scopes.slice(0,2).map(s=>'<code>'+s+'</code>').join(' ');
    return '<tr><td><input type="checkbox" class="keysel" value="'+k.key+'"></td>'+
      '<td><code>'+k.key.substring(0,16)+(k.key.length>16?'..':'')+'</code></td>'+
      '<td>'+k.name+'</td><td>'+k.limit+'</td><td>'+k.used+'</td>'+
      '<td style="color:'+(k.left==0?'var(--danger)':'var(--success)')+'">'+k.left+'</td>'+
      '<td style="font-size:11px">'+k.expiry+'</td>'+
      '<td style="font-size:11px">'+sd+'</td>'+
      '<td>'+status+'</td>'+
      '<td style="white-space:nowrap">'+
      '<button class="btn-action btn-reset" onclick="resetKey(\\''+k.key+'\\')" title="Reset"><i class="fas fa-sync-alt"></i></button>'+
      '<button class="btn-action btn-push" onclick="pushKey(\\''+k.key+'\\')" title="Push"><i class="fas fa-arrow-up"></i></button>'+
      '<button class="btn-action btn-edit" onclick="editKey(\\''+k.key+'\\')" title="Edit"><i class="fas fa-edit"></i></button>'+
      '<button class="btn-action btn-clone" onclick="cloneKey(\\''+k.key+'\\')" title="Clone"><i class="fas fa-copy"></i></button>'+
      '<button class="btn-action btn-disable" onclick="disableKey(\\''+k.key+'\\')" title="Toggle disable"><i class="fas fa-ban"></i></button>'+
      '<button class="btn-action btn-stop" onclick="stopKey(\\''+k.key+'\\')" title="Toggle stop"><i class="fas fa-pause"></i></button>'+
      '<button class="btn-action btn-delete" onclick="deleteKey(\\''+k.key+'\\')" title="Delete"><i class="fas fa-trash"></i></button>'+
      '</td></tr>';
  }).join('')||'<tr><td colspan="10" class="empty-state"><i class="fas fa-key"></i>No keys found</td></tr>';
}
function filterKeys(){renderKeys(document.getElementById('keysFilter').value)}
function toggleAllKeys(cb){document.querySelectorAll('.keysel').forEach(c=>c.checked=cb.checked);updateBulkCount()}
document.addEventListener('change',e=>{if(e.target.classList.contains('keysel'))updateBulkCount()});
function updateBulkCount(){const n=document.querySelectorAll('.keysel:checked').length;const el=document.getElementById('bulkCount');if(el)el.textContent=n+' keys selected'}

// ===== KEY ACTIONS =====
function randomKey(){const c='ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';let r='';for(let i=0;i<20;i++)r+=c[Math.floor(Math.random()*c.length)];document.getElementById('gk').value='BRONX_'+r;showToast('Random ID generated','info')}
async function generateKey(){
  const keyOwner=document.getElementById('go').value.trim();
  if(!keyOwner)return showToast('Enter owner name','error');
  let scopes=[];
  if(document.getElementById('scope-all').checked)scopes=['*'];
  else document.querySelectorAll('.scope-cb:checked').forEach(c=>{if(c.value)scopes.push(c.value)});
  if(!scopes.length)return showToast('Select at least one scope','error');
  const res=await api('/generate-key',{
    keyName:document.getElementById('gk').value.trim(),keyOwner,scopes,
    limit:document.getElementById('gl').value,
    dailyLimit:document.getElementById('gdl').value,
    perSecondLimit:document.getElementById('gpsl').value,
    days:document.getElementById('gd').value,
    cooldown:document.getElementById('gc').value,
    notes:document.getElementById('gnotes').value,
    customDeveloperName:document.getElementById('gDevName').value
  });
  if(res.success){showToast('Key: '+res.key,'success');setTimeout(()=>location.reload(),1500)}
  else showToast(res.e||'Error','error');
}
async function resetKey(k){if(confirm('Reset usage for this key?')){await api('/reset-key-usage',{keyName:k});location.reload()}}
async function deleteKey(k){if(confirm('DELETE this key?')){await api('/delete-key',{keyName:k});location.reload()}}
async function stopKey(k){if(!confirm('Toggle stop?'))return;const r=await api('/stop-key',{keyName:k});r.success?location.reload():showToast('Failed','error')}
async function disableKey(k){if(!confirm('Toggle disable?'))return;const r=await api('/disable-key',{keyName:k});r.success?location.reload():showToast('Failed','error')}
async function cloneKey(k){if(!confirm('Clone?'))return;const r=await api('/clone-key',{keyName:k});if(r.success){showToast('Cloned: '+r.key);setTimeout(()=>location.reload(),1200)}else showToast('Failed','error')}
async function pushKey(k){const d=prompt('Days to add?','30');if(!d)return;const r=await api('/push-key',{keyName:k,days:parseInt(d)});if(r.success){showToast('Pushed');setTimeout(()=>location.reload(),1000)}else showToast('Failed','error')}
async function editKey(k){
  const n=prompt('New key ID (empty=keep):','');const o=prompt('New owner:','');
  const l=prompt('New total limit:','');const dl=prompt('New daily:','');
  const ps=prompt('New per-sec:','');const cd=prompt('New cooldown:','');
  const nt=prompt('Notes:','');const dev=prompt('Custom developer name (empty=default):','');
  const data={keyName:k};
  if(n)data.newName=n;if(o)data.newOwner=o;if(l)data.newLimit=l;
  if(dl!=='')data.newDailyLimit=dl;if(ps!=='')data.newPerSecondLimit=ps;
  if(cd!=='')data.newCooldown=cd;if(nt!==null)data.newNotes=nt;
  if(dev!==null)data.newCustomDeveloperName=dev;
  const r=await api('/edit-key',data);
  if(r.success){showToast('Updated');setTimeout(()=>location.reload(),1000)}else showToast(r.e||'Failed','error');
}
async function updateScopes(){
  const k=document.getElementById('sk').value.trim();if(!k)return showToast('Enter key','error');
  let scopes=[];if(document.getElementById('scope-all2').checked)scopes=['*'];
  else document.querySelectorAll('.scope-cb2:checked').forEach(c=>scopes.push(c.value));
  const r=await api('/update-scopes',{keyName:k,scopes});
  if(r.success){showToast('Updated');setTimeout(()=>location.reload(),1000)}else showToast('Failed','error');
}

// ===== BULK =====
async function bulkAction(action,state){
  const keys=Array.from(document.querySelectorAll('.keysel:checked')).map(c=>c.value);
  if(!keys.length)return showToast('Select keys first','error');
  if(action==='bulk-delete'&&!confirm('DELETE '+keys.length+' keys?'))return;
  const r=await api('/'+action,{keys,state});
  if(r.success){showToast('Done');setTimeout(()=>location.reload(),1000)}else showToast('Failed','error');
}
async function bulkPush(){
  const keys=Array.from(document.querySelectorAll('.keysel:checked')).map(c=>c.value);
  if(!keys.length)return showToast('Select keys','error');
  const days=parseInt(document.getElementById('bulkPushDays').value)||30;
  const r=await api('/bulk-push',{keys,days});
  if(r.success){showToast('Pushed '+r.count);setTimeout(()=>location.reload(),1000)}else showToast('Failed','error');
}
async function pushAllKeys(){const d=parseInt(document.getElementById('pushAllDays').value)||30;if(!confirm('Push '+d+' days to ALL?'))return;const r=await api('/push-all',{days:d});if(r.success){showToast(r.message);setTimeout(()=>location.reload(),1200)}else showToast('Failed','error')}
async function pushKeyAction(){const k=document.getElementById('pk').value.trim(),d=parseInt(document.getElementById('pd').value)||30;if(!k)return showToast('Enter key','error');const r=await api('/push-key',{keyName:k,days:d});if(r.success){showToast('Pushed');setTimeout(()=>location.reload(),1000)}else showToast('Failed','error')}

// ===== ENDPOINTS =====
function renderEndpoints(){
  const cats={};ENDPOINTS.forEach(e=>{const c=e.c||'other';if(!cats[c])cats[c]=[];cats[c].push(e)});
  let html='';
  Object.entries(cats).forEach(([cat,eps])=>{
    html+='<div style="margin-bottom:20px"><h3 style="color:var(--text-secondary);margin-bottom:10px;text-transform:capitalize;font-size:13px;font-weight:600"><i class="fas fa-folder"></i> '+cat+'</h3><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:10px">';
    eps.forEach(e=>{html+='<div class="card" style="margin:0;padding:12px;cursor:pointer" onclick="copyEndpoint(\\''+e.name+'\\',\\''+e.p+'\\',\\''+e.e+'\\')"><div style="font-size:20px;margin-bottom:4px">'+e.i+'</div><div style="font-weight:600;color:var(--accent);margin-bottom:2px;font-size:13px">/'+e.name+'</div><div style="font-size:11px;color:var(--text-muted);margin-bottom:6px">'+e.d+'</div><code style="font-size:10px;color:var(--info)">?key=KEY&'+e.p+'='+e.e+'</code></div>'});
    html+='</div></div>';
  });
  document.getElementById('endpointsList').innerHTML=html;
}
function copyEndpoint(ep,param,ex){navigator.clipboard.writeText(location.origin+'/api/key-bronx/'+ep+'?key=YOUR_KEY&'+param+'='+ex).then(()=>showToast('Copied URL')).catch(()=>showToast('Failed','error'))}

// ===== CUSTOM APIs =====
function renderAPIs(){
  const tb=document.getElementById('apisBody');if(!tb)return;
  if(!CUSTOM_APIS.length){tb.innerHTML='<tr><td colspan="7" class="empty-state"><i class="fas fa-plug"></i>No custom APIs</td></tr>';return}
  tb.innerHTML=CUSTOM_APIS.map(a=>'<tr>'+
    '<td>'+a.id+'</td>'+
    '<td><strong>'+a.name+'</strong></td>'+
    '<td><code>/'+a.endpoint+'</code></td>'+
    '<td><code style="font-size:10px;color:var(--info)">custom:'+a.endpoint+'</code></td>'+
    '<td>'+a.param+'</td>'+
    '<td>'+(a.visible?'<span class="badge badge-success">Visible</span>':'<span class="badge badge-danger">Hidden</span>')+'</td>'+
    '<td style="white-space:nowrap">'+
      '<button class="btn-action btn-push" onclick="toggleAPI('+a.id+')" title="Toggle"><i class="fas fa-eye'+(a.visible?'-slash':'')+'"></i></button>'+
      '<button class="btn-action btn-edit" onclick="editAPI('+a.id+')" title="Edit"><i class="fas fa-edit"></i></button>'+
      '<button class="btn-action btn-info" onclick="copyScope(\\'custom:'+a.endpoint+'\\')" title="Copy scope"><i class="fas fa-crosshairs"></i></button>'+
      '<button class="btn-action btn-delete" onclick="deleteAPI('+a.id+')" title="Delete"><i class="fas fa-trash"></i></button>'+
    '</td></tr>').join('');
}
function copyScope(s){navigator.clipboard.writeText(s).then(()=>showToast('Copied: '+s)).catch(()=>showToast('Failed','error'))}
async function addAPI(){
  const n=document.getElementById('aname').value.trim(),e=document.getElementById('aep').value.trim();
  if(!n||!e)return showToast('Fill Name & Endpoint','error');
  const r=await api('/add-api',{name:n,endpoint:e,param:document.getElementById('aparam').value,example:document.getElementById('aex').value,realAPI:document.getElementById('aurl').value,visible:true});
  if(r.success){showToast('API added');CUSTOM_APIS.push(r.api);renderAPIs();renderScopeLists();document.getElementById('aname').value='';document.getElementById('aep').value='';document.getElementById('aex').value='';document.getElementById('aurl').value='';document.getElementById('apiCount').textContent=CUSTOM_APIS.length;document.getElementById('hdAPIs').textContent=CUSTOM_APIS.length}
  else showToast(r.e||'Failed','error');
}
async function toggleAPI(id){const r=await api('/toggle-api',{id});if(r.success){const a=CUSTOM_APIS.find(x=>x.id===id);if(a)a.visible=r.visible;renderAPIs();renderScopeLists();showToast('Toggled')}}
async function deleteAPI(id){if(!confirm('Delete this API?'))return;const r=await api('/delete-api',{id});if(r.success){CUSTOM_APIS=CUSTOM_APIS.filter(x=>x.id!==id);renderAPIs();renderScopeLists();document.getElementById('apiCount').textContent=CUSTOM_APIS.length;document.getElementById('hdAPIs').textContent=CUSTOM_APIS.length;showToast('Deleted')}}
async function editAPI(id){
  const a=CUSTOM_APIS.find(x=>x.id===id);if(!a)return;
  const n=prompt('New name:',a.name)||a.name;const e=prompt('New endpoint:',a.endpoint)||a.endpoint;
  const p=prompt('New param:',a.param)||a.param;const x=prompt('New example:',a.example)||a.example;
  const u=prompt('New URL:',a.realAPI)||a.realAPI;
  const r=await api('/edit-api',{id,name:n,endpoint:e,param:p,example:x,realAPI:u});
  if(r.success){Object.assign(a,r.api);renderAPIs();renderScopeLists();showToast('Updated')}else showToast(r.e||'Failed','error');
}

// ===== RESPONSES =====
async function loadResponse(){const ep=document.getElementById('responseEndpoint').value;const r=await api('/get-endpoint-response?endpoint='+encodeURIComponent(ep));document.getElementById('responseData').value=r.data?JSON.stringify(r.data,null,2):''}
async function updateResponse(){const ep=document.getElementById('responseEndpoint').value,d=document.getElementById('responseData').value.trim();const r=await api('/update-endpoint-response',{endpoint:ep,responseData:d});if(r.success)showToast('Saved sample');else showToast(r.e||'Failed','error')}

// ===== DASHBOARD =====
async function loadDashboard(){
  const r=await api('/stats');if(!r)return;
  const set=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v||0};
  set('dashToday',r.todayRequests);set('dashWeek',r.weeklyRequests);
  set('dashMonth',r.monthlyRequests);set('dashTotal',r.totalRequests);
  set('statToday',r.todayRequests);set('statTotal',r.totalRequests);
  const renderTop=(id,arr,color)=>{const el=document.getElementById(id);if(!el)return;el.innerHTML=(arr||[]).map(x=>'<tr><td style="color:'+color+'">'+x.k+'</td><td>'+x.v+'</td></tr>').join('')||'<tr><td colspan="2" class="empty-state">No data</td></tr>'};
  renderTop('topKeysBody',r.topKeys,'var(--accent)');
  renderTop('topIPsBody',r.topIPs,'var(--info)');
  renderTop('topDevicesBody',r.topDevices,'var(--warning)');
  renderTop('topEpDash',r.topEndpoints,'var(--success)');
  const banR=await api('/bans');if(banR){const total=(banR.ip?.length||0)+(banR.device?.length||0)+(banR.key?.length||0);set('statBans',total)}
  const devR=await api('/devices');if(devR)set('statDevices',devR.total);
}

// ===== MONITOR =====
let allLogs=[];
async function loadMonitorLogs(){const r=await api('/monitor-logs');allLogs=r.logs?r.logs.reverse():[];renderMonitor()}
function renderMonitor(){const c=document.getElementById('monitorLogs');if(!c)return;const f=(document.getElementById('monitorFilter')?.value||'').toLowerCase();const flt=f?allLogs.filter(l=>JSON.stringify(l).toLowerCase().includes(f)):allLogs;c.innerHTML=flt.slice(0,200).map(l=>'<div class="log-entry"><span class="log-time">'+l.timestamp+'</span><span class="log-key">'+l.key+'</span><span class="log-endpoint">/'+l.endpoint+'</span><span class="log-ip">'+l.ip+'</span><span class="log-device">'+(l.deviceIcon||'❓')+'</span><span class="log-browser">'+l.browser+'</span></div>').join('')||'<div class="empty-state"><i class="fas fa-inbox"></i>No logs</div>'}

// ===== STATS =====
async function loadStats(){
  const r=await api('/stats');if(!r)return;
  ['statTotalReqs','statTodayReqs','statWeekReqs','statMonthReqs'].forEach((id,i)=>{const e=document.getElementById(id);if(e)e.textContent=[r.totalRequests,r.todayRequests,r.weeklyRequests,r.monthlyRequests][i]||0});
  const renderT=(id,arr,color)=>{const el=document.getElementById(id);if(!el)return;el.innerHTML=(arr||[]).map(x=>'<tr><td style="color:'+color+'">'+x.k+'</td><td>'+x.v+'</td></tr>').join('')||'<tr><td colspan="2" class="empty-state">No data</td></tr>'};
  renderT('topEndpointsBody',r.topEndpoints,'var(--accent)');
  renderT('clientStatsBody',r.clientStats,'var(--success)');
  renderT('browserStatsBody',r.browserStats,'var(--info)');
  renderT('countryStatsBody',r.countryStats,'var(--warning)');
  renderT('osStatsBody',r.osStats,'var(--purple,#a371f7)');
}

// ===== BANS =====
async function loadBans(){
  const r=await api('/bans');if(!r)return;
  const rows=(list,type)=>(list||[]).map(b=>'<tr><td><code style="font-size:10px">'+b.id.substring(0,30)+'</code></td><td style="font-size:12px">'+(b.reason||'')+'</td><td style="font-size:11px">'+(b.at||'')+'</td><td>'+(b.permanent?'<span class="badge badge-danger">PERM</span>':(b.until?new Date(b.until).toLocaleString():'-'))+'</td><td>'+(b.strikes||0)+'</td><td><button class="btn-action btn-reset" onclick="unban(\\''+type+'\\',\\''+b.id+'\\')"><i class="fas fa-unlock"></i></button></td></tr>').join('')||'<tr><td colspan="6" class="empty-state">Empty</td></tr>';
  document.getElementById('banIPBody').innerHTML=rows(r.ip,'ip');
  document.getElementById('banDeviceBody').innerHTML=rows(r.device,'device');
  document.getElementById('banKeyBody').innerHTML=rows(r.key,'key');
}
async function manualBan(){const type=document.getElementById('banType').value,id=document.getElementById('banId').value.trim();if(!id)return showToast('Enter value','error');const reason=prompt('Reason?','Manual ban')||'Manual ban';const r=await api('/ban',{type,id,reason,permanent:false,minutes:60});if(r.success){showToast('Banned');loadBans()}else showToast('Failed','error')}
async function unban(type,id){if(!confirm('Unban?'))return;const r=await api('/unban',{type,id});if(r.success){showToast('Unbanned');loadBans()}else showToast('Failed','error')}
async function unbanAll(){if(!confirm('Unban ALL?'))return;const r=await api('/unban-all');if(r.success){showToast('All unbanned');loadBans()}else showToast('Failed','error')}

// ===== DEVICES =====
async function loadDevices(){
  const r=await api('/devices');if(!r||!r.devices)return;
  document.getElementById('devicesBody').innerHTML=r.devices.slice(0,150).map(d=>'<tr>'+
    '<td><code style="font-size:10px">'+d.id.substring(0,22)+'..</code></td>'+
    '<td>'+(d.deviceIcon||'❓')+' '+(d.deviceType||'')+'</td>'+
    '<td>'+(d.os||'')+'</td><td>'+(d.browser||'')+'</td>'+
    '<td>'+d.requests+'</td><td style="font-size:11px">'+(d.lastSeen||'')+'</td>'+
    '<td>'+(d.banned?'<span class="badge badge-danger">Banned</span>':'<span class="badge badge-success">Active</span>')+'</td>'+
    '<td>'+(d.banned?'<button class="btn-action btn-reset" onclick="unban(\\'device\\',\\''+d.id+'\\')"><i class="fas fa-unlock"></i></button>':'<button class="btn-action btn-stop" onclick="quickBanDevice(\\''+d.id+'\\')"><i class="fas fa-ban"></i></button>')+'</td></tr>').join('')||'<tr><td colspan="8" class="empty-state">No devices</td></tr>';
}
async function quickBanDevice(id){if(!confirm('Ban device?'))return;const r=await api('/ban',{type:'device',id,reason:'Quick ban',permanent:false,minutes:60});if(r.success){showToast('Banned');loadDevices()}else showToast('Failed','error')}

// ===== DDOS =====
async function saveDDOS(){
  const data={mode:document.getElementById('ddosMode').value,
    ip:{burst10s:document.getElementById('ddosIP10').value,perMinute:document.getElementById('ddosIP1M').value,perHour:document.getElementById('ddosIP1H').value},
    device:{burst10s:document.getElementById('ddosDEV10').value,perMinute:document.getElementById('ddosDEV1M').value,perHour:document.getElementById('ddosDEV1H').value},
    tempBanMs:parseInt(document.getElementById('ddosTempBan').value)*60000,
    longBanMs:parseInt(document.getElementById('ddosLongBan').value)*60000};
  const r=await api('/ddos-config',data);
  if(r.success)showToast('Saved');else showToast('Failed','error');
}
async function clearAllStrikes(){if(!confirm('Clear strikes?'))return;const r=await api('/clear-strikes',{});if(r.success)showToast('Cleared');else showToast('Failed','error')}

// ===== LOGS =====
async function loadAdminLogs(){const r=await api('/admin-logs');if(!r||!r.logs)return;document.getElementById('adminLogsBody').innerHTML=r.logs.reverse().map(l=>'<tr><td style="font-size:11px">'+l.timestamp+'</td><td>'+l.user+'</td><td>'+l.action+'</td><td><code style="font-size:10px">'+l.ip+'</code></td><td>'+(l.device||'-')+'</td><td>'+(l.status==='SUCCESS'?'<span class="badge badge-success">OK</span>':'<span class="badge badge-danger">Fail</span>')+'</td></tr>').join('')||'<tr><td colspan="6" class="empty-state">No logs</td></tr>'}
async function loadAudit(){const r=await api('/audit-log');if(!r||!r.logs)return;document.getElementById('auditBody').innerHTML=r.logs.reverse().map(l=>'<tr><td style="font-size:11px">'+l.timestamp+'</td><td>'+l.user+'</td><td><code>'+l.action+'</code></td><td style="font-size:11px;color:var(--text-muted)">'+JSON.stringify(l.details||{}).substring(0,80)+'</td></tr>').join('')||'<tr><td colspan="4" class="empty-state">No entries</td></tr>'}

// ===== THEME =====
function renderThemeTab(){
  const pg=document.getElementById('presetsGrid');if(pg)pg.innerHTML=Object.keys(PRESETS).map(name=>'<div class="preset-card '+(CURRENT_THEME.preset===name?'active':'')+'" data-preset="'+name+'" onclick="applyPresetByName(\\''+name+'\\')"><div class="preset-swatch" style="background:linear-gradient(135deg,'+PRESETS[name].accent+','+PRESETS[name].accent2+')"></div><div class="preset-name">'+name+'</div></div>').join('');
  const ck=['accent','accent2','bgPrimary','bgSecondary','textPrimary','textSecondary','success','warning','danger','info'];
  const cp=document.getElementById('colorPickers');if(cp)cp.innerHTML=ck.map(k=>'<div class="color-picker-row"><label>'+k+'</label><input type="color" id="cp_'+k+'" value="'+(CURRENT_THEME.colors[k]||'#000000')+'"></div>').join('');
}
function switchTab(name,el){document.querySelectorAll('#section-theme .tab').forEach(t=>t.classList.remove('active'));if(el)el.classList.add('active');['presets','colors'].forEach(t=>{const x=document.getElementById('themeTab-'+t);if(x)x.style.display=t===name?'block':'none'})}
async function applyPresetByName(name){const r=await api('/theme/preset',{preset:name});if(r.success){showToast('Theme: '+name,'info');CURRENT_THEME=r.theme;renderThemeTab()}}
async function saveCustomColors(){const colors={};['accent','accent2','bgPrimary','bgSecondary','textPrimary','textSecondary','success','warning','danger','info'].forEach(k=>{const el=document.getElementById('cp_'+k);if(el)colors[k]=el.value});const r=await api('/theme/colors',{colors});if(r.success)showToast('Colors saved')}
async function resetTheme(){const r=await api('/theme/reset');if(r.success){showToast('Reset');CURRENT_THEME=r.theme;renderThemeTab()}}

// ===== BRANDING =====
async function loadBranding(){const r=await api('/branding');if(!r)return;document.getElementById('brandEnabled').value=r.enabled?'true':'false';document.getElementById('brandDefaultName').value=r.defaultName||'';document.getElementById('brandPosition').value=r.position||'bottom';document.getElementById('brandHideFields').value=(r.hideFields||[]).join(', ')}
async function saveBranding(){const hideFields=document.getElementById('brandHideFields').value.split(',').map(x=>x.trim()).filter(Boolean);const r=await api('/branding',{enabled:document.getElementById('brandEnabled').value==='true',defaultName:document.getElementById('brandDefaultName').value,position:document.getElementById('brandPosition').value,hideFields});if(r.success)showToast('Branding saved');else showToast('Failed','error')}

// ===== MESSAGES =====
async function loadMessages(){const r=await api('/custom-messages');if(!r)return;Object.keys(r).forEach(k=>{const el=document.getElementById('msg_'+k);if(el)el.value=r[k]})}
async function saveMessages(){const data={};['keyNotFound','limitReached','keyStopped','keyDisabled','keyExpired','scopeDenied','maintenance','rateLimited','protectedData','missingParam'].forEach(k=>{const el=document.getElementById('msg_'+k);if(el)data[k]=el.value});const r=await api('/custom-messages',data);if(r.success)showToast('Messages saved');else showToast('Failed','error')}

// ===== PROTECT =====
async function renderProtect(){const r=await api('/full-backup');const prot=r.protected||{};document.getElementById('protectList').innerHTML='<table style="width:100%"><thead><tr><th>Value</th><th>Status</th><th>Action</th></tr></thead><tbody>'+(Object.keys(prot).map(v=>'<tr><td><code>'+v+'</code></td><td><span class="badge badge-success">Protected</span></td><td><button class="btn-action btn-delete" onclick="removeProt(\\''+v+'\\')"><i class="fas fa-unlock"></i></button></td></tr>').join('')||'<tr><td colspan="3" class="empty-state">No protected values</td></tr>')+'</tbody></table>'}
async function addProtection(){const v=document.getElementById('protVal').value.trim();if(!v)return;const r=await api('/add-protection',{value:v});if(r.success){showToast('Protected');renderProtect();document.getElementById('protVal').value=''}else showToast('Failed','error')}
async function removeProt(v){if(!confirm('Remove protection?'))return;await api('/remove-protection',{value:v});renderProtect();showToast('Removed')}

// ===== IMPORT / EXPORT =====
async function importKeys(){const d=document.getElementById('importData').value.trim(),m=document.getElementById('importMsg');if(!d)return m.textContent='Paste JSON first';try{const j=JSON.parse(d);const r=await api('/import-keys',j);if(r.success){m.style.color='var(--success)';m.textContent='Imported '+r.message;setTimeout(()=>location.reload(),1500)}else{m.style.color='var(--danger)';m.textContent=r.e||'Failed'}}catch(e){m.style.color='var(--danger)';m.textContent='Invalid JSON'}}
async function loadExport(){const r=await api('/export-keys');if(r.success){document.getElementById('exportData').value=JSON.stringify(r,null,2);showToast('Loaded')}}
async function copyExport(){const t=document.getElementById('exportData');if(!t.value)return showToast('Click Load first','error');try{await navigator.clipboard.writeText(t.value);showToast('Copied')}catch(e){t.select();document.execCommand('copy');showToast('Copied')}}

// ===== FULL BACKUP =====
async function downloadFullBackup(){const r=await api('/full-backup');const blob=new Blob([JSON.stringify(r,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='bronx-full-backup-'+Date.now()+'.json';a.click();URL.revokeObjectURL(url);showToast('Downloaded')}
function handleFileUpload(event){
  const file=event.target.files[0];if(!file)return;
  const status=document.getElementById('uploadStatus');
  status.style.color='var(--info)';status.textContent='Reading file...';
  const reader=new FileReader();
  reader.onload=async(e)=>{
    try{
      const json=JSON.parse(e.target.result);
      status.textContent='Restoring...';
      const r=await api('/full-restore',json);
      if(r.success){status.style.color='var(--success)';status.textContent='✅ Restored! Reloading...';setTimeout(()=>location.reload(),1500)}
      else{status.style.color='var(--danger)';status.textContent='❌ '+(r.e||'Failed')}
    }catch(err){status.style.color='var(--danger)';status.textContent='❌ Invalid JSON file'}
  };
  reader.readAsText(file);
}
async function restoreData(){const d=document.getElementById('restoreData').value.trim();if(!d)return showToast('Paste JSON first','error');try{const j=JSON.parse(d);const r=await api('/full-restore',j);if(r.success){showToast('Restored');setTimeout(()=>location.reload(),1500)}else showToast(r.e||'Failed','error')}catch(e){showToast('Invalid JSON','error')}}

// Drag & drop
document.addEventListener('DOMContentLoaded',()=>{
  const box=document.getElementById('fileUploadBox');
  if(box){
    ['dragenter','dragover'].forEach(ev=>box.addEventListener(ev,e=>{e.preventDefault();box.classList.add('dragover')}));
    ['dragleave','drop'].forEach(ev=>box.addEventListener(ev,e=>{e.preventDefault();box.classList.remove('dragover')}));
    box.addEventListener('drop',e=>{const f=e.dataTransfer.files[0];if(f)handleFileUpload({target:{files:[f]}})});
  }
});

// ===== ANNOUNCEMENT / MAINTENANCE =====
async function loadAnnouncement(){const r=await api('/announcement');if(r){document.getElementById('annEnabled').value=r.enabled?'true':'false';document.getElementById('annText').value=r.text||'';document.getElementById('annType').value=r.type||'info'}}
async function saveAnnouncement(){const r=await api('/announcement',{enabled:document.getElementById('annEnabled').value==='true',text:document.getElementById('annText').value,type:document.getElementById('annType').value});if(r.success)showToast('Saved');else showToast('Failed','error')}
async function loadMaintenance(){const r=await api('/maintenance');if(r){document.getElementById('mtEnabled').value=r.enabled?'true':'false';document.getElementById('mtMessage').value=r.message||''}}
async function saveMaintenance(){const r=await api('/maintenance',{enabled:document.getElementById('mtEnabled').value==='true',message:document.getElementById('mtMessage').value});if(r.success)showToast('Saved');else showToast('Failed','error')}

// ===== SETTINGS =====
async function resetAll(){if(confirm('Reset ALL key usage?')){await api('/reset-all');showToast('Reset');setTimeout(()=>location.reload(),1000)}}
async function clearLogs(){if(confirm('Clear ALL logs?')){await api('/clear-logs');showToast('Cleared');setTimeout(()=>location.reload(),1000)}}

// ===== INIT =====
renderScopeLists();
renderKeys();
renderAPIs();
loadDashboard();
</script></body></html>`;
  }catch(e){
    return '<html><body style="background:#0b0d10;color:#f85149;padding:40px;font-family:monospace"><h1>⚠️ Admin Panel Error</h1><pre style="background:#161b22;padding:20px;border-radius:8px;overflow:auto">'+e.message+'\n\n'+e.stack+'</pre></body></html>';
  }
}

// ============================================================
// 🚀 BOOT
// ============================================================
// ============================================================
// 🚀 FINAL BOOT
// ============================================================
const PORT = process.env.PORT || 3000;
(async () => {
  initHardcoded();
  if(!loadFromDisk()){ if(!customAPIs.length) initCustomAPIs(); }
  if(!keyStorage[MASTER_API_KEY]) keyStorage[MASTER_API_KEY] = {
    name:'👑 OWNER', scopes:['*'], type:'owner', limit:999999, used:0,
    cooldown:0, dailyLimit:0, perSecondLimit:0, expiry:null,
    expiryStr:'LIFETIME', created:getIndiaDateTime(), unlimited:true, hidden:true, _hardcoded:false
  };
  saveToDisk();

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log('🛡️ BRONX V600 ULTRA ONLINE');
    console.log('🔐 Admin:', ADMIN_PATH);
    console.log('🚀 PORT:', PORT, '| Host: 0.0.0.0');
  });

  // Render ke edge ke saath connection timing fix
  server.keepAliveTimeout = 120000;
  server.headersTimeout = 120000;
})();
module.exports = app;
