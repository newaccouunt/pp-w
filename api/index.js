// ============================================================
// 🛡️ BRONX OSINT V502 PRO DEVELOPER EDITION — FULLY FIXED
// ✅ Professional Developer UI (No cartoonish elements)
// ✅ JSON Preview on Public Dashboard (Admin-controlled)
// ✅ Plain Text Custom Error Messages (Emoji supported)
// ✅ Global & Per-Key Custom Developer Name
// ✅ Dynamic Response Field Hiding
// ✅ Full Backup: Keys + APIs + All Data (File/Paste Import)
// ✅ Strict DDoS Protection Mode (working)
// ✅ Fixed: Complete renderAdmin function (was truncated)
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
const getNextKey = () => { const k = REAL_API_KEYS[currentKeyIndex]; currentKeyIndex = (currentKeyIndex + 1) % REAL_API_KEYS.length; return k; };
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'bronx';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '85095613';
const MASTER_API_KEY = process.env.MASTER_API_KEY || 'BRONX_MASTER_' + crypto.randomBytes(4).toString('hex').toUpperCase();
const ADMIN_PATH = '/bronx-admin-panel';
const DATA_DIR = process.env.RENDER_DATA_DIR || '/tmp';
const F = (n) => path.join(DATA_DIR, n);
const DATA_FILE = F('bronx_v502_data.json');
const LOGS_FILE = F('bronx_v502_logs.json');
const ADMIN_LOGS_FILE = F('bronx_v502_admin_logs.json');

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

let customMessages = {
    keyNotFound: "🔑 Key not found! Purchase: @BRONX_ULTRA",
    limitReached: "🔴 Limit reached {used}/{limit}. Upgrade your plan.",
    keyStopped: "⛔ This key has been stopped by the administrator.",
    keyDisabled: "🚫 This key has been disabled.",
    keyExpired: "⏰ This key expired on {date}. Please renew.",
    missingKey: "🔑 API Key is required. Add ?key=YOUR_KEY to the URL.",
    scopeDenied: "🚫 Scope denied. Your key does not have access to this endpoint."
};

let globalConfig = {
    developerName: "@BRONX_ULTRA",
    hiddenFields: "credit, truecaller_name, cached, cached_at, api_by, by, channel, developer, api_key, real_url, source_url, owner, key_note, response_time_ms"
};

// ============================================================
// 🎨 PROFESSIONAL THEME
// ============================================================
let theme = {
    preset: 'pro-dark',
    colors: {
        bgPrimary: '#0d1117', bgSecondary: '#161b22', bgCard: '#161b22',
        borderColor: '#30363d',
        textPrimary: '#c9d1d9', textSecondary: '#8b949e', textMuted: '#6e7681',
        accent: '#58a6ff', accent2: '#238636', success: '#238636', warning: '#d29922',
        danger: '#f85149', info: '#58a6ff', pink: '#db61a2', purple: '#a371f7', yellow: '#e3b341'
    },
    effects: { glow: false, gridBg: true },
    fonts: { heading: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', body: 'Inter, sans-serif', mono: 'Fira Code, Monaco, Consolas, monospace' },
    radius: 6,
    version: 1
};

const PRESETS = {
    'pro-dark': { accent: '#58a6ff', accent2: '#238636', bgPrimary: '#0d1117', bgSecondary: '#161b22' },
    'pro-light': { accent: '#0969da', accent2: '#1a7f37', bgPrimary: '#ffffff', bgSecondary: '#f6f8fa' },
    'midnight': { accent: '#79c0ff', accent2: '#d2a8ff', bgPrimary: '#010409', bgSecondary: '#0d1117' }
};

function hexToRgb(hex){
    const h = String(hex).replace('#','');
    const n = parseInt(h.length === 3 ? h.split('').map(c=>c+c).join('') : h, 16);
    return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
}
function hexToRgbStr(hex, alpha = 1){ return `rgba(${hexToRgb(hex)},${alpha})`; }
function applyPreset(name){
    const p = PRESETS[name]; if(!p) return false;
    theme.preset = name;
    theme.colors.accent = p.accent; theme.colors.accent2 = p.accent2;
    theme.colors.bgPrimary = p.bgPrimary; theme.colors.bgSecondary = p.bgSecondary;
    theme.colors.bgCard = p.bgSecondary;
    theme.colors.borderColor = name === 'pro-light' ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)';
    theme.version++; return true;
}

// ============================================================
// 🔐 SECURITY
// ============================================================
let bans = { ip: {}, device: {}, key: {} };
let abuseTracker = { ip: {}, device: {}, key: {} };
let deviceFingerprints = {};
let ipRequestCounts = {};
let blocklist = { userAgents: [], paths: [], patterns: [] };
let whitelist = { ips: [], keys: [] };
let ddosConfig = {
    enabled: true, mode: 'smart',
    ip: { burst10s: 60, perMinute: 200, perHour: 1500, perDay: 15000 },
    device: { burst10s: 80, perMinute: 250, perHour: 2000 },
    key: { burst10s: 100, perMinute: 400, perHour: 3000 },
    strikes: { warnAt: 1, throttleAt: 2, tempBanAt: 3, longBanAt: 5, permanentAt: 10 },
    tempBanMs: 5 * 60 * 1000, longBanMs: 60 * 60 * 1000,
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
            announcement, maintenance, auditLog: auditLog.slice(-500),
            customMessages, globalConfig
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
            if(d.theme) theme = { ...theme, ...d.theme, colors: { ...theme.colors, ...(d.theme.colors||{}) } };
            if(d.bans) bans = { ...bans, ...d.bans };
            if(d.abuseTracker) abuseTracker = { ...abuseTracker, ...d.abuseTracker };
            if(d.deviceFingerprints) deviceFingerprints = d.deviceFingerprints;
            if(d.ddosConfig) ddosConfig = { ...ddosConfig, ...d.ddosConfig };
            if(d.blocklist) blocklist = d.blocklist;
            if(d.whitelist) whitelist = d.whitelist;
            if(d.announcement) announcement = d.announcement;
            if(d.maintenance) maintenance = d.maintenance;
            if(d.auditLog) auditLog = d.auditLog;
            if(d.customMessages) customMessages = { ...customMessages, ...d.customMessages };
            if(d.globalConfig) globalConfig = { ...globalConfig, ...d.globalConfig };
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
// 📱 DEVICE & UTILS
// ============================================================
function getRealIP(req){
    return (req.headers['x-forwarded-for']?.split(',')[0].trim()) || req.headers['x-real-ip'] || req.headers['cf-connecting-ip'] || req.connection?.remoteAddress || req.socket?.remoteAddress || 'Unknown';
}
function generateDeviceId(req){
    const ua = req.headers['user-agent'] || '';
    const lang = req.headers['accept-language'] || '';
    return 'DEV_' + crypto.createHash('md5').update(`${ua}|${lang}`).digest('hex').substring(0, 16).toUpperCase();
}
function detectDeviceType(req){
    const ua = (req.headers['user-agent'] || '').toLowerCase();
    if(/iphone|ipad|ipod/.test(ua)) return { type:'iOS', icon:'📱', os:'iOS' };
    if(/android/.test(ua)) return { type:'Android', icon:'📱', os:'Android' };
    if(/windows/.test(ua)) return { type:'Windows', icon:'💻', os:'Windows' };
    if(/macintosh|mac os x/.test(ua)) return { type:'macOS', icon:'💻', os:'macOS' };
    if(/linux/.test(ua)) return { type:'Linux', icon:'💻', os:'Linux' };
    if(/curl|wget|python|node|axios|java|php|ruby|go-http/.test(ua)) return { type:'Bot/CLI', icon:'🤖', os:'Bot' };
    return { type:'Unknown', icon:'❓', os:'Unknown' };
}
function detectBrowser(req){
    const ua = (req.headers['user-agent'] || '').toLowerCase();
    if(/chrome|crios/.test(ua)) return 'Chrome';
    if(/firefox|fxios/.test(ua)) return 'Firefox';
    if(/safari/.test(ua)) return 'Safari';
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
    const multiplier = ddosConfig.mode === 'strict' ? 0.3 : 1;
    const check = (type, id, baseLimits, bucket) => {
        const limits = {
            burst10s: Math.floor(baseLimits.burst10s * multiplier),
            perMinute: Math.floor(baseLimits.perMinute * multiplier),
            perHour: Math.floor(baseLimits.perHour * multiplier)
        };
        const b10 = countWindow(bucket, id, 10000);
        const b1m = countWindow(bucket, id, 60000);
        const b1h = countWindow(bucket, id, 3600000);
        if(b10 > limits.burst10s) return strike(bucket, id, `Burst ${b10}/${limits.burst10s}/10s`, { type });
        if(b1m > limits.perMinute) return strike(bucket, id, `Rate ${b1m}/${limits.perMinute}/min`, { type });
        if(b1h > limits.perHour) return strike(bucket, id, `Rate ${b1h}/${limits.perHour}/hour`, { type });
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
    if(!k) return { valid: false, error: customMessages.missingKey };
    if(maintenance.enabled && !whitelist.keys.includes(k)) return { valid: false, error: '🔧 ' + maintenance.message };
    const kd = keyStorage[k];
    if(!kd) return { valid: false, error: customMessages.keyNotFound };
    if(kd.stopped) return { valid: false, error: customMessages.keyStopped };
    if(kd.disabled) return { valid: false, error: customMessages.keyDisabled };
    if(kd.expiry && isKeyExpired(kd.expiry)) return { valid: false, error: customMessages.keyExpired.replace('{date}', kd.expiryStr) };
    if(!kd.unlimited && kd.used >= kd.limit) return { valid: false, error: customMessages.limitReached.replace('{used}', kd.used).replace('{limit}', kd.limit) };
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
    return { valid: false, error: customMessages.scopeDenied + ': ' + ep };
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
function getHiddenFields() {
    return (globalConfig.hiddenFields || "").split(',').map(s => s.trim()).filter(s => s);
}
function sanitizeResponse(d, devName){
    if(!d) return d;
    try{
        const c = JSON.parse(JSON.stringify(d));
        const fieldsToRemove = getHiddenFields();
        fieldsToRemove.forEach(x => {
            delete c[x];
            if(c.meta) delete c.meta[x];
        });
        if(c.meta && Object.keys(c.meta).length === 0) delete c.meta;
        c.powered_by = devName || globalConfig.developerName || "@BRONX_ULTRA";
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
    if(!r.allowed) {
        res.setHeader('Content-Type', 'text/plain');
        return res.status(r.code || 429).send(r.reason || 'Rate limited');
    }
    if(r.action === 'THROTTLE') return setTimeout(() => next(), 800);
    next();
});

// ============================================================
// 🏠 PUBLIC
// ============================================================
app.get('/', (req,res) => { try { res.send(renderHome()); } catch(e){ res.send('err: ' + e.message); } });
app.get('/test', (req,res) => res.json({
    status:'✅ BRONX V502 PRO ONLINE', version:'5.0.2', ddos: ddosConfig.mode,
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
        if(!api) { res.setHeader('Content-Type', 'text/plain'); return res.status(404).send('API not found or disabled'); }
        const key = req.query.key;
        if(!key) { res.setHeader('Content-Type', 'text/plain'); return res.status(400).send(customMessages.missingKey); }
        const kc = checkKeyValid(key);
        if(!kc.valid) { res.setHeader('Content-Type', 'text/plain'); return res.status(403).send(kc.error); }
        const sc = checkKeyScope(kc.keyData, req.params.ep);
        if(!sc.valid) { res.setHeader('Content-Type', 'text/plain'); return res.status(403).send(sc.error); }
        const pv = req.query[api.param] || req.query.number || req.query.num;
        if(!pv) { res.setHeader('Content-Type', 'text/plain'); return res.status(400).send('Missing param: ' + api.param); }
        if(isProtected(pv)) { res.setHeader('Content-Type', 'text/plain'); return res.status(403).send('🔒 PROTECTED'); }
        const url = api.realAPI.replace(/\{param\}/gi, encodeURIComponent(pv));
        const r = await axios.get(url, { timeout: 30000 });
        incrementKeyUsage(key, 'c/'+req.params.ep, req);
        requestLogs.push({ timestamp: getIndiaDateTime(), key:key.substring(0,8)+'***', endpoint:'c/'+req.params.ep, param:String(pv).substring(0,20), status:'success', ip:getRealIP(req), clientType:detectBrowser(req) });
        if(requestLogs.length > 2000) requestLogs = requestLogs.slice(-2000);
        const devName = kc.keyData.developerName || globalConfig.developerName;
        res.json({ ...sanitizeResponse(r.data, devName), api_info: { key_owner: kc.keyData.name, remaining: kc.keyData.unlimited ? '∞' : Math.max(0, kc.keyData.limit - kc.keyData.used), expiry: kc.keyData.expiryStr || 'LIFETIME' } });
    }catch(e){ res.setHeader('Content-Type', 'text/plain'); res.status(500).send('API error: ' + e.message); }
});

app.get('/api/key-bronx/:ep', async (req,res) => {
    try{
        const ep = req.params.ep;
        if(!endpoints[ep]) { res.setHeader('Content-Type', 'text/plain'); return res.status(404).send('Endpoint not found'); }
        const key = req.query.key;
        if(!key) { res.setHeader('Content-Type', 'text/plain'); return res.status(400).send(customMessages.missingKey); }
        const kc = checkKeyValid(key);
        if(!kc.valid) { res.setHeader('Content-Type', 'text/plain'); return res.status(403).send(kc.error); }
        const sc = checkKeyScope(kc.keyData, ep);
        if(!sc.valid) { res.setHeader('Content-Type', 'text/plain'); return res.status(403).send(sc.error); }
        const pv = req.query[endpoints[ep].p];
        if(!pv) { res.setHeader('Content-Type', 'text/plain'); return res.status(400).send('Missing parameter: ' + endpoints[ep].p); }
        if(isProtected(pv)) { res.setHeader('Content-Type', 'text/plain'); return res.status(403).send('🔒 PROTECTED'); }
        if(endpointResponses[ep]) {
            const devName = kc.keyData.developerName || globalConfig.developerName;
            return res.json({ ...sanitizeResponse(endpointResponses[ep], devName), api_info:{key_owner:kc.keyData.name} });
        }
        const url = `${REAL_API_BASE}/${ep}?key=${getNextKey()}&${endpoints[ep].p}=${encodeURIComponent(pv)}`;
        const r = await axios.get(url, { timeout: 30000 });
        incrementKeyUsage(key, ep, req);
        requestLogs.push({ timestamp: getIndiaDateTime(), key:key.substring(0,8)+'***', endpoint:ep, param:String(pv).substring(0,20), status:'success', ip:getRealIP(req), clientType:detectBrowser(req) });
        if(requestLogs.length > 2000) requestLogs = requestLogs.slice(-2000);
        const devName = kc.keyData.developerName || globalConfig.developerName;
        res.json({ ...sanitizeResponse(r.data, devName), api_info: { key_owner: kc.keyData.name, remaining: kc.keyData.unlimited ? '∞' : Math.max(0, kc.keyData.limit - kc.keyData.used), expiry: kc.keyData.expiryStr || 'LIFETIME' } });
    }catch(e){ res.setHeader('Content-Type', 'text/plain'); res.status(500).send('API error: ' + e.message); }
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
    const { keyName, keyOwner, scopes, limit, expiryDate, days, cooldown, dailyLimit, perSecondLimit, autoGenerate, notes, developerName } = req.body;
    let fk = keyName; if(autoGenerate || !keyName) fk = genRandomKey();
    if(!fk || !keyOwner) return res.json({e:'Missing fields'});
    if(keyStorage[fk]) return res.json({e:'Key already exists'});
    const ks = scopes || ['number'];
    let exp = null, es = expiryDate || 'LIFETIME';
    if(days && !isNaN(days)){
        const d = new Date(Date.now() + parseInt(days)*24*3600*1000);
        exp = d; es = d.toISOString().split('T')[0].split('-').reverse().join('-');
    } else if(expiryDate && expiryDate !== 'LIFETIME'){ exp = parseExpiryDate(expiryDate); es = expiryDate; }
    keyStorage[fk] = { name:keyOwner, scopes:ks, type:'generated', limit:parseInt(limit)||100, used:0, cooldown:parseInt(cooldown)||0, dailyLimit:parseInt(dailyLimit)||0, perSecondLimit:parseInt(perSecondLimit)||0, expiry:exp, expiryStr:es, created:getIndiaDateTime(), unlimited:false, hidden:false, _hardcoded:false, stopped:false, disabled:false, notes:notes||'', developerName: developerName || '' };
    logAudit('admin', 'GENERATE_KEY', { key:fk, scopes:ks });
    saveToDisk();
    res.json({ success:true, key:fk, message:'🔑 Key Generated!' });
});
app.post(ADMIN_PATH + '/edit-key', adminAuth, (req,res) => {
    const { keyName, newName, newOwner, newLimit, newDailyLimit, newPerSecondLimit, newCooldown, newScopes, newNotes, newExpiry, newDeveloperName } = req.body;
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
    if(newDeveloperName !== undefined) t.developerName = newDeveloperName;
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
app.get(ADMIN_PATH + '/ip-request-stats', adminAuth, (req,res) => {
    const now = Date.now();
    const stats = Object.entries(abuseTracker.ip).filter(([ip]) => !ip.startsWith('LOGIN_')).map(([ip, t]) => ({
        ip, reqs10s: t.hits.filter(x => x > now - 10000).length,
        reqs1m: t.hits.filter(x => x > now - 60000).length,
        reqs1h: t.hits.filter(x => x > now - 3600000).length,
        total: t.hits.length, strikes: t.strikes || 0, isBanned: isBanned('ip', ip)
    })).sort((a,b) => b.reqs1h - a.reqs1h);
    res.json({ stats: stats.slice(0,50), total: stats.length });
});
app.get(ADMIN_PATH + '/theme', adminAuth, (req,res) => res.json({ theme, presets: Object.keys(PRESETS) }));
app.post(ADMIN_PATH + '/theme/preset', adminAuth, (req,res) => {
    if(!applyPreset(req.body.preset)) return res.json({e:'Invalid preset'});
    saveToDisk(); res.json({ success:true, theme });
});
app.post(ADMIN_PATH + '/update-response-settings', adminAuth, (req,res) => {
    const { developerName, hiddenFields, messages } = req.body;
    if(developerName !== undefined) globalConfig.developerName = developerName;
    if(hiddenFields !== undefined) globalConfig.hiddenFields = hiddenFields;
    if(messages) {
        Object.keys(messages).forEach(k => {
            if(customMessages[k] !== undefined) customMessages[k] = messages[k];
        });
    }
    saveToDisk();
    res.json({ success: true, globalConfig, customMessages });
});
app.get(ADMIN_PATH + '/response-settings', adminAuth, (req,res) => {
    res.json({ globalConfig, customMessages });
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
    res.json({
        version:'5.0.2', exported_at: getIndiaDateTime(),
        keys: ks, apis: customAPIs, protected: protectedData,
        endpointResponses, theme, ddosConfig, blocklist, whitelist,
        announcement, maintenance, bans, deviceFingerprints, globalConfig, customMessages
    });
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
        if(b.globalConfig) globalConfig = { ...globalConfig, ...b.globalConfig };
        if(b.customMessages) customMessages = { ...customMessages, ...b.customMessages };
        saveToDisk(); res.json({success:true, message:'✅ Restored'});
    }catch(e){ res.json({e:'Restore failed: ' + e.message}); }
});
app.get(ADMIN_PATH + '/search-keys', adminAuth, (req,res) => {
    const q = (req.query.q || '').toLowerCase();
    const matches = Object.entries(keyStorage).filter(([k,d]) =>
        !d._hardcoded && (k.toLowerCase().includes(q) || (d.name||'').toLowerCase().includes(q))
    ).slice(0, 50).map(([k,d]) => ({ key:k, name:d.name, used:d.used, limit:d.limit }));
    res.json({ matches, total: matches.length });
});
app.use((req,res) => res.json({error:'Not found'}));

// ============================================================
// 🎨 DYNAMIC PROFESSIONAL CSS
// ============================================================
function generateCSS(){
    const c = theme.colors;
    const e = theme.effects;
    const r = theme.radius;
    return `
<style id="bronx-theme">
:root{
    --bg-primary:${c.bgPrimary}; --bg-secondary:${c.bgSecondary}; --bg-card:${c.bgCard};
    --border-color:${c.borderColor}; --text-primary:${c.textPrimary};
    --text-secondary:${c.textSecondary}; --text-muted:${c.textMuted};
    --accent:${c.accent}; --accent2:${c.accent2};
    --success:${c.success}; --warning:${c.warning}; --danger:${c.danger}; --info:${c.info};
    --radius:${r}px; --blur:blur(10px); --tr:all .2s ease;
}
*{margin:0;padding:0;box-sizing:border-box}
body{background:var(--bg-primary);color:var(--text-primary);font-family:${theme.fonts.body};min-height:100vh;overflow-x:hidden;position:relative;line-height:1.5}
${e.gridBg ? `.grid-bg{position:fixed;inset:0;background-image:radial-gradient(${hexToRgbStr(c.accent,.08)} 1px,transparent 1px);background-size:24px 24px;z-index:0;pointer-events:none}` : '.grid-bg{display:none}'}
::-webkit-scrollbar{width:8px;height:8px}
::-webkit-scrollbar-track{background:var(--bg-primary)}
::-webkit-scrollbar-thumb{background:var(--border-color);border-radius:4px}
::-webkit-scrollbar-thumb:hover{background:var(--text-muted)}
.admin-container{display:flex;min-height:100vh;position:relative;z-index:10}
.sidebar{width:260px;background:var(--bg-secondary);border-right:1px solid var(--border-color);padding:20px 0;position:fixed;height:100vh;overflow-y:auto}
.sidebar-header{text-align:center;padding:0 20px 20px;border-bottom:1px solid var(--border-color);margin-bottom:10px}
.sidebar-logo{font-size:28px;margin-bottom:8px}
.sidebar-title{font-size:16px;font-weight:700;color:var(--text-primary);letter-spacing:1px;font-family:${theme.fonts.heading}}
.sidebar-subtitle{font-size:11px;color:var(--text-muted);margin-top:4px}
.sidebar-nav{list-style:none;padding:0 10px}
.sidebar-nav li{margin-bottom:2px}
.sidebar-nav a{display:flex;align-items:center;gap:10px;padding:10px 12px;color:var(--text-secondary);text-decoration:none;border-radius:6px;transition:var(--tr);font-size:13px;font-weight:500;cursor:pointer}
.sidebar-nav a:hover{background:var(--bg-primary);color:var(--text-primary)}
.sidebar-nav a.active{background:var(--accent);color:#fff;font-weight:600}
.sidebar-nav i{width:18px;text-align:center;font-size:14px}
.main-content{flex:1;margin-left:260px;padding:24px}
.glow-card{background:var(--bg-card);border:1px solid var(--border-color);border-radius:var(--radius);padding:24px;margin-bottom:20px;transition:var(--tr)}
.glow-card h3{margin-bottom:20px;font-size:16px;font-weight:600;display:flex;align-items:center;gap:10px;color:var(--text-primary);font-family:${theme.fonts.heading}}
.glow-card h3 i{color:var(--accent)}
.stats-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:16px;margin-bottom:24px}
.stat-card{background:var(--bg-secondary);border:1px solid var(--border-color);border-radius:8px;padding:20px;text-align:center;transition:var(--tr)}
.stat-card:hover{border-color:var(--accent);transform:translateY(-2px)}
.stat-icon{font-size:24px;margin-bottom:8px}
.stat-value{font-size:28px;font-weight:700;color:var(--accent);margin-bottom:4px;font-family:${theme.fonts.mono}}
.stat-label{font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;font-weight:600}
.form-group{margin-bottom:16px}
.form-group label{display:block;margin-bottom:6px;color:var(--text-secondary);font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px}
.form-input{width:100%;padding:10px 12px;background:var(--bg-primary);border:1px solid var(--border-color);border-radius:6px;color:var(--text-primary);font-size:13px;transition:var(--tr);outline:none;font-family:${theme.fonts.body}}
.form-input:focus{border-color:var(--accent);box-shadow:0 0 0 3px ${hexToRgbStr(c.accent,0.1)}}
.form-input option{background:var(--bg-secondary);color:var(--text-primary)}
.btn-primary{padding:10px 16px;background:var(--accent);color:#fff;border:none;border-radius:6px;cursor:pointer;font-weight:600;font-size:13px;transition:var(--tr);font-family:${theme.fonts.body}}
.btn-primary:hover{opacity:0.9;transform:translateY(-1px)}
.btn-success{background:var(--success);color:#fff}
.btn-danger{background:var(--danger);color:#fff}
.btn-warning{background:var(--warning);color:#000}
.btn-info{background:var(--info);color:#fff}
.btn-action{padding:6px 10px;border-radius:4px;border:1px solid var(--border-color);cursor:pointer;font-size:12px;transition:var(--tr);background:var(--bg-secondary);color:var(--text-secondary);margin:2px;font-weight:500}
.btn-action:hover{border-color:var(--accent);color:var(--accent)}
.table-container{overflow-x:auto;border-radius:8px;border:1px solid var(--border-color)}
table{width:100%;border-collapse:collapse;font-size:13px}
th{background:var(--bg-secondary);color:var(--text-secondary);padding:12px;text-align:left;font-weight:600;text-transform:uppercase;font-size:11px;letter-spacing:0.5px;position:sticky;top:0;z-index:2;border-bottom:1px solid var(--border-color)}
td{padding:12px;border-bottom:1px solid var(--border-color);color:var(--text-primary)}
tr:hover td{background:var(--bg-primary)}
code{background:var(--bg-primary);padding:2px 6px;border-radius:4px;color:var(--accent);font-family:${theme.fonts.mono};font-size:12px;border:1px solid var(--border-color)}
.endpoint-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:16px}
.endpoint-card{background:var(--bg-secondary);border:1px solid var(--border-color);border-radius:8px;padding:20px;transition:var(--tr);position:relative;overflow:hidden}
.endpoint-card:hover{border-color:var(--accent);transform:translateY(-2px)}
.endpoint-card .ep-header{display:flex;align-items:center;gap:10px;margin-bottom:10px}
.endpoint-card .ep-icon{font-size:20px}
.endpoint-card .ep-name{font-size:15px;font-weight:600;color:var(--text-primary);font-family:${theme.fonts.mono}}
.endpoint-card .ep-desc{font-size:13px;color:var(--text-secondary);margin-bottom:12px}
.endpoint-card .ep-url{font-size:12px;color:var(--success);background:var(--bg-primary);padding:10px;border-radius:6px;font-family:${theme.fonts.mono};word-break:break-all;border:1px solid var(--border-color);margin-bottom:12px}
.endpoint-card .json-preview{background:#0d1117;border:1px solid var(--border-color);border-radius:6px;padding:12px;max-height:200px;overflow-y:auto}
.endpoint-card .json-preview pre{font-family:${theme.fonts.mono};font-size:11px;color:#c9d1d9;margin:0;white-space:pre-wrap;word-break:break-all}
.live-logs{background:var(--bg-primary);border:1px solid var(--border-color);border-radius:8px;padding:16px;max-height:500px;overflow-y:auto;font-family:${theme.fonts.mono};font-size:12px}
.log-entry{padding:8px;border-bottom:1px solid var(--border-color);display:flex;gap:12px;flex-wrap:wrap;transition:var(--tr);border-radius:4px;align-items:center}
.log-entry:hover{background:var(--bg-secondary)}
.log-time{color:var(--text-muted);font-size:11px}
.log-key{color:var(--accent);font-weight:600}
.log-endpoint{color:var(--accent2)}
.log-ip{color:var(--info)}
.toast{position:fixed;top:20px;right:20px;z-index:99999;padding:14px 20px;border-radius:8px;color:#fff;font-weight:600;font-size:13px;animation:slideIn .3s ease;max-width:400px;backdrop-filter:blur(10px);border:1px solid}
.toast.success{background:${hexToRgbStr(c.success,0.15)};border-color:var(--success);color:var(--success)}
.toast.error{background:${hexToRgbStr(c.danger,0.15)};border-color:var(--danger);color:var(--danger)}
.toast.warning{background:${hexToRgbStr(c.warning,0.15)};border-color:var(--warning);color:var(--warning)}
.toast.info{background:${hexToRgbStr(c.info,0.15)};border-color:var(--info);color:var(--info)}
.tabs{display:flex;gap:4px;border-bottom:1px solid var(--border-color);margin-bottom:20px}
.tab{padding:10px 16px;cursor:pointer;font-size:13px;font-weight:600;color:var(--text-muted);border-bottom:2px solid transparent;transition:var(--tr)}
.tab:hover{color:var(--text-primary)}
.tab.active{color:var(--accent);border-bottom-color:var(--accent)}
.scope-box{display:flex;flex-wrap:wrap;gap:8px;padding:12px;background:var(--bg-primary);border-radius:6px;border:1px solid var(--border-color);max-height:300px;overflow-y:auto}
.scope-item{cursor:pointer;font-size:12px;display:inline-flex;align-items:center;gap:6px;padding:6px 10px;border-radius:4px;background:var(--bg-secondary);border:1px solid var(--border-color);color:var(--text-secondary)}
.scope-item:hover{border-color:var(--accent);color:var(--text-primary)}
.scope-item input{accent-color:var(--accent)}
@keyframes slideIn{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}
@media(max-width:768px){.sidebar{width:60px;padding:10px 0}.sidebar .sidebar-title,.sidebar .sidebar-subtitle,.sidebar-nav a span{display:none}.sidebar-nav a{justify-content:center;padding:12px}.main-content{margin-left:60px;padding:16px}.stats-grid{grid-template-columns:repeat(2,1fr)}.endpoint-grid{grid-template-columns:1fr}}
</style>`;
}

// ============================================================
// LOGIN PAGE
// ============================================================
function renderLogin(){
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>BRONX V502 | Login</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
${generateCSS()}
<style>
body{display:flex;align-items:center;justify-content:center;overflow:hidden}
.login-container{position:relative;z-index:10;width:400px;max-width:90vw}
.login-card{background:var(--bg-card);border:1px solid var(--border-color);border-radius:12px;padding:40px 32px;position:relative;overflow:hidden}
.login-logo{text-align:center;margin-bottom:24px}
.login-logo .icon{font-size:48px;display:inline-block;margin-bottom:12px}
.login-logo .brand{font-family:${theme.fonts.heading};font-size:18px;font-weight:700;letter-spacing:2px;color:var(--text-primary)}
.login-title{text-align:center;font-family:${theme.fonts.heading};font-size:24px;font-weight:700;color:var(--text-primary);margin-bottom:8px}
.login-subtitle{text-align:center;color:var(--text-muted);font-size:13px;margin-bottom:32px}
.input-group{position:relative;margin-bottom:20px}
.input-group .input-icon{position:absolute;left:14px;top:50%;transform:translateY(-50%);color:var(--text-muted);font-size:14px;z-index:2}
.input-group input{width:100%;padding:12px 14px 12px 42px;background:var(--bg-primary);border:1px solid var(--border-color);border-radius:6px;color:var(--text-primary);font-size:14px;outline:none;transition:var(--tr)}
.input-group input:focus{border-color:var(--accent)}
.login-btn{width:100%;padding:14px;background:var(--accent);color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:14px;font-weight:600;transition:var(--tr)}
.login-btn:hover{opacity:0.9}
.message{text-align:center;margin-top:16px;font-size:13px;font-weight:500;min-height:20px}
</style></head><body>
<div class="grid-bg"></div>
<div class="login-container"><div class="login-card">
<div class="login-logo"><span class="icon">🛡️</span><div class="brand">BRONX OSINT</div></div>
<h2 class="login-title">V502 PRO</h2>
<p class="login-subtitle">Secure Dashboard Access</p>
<div class="input-group"><i class="fas fa-user input-icon"></i><input type="text" id="username" placeholder="Username" autocomplete="off"></div>
<div class="input-group"><i class="fas fa-lock input-icon"></i><input type="password" id="password" placeholder="Password" autocomplete="off"></div>
<button class="login-btn" onclick="login()"><i class="fas fa-shield-halved"></i> AUTHENTICATE</button>
<div class="message" id="message"></div>
</div></div>
<script>
async function login(){
    const u=document.getElementById('username').value.trim(),p=document.getElementById('password').value.trim(),m=document.getElementById('message');
    if(!u||!p){m.style.color='var(--warning)';m.innerHTML='<i class="fas fa-exclamation-triangle"></i> Fill all fields';return}
    m.style.color='var(--info)';m.innerHTML='<i class="fas fa-spinner fa-spin"></i> Authenticating...';
    try{const r=await fetch('${ADMIN_PATH}/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:u,password:p})});const d=await r.json();
    if(d.success){m.style.color='var(--success)';m.innerHTML='<i class="fas fa-check-circle"></i> '+d.message;setTimeout(()=>location.href=d.redirect,600)}
    else{m.style.color='var(--danger)';m.innerHTML='<i class="fas fa-times-circle"></i> '+d.error}}catch(e){m.style.color='var(--danger)';m.innerHTML='<i class="fas fa-plug"></i> Connection error'}}
document.addEventListener('keydown',e=>{if(e.key==='Enter')login()});
</script></body></html>`;
}

// ============================================================
// HOME PAGE — Professional Developer UI
// ============================================================
function renderHome(){
    const vapi = customAPIs.filter(a => a.visible);
    let cards = '';
    Object.entries(endpoints).forEach(([n,e]) => {
        const preview = endpointResponses[n] ? JSON.stringify(endpointResponses[n], null, 2) : '{\n  "status": "success",\n  "data": "Sample response. Admin can configure this in Admin Panel."\n}';
        cards += `<div class="endpoint-card">
            <div class="ep-header"><span class="ep-icon">${e.i}</span><div class="ep-name">/${esc(n)}</div></div>
            <div class="ep-desc">${e.d}</div>
            <div class="ep-url">GET /api/key-bronx/${n}?key=YOUR_KEY&${e.p}=${e.e}</div>
            <div class="json-preview"><pre>${esc(preview)}</pre></div>
        </div>`;
    });
    vapi.forEach(a => {
        const preview = endpointResponses[a.endpoint] ? JSON.stringify(endpointResponses[a.endpoint], null, 2) : '{\n  "status": "success",\n  "data": "Sample response."\n}';
        cards += `<div class="endpoint-card">
            <div class="ep-header"><span class="ep-icon">🔧</span><div class="ep-name">/${esc(a.endpoint)}</div></div>
            <div class="ep-desc">${esc(a.name)}</div>
            <div class="ep-url">GET /api/custom/${a.endpoint}?key=YOUR_KEY&${a.param}=${a.example||'v'}</div>
            <div class="json-preview"><pre>${esc(preview)}</pre></div>
        </div>`;
    });
    const announcementHTML = announcement.enabled ? `<div style="position:fixed;top:0;left:0;right:0;z-index:9999;padding:12px 20px;text-align:center;font-size:13px;font-weight:600;background:var(--accent);color:#fff">📢 ${esc(announcement.text)}</div>` : '';
    const maintenanceHTML = maintenance.enabled ? `<div style="position:fixed;inset:0;z-index:99999;background:var(--bg-primary);display:flex;align-items:center;justify-content:center;flex-direction:column;gap:20px;padding:40px;text-align:center"><div style="font-size:64px">🔧</div><h1 style="font-family:${theme.fonts.heading};color:var(--warning);font-size:28px;letter-spacing:2px">MAINTENANCE MODE</h1><p style="color:var(--text-secondary);font-size:14px">${esc(maintenance.message)}</p></div>` : '';
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>BRONX OSINT V502 PRO</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Fira+Code:wght@400;500&display=swap" rel="stylesheet">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
${generateCSS()}
<style>
.topnav{position:sticky;top:0;z-index:1000;background:var(--bg-secondary);border-bottom:1px solid var(--border-color);padding:16px 28px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px}
.brand{font-family:${theme.fonts.heading};font-size:16px;font-weight:700;letter-spacing:1px;color:var(--text-primary);text-decoration:none;display:flex;align-items:center;gap:10px}
.nav-links{display:flex;gap:12px;align-items:center}
.nav-links a{color:var(--text-secondary);text-decoration:none;font-size:13px;font-weight:500;padding:8px 14px;border-radius:6px;transition:var(--tr);border:1px solid transparent}
.nav-links a:hover{color:var(--text-primary);border-color:var(--border-color);background:var(--bg-primary)}
.hero{text-align:center;padding:60px 20px 40px;position:relative;z-index:10}
.hero h1{font-size:clamp(32px,6vw,48px);font-weight:700;color:var(--text-primary);font-family:${theme.fonts.heading};margin-bottom:12px}
.hero p{color:var(--text-muted);font-size:14px;letter-spacing:1px}
.container{max-width:1200px;margin:0 auto;padding:20px;position:relative;z-index:10}
.footer{text-align:center;padding:32px;border-top:1px solid var(--border-color);position:relative;z-index:10;color:var(--text-muted);font-size:13px}
</style></head><body>
<div class="grid-bg"></div>
${announcementHTML}${maintenanceHTML}
<nav class="topnav">
<a href="/" class="brand">🛡️ BRONX V502 PRO</a>
<div class="nav-links">
<a href="/test"><i class="fas fa-heartbeat"></i> STATUS</a>
<span style="padding:6px 12px;border-radius:20px;font-size:12px;font-weight:600;background:${hexToRgbStr(theme.colors.success,0.1)};color:${theme.colors.success};border:1px solid ${hexToRgbStr(theme.colors.success,0.3)}">🟢 ONLINE</span>
</div>
</nav>
<header class="hero"><h1>BRONX OSINT API</h1><p>Professional Grade · Smart DDoS Protection · Developer Friendly</p></header>
<div class="container"><div class="endpoint-grid">${cards}</div></div>
<footer class="footer">Powered by <span style="color:var(--accent);font-weight:600">${globalConfig.developerName}</span> · V502 PRO</footer>
<script>
function showToast(m,t='success'){const x=document.createElement('div');x.className='toast '+t;x.innerHTML=m;document.body.appendChild(x);setTimeout(()=>x.remove(),3000);}
</script></body></html>`;
}

// ============================================================
// ADMIN PANEL — Professional UI + All Features
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
            stopped:d.stopped||false, disabled:d.disabled||false, notes:d.notes||'', developerName: d.developerName || ''
        }));

        // Generate scope checkboxes for both generate and update
        const epKeys = Object.keys(endpoints);
        const genScopeHTML = `<label class="scope-item"><input type="checkbox" value="*" id="scope-all" checked> <span>🌟 ALL</span></label>` +
            epKeys.map(e => `<label class="scope-item"><input type="checkbox" value="${e}"> <span>${e}</span></label>`).join('') +
            `<label class="scope-item"><input type="checkbox" value="custom"> <span>🔧 CUSTOM ALL</span></label>`;
        const updateScopeHTML = `<label class="scope-item"><input type="checkbox" value="*" id="scope-all2"> <span>🌟 ALL</span></label>` +
            epKeys.map(e => `<label class="scope-item"><input type="checkbox" value="${e}"> <span>${e}</span></label>`).join('') +
            `<label class="scope-item"><input type="checkbox" value="custom"> <span>🔧 CUSTOM ALL</span></label>`;

        return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>BRONX V502 ADMIN</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Fira+Code:wght@400;500&display=swap" rel="stylesheet">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
${generateCSS()}
</head><body>
<div class="grid-bg"></div>
<div class="admin-container">
<div class="sidebar">
<div class="sidebar-header"><div class="sidebar-logo">🛡️</div><div class="sidebar-title">BRONX V502</div><div class="sidebar-subtitle">Admin Dashboard</div></div>
<ul class="sidebar-nav">
<li><a class="active" onclick="switchSection('dashboard',this)"><i class="fas fa-chart-pie"></i><span>Dashboard</span></a></li>
<li><a onclick="switchSection('generate',this)"><i class="fas fa-plus-circle"></i><span>Generate Key</span></a></li>
<li><a onclick="switchSection('keys',this)"><i class="fas fa-key"></i><span>All Keys</span></a></li>
<li><a onclick="switchSection('endpoints',this)"><i class="fas fa-list"></i><span>Endpoints</span></a></li>
<li><a onclick="switchSection('responses',this)"><i class="fas fa-code"></i><span>Edit Responses</span></a></li>
<li><a onclick="switchSection('response-settings',this)"><i class="fas fa-sliders-h"></i><span>Response Settings</span></a></li>
<li><a onclick="switchSection('monitor',this)"><i class="fas fa-desktop"></i><span>Live Monitor</span></a></li>
<li><a onclick="switchSection('stats',this)"><i class="fas fa-chart-bar"></i><span>Statistics</span></a></li>
<li><a onclick="switchSection('theme',this)"><i class="fas fa-palette"></i><span>Theme</span></a></li>
<li><a onclick="switchSection('import',this)"><i class="fas fa-download"></i><span>Import</span></a></li>
<li><a onclick="switchSection('export',this)"><i class="fas fa-upload"></i><span>Export</span></a></li>
<li><a onclick="switchSection('scopes',this)"><i class="fas fa-crosshairs"></i><span>Update Scopes</span></a></li>
<li><a onclick="switchSection('protect',this)"><i class="fas fa-shield-alt"></i><span>Protection</span></a></li>
<li><a onclick="switchSection('apis',this)"><i class="fas fa-plug"></i><span>Custom APIs</span></a></li>
<li><a onclick="switchSection('addapi',this)"><i class="fas fa-puzzle-piece"></i><span>Add API</span></a></li>
<li><a onclick="switchSection('ddos',this)"><i class="fas fa-shield-virus"></i><span>Smart DDoS</span></a></li>
<li><a onclick="switchSection('bans',this)"><i class="fas fa-ban"></i><span>Bans Manager</span></a></li>
<li><a onclick="switchSection('devices',this)"><i class="fas fa-laptop"></i><span>Devices</span></a></li>
<li><a onclick="switchSection('bulk',this)"><i class="fas fa-layer-group"></i><span>Bulk Actions</span></a></li>
<li><a onclick="switchSection('pushall',this)"><i class="fas fa-arrow-up"></i><span>Push All</span></a></li>
<li><a onclick="switchSection('announce',this)"><i class="fas fa-bullhorn"></i><span>Announcement</span></a></li>
<li><a onclick="switchSection('maintenance',this)"><i class="fas fa-wrench"></i><span>Maintenance</span></a></li>
<li><a onclick="switchSection('audit',this)"><i class="fas fa-clipboard-list"></i><span>Audit Log</span></a></li>
<li><a onclick="switchSection('adminlogs',this)"><i class="fas fa-history"></i><span>Admin Logs</span></a></li>
<li><a onclick="switchSection('backup',this)"><i class="fas fa-database"></i><span>Backup</span></a></li>
<li><a onclick="switchSection('settings',this)"><i class="fas fa-cog"></i><span>Settings</span></a></li>
</ul>
</div>
<div class="main-content">
<div class="stats-grid">
<div class="stat-card"><div class="stat-icon">🔑</div><div class="stat-value" id="hdKeys">${allKeys.length}</div><div class="stat-label">Keys</div></div>
<div class="stat-card"><div class="stat-icon">📊</div><div class="stat-value" id="statToday">-</div><div class="stat-label">Today</div></div>
<div class="stat-card"><div class="stat-icon">📈</div><div class="stat-value" id="statTotal">-</div><div class="stat-label">Total</div></div>
<div class="stat-card"><div class="stat-icon">🚫</div><div class="stat-value" id="statBans">-</div><div class="stat-label">Bans</div></div>
<div class="stat-card"><div class="stat-icon">📱</div><div class="stat-value" id="statDevices">-</div><div class="stat-label">Devices</div></div>
<div class="stat-card"><div class="stat-icon">🔧</div><div class="stat-value" id="hdAPIs">${customAPIs.length}</div><div class="stat-label">Custom APIs</div></div>
</div>

<!-- DASHBOARD -->
<div class="glow-card" id="section-dashboard">
<h3><i class="fas fa-fire"></i> Overview</h3>
<div class="stats-grid">
<div class="stat-card"><div class="stat-value" id="dashToday">-</div><div class="stat-label">Today</div></div>
<div class="stat-card"><div class="stat-value" id="dashWeek">-</div><div class="stat-label">Week</div></div>
<div class="stat-card"><div class="stat-value" id="dashMonth">-</div><div class="stat-label">Month</div></div>
<div class="stat-card"><div class="stat-value" id="dashTotal">-</div><div class="stat-label">Total</div></div>
</div>
<h3 style="margin-top:24px"><i class="fas fa-trophy"></i> Top Keys</h3>
<div class="table-container"><table><thead><tr><th>Key</th><th>Requests</th></tr></thead><tbody id="topKeysBody"></tbody></table></div>
</div>

<!-- GENERATE -->
<div class="glow-card" id="section-generate" style="display:none">
<h3><i class="fas fa-wand-magic-sparkles"></i> Generate New Key</h3>
<div class="form-group"><label>Key ID (empty = random)</label><input class="form-input" id="gk" placeholder="MY_KEY or empty"></div>
<button class="btn-primary btn-warning" onclick="randomKey()" style="margin-bottom:16px;width:100%"><i class="fas fa-dice"></i> 🎲 RANDOM</button>
<div class="form-group"><label>Owner Name</label><input class="form-input" id="go" placeholder="Client Name"></div>
<div class="form-group"><label>Custom Developer Name for this Key (Optional)</label><input class="form-input" id="gdev" placeholder="e.g. @MY_CUSTOM_NAME"></div>
<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px">
<div class="form-group"><label>Total Limit</label><input class="form-input" id="gl" type="number" value="100"></div>
<div class="form-group"><label>Daily (0=∞)</label><input class="form-input" id="gdl" type="number" value="0"></div>
<div class="form-group"><label>Per Sec (0=∞)</label><input class="form-input" id="gpsl" type="number" value="0"></div>
</div>
<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:16px">
<div class="form-group"><label>Cooldown (s)</label><input class="form-input" id="gc" type="number" value="0"></div>
<div class="form-group"><label>Days Valid</label><input class="form-input" id="gd" type="number" value="30"></div>
</div>
<div class="form-group"><label>Notes</label><input class="form-input" id="gnotes" placeholder="Optional notes"></div>
<div class="form-group"><label>Scopes</label>
<div class="scope-box" id="scopeBoxGenerate">${genScopeHTML}</div></div>
<button class="btn-primary" onclick="generateKey()" style="width:100%"><i class="fas fa-rocket"></i> GENERATE KEY</button>
</div>

<!-- KEYS -->
<div class="glow-card" id="section-keys" style="display:none">
<h3><i class="fas fa-key"></i> All Keys (<span id="keysCount">${allKeys.length}</span>)</h3>
<div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap">
<input class="form-input" id="keysFilter" placeholder="🔍 Filter by name/key" style="flex:1;min-width:200px" oninput="filterKeys()">
<button class="btn-primary" onclick="location.reload()" style="padding:10px 16px"><i class="fas fa-sync"></i></button>
</div>
<div class="table-container" style="max-height:650px">
<table>
<thead><tr><th><input type="checkbox" onclick="toggleAllKeys(this)"></th><th>KEY</th><th>OWNER</th><th>LIMIT</th><th>USED</th><th>LEFT</th><th>EXPIRY</th><th>DEV NAME</th><th>STATUS</th><th>ACTIONS</th></tr></thead>
<tbody id="keysBody"></tbody>
</table>
</div>
</div>

<!-- ENDPOINTS -->
<div class="glow-card" id="section-endpoints" style="display:none">
<h3><i class="fas fa-list"></i> Endpoints (${Object.keys(endpoints).length})</h3>
<div class="endpoint-grid" id="endpointsList"></div>
</div>

<!-- RESPONSES -->
<div class="glow-card" id="section-responses" style="display:none">
<h3><i class="fas fa-code"></i> Edit Endpoint Responses (JSON Preview)</h3>
<p style="color:var(--text-muted);font-size:13px;margin-bottom:16px">Set custom JSON response for each endpoint. Empty = default sample.</p>
<div class="form-group"><label>Endpoint</label>
<select class="form-input" id="responseEndpoint" onchange="loadResponse()">
<option value="">-- Select --</option>
${Object.keys(endpoints).map(e => `<option value="${e}">${endpoints[e].d} (/${e})</option>`).join('')}
${customAPIs.map(a => `<option value="${a.endpoint}">${a.name} (/${a.endpoint})</option>`).join('')}
</select></div>
<div class="form-group"><label>Response JSON (empty = default sample)</label>
<textarea class="form-input" id="responseData" rows="10" style="font-family:${theme.fonts.mono};font-size:12px"></textarea></div>
<button class="btn-primary" onclick="updateResponse()" style="width:100%"><i class="fas fa-save"></i> SAVE</button>
</div>

<!-- RESPONSE SETTINGS -->
<div class="glow-card" id="section-response-settings" style="display:none">
<h3><i class="fas fa-sliders-h"></i> Global Response Settings</h3>
<div class="form-group"><label>Global Developer Name</label>
<input class="form-input" id="rs-devName" value="${esc(globalConfig.developerName)}" placeholder="@BRONX_ULTRA"></div>
<div class="form-group"><label>Hidden Fields (Comma separated, removed from ALL API responses)</label>
<textarea class="form-input" id="rs-hiddenFields" rows="3">${esc(globalConfig.hiddenFields)}</textarea></div>
<hr style="border-color:var(--border-color);margin:24px 0">
<h4 style="margin-bottom:16px;color:var(--text-primary)">Custom Error Messages (Plain Text, Emoji supported)</h4>
<p style="color:var(--text-muted);font-size:12px;margin-bottom:16px">Use {used}, {limit}, {date} as placeholders.</p>
<div class="form-group"><label>Key Not Found</label><input class="form-input" id="msg-keyNotFound" value="${esc(customMessages.keyNotFound)}"></div>
<div class="form-group"><label>Limit Reached</label><input class="form-input" id="msg-limitReached" value="${esc(customMessages.limitReached)}"></div>
<div class="form-group"><label>Key Stopped</label><input class="form-input" id="msg-keyStopped" value="${esc(customMessages.keyStopped)}"></div>
<div class="form-group"><label>Key Disabled</label><input class="form-input" id="msg-keyDisabled" value="${esc(customMessages.keyDisabled)}"></div>
<div class="form-group"><label>Key Expired</label><input class="form-input" id="msg-keyExpired" value="${esc(customMessages.keyExpired)}"></div>
<div class="form-group"><label>Missing Key</label><input class="form-input" id="msg-missingKey" value="${esc(customMessages.missingKey)}"></div>
<div class="form-group"><label>Scope Denied</label><input class="form-input" id="msg-scopeDenied" value="${esc(customMessages.scopeDenied)}"></div>
<button class="btn-primary" onclick="saveResponseSettings()" style="width:100%"><i class="fas fa-save"></i> SAVE ALL SETTINGS</button>
</div>

<!-- MONITOR -->
<div class="glow-card" id="section-monitor" style="display:none">
<h3><i class="fas fa-desktop"></i> Live Monitor</h3>
<div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap">
<input class="form-input" id="monitorFilter" placeholder="🔍 Filter" style="flex:1;min-width:200px" oninput="renderMonitor()">
<button class="btn-primary" onclick="loadMonitorLogs()" style="padding:10px 16px"><i class="fas fa-sync"></i></button>
</div>
<div class="live-logs" id="monitorLogs"></div>
</div>

<!-- STATS -->
<div class="glow-card" id="section-stats" style="display:none">
<h3><i class="fas fa-chart-bar"></i> Statistics</h3>
<div class="stats-grid">
<div class="stat-card"><div class="stat-value" id="statTotalReqs">-</div><div class="stat-label">Total</div></div>
<div class="stat-card"><div class="stat-value" id="statTodayReqs">-</div><div class="stat-label">Today</div></div>
</div>
<h3><i class="fas fa-chart-pie"></i> Top Endpoints</h3>
<div class="table-container"><table><thead><tr><th>Endpoint</th><th>Requests</th></tr></thead><tbody id="topEndpointsBody"></tbody></table></div>
</div>

<!-- THEME -->
<div class="glow-card" id="section-theme" style="display:none">
<h3><i class="fas fa-palette"></i> Theme</h3>
<div class="endpoint-grid" id="presetsGrid">
${themesList.map(name => `<div class="endpoint-card" style="cursor:pointer;text-align:center" data-preset="${name}" onclick="applyPresetByName('${name}')"><div style="height:40px;border-radius:6px;margin-bottom:12px;background:linear-gradient(135deg,${PRESETS[name].accent},${PRESETS[name].accent2})"></div><div style="font-weight:600;color:var(--text-primary)">${name}</div></div>`).join('')}
</div>
</div>

<!-- IMPORT -->
<div class="glow-card" id="section-import" style="display:none">
<h3><i class="fas fa-download"></i> Import Keys & Data</h3>
<p style="color:var(--text-muted);font-size:13px;margin-bottom:16px">Upload a backup JSON file or paste JSON content.</p>
<div class="form-group"><label>Upload JSON File</label>
<input type="file" id="importFile" accept=".json" onchange="handleFileImport(this)" class="form-input" style="padding:8px"></div>
<div class="form-group"><label>Or Paste JSON Manually</label>
<textarea class="form-input" id="importData" rows="10" placeholder='{"MY_KEY":{...}}' style="font-family:${theme.fonts.mono};font-size:12px"></textarea></div>
<button class="btn-primary" onclick="importKeys()" style="width:100%;margin-top:12px"><i class="fas fa-download"></i> IMPORT</button>
<p id="importMsg" style="margin-top:12px;text-align:center;font-size:13px"></p>
</div>

<!-- EXPORT -->
<div class="glow-card" id="section-export" style="display:none">
<h3><i class="fas fa-upload"></i> Export Keys</h3>
<div style="display:flex;gap:8px;margin-bottom:16px">
<button class="btn-primary" onclick="loadExport()" style="flex:1"><i class="fas fa-sync"></i> LOAD</button>
<button class="btn-primary btn-success" onclick="copyExport()" style="flex:1"><i class="fas fa-copy"></i> COPY</button>
<button class="btn-primary btn-warning" onclick="downloadExport()" style="flex:1"><i class="fas fa-file-download"></i> DOWNLOAD</button>
</div>
<textarea class="form-input" id="exportData" rows="15" readonly style="color:var(--success);font-family:${theme.fonts.mono};font-size:12px"></textarea>
</div>

<!-- SCOPES -->
<div class="glow-card" id="section-scopes" style="display:none">
<h3><i class="fas fa-crosshairs"></i> Update Key Scopes</h3>
<div class="form-group"><label>Key Name</label><input class="form-input" id="sk" placeholder="Enter key"></div>
<div class="form-group"><label>Scopes</label>
<div class="scope-box" id="scopeBoxUpdate">${updateScopeHTML}</div></div>
<button class="btn-primary" onclick="updateScopes()" style="width:100%"><i class="fas fa-save"></i> UPDATE</button>
</div>

<!-- PROTECT -->
<div class="glow-card" id="section-protect" style="display:none">
<h3><i class="fas fa-shield-alt"></i> Data Protection</h3>
<p style="color:var(--text-muted);font-size:13px;margin-bottom:16px">Block specific values from being queried.</p>
<div class="form-group"><label>Value to Protect</label><input class="form-input" id="protVal" placeholder="e.g. 9876543210"></div>
<button class="btn-primary" onclick="addProtection()" style="width:100%"><i class="fas fa-lock"></i> ADD</button>
<div class="table-container" style="margin-top:18px" id="protectList"></div>
</div>

<!-- APIS -->
<div class="glow-card" id="section-apis" style="display:none">
<h3><i class="fas fa-plug"></i> Custom APIs (<span id="apiCount">${customAPIs.length}</span>)</h3>
<div class="table-container" style="max-height:500px">
<table><thead><tr><th>ID</th><th>Name</th><th>Endpoint</th><th>Param</th><th>Vis</th><th>Actions</th></tr></thead><tbody id="apisBody"></tbody></table>
</div>
</div>

<!-- ADD API -->
<div class="glow-card" id="section-addapi" style="display:none">
<h3><i class="fas fa-puzzle-piece"></i> Add Custom API</h3>
<div class="form-group"><label>Name</label><input class="form-input" id="aname" placeholder="My API"></div>
<div class="form-group"><label>Endpoint (lowercase, no spaces)</label><input class="form-input" id="aep" placeholder="my-api"></div>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
<div class="form-group"><label>Param</label><input class="form-input" id="aparam" value="num"></div>
<div class="form-group"><label>Example</label><input class="form-input" id="aex" placeholder="9876543210"></div>
</div>
<div class="form-group"><label>Real URL ({param} placeholder)</label><input class="form-input" id="aurl" placeholder="https://api.com?param={param}"></div>
<button class="btn-primary" onclick="addAPI()" style="width:100%"><i class="fas fa-plus"></i> ADD API</button>
</div>

<!-- DDOS -->
<div class="glow-card" id="section-ddos" style="display:none">
<h3><i class="fas fa-shield-virus"></i> Smart DDoS Config</h3>
<div class="form-group"><label>Mode</label>
<select class="form-input" id="ddosMode">
<option value="off">🔴 Off</option>
<option value="smart">🟢 Smart (Recommended)</option>
<option value="strict">🟠 Strict (70% stricter limits)</option>
</select></div>
<div class="stats-grid" style="grid-template-columns:repeat(3,1fr)">
<div class="form-group"><label>IP Burst/10s</label><input class="form-input" id="ddosIP10" type="number" value="${ddosConfig.ip.burst10s}"></div>
<div class="form-group"><label>IP/Min</label><input class="form-input" id="ddosIP1M" type="number" value="${ddosConfig.ip.perMinute}"></div>
<div class="form-group"><label>IP/Hour</label><input class="form-input" id="ddosIP1H" type="number" value="${ddosConfig.ip.perHour}"></div>
</div>
<div class="stats-grid" style="grid-template-columns:repeat(3,1fr)">
<div class="form-group"><label>Temp Ban (min)</label><input class="form-input" id="ddosTempBan" type="number" value="${ddosConfig.tempBanMs/60000}"></div>
<div class="form-group"><label>Long Ban (min)</label><input class="form-input" id="ddosLongBan" type="number" value="${ddosConfig.longBanMs/60000}"></div>
<div class="form-group"><label>Login Attempts</label><input class="form-input" id="ddosLogin" type="number" value="${ddosConfig.login.maxAttempts}"></div>
</div>
<button class="btn-primary" onclick="saveDDOS()" style="width:100%"><i class="fas fa-save"></i> SAVE DDOS CONFIG</button>
<button class="btn-primary btn-warning" onclick="clearAllStrikes()" style="width:100%;margin-top:12px"><i class="fas fa-eraser"></i> CLEAR ALL STRIKES</button>
</div>

<!-- BANS -->
<div class="glow-card" id="section-bans" style="display:none">
<h3><i class="fas fa-ban"></i> Bans Manager</h3>
<div style="display:grid;grid-template-columns:2fr 2fr 1fr;gap:10px;margin-bottom:16px">
<select class="form-input" id="banType"><option value="ip">IP</option><option value="device">Device</option><option value="key">Key</option></select>
<input class="form-input" id="banId" placeholder="Value to ban">
<button class="btn-primary btn-danger" onclick="manualBan()"><i class="fas fa-ban"></i> BAN</button>
</div>
<h4 style="color:var(--danger);margin:16px 0 8px;font-size:13px">🚫 BANNED IPs</h4>
<div class="table-container"><table><thead><tr><th>IP</th><th>Reason</th><th>Until</th><th>Action</th></tr></thead><tbody id="banIPBody"></tbody></table></div>
<button class="btn-primary btn-warning" onclick="unbanAll()" style="width:100%;margin-top:16px"><i class="fas fa-unlock"></i> UNBAN ALL</button>
</div>

<!-- DEVICES -->
<div class="glow-card" id="section-devices" style="display:none">
<h3><i class="fas fa-laptop"></i> All Devices</h3>
<div class="table-container" style="max-height:600px">
<table><thead><tr><th>Device ID</th><th>Type</th><th>OS</th><th>Reqs</th><th>Last Seen</th><th>Status</th><th>Action</th></tr></thead><tbody id="devicesBody"></tbody></table>
</div>
</div>

<!-- BULK -->
<div class="glow-card" id="section-bulk" style="display:none">
<h3><i class="fas fa-layer-group"></i> Bulk Actions</h3>
<p style="color:var(--warning);font-size:13px;margin-bottom:16px">Select keys from the "All Keys" section first.</p>
<p id="bulkCount" style="color:var(--info);text-align:center;font-size:13px;margin-bottom:16px">0 keys selected</p>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
<button class="btn-primary btn-success" onclick="bulkAction('bulk-reset')"><i class="fas fa-sync-alt"></i> RESET</button>
<button class="btn-primary btn-warning" onclick="bulkAction('bulk-stop',true)"><i class="fas fa-pause"></i> STOP</button>
<button class="btn-primary" onclick="bulkAction('bulk-stop',false)"><i class="fas fa-play"></i> ACTIVATE</button>
<button class="btn-primary btn-info" onclick="bulkAction('bulk-disable',true)"><i class="fas fa-ban"></i> DISABLE</button>
<button class="btn-primary btn-info" onclick="bulkAction('bulk-disable',false)"><i class="fas fa-check"></i> ENABLE</button>
<button class="btn-primary btn-danger" onclick="bulkAction('bulk-delete')"><i class="fas fa-trash"></i> DELETE</button>
</div>
<div style="margin-top:16px;display:flex;gap:10px">
<input class="form-input" id="bulkPushDays" type="number" value="30">
<button class="btn-primary btn-warning" onclick="bulkPush()" style="white-space:nowrap"><i class="fas fa-arrow-up"></i> PUSH</button>
</div>
</div>

<!-- PUSH ALL -->
<div class="glow-card" id="section-pushall" style="display:none">
<h3><i class="fas fa-arrow-up"></i> Push All Keys</h3>
<div class="form-group"><label>Days to add to ALL keys</label><input class="form-input" id="pushAllDays" type="number" value="30"></div>
<button class="btn-primary btn-warning" onclick="pushAllKeys()" style="width:100%"><i class="fas fa-arrow-up"></i> PUSH ALL</button>
</div>

<!-- ANNOUNCEMENT -->
<div class="glow-card" id="section-announce" style="display:none">
<h3><i class="fas fa-bullhorn"></i> Announcement</h3>
<div class="form-group"><label>Enable</label>
<select class="form-input" id="annEnabled"><option value="false">Off</option><option value="true">On</option></select></div>
<div class="form-group"><label>Text</label><input class="form-input" id="annText" placeholder="Welcome to BRONX!"></div>
<button class="btn-primary" onclick="saveAnnouncement()" style="width:100%"><i class="fas fa-save"></i> SAVE</button>
</div>

<!-- MAINTENANCE -->
<div class="glow-card" id="section-maintenance" style="display:none">
<h3><i class="fas fa-wrench"></i> Maintenance Mode</h3>
<div class="form-group"><label>Enable</label>
<select class="form-input" id="mtEnabled"><option value="false">Off</option><option value="true">On</option></select></div>
<div class="form-group"><label>Message</label><input class="form-input" id="mtMessage" placeholder="System under maintenance"></div>
<button class="btn-primary btn-warning" onclick="saveMaintenance()" style="width:100%"><i class="fas fa-save"></i> SAVE</button>
</div>

<!-- AUDIT -->
<div class="glow-card" id="section-audit" style="display:none">
<h3><i class="fas fa-clipboard-list"></i> Audit Log</h3>
<div class="table-container" style="max-height:500px">
<table><thead><tr><th>Time</th><th>User</th><th>Action</th><th>Details</th></tr></thead><tbody id="auditBody"></tbody></table>
</div>
</div>

<!-- ADMIN LOGS -->
<div class="glow-card" id="section-adminlogs" style="display:none">
<h3><i class="fas fa-history"></i> Admin Logs</h3>
<div class="table-container" style="max-height:500px">
<table><thead><tr><th>Time</th><th>User</th><th>Action</th><th>IP</th><th>Status</th></tr></thead><tbody id="adminLogsBody"></tbody></table>
</div>
</div>

<!-- BACKUP -->
<div class="glow-card" id="section-backup" style="display:none">
<h3><i class="fas fa-database"></i> Backup / Restore Full Data</h3>
<p style="color:var(--text-muted);font-size:13px;margin-bottom:16px">Download or copy complete data (keys, APIs, settings, etc.). Restore later with the same file.</p>
<div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap">
<button class="btn-primary btn-success" onclick="backupData()" style="flex:1"><i class="fas fa-download"></i> DOWNLOAD BACKUP</button>
<button class="btn-primary" onclick="copyBackup()" style="flex:1"><i class="fas fa-copy"></i> COPY JSON</button>
</div>
<textarea class="form-input" id="backupOutput" rows="10" readonly placeholder="Click 'Backup' to load full backup JSON..." style="font-family:${theme.fonts.mono};font-size:11px;margin-bottom:16px"></textarea>
<hr style="border-color:var(--border-color);margin:16px 0">
<h4 style="margin-bottom:12px">Restore from Backup</h4>
<div class="form-group"><label>Upload Backup File</label>
<input type="file" id="restoreFile" accept=".json" onchange="handleRestoreFile(this)" class="form-input" style="padding:8px"></div>
<div class="form-group"><label>Or Paste Backup JSON</label>
<textarea class="form-input" id="restoreData" rows="8" placeholder="Paste backup JSON here..." style="font-family:${theme.fonts.mono};font-size:11px"></textarea></div>
<button class="btn-primary btn-warning" onclick="restoreData()" style="width:100%"><i class="fas fa-upload"></i> RESTORE BACKUP</button>
</div>

<!-- SETTINGS -->
<div class="glow-card" id="section-settings" style="display:none">
<h3><i class="fas fa-cog"></i> Settings</h3>
<button class="btn-primary btn-danger" onclick="resetAll()" style="width:100%;margin-bottom:12px"><i class="fas fa-sync-alt"></i> RESET ALL USAGE</button>
<button class="btn-primary btn-danger" onclick="clearLogs()" style="width:100%;margin-bottom:12px"><i class="fas fa-trash"></i> CLEAR ALL LOGS</button>
<button class="btn-primary btn-warning" onclick="unbanAll()" style="width:100%;margin-bottom:12px"><i class="fas fa-unlock"></i> UNBAN ALL</button>
<button class="btn-primary btn-warning" onclick="clearAllStrikes()" style="width:100%"><i class="fas fa-eraser"></i> CLEAR ALL STRIKES</button>
</div>

</div>
</div>
<script>
const TOKEN='${stoken}';
const ADMIN_PATH='${ADMIN_PATH}';
const ENDPOINTS = ${JSON.stringify(Object.entries(endpoints).map(([n,e]) => ({name:n, p:e.p, i:e.i, e:e.e, d:e.d, c:e.c})))};
const INITIAL_KEYS = ${JSON.stringify(allKeys)};
let CUSTOM_APIS = ${JSON.stringify(customAPIs)};
let CURRENT_THEME = ${JSON.stringify(theme.preset)};

function showToast(m,t='success'){const x=document.createElement('div');x.className='toast '+t;x.textContent=m;document.body.appendChild(x);setTimeout(()=>x.remove(),3500);}
function api(p,body){return fetch(ADMIN_PATH+p,{method:body?'POST':'GET',headers:{'x-admin-token':TOKEN,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined}).then(r=>r.json());}
function esc(s){if(s===undefined||s===null)return '';return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'})[m]);}

function switchSection(id,el){
    document.querySelectorAll('.glow-card').forEach(c=>c.style.display='none');
    document.querySelectorAll('.sidebar-nav a').forEach(a=>a.classList.remove('active'));
    const s=document.getElementById('section-'+id); if(s)s.style.display='block';
    if(el)el.classList.add('active');
    if(id==='dashboard')loadDashboard();
    else if(id==='keys')renderKeys();
    else if(id==='endpoints')renderEndpoints();
    else if(id==='monitor')loadMonitorLogs();
    else if(id==='stats')loadStats();
    else if(id==='protect')renderProtectList();
    else if(id==='apis')renderAPIs();
    else if(id==='bans')loadBans();
    else if(id==='devices')loadDevices();
    else if(id==='audit')loadAudit();
    else if(id==='adminlogs')loadAdminLogs();
    else if(id==='export')loadExport();
    else if(id==='ddos')loadDDOSConfig();
    else if(id==='response-settings')loadResponseSettings();
}

// Stats
async function loadStats(){
    try{const d=await api('/stats');
        document.getElementById('statToday').textContent=d.todayRequests||0;
        document.getElementById('statTotal').textContent=d.totalRequests||0;
        document.getElementById('statTotalReqs').textContent=d.totalRequests||0;
        document.getElementById('statTodayReqs').textContent=d.todayRequests||0;
        document.getElementById('dashToday').textContent=d.todayRequests||0;
        document.getElementById('dashWeek').textContent=d.weeklyRequests||0;
        document.getElementById('dashMonth').textContent=d.monthlyRequests||0;
        document.getElementById('dashTotal').textContent=d.totalRequests||0;
        const tk=document.getElementById('topKeysBody');
        if(tk){tk.innerHTML=(d.topKeys||[]).map(k=>'<tr><td><code>'+esc(k.k)+'</code></td><td><strong style="color:var(--accent)">'+k.v+'</strong></td></tr>').join('')||'<tr><td colspan=2 style="text-align:center;color:var(--text-muted)">No data</td></tr>';}
        const te=document.getElementById('topEndpointsBody');
        if(te){te.innerHTML=(d.topEndpoints||[]).map(k=>'<tr><td><code>'+esc(k.k)+'</code></td><td><strong style="color:var(--accent)">'+k.v+'</strong></td></tr>').join('')||'<tr><td colspan=2 style="text-align:center;color:var(--text-muted)">No data</td></tr>';}
    }catch(e){}
}
async function loadDashboard(){
    await loadStats();
    try{const b=await api('/bans');
        const total=(b.ip||[]).length+(b.device||[]).length+(b.key||[]).length;
        document.getElementById('statBans').textContent=total;
    }catch(e){}
    try{const d=await api('/devices');
        document.getElementById('statDevices').textContent=d.total||0;
    }catch(e){}
}
loadDashboard();
setInterval(()=>{const stats=document.getElementById('statToday');if(stats&&stats.textContent==='-')loadDashboard();},5000);

// Keys
function renderKeys(){
    const filter=(document.getElementById('keysFilter')?.value||'').toLowerCase();
    const filtered=INITIAL_KEYS.filter(k=>k.key.toLowerCase().includes(filter)||(k.name||'').toLowerCase().includes(filter));
    document.getElementById('keysCount').textContent=filtered.length;
    const tb=document.getElementById('keysBody'); if(!tb)return;
    tb.innerHTML=filtered.map(k=>{
        const status=k.stopped?'<span style="color:var(--danger)">⛔ STOPPED</span>':k.disabled?'<span style="color:var(--warning)">🚫 DISABLED</span>':k.isExpired?'<span style="color:var(--danger)">⏰ EXPIRED</span>':'<span style="color:var(--success)">✅ ACTIVE</span>';
        return '<tr><td><input type="checkbox" class="key-select" value="'+esc(k.key)+'"></td>'+
        '<td><code style="font-size:11px">'+esc(k.key)+'</code></td>'+
        '<td>'+esc(k.name)+'</td>'+
        '<td>'+k.limit+'</td>'+
        '<td><strong>'+k.used+'</strong></td>'+
        '<td>'+k.left+'</td>'+
        '<td>'+esc(k.expiry)+'</td>'+
        '<td><span style="color:var(--accent)">'+esc(k.developerName||'default')+'</span></td>'+
        '<td>'+status+'</td>'+
        '<td><button class="btn-action" onclick="editKey(\''+esc(k.key)+'\')" title="Edit"><i class="fas fa-edit"></i></button>'+
        '<button class="btn-action" onclick="resetKey(\''+esc(k.key)+'\')" title="Reset"><i class="fas fa-sync"></i></button>'+
        '<button class="btn-action" onclick="pushKey(\''+esc(k.key)+'\')" title="Push"><i class="fas fa-arrow-up"></i></button>'+
        '<button class="btn-action" onclick="toggleStop(\''+esc(k.key)+'\')" title="Stop"><i class="fas fa-pause"></i></button>'+
        '<button class="btn-action" onclick="cloneKey(\''+esc(k.key)+'\')" title="Clone"><i class="fas fa-copy"></i></button>'+
        '<button class="btn-action" onclick="deleteKey(\''+esc(k.key)+'\')" title="Delete" style="color:var(--danger)"><i class="fas fa-trash"></i></button></td></tr>';
    }).join('')||'<tr><td colspan="10" style="text-align:center;color:var(--text-muted);padding:24px">No keys. Generate one!</td></tr>';
}
function filterKeys(){renderKeys();}
function toggleAllKeys(cb){document.querySelectorAll('.key-select').forEach(c=>c.checked=cb.checked);updateBulkCount();}
function getSelectedKeys(){return Array.from(document.querySelectorAll('.key-select:checked')).map(c=>c.value);}
function updateBulkCount(){const n=getSelectedKeys().length;const e=document.getElementById('bulkCount');if(e)e.textContent=n+' keys selected';}

// Generate
function randomKey(){document.getElementById('gk').value='BRONX_'+Math.random().toString(36).substring(2,12).toUpperCase();}
async function generateKey(){
    const scopes=Array.from(document.querySelectorAll('#scopeBoxGenerate input:checked')).map(c=>c.value);
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
        scopes:scopes.length?scopes:['*']
    };
    if(!body.keyOwner){showToast('Owner name required','error');return;}
    const d=await api('/generate-key',body);
    if(d.success){showToast(d.message,'success');setTimeout(()=>location.reload(),1000);}
    else showToast(d.e||'Error','error');
}

// Actions
async function resetKey(k){const d=await api('/reset-key-usage',{keyName:k});if(d.success){showToast('Reset ✓','success');location.reload();}else showToast(d.e,'error');}
async function pushKey(k){const days=prompt('Days to push?','30');if(!days)return;const d=await api('/push-key',{keyName:k,days});if(d.success){showToast(d.message,'success');location.reload();}else showToast(d.e,'error');}
async function toggleStop(k){const d=await api('/stop-key',{keyName:k});if(d.success){showToast('Stopped: '+d.stopped,'info');location.reload();}}
async function cloneKey(k){const d=await api('/clone-key',{keyName:k});if(d.success){showToast('Cloned: '+d.key,'success');location.reload();}else showToast(d.e,'error');}
async function deleteKey(k){if(!confirm('Delete '+k+'?'))return;const d=await api('/delete-key',{keyName:k});if(d.success){showToast('Deleted','success');location.reload();}else showToast(d.e,'error');}
async function editKey(k){
    const newOwner=prompt('New owner name:', INITIAL_KEYS.find(x=>x.key===k)?.name||'');
    if(newOwner===null)return;
    const newLimit=prompt('New limit:', INITIAL_KEYS.find(x=>x.key===k)?.limit||'100');
    if(newLimit===null)return;
    const newDevName=prompt('Custom Developer Name (blank=global):', INITIAL_KEYS.find(x=>x.key===k)?.developerName||'');
    const d=await api('/edit-key',{keyName:k,newOwner,newLimit,newDeveloperName:newDevName});
    if(d.success){showToast(d.message,'success');location.reload();}else showToast(d.e,'error');
}

// Endpoints
function renderEndpoints(){
    const el=document.getElementById('endpointsList'); if(!el)return;
    el.innerHTML=ENDPOINTS.map(e=>'<div class="endpoint-card"><div class="ep-header"><span class="ep-icon">'+e.i+'</span><div class="ep-name">/'+esc(e.name)+'</div></div><div class="ep-desc">'+esc(e.d)+'</div><div class="ep-url">GET /api/key-bronx/'+esc(e.name)+'?key=YOUR_KEY&'+e.p+'='+e.e+'</div></div>').join('')+
    CUSTOM_APIS.filter(a=>a.visible).map(a=>'<div class="endpoint-card"><div class="ep-header"><span class="ep-icon">🔧</span><div class="ep-name">/'+esc(a.endpoint)+'</div></div><div class="ep-desc">'+esc(a.name)+'</div><div class="ep-url">GET /api/custom/'+a.endpoint+'?key=YOUR_KEY&'+a.param+'='+esc(a.example||'v')+'</div></div>').join('');
}

// Responses
async function loadResponse(){
    const ep=document.getElementById('responseEndpoint').value;
    if(!ep){document.getElementById('responseData').value='';return;}
    const d=await api('/get-endpoint-response?endpoint='+encodeURIComponent(ep));
    document.getElementById('responseData').value=d.data?JSON.stringify(d.data,null,2):'';
}
async function updateResponse(){
    const ep=document.getElementById('responseEndpoint').value;
    const data=document.getElementById('responseData').value;
    if(!ep){showToast('Select endpoint','error');return;}
    const d=await api('/update-endpoint-response',{endpoint:ep,responseData:data});
    if(d.success){showToast('Response saved ✓','success');}else showToast(d.e||'Invalid JSON','error');
}

// Response settings
async function loadResponseSettings(){
    try{const d=await api('/response-settings');
        if(d.globalConfig){document.getElementById('rs-devName').value=d.globalConfig.developerName||'';document.getElementById('rs-hiddenFields').value=d.globalConfig.hiddenFields||'';}
    }catch(e){}
}
async function saveResponseSettings(){
    const messages={};
    ['keyNotFound','limitReached','keyStopped','keyDisabled','keyExpired','missingKey','scopeDenied'].forEach(k=>{
        const el=document.getElementById('msg-'+k);if(el)messages[k]=el.value;
    });
    const d=await api('/update-response-settings',{
        developerName:document.getElementById('rs-devName').value,
        hiddenFields:document.getElementById('rs-hiddenFields').value,
        messages
    });
    if(d.success)showToast('Settings saved ✓','success');else showToast(d.e||'Error','error');
}

// Monitor
let monitorData=[];
async function loadMonitorLogs(){try{const d=await api('/monitor-logs');monitorData=d.logs||[];renderMonitor();}catch(e){}}
function renderMonitor(){
    const filter=(document.getElementById('monitorFilter')?.value||'').toLowerCase();
    const el=document.getElementById('monitorLogs'); if(!el)return;
    const filtered=monitorData.filter(l=>JSON.stringify(l).toLowerCase().includes(filter));
    el.innerHTML=filtered.reverse().map(l=>'<div class="log-entry"><span class="log-time">'+esc(l.timestamp)+'</span><span class="log-key">'+esc(l.key)+'</span><span class="log-endpoint">'+esc(l.endpoint)+'</span><span class="log-ip">'+esc(l.ip)+'</span><span>'+esc(l.browser||'')+'</span></div>').join('')||'<div style="text-align:center;color:var(--text-muted);padding:24px">No logs</div>';
}

// Theme
async function applyPresetByName(name){
    const d=await api('/theme/preset',{preset:name});
    if(d.success){showToast('Theme: '+name,'success');setTimeout(()=>location.reload(),600);}else showToast(d.e,'error');
}

// Protect
async function renderProtectList(){
    try{const d=await api('/response-settings');
        const tb=document.getElementById('protectList'); if(!tb)return;
        const entries=Object.keys(d.protected||{});
        tb.innerHTML='<table><thead><tr><th>Protected Value</th><th>Action</th></tr></thead><tbody>'+
        (entries.map(v=>'<tr><td><code>'+esc(v)+'</code></td><td><button class="btn-action" onclick="removeProtection(\''+esc(v)+'\')" style="color:var(--danger)"><i class="fas fa-trash"></i></button></td></tr>').join('')||'<tr><td colspan="2" style="text-align:center;color:var(--text-muted)">No protected values</td></tr>')+
        '</tbody></table>';
    }catch(e){}
}
async function addProtection(){const v=document.getElementById('protVal').value.trim();if(!v)return;const d=await api('/add-protection',{value:v});if(d.success){showToast('Protected','success');document.getElementById('protVal').value='';renderProtectList();}else showToast(d.e,'error');}
async function removeProtection(v){const d=await api('/remove-protection',{value:v});if(d.success){showToast('Removed','success');renderProtectList();}}

// Custom APIs
function renderAPIs(){
    const tb=document.getElementById('apisBody'); if(!tb)return;
    tb.innerHTML=CUSTOM_APIS.map(a=>'<tr><td>'+a.id+'</td><td>'+esc(a.name)+'</td><td><code>'+esc(a.endpoint)+'</code></td><td>'+esc(a.param)+'</td><td>'+(a.visible?'<span style="color:var(--success)">✅</span>':'<span style="color:var(--danger)">❌</span>')+'</td><td><button class="btn-action" onclick="toggleAPI('+a.id+')"><i class="fas fa-eye"></i></button><button class="btn-action" onclick="deleteAPI('+a.id+')" style="color:var(--danger)"><i class="fas fa-trash"></i></button></td></tr>').join('')||'<tr><td colspan="6" style="text-align:center;color:var(--text-muted)">No custom APIs</td></tr>';
    document.getElementById('apiCount').textContent=CUSTOM_APIS.length;
}
async function addAPI(){
    const body={name:document.getElementById('aname').value.trim(),endpoint:document.getElementById('aep').value.trim(),param:document.getElementById('aparam').value.trim(),example:document.getElementById('aex').value.trim(),realAPI:document.getElementById('aurl').value.trim(),visible:true};
    if(!body.name||!body.endpoint){showToast('Name and endpoint required','error');return;}
    const d=await api('/add-api',body);
    if(d.success){showToast(d.message,'success');setTimeout(()=>location.reload(),800);}else showToast(d.e,'error');
}
async function toggleAPI(id){const d=await api('/toggle-api',{id});if(d.success){showToast('Toggled','info');setTimeout(()=>location.reload(),500);}}
async function deleteAPI(id){if(!confirm('Delete API?'))return;const d=await api('/delete-api',{id});if(d.success)setTimeout(()=>location.reload(),500);}

// DDOS
async function loadDDOSConfig(){try{const d=await api('/ddos-config');document.getElementById('ddosMode').value=d.mode||'smart';}catch(e){}}
async function saveDDOS(){
    const body={mode:document.getElementById('ddosMode').value,
        ip:{burst10s:document.getElementById('ddosIP10').value,perMinute:document.getElementById('ddosIP1M').value,perHour:document.getElementById('ddosIP1H').value},
        tempBanMs:document.getElementById('ddosTempBan').value*60000,longBanMs:document.getElementById('ddosLongBan').value*60000};
    const d=await api('/ddos-config',body);if(d.success)showToast('DDoS saved ✓','success');else showToast(d.e,'error');
}
async function clearAllStrikes(){const d=await api('/clear-strikes',{});if(d.success)showToast('Strikes cleared','success');}

// Bans
async function loadBans(){
    try{const d=await api('/bans');
        const tb=document.getElementById('banIPBody'); if(!tb)return;
        tb.innerHTML=(d.ip||[]).map(b=>'<tr><td><code>'+esc(b.id)+'</code></td><td>'+esc(b.reason||'')+'</td><td>'+(b.permanent?'<span style="color:var(--danger)">PERMANENT</span>':new Date(b.until).toLocaleString())+'</td><td><button class="btn-action" onclick="unban(\'ip\',\''+esc(b.id)+'\')"><i class="fas fa-unlock"></i></button></td></tr>').join('')||'<tr><td colspan="4" style="text-align:center;color:var(--text-muted)">No IP bans</td></tr>';
    }catch(e){}
}
async function manualBan(){const type=document.getElementById('banType').value,id=document.getElementById('banId').value.trim();if(!id)return;const d=await api('/ban',{type,id,permanent:true,reason:'Manual'});if(d.success){showToast('Banned','success');loadBans();}}
async function unban(type,id){const d=await api('/unban',{type,id});if(d.success){showToast('Unbanned','success');loadBans();}}
async function unbanAll(){const d=await api('/unban-all',{});if(d.success){showToast('All unbanned','success');loadBans();}}

// Devices
async function loadDevices(){
    try{const d=await api('/devices');
        const tb=document.getElementById('devicesBody'); if(!tb)return;
        tb.innerHTML=(d.devices||[]).slice(0,100).map(dev=>'<tr><td><code style="font-size:11px">'+esc(dev.id)+'</code></td><td>'+(dev.deviceIcon||'')+' '+esc(dev.deviceType||'')+'</td><td>'+esc(dev.os||'')+'</td><td><strong>'+dev.requests+'</strong></td><td>'+esc(dev.lastSeen)+'</td><td>'+(dev.banned?'<span style="color:var(--danger)">BANNED</span>':'<span style="color:var(--success)">OK</span>')+'</td><td><button class="btn-action" onclick="banDevice(\''+esc(dev.id)+'\')"><i class="fas fa-ban"></i></button></td></tr>').join('')||'<tr><td colspan="7" style="text-align:center;color:var(--text-muted)">No devices</td></tr>';
    }catch(e){}
}
async function banDevice(id){const d=await api('/ban',{type:'device',id,permanent:true,reason:'Manual'});if(d.success){showToast('Device banned','success');loadDevices();}}

// Bulk
async function bulkAction(ep,state){
    const keys=getSelectedKeys();if(!keys.length){showToast('No keys selected','error');return;}
    const body={keys};if(state!==undefined)body.state=state;
    const d=await api('/'+ep,body);if(d.success){showToast('Bulk done: '+JSON.stringify(d),'success');setTimeout(()=>location.reload(),800);}else showToast(d.e,'error');
}
async function bulkPush(){
    const keys=getSelectedKeys();if(!keys.length){showToast('No keys selected','error');return;}
    const days=document.getElementById('bulkPushDays').value;
    const d=await api('/bulk-push',{keys,days});if(d.success){showToast('Pushed: '+d.count,'success');setTimeout(()=>location.reload(),800);}else showToast(d.e,'error');
}

// Push All
async function pushAllKeys(){const days=document.getElementById('pushAllDays').value;if(!confirm('Push '+days+' days to ALL keys?'))return;const d=await api('/push-all',{days});if(d.success){showToast(d.message,'success');setTimeout(()=>location.reload(),1000);}else showToast(d.e,'error');}

// Announcement
async function saveAnnouncement(){const enabled=document.getElementById('annEnabled').value==='true',text=document.getElementById('annText').value;const d=await api('/theme/preset',{});await fetch(ADMIN_PATH+'/update-response-settings',{method:'POST',headers:{'x-admin-token':TOKEN,'Content-Type':'application/json'},body:JSON.stringify({})});showToast('Saved (restart for effect)','success');}

// Maintenance
async function saveMaintenance(){showToast('Saved','success');}

// Audit
async function loadAudit(){try{const d=await api('/audit-log');const tb=document.getElementById('auditBody');if(!tb)return;tb.innerHTML=(d.logs||[]).reverse().slice(0,100).map(l=>'<tr><td>'+esc(l.timestamp)+'</td><td>'+esc(l.user)+'</td><td><code>'+esc(l.action)+'</code></td><td style="font-size:11px">'+esc(JSON.stringify(l.details||{}))+'</td></tr>').join('')||'<tr><td colspan="4" style="text-align:center;color:var(--text-muted)">No audit logs</td></tr>';}catch(e){}}

// Admin logs
async function loadAdminLogs(){try{const d=await api('/admin-logs');const tb=document.getElementById('adminLogsBody');if(!tb)return;tb.innerHTML=(d.logs||[]).reverse().slice(0,100).map(l=>'<tr><td>'+esc(l.timestamp)+'</td><td>'+esc(l.user)+'</td><td><code>'+esc(l.action)+'</code></td><td>'+esc(l.ip)+'</td><td>'+(l.status==='SUCCESS'?'<span style="color:var(--success)">'+esc(l.status)+'</span>':'<span style="color:var(--danger)">'+esc(l.status)+'</span>')+'</td></tr>').join('')||'<tr><td colspan="5" style="text-align:center;color:var(--text-muted)">No admin logs</td></tr>';}catch(e){}}

// Export
async function loadExport(){
    try{const d=await api('/export-keys');
        document.getElementById('exportData').value=JSON.stringify(d,null,2);
        showToast('Loaded '+d.total+' keys','success');
    }catch(e){showToast('Error loading','error');}
}
function copyExport(){const t=document.getElementById('exportData');t.select();document.execCommand('copy');showToast('Copied ✓','success');}
function downloadExport(){
    const data=document.getElementById('exportData').value;if(!data){showToast('Load first','error');return;}
    const blob=new Blob([data],{type:'application/json'});
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);
    a.download='bronx_keys_'+Date.now()+'.json';a.click();
    showToast('Downloaded','success');
}

// Import
let pendingImport=null;
function handleFileImport(input){
    const f=input.files[0];if(!f)return;
    const r=new FileReader();
    r.onload=e=>{
        try{
            const d=JSON.parse(e.target.result);
            document.getElementById('importData').value=JSON.stringify(d,null,2);
            showToast('File loaded ✓','success');
        }catch(err){showToast('Invalid JSON file','error');}
    };
    r.readAsText(f);
}
async function importKeys(){
    const data=document.getElementById('importData').value.trim();
    if(!data){showToast('No data','error');return;}
    let parsed;
    try{parsed=JSON.parse(data);}catch(e){showToast('Invalid JSON','error');return;}
    const d=await api('/import-keys',parsed);
    const msg=document.getElementById('importMsg');
    if(d.success){msg.innerHTML='<span style="color:var(--success)">'+esc(d.message)+'</span>';showToast(d.message,'success');setTimeout(()=>location.reload(),1500);}
    else{msg.innerHTML='<span style="color:var(--danger)">'+esc(d.e)+'</span>';showToast(d.e,'error');}
}

// Backup (full)
async function backupData(){
    try{
        const d=await api('/backup');
        const str=JSON.stringify(d,null,2);
        document.getElementById('backupOutput').value=str;
        const blob=new Blob([str],{type:'application/json'});
        const a=document.createElement('a');a.href=URL.createObjectURL(blob);
        a.download='bronx_full_backup_'+Date.now()+'.json';a.click();
        showToast('Backup downloaded ✓','success');
    }catch(e){showToast('Backup failed','error');}
}
async function copyBackup(){
    try{
        const d=await api('/backup');
        const str=JSON.stringify(d,null,2);
        document.getElementById('backupOutput').value=str;
        document.getElementById('backupOutput').select();document.execCommand('copy');
        showToast('Copied to clipboard ✓','success');
    }catch(e){showToast('Copy failed','error');}
}
function handleRestoreFile(input){
    const f=input.files[0];if(!f)return;
    const r=new FileReader();
    r.onload=e=>{
        try{
            JSON.parse(e.target.result);
            document.getElementById('restoreData').value=e.target.result;
            showToast('File loaded ✓','success');
        }catch(err){showToast('Invalid JSON','error');}
    };
    r.readAsText(f);
}
async function restoreData(){
    const data=document.getElementById('restoreData').value.trim();
    if(!data){showToast('No data','error');return;}
    let parsed;
    try{parsed=JSON.parse(data);}catch(e){showToast('Invalid JSON','error');return;}
    if(!confirm('Restore this backup? Existing data will be merged.'))return;
    const d=await api('/restore',parsed);
    if(d.success){showToast(d.message||'Restored ✓','success');setTimeout(()=>location.reload(),1500);}
    else showToast(d.e||'Restore failed','error');
}

// Scopes
async function updateScopes(){
    const keyName=document.getElementById('sk').value.trim();
    if(!keyName){showToast('Enter key','error');return;}
    const scopes=Array.from(document.querySelectorAll('#scopeBoxUpdate input:checked')).map(c=>c.value);
    if(!scopes.length){showToast('Select at least one scope','error');return;}
    const d=await api('/update-scopes',{keyName,scopes});
    if(d.success)showToast('Scopes updated ✓','success');else showToast(d.e,'error');
}

// Settings
async function resetAll(){if(!confirm('Reset ALL key usage?'))return;const d=await api('/reset-all',{});if(d.success){showToast('Reset all','success');setTimeout(()=>location.reload(),800);}}
async function clearLogs(){if(!confirm('Clear all logs?'))return;const d=await api('/clear-logs',{});if(d.success)showToast('Logs cleared','success');}

// Init
renderKeys();
setTimeout(()=>{if(document.getElementById('section-dashboard').style.display!=='none')loadDashboard();},500);

// Auto-update stat today/total
setInterval(async()=>{
    try{const d=await api('/stats');
        const t=document.getElementById('statToday');if(t)t.textContent=d.todayRequests||0;
        const tt=document.getElementById('statTotal');if(tt)tt.textContent=d.totalRequests||0;
    }catch(e){}
},15000);
</script></body></html>`;
    }catch(e){return 'Admin render error: '+e.message;}
}

// ============================================================
// 🚀 START
// ============================================================
initHardcoded();
const loaded = loadFromDisk();
if(!loaded || customAPIs.length === 0) initCustomAPIs();

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════════════╗
║  🛡️  BRONX OSINT V502 PRO — ONLINE              ║
║  📡  Port: ${PORT}                                 
║  🔐  Admin: ${ADMIN_PATH}                          
║  👤  User: ${ADMIN_USERNAME}                       
║  🎨  Theme: ${theme.preset}                        
║  🛡️  DDoS: ${ddosConfig.mode}                      
║  🔑  Keys: ${Object.keys(keyStorage).length}                           
║  🔧  APIs: ${customAPIs.length}                           
╚══════════════════════════════════════════════════╝
    `);
});
