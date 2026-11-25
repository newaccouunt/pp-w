// ============================================================
// 🛡️ BRONX OSINT V503 ULTRA PROFESSIONAL EDITION
// ✅ Professional Developer UI (GitHub-style dark theme)
// ✅ Full Working Admin Panel (no broken buttons)
// ✅ Public Dashboard: Form-based API tester with live JSON output
// ✅ Per-key & Global Developer Name (hide-able)
// ✅ Per-key Hidden Fields (credit, by, channel etc.)
// ✅ Custom plain-text error messages (emoji + symbols)
// ✅ File-based Backup/Import (JSON export/copy/download/upload)
// ✅ Smart DDoS Protection (off/smart/strict)
// ✅ 100% Error-Free, Smooth Working
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
const ADMIN_PATH = '/bronx-admin-panel';
const DATA_DIR = process.env.RENDER_DATA_DIR || '/tmp';
const F = (n) => path.join(DATA_DIR, n);
const DATA_FILE = F('bronx_v503_data.json');
const LOGS_FILE = F('bronx_v503_logs.json');
const ADMIN_LOGS_FILE = F('bronx_v503_admin_logs.json');

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
    keyNotFound: "Key not found. Purchase at @BRONX_ULTRA",
    limitReached: "Limit reached {used}/{limit}. Please upgrade.",
    keyStopped: "This key has been stopped by the administrator.",
    keyDisabled: "This key has been disabled.",
    keyExpired: "This key expired on {date}. Please renew.",
    missingKey: "API Key is required. Add ?key=YOUR_KEY to the URL.",
    scopeDenied: "Scope denied. Your key does not have access to this endpoint.",
    protected: "Access to this data is restricted.",
    apiError: "Backend API error. Please try again later."
};

let globalConfig = {
    developerName: "@BRONX_ULTRA",
    hiddenFields: "credit,truecaller_name,cached,cached_at,api_by,by,channel,developer,api_key,real_url,source_url,owner,key_note,response_time_ms,powered_by",
    showDevName: true
};

// ============================================================
// 🎨 THEME
// ============================================================
let theme = {
    preset: 'pro-dark',
    colors: {
        bgPrimary: '#0d1117', bgSecondary: '#161b22', bgCard: '#161b22',
        borderColor: '#30363d',
        textPrimary: '#c9d1d9', textSecondary: '#8b949e', textMuted: '#6e7681',
        accent: '#58a6ff', accent2: '#238636', success: '#3fb950', warning: '#d29922',
        danger: '#f85149', info: '#58a6ff', pink: '#db61a2', purple: '#a371f7', yellow: '#e3b341'
    },
    effects: { glow: false, gridBg: true },
    fonts: { heading: 'Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif', body: 'Inter,sans-serif', mono: 'ui-monospace,SFMono-Regular,"SF Mono",Menlo,Consolas,monospace' },
    radius: 6,
    version: 1
};

const PRESETS = {
    'pro-dark': { accent: '#58a6ff', accent2: '#238636', bgPrimary: '#0d1117', bgSecondary: '#161b22' },
    'pro-light': { accent: '#0969da', accent2: '#1a7f37', bgPrimary: '#ffffff', bgSecondary: '#f6f8fa' },
    'midnight': { accent: '#79c0ff', accent2: '#d2a8ff', bgPrimary: '#010409', bgSecondary: '#0d1117' },
    'nord': { accent: '#88c0d0', accent2: '#a3be8c', bgPrimary: '#2e3440', bgSecondary: '#3b4252' }
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
    theme.colors.bgCard = p.bgSecondary;
    theme.colors.borderColor = name === 'pro-light' ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)';
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
            deviceFingerprints, ddosConfig, whitelist,
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
// 📱 DEVICE
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
    if(/iphone|ipad|ipod/.test(ua)) return { type:'iOS', icon:'iOS', os:'iOS' };
    if(/android/.test(ua)) return { type:'Android', icon:'Android', os:'Android' };
    if(/windows/.test(ua)) return { type:'Windows', icon:'Windows', os:'Windows' };
    if(/macintosh|mac os x/.test(ua)) return { type:'macOS', icon:'macOS', os:'macOS' };
    if(/linux/.test(ua)) return { type:'Linux', icon:'Linux', os:'Linux' };
    if(/curl|wget|python|node|axios|java|php|ruby|go-http/.test(ua)) return { type:'Bot/CLI', icon:'Bot', os:'Bot' };
    return { type:'Unknown', icon:'Unknown', os:'Unknown' };
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
function detectCountry(req){ return req.headers['cf-ipcountry'] || req.headers['x-country'] || 'Unknown'; }

// ============================================================
// 🧠 DDOS
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
        return { action:'PERMANENT_BAN', message:'Permanent ban applied.' };
    }
    if(s >= c.longBanAt){
        if(!bans[ctx.type]) bans[ctx.type] = {};
        bans[ctx.type][id] = { until: Date.now() + ddosConfig.longBanMs, reason, at: getIndiaDateTime(), strikes: s };
        return { action:'LONG_BAN', message:'1 hour ban applied.' };
    }
    if(s >= c.tempBanAt){
        if(!bans[ctx.type]) bans[ctx.type] = {};
        bans[ctx.type][id] = { until: Date.now() + ddosConfig.tempBanMs, reason, at: getIndiaDateTime(), strikes: s };
        return { action:'TEMP_BAN', message:'5 minute ban applied.' };
    }
    if(s >= c.throttleAt) return { action:'THROTTLE', message:'Too many requests. Slow down.' };
    return { action:'WARN', message:'Warning #' + s };
}
function smartDDoS(req){
    if(!ddosConfig.enabled || ddosConfig.mode === 'off') return { allowed: true };
    const ip = getRealIP(req);
    const deviceId = generateDeviceId(req);
    const key = req.query.key || req.headers['x-api-key'] || '';
    if(whitelist.ips.includes(ip)) return { allowed: true, action: 'WHITELISTED' };
    if(isBanned('ip', ip)) return { allowed:false, code:403, reason:'Access denied.', type:'ip', id:ip, action:'BANNED' };
    if(isBanned('device', deviceId)) return { allowed:false, code:403, reason:'Access denied.', type:'device', id:deviceId, action:'BANNED' };
    if(key && isBanned('key', key)) return { allowed:false, code:403, reason:'Access denied.', type:'key', id:key, action:'BANNED' };

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
    if(perSecondLimits[wk] >= kd.perSecondLimit) return { allowed: false, message: `Rate limit exceeded: ${kd.perSecondLimit}/sec` };
    perSecondLimits[wk]++;
    return { allowed: true };
}
function checkDailyLimit(k){
    const kd = keyStorage[k];
    if(!kd?.dailyLimit) return { allowed: true };
    const dk = k + '_' + getIndiaDate();
    if(!dailyLimits[dk]) dailyLimits[dk] = 0;
    if(dailyLimits[dk] >= kd.dailyLimit) return { allowed: false, message: `Daily limit reached` };
    return { allowed: true };
}
function isProtected(value){
    for(const key in protectedData){ if(String(value).includes(protectedData[key])) return protectedData[key]; }
    return null;
}
function checkKeyValid(k){
    if(!k) return { valid: false, error: customMessages.missingKey };
    if(maintenance.enabled && !whitelist.keys.includes(k)) return { valid: false, error: maintenance.message };
    const kd = keyStorage[k];
    if(!kd) return { valid: false, error: customMessages.keyNotFound };
    if(kd.stopped) return { valid: false, error: customMessages.keyStopped };
    if(kd.disabled) return { valid: false, error: customMessages.keyDisabled };
    if(kd.expiry && isKeyExpired(kd.expiry)) return { valid: false, error: customMessages.keyExpired.replace('{date}', kd.expiryStr) };
    if(!kd.unlimited && kd.used >= kd.limit) return { valid: false, error: customMessages.limitReached.replace('{used}', kd.used).replace('{limit}', kd.limit) };
    const dl = checkDailyLimit(k); if(!dl.allowed) return { valid: false, error: dl.message };
    const ps = checkPerSecondLimit(k); if(!ps.allowed) return { valid: false, error: ps.message };
    const cd = checkCooldown(k); if(!cd.allowed) return { valid: false, error: 'Cooldown active: wait ' + cd.remaining + 's' };
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
    if(!kd?.scopes?.length) return { valid: false, error: 'No scopes assigned to this key.' };
    if(kd.scopes.includes('*')) return { valid: true };
    if(kd.scopes.includes(ep)) return { valid: true };
    const cleanEp = ep.startsWith('c/') ? ep.substring(2) : ep;
    const isCustom = customAPIs.some(a => a.endpoint === cleanEp);
    if(isCustom){
        if(kd.scopes.includes('custom')) return { valid: true };
        if(kd.scopes.includes('custom:' + cleanEp)) return { valid: true };
    }
    return { valid: false, error: customMessages.scopeDenied + ' (' + ep + ')' };
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
function sanitizeResponse(d, devName, keyHidden){
    if(!d) return d;
    try{
        const c = JSON.parse(JSON.stringify(d));
        const fieldsToRemove = getHiddenFields();
        if(keyHidden) keyHidden.split(',').map(s=>s.trim()).filter(s=>s).forEach(f => fieldsToRemove.push(f));
        fieldsToRemove.forEach(x => {
            delete c[x];
            if(c.meta) delete c.meta[x];
            if(c.data && typeof c.data === 'object') delete c.data[x];
            if(c.result && typeof c.result === 'object') delete c.result[x];
        });
        if(c.meta && Object.keys(c.meta).length === 0) delete c.meta;
        if(globalConfig.showDevName && devName){
            c.developer = devName;
        }
        return c;
    }catch(e){ return d; }
}
function esc(s){ return s ? String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'})[m]) : ''; }

// ============================================================
// 📋 ENDPOINTS
// ============================================================
const endpoints = {
    number:{p:'num',e:'9876543210',d:'Mobile Lookup',c:'phone'},
    aadhar:{p:'num',e:'393933081942',d:'Aadhaar Info',c:'phone'},
    leakinfo:{p:'term',e:'email@example.com',d:'Leak Info',c:'phone'},
    name:{p:'name',e:'abhiraaj',d:'Name Search',c:'phone'},
    numv2:{p:'num',e:'6205949840',d:'Number v2',c:'phone'},
    adv:{p:'num',e:'9876543210',d:'Advanced Intel',c:'phone'},
    adharfamily:{p:'num',e:'984154610245',d:'Family Info',c:'phone'},
    adharration:{p:'num',e:'701984830542',d:'Ration Card',c:'phone'},
    imei:{p:'imei',e:'357817383506298',d:'IMEI Info',c:'phone'},
    calltracer:{p:'num',e:'9876543210',d:'Call Tracer',c:'phone'},
    challan:{p:'vehicle',e:'UP42BB2572',d:'Challan Info',c:'vehicle'},
    numleak:{p:'num',e:'9876543210',d:'Number Leak',c:'phone'},
    bomber:{p:'number',e:'9876543210',d:'SMS Bomber',c:'phone'},
    numtoupi:{p:'num',e:'8945996482',d:'Num to UPI',c:'finance'},
    upi:{p:'upi',e:'example@ybl',d:'UPI Info',c:'finance'},
    ifsc:{p:'ifsc',e:'SBIN0001234',d:'IFSC Lookup',c:'finance'},
    pan:{p:'pan',e:'AXDPR2606K',d:'PAN Info',c:'finance'},
    pincode:{p:'pin',e:'110001',d:'Pincode Info',c:'location'},
    ip:{p:'ip',e:'8.8.8.8',d:'IP Lookup',c:'location'},
    vehicle:{p:'vehicle',e:'MH02FZ0555',d:'Vehicle Info',c:'vehicle'},
    rc:{p:'owner',e:'UP92P2111',d:'RC Lookup',c:'vehicle'},
    veh2num:{p:'vehicle',e:'KL41V3504',d:'Vehicle to Number',c:'vehicle'},
    ff:{p:'uid',e:'123456789',d:'Free Fire',c:'gaming'},
    bgmi:{p:'uid',e:'5121439477',d:'BGMI Info',c:'gaming'},
    insta:{p:'username',e:'cristiano',d:'Instagram',c:'social'},
    git:{p:'username',e:'ftgamer2',d:'GitHub',c:'social'},
    tg:{p:'info',e:'JAUUOWNER',d:'Telegram',c:'social'},
    tgidinfo:{p:'id',e:'7530266953',d:'TG ID Info',c:'social'},
    snap:{p:'username',e:'priyapanchal272',d:'Snapchat',c:'social'},
    pk:{p:'num',e:'03331234567',d:'Pakistan Info',c:'pakistan'},
    pkv2:{p:'num',e:'3359736848',d:'Pakistan v2',c:'pakistan'}
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
        if(!keyStorage[k]) keyStorage[k] = { name:n, scopes:s, type:'hardcoded', limit:l, used:0, cooldown:0, dailyLimit:0, perSecondLimit:0, expiry:parseExpiryDate(e), expiryStr:e, created:now, unlimited:true, hidden:true, _hardcoded:true, developerName:'', hiddenFields:'' };
    });
}
function initCustomAPIs(){
    if(customAPIs.length) return;
    customAPIs = [
        { id: Date.now()+1, name:'Number Info', endpoint:'number-advanced', param:'num', example:'9876543210', visible:true, realAPI:'https://num-tg-info-api.vercel.app/info?number={param}', scopeKey:'custom:number-advanced', desc:'Advanced number intelligence' },
        { id: Date.now()+2, name:'Vehicle RC', endpoint:'rc-details', param:'ca_number', example:'MH02FZ0555', visible:true, realAPI:'https://simple-rc-info.vercel.app/rc?num={param}', scopeKey:'custom:rc-details', desc:'Vehicle RC details' },
        { id: Date.now()+3, name:'Aadhaar Verify', endpoint:'aadhar-verify', param:'aadhar', example:'393933081942', visible:true, realAPI:'https://bronx-king-vip999.vercel.app/api/aadhaar?num={param}', scopeKey:'custom:aadhar-verify', desc:'Aadhaar verification' },
        { id: Date.now()+4, name:'Email Lookup', endpoint:'email-lookup', param:'mail', example:'user@gmail.com', visible:true, realAPI:'https://bronx-king-mail-opi.vercel.app/mail={param}', scopeKey:'custom:email-lookup', desc:'Email information' },
        { id: Date.now()+5, name:'Telegram Scan', endpoint:'telegram-scan', param:'id', example:'7530266953', visible:true, realAPI:'https://bronx-tg-king-bro.vercel.app/tg?key=BRONXop&query={param}', scopeKey:'custom:telegram-scan', desc:'Telegram ID scanner' },
        { id: Date.now()+6, name:'SMS Bomber', endpoint:'sms-bomber', param:'number', example:'1234567890', visible:true, realAPI:'https://bronx-sms-api-ulimate.vercel.app/api/key-bronx-paid-vip?number={param}&counter=10', scopeKey:'custom:sms-bomber', desc:'SMS bombing service' },
        { id: Date.now()+7, name:'Number Backup', endpoint:'num-op', param:'num', example:'9876543210', visible:true, realAPI:'https://tfqdeadlo-inddataapi.hf.space/search?mobile={param}', scopeKey:'custom:num-op', desc:'Number backup info' }
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
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        return res.status(r.code || 429).send(r.reason || 'Rate limited');
    }
    if(r.action === 'THROTTLE') return setTimeout(() => next(), 800);
    next();
});

// ============================================================
// 🏠 PUBLIC ROUTES
// ============================================================
app.get('/', (req,res) => { try { res.send(renderHome()); } catch(e){ res.send('err: ' + e.message); } });
app.get('/test', (req,res) => res.json({
    status:'BRONX V503 ULTRA ONLINE', version:'5.0.3', ddos: ddosConfig.mode,
    keys: Object.keys(keyStorage).length, endpoints: Object.keys(endpoints).length,
    custom: customAPIs.length, bannedIPs: Object.keys(bans.ip).length,
    bannedDevices: Object.keys(bans.device).length, devicesTracked: Object.keys(deviceFingerprints).length,
    theme: theme.preset, maintenance: maintenance.enabled
}));
app.get('/theme', (req,res) => res.json(theme));
app.get('/public-theme', (req,res) => res.json({ theme, announcement, maintenance }));

// Public API tester (form submit from dashboard) — no key required for JSON preview check
app.get('/api/preview/:ep', async (req,res) => {
    try{
        const ep = req.params.ep;
        if(endpointResponses[ep]) return res.json(endpointResponses[ep]);
        const custom = customAPIs.find(a => a.endpoint === ep);
        if(custom) {
            const pv = req.query[custom.param] || req.query.value || 'sample';
            if(custom.visible && custom.realAPI) {
                try {
                    const url = custom.realAPI.replace(/\{param\}/gi, encodeURIComponent(pv));
                    const r = await axios.get(url, { timeout: 15000 });
                    return res.json(r.data);
                } catch(e) {
                    return res.json({ info: 'Preview unavailable. Configure sample response in admin panel.', error: e.message });
                }
            }
            return res.json({ info: 'Admin has not configured a sample response yet.' });
        }
        if(endpoints[ep]) return res.json({ info: 'Admin has not configured sample response for this endpoint yet.', endpoint: ep, param: endpoints[ep].p, example: endpoints[ep].e });
        res.status(404).json({ error: 'Endpoint not found' });
    }catch(e){ res.status(500).json({ error: e.message }); }
});

// Custom API proxy
app.get('/api/custom/:ep', async (req,res) => {
    try{
        const api = customAPIs.find(a => a.endpoint === req.params.ep && a.visible);
        if(!api) { res.setHeader('Content-Type', 'text/plain; charset=utf-8'); return res.status(404).send('API not found or disabled.'); }
        const key = req.query.key;
        if(!key) { res.setHeader('Content-Type', 'text/plain; charset=utf-8'); return res.status(400).send(customMessages.missingKey); }
        const kc = checkKeyValid(key);
        if(!kc.valid) { res.setHeader('Content-Type', 'text/plain; charset=utf-8'); return res.status(403).send(kc.error); }
        const sc = checkKeyScope(kc.keyData, req.params.ep);
        if(!sc.valid) { res.setHeader('Content-Type', 'text/plain; charset=utf-8'); return res.status(403).send(sc.error); }
        const pv = req.query[api.param] || req.query.number || req.query.num || req.query.value;
        if(!pv) { res.setHeader('Content-Type', 'text/plain; charset=utf-8'); return res.status(400).send('Missing parameter: ' + api.param); }
        if(isProtected(pv)) { res.setHeader('Content-Type', 'text/plain; charset=utf-8'); return res.status(403).send(customMessages.protected); }
        const url = api.realAPI.replace(/\{param\}/gi, encodeURIComponent(pv));
        const r = await axios.get(url, { timeout: 30000 });
        incrementKeyUsage(key, 'c/'+req.params.ep, req);
        requestLogs.push({ timestamp: getIndiaDateTime(), key:key.substring(0,8)+'***', endpoint:'c/'+req.params.ep, param:String(pv).substring(0,20), status:'success', ip:getRealIP(req), clientType:detectBrowser(req) });
        if(requestLogs.length > 2000) requestLogs = requestLogs.slice(-2000);
        const devName = kc.keyData.developerName || globalConfig.developerName;
        res.json({ ...sanitizeResponse(r.data, devName, kc.keyData.hiddenFields), api_info: { key_owner: kc.keyData.name, remaining: kc.keyData.unlimited ? 'Unlimited' : Math.max(0, kc.keyData.limit - kc.keyData.used), expiry: kc.keyData.expiryStr || 'LIFETIME' } });
    }catch(e){ res.setHeader('Content-Type', 'text/plain; charset=utf-8'); res.status(500).send(customMessages.apiError); }
});

// Main endpoint proxy
app.get('/api/key-bronx/:ep', async (req,res) => {
    try{
        const ep = req.params.ep;
        if(!endpoints[ep]) { res.setHeader('Content-Type', 'text/plain; charset=utf-8'); return res.status(404).send('Endpoint not found.'); }
        const key = req.query.key;
        if(!key) { res.setHeader('Content-Type', 'text/plain; charset=utf-8'); return res.status(400).send(customMessages.missingKey); }
        const kc = checkKeyValid(key);
        if(!kc.valid) { res.setHeader('Content-Type', 'text/plain; charset=utf-8'); return res.status(403).send(kc.error); }
        const sc = checkKeyScope(kc.keyData, ep);
        if(!sc.valid) { res.setHeader('Content-Type', 'text/plain; charset=utf-8'); return res.status(403).send(sc.error); }
        const pv = req.query[endpoints[ep].p];
        if(!pv) { res.setHeader('Content-Type', 'text/plain; charset=utf-8'); return res.status(400).send('Missing parameter: ' + endpoints[ep].p); }
        if(isProtected(pv)) { res.setHeader('Content-Type', 'text/plain; charset=utf-8'); return res.status(403).send(customMessages.protected); }
        if(endpointResponses[ep]) {
            const devName = kc.keyData.developerName || globalConfig.developerName;
            return res.json({ ...sanitizeResponse(endpointResponses[ep], devName, kc.keyData.hiddenFields), api_info:{key_owner:kc.keyData.name} });
        }
        const url = `${REAL_API_BASE}/${ep}?key=${getNextKey()}&${endpoints[ep].p}=${encodeURIComponent(pv)}`;
        const r = await axios.get(url, { timeout: 30000 });
        incrementKeyUsage(key, ep, req);
        requestLogs.push({ timestamp: getIndiaDateTime(), key:key.substring(0,8)+'***', endpoint:ep, param:String(pv).substring(0,20), status:'success', ip:getRealIP(req), clientType:detectBrowser(req) });
        if(requestLogs.length > 2000) requestLogs = requestLogs.slice(-2000);
        const devName = kc.keyData.developerName || globalConfig.developerName;
        res.json({ ...sanitizeResponse(r.data, devName, kc.keyData.hiddenFields), api_info: { key_owner: kc.keyData.name, remaining: kc.keyData.unlimited ? 'Unlimited' : Math.max(0, kc.keyData.limit - kc.keyData.used), expiry: kc.keyData.expiryStr || 'LIFETIME' } });
    }catch(e){ res.setHeader('Content-Type', 'text/plain; charset=utf-8'); res.status(500).send(customMessages.apiError); }
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
        return res.json({ success:false, error:'Too many failed attempts. Please wait.' });
    if(username === ADMIN_USERNAME && password === ADMIN_PASSWORD){
        const token = genToken();
        adminSessions[token] = { expiresAt: Date.now() + 365*24*3600*1000, permanent: true };
        permanentTokens[token] = { createdAt: getIndiaDateTime() };
        delete abuseTracker.ip['LOGIN_'+ip];
        adminLogs.push({ user:username, action:'LOGIN', ip, browser:ua, device:di.type, timestamp:getIndiaDateTime(), status:'SUCCESS' });
        logAudit(username, 'LOGIN_SUCCESS', { ip });
        saveToDisk();
        res.json({ success:true, token, message:'Access granted', redirect: ADMIN_PATH + '?token=' + token });
    } else {
        pushHit(abuseTracker.ip, 'LOGIN_'+ip, 3600000);
        const attempts = countWindow(abuseTracker.ip, 'LOGIN_'+ip, 3600000);
        if(attempts >= ddosConfig.login.maxAttempts)
            bans.ip['LOGIN_'+ip] = { until: Date.now() + ddosConfig.login.banMs, reason:'Failed logins', at:getIndiaDateTime(), strikes:attempts };
        adminLogs.push({ user:username, action:'LOGIN_FAILED', ip, browser:ua, device:di.type, attempts, timestamp:getIndiaDateTime(), status:'FAILED' });
        logAudit(username, 'LOGIN_FAILED', { ip, attempts });
        res.json({ success:false, error:`Invalid credentials. ${ddosConfig.login.maxAttempts - attempts} attempts left.` });
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
    const { keyName, keyOwner, scopes, limit, expiryDate, days, cooldown, dailyLimit, perSecondLimit, autoGenerate, notes, developerName, hiddenFields } = req.body;
    let fk = keyName; if(autoGenerate || !keyName) fk = genRandomKey();
    if(!fk || !keyOwner) return res.json({e:'Missing required fields'});
    if(keyStorage[fk]) return res.json({e:'Key already exists'});
    const ks = scopes || ['*'];
    let exp = null, es = expiryDate || 'LIFETIME';
    if(days && !isNaN(days)){
        const d = new Date(Date.now() + parseInt(days)*24*3600*1000);
        exp = d; es = d.toISOString().split('T')[0].split('-').reverse().join('-');
    } else if(expiryDate && expiryDate !== 'LIFETIME'){ exp = parseExpiryDate(expiryDate); es = expiryDate; }
    keyStorage[fk] = { name:keyOwner, scopes:ks, type:'generated', limit:parseInt(limit)||100, used:0, cooldown:parseInt(cooldown)||0, dailyLimit:parseInt(dailyLimit)||0, perSecondLimit:parseInt(perSecondLimit)||0, expiry:exp, expiryStr:es, created:getIndiaDateTime(), unlimited:false, hidden:false, _hardcoded:false, stopped:false, disabled:false, notes:notes||'', developerName: developerName || '', hiddenFields: hiddenFields || '' };
    logAudit('admin', 'GENERATE_KEY', { key:fk, scopes:ks });
    saveToDisk();
    res.json({ success:true, key:fk, message:'Key generated successfully' });
});
app.post(ADMIN_PATH + '/edit-key', adminAuth, (req,res) => {
    const { keyName, newName, newOwner, newLimit, newDailyLimit, newPerSecondLimit, newCooldown, newScopes, newNotes, newExpiry, newDeveloperName, newHiddenFields } = req.body;
    if(!keyStorage[keyName]) return res.json({e:'Not found'});
    if(keyStorage[keyName]._hardcoded) return res.json({e:'Cannot edit hardcoded key'});
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
    if(newHiddenFields !== undefined) t.hiddenFields = newHiddenFields;
    if(newExpiry){ const e = parseExpiryDate(newExpiry); if(e){ t.expiry = e; t.expiryStr = newExpiry; } }
    logAudit('admin', 'EDIT_KEY', { key:keyName });
    saveToDisk(); res.json({ success:true, message:'Updated successfully' });
});
app.post(ADMIN_PATH + '/clone-key', adminAuth, (req,res) => {
    const { keyName } = req.body;
    if(!keyStorage[keyName]) return res.json({e:'Not found'});
    const kd = keyStorage[keyName];
    const nk = genRandomKey();
    keyStorage[nk] = { ...kd, used:0, created:getIndiaDateTime(), _hardcoded:false, hidden:false, name:(kd.name||'Clone')+' (Copy)' };
    logAudit('admin', 'CLONE_KEY', { from:keyName, to:nk });
    saveToDisk(); res.json({ success:true, key:nk, message:'Cloned successfully' });
});
app.post(ADMIN_PATH + '/delete-key', adminAuth, (req,res) => {
    if(keyStorage[req.body.keyName]?._hardcoded) return res.json({e:'Cannot delete hardcoded key'});
    logAudit('admin', 'DELETE_KEY', { key:req.body.keyName });
    delete keyStorage[req.body.keyName]; saveToDisk(); res.json({success:true});
});
app.post(ADMIN_PATH + '/reset-key-usage', adminAuth, (req,res) => {
    if(keyStorage[req.body.keyName]){ keyStorage[req.body.keyName].used = 0; saveToDisk(); res.json({success:true}); }
    else res.json({e:'Not found'});
});
app.post(ADMIN_PATH + '/reset-all', adminAuth, (req,res) => {
    Object.keys(keyStorage).forEach(k => { if(!keyStorage[k]._hardcoded) keyStorage[k].used = 0; });
    dailyLimits = {}; perSecondLimits = {};
    saveToDisk(); res.json({success:true});
});
app.post(ADMIN_PATH + '/clear-logs', adminAuth, (req,res) => {
    requestLogs = []; keyMonitorLogs = []; saveToDisk(); res.json({success:true});
});
app.post(ADMIN_PATH + '/push-key', adminAuth, (req,res) => {
    const { keyName, days } = req.body;
    if(!keyStorage[keyName]) return res.json({e:'Not found'});
    if(keyStorage[keyName]._hardcoded) return res.json({e:'Cannot push hardcoded'});
    const d = parseInt(days) || 30;
    const ne = new Date(Date.now() + d*24*3600*1000);
    keyStorage[keyName].expiry = ne;
    keyStorage[keyName].expiryStr = ne.toISOString().split('T')[0].split('-').reverse().join('-');
    keyStorage[keyName].used = 0;
    logAudit('admin', 'PUSH_KEY', { key:keyName, days:d });
    saveToDisk(); res.json({success:true, message:`Pushed ${d} days`});
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
    saveToDisk(); res.json({success:true, count, message:`Pushed ${d} days to ${count} keys`});
});
app.post(ADMIN_PATH + '/stop-key', adminAuth, (req,res) => {
    const k = req.body.keyName;
    if(!keyStorage[k]) return res.json({e:'Not found'});
    if(keyStorage[k]._hardcoded) return res.json({e:'Cannot stop hardcoded'});
    keyStorage[k].stopped = !keyStorage[k].stopped;
    saveToDisk(); res.json({success:true, stopped:keyStorage[k].stopped});
});
app.post(ADMIN_PATH + '/disable-key', adminAuth, (req,res) => {
    const k = req.body.keyName;
    if(!keyStorage[k]) return res.json({e:'Not found'});
    if(keyStorage[k]._hardcoded) return res.json({e:'Cannot disable hardcoded'});
    keyStorage[k].disabled = !keyStorage[k].disabled;
    saveToDisk(); res.json({success:true, disabled:keyStorage[k].disabled});
});
app.post(ADMIN_PATH + '/update-scopes', adminAuth, (req,res) => {
    const { keyName, scopes } = req.body;
    if(!keyStorage[keyName]) return res.json({e:'Not found'});
    if(keyStorage[keyName]._hardcoded) return res.json({e:'Cannot edit hardcoded'});
    keyStorage[keyName].scopes = scopes; saveToDisk(); res.json({success:true});
});
app.post(ADMIN_PATH + '/bulk-delete', adminAuth, (req,res) => {
    const { keys } = req.body; let n = 0;
    (keys||[]).forEach(k => { if(keyStorage[k] && !keyStorage[k]._hardcoded){ delete keyStorage[k]; n++; } });
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
    const { name, endpoint, param, example, realAPI, visible, desc } = req.body;
    if(!name || !endpoint) return res.json({e:'Name and endpoint required'});
    const cleanEndpoint = String(endpoint).toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    if(!cleanEndpoint) return res.json({e:'Invalid endpoint'});
    if(customAPIs.some(a => a.endpoint === cleanEndpoint)) return res.json({e:'Endpoint already exists'});
    const newApi = { id: Date.now(), name: String(name), endpoint: cleanEndpoint, param: param || 'num', example: example || '9876543210', visible: visible !== false, realAPI: realAPI || '', scopeKey: 'custom:' + cleanEndpoint, desc: desc || 'Custom API endpoint', createdAt: getIndiaDateTime() };
    customAPIs.push(newApi);
    logAudit('admin', 'ADD_API', { name, endpoint: cleanEndpoint });
    saveToDisk();
    res.json({ success:true, api: newApi, message:'API added' });
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
    const { id, name, endpoint, param, example, realAPI, desc } = req.body;
    const a = customAPIs.find(x => x.id === parseInt(id));
    if(!a) return res.json({e:'Not found'});
    if(name) a.name = name;
    if(endpoint) a.endpoint = String(endpoint).toLowerCase().replace(/[^a-z0-9-]/g, '-');
    if(param) a.param = param;
    if(example) a.example = example;
    if(realAPI) a.realAPI = realAPI;
    if(desc !== undefined) a.desc = desc;
    a.scopeKey = 'custom:' + a.endpoint;
    saveToDisk(); res.json({success:true, api:a});
});
app.post(ADMIN_PATH + '/add-protection', adminAuth, (req,res) => {
    const v = req.body.value; if(!v) return res.json({e:'Missing value'});
    protectedData[v] = v; saveToDisk(); res.json({success:true});
});
app.post(ADMIN_PATH + '/remove-protection', adminAuth, (req,res) => {
    delete protectedData[req.body.value]; saveToDisk(); res.json({success:true});
});
app.get(ADMIN_PATH + '/protect-list', adminAuth, (req,res) => res.json({ list: Object.keys(protectedData) }));
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
    const { developerName, hiddenFields, messages, showDevName } = req.body;
    if(developerName !== undefined) globalConfig.developerName = developerName;
    if(hiddenFields !== undefined) globalConfig.hiddenFields = hiddenFields;
    if(showDevName !== undefined) globalConfig.showDevName = !!showDevName;
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
            keyStorage[k] = { ...d, _hardcoded:false, hidden:false, type:'generated', developerName: d.developerName || '', hiddenFields: d.hiddenFields || '' };
            imported++;
        });
        saveToDisk();
        res.json({ success:true, imported, skipped, message:`${imported} imported, ${skipped} skipped` });
    }catch(e){ res.json({e:'Error: ' + e.message}); }
});
app.post(ADMIN_PATH + '/update-endpoint-response', adminAuth, (req,res) => {
    const { endpoint, responseData } = req.body;
    if(!endpoint) return res.json({e:'Missing endpoint'});
    try{
        if(!responseData || responseData.trim() === ''){ delete endpointResponses[endpoint]; }
        else endpointResponses[endpoint] = typeof responseData === 'string' ? JSON.parse(responseData) : responseData;
        saveToDisk(); res.json({success:true});
    }catch(e){ res.json({e:'Invalid JSON format'}); }
});
app.get(ADMIN_PATH + '/get-endpoint-response', adminAuth, (req,res) => {
    res.json({ data: endpointResponses[req.query.endpoint] || null });
});
app.get(ADMIN_PATH + '/backup', adminAuth, (req,res) => {
    const ks = {};
    Object.entries(keyStorage).forEach(([k,v]) => { if(!v._hardcoded) ks[k]=v; });
    res.json({
        version:'5.0.3', exported_at: getIndiaDateTime(),
        keys: ks, apis: customAPIs, protected: protectedData,
        endpointResponses, theme, ddosConfig, whitelist,
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
        if(b.whitelist) whitelist = b.whitelist;
        if(b.announcement) announcement = b.announcement;
        if(b.maintenance) maintenance = b.maintenance;
        if(b.globalConfig) globalConfig = { ...globalConfig, ...b.globalConfig };
        if(b.customMessages) customMessages = { ...customMessages, ...b.customMessages };
        saveToDisk(); res.json({success:true, message:'Restored successfully'});
    }catch(e){ res.json({e:'Restore failed: ' + e.message}); }
});
app.get(ADMIN_PATH + '/search-keys', adminAuth, (req,res) => {
    const q = (req.query.q || '').toLowerCase();
    const matches = Object.entries(keyStorage).filter(([k,d]) =>
        !d._hardcoded && (k.toLowerCase().includes(q) || (d.name||'').toLowerCase().includes(q))
    ).slice(0, 50).map(([k,d]) => ({ key:k, name:d.name, used:d.used, limit:d.limit }));
    res.json({ matches, total: matches.length });
});
app.post(ADMIN_PATH + '/save-announcement', adminAuth, (req,res) => {
    announcement = { enabled: !!req.body.enabled, text: req.body.text || '', type: req.body.type || 'info' };
    saveToDisk(); res.json({success:true});
});
app.post(ADMIN_PATH + '/save-maintenance', adminAuth, (req,res) => {
    maintenance = { enabled: !!req.body.enabled, message: req.body.message || 'System under maintenance' };
    saveToDisk(); res.json({success:true});
});
app.get(ADMIN_PATH + '/announcement', adminAuth, (req,res) => res.json(announcement));
app.get(ADMIN_PATH + '/maintenance', adminAuth, (req,res) => res.json(maintenance));
app.post(ADMIN_PATH + '/whitelist-add', adminAuth, (req,res) => {
    const { type, value } = req.body;
    if(!['ips','keys'].includes(type)) return res.json({e:'Invalid type'});
    if(!whitelist[type].includes(value)) whitelist[type].push(value);
    saveToDisk(); res.json({success:true, list: whitelist[type]});
});
app.post(ADMIN_PATH + '/whitelist-remove', adminAuth, (req,res) => {
    const { type, value } = req.body;
    if(!['ips','keys'].includes(type)) return res.json({e:'Invalid type'});
    whitelist[type] = whitelist[type].filter(v => v !== value);
    saveToDisk(); res.json({success:true, list: whitelist[type]});
});
app.get(ADMIN_PATH + '/whitelist', adminAuth, (req,res) => res.json(whitelist));

// 404
app.use((req,res) => res.status(404).json({error:'Not found'}));

// ============================================================
// 🎨 CSS GENERATOR
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
    --radius:${r}px; --tr:all .18s ease;
}
*{margin:0;padding:0;box-sizing:border-box}
body{background:var(--bg-primary);color:var(--text-primary);font-family:${theme.fonts.body};min-height:100vh;line-height:1.55;-webkit-font-smoothing:antialiased;font-size:14px}
${e.gridBg ? `.grid-bg{position:fixed;inset:0;background-image:radial-gradient(${hexToRgbStr(c.accent,.06)} 1px,transparent 1px);background-size:28px 28px;z-index:0;pointer-events:none}` : '.grid-bg{display:none}'}
::-webkit-scrollbar{width:10px;height:10px}
::-webkit-scrollbar-track{background:var(--bg-primary)}
::-webkit-scrollbar-thumb{background:var(--border-color);border-radius:5px}
::-webkit-scrollbar-thumb:hover{background:var(--text-muted)}
a{color:var(--accent);text-decoration:none}
a:hover{text-decoration:underline}
.admin-container{display:flex;min-height:100vh;position:relative;z-index:10}
.sidebar{width:240px;background:var(--bg-secondary);border-right:1px solid var(--border-color);padding:0;position:fixed;height:100vh;overflow-y:auto;z-index:20}
.sidebar-header{padding:20px 16px;border-bottom:1px solid var(--border-color)}
.sidebar-logo{display:inline-block;width:36px;height:36px;line-height:36px;text-align:center;background:var(--accent);color:#fff;border-radius:6px;font-weight:700;font-size:14px;margin-bottom:10px}
.sidebar-title{font-size:14px;font-weight:700;color:var(--text-primary);letter-spacing:0.5px}
.sidebar-subtitle{font-size:11px;color:var(--text-muted);margin-top:2px}
.sidebar-nav{list-style:none;padding:10px 8px}
.sidebar-nav li{margin-bottom:1px}
.sidebar-nav a{display:flex;align-items:center;gap:10px;padding:9px 12px;color:var(--text-secondary);text-decoration:none;border-radius:5px;transition:var(--tr);font-size:12.5px;font-weight:500;cursor:pointer;border:1px solid transparent}
.sidebar-nav a:hover{background:var(--bg-primary);color:var(--text-primary)}
.sidebar-nav a.active{background:${hexToRgbStr(c.accent,.15)};color:var(--accent);font-weight:600;border-color:${hexToRgbStr(c.accent,.3)}}
.sidebar-nav i{width:16px;text-align:center;font-size:12px;flex-shrink:0}
.main-content{flex:1;margin-left:240px;padding:24px;min-height:100vh}
.page-title{font-size:20px;font-weight:700;color:var(--text-primary);margin-bottom:20px;padding-bottom:16px;border-bottom:1px solid var(--border-color);display:flex;align-items:center;gap:10px}
.page-title i{color:var(--accent)}
.card{background:var(--bg-card);border:1px solid var(--border-color);border-radius:var(--radius);padding:24px;margin-bottom:20px}
.card h3{margin-bottom:20px;font-size:15px;font-weight:600;display:flex;align-items:center;gap:10px;color:var(--text-primary);padding-bottom:14px;border-bottom:1px solid var(--border-color)}
.card h3 i{color:var(--accent);font-size:14px}
.card h4{font-size:13px;font-weight:600;color:var(--text-primary);margin:16px 0 10px}
.stats-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-bottom:20px}
.stat-card{background:var(--bg-secondary);border:1px solid var(--border-color);border-radius:6px;padding:18px 16px;transition:var(--tr)}
.stat-card:hover{border-color:var(--accent)}
.stat-icon{font-size:11px;color:var(--text-muted);text-transform:uppercase;font-weight:600;letter-spacing:1px;margin-bottom:8px}
.stat-value{font-size:24px;font-weight:700;color:var(--text-primary);margin-bottom:2px;font-family:${theme.fonts.mono}}
.stat-label{font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.8px;font-weight:500}
.form-group{margin-bottom:16px}
.form-group label{display:block;margin-bottom:6px;color:var(--text-secondary);font-size:11.5px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px}
.form-input, input[type="text"], input[type="password"], input[type="number"], input[type="file"], textarea, select{width:100%;padding:9px 12px;background:var(--bg-primary);border:1px solid var(--border-color);border-radius:5px;color:var(--text-primary);font-size:13px;transition:var(--tr);outline:none;font-family:${theme.fonts.body}}
.form-input:focus, input:focus, textarea:focus, select:focus{border-color:var(--accent);box-shadow:0 0 0 3px ${hexToRgbStr(c.accent,.15)}}
input[type="checkbox"]{width:auto;accent-color:var(--accent);cursor:pointer}
textarea{resize:vertical;font-family:${theme.fonts.mono};font-size:12px}
select option{background:var(--bg-secondary);color:var(--text-primary)}
.btn{padding:9px 16px;background:var(--bg-secondary);color:var(--text-primary);border:1px solid var(--border-color);border-radius:5px;cursor:pointer;font-weight:600;font-size:12.5px;transition:var(--tr);font-family:${theme.fonts.body};display:inline-flex;align-items:center;justify-content:center;gap:6px;text-decoration:none}
.btn:hover{background:var(--bg-primary);border-color:var(--text-muted)}
.btn-primary{background:var(--accent);color:#fff;border-color:var(--accent)}
.btn-primary:hover{background:${hexToRgbStr(c.accent,.85)};border-color:${hexToRgbStr(c.accent,.85)}}
.btn-success{background:var(--accent2);color:#fff;border-color:var(--accent2)}
.btn-danger{background:var(--danger);color:#fff;border-color:var(--danger)}
.btn-warning{background:var(--warning);color:#0d1117;border-color:var(--warning)}
.btn-block{width:100%}
.btn-sm{padding:5px 10px;font-size:11px}
.btn-icon{width:32px;height:32px;padding:0;border-radius:5px}
.table-container{overflow-x:auto;border-radius:6px;border:1px solid var(--border-color);background:var(--bg-secondary)}
table{width:100%;border-collapse:collapse;font-size:12.5px}
th{background:var(--bg-primary);color:var(--text-secondary);padding:11px 12px;text-align:left;font-weight:600;text-transform:uppercase;font-size:10.5px;letter-spacing:0.6px;position:sticky;top:0;z-index:2;border-bottom:1px solid var(--border-color)}
td{padding:11px 12px;border-bottom:1px solid var(--border-color);color:var(--text-primary)}
tbody tr:hover td{background:var(--bg-primary)}
tbody tr:last-child td{border-bottom:none}
code, .code{background:${hexToRgbStr(c.accent,.1)};padding:2px 6px;border-radius:4px;color:var(--accent);font-family:${theme.fonts.mono};font-size:11.5px;border:1px solid ${hexToRgbStr(c.accent,.2)}}
.badge{display:inline-block;padding:2px 8px;border-radius:12px;font-size:10.5px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;border:1px solid}
.badge-success{background:${hexToRgbStr(c.success,.15)};color:var(--success);border-color:${hexToRgbStr(c.success,.3)}}
.badge-danger{background:${hexToRgbStr(c.danger,.15)};color:var(--danger);border-color:${hexToRgbStr(c.danger,.3)}}
.badge-warning{background:${hexToRgbStr(c.warning,.15)};color:var(--warning);border-color:${hexToRgbStr(c.warning,.3)}}
.badge-muted{background:${hexToRgbStr(c.textMuted,.15)};color:var(--textMuted);border-color:${hexToRgbStr(c.textMuted,.3)}}
.badge-info{background:${hexToRgbStr(c.info,.15)};color:var(--info);border-color:${hexToRgbStr(c.info,.3)}}
.grid-2{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.grid-3{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
.grid-4{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
.toast{position:fixed;top:20px;right:20px;z-index:99999;padding:12px 18px;border-radius:6px;font-weight:600;font-size:13px;animation:slideIn .3s ease;max-width:420px;border:1px solid;backdrop-filter:blur(8px);background:var(--bg-card)}
.toast.success{border-color:var(--success);color:var(--success)}
.toast.error{border-color:var(--danger);color:var(--danger)}
.toast.warning{border-color:var(--warning);color:var(--warning)}
.toast.info{border-color:var(--info);color:var(--info)}
.tabs{display:flex;gap:4px;border-bottom:1px solid var(--border-color);margin-bottom:20px;flex-wrap:wrap}
.tab{padding:10px 16px;cursor:pointer;font-size:12.5px;font-weight:600;color:var(--text-muted);border-bottom:2px solid transparent;transition:var(--tr);margin-bottom:-1px}
.tab:hover{color:var(--text-primary)}
.tab.active{color:var(--accent);border-bottom-color:var(--accent)}
.scope-box{display:flex;flex-wrap:wrap;gap:6px;padding:12px;background:var(--bg-primary);border-radius:5px;border:1px solid var(--border-color);max-height:260px;overflow-y:auto}
.scope-item{cursor:pointer;font-size:11.5px;display:inline-flex;align-items:center;gap:6px;padding:5px 10px;border-radius:4px;background:var(--bg-secondary);border:1px solid var(--border-color);color:var(--text-secondary);transition:var(--tr)}
.scope-item:hover{border-color:var(--accent);color:var(--text-primary)}
.scope-item input{accent-color:var(--accent);margin:0;width:auto}
.scope-item.checked{background:${hexToRgbStr(c.accent,.15)};border-color:${hexToRgbStr(c.accent,.4)};color:var(--accent)}
.empty{padding:40px 20px;text-align:center;color:var(--text-muted);font-size:13px}
.mono{font-family:${theme.fonts.mono}}
.text-center{text-align:center}
.text-muted{color:var(--text-muted)}
.text-success{color:var(--success)}
.text-danger{color:var(--danger)}
.text-warning{color:var(--warning)}
.text-accent{color:var(--accent)}
.mt-1{margin-top:8px}.mt-2{margin-top:16px}.mt-3{margin-top:24px}
.mb-1{margin-bottom:8px}.mb-2{margin-bottom:16px}.mb-3{margin-bottom:24px}
.divider{border:none;border-top:1px solid var(--border-color);margin:20px 0}
.flex{display:flex}.flex-between{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap}
.gap-2{gap:10px}.gap-3{gap:16px}
@keyframes slideIn{from{transform:translateX(120%);opacity:0}to{transform:translateX(0);opacity:1}}
@media(max-width:768px){
    .sidebar{width:64px}
    .sidebar-title, .sidebar-subtitle, .sidebar-nav a span{display:none}
    .sidebar-header{padding:14px 8px;text-align:center}
    .sidebar-nav a{justify-content:center;padding:12px}
    .main-content{margin-left:64px;padding:14px}
    .grid-2,.grid-3,.grid-4{grid-template-columns:1fr}
    .stats-grid{grid-template-columns:repeat(2,1fr)}
}
</style>`;
}

// ============================================================
// LOGIN PAGE
// ============================================================
function renderLogin(){
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Admin Login · BRONX OSINT</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
${generateCSS()}
<style>
body{display:flex;align-items:center;justify-content:center;min-height:100vh;padding:20px}
.login-box{width:100%;max-width:380px;position:relative;z-index:10}
.login-header{text-align:center;margin-bottom:28px}
.login-logo{display:inline-block;width:56px;height:56px;line-height:56px;background:var(--accent);color:#fff;border-radius:10px;font-weight:800;font-size:20px;margin-bottom:14px;letter-spacing:-1px}
.login-title{font-size:20px;font-weight:700;color:var(--text-primary);margin-bottom:4px}
.login-sub{font-size:12px;color:var(--text-muted)}
.login-form{background:var(--bg-card);border:1px solid var(--border-color);border-radius:8px;padding:28px 24px}
.msg{text-align:center;margin-top:14px;font-size:12.5px;font-weight:500;min-height:18px}
</style></head><body>
<div class="grid-bg"></div>
<div class="login-box">
<div class="login-header">
<div class="login-logo">B</div>
<div class="login-title">BRONX OSINT</div>
<div class="login-sub">Admin Access · V503 ULTRA</div>
</div>
<div class="login-form">
<div class="form-group"><label>Username</label><input type="text" id="username" placeholder="Enter username" autocomplete="off"></div>
<div class="form-group"><label>Password</label><input type="password" id="password" placeholder="Enter password" autocomplete="off"></div>
<button class="btn btn-primary btn-block" onclick="doLogin()" id="loginBtn">Sign In</button>
<div class="msg" id="message"></div>
</div>
</div>
<script>
async function doLogin(){
    const u=document.getElementById('username').value.trim();
    const p=document.getElementById('password').value.trim();
    const m=document.getElementById('message');
    const b=document.getElementById('loginBtn');
    if(!u||!p){m.style.color='var(--warning)';m.textContent='Please fill all fields';return}
    b.disabled=true;b.textContent='Authenticating...';m.textContent='';
    try{
        const r=await fetch('${ADMIN_PATH}/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:u,password:p})});
        const d=await r.json();
        if(d.success){m.style.color='var(--success)';m.textContent=d.message;setTimeout(()=>location.href=d.redirect,500)}
        else{m.style.color='var(--danger)';m.textContent=d.error;b.disabled=false;b.textContent='Sign In'}
    }catch(e){m.style.color='var(--danger)';m.textContent='Connection error';b.disabled=false;b.textContent='Sign In'}
}
document.addEventListener('keydown',e=>{if(e.key==='Enter')doLogin()});
</script></body></html>`;
}

// ============================================================
// HOME PAGE (Public Dashboard)
// ============================================================
function renderHome(){
    const visibleAPIs = customAPIs.filter(a => a.visible);
    const builtinList = Object.entries(endpoints).map(([n,e]) => ({ endpoint:n, ...e, isCustom:false }));
    const customList = visibleAPIs.map(a => ({ endpoint:a.endpoint, p:a.param, e:a.example, d:a.name, c:a.desc||'Custom API', isCustom:true }));
    const allAPIs = [...builtinList, ...customList];

    const announcementHTML = announcement.enabled ? `<div class="announce-bar">${esc(announcement.text)}</div>` : '';
    const maintenanceHTML = maintenance.enabled ? `<div class="maint-overlay"><div class="maint-box"><div class="maint-icon">!</div><h1>MAINTENANCE</h1><p>${esc(maintenance.message)}</p></div></div>` : '';

    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>BRONX OSINT API · Developer Platform</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
${generateCSS()}
<style>
body{padding-top:${announcement.enabled?'44px':'0'}}
.topbar{position:sticky;top:0;z-index:100;background:var(--bg-secondary);border-bottom:1px solid var(--border-color);padding:14px 28px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px}
.topbar-brand{display:flex;align-items:center;gap:10px;font-weight:700;color:var(--text-primary);font-size:14px;letter-spacing:0.3px}
.topbar-brand .badge-logo{width:30px;height:30px;line-height:30px;text-align:center;background:var(--accent);color:#fff;border-radius:6px;font-weight:800;font-size:13px}
.topbar-links{display:flex;gap:8px;align-items:center}
.topbar-links a{color:var(--text-secondary);text-decoration:none;font-size:12.5px;font-weight:500;padding:7px 14px;border-radius:5px;transition:var(--tr);border:1px solid transparent}
.topbar-links a:hover{color:var(--text-primary);border-color:var(--border-color);background:var(--bg-primary);text-decoration:none}
.status-dot{display:inline-block;width:7px;height:7px;border-radius:50%;background:var(--success);margin-right:6px;box-shadow:0 0 0 3px ${hexToRgbStr(theme.colors.success,.2)};animation:pulse 2s infinite}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
.hero{text-align:center;padding:48px 24px 32px;max-width:900px;margin:0 auto;position:relative;z-index:10}
.hero-badge{display:inline-block;padding:6px 14px;background:${hexToRgbStr(theme.colors.accent,.1)};color:var(--accent);border:1px solid ${hexToRgbStr(theme.colors.accent,.3)};border-radius:20px;font-size:11px;font-weight:600;letter-spacing:0.8px;text-transform:uppercase;margin-bottom:20px}
.hero h1{font-size:clamp(28px,5vw,42px);font-weight:800;color:var(--text-primary);margin-bottom:12px;letter-spacing:-1px;line-height:1.15}
.hero h1 span{background:linear-gradient(135deg,var(--accent),var(--accent2));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.hero p{color:var(--text-secondary);font-size:15px;max-width:600px;margin:0 auto;line-height:1.65}
.container{max-width:1100px;margin:0 auto;padding:24px;position:relative;z-index:10}
.section{margin-bottom:48px}
.section-head{display:flex;justify-content:space-between;align-items:flex-end;gap:12px;margin-bottom:20px;flex-wrap:wrap}
.section-head h2{font-size:19px;font-weight:700;color:var(--text-primary);letter-spacing:-0.3px}
.section-head p{font-size:13px;color:var(--text-muted);margin-top:4px}
.api-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px}
.api-card{background:var(--bg-card);border:1px solid var(--border-color);border-radius:8px;padding:18px;transition:var(--tr);cursor:pointer}
.api-card:hover{border-color:var(--accent);transform:translateY(-2px)}
.api-card.active{border-color:var(--accent);background:${hexToRgbStr(theme.colors.accent,.06)};box-shadow:0 0 0 3px ${hexToRgbStr(theme.colors.accent,.15)}}
.api-card-top{display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:10px}
.api-card-name{font-size:14px;font-weight:600;color:var(--text-primary);line-height:1.3}
.api-card-tag{font-size:10px;padding:3px 7px;border-radius:4px;background:${hexToRgbStr(theme.colors.success,.15)};color:var(--success);border:1px solid ${hexToRgbStr(theme.colors.success,.3)};text-transform:uppercase;font-weight:600;letter-spacing:0.4px;white-space:nowrap}
.api-card-tag.custom{background:${hexToRgbStr(theme.colors.purple,.15)};color:var(--purple);border-color:${hexToRgbStr(theme.colors.purple,.3)}}
.api-card-ep{font-family:${theme.fonts.mono};font-size:11.5px;color:var(--text-muted);margin-bottom:10px;word-break:break-all}
.api-card-param{font-size:12px;color:var(--text-secondary);padding-top:10px;border-top:1px solid var(--border-color)}
.api-card-param code{font-size:11px}
.tester-box{background:var(--bg-card);border:1px solid var(--border-color);border-radius:10px;overflow:hidden;margin-bottom:24px}
.tester-head{padding:16px 20px;background:var(--bg-secondary);border-bottom:1px solid var(--border-color);display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px}
.tester-head h3{font-size:14px;font-weight:600;color:var(--text-primary);display:flex;align-items:center;gap:8px}
.tester-body{padding:20px}
.tester-row{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px}
@media(max-width:640px){.tester-row{grid-template-columns:1fr}}
.result-box{background:#010409;border:1px solid var(--border-color);border-radius:6px;padding:16px;font-family:${theme.fonts.mono};font-size:12px;color:#c9d1d9;max-height:500px;overflow:auto;white-space:pre;tab-size:2;line-height:1.6}
.result-box .key{color:#79c0ff}
.result-box .str{color:#a5d6ff}
.result-box .num{color:#79c0ff}
.result-box .bool{color:#ff7b72}
.result-box .null{color:#8b949e}
.result-meta{padding:10px 16px;background:var(--bg-secondary);border-top:1px solid var(--border-color);font-size:11.5px;color:var(--text-muted);font-family:${theme.fonts.mono};display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px}
.footer{text-align:center;padding:40px 24px;border-top:1px solid var(--border-color);margin-top:40px;position:relative;z-index:10;color:var(--text-muted);font-size:12.5px}
.footer a{color:var(--accent)}
.announce-bar{position:fixed;top:0;left:0;right:0;z-index:9998;padding:11px 20px;text-align:center;font-size:12.5px;font-weight:600;background:var(--accent);color:#fff}
.maint-overlay{position:fixed;inset:0;z-index:99999;background:var(--bg-primary);display:flex;align-items:center;justify-content:center;padding:40px;text-align:center}
.maint-box{max-width:500px}
.maint-icon{display:inline-block;width:72px;height:72px;line-height:72px;background:${hexToRgbStr(theme.colors.warning,.15)};color:var(--warning);border:2px solid var(--warning);border-radius:16px;font-weight:800;font-size:32px;margin-bottom:20px}
.maint-box h1{font-size:26px;font-weight:800;color:var(--warning);letter-spacing:2px;margin-bottom:12px}
.maint-box p{color:var(--text-secondary);font-size:14px}
.no-sel{user-select:none}
</style></head><body>
<div class="grid-bg"></div>
${announcementHTML}${maintenanceHTML}
<nav class="topbar">
<div class="topbar-brand"><span class="badge-logo">B</span>BRONX OSINT API</div>
<div class="topbar-links">
<a href="/test"><span class="status-dot"></span>System Status</a>
</div>
</nav>
<header class="hero">
<div class="hero-badge">V503 ULTRA · Developer Platform</div>
<h1>OSINT Intelligence <span>API Platform</span></h1>
<p>Professional grade intelligence APIs with smart DDoS protection, developer-friendly architecture, and comprehensive data endpoints.</p>
</header>
<div class="container">
<div class="section">
<div class="section-head"><div><h2>API Playground</h2><p>Select an endpoint, enter your parameter, and test the API live</p></div></div>
<div class="tester-box">
<div class="tester-head">
<h3 id="testerTitle">Select an endpoint below to begin</h3>
<span class="badge badge-info" id="testerBadge">Ready</span>
</div>
<div class="tester-body">
<div class="tester-row">
<div class="form-group"><label>API Endpoint</label>
<select id="apiSelect" class="form-input" onchange="onApiChange()">
<option value="">-- Choose API --</option>
${allAPIs.map(a => `<option value="${esc(a.endpoint)}" data-p="${esc(a.p)}" data-e="${esc(a.e)}" data-d="${esc(a.d)}" data-custom="${a.isCustom?1:0}">${esc(a.d)} (${a.isCustom?'/custom/':'/key-bronx/'}${esc(a.endpoint)})</option>`).join('')}
</select></div>
<div class="form-group"><label id="paramLabel">Parameter Value</label>
<input type="text" id="paramInput" placeholder="Enter value" onkeydown="if(event.key==='Enter')runQuery()"></div>
</div>
<div class="form-group"><label>API Key (Optional for preview)</label>
<input type="text" id="keyInput" placeholder="Paste your API key to get live result with rate limits" class="mono" style="font-size:12px"></div>
<div class="flex gap-2">
<button class="btn btn-primary" onclick="runQuery()" id="runBtn">Run Query</button>
<button class="btn" onclick="clearResult()">Clear</button>
</div>
<div class="mt-2"><label style="display:block;margin-bottom:6px;color:var(--text-secondary);font-size:11.5px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px">JSON Response</label></div>
<div class="tester-box" style="margin:0;border-radius:6px">
<div class="result-box" id="resultBox">{
  "status": "waiting",
  "message": "Select an API and run a query to see the result"
}</div>
<div class="result-meta" id="resultMeta"><span>No request made yet</span><span>Response will appear here</span></div>
</div>
</div>
</div>
</div>
<div class="section">
<div class="section-head"><div><h2>Available Endpoints</h2><p>${allAPIs.length} total APIs including custom integrations</p></div></div>
<div class="api-grid">
${allAPIs.map(a => `<div class="api-card" data-endpoint="${esc(a.endpoint)}" onclick="selectCard('${esc(a.endpoint)}')">
<div class="api-card-top"><div class="api-card-name">${esc(a.d)}</div><div class="api-card-tag ${a.isCustom?'custom':''}">${a.isCustom?'Custom':'Built-in'}</div></div>
<div class="api-card-ep">${a.isCustom?'/api/custom/':'/api/key-bronx/'}${esc(a.endpoint)}</div>
<div class="api-card-param">Param: <code>${esc(a.p)}</code> · Example: <code>${esc(a.e)}</code></div>
</div>`).join('')}
</div>
</div>
</div>
<footer class="footer">Powered by <strong style="color:var(--accent)">${esc(globalConfig.developerName)}</strong> · BRONX OSINT V503 ULTRA</footer>
<script>
const ALL_APIS = ${JSON.stringify(allAPIs)};
let currentApi = null;
function selectCard(ep){
    document.getElementById('apiSelect').value = ep;
    onApiChange();
    window.scrollTo({top:0,behavior:'smooth'});
}
function onApiChange(){
    const sel = document.getElementById('apiSelect');
    const opt = sel.options[sel.selectedIndex];
    document.querySelectorAll('.api-card').forEach(c=>c.classList.remove('active'));
    if(!sel.value){currentApi=null;document.getElementById('testerTitle').textContent='Select an endpoint below to begin';document.getElementById('testerBadge').textContent='Ready';document.getElementById('paramLabel').textContent='Parameter Value';return}
    currentApi = {endpoint:sel.value, param:opt.dataset.p, example:opt.dataset.e, name:opt.dataset.d, isCustom:opt.dataset.custom==='1'};
    document.getElementById('testerTitle').textContent = currentApi.name;
    document.getElementById('testerBadge').textContent = currentApi.isCustom?'Custom API':'Built-in API';
    document.getElementById('paramLabel').textContent = 'Parameter Value (' + currentApi.param + ')';
    document.getElementById('paramInput').value = currentApi.example||'';
    document.getElementById('paramInput').placeholder = 'e.g. ' + (currentApi.example||'value');
    const card = document.querySelector('.api-card[data-endpoint="'+currentApi.endpoint+'"]');
    if(card) card.classList.add('active');
}
async function runQuery(){
    if(!currentApi){showToast('Please select an API first','warning');return}
    const param = document.getElementById('paramInput').value.trim();
    const key = document.getElementById('keyInput').value.trim();
    if(!param){showToast('Please enter a parameter value','warning');return}
    const runBtn = document.getElementById('runBtn');
    runBtn.disabled = true; runBtn.textContent = 'Running...';
    const resultBox = document.getElementById('resultBox');
    const resultMeta = document.getElementById('resultMeta');
    const startTime = performance.now();
    try{
        let url;
        if(key){
            url = currentApi.isCustom
                ? '/api/custom/'+currentApi.endpoint+'?key='+encodeURIComponent(key)+'&'+currentApi.param+'='+encodeURIComponent(param)
                : '/api/key-bronx/'+currentApi.endpoint+'?key='+encodeURIComponent(key)+'&'+currentApi.param+'='+encodeURIComponent(param);
        } else {
            url = '/api/preview/'+currentApi.endpoint+'?'+currentApi.param+'='+encodeURIComponent(param);
        }
        const r = await fetch(url);
        const elapsed = Math.round(performance.now() - startTime);
        const ct = r.headers.get('content-type')||'';
        if(ct.includes('application/json')){
            const data = await r.json();
            resultBox.innerHTML = syntaxHighlight(data);
            resultMeta.innerHTML = '<span>Status: '+r.status+' · Time: '+elapsed+'ms</span><span>Endpoint: '+currentApi.endpoint+'</span>';
        } else {
            const text = await r.text();
            resultBox.textContent = text;
            resultMeta.innerHTML = '<span>Status: '+r.status+' · Time: '+elapsed+'ms</span><span>Plain text response</span>';
        }
    }catch(e){
        resultBox.textContent = JSON.stringify({error:e.message},null,2);
        resultMeta.innerHTML = '<span>Error</span><span>'+e.message+'</span>';
    }
    runBtn.disabled = false; runBtn.textContent = 'Run Query';
}
function clearResult(){
    document.getElementById('resultBox').textContent = '{\\n  "status": "waiting",\\n  "message": "Select an API and run a query to see the result"\\n}';
    document.getElementById('resultMeta').innerHTML = '<span>Cleared</span><span>-</span>';
}
function syntaxHighlight(obj){
    const json = JSON.stringify(obj,null,2);
    return json.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/("(\\\\u[a-zA-Z0-9]{4}|\\\\[^u]|[^\\\\"])*"(\\s*:)?|\\b(true|false|null)\\b|-?\\d+(?:\\.\\d*)?(?:[eE][+\\-]?\\d+)?)/g, function(match){
        let cls = 'num';
        if(/^"/.test(match)){cls=/:$/.test(match)?'key':'str'}
        else if(/true|false/.test(match)){cls='bool'}
        else if(/null/.test(match)){cls='null'}
        return '<span class="'+cls+'">'+match+'</span>';
    });
}
function showToast(msg,type){
    const t = document.createElement('div');
    t.className = 'toast '+(type||'info');
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(()=>t.remove(),3500);
}
</script></body></html>`;
}

// ============================================================
// ADMIN PANEL RENDERER
// ============================================================
function renderAdmin(token){
    try{
        const stoken = esc(token);
        const themesList = Object.keys(PRESETS);
        const allKeys = Object.entries(keyStorage).filter(([k,d]) => !d._hardcoded && !d.hidden).map(([k,d]) => ({
            key:k, name:d.name||'?', limit:d.unlimited?'Unlimited':d.limit, used:d.used||0,
            left:d.unlimited?'Unlimited':Math.max(0,(d.limit||0)-(d.used||0)),
            dailyLimit:d.dailyLimit||0, perSecondLimit:d.perSecondLimit||0,
            expiry:d.expiryStr||'Lifetime', isExpired:d.expiry ? isKeyExpired(d.expiry) : false,
            scopes:d.scopes||[], cooldown:d.cooldown||0, created:d.created||'',
            stopped:d.stopped||false, disabled:d.disabled||false, notes:d.notes||'',
            developerName: d.developerName || '', hiddenFields: d.hiddenFields || ''
        }));

        const endpointNames = Object.keys(endpoints);
        const customEP = customAPIs.map(a => a.endpoint);

        return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Admin · BRONX OSINT V503</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
${generateCSS()}
<style>
.main-content{padding-top:20px}
.nav-section{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--text-muted);padding:16px 20px 6px}
.tab-section{display:none}
.tab-section.active{display:block}
</style>
</head><body>
<div class="grid-bg"></div>
<div class="admin-container">
<aside class="sidebar">
<div class="sidebar-header">
<div class="sidebar-logo">B</div>
<div class="sidebar-title">BRONX V503</div>
<div class="sidebar-subtitle">Admin Console</div>
</div>
<ul class="sidebar-nav">
<div class="nav-section">Overview</div>
<li><a data-tab="dashboard" class="active" onclick="switchTab('dashboard',this)"><i class="fas fa-chart-pie"></i><span>Dashboard</span></a></li>
<li><a data-tab="stats" onclick="switchTab('stats',this)"><i class="fas fa-chart-bar"></i><span>Statistics</span></a></li>
<div class="nav-section">Keys</div>
<li><a data-tab="generate" onclick="switchTab('generate',this)"><i class="fas fa-plus"></i><span>Generate Key</span></a></li>
<li><a data-tab="keys" onclick="switchTab('keys',this)"><i class="fas fa-key"></i><span>All Keys</span></a></li>
<li><a data-tab="scopes" onclick="switchTab('scopes',this)"><i class="fas fa-bullseye"></i><span>Update Scopes</span></a></li>
<li><a data-tab="bulk" onclick="switchTab('bulk',this)"><i class="fas fa-layer-group"></i><span>Bulk Actions</span></a></li>
<li><a data-tab="pushall" onclick="switchTab('pushall',this)"><i class="fas fa-arrow-up"></i><span>Push All</span></a></li>
<div class="nav-section">APIs</div>
<li><a data-tab="endpoints" onclick="switchTab('endpoints',this)"><i class="fas fa-list"></i><span>Endpoints</span></a></li>
<li><a data-tab="responses" onclick="switchTab('responses',this)"><i class="fas fa-code"></i><span>Edit Responses</span></a></li>
<li><a data-tab="apis" onclick="switchTab('apis',this)"><i class="fas fa-plug"></i><span>Custom APIs</span></a></li>
<li><a data-tab="addapi" onclick="switchTab('addapi',this)"><i class="fas fa-plus-square"></i><span>Add API</span></a></li>
<div class="nav-section">Response Config</div>
<li><a data-tab="response-settings" onclick="switchTab('response-settings',this)"><i class="fas fa-sliders-h"></i><span>Developer & Messages</span></a></li>
<li><a data-tab="protect" onclick="switchTab('protect',this)"><i class="fas fa-shield-alt"></i><span>Protection</span></a></li>
<div class="nav-section">Security</div>
<li><a data-tab="ddos" onclick="switchTab('ddos',this)"><i class="fas fa-shield-virus"></i><span>DDoS Config</span></a></li>
<li><a data-tab="bans" onclick="switchTab('bans',this)"><i class="fas fa-ban"></i><span>Bans Manager</span></a></li>
<li><a data-tab="devices" onclick="switchTab('devices',this)"><i class="fas fa-laptop"></i><span>Devices</span></a></li>
<div class="nav-section">Logs</div>
<li><a data-tab="monitor" onclick="switchTab('monitor',this)"><i class="fas fa-desktop"></i><span>Live Monitor</span></a></li>
<li><a data-tab="audit" onclick="switchTab('audit',this)"><i class="fas fa-clipboard-list"></i><span>Audit Log</span></a></li>
<li><a data-tab="adminlogs" onclick="switchTab('adminlogs',this)"><i class="fas fa-history"></i><span>Admin Logs</span></a></li>
<div class="nav-section">System</div>
<li><a data-tab="theme" onclick="switchTab('theme',this)"><i class="fas fa-palette"></i><span>Theme</span></a></li>
<li><a data-tab="import" onclick="switchTab('import',this)"><i class="fas fa-download"></i><span>Import</span></a></li>
<li><a data-tab="export" onclick="switchTab('export',this)"><i class="fas fa-upload"></i><span>Export</span></a></li>
<li><a data-tab="backup" onclick="switchTab('backup',this)"><i class="fas fa-database"></i><span>Backup / Restore</span></a></li>
<li><a data-tab="announce" onclick="switchTab('announce',this)"><i class="fas fa-bullhorn"></i><span>Announcement</span></a></li>
<li><a data-tab="maintenance" onclick="switchTab('maintenance',this)"><i class="fas fa-wrench"></i><span>Maintenance</span></a></li>
<li><a data-tab="settings" onclick="switchTab('settings',this)"><i class="fas fa-cog"></i><span>Settings</span></a></li>
</ul>
</aside>
<main class="main-content">
<div class="stats-grid">
<div class="stat-card"><div class="stat-icon">Total Keys</div><div class="stat-value" id="hdKeys">${allKeys.length}</div><div class="stat-label">Generated</div></div>
<div class="stat-card"><div class="stat-icon">Today</div><div class="stat-value" id="statToday">-</div><div class="stat-label">Requests</div></div>
<div class="stat-card"><div class="stat-icon">Total</div><div class="stat-value" id="statTotal">-</div><div class="stat-label">Requests</div></div>
<div class="stat-card"><div class="stat-icon">Bans</div><div class="stat-value" id="statBans">-</div><div class="stat-label">Active</div></div>
<div class="stat-card"><div class="stat-icon">Devices</div><div class="stat-value" id="statDevices">-</div><div class="stat-label">Tracked</div></div>
<div class="stat-card"><div class="stat-icon">APIs</div><div class="stat-value" id="hdAPIs">${customAPIs.length}</div><div class="stat-label">Custom</div></div>
</div>

<div class="tab-section active" id="tab-dashboard">
<div class="card">
<h3><i class="fas fa-fire"></i> Overview</h3>
<div class="grid-4">
<div class="stat-card"><div class="stat-icon">Today</div><div class="stat-value" id="dashToday">-</div><div class="stat-label">Requests</div></div>
<div class="stat-card"><div class="stat-icon">Week</div><div class="stat-value" id="dashWeek">-</div><div class="stat-label">Requests</div></div>
<div class="stat-card"><div class="stat-icon">Month</div><div class="stat-value" id="dashMonth">-</div><div class="stat-label">Requests</div></div>
<div class="stat-card"><div class="stat-icon">Total</div><div class="stat-value" id="dashTotal">-</div><div class="stat-label">Requests</div></div>
</div>
</div>
<div class="card">
<h3><i class="fas fa-trophy"></i> Top Keys</h3>
<div class="table-container"><table><thead><tr><th>Key</th><th>Requests</th></tr></thead><tbody id="topKeysBody"><tr><td colspan="2" class="empty">Loading...</td></tr></tbody></table></div>
</div>
</div>

<div class="tab-section" id="tab-generate">
<div class="card">
<h3><i class="fas fa-wand-magic-sparkles"></i> Generate New Key</h3>
<div class="form-group"><label>Key ID (leave empty for random)</label><input type="text" id="gk" placeholder="MY_CUSTOM_KEY"></div>
<button class="btn btn-warning btn-block mb-2" onclick="randomKey()"><i class="fas fa-dice"></i> Generate Random Key ID</button>
<div class="form-group"><label>Owner Name *</label><input type="text" id="go" placeholder="Client or user name"></div>
<div class="form-group"><label>Custom Developer Name (optional)</label><input type="text" id="gdev" placeholder="Leave empty to use global default"></div>
<div class="form-group"><label>Custom Hidden Fields (optional, comma-separated)</label><input type="text" id="ghidden" placeholder="e.g. credit,by,channel"></div>
<div class="grid-3">
<div class="form-group"><label>Total Limit</label><input type="number" id="gl" value="100"></div>
<div class="form-group"><label>Daily (0 = unlimited)</label><input type="number" id="gdl" value="0"></div>
<div class="form-group"><label>Per Sec (0 = unlimited)</label><input type="number" id="gpsl" value="0"></div>
</div>
<div class="grid-2">
<div class="form-group"><label>Cooldown (sec)</label><input type="number" id="gc" value="0"></div>
<div class="form-group"><label>Days Valid</label><input type="number" id="gd" value="30"></div>
</div>
<div class="form-group"><label>Notes</label><input type="text" id="gnotes" placeholder="Optional"></div>
<div class="form-group"><label>Scopes</label>
<div class="scope-box" id="scopeBoxGenerate">
<label class="scope-item checked"><input type="checkbox" value="*" checked> <span>All Access</span></label>
</div></div>
<button class="btn btn-primary btn-block" onclick="generateKey()"><i class="fas fa-rocket"></i> Generate Key</button>
</div>
</div>

<div class="tab-section" id="tab-keys">
<div class="card">
<h3><i class="fas fa-key"></i> All Keys (<span id="keysCount">${allKeys.length}</span>)</h3>
<div class="flex-between mb-2">
<input type="text" id="keysFilter" placeholder="Filter by key or owner..." style="flex:1;min-width:200px" oninput="filterKeys()">
<button class="btn" onclick="loadKeys()"><i class="fas fa-sync"></i></button>
</div>
<div class="table-container" style="max-height:620px">
<table>
<thead><tr><th><input type="checkbox" id="selectAll" onclick="toggleAllKeys(this)"></th><th>Key</th><th>Owner</th><th>Limit</th><th>Used</th><th>Left</th><th>Expiry</th><th>Dev Name</th><th>Status</th><th>Actions</th></tr></thead>
<tbody id="keysBody"><tr><td colspan="10" class="empty">Loading...</td></tr></tbody>
</table>
</div>
</div>
</div>

<div class="tab-section" id="tab-endpoints">
<div class="card">
<h3><i class="fas fa-list"></i> Endpoints (${endpointNames.length})</h3>
<div class="table-container">
<table><thead><tr><th>Endpoint</th><th>Description</th><th>Parameter</th><th>Example</th><th>URL</th></tr></thead><tbody>
${endpointNames.map(n => `<tr><td><code>${esc(n)}</code></td><td>${esc(endpoints[n].d)}</td><td><code>${esc(endpoints[n].p)}</code></td><td><code>${esc(endpoints[n].e)}</code></td><td class="mono" style="font-size:11px">/api/key-bronx/${esc(n)}?key=KEY&${esc(endpoints[n].p)}=VALUE</td></tr>`).join('')}
</tbody></table>
</div>
</div>
</div>

<div class="tab-section" id="tab-responses">
<div class="card">
<h3><i class="fas fa-code"></i> Edit Endpoint Responses (JSON)</h3>
<p class="text-muted mb-2" style="font-size:12px">This JSON will be shown to users on the public dashboard when they test any endpoint. Users will see this exact response in the "JSON Response" area.</p>
<div class="form-group"><label>Endpoint</label>
<select id="responseEndpoint" class="form-input" onchange="loadResponse()">
${endpointNames.map(e => `<option value="${e}">${esc(endpoints[e].d)} (/${e})</option>`).join('')}
${customAPIs.map(a => `<option value="${esc(a.endpoint)}">${esc(a.name)} (/${esc(a.endpoint)}) — Custom</option>`).join('')}
</select></div>
<div class="form-group"><label>Response JSON (leave empty for default)</label>
<textarea id="responseData" rows="12" placeholder='{\n  "status": "success",\n  "data": {...}\n}'></textarea></div>
<button class="btn btn-primary btn-block" onclick="updateResponse()"><i class="fas fa-save"></i> Save Response</button>
</div>
</div>

<div class="tab-section" id="tab-response-settings">
<div class="card">
<h3><i class="fas fa-sliders-h"></i> Global Response Settings</h3>
<div class="form-group"><label>Global Developer Name (shown at bottom of all API responses)</label>
<input type="text" id="rs-devName" value="${esc(globalConfig.developerName)}"></div>
<div class="form-group"><label>Show Developer Name in responses</label>
<select id="rs-showDevName"><option value="true" ${globalConfig.showDevName?'selected':''}>Yes — Show developer name</option><option value="false" ${!globalConfig.showDevName?'selected':''}>No — Hide completely</option></select></div>
<div class="form-group"><label>Global Hidden Fields (comma-separated, will be removed from ALL responses)</label>
<textarea id="rs-hiddenFields" rows="3">${esc(globalConfig.hiddenFields)}</textarea></div>
<hr class="divider">
<h4>Custom Error Messages (plain text, emojis supported)</h4>
<div class="grid-2">
<div class="form-group"><label>Key Not Found</label><input type="text" id="msg-keyNotFound" value="${esc(customMessages.keyNotFound)}"></div>
<div class="form-group"><label>Limit Reached ({used} and {limit} are replaced)</label><input type="text" id="msg-limitReached" value="${esc(customMessages.limitReached)}"></div>
<div class="form-group"><label>Key Stopped</label><input type="text" id="msg-keyStopped" value="${esc(customMessages.keyStopped)}"></div>
<div class="form-group"><label>Key Disabled</label><input type="text" id="msg-keyDisabled" value="${esc(customMessages.keyDisabled)}"></div>
<div class="form-group"><label>Key Expired ({date} is replaced)</label><input type="text" id="msg-keyExpired" value="${esc(customMessages.keyExpired)}"></div>
<div class="form-group"><label>Missing Key</label><input type="text" id="msg-missingKey" value="${esc(customMessages.missingKey)}"></div>
<div class="form-group"><label>Scope Denied</label><input type="text" id="msg-scopeDenied" value="${esc(customMessages.scopeDenied)}"></div>
<div class="form-group"><label>Protected Data</label><input type="text" id="msg-protected" value="${esc(customMessages.protected)}"></div>
<div class="form-group"><label>API Error</label><input type="text" id="msg-apiError" value="${esc(customMessages.apiError)}"></div>
</div>
<button class="btn btn-primary btn-block" onclick="saveResponseSettings()"><i class="fas fa-save"></i> Save All Settings</button>
</div>
</div>

<div class="tab-section" id="tab-monitor">
<div class="card">
<h3><i class="fas fa-desktop"></i> Live Monitor</h3>
<div class="flex-between mb-2">
<input type="text" id="monitorFilter" placeholder="Filter logs..." style="flex:1;min-width:200px" oninput="renderMonitor()">
<button class="btn" onclick="loadMonitorLogs()"><i class="fas fa-sync"></i></button>
</div>
<div class="table-container" style="max-height:500px">
<table><thead><tr><th>Time</th><th>Key</th><th>Endpoint</th><th>IP</th><th>Device</th><th>Browser</th></tr></thead><tbody id="monitorBody"><tr><td colspan="6" class="empty">Loading...</td></tr></tbody></table>
</div>
</div>
</div>

<div class="tab-section" id="tab-stats">
<div class="card">
<h3><i class="fas fa-chart-bar"></i> Statistics</h3>
<div class="grid-4">
<div class="stat-card"><div class="stat-icon">Total</div><div class="stat-value" id="statTotalReqs">-</div><div class="stat-label">All Time</div></div>
<div class="stat-card"><div class="stat-icon">Today</div><div class="stat-value" id="statTodayReqs">-</div><div class="stat-label">Requests</div></div>
<div class="stat-card"><div class="stat-icon">Week</div><div class="stat-value" id="statWeekReqs">-</div><div class="stat-label">Requests</div></div>
<div class="stat-card"><div class="stat-icon">Month</div><div class="stat-value" id="statMonthReqs">-</div><div class="stat-label">Requests</div></div>
</div>
</div>
<div class="card">
<h3><i class="fas fa-chart-pie"></i> Top Endpoints</h3>
<div class="table-container"><table><thead><tr><th>Endpoint</th><th>Requests</th></tr></thead><tbody id="topEndpointsBody"><tr><td colspan="2" class="empty">Loading...</td></tr></tbody></table></div>
</div>
</div>

<div class="tab-section" id="tab-theme">
<div class="card">
<h3><i class="fas fa-palette"></i> Theme</h3>
<div class="grid-3">
${themesList.map(name => `<div class="api-card" style="cursor:pointer;text-align:center" onclick="applyPresetByName('${name}')"><div style="height:48px;border-radius:6px;margin-bottom:12px;background:linear-gradient(135deg,${PRESETS[name].accent},${PRESETS[name].accent2})"></div><div style="font-weight:600;color:var(--text-primary)">${name}</div></div>`).join('')}
</div>
</div>
</div>

<div class="tab-section" id="tab-import">
<div class="card">
<h3><i class="fas fa-download"></i> Import Data</h3>
<div class="form-group"><label>Upload JSON File (keys or full backup)</label>
<input type="file" id="importFile" accept=".json" onchange="handleFileImport(this)"></div>
<div class="form-group"><label>Or paste JSON manually</label>
<textarea id="importData" rows="10" placeholder='{"keys": {...}, "apis": [...]}'></textarea></div>
<button class="btn btn-primary btn-block" onclick="importKeys()"><i class="fas fa-download"></i> Import</button>
<p id="importMsg" class="text-center mt-2" style="font-size:12.5px"></p>
</div>
</div>

<div class="tab-section" id="tab-export">
<div class="card">
<h3><i class="fas fa-upload"></i> Export Keys</h3>
<p class="text-muted mb-2" style="font-size:12.5px">Copy or download all your generated keys as JSON. Use the Import tab to restore them later.</p>
<textarea id="exportData" rows="12" readonly placeholder="Click Load below to fetch keys"></textarea>
<div class="grid-2 mt-2">
<button class="btn btn-primary" onclick="loadExport()"><i class="fas fa-sync"></i> Load</button>
<button class="btn btn-success" onclick="copyExport()"><i class="fas fa-copy"></i> Copy</button>
</div>
<button class="btn btn-warning btn-block mt-2" onclick="downloadExport()"><i class="fas fa-download"></i> Download JSON File</button>
</div>
</div>

<div class="tab-section" id="tab-backup">
<div class="card">
<h3><i class="fas fa-database"></i> Full Backup</h3>
<p class="text-muted mb-2" style="font-size:12.5px">Download complete backup: keys, custom APIs, responses, settings, themes, everything.</p>
<button class="btn btn-success btn-block mb-2" onclick="downloadFullBackup()"><i class="fas fa-download"></i> Download Full Backup</button>
<hr class="divider">
<h4>Restore from Backup</h4>
<div class="form-group"><label>Upload backup JSON file</label><input type="file" id="restoreFile" accept=".json" onchange="handleRestoreFile(this)"></div>
<div class="form-group"><label>Or paste backup JSON</label><textarea id="restoreData" rows="8" placeholder="Paste backup JSON here"></textarea></div>
<button class="btn btn-warning btn-block" onclick="restoreData()"><i class="fas fa-upload"></i> Restore Backup</button>
</div>
</div>

<div class="tab-section" id="tab-scopes">
<div class="card">
<h3><i class="fas fa-bullseye"></i> Update Key Scopes</h3>
<div class="form-group"><label>Key Name</label><input type="text" id="sk" placeholder="Enter key name"></div>
<div class="form-group"><label>Scopes</label>
<div class="scope-box" id="scopeBoxUpdate">
<label class="scope-item"><input type="checkbox" value="*"> <span>All Access</span></label>
<label class="scope-item"><input type="checkbox" value="custom"> <span>All Custom APIs</span></label>
${endpointNames.map(n => `<label class="scope-item"><input type="checkbox" value="${esc(n)}"> <span>${esc(n)}</span></label>`).join('')}
</div></div>
<button class="btn btn-primary btn-block" onclick="updateScopes()"><i class="fas fa-save"></i> Update Scopes</button>
</div>
</div>

<div class="tab-section" id="tab-protect">
<div class="card">
<h3><i class="fas fa-shield-alt"></i> Data Protection</h3>
<div class="form-group"><label>Value to Protect (numbers, IDs blocked from lookup)</label><input type="text" id="protVal" placeholder="e.g. 9876543210"></div>
<button class="btn btn-primary btn-block" onclick="addProtection()"><i class="fas fa-lock"></i> Add Protection</button>
<div class="table-container mt-2" id="protectList"><table><thead><tr><th>Protected Value</th><th>Action</th></tr></thead><tbody id="protectBody"><tr><td colspan="2" class="empty">Loading...</td></tr></tbody></table></div>
</div>
</div>

<div class="tab-section" id="tab-apis">
<div class="card">
<h3><i class="fas fa-plug"></i> Custom APIs (<span id="apiCount">${customAPIs.length}</span>)</h3>
<div class="table-container" style="max-height:550px">
<table><thead><tr><th>Name</th><th>Endpoint</th><th>Param</th><th>Visible</th><th>Actions</th></tr></thead><tbody id="apisBody"><tr><td colspan="5" class="empty">Loading...</td></tr></tbody></table>
</div>
</div>
</div>

<div class="tab-section" id="tab-addapi">
<div class="card">
<h3><i class="fas fa-plus-square"></i> Add Custom API</h3>
<div class="form-group"><label>Name *</label><input type="text" id="aname" placeholder="My API"></div>
<div class="form-group"><label>Endpoint (lowercase, dashes only) *</label><input type="text" id="aep" placeholder="my-api"></div>
<div class="grid-2">
<div class="form-group"><label>Parameter Name</label><input type="text" id="aparam" value="num"></div>
<div class="form-group"><label>Example Value</label><input type="text" id="aex" placeholder="9876543210"></div>
</div>
<div class="form-group"><label>Real API URL (use {param} placeholder)</label><input type="text" id="aurl" placeholder="https://api.example.com?q={param}"></div>
<div class="form-group"><label>Description</label><input type="text" id="adesc" placeholder="Short description"></div>
<button class="btn btn-primary btn-block" onclick="addAPI()"><i class="fas fa-plus"></i> Add API</button>
</div>
</div>

<div class="tab-section" id="tab-ddos">
<div class="card">
<h3><i class="fas fa-shield-virus"></i> DDoS Configuration</h3>
<div class="form-group"><label>Protection Mode</label>
<select id="ddosMode">
<option value="off" ${ddosConfig.mode==='off'?'selected':''}>Off — No protection</option>
<option value="smart" ${ddosConfig.mode==='smart'?'selected':''}>Smart — Recommended (balanced)</option>
<option value="strict" ${ddosConfig.mode==='strict'?'selected':''}>Strict — 70% stricter limits</option>
</select></div>
<div class="grid-3">
<div class="form-group"><label>IP Burst / 10s</label><input type="number" id="ddosIP10" value="${ddosConfig.ip.burst10s}"></div>
<div class="form-group"><label>IP / Minute</label><input type="number" id="ddosIP1M" value="${ddosConfig.ip.perMinute}"></div>
<div class="form-group"><label>IP / Hour</label><input type="number" id="ddosIP1H" value="${ddosConfig.ip.perHour}"></div>
</div>
<button class="btn btn-primary btn-block" onclick="saveDDOS()"><i class="fas fa-save"></i> Save Configuration</button>
<button class="btn btn-warning btn-block mt-2" onclick="clearAllStrikes()"><i class="fas fa-eraser"></i> Clear All Strikes</button>
</div>
</div>

<div class="tab-section" id="tab-bans">
<div class="card">
<h3><i class="fas fa-ban"></i> Bans Manager</h3>
<div class="grid-3 mb-2">
<select id="banType"><option value="ip">IP</option><option value="device">Device</option><option value="key">Key</option></select>
<input type="text" id="banId" placeholder="Value to ban">
<button class="btn btn-danger" onclick="manualBan()"><i class="fas fa-ban"></i> Ban</button>
</div>
<div class="table-container"><table><thead><tr><th>Type</th><th>ID</th><th>Reason</th><th>Until</th><th>Action</th></tr></thead><tbody id="bansBody"><tr><td colspan="5" class="empty">Loading...</td></tr></tbody></table></div>
<button class="btn btn-warning btn-block mt-2" onclick="unbanAll()"><i class="fas fa-unlock"></i> Unban All</button>
</div>
</div>

<div class="tab-section" id="tab-devices">
<div class="card">
<h3><i class="fas fa-laptop"></i> Tracked Devices</h3>
<div class="table-container" style="max-height:600px">
<table><thead><tr><th>Device ID</th><th>Type</th><th>OS</th><th>Requests</th><th>Last Seen</th><th>Status</th><th>Action</th></tr></thead><tbody id="devicesBody"><tr><td colspan="7" class="empty">Loading...</td></tr></tbody></table>
</div>
</div>
</div>

<div class="tab-section" id="tab-bulk">
<div class="card">
<h3><i class="fas fa-layer-group"></i> Bulk Actions</h3>
<p class="text-warning mb-2" style="font-size:12.5px">Select keys from the "All Keys" tab first.</p>
<p class="text-center mb-2" id="bulkCount" style="color:var(--accent);font-size:13px">0 keys selected</p>
<div class="grid-2">
<button class="btn btn-success" onclick="bulkAction('bulk-reset')"><i class="fas fa-sync"></i> Reset Usage</button>
<button class="btn btn-warning" onclick="bulkAction('bulk-stop',true)"><i class="fas fa-pause"></i> Stop</button>
<button class="btn btn-primary" onclick="bulkAction('bulk-stop',false)"><i class="fas fa-play"></i> Activate</button>
<button class="btn btn-warning" onclick="bulkAction('bulk-disable',true)"><i class="fas fa-ban"></i> Disable</button>
<button class="btn btn-primary" onclick="bulkAction('bulk-disable',false)"><i class="fas fa-check"></i> Enable</button>
<button class="btn btn-danger" onclick="bulkAction('bulk-delete')"><i class="fas fa-trash"></i> Delete</button>
</div>
<div class="flex gap-2 mt-2">
<input type="number" id="bulkPushDays" value="30" placeholder="Days">
<button class="btn btn-warning" onclick="bulkPush()" style="white-space:nowrap"><i class="fas fa-arrow-up"></i> Push Days</button>
</div>
</div>
</div>

<div class="tab-section" id="tab-pushall">
<div class="card">
<h3><i class="fas fa-arrow-up"></i> Push All Keys</h3>
<div class="form-group"><label>Days to add to ALL keys</label><input type="number" id="pushAllDays" value="30"></div>
<button class="btn btn-warning btn-block" onclick="pushAllKeys()"><i class="fas fa-arrow-up"></i> Push All Keys</button>
</div>
</div>

<div class="tab-section" id="tab-announce">
<div class="card">
<h3><i class="fas fa-bullhorn"></i> Announcement</h3>
<div class="form-group"><label>Enable</label>
<select id="annEnabled"><option value="false" ${!announcement.enabled?'selected':''}>Off</option><option value="true" ${announcement.enabled?'selected':''}>On</option></select></div>
<div class="form-group"><label>Text</label><input type="text" id="annText" value="${esc(announcement.text)}" placeholder="Welcome to BRONX OSINT!"></div>
<button class="btn btn-primary btn-block" onclick="saveAnnouncement()"><i class="fas fa-save"></i> Save</button>
</div>
</div>

<div class="tab-section" id="tab-maintenance">
<div class="card">
<h3><i class="fas fa-wrench"></i> Maintenance Mode</h3>
<div class="form-group"><label>Enable</label>
<select id="mtEnabled"><option value="false" ${!maintenance.enabled?'selected':''}>Off</option><option value="true" ${maintenance.enabled?'selected':''}>On</option></select></div>
<div class="form-group"><label>Message</label><input type="text" id="mtMessage" value="${esc(maintenance.message)}"></div>
<button class="btn btn-warning btn-block" onclick="saveMaintenance()"><i class="fas fa-save"></i> Save</button>
</div>
</div>

<div class="tab-section" id="tab-audit">
<div class="card">
<h3><i class="fas fa-clipboard-list"></i> Audit Log</h3>
<div class="table-container" style="max-height:520px">
<table><thead><tr><th>Time</th><th>User</th><th>Action</th><th>Details</th></tr></thead><tbody id="auditBody"><tr><td colspan="4" class="empty">Loading...</td></tr></tbody></table>
</div>
</div>
</div>

<div class="tab-section" id="tab-adminlogs">
<div class="card">
<h3><i class="fas fa-history"></i> Admin Logs</h3>
<div class="table-container" style="max-height:520px">
<table><thead><tr><th>Time</th><th>User</th><th>Action</th><th>IP</th><th>Status</th></tr></thead><tbody id="adminLogsBody"><tr><td colspan="5" class="empty">Loading...</td></tr></tbody></table>
</div>
</div>
</div>

<div class="tab-section" id="tab-settings">
<div class="card">
<h3><i class="fas fa-cog"></i> System Settings</h3>
<button class="btn btn-warning btn-block mb-2" onclick="resetAll()"><i class="fas fa-sync"></i> Reset All Key Usage</button>
<button class="btn btn-danger btn-block mb-2" onclick="clearLogs()"><i class="fas fa-trash"></i> Clear All Logs</button>
<button class="btn btn-warning btn-block mb-2" onclick="unbanAll()"><i class="fas fa-unlock"></i> Unban All</button>
<button class="btn btn-warning btn-block" onclick="clearAllStrikes()"><i class="fas fa-eraser"></i> Clear All Strikes</button>
</div>
</div>

</main>
</div>
<script>
const TOKEN = '${stoken}';
const ADMIN_PATH = '${ADMIN_PATH}';
const ENDPOINTS_LIST = ${JSON.stringify(endpointNames)};
const CUSTOM_APIS_INIT = ${JSON.stringify(customAPIs)};
const ALL_KEYS_INIT = ${JSON.stringify(allKeys)};
const INITIAL_ANNOUNCEMENT = ${JSON.stringify(announcement)};
const INITIAL_MAINTENANCE = ${JSON.stringify(maintenance)};

let ALL_KEYS = ALL_KEYS_INIT.slice();
let selectedKeys = new Set();
let MONITOR_LOGS = [];

function h(tag){ return document.querySelector('#'+tag); }
function api(path){ return ADMIN_PATH + path + (path.includes('?')?'&':'?') + 'token=' + TOKEN; }
function apiPost(path, body){
    return fetch(ADMIN_PATH + path + '?token=' + TOKEN, {
        method:'POST',
        headers:{'Content-Type':'application/json','x-admin-token':TOKEN},
        body: JSON.stringify(body||{})
    }).then(r => r.json());
}
function apiGet(path){
    return fetch(ADMIN_PATH + path + (path.includes('?')?'&':'?') + 'token=' + TOKEN, {
        headers:{'x-admin-token':TOKEN}
    }).then(r => r.json());
}
function toast(msg,type){
    const t = document.createElement('div');
    t.className = 'toast '+(type||'info');
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(()=>t.remove(),3200);
}
function esc(s){ return s==null?'':String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'})[m]); }

function switchTab(name, el){
    document.querySelectorAll('.tab-section').forEach(x => x.classList.remove('active'));
    document.querySelectorAll('.sidebar-nav a').forEach(x => x.classList.remove('active'));
    const sec = document.getElementById('tab-'+name);
    if(sec) sec.classList.add('active');
    if(el) el.classList.add('active');
    document.querySelector('.main-content').scrollTo(0,0);
    // load data per tab
    if(name==='dashboard') loadDashboard();
    if(name==='keys') loadKeys();
    if(name==='monitor') loadMonitorLogs();
    if(name==='stats') loadStats();
    if(name==='bans') loadBans();
    if(name==='devices') loadDevices();
    if(name==='audit') loadAudit();
    if(name==='adminlogs') loadAdminLogs();
    if(name==='apis') loadCustomAPIs();
    if(name==='protect') loadProtectList();
    if(name==='responses') loadResponse();
}

// ---- Dashboard ----
async function loadDashboard(){
    try{
        const d = await apiGet('/stats');
        h('statToday').textContent = d.todayRequests || 0;
        h('statTotal').textContent = d.totalRequests || 0;
        h('statBans').textContent = (Object.keys(${JSON.stringify({})}) ? 0 : 0);
        h('dashToday').textContent = d.todayRequests || 0;
        h('dashWeek').textContent = d.weeklyRequests || 0;
        h('dashMonth').textContent = d.monthlyRequests || 0;
        h('dashTotal').textContent = d.totalRequests || 0;
        const tk = h('topKeysBody');
        if(!d.topKeys || !d.topKeys.length){ tk.innerHTML = '<tr><td colspan="2" class="empty">No data yet</td></tr>'; }
        else { tk.innerHTML = d.topKeys.map(x => '<tr><td><code>'+esc(x.k)+'</code></td><td>'+x.v+'</td></tr>').join(''); }
    }catch(e){ console.log(e); }
    try{
        const stats = await apiGet('/stats');
        h('statDevices').textContent = Object.keys(stats.topDevices||{}).length || 0;
    }catch(e){}
    try{
        const b = await apiGet('/bans');
        const c = (b.ip||[]).length + (b.device||[]).length + (b.key||[]).length;
        h('statBans').textContent = c;
    }catch(e){}
}

// ---- Generate ----
function randomKey(){
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let s = 'BRONX_';
    for(let i=0;i<16;i++) s += chars[Math.floor(Math.random()*chars.length)];
    h('gk').value = s;
}
async function generateKey(){
    const scopes = Array.from(document.querySelectorAll('#scopeBoxGenerate input[type=checkbox]:checked')).map(c=>c.value);
    const body = {
        keyName: h('gk').value.trim(),
        keyOwner: h('go').value.trim(),
        developerName: h('gdev').value.trim(),
        hiddenFields: h('ghidden').value.trim(),
        limit: h('gl').value,
        dailyLimit: h('gdl').value,
        perSecondLimit: h('gpsl').value,
        cooldown: h('gc').value,
        days: h('gd').value,
        notes: h('gnotes').value,
        scopes: scopes.length ? scopes : ['*']
    };
    if(!body.keyOwner){ toast('Owner name required','warning'); return; }
    const r = await apiPost('/generate-key', body);
    if(r.success){ toast('Key generated: '+r.key,'success'); h('gk').value=''; h('go').value=''; h('gdev').value=''; h('ghidden').value=''; loadKeys(); }
    else toast(r.e||'Failed','error');
}

// ---- Keys ----
function renderKeys(filter){
    const q = (filter||'').toLowerCase();
    const body = h('keysBody');
    if(!ALL_KEYS.length){ body.innerHTML = '<tr><td colspan="10" class="empty">No keys yet. Generate one to get started.</td></tr>'; return; }
    const rows = ALL_KEYS.filter(k => !q || k.key.toLowerCase().includes(q) || (k.name||'').toLowerCase().includes(q));
    if(!rows.length){ body.innerHTML = '<tr><td colspan="10" class="empty">No matching keys</td></tr>'; return; }
    body.innerHTML = rows.map(k => {
        const status = k.stopped ? '<span class="badge badge-warning">Stopped</span>' : k.disabled ? '<span class="badge badge-muted">Disabled</span>' : k.isExpired ? '<span class="badge badge-danger">Expired</span>' : '<span class="badge badge-success">Active</span>';
        return '<tr>'+
            '<td><input type="checkbox" data-key="'+esc(k.key)+'" '+(selectedKeys.has(k.key)?'checked':'')+' onchange="toggleKeySelection(this)"></td>'+
            '<td><code style="font-size:10.5px">'+esc(k.key)+'</code></td>'+
            '<td>'+esc(k.name)+'</td>'+
            '<td>'+esc(k.limit)+'</td>'+
            '<td>'+esc(k.used)+'</td>'+
            '<td>'+esc(k.left)+'</td>'+
            '<td style="font-size:11px">'+esc(k.expiry)+'</td>'+
            '<td style="font-size:11px;color:var(--accent)">'+esc(k.developerName||'—')+'</td>'+
            '<td>'+status+'</td>'+
            '<td style="white-space:nowrap">'+
                '<button class="btn btn-sm" onclick="editKeyUI(\''+esc(k.key)+'\')" title="Edit">Edit</button> '+
                '<button class="btn btn-sm" onclick="cloneKey(\''+esc(k.key)+'\')" title="Clone">Clone</button> '+
                '<button class="btn btn-sm btn-warning" onclick="stopKey(\''+esc(k.key)+'\')">'+(k.stopped?'Start':'Stop')+'</button> '+
                '<button class="btn btn-sm btn-danger" onclick="deleteKey(\''+esc(k.key)+'\')">Del</button>'+
            '</td>'+
            '</tr>';
    }).join('');
}
async function loadKeys(){
    const r = await apiGet('/export-keys');
    if(r.keys){
        ALL_KEYS = Object.entries(r.keys).map(([k,d]) => ({
            key:k, name:d.name||'?', limit:d.unlimited?'Unlimited':d.limit, used:d.used||0,
            left:d.unlimited?'Unlimited':Math.max(0,(d.limit||0)-(d.used||0)),
            dailyLimit:d.dailyLimit||0, perSecondLimit:d.perSecondLimit||0,
            expiry:d.expiryStr||'Lifetime', isExpired:d.expiry ? false : false,
            scopes:d.scopes||[], cooldown:d.cooldown||0, created:d.created||'',
            stopped:d.stopped||false, disabled:d.disabled||false, notes:d.notes||'',
            developerName: d.developerName || '', hiddenFields: d.hiddenFields || ''
        }));
        h('keysCount').textContent = ALL_KEYS.length;
        h('hdKeys').textContent = ALL_KEYS.length;
        renderKeys(h('keysFilter').value);
    }
}
function filterKeys(){ renderKeys(h('keysFilter').value); }
function toggleKeySelection(el){
    if(el.checked) selectedKeys.add(el.dataset.key); else selectedKeys.delete(el.dataset.key);
    updateBulkCount();
}
function toggleAllKeys(el){
    document.querySelectorAll('#keysBody input[type=checkbox]').forEach(c => {
        c.checked = el.checked;
        if(el.checked) selectedKeys.add(c.dataset.key); else selectedKeys.delete(c.dataset.key);
    });
    updateBulkCount();
}
function updateBulkCount(){ h('bulkCount').textContent = selectedKeys.size + ' keys selected'; }

async function editKeyUI(key){
    const k = ALL_KEYS.find(x => x.key===key); if(!k) return;
    const newDev = prompt('Custom developer name (leave empty for global):', k.developerName||'');
    if(newDev === null) return;
    const newHidden = prompt('Custom hidden fields (comma-separated, leave empty for global):', k.hiddenFields||'');
    if(newHidden === null) return;
    const newLimit = prompt('New total limit:', k.limit==='Unlimited'?'0':k.limit);
    if(newLimit === null) return;
    const r = await apiPost('/edit-key', { keyName:key, newDeveloperName:newDev, newHiddenFields:newHidden, newLimit:newLimit });
    if(r.success){ toast('Key updated','success'); loadKeys(); } else toast(r.e||'Failed','error');
}
async function cloneKey(key){
    if(!confirm('Clone key '+key+'?')) return;
    const r = await apiPost('/clone-key', { keyName:key });
    if(r.success){ toast('Cloned as '+r.key,'success'); loadKeys(); } else toast(r.e||'Failed','error');
}
async function stopKey(key){
    const r = await apiPost('/stop-key', { keyName:key });
    if(r.success){ toast(r.stopped?'Stopped':'Resumed','success'); loadKeys(); } else toast(r.e||'Failed','error');
}
async function deleteKey(key){
    if(!confirm('Delete key '+key+'? This cannot be undone.')) return;
    const r = await apiPost('/delete-key', { keyName:key });
    if(r.success){ toast('Deleted','success'); loadKeys(); } else toast(r.e||'Failed','error');
}

// ---- Responses ----
async function loadResponse(){
    const ep = h('responseEndpoint').value;
    const r = await apiGet('/get-endpoint-response?endpoint='+encodeURIComponent(ep));
    h('responseData').value = r.data ? JSON.stringify(r.data, null, 2) : '';
}
async function updateResponse(){
    const ep = h('responseEndpoint').value;
    const data = h('responseData').value.trim();
    if(data){
        try{ JSON.parse(data); }catch(e){ toast('Invalid JSON: '+e.message,'error'); return; }
    }
    const r = await apiPost('/update-endpoint-response', { endpoint:ep, responseData: data });
    if(r.success) toast('Response saved','success'); else toast(r.e||'Failed','error');
}

// ---- Response Settings ----
async function saveResponseSettings(){
    const messages = {};
    ['keyNotFound','limitReached','keyStopped','keyDisabled','keyExpired','missingKey','scopeDenied','protected','apiError'].forEach(k => {
        const el = h('msg-'+k);
        if(el) messages[k] = el.value;
    });
    const body = {
        developerName: h('rs-devName').value,
        showDevName: h('rs-showDevName').value === 'true',
        hiddenFields: h('rs-hiddenFields').value,
        messages
    };
    const r = await apiPost('/update-response-settings', body);
    if(r.success) toast('Settings saved','success'); else toast(r.e||'Failed','error');
}

// ---- Monitor ----
async function loadMonitorLogs(){
    const r = await apiGet('/monitor-logs');
    MONITOR_LOGS = r.logs || [];
    renderMonitor();
}
function renderMonitor(){
    const q = (h('monitorFilter').value||'').toLowerCase();
    const rows = MONITOR_LOGS.filter(l => !q || JSON.stringify(l).toLowerCase().includes(q));
    const body = h('monitorBody');
    if(!rows.length){ body.innerHTML = '<tr><td colspan="6" class="empty">No logs yet</td></tr>'; return; }
    body.innerHTML = rows.slice(-300).reverse().map(l => '<tr>'+
        '<td style="font-size:11px;color:var(--text-muted)">'+esc(l.timestamp)+'</td>'+
        '<td><code style="font-size:10.5px">'+esc(l.key)+'</code></td>'+
        '<td><code style="font-size:11px">'+esc(l.endpoint)+'</code></td>'+
        '<td style="font-size:11.5px">'+esc(l.ip)+'</td>'+
        '<td style="font-size:11px">'+esc(l.deviceType)+' / '+esc(l.browser)+'</td>'+
        '<td style="font-size:11px">'+esc(l.country||'-')+'</td>'+
    '</tr>').join('');
}

// ---- Stats ----
async function loadStats(){
    try{
        const d = await apiGet('/stats');
        h('statTotalReqs').textContent = d.totalRequests || 0;
        h('statTodayReqs').textContent = d.todayRequests || 0;
        h('statWeekReqs').textContent = d.weeklyRequests || 0;
        h('statMonthReqs').textContent = d.monthlyRequests || 0;
        const tb = h('topEndpointsBody');
        if(!d.topEndpoints || !d.topEndpoints.length){ tb.innerHTML = '<tr><td colspan="2" class="empty">No data</td></tr>'; }
        else tb.innerHTML = d.topEndpoints.map(x => '<tr><td><code>'+esc(x.k)+'</code></td><td>'+x.v+'</td></tr>').join('');
    }catch(e){ console.log(e); }
}

// ---- Bans ----
async function loadBans(){
    const r = await apiGet('/bans');
    const rows = [];
    ['ip','device','key'].forEach(t => {
        (r[t]||[]).forEach(b => rows.push({ type:t, ...b }));
    });
    const body = h('bansBody');
    if(!rows.length){ body.innerHTML = '<tr><td colspan="5" class="empty">No active bans</td></tr>'; return; }
    body.innerHTML = rows.map(b => '<tr>'+
        '<td><span class="badge badge-info">'+esc(b.type)+'</span></td>'+
        '<td><code style="font-size:11px">'+esc(b.id)+'</code></td>'+
        '<td style="font-size:11.5px">'+esc(b.reason||'-')+'</td>'+
        '<td style="font-size:11.5px">'+(b.permanent?'Permanent':(b.until?new Date(b.until).toLocaleString():'-'))+'</td>'+
        '<td><button class="btn btn-sm btn-danger" onclick="unbanOne(\''+esc(b.type)+'\',\''+esc(b.id)+'\')">Unban</button></td>'+
    '</tr>').join('');
}
async function unbanOne(type, id){
    const r = await apiPost('/unban', { type, id });
    if(r.success){ toast('Unbanned','success'); loadBans(); } else toast(r.e||'Failed','error');
}
async function manualBan(){
    const type = h('banType').value;
    const id = h('banId').value.trim();
    if(!id){ toast('Enter value to ban','warning'); return; }
    const r = await apiPost('/ban', { type, id, reason:'Manual ban', permanent:true });
    if(r.success){ toast('Banned','success'); h('banId').value=''; loadBans(); } else toast(r.e||'Failed','error');
}
async function unbanAll(){
    if(!confirm('Remove ALL bans?')) return;
    const r = await apiPost('/unban-all', {});
    if(r.success){ toast('All unbanned','success'); loadBans(); } else toast(r.e||'Failed','error');
}

// ---- Devices ----
async function loadDevices(){
    const r = await apiGet('/devices');
    const body = h('devicesBody');
    if(!r.devices || !r.devices.length){ body.innerHTML = '<tr><td colspan="7" class="empty">No devices tracked yet</td></tr>'; return; }
    body.innerHTML = r.devices.map(d => '<tr>'+
        '<td><code style="font-size:10.5px">'+esc(d.id.substring(0,20))+'...</code></td>'+
        '<td style="font-size:11.5px">'+esc(d.deviceType)+'</td>'+
        '<td style="font-size:11.5px">'+esc(d.os||'-')+'</td>'+
        '<td>'+esc(d.requests)+'</td>'+
        '<td style="font-size:11px">'+esc(d.lastSeen||'-')+'</td>'+
        '<td>'+(d.banned?'<span class="badge badge-danger">Banned</span>':'<span class="badge badge-success">OK</span>')+'</td>'+
        '<td>'+(d.banned?'<button class="btn btn-sm" onclick="unbanOne(\'device\',\''+esc(d.id)+'\')">Unban</button>':'<button class="btn btn-sm btn-danger" onclick="banDevice(\''+esc(d.id)+'\')">Ban</button>')+'</td>'+
    '</tr>').join('');
}
async function banDevice(id){
    const r = await apiPost('/ban', { type:'device', id, reason:'Device ban', permanent:true });
    if(r.success){ toast('Device banned','success'); loadDevices(); } else toast(r.e||'Failed','error');
}

// ---- Bulk ----
async function bulkAction(action, state){
    if(!selectedKeys.size){ toast('Select keys first','warning'); return; }
    const keys = Array.from(selectedKeys);
    let body = { keys };
    if(state !== undefined) body.state = state;
    const r = await apiPost('/'+action, body);
    if(r.success){ toast('Done','success'); loadKeys(); } else toast(r.e||'Failed','error');
}
async function bulkPush(){
    if(!selectedKeys.size){ toast('Select keys first','warning'); return; }
    const days = h('bulkPushDays').value;
    const r = await apiPost('/bulk-push', { keys: Array.from(selectedKeys), days });
    if(r.success){ toast('Pushed','success'); loadKeys(); } else toast(r.e||'Failed','error');
}
async function pushAllKeys(){
    const days = h('pushAllDays').value;
    if(!confirm('Push '+days+' days to ALL keys?')) return;
    const r = await apiPost('/push-all', { days });
    if(r.success){ toast(r.message,'success'); loadKeys(); } else toast(r.e||'Failed','error');
}

// ---- Scopes ----
async function updateScopes(){
    const keyName = h('sk').value.trim();
    if(!keyName){ toast('Enter key name','warning'); return; }
    const scopes = Array.from(document.querySelectorAll('#scopeBoxUpdate input[type=checkbox]:checked')).map(c=>c.value);
    if(!scopes.length){ toast('Select at least one scope','warning'); return; }
    const r = await apiPost('/update-scopes', { keyName, scopes });
    if(r.success) toast('Scopes updated','success'); else toast(r.e||'Failed','error');
}

// ---- Protection ----
async function addProtection(){
    const v = h('protVal').value.trim();
    if(!v){ toast('Enter value','warning'); return; }
    const r = await apiPost('/add-protection', { value:v });
    if(r.success){ toast('Added','success'); h('protVal').value=''; loadProtectList(); } else toast(r.e||'Failed','error');
}
async function loadProtectList(){
    const r = await apiGet('/protect-list');
    const body = h('protectBody');
    if(!r.list || !r.list.length){ body.innerHTML = '<tr><td colspan="2" class="empty">No protected values</td></tr>'; return; }
    body.innerHTML = r.list.map(v => '<tr><td><code>'+esc(v)+'</code></td><td><button class="btn btn-sm btn-danger" onclick="removeProtection(\''+esc(v)+'\')">Remove</button></td></tr>').join('');
}
async function removeProtection(v){
    const r = await apiPost('/remove-protection', { value:v });
    if(r.success){ toast('Removed','success'); loadProtectList(); } else toast(r.e||'Failed','error');
}

// ---- Custom APIs ----
async function loadCustomAPIs(){
    const r = await apiGet('/export-keys'); // placeholder
    const body = h('apisBody');
    const list = CUSTOM_APIS_INIT;
    if(!list.length){ body.innerHTML = '<tr><td colspan="5" class="empty">No custom APIs</td></tr>'; return; }
    body.innerHTML = list.map(a => '<tr>'+
        '<td>'+esc(a.name)+'</td>'+
        '<td><code>'+esc(a.endpoint)+'</code></td>'+
        '<td><code>'+esc(a.param)+'</code></td>'+
        '<td>'+(a.visible?'<span class="badge badge-success">Yes</span>':'<span class="badge badge-muted">No</span>')+'</td>'+
        '<td style="white-space:nowrap">'+
            '<button class="btn btn-sm" onclick="toggleAPI('+a.id+')">Toggle</button> '+
            '<button class="btn btn-sm btn-danger" onclick="deleteAPI('+a.id+')">Del</button>'+
        '</td>'+
    '</tr>').join('');
}
async function toggleAPI(id){
    const r = await apiPost('/toggle-api', { id });
    if(r.success){ toast('Toggled','success'); location.reload(); } else toast(r.e||'Failed','error');
}
async function deleteAPI(id){
    if(!confirm('Delete this custom API?')) return;
    const r = await apiPost('/delete-api', { id });
    if(r.success){ toast('Deleted','success'); location.reload(); } else toast(r.e||'Failed','error');
}
async function addAPI(){
    const body = {
        name: h('aname').value.trim(),
        endpoint: h('aep').value.trim(),
        param: h('aparam').value.trim() || 'num',
        example: h('aex').value.trim(),
        realAPI: h('aurl').value.trim(),
        desc: h('adesc').value.trim()
    };
    if(!body.name || !body.endpoint){ toast('Name and endpoint required','warning'); return; }
    const r = await apiPost('/add-api', body);
    if(r.success){ toast('API added','success'); location.reload(); } else toast(r.e||'Failed','error');
}

// ---- DDoS ----
async function saveDDOS(){
    const mode = h('ddosMode').value;
    const ip = {
        burst10s: parseInt(h('ddosIP10').value),
        perMinute: parseInt(h('ddosIP1M').value),
        perHour: parseInt(h('ddosIP1H').value)
    };
    const r = await apiPost('/ddos-config', { mode, ip, enabled: mode!=='off' });
    if(r.success) toast('DDoS config saved','success'); else toast(r.e||'Failed','error');
}
async function clearAllStrikes(){
    const r = await apiPost('/clear-strikes', {});
    if(r.success) toast('Strikes cleared','success'); else toast(r.e||'Failed','error');
}

// ---- Audit / Admin Logs ----
async function loadAudit(){
    const r = await apiGet('/audit-log');
    const body = h('auditBody');
    if(!r.logs || !r.logs.length){ body.innerHTML = '<tr><td colspan="4" class="empty">No audit entries</td></tr>'; return; }
    body.innerHTML = r.logs.slice(-300).reverse().map(l => '<tr>'+
        '<td style="font-size:11px">'+esc(l.timestamp)+'</td>'+
        '<td>'+esc(l.user)+'</td>'+
        '<td><code style="font-size:11px">'+esc(l.action)+'</code></td>'+
        '<td style="font-size:11px">'+esc(JSON.stringify(l.details))+'</td>'+
    '</tr>').join('');
}
async function loadAdminLogs(){
    const r = await apiGet('/admin-logs');
    const body = h('adminLogsBody');
    if(!r.logs || !r.logs.length){ body.innerHTML = '<tr><td colspan="5" class="empty">No admin logs</td></tr>'; return; }
    body.innerHTML = r.logs.slice(-300).reverse().map(l => '<tr>'+
        '<td style="font-size:11px">'+esc(l.timestamp)+'</td>'+
        '<td>'+esc(l.user)+'</td>'+
        '<td><code style="font-size:11px">'+esc(l.action)+'</code></td>'+
        '<td style="font-size:11px">'+esc(l.ip)+'</td>'+
        '<td>'+(l.status==='SUCCESS'?'<span class="badge badge-success">OK</span>':'<span class="badge badge-danger">Fail</span>')+'</td>'+
    '</tr>').join('');
}

// ---- Theme ----
async function applyPresetByName(name){
    const r = await apiPost('/theme/preset', { preset: name });
    if(r.success){ toast('Theme: '+name,'success'); setTimeout(()=>location.reload(),500); }
    else toast(r.e||'Failed','error');
}

// ---- Import / Export ----
function handleFileImport(el){
    const f = el.files[0]; if(!f) return;
    const rd = new FileReader();
    rd.onload = e => { h('importData').value = e.target.result; };
    rd.readAsText(f);
}
async function importKeys(){
    const data = h('importData').value.trim();
    if(!data){ toast('Paste JSON or upload file','warning'); return; }
    try{
        const parsed = JSON.parse(data);
        const r = await apiPost('/import-keys', parsed);
        if(r.success){ h('importMsg').textContent = r.message; toast(r.message,'success'); }
        else { h('importMsg').textContent = r.e||'Failed'; toast(r.e||'Failed','error'); }
    }catch(e){ toast('Invalid JSON: '+e.message,'error'); }
}
async function loadExport(){
    const r = await apiGet('/export-keys');
    h('exportData').value = JSON.stringify(r, null, 2);
}
function copyExport(){
    if(!h('exportData').value){ toast('Click Load first','warning'); return; }
    navigator.clipboard.writeText(h('exportData').value);
    toast('Copied to clipboard','success');
}
function downloadExport(){
    if(!h('exportData').value){ toast('Click Load first','warning'); return; }
    downloadJSON(h('exportData').value, 'bronx-keys-export.json');
}
async function downloadFullBackup(){
    const r = await apiGet('/backup');
    downloadJSON(JSON.stringify(r, null, 2), 'bronx-full-backup-'+Date.now()+'.json');
    toast('Backup downloaded','success');
}
function downloadJSON(str, filename){
    const blob = new Blob([str], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    setTimeout(()=>URL.revokeObjectURL(url), 1000);
}
function handleRestoreFile(el){
    const f = el.files[0]; if(!f) return;
    const rd = new FileReader();
    rd.onload = e => { h('restoreData').value = e.target.result; };
    rd.readAsText(f);
}
async function restoreData(){
    const data = h('restoreData').value.trim();
    if(!data){ toast('Paste JSON or upload file','warning'); return; }
    if(!confirm('This will restore data from backup. Continue?')) return;
    try{
        const parsed = JSON.parse(data);
        const r = await apiPost('/restore', parsed);
        if(r.success){ toast('Restored','success'); setTimeout(()=>location.reload(),800); }
        else toast(r.e||'Failed','error');
    }catch(e){ toast('Invalid JSON: '+e.message,'error'); }
}

// ---- Announce / Maintenance ----
async function saveAnnouncement(){
    const body = { enabled: h('annEnabled').value === 'true', text: h('annText').value };
    const r = await apiPost('/save-announcement', body);
    if(r.success) toast('Announcement saved','success'); else toast(r.e||'Failed','error');
}
async function saveMaintenance(){
    const body = { enabled: h('mtEnabled').value === 'true', message: h('mtMessage').value };
    const r = await apiPost('/save-maintenance', body);
    if(r.success) toast('Maintenance saved','success'); else toast(r.e||'Failed','error');
}

// ---- Settings ----
async function resetAll(){
    if(!confirm('Reset ALL key usage?')) return;
    const r = await apiPost('/reset-all', {});
    if(r.success){ toast('Reset done','success'); loadKeys(); } else toast(r.e||'Failed','error');
}
async function clearLogs(){
    if(!confirm('Clear all request and monitor logs?')) return;
    const r = await apiPost('/clear-logs', {});
    if(r.success){ toast('Logs cleared','success'); } else toast(r.e||'Failed','error');
}

// ---- Init ----
document.addEventListener('DOMContentLoaded', () => {
    // Populate scope boxes with all endpoints
    const endpointScopesHTML = ENDPOINTS_LIST.map(n => '<label class="scope-item"><input type="checkbox" value="'+n+'"> <span>'+n+'</span></label>').join('');
    if(h('scopeBoxGenerate')) h('scopeBoxGenerate').insertAdjacentHTML('beforeend', endpointScopesHTML);
    if(h('scopeBoxUpdate')) h('scopeBoxUpdate').insertAdjacentHTML('beforeend', endpointScopesHTML);
    // check scope toggles
    document.querySelectorAll('.scope-item input[type=checkbox]').forEach(cb => {
        cb.addEventListener('change', function(){
            const label = this.closest('.scope-item');
            if(this.checked) label.classList.add('checked'); else label.classList.remove('checked');
        });
    });
    loadDashboard();
    loadKeys();
});
</script>
</body></html>`;
    }catch(err){
        return '<pre style="padding:20px;color:#f85149;background:#0d1117;font-family:monospace">Admin render error:\n'+esc(err.stack || err.message)+'</pre>';
    }
}

// ============================================================
// 🚀 START
// ============================================================
initHardcoded();
loadFromDisk();
initCustomAPIs();

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log('════════════════════════════════════════════════════════');
    console.log('🛡️  BRONX OSINT V503 ULTRA PROFESSIONAL');
    console.log('════════════════════════════════════════════════════════');
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`🌐 Public dashboard: http://localhost:${PORT}/`);
    console.log(`🔐 Admin panel:      http://localhost:${PORT}${ADMIN_PATH}`);
    console.log(`👤 Admin username:   ${ADMIN_USERNAME}`);
    console.log(`📦 Keys loaded:      ${Object.keys(keyStorage).length}`);
    console.log(`🔧 Custom APIs:      ${customAPIs.length}`);
    console.log(`🛡️  DDoS mode:       ${ddosConfig.mode}`);
    console.log('════════════════════════════════════════════════════════');
});

process.on('uncaughtException', (e) => console.error('Uncaught:', e.message));
process.on('unhandledRejection', (e) => console.error('Unhandled:', e));

module.exports = app;
