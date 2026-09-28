// ============================================================
// 🛡️ BRONX OSINT V501 ULTRA PRO MAX — FULLY FIXED & RESTYLED
// ✅ FT OSINT Design System Applied
// ✅ All 200+ features intact
// ✅ Custom API scopes working
// ✅ Live theme changer working
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
const REAL_API_KEYS = ['bronx-bot-9999', 'bronx-ultra-king-ft-bro-op'];
let currentKeyIndex = 0;
const getNextKey = () => { const k = REAL_API_KEYS[currentKeyIndex]; currentKeyIndex = (currentKeyIndex + 1) % REAL_API_KEYS.length; return k; };

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'bronx';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '85095613';
const MASTER_API_KEY = process.env.MASTER_API_KEY || 'BRONX_MASTER_' + crypto.randomBytes(4).toString('hex').toUpperCase();
const ADMIN_PATH = '/bronx-admin-panel';

const DATA_DIR = process.env.RENDER_DATA_DIR || '/tmp';
const F = (n) => path.join(DATA_DIR, n);
const DATA_FILE = F('bronx_v501_data.json');
const LOGS_FILE = F('bronx_v501_logs.json');
const ADMIN_LOGS_FILE = F('bronx_v501_admin_logs.json');

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
// 🎨 LIVE THEME
// ============================================================
let theme = {
  preset: 'neon-red',
  colors: {
    bgPrimary: '#0a0505', bgSecondary: '#140808', bgCard: 'rgba(30,10,10,0.85)',
    borderColor: 'rgba(255,50,50,0.15)',
    textPrimary: '#ffffff', textSecondary: '#e0c0c0', textMuted: '#a08080',
    accent: '#ff2d2d', accent2: '#ff9500', success: '#00ff88', warning: '#ff9500',
    danger: '#ff2d2d', info: '#00e5ff', pink: '#ff2d95', purple: '#bf00ff', yellow: '#ffe600'
  },
  effects: { snowfall: true, snowCount: 100, glow: true, rainbowAnim: true, gridBg: true, scanLines: false, particles: true },
  fonts: { heading: 'Orbitron', body: 'Inter' },
  radius: 16,
  version: 1
};

const PRESETS = {
  'neon-red':    { accent: '#ff2d2d', accent2: '#ff9500', bgPrimary: '#0a0505', bgSecondary: '#140808' },
  'neon-green':  { accent: '#00ff88', accent2: '#00e5ff', bgPrimary: '#020a06', bgSecondary: '#08140c' },
  'neon-blue':   { accent: '#00b3ff', accent2: '#00e5ff', bgPrimary: '#020608', bgSecondary: '#0a1018' },
  'neon-purple': { accent: '#bf00ff', accent2: '#ff2d95', bgPrimary: '#08020a', bgSecondary: '#120814' },
  'neon-pink':   { accent: '#ff2d95', accent2: '#bf00ff', bgPrimary: '#0a0508', bgSecondary: '#14080f' },
  'neon-orange': { accent: '#ff9500', accent2: '#ffe600', bgPrimary: '#0a0702', bgSecondary: '#140e08' },
  'cyberpunk':   { accent: '#ff0066', accent2: '#00ffcc', bgPrimary: '#0a0510', bgSecondary: '#150a1f' },
  'matrix':      { accent: '#00ff00', accent2: '#00aa00', bgPrimary: '#000000', bgSecondary: '#0a0a0a' },
  'sunset':      { accent: '#ff6b35', accent2: '#f7b801', bgPrimary: '#1a0e0a', bgSecondary: '#26140e' },
  'ocean':       { accent: '#00b8d4', accent2: '#0055aa', bgPrimary: '#020810', bgSecondary: '#0a1424' },
  'midnight':    { accent: '#5b21b6', accent2: '#8b5cf6', bgPrimary: '#0a0a14', bgSecondary: '#141428' },
  'gold':        { accent: '#ffd700', accent2: '#ff9500', bgPrimary: '#0a0800', bgSecondary: '#141008' },
  'blood':       { accent: '#8b0000', accent2: '#ff2d2d', bgPrimary: '#0a0000', bgSecondary: '#1a0505' },
  'mint':        { accent: '#00ffb3', accent2: '#00e5ff', bgPrimary: '#020a08', bgSecondary: '#081410' },
  'vaporwave':   { accent: '#ff71ce', accent2: '#01cdfe', bgPrimary: '#1a0a24', bgSecondary: '#26103a' }
};

function hexToRgb(hex){
  const h = String(hex).replace('#','');
  const n = parseInt(h.length === 3 ? h.split('').map(c=>c+c).join('') : h, 16);
  return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
}
function hexToRgbStr(hex, alpha = 1){ return `rgba(${hexToRgb(hex)},${alpha})`; }
function applyPreset(name){
  const p = PRESETS[name];
  if(!p) return false;
  theme.preset = name;
  theme.colors.accent = p.accent;
  theme.colors.accent2 = p.accent2;
  theme.colors.bgPrimary = p.bgPrimary;
  theme.colors.bgSecondary = p.bgSecondary;
  theme.colors.bgCard = `rgba(${hexToRgb(p.bgSecondary)}, 0.85)`;
  theme.colors.borderColor = `rgba(${hexToRgb(p.accent)}, 0.15)`;
  theme.version++;
  return true;
}

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
  ip: { burst10s: 60, perMinute: 200, perHour: 1500, perDay: 15000 },
  device: { burst10s: 80, perMinute: 250, perHour: 2000 },
  key: { burst10s: 100, perMinute: 400, perHour: 3000 },
  strikes: { warnAt: 1, throttleAt: 2, tempBanAt: 3, longBanAt: 5, permanentAt: 10 },
  tempBanMs: 5 * 60 * 1000,
  longBanMs: 60 * 60 * 1000,
  login: { maxAttempts: 5, banMs: 30 * 60 * 1000 }
};

// ============================================================
// 💾 SAVE/LOAD
// ============================================================
function saveToDisk(){
  try{
    const ks = {};
    Object.entries(keyStorage).forEach(([k,v]) => { if(!v._hardcoded) ks[k] = v; });
    fs.writeFileSync(DATA_FILE, JSON.stringify({
      keys: ks, apis: customAPIs, tokens: permanentTokens,
      logs: requestLogs.slice(-2000), protected: protectedData,
      endpointResponses, theme, bans, abuseTracker,
      deviceFingerprints, ddosConfig, blocklist, whitelist,
      announcement, maintenance, auditLog: auditLog.slice(-500)
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
  if(/chrome os/.test(ua)) return { type:'Chromebook', icon:'💻', os:'ChromeOS' };
  if(/curl|wget|python|node|axios|java|php|ruby|go-http/.test(ua)) return { type:'Bot/CLI', icon:'🤖', os:'Bot' };
  return { type:'Unknown', icon:'❓', os:'Unknown' };
}
function detectBrowser(req){
  const ua = (req.headers['user-agent'] || '').toLowerCase();
  if(/edg\//.test(ua)) return 'Edge';
  if(/opr\/|opera/.test(ua)) return 'Opera';
  if(/brave/.test(ua)) return 'Brave';
  if(/vivaldi/.test(ua)) return 'Vivaldi';
  if(/ucbrowser/.test(ua)) return 'UC Browser';
  if(/samsungbrowser/.test(ua)) return 'Samsung Internet';
  if(/chrome|crios/.test(ua)) return 'Chrome';
  if(/firefox|fxios/.test(ua)) return 'Firefox';
  if(/safari/.test(ua)) return 'Safari';
  if(/postman/.test(ua)) return 'Postman';
  if(/insomnia/.test(ua)) return 'Insomnia';
  if(/curl/.test(ua)) return 'cURL';
  if(/python/.test(ua)) return 'Python';
  if(/node|axios/.test(ua)) return 'Node.js';
  return 'Unknown';
}
function detectCountry(req){
  return req.headers['cf-ipcountry'] || req.headers['x-country'] || 'Unknown';
}

// ============================================================
// 🧠 SMART DDOS
// ============================================================
function isBanned(type, id){
  const b = bans[type]?.[id];
  if(!b) return false;
  if(b.permanent) return true;
  if(Date.now() < b.until) return true;
  delete bans[type][id];
  return false;
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
  const s = bucket[id].strikes;
  const c = ddosConfig.strikes;
  if(s >= c.permanentAt){
    if(!bans[ctx.type]) bans[ctx.type] = {};
    bans[ctx.type][id] = { permanent: true, reason, at: getIndiaDateTime(), strikes: s };
    return { action:'PERMANENT_BAN', message:'🚫 PERMANENT BAN' };
  }
  if(s >= c.longBanAt){
    if(!bans[ctx.type]) bans[ctx.type] = {};
    bans[ctx.type][id] = { until: Date.now() + ddosConfig.longBanMs, reason, at: getIndiaDateTime(), strikes: s };
    return { action:'LONG_BAN', message:'⛔ 1 hour ban' };
  }
  if(s >= c.tempBanAt){
    if(!bans[ctx.type]) bans[ctx.type] = {};
    bans[ctx.type][id] = { until: Date.now() + ddosConfig.tempBanMs, reason, at: getIndiaDateTime(), strikes: s };
    return { action:'TEMP_BAN', message:'⏸️ 5 min ban' };
  }
  if(s >= c.throttleAt) return { action:'THROTTLE', message:'🐢 Slow down' };
  return { action:'WARN', message:'⚠️ Warning #' + s };
}
function smartDDoS(req){
  if(!ddosConfig.enabled || ddosConfig.mode === 'off') return { allowed: true };
  const ip = getRealIP(req);
  const deviceId = generateDeviceId(req);
  const key = req.query.key || req.headers['x-api-key'] || '';
  if(whitelist.ips.includes(ip)) return { allowed: true, action: 'WHITELISTED' };
  if(isBanned('ip', ip)) return { allowed:false, code:403, reason:'IP banned', type:'ip', id:ip, action:'BANNED' };
  if(isBanned('device', deviceId)) return { allowed:false, code:403, reason:'Device banned', type:'device', id:deviceId, action:'BANNED' };
  if(key && isBanned('key', key)) return { allowed:false, code:403, reason:'Key banned', type:'key', id:key, action:'BANNED' };
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
  let r = check('ip', ip, ddosConfig.ip, abuseTracker.ip);
  if(r) return { allowed: r.action === 'WARN' || r.action === 'THROTTLE', code: r.action.includes('BAN') ? 403 : 200, reason: r.message, action: r.action, type:'ip', id:ip };
  r = check('device', deviceId, ddosConfig.device, abuseTracker.device);
  if(r) return { allowed: r.action === 'WARN' || r.action === 'THROTTLE', code: r.action.includes('BAN') ? 403 : 200, reason: r.message, action: r.action, type:'device', id:deviceId };
  if(key){
    r = check('key', key, ddosConfig.key, abuseTracker.key);
    if(r) return { allowed: r.action === 'WARN' || r.action === 'THROTTLE', code: r.action.includes('BAN') ? 403 : 200, reason: r.message, action: r.action, type:'key', id:key };
  }
  return { allowed: true, action: 'OK' };
}

// ============================================================
// 🔑 KEY VALIDATION
// ============================================================
function checkCooldown(k){
  const kd = keyStorage[k];
  if(!kd?.cooldown) return { allowed: true };
  const n = Date.now();
  if(cooldownTimers[k] && (n - cooldownTimers[k]) < kd.cooldown*1000)
    return { allowed: false, remaining: Math.ceil((kd.cooldown*1000 - (n - cooldownTimers[k]))/1000) };
  cooldownTimers[k] = n;
  return { allowed: true };
}
function checkPerSecondLimit(k){
  const kd = keyStorage[k];
  if(!kd?.perSecondLimit) return { allowed: true };
  const wk = k + '_ps_' + Math.floor(Date.now()/1000);
  if(!perSecondLimits[wk]) perSecondLimits[wk] = 0;
  if(perSecondLimits[wk] >= kd.perSecondLimit) return { allowed: false, message: `⚡ ${kd.perSecondLimit}/s reached` };
  perSecondLimits[wk]++;
  return { allowed: true };
}
function checkDailyLimit(k){
  const kd = keyStorage[k];
  if(!kd?.dailyLimit) return { allowed: true };
  const dk = k + '_' + getIndiaDate();
  if(!dailyLimits[dk]) dailyLimits[dk] = 0;
  if(dailyLimits[dk] >= kd.dailyLimit) return { allowed: false, message: `🔴 Daily limit reached` };
  return { allowed: true };
}
function isProtected(value){
  for(const key in protectedData){ if(String(value).includes(protectedData[key])) return protectedData[key]; }
  return null;
}
function checkKeyValid(k){
  if(!k) return { valid: false, error: 'Missing key' };
  if(maintenance.enabled && !whitelist.keys.includes(k)) return { valid: false, error: '🔧 ' + maintenance.message };
  const kd = keyStorage[k];
  if(!kd) return { valid: false, error: '🔑 Key not found!\n\n🛒 Purchase: @BRONX_ULTRA' };
  if(kd.stopped) return { valid: false, error: '⛔ Key stopped' };
  if(kd.disabled) return { valid: false, error: '🚫 Key disabled' };
  if(kd.expiry && isKeyExpired(kd.expiry)) return { valid: false, error: '⏰ Expired on ' + kd.expiryStr };
  if(!kd.unlimited && kd.used >= kd.limit) return { valid: false, error: `🔴 Limit reached ${kd.limit}/${kd.limit}` };
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
  if(!ipRequestCounts[ip] || ipRequestCounts[ip].date !== getIndiaDate())
    ipRequestCounts[ip] = { count: 0, date: getIndiaDate() };
  ipRequestCounts[ip].count++;
  keyMonitorLogs.push({ key: k.substring(0,8)+'***', fullKey: k, endpoint: ep, ip, deviceId, deviceIcon: di.icon, deviceType: di.type, browser, clientType: browser, country, timestamp: getIndiaDateTime(), date: getIndiaDate() });
  if(keyMonitorLogs.length > 1000) keyMonitorLogs = keyMonitorLogs.slice(-1000);
}

function checkKeyScope(kd, ep){
  if(!kd?.scopes?.length) return { valid: false, error: 'No scopes assigned' };
  if(kd.scopes.includes('*')) return { valid: true };
  if(kd.scopes.includes(ep)) return { valid: true };
  const cleanEp = ep.startsWith('c/') ? ep.substring(2) : ep;
  const isCustom = customAPIs.some(a => a.endpoint === cleanEp);
  if(isCustom){
    if(kd.scopes.includes('custom')) return { valid: true };
    if(kd.scopes.includes('custom:' + cleanEp)) return { valid: true };
  }
  return { valid: false, error: 'Scope denied: ' + ep + ' (allowed: ' + kd.scopes.join(', ') + ')' };
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
function sanitizeResponse(d){
  if(!d) return d;
  try{
    const c = JSON.parse(JSON.stringify(d));
    ['credit','truecaller_name','cached','cached_at','api_by','by','channel','developer','api_key','real_url','source_url','owner','key_note','response_time_ms'].forEach(x => delete c[x]);
    if(c.meta){ delete c.meta.api_by; delete c.meta.response_time_ms; delete c.meta.quota_used; if(!Object.keys(c.meta).length) delete c.meta; }
    c.powered_by = '@BRONX_ULTRA';
    return c;
  }catch(e){ return d; }
}
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
  if(r.action && r.action !== 'OK') res.setHeader('X-Bronx-Warning', r.reason || 'ok');
  if(!r.allowed) return res.status(r.code || 429).json({ error: r.reason || 'Rate limited', type: r.type || 'unknown', action: r.action || 'BLOCKED' });
  if(r.action === 'THROTTLE') return setTimeout(() => next(), 800);
  next();
});

// ============================================================
// 🏠 PUBLIC
// ============================================================
app.get('/', (req,res) => { try { res.send(renderHome()); } catch(e){ res.send('err: ' + e.message); } });
app.get('/test', (req,res) => res.json({
  status:'✅ BRONX V501 ULTRA FIXED', version:'5.0.1', ddos: ddosConfig.mode,
  keys: Object.keys(keyStorage).length, endpoints: Object.keys(endpoints).length,
  custom: customAPIs.length, bannedIPs: Object.keys(bans.ip).length,
  bannedDevices: Object.keys(bans.device).length, devicesTracked: Object.keys(deviceFingerprints).length,
  theme: theme.preset, maintenance: maintenance.enabled
}));
app.get('/theme', (req,res) => res.json(theme));
app.get('/public-theme', (req,res) => res.json({ theme, announcement, maintenance }));

app.get('/api/custom/:ep', async (req,res) => {
  try{
    const api = customAPIs.find(a => a.endpoint === req.params.ep && a.visible);
    if(!api) return res.json({error:'API not found or disabled'});
    const key = req.query.key;
    if(!key) return res.json({error:'Key required'});
    const kc = checkKeyValid(key);
    if(!kc.valid) return res.json({error: kc.error});
    const sc = checkKeyScope(kc.keyData, req.params.ep);
    if(!sc.valid) return res.json({error: sc.error});
    const pv = req.query[api.param] || req.query.number || req.query.num;
    if(!pv) return res.json({error:'Missing param: ' + api.param});
    if(isProtected(pv)) return res.json({error:'🔒 PROTECTED', protected:true});
    const url = api.realAPI.replace(/\{param\}/gi, encodeURIComponent(pv));
    const r = await axios.get(url, { timeout: 30000 });
    incrementKeyUsage(key, 'c/'+req.params.ep, req);
    requestLogs.push({ timestamp: getIndiaDateTime(), key:key.substring(0,8)+'***', endpoint:'c/'+req.params.ep, param:String(pv).substring(0,20), status:'success', ip:getRealIP(req), clientType:detectBrowser(req) });
    if(requestLogs.length > 2000) requestLogs = requestLogs.slice(-2000);
    res.json({ ...sanitizeResponse(r.data), api_info: { key_owner: kc.keyData.name, remaining: kc.keyData.unlimited ? '∞' : Math.max(0, kc.keyData.limit - kc.keyData.used), expiry: kc.keyData.expiryStr || 'LIFETIME' } });
  }catch(e){ res.json({error:'API error: ' + e.message}); }
});

app.get('/api/key-bronx/:ep', async (req,res) => {
  try{
    const ep = req.params.ep;
    if(!endpoints[ep]) return res.json({error:'Endpoint not found'});
    const key = req.query.key;
    if(!key) return res.json({error:'Key required'});
    const kc = checkKeyValid(key);
    if(!kc.valid) return res.json({error: kc.error});
    const sc = checkKeyScope(kc.keyData, ep);
    if(!sc.valid) return res.json({error: sc.error});
    const pv = req.query[endpoints[ep].p];
    if(!pv) return res.json({error:'Missing ' + endpoints[ep].p});
    if(isProtected(pv)) return res.json({error:'🔒 PROTECTED', protected:true});
    if(endpointResponses[ep]) return res.json({ ...endpointResponses[ep], api_info:{key_owner:kc.keyData.name} });
    const url = `${REAL_API_BASE}/${ep}?key=${getNextKey()}&${endpoints[ep].p}=${encodeURIComponent(pv)}`;
    const r = await axios.get(url, { timeout: 30000 });
    incrementKeyUsage(key, ep, req);
    requestLogs.push({ timestamp: getIndiaDateTime(), key:key.substring(0,8)+'***', endpoint:ep, param:String(pv).substring(0,20), status:'success', ip:getRealIP(req), clientType:detectBrowser(req) });
    if(requestLogs.length > 2000) requestLogs = requestLogs.slice(-2000);
    res.json({ ...sanitizeResponse(r.data), api_info: { key_owner: kc.keyData.name, remaining: kc.keyData.unlimited ? '∞' : Math.max(0, kc.keyData.limit - kc.keyData.used), expiry: kc.keyData.expiryStr || 'LIFETIME' } });
  }catch(e){ res.json({error:'API error'}); }
});

app.get('/api/number', async (req,res) => {
  try{
    const key = req.query.key, num = req.query.num;
    if(!key) return res.json({error:'Key required'});
    if(!num) return res.json({error:'Missing num'});
    const kc = checkKeyValid(key);
    if(!kc.valid) return res.json({error: kc.error});
    if(isProtected(num)) return res.json({error:'🔒 PROTECTED', protected:true});
    const r = await axios.get(`${REAL_API_BASE}/number?key=${getNextKey()}&num=${encodeURIComponent(num)}`, { timeout: 30000 });
    incrementKeyUsage(key, 'number', req);
    res.json({ ...sanitizeResponse(r.data), api_info:{key_owner:kc.keyData.name} });
  }catch(e){ res.json({error:'API error'}); }
});

app.get('/api/leakinfo', async (req,res) => {
  try{
    const t = req.query.term || req.query.info;
    if(!t) return res.json({error:'Missing term'});
    if(isProtected(t)) return res.json({error:'🔒 PROTECTED', protected:true});
    const r = await axios.get(`${REAL_API_BASE}/leakinfo?key=${getNextKey()}&info=${encodeURIComponent(t)}`, { timeout: 30000 });
    res.json({ ...sanitizeResponse(r.data), api_info:{endpoint:'leakinfo'} });
  }catch(e){ res.json({error:'API error'}); }
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
// 🎛️ ADMIN APIs (All preserved)
// ============================================================
app.post(ADMIN_PATH + '/generate-key', adminAuth, (req,res) => {
  const { keyName, keyOwner, scopes, limit, expiryDate, days, cooldown, dailyLimit, perSecondLimit, autoGenerate, notes } = req.body;
  let fk = keyName; if(autoGenerate || !keyName) fk = genRandomKey();
  if(!fk || !keyOwner) return res.json({e:'Missing fields'});
  if(keyStorage[fk]) return res.json({e:'Key already exists'});
  const ks = scopes || ['number'];
  let exp = null, es = expiryDate || 'LIFETIME';
  if(days && !isNaN(days)){
    const d = new Date(Date.now() + parseInt(days)*24*3600*1000);
    exp = d; es = d.toISOString().split('T')[0].split('-').reverse().join('-');
  } else if(expiryDate && expiryDate !== 'LIFETIME'){ exp = parseExpiryDate(expiryDate); es = expiryDate; }
  keyStorage[fk] = { name:keyOwner, scopes:ks, type:'generated', limit:parseInt(limit)||100, used:0, cooldown:parseInt(cooldown)||0, dailyLimit:parseInt(dailyLimit)||0, perSecondLimit:parseInt(perSecondLimit)||0, expiry:exp, expiryStr:es, created:getIndiaDateTime(), unlimited:false, hidden:false, _hardcoded:false, stopped:false, disabled:false, notes:notes||'' };
  logAudit('admin', 'GENERATE_KEY', { key:fk, scopes:ks });
  saveToDisk();
  res.json({ success:true, key:fk, message:'🔑 Key Generated!' });
});

app.post(ADMIN_PATH + '/edit-key', adminAuth, (req,res) => {
  const { keyName, newName, newOwner, newLimit, newDailyLimit, newPerSecondLimit, newCooldown, newScopes, newNotes, newExpiry } = req.body;
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

app.post(ADMIN_PATH + '/bulk-delete', adminAuth, (req,res) => {
  const { keys } = req.body; let n = 0;
  (keys||[]).forEach(k => { if(keyStorage[k] && !keyStorage[k]._hardcoded && k !== MASTER_API_KEY){ delete keyStorage[k]; n++; } });
  saveToDisk(); res.json({success:true, deleted:n});
});
app.post(ADMIN_PATH + '/bulk-stop', adminAuth, (req,res) => {
  const { keys, state } = req.body; let n = 0;
  (keys||[]).forEach(k => { if(keyStorage[k] && !keyStorage[k]._hardcoded){ keyStorage[k].stopped = !!state; n++; } });
  saveToDisk(); res.json({success:true, updated:n});
});
app.post(ADMIN_PATH + '/bulk-disable', adminAuth, (req,res) => {
  const { keys, state } = req.body; let n = 0;
  (keys||[]).forEach(k => { if(keyStorage[k] && !keyStorage[k]._hardcoded){ keyStorage[k].disabled = !!state; n++; } });
  saveToDisk(); res.json({success:true, updated:n});
});
app.post(ADMIN_PATH + '/bulk-reset', adminAuth, (req,res) => {
  const { keys } = req.body; let n = 0;
  (keys||[]).forEach(k => { if(keyStorage[k]){ keyStorage[k].used = 0; n++; } });
  saveToDisk(); res.json({success:true, reset:n});
});
app.post(ADMIN_PATH + '/bulk-push', adminAuth, (req,res) => {
  const { keys, days } = req.body; const d = parseInt(days)||30; let n = 0;
  const ne = new Date(Date.now() + d*24*3600*1000);
  (keys||[]).forEach(k => { if(keyStorage[k] && !keyStorage[k]._hardcoded){ keyStorage[k].expiry = ne; keyStorage[k].expiryStr = ne.toISOString().split('T')[0].split('-').reverse().join('-'); n++; } });
  saveToDisk(); res.json({success:true, count:n});
});

app.post(ADMIN_PATH + '/add-api', adminAuth, (req,res) => {
  const { name, endpoint, param, example, realAPI, visible } = req.body;
  if(!name || !endpoint) return res.json({e:'Name and endpoint required'});
  const cleanEndpoint = String(endpoint).toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  if(!cleanEndpoint) return res.json({e:'Invalid endpoint'});
  if(customAPIs.some(a => a.endpoint === cleanEndpoint)) return res.json({e:'Endpoint already exists'});
  const newApi = { id: Date.now(), name: String(name), endpoint: cleanEndpoint, param: param || 'num', example: example || '9876543210', visible: visible !== false, realAPI: realAPI || '', scopeKey: 'custom:' + cleanEndpoint, createdAt: getIndiaDateTime() };
  customAPIs.push(newApi);
  logAudit('admin', 'ADD_API', { name, endpoint: cleanEndpoint });
  saveToDisk();
  res.json({ success:true, api: newApi, message:'✅ API Added!' });
});

app.post(ADMIN_PATH + '/toggle-api', adminAuth, (req,res) => {
  const a = customAPIs.find(x => x.id === parseInt(req.body.id));
  if(a){ a.visible = !a.visible; saveToDisk(); res.json({success:true, visible:a.visible}); }
  else res.json({e:'Not found'});
});

app.post(ADMIN_PATH + '/delete-api', adminAuth, (req,res) => {
  const i = customAPIs.findIndex(x => x.id === parseInt(req.body.id));
  if(i > -1){ customAPIs.splice(i,1); saveToDisk(); res.json({success:true}); }
  else res.json({e:'Not found'});
});

app.post(ADMIN_PATH + '/edit-api', adminAuth, (req,res) => {
  const { id, name, endpoint, param, example, realAPI } = req.body;
  const a = customAPIs.find(x => x.id === parseInt(id));
  if(!a) return res.json({e:'Not found'});
  if(name) a.name = name;
  if(endpoint) a.endpoint = String(endpoint).toLowerCase().replace(/[^a-z0-9-]/g, '-');
  if(param) a.param = param;
  if(example) a.example = example;
  if(realAPI) a.realAPI = realAPI;
  a.scopeKey = 'custom:' + a.endpoint;
  saveToDisk(); res.json({success:true, api:a});
});

app.post(ADMIN_PATH + '/add-protection', adminAuth, (req,res) => {
  const v = req.body.value; if(!v) return res.json({e:'Missing'});
  protectedData[v] = v; saveToDisk(); res.json({success:true});
});
app.post(ADMIN_PATH + '/remove-protection', adminAuth, (req,res) => {
  delete protectedData[req.body.value]; saveToDisk(); res.json({success:true});
});

app.get(ADMIN_PATH + '/bans', adminAuth, (req,res) => {
  const toList = (o) => Object.entries(o).map(([id,d]) => ({ id, ...d }));
  res.json({ ip: toList(bans.ip), device: toList(bans.device), key: toList(bans.key) });
});
app.post(ADMIN_PATH + '/ban', adminAuth, (req,res) => {
  const { type, id, reason, permanent, minutes } = req.body;
  if(!type || !id) return res.json({e:'Missing'});
  if(!bans[type]) bans[type] = {};
  bans[type][id] = { permanent:!!permanent, until:permanent?null:Date.now()+(parseInt(minutes)||60)*60000, reason:reason||'Manual ban', at:getIndiaDateTime(), strikes:(bans[type][id]?.strikes||0)+1 };
  saveToDisk(); res.json({success:true});
});
app.post(ADMIN_PATH + '/unban', adminAuth, (req,res) => {
  const { type, id } = req.body;
  if(!bans[type]) return res.json({e:'No bans'});
  delete bans[type][id];
  if(abuseTracker[type]?.[id]) delete abuseTracker[type][id];
  saveToDisk(); res.json({success:true});
});
app.post(ADMIN_PATH + '/unban-all', adminAuth, (req,res) => {
  bans = { ip:{}, device:{}, key:{} };
  abuseTracker = { ip:{}, device:{}, key:{} };
  saveToDisk(); res.json({success:true});
});
app.get(ADMIN_PATH + '/devices', adminAuth, (req,res) => {
  const list = Object.entries(deviceFingerprints).map(([id,d]) => ({ id, ...d, banned: !!bans.device[id] })).sort((a,b) => b.requests - a.requests);
  res.json({ devices: list, total: list.length });
});

app.get(ADMIN_PATH + '/ddos-config', adminAuth, (req,res) => res.json(ddosConfig));
app.post(ADMIN_PATH + '/ddos-config', adminAuth, (req,res) => {
  const c = req.body;
  if(c.enabled !== undefined) ddosConfig.enabled = !!c.enabled;
  if(c.mode) ddosConfig.mode = c.mode;
  ['ip','device','key'].forEach(k => {
    if(c[k]){
      if(c[k].burst10s) ddosConfig[k].burst10s = parseInt(c[k].burst10s);
      if(c[k].perMinute) ddosConfig[k].perMinute = parseInt(c[k].perMinute);
      if(c[k].perHour) ddosConfig[k].perHour = parseInt(c[k].perHour);
    }
  });
  if(c.strikes) Object.keys(c.strikes).forEach(x => { if(c.strikes[x] !== undefined) ddosConfig.strikes[x] = parseInt(c.strikes[x]); });
  if(c.tempBanMs) ddosConfig.tempBanMs = parseInt(c.tempBanMs);
  if(c.longBanMs) ddosConfig.longBanMs = parseInt(c.longBanMs);
  saveToDisk(); res.json({success:true, config:ddosConfig});
});
app.post(ADMIN_PATH + '/clear-strikes', adminAuth, (req,res) => {
  const { type, id } = req.body;
  if(type && id){ if(abuseTracker[type]?.[id]) abuseTracker[type][id].strikes = 0; }
  else if(type){ Object.keys(abuseTracker[type]||{}).forEach(x => abuseTracker[type][x].strikes = 0); }
  else { ['ip','device','key'].forEach(t => Object.keys(abuseTracker[t]||{}).forEach(x => abuseTracker[t][x].strikes = 0)); }
  saveToDisk(); res.json({success:true});
});

app.get(ADMIN_PATH + '/monitor-logs', adminAuth, (req,res) => {
  res.json({ logs: keyMonitorLogs.slice(-300), total: keyMonitorLogs.length });
});
app.get(ADMIN_PATH + '/admin-logs', adminAuth, (req,res) => {
  res.json({ logs: adminLogs.slice(-300), total: adminLogs.length });
});
app.get(ADMIN_PATH + '/audit-log', adminAuth, (req,res) => {
  res.json({ logs: auditLog.slice(-300), total: auditLog.length });
});

app.get(ADMIN_PATH + '/stats', adminAuth, (req,res) => {
  if(statsCache.data && Date.now() < statsCache.expiresAt) return res.json(statsCache.data);
  const today = getIndiaDate();
  const weekAgo = new Date(Date.now() - 7*86400000).toISOString().split('T')[0];
  const monthAgo = new Date(Date.now() - 30*86400000).toISOString().split('T')[0];
  const todayL = keyMonitorLogs.filter(l => l.date === today);
  const weekL = keyMonitorLogs.filter(l => l.date >= weekAgo);
  const monthL = keyMonitorLogs.filter(l => l.date >= monthAgo);
  const byKey = {}, byEp = {}, byIP = {}, byClient = {}, byDevice = {}, byCountry = {}, byBrowser = {}, byOS = {};
  keyMonitorLogs.forEach(l => {
    byKey[l.key] = (byKey[l.key]||0)+1;
    byEp[l.endpoint] = (byEp[l.endpoint]||0)+1;
    byIP[l.ip] = (byIP[l.ip]||0)+1;
    byClient[l.clientType||'?'] = (byClient[l.clientType||'?']||0)+1;
    byBrowser[l.browser||'?'] = (byBrowser[l.browser||'?']||0)+1;
    if(l.deviceId) byDevice[l.deviceId] = (byDevice[l.deviceId]||0)+1;
    if(l.country && l.country !== 'Unknown') byCountry[l.country] = (byCountry[l.country]||0)+1;
  });
  Object.values(deviceFingerprints).forEach(d => { if(d.os) byOS[d.os] = (byOS[d.os]||0)+1; });
  const top = (o, n=10) => Object.entries(o).sort((a,b) => b[1]-a[1]).slice(0,n).map(([k,v]) => ({ k, v }));
  const data = {
    totalRequests: keyMonitorLogs.length, todayRequests: todayL.length,
    weeklyRequests: weekL.length, monthlyRequests: monthL.length,
    topKeys: top(byKey, 5), topEndpoints: top(byEp, 10),
    topIPs: top(byIP, 10), topDevices: top(byDevice, 10),
    clientStats: top(byClient, 10), browserStats: top(byBrowser, 10),
    countryStats: top(byCountry, 10), osStats: top(byOS, 10)
  };
  statsCache = { data, expiresAt: Date.now() + 10000 };
  res.json(data);
});

app.get(ADMIN_PATH + '/theme', adminAuth, (req,res) => res.json({ theme, presets: Object.keys(PRESETS) }));
app.post(ADMIN_PATH + '/theme/preset', adminAuth, (req,res) => {
  if(!applyPreset(req.body.preset)) return res.json({e:'Invalid preset'});
  saveToDisk(); res.json({ success:true, theme });
});
app.post(ADMIN_PATH + '/theme/colors', adminAuth, (req,res) => {
  if(!req.body.colors) return res.json({e:'Missing'});
  Object.keys(req.body.colors).forEach(k => { if(theme.colors[k] !== undefined) theme.colors[k] = req.body.colors[k]; });
  theme.preset = 'custom'; theme.version++;
  saveToDisk(); res.json({ success:true, theme });
});
app.post(ADMIN_PATH + '/theme/effects', adminAuth, (req,res) => {
  if(!req.body.effects) return res.json({e:'Missing'});
  Object.keys(req.body.effects).forEach(k => { if(theme.effects[k] !== undefined) theme.effects[k] = req.body.effects[k]; });
  theme.version++; saveToDisk(); res.json({ success:true, theme });
});
app.post(ADMIN_PATH + '/theme/reset', adminAuth, (req,res) => {
  applyPreset('neon-red'); saveToDisk(); res.json({ success:true, theme });
});

app.get(ADMIN_PATH + '/announcement', adminAuth, (req,res) => res.json(announcement));
app.post(ADMIN_PATH + '/announcement', adminAuth, (req,res) => {
  announcement.enabled = !!req.body.enabled;
  announcement.text = req.body.text || '';
  announcement.type = req.body.type || 'info';
  saveToDisk(); res.json({ success:true, announcement });
});

app.get(ADMIN_PATH + '/maintenance', adminAuth, (req,res) => res.json(maintenance));
app.post(ADMIN_PATH + '/maintenance', adminAuth, (req,res) => {
  maintenance.enabled = !!req.body.enabled;
  maintenance.message = req.body.message || 'System under maintenance';
  saveToDisk(); res.json({ success:true, maintenance });
});

app.get(ADMIN_PATH + '/export-keys', adminAuth, (req,res) => {
  const out = {};
  Object.entries(keyStorage).forEach(([k,v]) => { if(!v._hardcoded && !v.hidden) out[k] = v; });
  res.json({ success:true, total:Object.keys(out).length, keys:out, exported_at:getIndiaDateTime() });
});
app.post(ADMIN_PATH + '/import-keys', adminAuth, (req,res) => {
  try{
    let body = req.body;
    let toImport = body.keys || body;
    if(toImport.keys && typeof toImport.keys === 'object' && !Array.isArray(toImport.keys)) toImport = toImport.keys;
    const meta = ['success','total','keys','exported_at'];
    let imported = 0, skipped = 0;
    Object.entries(toImport).forEach(([k,d]) => {
      if(meta.includes(k) && typeof d !== 'object') return;
      if(!d || typeof d !== 'object') return;
      if(keyStorage[k] || d._hardcoded){ skipped++; return; }
      keyStorage[k] = { ...d, _hardcoded:false, hidden:false, type:'generated' };
      imported++;
    });
    saveToDisk();
    res.json({ success:true, imported, skipped, message:`✅ ${imported} imported, ${skipped} skipped` });
  }catch(e){ res.json({e:'Error: ' + e.message}); }
});

app.post(ADMIN_PATH + '/update-endpoint-response', adminAuth, (req,res) => {
  const { endpoint, responseData } = req.body;
  if(!endpoint) return res.json({e:'Missing'});
  try{
    if(!responseData || responseData.trim() === ''){ delete endpointResponses[endpoint]; }
    else endpointResponses[endpoint] = typeof responseData === 'string' ? JSON.parse(responseData) : responseData;
    saveToDisk(); res.json({success:true});
  }catch(e){ res.json({e:'Invalid JSON'}); }
});
app.get(ADMIN_PATH + '/get-endpoint-response', adminAuth, (req,res) => {
  res.json({ data: endpointResponses[req.query.endpoint] || null });
});

app.get(ADMIN_PATH + '/backup', adminAuth, (req,res) => {
  const ks = {};
  Object.entries(keyStorage).forEach(([k,v]) => { if(!v._hardcoded) ks[k]=v; });
  res.json({ version:'5.0.1', exported_at: getIndiaDateTime(), keys: ks, apis: customAPIs, protected: protectedData, endpointResponses, theme, ddosConfig, blocklist, whitelist, announcement, maintenance, bans, deviceFingerprints });
});
app.post(ADMIN_PATH + '/restore', adminAuth, (req,res) => {
  try{
    const b = req.body;
    if(b.keys) Object.entries(b.keys).forEach(([k,v]) => { if(!v._hardcoded) keyStorage[k] = v; });
    if(b.apis) customAPIs = b.apis;
    if(b.protected) protectedData = b.protected;
    if(b.endpointResponses) endpointResponses = b.endpointResponses;
    if(b.theme) theme = b.theme;
    if(b.ddosConfig) ddosConfig = { ...ddosConfig, ...b.ddosConfig };
    if(b.blocklist) blocklist = b.blocklist;
    if(b.whitelist) whitelist = b.whitelist;
    if(b.announcement) announcement = b.announcement;
    if(b.maintenance) maintenance = b.maintenance;
    saveToDisk(); res.json({success:true, message:'✅ Restored'});
  }catch(e){ res.json({e:'Restore failed: ' + e.message}); }
});

app.use((req,res) => res.json({error:'Not found'}));

// ============================================================
// 🎨 FT OSINT THEME CSS (Shared across all pages)
// ============================================================
function generateFTCSS(){
  return `
<style id="ft-theme">
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#010204;--bg1:#070a13;--bg2:#0c101c;--bg3:#121828;
  --bd:#1a233a;--bd2:#27344f;
  --tx:#f8fafc;--tx2:#94a3b8;--tx3:#64748b;
  --ac:#818cf8;--ac2:rgba(129,140,248,.12);--ac3:rgba(129,140,248,.06);
  --gr:#10b981;--gr2:rgba(16,185,129,.1);
  --rd:#f43f5e;--rd2:rgba(244,63,94,.15);--yw:#f59e0b;--yw2:rgba(245,158,11,.1);
  --cy:#06b6d4;--cy2:rgba(6,182,212,.1);
  --vi:#8b5cf6;--vi2:rgba(139,92,246,.1);
  --font:'DM Sans',system-ui,sans-serif;
  --mono:'JetBrains Mono',monospace;
  --display:'Bebas Neue',sans-serif;
  --r:12px;--r2:18px;--r3:10px;
  --sd:0 2px 8px rgba(0,0,0,.5),0 0 0 1px rgba(255,255,255,.03);
  --sd2:0 8px 32px rgba(0,0,0,.4);--sd3:0 20px 60px rgba(0,0,0,.5);
  --tr:all .25s cubic-bezier(.4,0,.2,1);--tr2:all .35s cubic-bezier(.34,1.56,.64,1);
  --sidebar-w:240px;
}
[data-theme=light]{
  --bg:#f8fafc;--bg1:#ffffff;--bg2:#f1f5f9;--bg3:#e2e8f0;
  --bd:#cbd5e1;--bd2:#94a3b8;
  --tx:#0f172a;--tx2:#475569;--tx3:#64748b;
  --ac:#6366f1;--gr:#059669;--rd:#e11d48;--yw:#d97706;--cy:#0891b2;--vi:#7c3aed;
  --sd:0 1px 3px rgba(0,0,0,.06),0 4px 16px rgba(0,0,0,.04);
  --sd2:0 8px 30px rgba(0,0,0,.08);--sd3:0 20px 60px rgba(0,0,0,.12);
}
html{scroll-behavior:smooth;scrollbar-width:thin;scrollbar-color:var(--bd2) transparent}
body{font-family:var(--font);background:var(--bg);background-image:radial-gradient(at top center,rgba(129,140,248,.08) 0%,transparent 80%);color:var(--tx);font-size:14px;line-height:1.5;-webkit-font-smoothing:antialiased;overflow-x:hidden;transition:background .35s ease,color .35s ease}
a{color:var(--ac);text-decoration:none}a:hover{opacity:.8}
::-webkit-scrollbar{width:6px;height:6px}
::-webkit-scrollbar-thumb{background:var(--bd2);border-radius:99px}
#snow{position:fixed;top:0;left:0;width:100%;height:100%;z-index:0;pointer-events:none;opacity:.7}
code,pre{font-family:var(--mono);font-size:12px}

/* Buttons */
.btn{display:inline-flex;align-items:center;gap:6px;padding:8px 14px;border-radius:var(--r3);font-size:13px;font-weight:500;cursor:pointer;transition:var(--tr2);border:1px solid transparent;font-family:var(--font);white-space:nowrap;text-decoration:none}
.btn-p{background:linear-gradient(135deg,#6366f1,#5254d4);color:#fff;border-color:#6366f1;box-shadow:0 2px 12px rgba(99,102,241,.35)}
.btn-p:hover{box-shadow:0 6px 24px rgba(99,102,241,.5);transform:translateY(-2px);opacity:1}
.btn-g{background:var(--bg3);color:var(--tx2);border-color:var(--bd)}
.btn-g:hover{background:var(--bd);color:var(--tx);opacity:1;transform:translateY(-2px)}
.btn-d{background:var(--rd2);color:var(--rd);border-color:rgba(239,68,68,.2)}
.btn-d:hover{background:rgba(239,68,68,.2);opacity:1;transform:translateY(-2px)}
.btn-sm{padding:5px 10px;font-size:11px}

/* Cards */
.card{background:var(--bg1);border:1px solid var(--bd);border-radius:var(--r2);padding:20px;margin-bottom:18px;transition:var(--tr);box-shadow:var(--sd);position:relative;overflow:hidden}
.card:hover{border-color:var(--bd2);box-shadow:var(--sd2);transform:translateY(-2px)}
.ctitle{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1.5px;color:var(--tx3);margin-bottom:16px;display:flex;align-items:center;gap:6px}

/* Stats */
.stat-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:12px;margin-bottom:22px}
.stat{background:var(--bg1);border:1px solid var(--bd);border-radius:var(--r2);padding:16px 18px;position:relative;overflow:hidden;transition:var(--tr);box-shadow:var(--sd)}
.stat:hover{transform:translateY(-2px);box-shadow:var(--sd2);border-color:var(--bd2)}
.slb{font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:1.5px;color:var(--tx3);margin-bottom:8px}
.sv{font-size:26px;font-weight:700;line-height:1;margin-bottom:4px;letter-spacing:-.5px}
.ss{font-size:10px;color:var(--tx3)}
.stat-ac .sv{color:var(--ac)}.stat-gr .sv{color:var(--gr)}.stat-rd .sv{color:var(--rd)}.stat-yw .sv{color:var(--yw)}

/* Tables */
table{width:100%;border-collapse:collapse;font-size:13px}
th{text-align:left;padding:8px 12px;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:var(--tx3);border-bottom:1px solid var(--bd);white-space:nowrap;background:var(--bg2)}
td{padding:10px 12px;border-bottom:1px solid var(--bd);vertical-align:middle;color:var(--tx2)}
tr:last-child td{border-bottom:none}
tr:hover td{background:rgba(99,102,241,.04)}
.num{text-align:right;font-family:var(--mono);color:var(--tx)}
.mu{color:var(--tx3);font-size:12px}
code{background:var(--bg3);padding:2px 6px;border-radius:4px;font-size:11px;color:var(--tx);border:1px solid var(--bd)}
code.tr{max-width:180px;display:inline-block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;vertical-align:middle}

/* Chips */
.chip{display:inline-flex;align-items:center;padding:2px 8px;border-radius:20px;font-size:10px;font-weight:600;letter-spacing:.5px;text-transform:uppercase;white-space:nowrap}
.chip-blue{background:var(--ac2);color:var(--ac);border:1px solid rgba(99,102,241,.2)}
.chip-green{background:var(--gr2);color:var(--gr);border:1px solid rgba(16,185,129,.2)}
.chip-red{background:var(--rd2);color:var(--rd);border:1px solid rgba(244,63,94,.2)}
.chip-orange{background:var(--yw2);color:var(--yw);border:1px solid rgba(245,158,11,.2)}
.chip-gray{background:var(--bg3);color:var(--tx3);border:1px solid var(--bd)}
.chip-sm{font-size:9px;padding:1px 5px}

/* Forms */
.fg{margin-bottom:14px}
.fgrid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
label{display:block;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.8px;color:var(--tx3);margin-bottom:6px}
input,select,textarea{width:100%;background:var(--bg2);border:1px solid var(--bd);border-radius:var(--r3);padding:8px 11px;color:var(--tx);font-size:13px;font-family:var(--font);transition:border-color .15s,box-shadow .15s;outline:none;appearance:none}
input:focus,select:focus,textarea:focus{border-color:var(--ac);box-shadow:0 0 0 3px var(--ac3)}
select option{background:var(--bg2)}
textarea{resize:vertical}

/* Alerts */
.al{display:flex;align-items:flex-start;gap:9px;padding:11px 14px;border-radius:var(--r3);font-size:13px;margin-bottom:14px}
.al-ok{background:var(--gr2);color:var(--gr);border:1px solid rgba(16,185,129,.2)}
.al-er{background:var(--rd2);color:var(--rd);border:1px solid rgba(244,63,94,.2)}
.al-wn{background:var(--yw2);color:var(--yw);border:1px solid rgba(245,158,11,.2)}

/* Grid */
.g2{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-bottom:18px}
.g3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:18px;margin-bottom:18px}
@media(max-width:900px){.g2,.g3{grid-template-columns:1fr}}

/* Scope boxes */
.scope-box{display:flex;flex-wrap:wrap;gap:6px;padding:12px;background:var(--bg2);border:1px solid var(--bd);border-radius:var(--r3);max-height:300px;overflow-y:auto}
.scope-item{cursor:pointer;font-size:11px;display:inline-flex;align-items:center;gap:4px;padding:4px 8px;border-radius:var(--r3);background:var(--bg3);border:1px solid var(--bd)}
.scope-item.custom{color:var(--cy)}
.scope-item input{width:auto;accent-color:var(--ac)}

/* Tabs */
.tabs{display:flex;gap:6px;border-bottom:1px solid var(--bd);margin-bottom:16px;flex-wrap:wrap}
.tab{padding:9px 16px;cursor:pointer;font-size:11px;font-weight:600;color:var(--tx3);border-bottom:2px solid transparent;transition:var(--tr);text-transform:uppercase;letter-spacing:1px}
.tab:hover{color:var(--ac)}
.tab.active{color:var(--ac);border-bottom-color:var(--ac)}

/* Presets */
.preset-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px}
.preset-card{padding:14px;border-radius:var(--r);cursor:pointer;border:2px solid var(--bd);transition:var(--tr);text-align:center;background:var(--bg2)}
.preset-card:hover{transform:scale(1.05);border-color:var(--ac)}
.preset-card.active{border-color:var(--ac);background:var(--ac3)}
.preset-name{font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--tx);margin-top:6px}
.preset-swatch{height:24px;border-radius:6px;margin-bottom:6px}

/* Color picker */
.color-picker-row{display:flex;align-items:center;gap:10px;padding:6px 10px;border-radius:8px;background:var(--bg2);margin-bottom:6px}
.color-picker-row label{flex:1;font-size:11px;color:var(--tx2);text-transform:capitalize;margin:0}
.color-picker-row input[type=color]{width:40px;height:28px;border:1px solid var(--bd);border-radius:6px;cursor:pointer;background:transparent}
.color-picker-row input[type=checkbox]{width:20px;height:20px;cursor:pointer;accent-color:var(--ac)}

/* Logs */
.logs-container{background:var(--bg2);border:1px solid var(--bd);border-radius:var(--r);padding:10px;max-height:450px;overflow-y:auto;font-family:var(--mono);font-size:11px}
.log-entry{padding:6px 7px;border-bottom:1px solid var(--bd);display:flex;gap:8px;flex-wrap:wrap;transition:var(--tr);border-radius:6px;align-items:center}
.log-entry:hover{background:rgba(99,102,241,.06)}
.log-time{color:var(--tx3);font-size:9px}
.log-key{color:var(--ac);font-weight:700}
.log-endpoint{color:var(--cy)}
.log-ip{color:var(--vi)}

/* Toast */
.toast{position:fixed;top:18px;left:50%;transform:translateX(-50%) translateY(-140%);background:linear-gradient(135deg,rgba(12,16,32,.97),rgba(17,22,39,.97));border:1px solid var(--bd2);border-radius:var(--r3);padding:11px 18px;font-size:13px;color:var(--tx);box-shadow:var(--sd3);z-index:400;transition:transform .35s cubic-bezier(.34,1.56,.64,1);display:flex;align-items:center;gap:9px;backdrop-filter:blur(16px)}
.toast.show{transform:translateX(-50%) translateY(0)}
.toast.ok{border-color:rgba(16,185,129,.4);color:var(--gr)}
.toast.er{border-color:rgba(244,63,94,.4);color:var(--rd)}
.toast.wn{border-color:rgba(245,158,11,.4);color:var(--yw)}

/* Bulk action bar */
.bulk-bar{position:fixed;left:50%;bottom:24px;transform:translateX(-50%) translateY(140%);display:flex;align-items:center;gap:14px;background:linear-gradient(135deg,rgba(12,16,32,.97),rgba(17,22,39,.97));border:1px solid var(--bd2);border-radius:99px;padding:10px 14px 10px 20px;box-shadow:var(--sd3);backdrop-filter:blur(16px);z-index:300;transition:transform .4s cubic-bezier(.34,1.56,.64,1);max-width:92vw}
.bulk-bar.show{transform:translateX(-50%) translateY(0)}
.bulk-bar .bb-count{font-size:13px;font-weight:600;color:var(--tx)}
.bulk-bar .bb-count b{color:var(--rd);font-family:var(--mono)}

/* Empty state */
.empty{text-align:center;padding:32px 16px;color:var(--tx3)}
.empty i{font-size:28px;margin-bottom:10px;opacity:.4}
.empty div{font-size:13px;margin-bottom:4px}

/* Animations */
@keyframes fu{0%{opacity:0;transform:translateY(8px)}100%{opacity:1;transform:none}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
@keyframes slideRight{from{opacity:0;transform:translateX(-16px)}to{opacity:1;transform:none}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}

/* Sidebar & Shell (for admin) */
.shell{display:flex;min-height:100vh}
.sidebar{width:var(--sidebar-w);flex-shrink:0;background:linear-gradient(180deg,rgba(12,16,32,.98) 0%,rgba(17,22,39,.95) 100%);border-right:1px solid var(--bd);display:flex;flex-direction:column;position:sticky;top:0;height:100vh;overflow-y:auto;backdrop-filter:blur(12px);box-shadow:2px 0 24px rgba(0,0,0,.4)}
.main{flex:1;min-width:0;position:relative}
.content{position:relative;z-index:1;padding:24px 28px;max-width:1200px}
.sb-logo{padding:24px 20px 18px;border-bottom:1px solid var(--bd);background:linear-gradient(135deg,rgba(99,102,241,.10) 0%,transparent 60%)}
.sb-brand{font-size:18px;font-weight:700;letter-spacing:-.4px;background:linear-gradient(135deg,#a5b4fc,var(--ac));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.sb-sub{font-size:10px;color:var(--tx3);letter-spacing:2px;text-transform:uppercase;margin-top:3px}
.sb-nav{padding:12px 10px;flex:1}
.ni{display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:var(--r3);color:var(--tx2);font-size:13px;font-weight:500;transition:var(--tr);margin-bottom:2px;cursor:pointer;border-left:2px solid transparent;position:relative}
.ni i{width:16px;text-align:center;font-size:13px}
.ni:hover{background:var(--bg3);color:var(--tx);border-left-color:var(--bd2);transform:translateX(2px)}
.ni.on{background:var(--ac2);color:var(--ac);border-left-color:var(--ac);box-shadow:inset 0 0 16px rgba(99,102,241,.08)}
.ni.on::after{content:'';position:absolute;right:8px;top:50%;transform:translateY(-50%);width:5px;height:5px;border-radius:50%;background:var(--ac);box-shadow:0 0 10px var(--ac)}
.sb-bot{padding:12px 10px;border-top:1px solid var(--bd)}
.sb-user{display:flex;align-items:center;gap:10px;padding:8px 10px;margin-bottom:4px}
.sb-avatar{width:32px;height:32px;border-radius:50%;flex-shrink:0;object-fit:cover;background:var(--ac)}
.sb-uname{font-size:13px;font-weight:500;color:var(--tx)}
.sb-urole{font-size:10px;color:var(--tx3)}
.sb-online{display:flex;align-items:center;gap:6px;padding:6px 10px;font-size:10px;color:var(--tx3)}
.sb-dot{width:6px;height:6px;border-radius:50%;background:var(--gr);box-shadow:0 0 8px var(--gr);animation:pulse 2s infinite;display:inline-block}

/* Topbar */
.topbar{display:flex;align-items:center;justify-content:space-between;padding:14px 28px;border-bottom:1px solid var(--bd);background:rgba(12,16,32,.65);position:sticky;top:0;z-index:50;backdrop-filter:blur(16px);box-shadow:0 1px 0 var(--bd)}
.page-title{font-size:16px;font-weight:600;display:flex;align-items:center;gap:8px}
.page-title i{color:var(--gr);font-size:8px}
.page-path{font-size:11px;color:var(--tx3);font-family:var(--mono);margin-top:2px}
.theme-btn{background:var(--bg3);border:1px solid var(--bd);border-radius:var(--r3);padding:6px 12px;color:var(--tx2);font-size:12px;cursor:pointer;transition:var(--tr);display:flex;align-items:center;gap:6px}
.theme-btn:hover{background:var(--bd);color:var(--tx);transform:translateY(-1px)}

/* Mobile */
.mob-btn{display:none;background:none;border:none;color:var(--tx2);cursor:pointer;font-size:20px;padding:4px;margin-right:8px}
.sb-close{display:none;position:absolute;top:14px;right:12px;background:var(--bg3);border:1px solid var(--bd);border-radius:var(--r3);color:var(--tx2);cursor:pointer;font-size:16px;padding:4px 8px;z-index:10}
.sb-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:199;backdrop-filter:blur(4px)}
.sb-overlay.show{display:block}
@media(max-width:768px){
  .sidebar{display:none;position:fixed;z-index:200;height:100%;width:var(--sidebar-w);box-shadow:4px 0 32px rgba(0,0,0,.5)}
  .sidebar.open{display:flex;animation:slideRight .25s ease}
  .mob-btn{display:flex}
  .sb-close{display:flex}
  .content{padding:16px;max-width:100vw;overflow-x:hidden}
  .topbar{flex-wrap:wrap;gap:8px;padding:10px 12px}
  .g2,.g3{grid-template-columns:1fr!important}
  .stat-grid{grid-template-columns:repeat(2,1fr);gap:8px}
  .fgrid{grid-template-columns:1fr}
}
*:focus-visible{outline:2px solid var(--ac);outline-offset:2px;border-radius:4px}
</style>`;
}

// ============================================================
// LOGIN PAGE (FT OSINT Theme)
// ============================================================
function renderLogin(){
  return `<!DOCTYPE html><html lang="en" data-theme="dark"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0,viewport-fit=cover">
<title>Login — BRONX OSINT</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
${generateFTCSS()}
<style>
body{display:flex;align-items:center;justify-content:center;min-height:100vh;padding:24px;background:radial-gradient(ellipse at center,rgba(129,140,248,.06),transparent 70%)}
.lw{width:100%;max-width:400px;position:relative;z-index:5;animation:fu .5s ease}
.lb{text-align:center;margin-bottom:24px}
.ll{font-family:'Bebas Neue',sans-serif;font-size:42px;letter-spacing:4px;background:linear-gradient(135deg,#a5b4fc,var(--ac),#c7d2fe);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;line-height:1;margin-bottom:6px}
.ls{font-size:11px;color:var(--tx3);letter-spacing:5px;text-transform:uppercase}
.lc{background:var(--bg1);border:1px solid var(--bd);border-radius:var(--r2);padding:32px;box-shadow:var(--sd2),0 0 50px rgba(129,140,248,.06);position:relative;overflow:hidden}
.lc::before{content:'';position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,var(--ac),transparent)}
.lc::after{content:'';position:absolute;inset:0;background:radial-gradient(ellipse at center,rgba(129,140,248,.03),transparent 60%);pointer-events:none}
.lc-head{font-family:'Bebas Neue',sans-serif;font-size:22px;letter-spacing:3px;color:var(--tx);margin-bottom:6px;text-align:center}
.lc-sub{font-size:11px;color:var(--tx3);letter-spacing:3px;text-transform:uppercase;text-align:center;margin-bottom:24px}
.input-group{position:relative;margin-bottom:14px;z-index:2}
.input-group .input-icon{position:absolute;left:14px;top:50%;transform:translateY(-50%);color:var(--ac);font-size:14px;z-index:2;opacity:.7}
.input-group input{width:100%;padding:13px 14px 13px 42px;background:var(--bg2);border:1.5px solid var(--bd);border-radius:var(--r3);color:var(--tx);font-size:13px;font-family:var(--font);outline:none;transition:var(--tr)}
.input-group input:focus{border-color:var(--ac);box-shadow:0 0 0 3px var(--ac3)}
.login-btn{width:100%;padding:13px;background:linear-gradient(135deg,#6366f1,#5254d4);color:#fff;border:none;border-radius:var(--r3);cursor:pointer;font-size:13px;font-weight:700;letter-spacing:2px;font-family:var(--font);box-shadow:0 2px 12px rgba(99,102,241,.35);transition:var(--tr2);position:relative;z-index:2;display:flex;align-items:center;justify-content:center;gap:8px;text-transform:uppercase}
.login-btn:hover{box-shadow:0 6px 24px rgba(99,102,241,.5);transform:translateY(-2px)}
.message{text-align:center;margin-top:14px;font-size:12px;font-weight:600;min-height:20px;position:relative;z-index:2}
.lc-foot{text-align:center;margin-top:22px;font-size:10px;color:var(--tx3);letter-spacing:2px;position:relative;z-index:2}
.lc-foot span{font-weight:700;background:linear-gradient(135deg,var(--ac),#c7d2fe);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
</style></head><body>
<canvas id="snow"></canvas>
<div class="lw">
<div class="lb">
<div class="ll">BRONX OSINT</div>
<div class="ls">V501 ULTRA · Admin Panel</div>
</div>
<div class="lc">
<div class="lc-head">SIGN IN</div>
<div class="lc-sub">Secure Dashboard Access</div>
<div class="input-group"><i class="fas fa-user input-icon"></i><input type="text" id="username" placeholder="Username" autocomplete="off"></div>
<div class="input-group"><i class="fas fa-lock input-icon"></i><input type="password" id="password" placeholder="Password" autocomplete="off"></div>
<button class="login-btn" onclick="login()"><i class="fas fa-shield-halved"></i> Authenticate</button>
<div class="message" id="message"></div>
</div>
<div class="lc-foot">Powered by <span>@BRONX_ULTRA</span></div>
</div>
<script>
const savedTheme=localStorage.getItem('bronx-theme')||'dark';document.documentElement.dataset.theme=savedTheme;
async function login(){
const u=document.getElementById('username').value.trim(),p=document.getElementById('password').value.trim(),m=document.getElementById('message');
if(!u||!p){m.style.color='#f59e0b';m.innerHTML='<i class="fas fa-exclamation-triangle"></i> Fill all fields';return}
m.style.color='#818cf8';m.innerHTML='<i class="fas fa-spinner fa-spin"></i> Authenticating...';
try{
const r=await fetch('${ADMIN_PATH}/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:u,password:p})});
const d=await r.json();
if(d.success){m.style.color='#10b981';m.innerHTML='<i class="fas fa-check-circle"></i> '+d.message;setTimeout(()=>location.href=d.redirect,600)}
else{m.style.color='#f43f5e';m.innerHTML='<i class="fas fa-times-circle"></i> '+d.error}
}catch(e){m.style.color='#f43f5e';m.innerHTML='<i class="fas fa-plug"></i> Connection error'}}
document.addEventListener('keydown',e=>{if(e.key==='Enter')login()});
(function(){if(window.innerWidth<=768)return;const c=document.getElementById('snow');if(!c)return;const x=c.getContext('2d');let w,h;function r(){w=c.width=window.innerWidth;h=c.height=window.innerHeight}window.addEventListener('resize',r);r();const p=Array.from({length:60},()=>({x:Math.random()*w,y:Math.random()*h,r:Math.random()*2+.5,s:Math.random()*.8+.2,d:(Math.random()-.5)*.5,o:Math.random()*.4+.2}));function dr(){x.clearRect(0,0,w,h);if(document.documentElement.dataset.theme!=='dark'){requestAnimationFrame(dr);return}p.forEach(f=>{x.beginPath();x.arc(f.x,f.y,f.r,0,Math.PI*2);x.fillStyle='rgba(165,180,252,'+f.o+')';x.shadowBlur=8;x.shadowColor='rgba(129,140,248,.8)';x.fill();f.y+=f.s;f.x+=f.d;if(f.y>h){f.y=-5;f.x=Math.random()*w}if(f.x>w+5)f.x=-5;if(f.x<-5)f.x=w+5});requestAnimationFrame(dr)}dr()})();
</script></body></html>`;
}

// ============================================================
// HOME PAGE (FT OSINT Theme)
// ============================================================
function renderHome(){
  const vapi = customAPIs.filter(a => a.visible);
  let cards = '';
  Object.entries(endpoints).forEach(([n,e]) => {
    cards += `<div class="endpoint-card" onclick="copyEndpoint('${esc(n)}','${esc(e.p)}','${esc(e.e)}')">
      <div class="ep-icon">${e.i}</div><div class="ep-name">/${esc(n)}</div>
      <div class="ep-desc">${e.d}</div>
      <div class="ep-url">GET /api/key-bronx/${n}?key=KEY&${e.p}=${e.e}</div></div>`;
  });
  vapi.forEach(a => {
    cards += `<div class="endpoint-card" onclick="copyCustom('${esc(a.endpoint)}','${esc(a.param)}','${esc(a.example)}')">
      <div class="ep-icon">🔧</div><div class="ep-name">/${esc(a.endpoint)}</div>
      <div class="ep-desc">Custom API</div>
      <div class="ep-url">GET /api/custom/${a.endpoint}?key=KEY&${a.param}=${a.example||'v'}</div></div>`;
  });
  const announcementHTML = announcement.enabled ? `<div style="position:fixed;top:0;left:0;right:0;z-index:9999;padding:10px 20px;text-align:center;font-size:12px;font-weight:600;letter-spacing:1px;background:linear-gradient(135deg,#6366f1,#5254d4);color:#fff">📢 ${esc(announcement.text)}</div>` : '';
  const maintenanceHTML = maintenance.enabled ? `<div style="position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.95);display:flex;align-items:center;justify-content:center;flex-direction:column;gap:20px;padding:40px;text-align:center"><div style="font-size:80px">🔧</div><h1 style="font-family:Bebas Neue,sans-serif;color:#f59e0b;font-size:42px;letter-spacing:4px">MAINTENANCE MODE</h1><p style="color:#fff;font-size:14px">${esc(maintenance.message)}</p></div>` : '';
  return `<!DOCTYPE html><html lang="en" data-theme="dark"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>BRONX OSINT V501 — API Documentation</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
${generateFTCSS()}
<style>
.topnav{position:sticky;top:0;z-index:1000;background:rgba(1,2,4,.75);backdrop-filter:blur(20px);border-bottom:1px solid var(--bd);padding:14px 28px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px}
.brand{font-family:'Bebas Neue',sans-serif;font-size:24px;letter-spacing:3px;background:linear-gradient(135deg,var(--ac),#c7d2fe);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;text-decoration:none}
.nav-links{display:flex;gap:10px;align-items:center}
.nav-links a{color:var(--tx2);text-decoration:none;font-size:11px;font-weight:600;padding:8px 14px;border-radius:10px;transition:var(--tr);border:1px solid transparent;letter-spacing:1px}
.nav-links a:hover{color:var(--ac);border-color:var(--bd);background:var(--ac3)}
.hero{text-align:center;padding:60px 20px 40px;position:relative;z-index:10}
.hero h1{font-family:'Bebas Neue',sans-serif;font-size:clamp(44px,8vw,72px);letter-spacing:4px;background:linear-gradient(135deg,#ffffff 20%,#818cf8);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;margin-bottom:12px;text-shadow:0 4px 20px rgba(129,140,248,.2)}
.hero p{color:var(--tx3);font-size:11px;letter-spacing:5px;text-transform:uppercase}
.container{max-width:1400px;margin:0 auto;padding:20px;position:relative;z-index:10}
.endpoint-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:14px}
.endpoint-card{background:var(--bg1);border:1px solid var(--bd);border-radius:var(--r);padding:16px;cursor:pointer;transition:var(--tr);box-shadow:var(--sd)}
.endpoint-card:hover{transform:translateY(-3px);border-color:var(--ac);box-shadow:var(--sd2)}
.endpoint-card .ep-icon{font-size:22px;margin-bottom:8px}
.endpoint-card .ep-name{font-size:14px;font-weight:700;margin-bottom:5px;color:var(--ac);font-family:var(--mono)}
.endpoint-card .ep-desc{font-size:12px;color:var(--tx3);margin-bottom:10px}
.endpoint-card .ep-url{font-size:10px;color:var(--gr);background:var(--gr2);padding:6px 10px;border-radius:6px;font-family:var(--mono);word-break:break-all;border:1px solid rgba(16,185,129,.15);line-height:1.4}
.footer{text-align:center;padding:24px;border-top:1px solid var(--bd);position:relative;z-index:10}
.footer span{font-family:'Bebas Neue',sans-serif;letter-spacing:3px;font-size:18px;background:linear-gradient(135deg,var(--ac),#c7d2fe);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.status-pill{padding:4px 12px;border-radius:20px;font-size:10px;font-weight:700;letter-spacing:2px;background:var(--gr2);color:var(--gr);border:1px solid rgba(16,185,129,.3)}
@media(max-width:768px){.endpoint-grid{grid-template-columns:1fr}.brand{font-size:18px}.hero h1{font-size:34px}}
</style></head><body>
<canvas id="snow"></canvas>
${announcementHTML}${maintenanceHTML}
<nav class="topnav">
<a href="/" class="brand">🛡️ BRONX V501</a>
<div class="nav-links">
<a href="/test"><i class="fas fa-heartbeat"></i> STATUS</a>
<span class="status-pill">🟢 ONLINE</span>
</div>
</nav>
<header class="hero"><h1>BRONX OSINT V501</h1><p>Ultra Pro Max · Smart DDoS · Live Theme · Full Fixed</p></header>
<div class="container"><div class="endpoint-grid">${cards}</div></div>
<footer class="footer"><span>BRONX OSINT V501 ULTRA 🛡️</span></footer>
<script>
function copyEndpoint(n,p,e){navigator.clipboard.writeText(location.origin+'/api/key-bronx/'+n+'?key=YOUR_KEY&'+p+'='+e).then(()=>showToast('✅ Copied')).catch(()=>showToast('⚠ Failed','er'));}
function copyCustom(n,p,e){navigator.clipboard.writeText(location.origin+'/api/custom/'+n+'?key=YOUR_KEY&'+p+'='+(e||'v')).then(()=>showToast('✅ Copied')).catch(()=>showToast('⚠ Failed','er'));}
function showToast(m,t='ok'){const x=document.createElement('div');x.className='toast '+t;x.innerHTML=m;document.body.appendChild(x);setTimeout(()=>x.classList.add('show'),10);setTimeout(()=>x.remove(),3000);}
(function(){if(window.innerWidth<=768)return;const c=document.getElementById('snow');if(!c)return;const x=c.getContext('2d');let w,h;function r(){w=c.width=window.innerWidth;h=c.height=window.innerHeight}window.addEventListener('resize',r);r();const p=Array.from({length:80},()=>({x:Math.random()*w,y:Math.random()*h,r:Math.random()*2+.5,s:Math.random()*.8+.2,d:(Math.random()-.5)*.5,o:Math.random()*.4+.2}));function dr(){x.clearRect(0,0,w,h);if(document.documentElement.dataset.theme!=='dark'){requestAnimationFrame(dr);return}p.forEach(f=>{x.beginPath();x.arc(f.x,f.y,f.r,0,Math.PI*2);x.fillStyle='rgba(165,180,252,'+f.o+')';x.shadowBlur=8;x.shadowColor='rgba(129,140,248,.8)';x.fill();f.y+=f.s;f.x+=f.d;if(f.y>h){f.y=-5;f.x=Math.random()*w}if(f.x>w+5)f.x=-5;if(f.x<-5)f.x=w+5});requestAnimationFrame(dr)}dr()})();
</script></body></html>`;
}

// ============================================================
// 🎛️ ADMIN PANEL — FT OSINT STYLE
// ============================================================
function renderAdmin(token){
  try{
    const stoken = esc(token);
    const allKeys = Object.entries(keyStorage).filter(([k,d]) => !d._hardcoded && !d.hidden).map(([k,d]) => ({
      key:k, name:d.name||'?', limit:d.unlimited?'∞':d.limit, used:d.used||0,
      left:d.unlimited?'∞':Math.max(0,(d.limit||0)-(d.used||0)),
      dailyLimit:d.dailyLimit||0, perSecondLimit:d.perSecondLimit||0,
      expiry:d.expiryStr||'Lifetime', isExpired:d.expiry ? isKeyExpired(d.expiry) : false,
      scopes:d.scopes||[], cooldown:d.cooldown||0, created:d.created||'',
      stopped:d.stopped||false, disabled:d.disabled||false, notes:d.notes||''
    }));
    const endpointsJSON = JSON.stringify(Object.entries(endpoints).map(([n,e]) => ({name:n, p:e.p, i:e.i, e:e.e, d:e.d, c:e.c})));
    const customAPIsJSON = JSON.stringify(customAPIs);
    const themeJSON = JSON.stringify(theme);
    const presetsJSON = JSON.stringify(PRESETS);

    return `<!DOCTYPE html><html lang="en" data-theme="dark"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>BRONX V501 — Admin Panel</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
${generateFTCSS()}
</head><body>
<canvas id="snow"></canvas>
<div class="sb-overlay" id="sbOverlay" onclick="closeSidebar()"></div>
<div class="shell">
  <aside class="sidebar" id="sb">
    <button class="sb-close" onclick="closeSidebar()"><i class="fas fa-xmark"></i></button>
    <div class="sb-logo">
      <div class="sb-brand">BRONX V501</div>
      <div class="sb-sub">Admin Panel</div>
    </div>
    <nav class="sb-nav">
      <a class="ni on" onclick="switchSection('dashboard', this)"><i class="fas fa-gauge-high"></i> <span>Dashboard</span></a>
      <a class="ni" onclick="switchSection('generate', this)"><i class="fas fa-plus-circle"></i> <span>Generate Key</span></a>
      <a class="ni" onclick="switchSection('keys', this)"><i class="fas fa-key"></i> <span>API Keys</span></a>
      <a class="ni" onclick="switchSection('endpoints', this)"><i class="fas fa-list"></i> <span>Endpoints</span></a>
      <a class="ni" onclick="switchSection('responses', this)"><i class="fas fa-code"></i> <span>Edit Responses</span></a>
      <a class="ni" onclick="switchSection('monitor', this)"><i class="fas fa-desktop"></i> <span>Live Monitor</span></a>
      <a class="ni" onclick="switchSection('stats', this)"><i class="fas fa-chart-bar"></i> <span>Statistics</span></a>
      <a class="ni" onclick="switchSection('theme', this)"><i class="fas fa-palette"></i> <span>Live Theme</span></a>
      <a class="ni" onclick="switchSection('apis', this)"><i class="fas fa-plug"></i> <span>Custom APIs</span></a>
      <a class="ni" onclick="switchSection('ddos', this)"><i class="fas fa-shield-virus"></i> <span>Smart DDoS</span></a>
      <a class="ni" onclick="switchSection('bans', this)"><i class="fas fa-ban"></i> <span>Bans Manager</span></a>
      <a class="ni" onclick="switchSection('devices', this)"><i class="fas fa-laptop"></i> <span>Devices</span></a>
      <a class="ni" onclick="switchSection('settings', this)"><i class="fas fa-cog"></i> <span>Settings</span></a>
    </nav>
    <div class="sb-bot">
      <div class="sb-user">
        <div class="sb-avatar" style="display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700">🛡️</div>
        <div><div class="sb-uname">BRONX ADMIN</div><div class="sb-urole">Owner</div></div>
      </div>
      <div class="sb-online"><span class="sb-dot"></span> Online</div>
      <a onclick="logout()" class="ni" style="color:var(--rd);margin-top:4px;cursor:pointer"><i class="fas fa-right-from-bracket"></i> <span>Sign Out</span></a>
    </div>
  </aside>

  <div class="main">
    <div class="topbar">
      <button class="mob-btn" onclick="openSidebar()"><i class="fas fa-bars"></i></button>
      <div>
        <div class="page-title"><i class="fa-solid fa-circle" style="animation:pulse 2s infinite"></i> <span id="pageTitle">Dashboard</span></div>
        <div class="page-path" id="pagePath">${ADMIN_PATH} · ${getIndiaDateTime()} IST</div>
      </div>
      <button class="theme-btn" onclick="toggleDark()" id="tBtn"><i class="fas fa-sun"></i> <span>Light</span></button>
    </div>

    <div class="content">
      <!-- DASHBOARD -->
      <div id="section-dashboard">
        <div class="stat-grid">
          <div class="stat stat-ac"><div class="slb">🔑 Total Keys</div><div class="sv" id="hdKeys">${Object.keys(keyStorage).length}</div><div class="ss">all</div></div>
          <div class="stat stat-gr"><div class="slb">📊 Today</div><div class="sv" id="statToday">-</div><div class="ss">requests</div></div>
          <div class="stat stat-ac"><div class="slb">📈 Total</div><div class="sv" id="statTotal">-</div><div class="ss">all time</div></div>
          <div class="stat stat-rd"><div class="slb">🚫 Bans</div><div class="sv" id="statBans">-</div><div class="ss">active</div></div>
          <div class="stat stat-yw"><div class="slb">📱 Devices</div><div class="sv" id="statDevices">-</div><div class="ss">tracked</div></div>
          <div class="stat stat-ac"><div class="slb">🔧 Custom APIs</div><div class="sv" id="hdAPIs">${customAPIs.length}</div><div class="ss">endpoints</div></div>
        </div>
        <div class="g2">
          <div class="card"><div class="ctitle"><i class="fas fa-trophy"></i> Top Keys</div><div class="tw" style="overflow-x:auto"><table><thead><tr><th>Key</th><th class="num">Requests</th></tr></thead><tbody id="topKeysBody"></tbody></table></div></div>
          <div class="card"><div class="ctitle"><i class="fas fa-globe"></i> Top IPs</div><div class="tw" style="overflow-x:auto"><table><thead><tr><th>IP</th><th class="num">Requests</th></tr></thead><tbody id="topIPsBody"></tbody></table></div></div>
        </div>
        <div class="g2">
          <div class="card"><div class="ctitle"><i class="fas fa-mobile-alt"></i> Top Devices</div><div class="tw" style="overflow-x:auto"><table><thead><tr><th>Device</th><th class="num">Requests</th></tr></thead><tbody id="topDevicesBody"></tbody></table></div></div>
          <div class="card"><div class="ctitle"><i class="fas fa-chart-line"></i> Top Endpoints</div><div class="tw" style="overflow-x:auto"><table><thead><tr><th>Endpoint</th><th class="num">Requests</th></tr></thead><tbody id="topEpDash"></tbody></table></div></div>
        </div>
      </div>

      <!-- GENERATE KEY -->
      <div id="section-generate" style="display:none">
        <div class="card">
          <div class="ctitle"><i class="fas fa-wand-magic-sparkles"></i> Generate New Key</div>
          <div class="fgrid">
            <div class="fg"><label>Key ID (empty = random)</label><input id="gk" placeholder="MY_KEY or empty"></div>
            <div class="fg"><label>Owner Name</label><input id="go" placeholder="Client Name"></div>
          </div>
          <button class="btn btn-g" onclick="randomKey()" style="margin-bottom:12px;width:100%"><i class="fas fa-dice"></i> Random Key</button>
          <div class="fgrid">
            <div class="fg"><label>Total Limit</label><input id="gl" type="number" value="100"></div>
            <div class="fg"><label>Days Valid</label><input id="gd" type="number" value="30"></div>
          </div>
          <div class="fgrid">
            <div class="fg"><label>Daily (0=∞)</label><input id="gdl" type="number" value="0"></div>
            <div class="fg"><label>Per Sec (0=∞)</label><input id="gpsl" type="number" value="0"></div>
          </div>
          <div class="fgrid">
            <div class="fg"><label>Cooldown (s)</label><input id="gc" type="number" value="0"></div>
            <div class="fg"><label>Notes</label><input id="gnotes" placeholder="Optional"></div>
          </div>
          <div class="fg"><label>Scopes</label>
            <div class="scope-box" id="scopeBoxGenerate">
              <label class="scope-item"><input type="checkbox" value="*" id="scope-all" checked> <span>🌟 ALL</span></label>
            </div>
          </div>
          <button class="btn btn-p" onclick="generateKey()" style="width:100%;justify-content:center"><i class="fas fa-rocket"></i> Generate Key</button>
        </div>
      </div>

      <!-- KEYS -->
      <div id="section-keys" style="display:none">
        <div class="card">
          <div class="ctitle"><i class="fas fa-key"></i> All Keys (<span id="keysCount">${allKeys.length}</span>)</div>
          <div class="fg"><input id="keysFilter" placeholder="🔍 Filter by name/key" oninput="filterKeys()"></div>
          <div class="tw" style="overflow-x:auto;max-height:650px">
            <table id="keysTable">
              <thead><tr><th style="width:40px"><input type="checkbox" onclick="toggleAllKeys(this)"></th><th>KEY</th><th>OWNER</th><th>LIMIT</th><th>USED</th><th>DAY</th><th>/SEC</th><th>LEFT</th><th>EXPIRY</th><th>SCOPES</th><th>STATUS</th><th>ACTIONS</th></tr></thead>
              <tbody id="keysBody"></tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- ENDPOINTS -->
      <div id="section-endpoints" style="display:none">
        <div class="card">
          <div class="ctitle"><i class="fas fa-list"></i> Endpoints (${Object.keys(endpoints).length})</div>
          <div class="endpoint-grid" id="endpointsList" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px"></div>
        </div>
      </div>

      <!-- EDIT RESPONSES -->
      <div id="section-responses" style="display:none">
        <div class="card">
          <div class="ctitle"><i class="fas fa-code"></i> Edit Endpoint Responses</div>
          <div class="fg"><label>Endpoint</label>
            <select id="responseEndpoint" onchange="loadResponse()">
              ${Object.keys(endpoints).map(e => `<option value="${e}">${endpoints[e].d} (/${e})</option>`).join('')}
            </select>
          </div>
          <div class="fg"><label>Response JSON (empty = default)</label>
            <textarea id="responseData" rows="10" style="font-family:var(--mono);font-size:11px"></textarea>
          </div>
          <button class="btn btn-p" onclick="updateResponse()" style="width:100%;justify-content:center"><i class="fas fa-save"></i> Save Response</button>
        </div>
      </div>

      <!-- MONITOR -->
      <div id="section-monitor" style="display:none">
        <div class="card">
          <div class="ctitle"><i class="fas fa-desktop"></i> Live Monitor</div>
          <div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap">
            <input id="monitorFilter" placeholder="🔍 Filter" style="flex:1;min-width:200px" oninput="renderMonitor()">
            <button class="btn btn-p" onclick="loadMonitorLogs()"><i class="fas fa-sync"></i></button>
          </div>
          <div class="logs-container" id="monitorLogs"></div>
        </div>
      </div>

      <!-- STATS -->
      <div id="section-stats" style="display:none">
        <div class="card">
          <div class="ctitle"><i class="fas fa-chart-bar"></i> Statistics</div>
          <div class="stat-grid">
            <div class="stat"><div class="slb">Total</div><div class="sv" id="statTotalReqs">-</div></div>
            <div class="stat"><div class="slb">Today</div><div class="sv" id="statTodayReqs">-</div></div>
            <div class="stat"><div class="slb">Week</div><div class="sv" id="statWeekReqs">-</div></div>
            <div class="stat"><div class="slb">Month</div><div class="sv" id="statMonthReqs">-</div></div>
          </div>
        </div>
        <div class="card"><div class="ctitle">Endpoints</div><table><thead><tr><th>Endpoint</th><th class="num">Requests</th></tr></thead><tbody id="topEndpointsBody"></tbody></table></div>
        <div class="g2">
          <div class="card"><div class="ctitle">Clients</div><table><thead><tr><th>Client</th><th class="num">Requests</th></tr></thead><tbody id="clientStatsBody"></tbody></table></div>
          <div class="card"><div class="ctitle">Browsers</div><table><thead><tr><th>Browser</th><th class="num">Requests</th></tr></thead><tbody id="browserStatsBody"></tbody></table></div>
        </div>
        <div class="g2">
          <div class="card"><div class="ctitle">Countries</div><table><thead><tr><th>Country</th><th class="num">Requests</th></tr></thead><tbody id="countryStatsBody"></tbody></table></div>
          <div class="card"><div class="ctitle">OS</div><table><thead><tr><th>OS</th><th class="num">Count</th></tr></thead><tbody id="osStatsBody"></tbody></table></div>
        </div>
      </div>

      <!-- THEME -->
      <div id="section-theme" style="display:none">
        <div class="card">
          <div class="ctitle"><i class="fas fa-palette"></i> Live Theme Changer</div>
          <div class="tabs">
            <div class="tab active" onclick="switchTab('presets',this)">Presets</div>
            <div class="tab" onclick="switchTab('colors',this)">Colors</div>
            <div class="tab" onclick="switchTab('effects',this)">Effects</div>
          </div>
          <div id="themeTab-presets">
            <p style="color:var(--tx3);font-size:11px;margin-bottom:12px">Click any preset — applies LIVE!</p>
            <div class="preset-grid" id="presetsGrid"></div>
          </div>
          <div id="themeTab-colors" style="display:none">
            <p style="color:var(--tx3);font-size:11px;margin-bottom:12px">Custom colors</p>
            <div id="colorPickers"></div>
            <button class="btn btn-p" onclick="saveCustomColors()" style="width:100%;margin-top:12px;justify-content:center"><i class="fas fa-save"></i> Save Colors</button>
          </div>
          <div id="themeTab-effects" style="display:none">
            <p style="color:var(--tx3);font-size:11px;margin-bottom:12px">Toggle effects</p>
            <div id="effectsList"></div>
            <button class="btn btn-p" onclick="saveEffects()" style="width:100%;margin-top:12px;justify-content:center"><i class="fas fa-save"></i> Save Effects</button>
          </div>
          <button class="btn btn-g" onclick="resetTheme()" style="width:100%;margin-top:16px;justify-content:center"><i class="fas fa-undo"></i> Reset Default</button>
        </div>
      </div>

      <!-- APIS -->
      <div id="section-apis" style="display:none">
        <div class="card">
          <div class="ctitle"><i class="fas fa-plug"></i> Custom APIs (<span id="apiCount">${customAPIs.length}</span>)</div>
          <div class="tw" style="overflow-x:auto;max-height:500px"><table><thead><tr><th>ID</th><th>Name</th><th>Endpoint</th><th>Scope Key</th><th>Param</th><th>Vis</th><th>Actions</th></tr></thead><tbody id="apisBody"></tbody></table></div>
        </div>
        <div class="card">
          <div class="ctitle"><i class="fas fa-puzzle-piece"></i> Add Custom API</div>
          <div class="fgrid">
            <div class="fg"><label>Name</label><input id="aname" placeholder="My API"></div>
            <div class="fg"><label>Endpoint</label><input id="aep" placeholder="my-api"></div>
          </div>
          <div class="fgrid">
            <div class="fg"><label>Param</label><input id="aparam" value="num"></div>
            <div class="fg"><label>Example</label><input id="aex" placeholder="9876543210"></div>
          </div>
          <div class="fg"><label>Real URL ({param})</label><input id="aurl" placeholder="https://api.com?param={param}"></div>
          <button class="btn btn-p" onclick="addAPI()" style="width:100%;justify-content:center"><i class="fas fa-plus"></i> Add API</button>
        </div>
      </div>

      <!-- DDOS -->
      <div id="section-ddos" style="display:none">
        <div class="card">
          <div class="ctitle"><i class="fas fa-shield-virus"></i> Smart DDoS Config</div>
          <div class="fg"><label>Mode</label>
            <select id="ddosMode">
              <option value="off">🔴 Off</option>
              <option value="smart">🟢 Smart</option>
              <option value="strict">🟠 Strict</option>
            </select>
          </div>
          <div class="g3">
            <div class="fg"><label>IP Burst/10s</label><input id="ddosIP10" type="number" value="${ddosConfig.ip.burst10s}"></div>
            <div class="fg"><label>IP/Min</label><input id="ddosIP1M" type="number" value="${ddosConfig.ip.perMinute}"></div>
            <div class="fg"><label>IP/Hour</label><input id="ddosIP1H" type="number" value="${ddosConfig.ip.perHour}"></div>
          </div>
          <div class="g3">
            <div class="fg"><label>Device Burst/10s</label><input id="ddosDEV10" type="number" value="${ddosConfig.device.burst10s}"></div>
            <div class="fg"><label>Device/Min</label><input id="ddosDEV1M" type="number" value="${ddosConfig.device.perMinute}"></div>
            <div class="fg"><label>Device/Hour</label><input id="ddosDEV1H" type="number" value="${ddosConfig.device.perHour}"></div>
          </div>
          <div class="g2">
            <div class="fg"><label>Temp Ban (min)</label><input id="ddosTempBan" type="number" value="${Math.round(ddosConfig.tempBanMs/60000)}"></div>
            <div class="fg"><label>Long Ban (min)</label><input id="ddosLongBan" type="number" value="${Math.round(ddosConfig.longBanMs/60000)}"></div>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button class="btn btn-p" onclick="saveDDOS()"><i class="fas fa-save"></i> Save</button>
            <button class="btn btn-g" onclick="clearAllStrikes()"><i class="fas fa-eraser"></i> Clear Strikes</button>
          </div>
        </div>
      </div>

      <!-- BANS -->
      <div id="section-bans" style="display:none">
        <div class="card">
          <div class="ctitle"><i class="fas fa-ban"></i> Manual Ban</div>
          <div class="g3">
            <select id="banType"><option value="ip">IP</option><option value="device">Device</option><option value="key">Key</option></select>
            <input id="banId" placeholder="Value to ban">
            <button class="btn btn-d" onclick="manualBan()"><i class="fas fa-ban"></i> Ban</button>
          </div>
        </div>
        <div class="card"><div class="ctitle">🚫 Banned IPs</div><div class="tw" style="overflow-x:auto"><table><thead><tr><th>IP</th><th>Reason</th><th>At</th><th>Until</th><th>Strikes</th><th>Action</th></tr></thead><tbody id="banIPBody"></tbody></table></div></div>
        <div class="card"><div class="ctitle">📱 Banned Devices</div><div class="tw" style="overflow-x:auto"><table><thead><tr><th>Device ID</th><th>Reason</th><th>At</th><th>Until</th><th>Strikes</th><th>Action</th></tr></thead><tbody id="banDeviceBody"></tbody></table></div></div>
        <div class="card"><div class="ctitle">🔑 Banned Keys</div><div class="tw" style="overflow-x:auto"><table><thead><tr><th>Key</th><th>Reason</th><th>At</th><th>Until</th><th>Strikes</th><th>Action</th></tr></thead><tbody id="banKeyBody"></tbody></table></div></div>
        <button class="btn btn-g" onclick="unbanAll()" style="width:100%;justify-content:center"><i class="fas fa-unlock"></i> Unban All</button>
      </div>

      <!-- DEVICES -->
      <div id="section-devices" style="display:none">
        <div class="card">
          <div class="ctitle"><i class="fas fa-laptop"></i> All Devices</div>
          <div class="tw" style="overflow-x:auto;max-height:600px"><table><thead><tr><th>Device ID</th><th>Type</th><th>OS</th><th>Browser</th><th>Reqs</th><th>Last Seen</th><th>Status</th><th>Action</th></tr></thead><tbody id="devicesBody"></tbody></table></div>
        </div>
      </div>

      <!-- SETTINGS -->
      <div id="section-settings" style="display:none">
        <div class="card">
          <div class="ctitle"><i class="fas fa-cog"></i> Settings</div>
          <div style="display:flex;flex-direction:column;gap:8px">
            <button class="btn btn-d" onclick="resetAll()" style="justify-content:center"><i class="fas fa-sync-alt"></i> Reset All Usage</button>
            <button class="btn btn-d" onclick="clearLogs()" style="justify-content:center"><i class="fas fa-trash"></i> Clear All Logs</button>
            <button class="btn btn-g" onclick="unbanAll()" style="justify-content:center"><i class="fas fa-unlock"></i> Unban All</button>
            <button class="btn btn-g" onclick="clearAllStrikes()" style="justify-content:center"><i class="fas fa-eraser"></i> Clear All Strikes</button>
          </div>
        </div>
        <div class="card">
          <div class="ctitle"><i class="fas fa-bullhorn"></i> Announcement</div>
          <div class="fg"><label>Enable</label><select id="annEnabled"><option value="false">Off</option><option value="true">On</option></select></div>
          <div class="fg"><label>Text</label><input id="annText" placeholder="Welcome!"></div>
          <button class="btn btn-p" onclick="saveAnnouncement()" style="width:100%;justify-content:center"><i class="fas fa-save"></i> Save</button>
        </div>
        <div class="card">
          <div class="ctitle"><i class="fas fa-wrench"></i> Maintenance</div>
          <div class="fg"><label>Enable</label><select id="mtEnabled"><option value="false">Off</option><option value="true">On</option></select></div>
          <div class="fg"><label>Message</label><input id="mtMessage" placeholder="System under maintenance"></div>
          <button class="btn btn-p" onclick="saveMaintenance()" style="width:100%;justify-content:center"><i class="fas fa-save"></i> Save</button>
        </div>
      </div>

    </div>
  </div>
</div>

<script>
const TOKEN='${stoken}';
const ADMIN_PATH='${ADMIN_PATH}';
const ENDPOINTS = ${endpointsJSON};
let CUSTOM_APIS = ${customAPIsJSON};
let CURRENT_THEME = ${themeJSON};
const PRESETS = ${presetsJSON};
const INITIAL_KEYS = ${JSON.stringify(allKeys)};

function showToast(msg,type='ok'){const t=document.createElement('div');t.className='toast '+type;t.innerHTML=msg;document.body.appendChild(t);setTimeout(()=>t.classList.add('show'),10);setTimeout(()=>{t.classList.remove('show');setTimeout(()=>t.remove(),400)},3500);}
async function api(url,data=null){const o={method:data?'POST':'GET',headers:{'Content-Type':'application/json','x-admin-token':TOKEN}};if(data)o.body=JSON.stringify(data);const r=await fetch(ADMIN_PATH+url,o);return await r.json();}
function esc(s){const d=document.createElement('div');d.textContent=s;return d.innerHTML;}

// THEME
const savedTheme=localStorage.getItem('bronx-theme')||'dark';document.documentElement.dataset.theme=savedTheme;
function tb(){const d=document.documentElement.dataset.theme==='dark';document.getElementById('tBtn').innerHTML=d?'<i class="fas fa-sun"></i> <span>Light</span>':'<i class="fas fa-moon"></i> <span>Dark</span>';}
function toggleDark(){const c=document.documentElement.dataset.theme,n=c==='dark'?'light':'dark';document.documentElement.dataset.theme=n;localStorage.setItem('bronx-theme',n);tb();}
tb();

// SIDEBAR
function openSidebar(){document.getElementById('sb').classList.add('open');document.getElementById('sbOverlay').classList.add('show');}
function closeSidebar(){document.getElementById('sb').classList.remove('open');document.getElementById('sbOverlay').classList.remove('show');}
function logout(){if(confirm('Sign out?')){localStorage.removeItem('bronx-theme');location.href=ADMIN_PATH;}}

// SECTIONS
function switchSection(name, el){
  ['dashboard','generate','keys','endpoints','responses','monitor','stats','theme','apis','ddos','bans','devices','settings'].forEach(s => {
    const x = document.getElementById('section-'+s); if(x) x.style.display='none';
  });
  const s = document.getElementById('section-'+name); if(s) s.style.display='block';
  document.querySelectorAll('.sidebar .ni').forEach(a => a.classList.remove('on'));
  if(el) el.classList.add('on');
  document.getElementById('pageTitle').textContent = name.charAt(0).toUpperCase()+name.slice(1);
  document.getElementById('pagePath').textContent = ADMIN_PATH + ' · ' + new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false }) + ' IST';
  if(name==='dashboard') loadDashboard();
  if(name==='keys') renderKeys();
  if(name==='endpoints') renderEndpoints();
  if(name==='monitor') loadMonitorLogs();
  if(name==='stats') loadStats();
  if(name==='responses') loadResponse();
  if(name==='bans') loadBans();
  if(name==='devices') loadDevices();
  if(name==='theme') renderThemeTab();
  if(name==='apis') renderAPIs();
  if(name==='settings') loadSettings();
  if(window.innerWidth<=768) closeSidebar();
}

// SCOPES
function buildScopeHTML(cls){
  let html = '';
  ENDPOINTS.forEach(e => { html += '<label class="scope-item"><input type="checkbox" value="'+e.name+'" class="'+cls+'"> <span>'+e.i+' '+e.name+'</span></label>'; });
  html += '<label class="scope-item custom"><input type="checkbox" value="custom" class="'+cls+'"> <span>🔧 ALL Custom</span></label>';
  CUSTOM_APIS.forEach(a => { html += '<label class="scope-item custom"><input type="checkbox" value="custom:'+a.endpoint+'" class="'+cls+'"> <span>🔧 '+a.name+'</span></label>'; });
  return html;
}
function renderScopeLists(){
  const genBox = document.getElementById('scopeBoxGenerate');
  if(genBox){
    const allCb = document.getElementById('scope-all');
    const allChecked = allCb?.checked;
    genBox.innerHTML = '<label class="scope-item"><input type="checkbox" value="*" id="scope-all" '+(allChecked?'checked':'')+'> <span>🌟 ALL ACCESS</span></label>' + buildScopeHTML('scope-cb');
  }
}

// KEYS
function renderKeys(filter){
  const f = (filter || document.getElementById('keysFilter')?.value || '').toLowerCase();
  const filtered = f ? INITIAL_KEYS.filter(k => k.key.toLowerCase().includes(f) || (k.name||'').toLowerCase().includes(f)) : INITIAL_KEYS;
  const tbody = document.getElementById('keysBody');
  if(!tbody) return;
  tbody.innerHTML = filtered.map(k => {
    let s = '<span class="chip chip-green chip-sm">🟢 Active</span>';
    if(k.isExpired) s = '<span class="chip chip-red chip-sm">🔴 Expired</span>';
    else if(k.left == 0) s = '<span class="chip chip-orange chip-sm">🟠 Limit</span>';
    else if(k.stopped) s = '<span class="chip chip-red chip-sm">⛔ Stopped</span>';
    else if(k.disabled) s = '<span class="chip chip-red chip-sm">🚫 Disabled</span>';
    const sd = k.scopes.includes('*') ? '<span class="chip chip-blue chip-sm">🌟 ALL</span>' : '<span class="mu">'+k.scopes.slice(0,2).join(',')+(k.scopes.length>2?'..':'')+'</span>';
    return '<tr><td><input type="checkbox" class="keysel" value="'+k.key+'"></td>'+
      '<td><code>'+k.key.substring(0,16)+(k.key.length>16?'..':'')+'</code></td>'+
      '<td style="color:var(--ac);font-weight:600">'+k.name+'</td>'+
      '<td class="num">'+k.limit+'</td><td class="num">'+k.used+'</td>'+
      '<td class="mu">'+(k.dailyLimit||'∞')+'</td><td class="mu">'+(k.perSecondLimit||'∞')+'</td>'+
      '<td style="color:'+(k.left==0?'var(--rd)':'var(--gr)')+'">'+k.left+'</td>'+
      '<td class="mu">'+k.expiry+'</td>'+
      '<td>'+sd+'</td>'+
      '<td>'+s+'</td>'+
      '<td style="white-space:nowrap">'+
      '<button class="btn btn-g btn-sm" onclick="resetKey(\\''+k.key+'\\')" title="Reset"><i class="fas fa-sync-alt"></i></button>'+
      '<button class="btn btn-g btn-sm" onclick="pushKey(\\''+k.key+'\\')" title="Push"><i class="fas fa-arrow-up"></i></button>'+
      '<button class="btn btn-g btn-sm" onclick="editKey(\\''+k.key+'\\')" title="Edit"><i class="fas fa-edit"></i></button>'+
      '<button class="btn btn-g btn-sm" onclick="cloneKey(\\''+k.key+'\\')" title="Clone"><i class="fas fa-copy"></i></button>'+
      '<button class="btn btn-g btn-sm" onclick="stopKey(\\''+k.key+'\\')" title="Stop"><i class="fas fa-pause"></i></button>'+
      '<button class="btn btn-d btn-sm" onclick="deleteKey(\\''+k.key+'\\')" title="Delete"><i class="fas fa-trash"></i></button>'+
      '</td></tr>';
  }).join('') || '<tr><td colspan="12" style="text-align:center;padding:30px;color:var(--tx3)">No keys found</td></tr>';
}
function filterKeys(){ renderKeys(document.getElementById('keysFilter').value); }
function toggleAllKeys(cb){ document.querySelectorAll('.keysel').forEach(c=>c.checked=cb.checked); }

// KEY ACTIONS
function randomKey(){const c='ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';let r='';for(let i=0;i<20;i++)r+=c[Math.floor(Math.random()*c.length)];document.getElementById('gk').value='BRONX_'+r;showToast('🎲 Random name!','wn');}
async function generateKey(){
  const keyOwner = document.getElementById('go').value.trim();
  if(!keyOwner) return showToast('⚠ Enter Owner Name','er');
  let scopes = [];
  if(document.getElementById('scope-all').checked) scopes = ['*'];
  else document.querySelectorAll('.scope-cb:checked').forEach(c => { if(c.value) scopes.push(c.value); });
  if(!scopes.length) return showToast('⚠ Select at least one scope','er');
  const res = await api('/generate-key',{ keyName:document.getElementById('gk').value.trim(), keyOwner, scopes, limit:document.getElementById('gl').value, dailyLimit:document.getElementById('gdl').value, perSecondLimit:document.getElementById('gpsl').value, days:document.getElementById('gd').value, cooldown:document.getElementById('gc').value, notes:document.getElementById('gnotes').value });
  if(res.success){ showToast('✅ Key: ' + res.key,'ok'); setTimeout(()=>location.reload(),1500); }
  else showToast('❌ ' + (res.e||'Error'),'er');
}
async function resetKey(k){ if(confirm('Reset usage?')){ await api('/reset-key-usage',{keyName:k}); location.reload(); } }
async function deleteKey(k){ if(confirm('DELETE?')){ await api('/delete-key',{keyName:k}); location.reload(); } }
async function stopKey(k){ if(!confirm('Stop/Activate?'))return; const r=await api('/stop-key',{keyName:k}); r.success?location.reload():showToast('❌','er'); }
async function cloneKey(k){ if(!confirm('Clone?'))return; const r=await api('/clone-key',{keyName:k}); r.success?(showToast('✅ '+r.key,'ok'),setTimeout(()=>location.reload(),1200)):showToast('❌','er'); }
async function pushKey(k){ const d=prompt('Days?','30'); if(!d)return; const r=await api('/push-key',{keyName:k,days:parseInt(d)}); r.success?(showToast('✅','ok'),setTimeout(()=>location.reload(),1000)):showToast('❌','er'); }
async function editKey(k){
  const n=prompt('New key ID (empty=keep):',''); const o=prompt('New owner:',''); const l=prompt('New total limit:',''); const dl=prompt('New daily:',''); const ps=prompt('New per-sec:',''); const cd=prompt('New cooldown:',''); const nt=prompt('Notes:','');
  const data={keyName:k}; if(n)data.newName=n; if(o)data.newOwner=o; if(l)data.newLimit=l; if(dl!=='')data.newDailyLimit=dl; if(ps!=='')data.newPerSecondLimit=ps; if(cd!=='')data.newCooldown=cd; if(nt!==null)data.newNotes=nt;
  const r=await api('/edit-key',data);
  r.success?(showToast('✅ Updated','ok'),setTimeout(()=>location.reload(),1000)):showToast('❌ '+(r.e||''),'er');
}

// ENDPOINTS
function renderEndpoints(){
  const cats = {}; ENDPOINTS.forEach(e => { const c = e.c||'other'; if(!cats[c]) cats[c]=[]; cats[c].push(e); });
  let html = '';
  Object.entries(cats).forEach(([cat, eps]) => {
    html += '<div style="margin-bottom:18px"><h4 style="color:var(--ac);margin-bottom:10px;text-transform:uppercase;letter-spacing:2px;font-size:11px">📂 '+cat+'</h4><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px">';
    eps.forEach(e => { html += '<div onclick="copyEndpoint(\\''+e.name+'\\',\\''+e.p+'\\',\\''+e.e+'\\')" style="background:var(--bg1);border:1px solid var(--bd);border-radius:var(--r);padding:12px;cursor:pointer;transition:var(--tr)"><div style="font-size:18px;margin-bottom:6px">'+e.i+'</div><div style="font-family:var(--mono);font-size:12px;font-weight:600;color:var(--ac);margin-bottom:4px">/'+e.name+'</div><div style="font-size:11px;color:var(--tx3);margin-bottom:6px">'+e.d+'</div><div style="font-size:9px;color:var(--gr);background:var(--gr2);padding:4px 6px;border-radius:4px;font-family:var(--mono);word-break:break-all">/api/key-bronx/'+e.name+'?key=KEY&'+e.p+'='+e.e+'</div></div>'; });
    html += '</div></div>';
  });
  document.getElementById('endpointsList').innerHTML = html;
}
function copyEndpoint(ep,param,example){navigator.clipboard.writeText(location.origin+'/api/key-bronx/'+ep+'?key=YOUR_KEY&'+param+'='+example).then(()=>showToast('✅ Copied','ok')).catch(()=>showToast('⚠ Failed','er'));}

// CUSTOM APIs
function renderAPIs(){
  const tbody = document.getElementById('apisBody'); if(!tbody) return;
  if(!CUSTOM_APIS.length){ tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:20px;color:var(--tx3)">No custom APIs</td></tr>'; return; }
  tbody.innerHTML = CUSTOM_APIS.map(a => '<tr><td class="mu">'+a.id+'</td><td style="color:var(--ac);font-weight:600">'+a.name+'</td><td><code>/'+a.endpoint+'</code></td><td><code style="font-size:10px;color:var(--cy)">custom:'+a.endpoint+'</code></td><td class="mu">'+a.param+'</td><td>'+(a.visible?'<span class="chip chip-green chip-sm">👁</span>':'<span class="chip chip-red chip-sm">🙈</span>')+'</td><td style="white-space:nowrap"><button class="btn btn-g btn-sm" onclick="toggleAPI('+a.id+')"><i class="fas fa-eye"></i></button> <button class="btn btn-g btn-sm" onclick="editAPI('+a.id+')"><i class="fas fa-edit"></i></button> <button class="btn btn-d btn-sm" onclick="deleteAPI('+a.id+')"><i class="fas fa-trash"></i></button></td></tr>').join('');
}
async function addAPI(){
  const n = document.getElementById('aname').value.trim(); const e = document.getElementById('aep').value.trim();
  if(!n || !e) return showToast('⚠ Fill Name & Endpoint','er');
  const r = await api('/add-api',{ name:n, endpoint:e, param:document.getElementById('aparam').value, example:document.getElementById('aex').value, realAPI:document.getElementById('aurl').value, visible:true });
  if(r.success){ showToast('✅ API Added: ' + r.api.name,'ok'); CUSTOM_APIS.push(r.api); renderAPIs(); renderScopeLists(); document.getElementById('aname').value='';document.getElementById('aep').value='';document.getElementById('aex').value='';document.getElementById('aurl').value=''; document.getElementById('apiCount').textContent = CUSTOM_APIS.length; }
  else showToast('❌ ' + (r.e||'Error'),'er');
}
async function toggleAPI(id){ const r = await api('/toggle-api',{id}); if(r.success){ const a = CUSTOM_APIS.find(x => x.id === id); if(a) a.visible = r.visible; renderAPIs(); showToast('✅ Toggled','ok'); } }
async function deleteAPI(id){ if(!confirm('Delete?')) return; const r = await api('/delete-api',{id}); if(r.success){ CUSTOM_APIS = CUSTOM_APIS.filter(x => x.id !== id); renderAPIs(); renderScopeLists(); showToast('✅ Deleted','ok'); } }
async function editAPI(id){ const a = CUSTOM_APIS.find(x => x.id === id); if(!a) return; const n = prompt('New name:', a.name) || a.name; const e = prompt('New endpoint:', a.endpoint) || a.endpoint; const r = await api('/edit-api',{id, name:n, endpoint:e}); if(r.success){ Object.assign(a, r.api); renderAPIs(); showToast('✅ Updated','ok'); } }

// RESPONSES
async function loadResponse(){const ep=document.getElementById('responseEndpoint').value;const r=await api('/get-endpoint-response?endpoint='+ep);document.getElementById('responseData').value=r.data?JSON.stringify(r.data,null,2):'';}
async function updateResponse(){const ep=document.getElementById('responseEndpoint').value,d=document.getElementById('responseData').value.trim();const r=await api('/update-endpoint-response',{endpoint:ep,responseData:d});r.success?showToast('✅ Saved','ok'):showToast('❌ '+(r.e||''),'er');}

// DASHBOARD
async function loadDashboard(){
  const r=await api('/stats');
  if(r){
    document.getElementById('statToday').textContent=r.todayRequests||0;
    document.getElementById('statTotal').textContent=r.totalRequests||0;
    if(r.topKeys) document.getElementById('topKeysBody').innerHTML=r.topKeys.map(k=>'<tr><td><code style="color:var(--ac)">'+k.k+'</code></td><td class="num">'+k.v+'</td></tr>').join('')||'<tr><td colspan="2" style="text-align:center;padding:20px;color:var(--tx3)">No data</td></tr>';
    if(r.topIPs) document.getElementById('topIPsBody').innerHTML=r.topIPs.map(k=>'<tr><td><code style="color:var(--cy)">'+k.k+'</code></td><td class="num">'+k.v+'</td></tr>').join('')||'<tr><td colspan="2" style="text-align:center;padding:20px;color:var(--tx3)">No data</td></tr>';
    if(r.topDevices) document.getElementById('topDevicesBody').innerHTML=r.topDevices.map(k=>'<tr><td><code style="font-size:10px">'+k.k.substring(0,25)+'..</code></td><td class="num">'+k.v+'</td></tr>').join('')||'<tr><td colspan="2" style="text-align:center;padding:20px;color:var(--tx3)">No data</td></tr>';
    if(r.topEndpoints) document.getElementById('topEpDash').innerHTML=r.topEndpoints.map(k=>'<tr><td><code>/'+k.k+'</code></td><td class="num">'+k.v+'</td></tr>').join('')||'<tr><td colspan="2" style="text-align:center;padding:20px;color:var(--tx3)">No data</td></tr>';
  }
  const banR=await api('/bans');
  if(banR){const total=(banR.ip?.length||0)+(banR.device?.length||0)+(banR.key?.length||0);document.getElementById('statBans').textContent=total;}
  const devR=await api('/devices');
  if(devR) document.getElementById('statDevices').textContent=devR.total;
}

// MONITOR
let allLogs=[];
async function loadMonitorLogs(){const r=await api('/monitor-logs');allLogs=r.logs?r.logs.reverse():[];renderMonitor();}
function renderMonitor(){const c=document.getElementById('monitorLogs');if(!c)return;const f=(document.getElementById('monitorFilter')?.value||'').toLowerCase();const flt=f?allLogs.filter(l=>JSON.stringify(l).toLowerCase().includes(f)):allLogs;c.innerHTML=flt.slice(0,200).map(l=>'<div class="log-entry"><span class="log-time">'+l.timestamp+'</span><span class="log-key">'+l.key+'</span><span class="log-endpoint">/'+l.endpoint+'</span><span class="log-ip">'+l.ip+'</span><span style="color:var(--tx3);font-size:10px">'+l.browser+'</span></div>').join('')||'<div style="color:var(--tx3);text-align:center;padding:20px">No logs</div>';}

// STATS
async function loadStats(){
  const r=await api('/stats');
  if(r){
    document.getElementById('statTotalReqs').textContent=r.totalRequests||0;
    document.getElementById('statTodayReqs').textContent=r.todayRequests||0;
    document.getElementById('statWeekReqs').textContent=r.weeklyRequests||0;
    document.getElementById('statMonthReqs').textContent=r.monthlyRequests||0;
    document.getElementById('topEndpointsBody').innerHTML=r.topEndpoints?r.topEndpoints.map(e=>'<tr><td><code>/'+e.k+'</code></td><td class="num">'+e.v+'</td></tr>').join(''):'';
    document.getElementById('clientStatsBody').innerHTML=r.clientStats?r.clientStats.map(c=>'<tr><td><code>'+c.k+'</code></td><td class="num">'+c.v+'</td></tr>').join(''):'';
    document.getElementById('browserStatsBody').innerHTML=r.browserStats?r.browserStats.map(c=>'<tr><td><code>'+c.k+'</code></td><td class="num">'+c.v+'</td></tr>').join(''):'';
    document.getElementById('countryStatsBody').innerHTML=r.countryStats?r.countryStats.map(c=>'<tr><td><code>'+c.k+'</code></td><td class="num">'+c.v+'</td></tr>').join(''):'';
    document.getElementById('osStatsBody').innerHTML=r.osStats?r.osStats.map(c=>'<tr><td><code>'+c.k+'</code></td><td class="num">'+c.v+'</td></tr>').join(''):'';
  }
}

// BANS
async function loadBans(){
  const r=await api('/bans'); if(!r) return;
  const toRows=(list,type)=>(list||[]).map(b=>'<tr><td><code style="font-size:10px">'+b.id.substring(0,30)+'</code></td><td class="mu">'+(b.reason||'')+'</td><td class="mu">'+(b.at||'')+'</td><td class="mu">'+(b.permanent?'<span class="chip chip-red chip-sm">PERM</span>':(b.until?new Date(b.until).toLocaleString():'-'))+'</td><td class="num">'+(b.strikes||0)+'</td><td><button class="btn btn-g btn-sm" onclick="unban(\\''+type+'\\',\\''+b.id+'\\')"><i class="fas fa-unlock"></i></button></td></tr>').join('')||'<tr><td colspan="6" style="text-align:center;padding:20px;color:var(--tx3)">Empty</td></tr>';
  document.getElementById('banIPBody').innerHTML=toRows(r.ip,'ip');
  document.getElementById('banDeviceBody').innerHTML=toRows(r.device,'device');
  document.getElementById('banKeyBody').innerHTML=toRows(r.key,'key');
}
async function manualBan(){const type=document.getElementById('banType').value,id=document.getElementById('banId').value.trim();if(!id)return showToast('⚠ Enter value','er');const reason=prompt('Reason?','Manual ban')||'Manual ban';const r=await api('/ban',{type,id,reason,permanent:false,minutes:60});r.success?(showToast('✅ Banned','ok'),loadBans()):showToast('❌','er');}
async function unban(type,id){if(!confirm('Unban?'))return;const r=await api('/unban',{type,id});r.success?(showToast('✅ Unbanned','ok'),loadBans()):showToast('❌','er');}
async function unbanAll(){if(!confirm('Unban ALL?'))return;const r=await api('/unban-all');r.success?(showToast('✅ Cleared','ok'),loadBans()):showToast('❌','er');}

// DEVICES
async function loadDevices(){
  const r=await api('/devices');
  if(r && r.devices){
    document.getElementById('devicesBody').innerHTML = r.devices.slice(0,100).map(d => '<tr><td><code style="font-size:10px">'+d.id.substring(0,22)+'..</code></td><td>'+d.deviceType+'</td><td class="mu">'+d.os+'</td><td><code style="color:var(--gr)">'+d.browser+'</code></td><td class="num">'+(d.requests||0)+'</td><td class="mu" style="font-size:10px">'+(d.lastSeen||'')+'</td><td>'+(d.banned?'<span class="chip chip-red chip-sm">🚫</span>':'<span class="chip chip-green chip-sm">🟢</span>')+'</td><td>'+(d.banned?'<button class="btn btn-g btn-sm" onclick="unban(\\'device\\',\\''+d.id+'\\')"><i class="fas fa-unlock"></i></button>':'<button class="btn btn-d btn-sm" onclick="quickBanDevice(\\''+d.id+'\\')"><i class="fas fa-ban"></i></button>')+'</td></tr>').join('') || '<tr><td colspan="8" style="text-align:center;padding:20px;color:var(--tx3)">No devices</td></tr>';
  }
}
async function quickBanDevice(deviceId){if(!confirm('Ban device?'))return;const r=await api('/ban',{type:'device',id:deviceId,reason:'Quick ban',permanent:false,minutes:60});r.success?(showToast('✅ Banned','ok'),loadDevices()):showToast('❌','er');}

// DDOS
async function saveDDOS(){
  const data={ mode:document.getElementById('ddosMode').value, ip:{burst10s:document.getElementById('ddosIP10').value,perMinute:document.getElementById('ddosIP1M').value,perHour:document.getElementById('ddosIP1H').value}, device:{burst10s:document.getElementById('ddosDEV10').value,perMinute:document.getElementById('ddosDEV1M').value,perHour:document.getElementById('ddosDEV1H').value}, tempBanMs:parseInt(document.getElementById('ddosTempBan').value)*60000, longBanMs:parseInt(document.getElementById('ddosLongBan').value)*60000 };
  const r=await api('/ddos-config',data); r.success?showToast('✅ Saved','ok'):showToast('❌','er');
}
async function clearAllStrikes(){if(!confirm('Clear strikes?'))return;const r=await api('/clear-strikes',{});r.success?showToast('✅ Cleared','ok'):showToast('❌','er');}

// THEME
function renderThemeTab(){
  document.getElementById('presetsGrid').innerHTML = Object.keys(PRESETS).map(name => '<div class="preset-card '+(CURRENT_THEME.preset===name?'active':'')+'" onclick="applyPresetByName(\\''+name+'\\')"><div class="preset-swatch" style="background:linear-gradient(135deg,'+PRESETS[name].accent+','+PRESETS[name].accent2+')"></div><div class="preset-name">'+name+'</div></div>').join('');
  const colorKeys = ['accent','accent2','bgPrimary','bgSecondary','textPrimary','success','warning','danger','info'];
  document.getElementById('colorPickers').innerHTML = colorKeys.map(k => '<div class="color-picker-row"><label>'+k+'</label><input type="color" id="cp_'+k+'" value="'+(CURRENT_THEME.colors[k]||'#000000')+'"></div>').join('');
  const effectsKeys = ['snowfall','glow','rainbowAnim','gridBg','scanLines'];
  document.getElementById('effectsList').innerHTML = effectsKeys.map(k => '<div class="color-picker-row"><label>'+k+'</label><input type="checkbox" '+(CURRENT_THEME.effects[k]?'checked':'')+' id="ef_'+k+'"></div>').join('');
}
function switchTab(name, el){ document.querySelectorAll('#section-theme .tab').forEach(t=>t.classList.remove('active')); if(el) el.classList.add('active'); ['presets','colors','effects'].forEach(t => { const x=document.getElementById('themeTab-'+t); if(x) x.style.display = t===name?'block':'none'; }); }
async function applyPresetByName(name){ const r = await api('/theme/preset',{preset:name}); if(r.success){ showToast('🎨 '+name,'ok'); CURRENT_THEME=r.theme; renderThemeTab(); } }
async function saveCustomColors(){ const colors = {}; ['accent','accent2','bgPrimary','bgSecondary','textPrimary','success','warning','danger','info'].forEach(k => { const el=document.getElementById('cp_'+k); if(el) colors[k]=el.value; }); const r = await api('/theme/colors',{colors}); if(r.success){ showToast('🎨 Saved!','ok'); CURRENT_THEME=r.theme; } }
async function saveEffects(){ const effects = {}; ['snowfall','glow','rainbowAnim','gridBg','scanLines'].forEach(k => { const el=document.getElementById('ef_'+k); if(el) effects[k]=el.checked; }); const r = await api('/theme/effects',{effects}); if(r.success){ showToast('✨ Saved!','ok'); CURRENT_THEME=r.theme; } }
async function resetTheme(){ const r = await api('/theme/reset'); if(r.success){ showToast('🔄 Reset','ok'); CURRENT_THEME=r.theme; renderThemeTab(); } }

// SETTINGS
async function loadSettings(){ const r=await api('/announcement'); if(r){document.getElementById('annEnabled').value=r.enabled?'true':'false';document.getElementById('annText').value=r.text||'';} const m=await api('/maintenance'); if(m){document.getElementById('mtEnabled').value=m.enabled?'true':'false';document.getElementById('mtMessage').value=m.message||'';} }
async function saveAnnouncement(){const r=await api('/announcement',{enabled:document.getElementById('annEnabled').value==='true',text:document.getElementById('annText').value,type:'info'});r.success?showToast('✅ Saved','ok'):showToast('❌','er');}
async function saveMaintenance(){const r=await api('/maintenance',{enabled:document.getElementById('mtEnabled').value==='true',message:document.getElementById('mtMessage').value});r.success?showToast('✅ Saved','ok'):showToast('❌','er');}
async function resetAll(){if(confirm('Reset ALL?')){await api('/reset-all');showToast('✅','ok');setTimeout(()=>location.reload(),1000);}}
async function clearLogs(){if(confirm('Clear ALL logs?')){await api('/clear-logs');showToast('✅','ok');setTimeout(()=>location.reload(),1000);}}

// INIT
renderScopeLists();
renderKeys();
renderAPIs();
loadDashboard();

// SNOW
(function(){if(window.innerWidth<=768)return;const c=document.getElementById('snow');if(!c)return;const x=c.getContext('2d');let w,h;function r(){w=c.width=window.innerWidth;h=c.height=window.innerHeight}window.addEventListener('resize',r);r();const p=Array.from({length:60},()=>({x:Math.random()*w,y:Math.random()*h,r:Math.random()*2+.5,s:Math.random()*.8+.2,d:(Math.random()-.5)*.5,o:Math.random()*.4+.2}));function dr(){x.clearRect(0,0,w,h);if(document.documentElement.dataset.theme!=='dark'){requestAnimationFrame(dr);return}p.forEach(f=>{x.beginPath();x.arc(f.x,f.y,f.r,0,Math.PI*2);x.fillStyle='rgba(165,180,252,'+f.o+')';x.shadowBlur=8;x.shadowColor='rgba(129,140,248,.8)';x.fill();f.y+=f.s;f.x+=f.d;if(f.y>h){f.y=-5;f.x=Math.random()*w}if(f.x>w+5)f.x=-5;if(f.x<-5)f.x=w+5});requestAnimationFrame(dr)}dr()})();
</script></body></html>`;
  } catch(e){
    return '<html><body style="background:#010204;color:#f43f5e;padding:30px;font-family:monospace"><h1>⚠️ ERROR</h1><pre>'+e.message+'\n'+e.stack+'</pre></body></html>';
  }
}

// ============================================================
// 🚀 BOOT
// ============================================================
const PORT = process.env.PORT || 3000;
(async () => {
  initHardcoded();
  if(!loadFromDisk()){ if(!customAPIs.length) initCustomAPIs(); }
  if(!keyStorage[MASTER_API_KEY]) keyStorage[MASTER_API_KEY] = { name:'👑 OWNER', scopes:['*'], type:'owner', limit:999999, used:0, cooldown:0, dailyLimit:0, perSecondLimit:0, expiry:null, expiryStr:'LIFETIME', created:getIndiaDateTime(), unlimited:true, hidden:true, _hardcoded:false };
  saveToDisk();
  setInterval(saveToDisk, 3*60*1000);
  app.listen(PORT, () => {
    console.log('🛡️ BRONX V501 ULTRA — FT OSINT THEME');
    console.log('✅ Custom API scopes FIXED');
    console.log('🎨 Live Theme Changer ACTIVE');
    console.log('🛡️ Smart DDoS:', ddosConfig.mode);
    console.log('📱 Device Tracking ACTIVE');
    console.log('🔐 Admin:', ADMIN_PATH);
    console.log('🚀 PORT:', PORT);
  });
})();
module.exports = app;
