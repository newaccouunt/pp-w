// ============================================================
// 🛡️ BRONX OSINT V502 PRO — ADVANCED DEVELOPER EDITION
// ✅ ALL buttons work | Professional UI | Full backup/restore
// ✅ Per-key developer name | Hidden fields | Custom errors
// ✅ Smart/Strict DDoS | Working announcement/maintenance
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
let announcement = { enabled: false, text: '' };
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
        danger: '#f85149', info: '#58a6ff'
    },
    effects: { gridBg: true },
    fonts: { heading: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', body: 'Inter, sans-serif', mono: 'Fira Code, Monaco, Consolas, monospace' },
    radius: 6
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
    return true;
}

// ============================================================
// 🔐 SECURITY & DDOS
// ============================================================
let bans = { ip: {}, device: {}, key: {} };
let abuseTracker = { ip: {}, device: {}, key: {} };
let deviceFingerprints = {};
let blocklist = { userAgents: [], paths: [] };
let whitelist = { ips: [], keys: [] };
let ddosConfig = {
    enabled: true, mode: 'smart',
    ip: { burst10s: 60, perMinute: 200, perHour: 1500 },
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
    if(!bucket[id]) bucket[id] = { hits: [], strikes: 0 };
    bucket[id].hits = bucket[id].hits.filter(t => t > now - maxWindow);
    bucket[id].hits.push(now);
}
function countWindow(bucket, id, ms){
    const now = Date.now();
    return (bucket[id]?.hits || []).filter(t => t > now - ms).length;
}
function strike(bucket, id, reason, ctx = {}){
    if(!bucket[id]) bucket[id] = { hits: [], strikes: 0 };
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
        deviceFingerprints[deviceId] = { firstSeen: getIndiaDateTime(), lastSeen:'', requests: 0, browser, deviceType: di.type, deviceIcon: di.icon, os: di.os, ips: [], countries: [] };
    }
    const df = deviceFingerprints[deviceId];
    df.lastSeen = getIndiaDateTime(); df.requests++;
    if(!df.ips.includes(ip)){ df.ips.push(ip); if(df.ips.length>10) df.ips = df.ips.slice(-10); }
    if(country !== 'Unknown' && !df.countries.includes(country)) df.countries.push(country);
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
    number:{p:'num',i:'📱',e:'9876543210',d:'Mobile Lookup'},
    aadhar:{p:'num',i:'🆔',e:'393933081942',d:'Aadhaar Info'},
    leakinfo:{p:'term',i:'🕵️',e:'email@example.com',d:'Leak Info'},
    name:{p:'name',i:'🔍',e:'abhiraaj',d:'Name Search'},
    numv2:{p:'num',i:'📱',e:'6205949840',d:'Number v2'},
    adv:{p:'num',i:'📱',e:'9876543210',d:'Advanced Intel'},
    adharfamily:{p:'num',i:'👨‍👩‍👧‍👦',e:'984154610245',d:'Family Info'},
    adharration:{p:'num',i:'📋',e:'701984830542',d:'Ration Card'},
    imei:{p:'imei',i:'📱',e:'357817383506298',d:'IMEI Lookup'},
    calltracer:{p:'num',i:'📞',e:'9876543210',d:'Call Tracer'},
    challan:{p:'vehicle',i:'📋',e:'UP42BB2572',d:'Challan Info'},
    numleak:{p:'num',i:'🔓',e:'9876543210',d:'Number Leak'},
    bomber:{p:'number',i:'💣',e:'9876543210',d:'SMS Bomber'},
    numtoupi:{p:'num',i:'💳',e:'8945996482',d:'Num to UPI'},
    upi:{p:'upi',i:'💰',e:'example@ybl',d:'UPI Info'},
    ifsc:{p:'ifsc',i:'🏦',e:'SBIN0001234',d:'IFSC Lookup'},
    pan:{p:'pan',i:'📄',e:'AXDPR2606K',d:'PAN Details'},
    pincode:{p:'pin',i:'📍',e:'110001',d:'Pincode Info'},
    ip:{p:'ip',i:'🌐',e:'8.8.8.8',d:'IP Lookup'},
    vehicle:{p:'vehicle',i:'🚗',e:'MH02FZ0555',d:'Vehicle Info'},
    rc:{p:'owner',i:'📋',e:'UP92P2111',d:'RC Lookup'},
    veh2num:{p:'vehicle',i:'🚗',e:'KL41V3504',d:'Vehicle to Number'},
    ff:{p:'uid',i:'🎮',e:'123456789',d:'Free Fire'},
    bgmi:{p:'uid',i:'🎮',e:'5121439477',d:'BGMI Info'},
    insta:{p:'username',i:'📸',e:'cristiano',d:'Instagram'},
    git:{p:'username',i:'💻',e:'ftgamer2',d:'GitHub'},
    tg:{p:'info',i:'📲',e:'JAUUOWNER',d:'Telegram'},
    tgidinfo:{p:'id',i:'📲',e:'7530266953',d:'TG ID Info'},
    snap:{p:'username',i:'👻',e:'priyapanchal272',d:'Snapchat'},
    pk:{p:'num',i:'🇵🇰',e:'03331234567',d:'Pakistan Info'},
    pkv2:{p:'num',i:'🇵🇰',e:'3359736848',d:'Pakistan v2'}
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
        { id: Date.now()+1, name:'Number Info', endpoint:'number-advanced', param:'num', example:'9876543210', visible:true, realAPI:'https://num-tg-info-api.vercel.app/info?number={param}' },
        { id: Date.now()+2, name:'Vehicle RC', endpoint:'rc-details', param:'ca_number', example:'MH02FZ0555', visible:true, realAPI:'https://simple-rc-info.vercel.app/rc?num={param}' },
        { id: Date.now()+3, name:'Aadhar', endpoint:'aadhar-verify', param:'aadhar', example:'393933081942', visible:true, realAPI:'https://bronx-king-vip999.vercel.app/api/aadhaar?num={param}' },
        { id: Date.now()+4, name:'Email', endpoint:'email-lookup', param:'mail', example:'user@gmail.com', visible:true, realAPI:'https://bronx-king-mail-opi.vercel.app/mail={param}' },
        { id: Date.now()+5, name:'Telegram', endpoint:'telegram-scan', param:'id', example:'7530266953', visible:true, realAPI:'https://bronx-tg-king-bro.vercel.app/tg?key=BRONXop&query={param}' },
        { id: Date.now()+6, name:'SMS Bomber', endpoint:'sms-bomber', param:'number', example:'1234567890', visible:true, realAPI:'https://bronx-sms-api-ulimate.vercel.app/api/key-bronx-paid-vip?number={param}&counter=10' },
        { id: Date.now()+7, name:'Number Backup', endpoint:'num-op', param:'num', example:'9876543210', visible:true, realAPI:'https://tfqdeadlo-inddataapi.hf.space/search?mobile={param}' }
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
// 🏠 PUBLIC ROUTES
// ============================================================
app.get('/', (req,res) => { try { res.send(renderHome()); } catch(e){ res.send('err: ' + e.message); } });
app.get('/test', (req,res) => res.json({
    status:'✅ BRONX V502 PRO ONLINE', version:'5.0.2', ddos: ddosConfig.mode,
    keys: Object.keys(keyStorage).length, endpoints: Object.keys(endpoints).length,
    custom: customAPIs.length, bannedIPs: Object.keys(bans.ip).length,
    devices: Object.keys(deviceFingerprints).length,
    theme: theme.preset, maintenance: maintenance.enabled
}));

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
            incrementKeyUsage(key, ep, req);
            return res.json({ ...sanitizeResponse(endpointResponses[ep], devName), api_info:{key_owner:kc.keyData.name} });
        }
        const url = `${REAL_API_BASE}/${ep}?key=${getNextKey()}&${endpoints[ep].p}=${encodeURIComponent(pv)}`;
        const r = await axios.get(url, { timeout: 30000 });
        incrementKeyUsage(key, ep, req);
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
    if(bans.ip['LOGIN_'+ip] && (bans.ip['LOGIN_'+ip].permanent || Date.now() < bans.ip['LOGIN_'+ip].until))
        return res.json({ success:false, error:'🚫 Too many failed attempts.' });
    if(username === ADMIN_USERNAME && password === ADMIN_PASSWORD){
        const token = genToken();
        adminSessions[token] = { expiresAt: Date.now() + 365*24*3600*1000, permanent: true };
        permanentTokens[token] = { createdAt: getIndiaDateTime() };
        delete abuseTracker.ip['LOGIN_'+ip];
        logAudit(username, 'LOGIN_SUCCESS', { ip });
        saveToDisk();
        res.json({ success:true, token, message:'✅ Access Granted', redirect: ADMIN_PATH + '?token=' + token });
    } else {
        pushHit(abuseTracker.ip, 'LOGIN_'+ip, 3600000);
        const attempts = countWindow(abuseTracker.ip, 'LOGIN_'+ip, 3600000);
        if(attempts >= ddosConfig.login.maxAttempts)
            bans.ip['LOGIN_'+ip] = { until: Date.now() + ddosConfig.login.banMs, reason:'Failed logins', at:getIndiaDateTime(), strikes:attempts };
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
app.get(ADMIN_PATH + '/data', adminAuth, (req,res) => {
    const allKeys = Object.entries(keyStorage).filter(([k,d]) => !d._hardcoded && !d.hidden).map(([k,d]) => ({
        key:k, name:d.name||'?', limit:d.unlimited?'∞':d.limit, used:d.used||0,
        left:d.unlimited?'∞':Math.max(0,(d.limit||0)-(d.used||0)),
        dailyLimit:d.dailyLimit||0, perSecondLimit:d.perSecondLimit||0,
        expiry:d.expiryStr||'Lifetime', isExpired:d.expiry ? isKeyExpired(d.expiry) : false,
        scopes:d.scopes||[], cooldown:d.cooldown||0, created:d.created||'',
        stopped:d.stopped||false, disabled:d.disabled||false, notes:d.notes||'', developerName: d.developerName || ''
    }));
    const totals = { totalKeys: allKeys.length, totalApis: customAPIs.length, totalBans: Object.keys(bans.ip).length + Object.keys(bans.device).length + Object.keys(bans.key).length, totalDevices: Object.keys(deviceFingerprints).length, totalRequests: keyMonitorLogs.length, todayRequests: keyMonitorLogs.filter(l => l.date === getIndiaDate()).length };
    res.json({ keys: allKeys, apis: customAPIs, totals, announcement, maintenance, globalConfig, customMessages, ddosConfig, theme: theme.preset, protected: Object.keys(protectedData), endpointResponses: Object.keys(endpointResponses) });
});
app.post(ADMIN_PATH + '/generate-key', adminAuth, (req,res) => {
    const { keyName, keyOwner, scopes, limit, days, cooldown, dailyLimit, perSecondLimit, autoGenerate, notes, developerName } = req.body;
    let fk = keyName; if(autoGenerate || !keyName) fk = genRandomKey();
    if(!fk || !keyOwner) return res.json({e:'Missing fields'});
    if(keyStorage[fk]) return res.json({e:'Key already exists'});
    const ks = scopes || ['*'];
    let exp = null, es = 'LIFETIME';
    if(days && !isNaN(days)){
        const d = new Date(Date.now() + parseInt(days)*24*3600*1000);
        exp = d; es = d.toISOString().split('T')[0].split('-').reverse().join('-');
    }
    keyStorage[fk] = { name:keyOwner, scopes:ks, type:'generated', limit:parseInt(limit)||100, used:0, cooldown:parseInt(cooldown)||0, dailyLimit:parseInt(dailyLimit)||0, perSecondLimit:parseInt(perSecondLimit)||0, expiry:exp, expiryStr:es, created:getIndiaDateTime(), unlimited:false, hidden:false, _hardcoded:false, stopped:false, disabled:false, notes:notes||'', developerName: developerName || '' };
    logAudit('admin', 'GENERATE_KEY', { key:fk });
    saveToDisk();
    res.json({ success:true, key:fk, message:'🔑 Key Generated!' });
});
app.post(ADMIN_PATH + '/edit-key', adminAuth, (req,res) => {
    const { keyName, newOwner, newLimit, newDeveloperName, newNotes, newScopes } = req.body;
    if(!keyStorage[keyName]) return res.json({e:'Not found'});
    if(keyStorage[keyName]._hardcoded) return res.json({e:'Hardcoded'});
    const t = keyStorage[keyName];
    if(newOwner !== undefined) t.name = newOwner;
    if(newLimit !== undefined) t.limit = parseInt(newLimit);
    if(newDeveloperName !== undefined) t.developerName = newDeveloperName;
    if(newNotes !== undefined) t.notes = newNotes;
    if(newScopes) t.scopes = newScopes;
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
    if(keyStorage[req.body.keyName]?._hardcoded) return res.json({e:'Protected'});
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
    if(keyStorage[keyName]._hardcoded) return res.json({e:'Hardcoded'});
    const d = parseInt(days) || 30;
    const ne = new Date(Date.now() + d*24*3600*1000);
    keyStorage[keyName].expiry = ne;
    keyStorage[keyName].expiryStr = ne.toISOString().split('T')[0].split('-').reverse().join('-');
    keyStorage[keyName].used = 0;
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
    const { name, endpoint, param, example, realAPI, visible } = req.body;
    if(!name || !endpoint) return res.json({e:'Name and endpoint required'});
    const cleanEndpoint = String(endpoint).toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    if(!cleanEndpoint) return res.json({e:'Invalid endpoint'});
    if(customAPIs.some(a => a.endpoint === cleanEndpoint)) return res.json({e:'Endpoint already exists'});
    const newApi = { id: Date.now(), name: String(name), endpoint: cleanEndpoint, param: param || 'num', example: example || '', visible: visible !== false, realAPI: realAPI || '', createdAt: getIndiaDateTime() };
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
    if(c.tempBanMs) ddosConfig.tempBanMs = parseInt(c.tempBanMs);
    if(c.longBanMs) ddosConfig.longBanMs = parseInt(c.longBanMs);
    saveToDisk(); res.json({success:true, config:ddosConfig});
});
app.post(ADMIN_PATH + '/clear-strikes', adminAuth, (req,res) => {
    ['ip','device','key'].forEach(t => Object.keys(abuseTracker[t]||{}).forEach(x => abuseTracker[t][x].strikes = 0));
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
    const byEp = {};
    keyMonitorLogs.forEach(l => { byEp[l.endpoint] = (byEp[l.endpoint]||0)+1; });
    const top = (o, n=10) => Object.entries(o).sort((a,b) => b[1]-a[1]).slice(0,n).map(([k,v]) => ({ k, v }));
    const data = {
        totalRequests: keyMonitorLogs.length, todayRequests: todayL.length,
        weeklyRequests: weekL.length, monthlyRequests: monthL.length,
        topEndpoints: top(byEp, 10)
    };
    statsCache = { data, expiresAt: Date.now() + 10000 };
    res.json(data);
});
app.post(ADMIN_PATH + '/theme/preset', adminAuth, (req,res) => {
    if(!applyPreset(req.body.preset)) return res.json({e:'Invalid preset'});
    saveToDisk(); res.json({ success:true, theme: theme.preset });
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
    res.json({ success: true });
});
app.get(ADMIN_PATH + '/response-settings', adminAuth, (req,res) => {
    res.json({ globalConfig, customMessages });
});
app.get(ADMIN_PATH + '/export-keys', adminAuth, (req,res) => {
    const out = {};
    Object.entries(keyStorage).forEach(([k,v]) => { if(!v._hardcoded && !v.hidden) out[k] = v; });
    res.json({ success:true, total:Object.keys(out).length, keys:out, apis: customAPIs, exported_at:getIndiaDateTime() });
});
app.post(ADMIN_PATH + '/import-keys', adminAuth, (req,res) => {
    try{
        let body = req.body;
        let toImport = body.keys || body;
        if(toImport.keys && typeof toImport.keys === 'object' && !Array.isArray(toImport.keys)) toImport = toImport.keys;
        const meta = ['success','total','keys','apis','exported_at','version'];
        let imported = 0, skipped = 0;
        Object.entries(toImport).forEach(([k,d]) => {
            if(meta.includes(k) && typeof d !== 'object') return;
            if(!d || typeof d !== 'object') return;
            if(keyStorage[k] || d._hardcoded){ skipped++; return; }
            keyStorage[k] = { ...d, _hardcoded:false, hidden:false, type:'generated' };
            imported++;
        });
        if(body.apis && Array.isArray(body.apis)){
            body.apis.forEach(a => {
                if(!customAPIs.some(x => x.endpoint === a.endpoint)) customAPIs.push(a);
            });
        }
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
    }catch(e){ res.json({e:'Invalid JSON: ' + e.message}); }
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
        announcement, maintenance, globalConfig, customMessages
    });
});
app.post(ADMIN_PATH + '/restore', adminAuth, (req,res) => {
    try{
        const b = req.body;
        if(b.keys) Object.entries(b.keys).forEach(([k,v]) => { if(!v._hardcoded) keyStorage[k] = v; });
        if(b.apis) customAPIs = b.apis;
        if(b.protected) protectedData = b.protected;
        if(b.endpointResponses) endpointResponses = b.endpointResponses;
        if(b.theme){ const t = typeof b.theme === 'string' ? b.theme : b.theme.preset; if(t) applyPreset(t); }
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
app.post(ADMIN_PATH + '/announcement', adminAuth, (req,res) => {
    const { enabled, text } = req.body;
    announcement.enabled = !!enabled;
    announcement.text = text || '';
    saveToDisk(); res.json({success:true, announcement});
});
app.post(ADMIN_PATH + '/maintenance', adminAuth, (req,res) => {
    const { enabled, message } = req.body;
    maintenance.enabled = !!enabled;
    maintenance.message = message || 'System under maintenance';
    saveToDisk(); res.json({success:true, maintenance});
});
app.use((req,res) => res.json({error:'Not found'}));

// ============================================================
// 🎨 CSS
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
    --radius:${r}px; --tr:all .15s ease;
}
*{margin:0;padding:0;box-sizing:border-box}
body{background:var(--bg-primary);color:var(--text-primary);font-family:${theme.fonts.body};min-height:100vh;overflow-x:hidden;position:relative;line-height:1.5;font-size:14px}
${e.gridBg ? `.grid-bg{position:fixed;inset:0;background-image:radial-gradient(${hexToRgbStr(c.accent,.06)} 1px,transparent 1px);background-size:24px 24px;z-index:0;pointer-events:none}` : '.grid-bg{display:none}'}
::-webkit-scrollbar{width:8px;height:8px}
::-webkit-scrollbar-track{background:var(--bg-primary)}
::-webkit-scrollbar-thumb{background:var(--border-color);border-radius:4px}
::-webkit-scrollbar-thumb:hover{background:var(--text-muted)}
.admin-container{display:flex;min-height:100vh;position:relative;z-index:10}
.sidebar{width:240px;background:var(--bg-secondary);border-right:1px solid var(--border-color);padding:16px 0;position:fixed;height:100vh;overflow-y:auto;z-index:100}
.sidebar-header{text-align:center;padding:0 16px 16px;border-bottom:1px solid var(--border-color);margin-bottom:8px}
.sidebar-title{font-size:15px;font-weight:700;color:var(--text-primary);letter-spacing:1px}
.sidebar-subtitle{font-size:10px;color:var(--text-muted);margin-top:2px}
.sidebar-nav{list-style:none;padding:0 8px}
.sidebar-nav li{margin-bottom:1px}
.sidebar-nav a{display:flex;align-items:center;gap:10px;padding:9px 12px;color:var(--text-secondary);text-decoration:none;border-radius:5px;transition:var(--tr);font-size:12.5px;font-weight:500;cursor:pointer}
.sidebar-nav a:hover{background:var(--bg-primary);color:var(--text-primary)}
.sidebar-nav a.active{background:var(--accent);color:#fff;font-weight:600}
.sidebar-nav i{width:16px;text-align:center;font-size:13px}
.main-content{flex:1;margin-left:240px;padding:20px;min-height:100vh}
.glow-card{background:var(--bg-card);border:1px solid var(--border-color);border-radius:var(--radius);padding:20px;margin-bottom:16px}
.glow-card h3{margin-bottom:16px;font-size:14px;font-weight:600;display:flex;align-items:center;gap:8px;color:var(--text-primary)}
.glow-card h3 i{color:var(--accent)}
.glow-card h4{margin:16px 0 12px;font-size:13px;font-weight:600;color:var(--text-primary)}
.stats-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-bottom:20px}
.stat-card{background:var(--bg-secondary);border:1px solid var(--border-color);border-radius:6px;padding:14px;text-align:center;transition:var(--tr)}
.stat-card:hover{border-color:var(--accent)}
.stat-icon{font-size:20px;margin-bottom:4px}
.stat-value{font-size:22px;font-weight:700;color:var(--accent);margin-bottom:2px;font-family:${theme.fonts.mono}}
.stat-label{font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;font-weight:600}
.form-group{margin-bottom:14px}
.form-group label{display:block;margin-bottom:5px;color:var(--text-secondary);font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px}
.form-input{width:100%;padding:9px 11px;background:var(--bg-primary);border:1px solid var(--border-color);border-radius:5px;color:var(--text-primary);font-size:13px;transition:var(--tr);outline:none;font-family:${theme.fonts.body}}
.form-input:focus{border-color:var(--accent)}
.form-input option{background:var(--bg-secondary);color:var(--text-primary)}
textarea.form-input{resize:vertical;font-family:${theme.fonts.mono};font-size:12px;line-height:1.4}
.btn-primary{padding:9px 16px;background:var(--accent);color:#fff;border:none;border-radius:5px;cursor:pointer;font-weight:600;font-size:12.5px;transition:var(--tr);font-family:${theme.fonts.body}}
.btn-primary:hover{opacity:0.85}
.btn-primary:disabled{opacity:0.5;cursor:not-allowed}
.btn-success{background:var(--success);color:#fff}
.btn-danger{background:var(--danger);color:#fff}
.btn-warning{background:var(--warning);color:#000}
.btn-info{background:var(--info);color:#fff}
.btn-action{padding:5px 8px;border-radius:4px;border:1px solid var(--border-color);cursor:pointer;font-size:11px;transition:var(--tr);background:var(--bg-secondary);color:var(--text-secondary);margin:1px;font-weight:500}
.btn-action:hover{border-color:var(--accent);color:var(--accent)}
.table-container{overflow-x:auto;border-radius:6px;border:1px solid var(--border-color)}
table{width:100%;border-collapse:collapse;font-size:12px}
th{background:var(--bg-secondary);color:var(--text-secondary);padding:10px 8px;text-align:left;font-weight:600;text-transform:uppercase;font-size:10px;letter-spacing:0.5px;border-bottom:1px solid var(--border-color);position:sticky;top:0;z-index:2}
td{padding:9px 8px;border-bottom:1px solid var(--border-color);color:var(--text-primary)}
tr:hover td{background:var(--bg-primary)}
code{background:var(--bg-primary);padding:2px 6px;border-radius:3px;color:var(--accent);font-family:${theme.fonts.mono};font-size:11px;border:1px solid var(--border-color);word-break:break-all}
.endpoint-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:14px}
.endpoint-card{background:var(--bg-secondary);border:1px solid var(--border-color);border-radius:6px;padding:16px;transition:var(--tr);position:relative}
.endpoint-card:hover{border-color:var(--accent)}
.endpoint-card .ep-header{display:flex;align-items:center;gap:8px;margin-bottom:8px}
.endpoint-card .ep-icon{font-size:16px}
.endpoint-card .ep-name{font-size:13px;font-weight:600;color:var(--text-primary);font-family:${theme.fonts.mono}}
.endpoint-card .ep-desc{font-size:12px;color:var(--text-secondary);margin-bottom:10px}
.endpoint-card .ep-method{display:inline-block;padding:2px 8px;background:var(--success);color:#fff;border-radius:3px;font-size:10px;font-weight:700;letter-spacing:0.5px;margin-right:6px}
.endpoint-card .ep-url{font-size:11px;color:var(--text-primary);background:var(--bg-primary);padding:8px 10px;border-radius:4px;font-family:${theme.fonts.mono};word-break:break-all;border:1px solid var(--border-color);margin-bottom:10px}
.endpoint-card .ep-url .param{color:var(--warning)}
.endpoint-card .ep-url .key{color:var(--danger)}
.json-preview{background:#010409;border:1px solid var(--border-color);border-radius:4px;padding:10px;max-height:240px;overflow-y:auto}
.json-preview pre{font-family:${theme.fonts.mono};font-size:10.5px;color:#c9d1d9;margin:0;white-space:pre-wrap;word-break:break-all;line-height:1.5}
.live-logs{background:var(--bg-primary);border:1px solid var(--border-color);border-radius:6px;padding:12px;max-height:500px;overflow-y:auto;font-family:${theme.fonts.mono};font-size:11px}
.log-entry{padding:6px 8px;border-bottom:1px solid var(--border-color);display:flex;gap:10px;flex-wrap:wrap;transition:var(--tr);border-radius:3px;align-items:center}
.log-entry:hover{background:var(--bg-secondary)}
.log-time{color:var(--text-muted);font-size:10px}
.log-key{color:var(--accent);font-weight:600}
.log-endpoint{color:var(--accent2)}
.log-ip{color:var(--info)}
.toast{position:fixed;top:16px;right:16px;z-index:99999;padding:12px 18px;border-radius:6px;color:#fff;font-weight:600;font-size:12.5px;animation:slideIn .25s ease;max-width:380px;backdrop-filter:blur(10px);border:1px solid}
.toast.success{background:${hexToRgbStr(c.success,0.15)};border-color:var(--success);color:var(--success)}
.toast.error{background:${hexToRgbStr(c.danger,0.15)};border-color:var(--danger);color:var(--danger)}
.toast.warning{background:${hexToRgbStr(c.warning,0.15)};border-color:var(--warning);color:var(--warning)}
.toast.info{background:${hexToRgbStr(c.info,0.15)};border-color:var(--info);color:var(--info)}
.scope-box{display:flex;flex-wrap:wrap;gap:6px;padding:10px;background:var(--bg-primary);border-radius:5px;border:1px solid var(--border-color);max-height:280px;overflow-y:auto}
.scope-item{cursor:pointer;font-size:11px;display:inline-flex;align-items:center;gap:5px;padding:5px 9px;border-radius:4px;background:var(--bg-secondary);border:1px solid var(--border-color);color:var(--text-secondary);transition:var(--tr)}
.scope-item:hover{border-color:var(--accent);color:var(--text-primary)}
.scope-item input{accent-color:var(--accent)}
.section-title{display:flex;align-items:center;gap:8px;padding:8px 12px;font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;margin-top:8px;margin-bottom:4px}
@keyframes slideIn{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}
@keyframes spin{to{transform:rotate(360deg)}}
.spinner{display:inline-block;width:12px;height:12px;border:2px solid currentColor;border-top-color:transparent;border-radius:50%;animation:spin .6s linear infinite;vertical-align:middle}
@media(max-width:768px){.sidebar{width:56px;padding:8px 0}.sidebar-title,.sidebar-subtitle,.sidebar-nav a span{display:none}.sidebar-nav a{justify-content:center;padding:10px}.main-content{margin-left:56px;padding:12px}.endpoint-grid{grid-template-columns:1fr}.stats-grid{grid-template-columns:repeat(2,1fr)}}
</style>`;
}

// ============================================================
// LOGIN PAGE
// ============================================================
function renderLogin(){
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>BRONX V502 | Login</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Fira+Code:wght@400;500&display=swap" rel="stylesheet">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
${generateCSS()}
<style>
body{display:flex;align-items:center;justify-content:center;overflow:hidden;min-height:100vh}
.login-container{position:relative;z-index:10;width:380px;max-width:90vw}
.login-card{background:var(--bg-card);border:1px solid var(--border-color);border-radius:10px;padding:32px 28px}
.login-logo{text-align:center;margin-bottom:20px}
.login-logo .icon{font-size:40px;display:inline-block;margin-bottom:8px}
.login-logo .brand{font-size:16px;font-weight:700;letter-spacing:2px;color:var(--text-primary)}
.login-title{text-align:center;font-size:20px;font-weight:700;color:var(--text-primary);margin-bottom:6px}
.login-subtitle{text-align:center;color:var(--text-muted);font-size:12px;margin-bottom:24px}
.input-group{position:relative;margin-bottom:16px}
.input-group .input-icon{position:absolute;left:12px;top:50%;transform:translateY(-50%);color:var(--text-muted);font-size:13px;z-index:2}
.input-group input{width:100%;padding:11px 12px 11px 38px;background:var(--bg-primary);border:1px solid var(--border-color);border-radius:5px;color:var(--text-primary);font-size:13px;outline:none;transition:var(--tr)}
.input-group input:focus{border-color:var(--accent)}
.login-btn{width:100%;padding:12px;background:var(--accent);color:#fff;border:none;border-radius:5px;cursor:pointer;font-size:13px;font-weight:600;transition:var(--tr)}
.login-btn:hover{opacity:0.9}
.message{text-align:center;margin-top:12px;font-size:12px;font-weight:500;min-height:18px}
</style></head><body>
<div class="grid-bg"></div>
<div class="login-container"><div class="login-card">
<div class="login-logo"><span class="icon">🛡️</span><div class="brand">BRONX OSINT</div></div>
<h2 class="login-title">V502 PRO</h2>
<p class="login-subtitle">Secure Dashboard Access</p>
<div class="input-group"><i class="fas fa-user input-icon"></i><input type="text" id="username" placeholder="Username" autocomplete="off"></div>
<div class="input-group"><i class="fas fa-lock input-icon"></i><input type="password" id="password" placeholder="Password" autocomplete="off"></div>
<button class="login-btn" onclick="doLogin()"><i class="fas fa-shield-halved"></i> AUTHENTICATE</button>
<div class="message" id="message"></div>
</div></div>
<script>
async function doLogin(){
    const u=document.getElementById('username').value.trim(),p=document.getElementById('password').value.trim(),m=document.getElementById('message');
    if(!u||!p){m.style.color='var(--warning)';m.innerHTML='⚠ Fill all fields';return}
    m.style.color='var(--info)';m.innerHTML='<span class="spinner"></span> Authenticating...';
    try{
        const r=await fetch('${ADMIN_PATH}/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:u,password:p})});
        const d=await r.json();
        if(d.success){m.style.color='var(--success)';m.innerHTML='✓ '+d.message;setTimeout(()=>location.href=d.redirect,500)}
        else{m.style.color='var(--danger)';m.innerHTML='✗ '+d.error}
    }catch(e){m.style.color='var(--danger)';m.innerHTML='✗ Connection error'}
}
document.addEventListener('keydown',e=>{if(e.key==='Enter')doLogin()});
</script></body></html>`;
}

// ============================================================
// PUBLIC HOME PAGE
// ============================================================
function renderHome(){
    const vapi = customAPIs.filter(a => a.visible);
    let cards = '';
    Object.entries(endpoints).forEach(([n,e]) => {
        const preview = endpointResponses[n] ? JSON.stringify(endpointResponses[n], null, 2) : '{\n  "status": "success",\n  "message": "Sample response",\n  "note": "Admin can set real response in Admin Panel",\n  "data": {}\n}';
        cards += '<div class="endpoint-card">'+
            '<div class="ep-header"><span class="ep-icon">'+e.i+'</span><div class="ep-name">/'+esc(n)+'</div></div>'+
            '<div class="ep-desc">'+esc(e.d)+'</div>'+
            '<div class="ep-url"><span class="ep-method">GET</span>/api/key-bronx/'+esc(n)+'?key=<span class="key">YOUR_KEY</span>&'+e.p+'=<span class="param">'+e.e+'</span></div>'+
            '<div class="json-preview"><pre>'+esc(preview)+'</pre></div>'+
        '</div>';
    });
    vapi.forEach(a => {
        const preview = endpointResponses[a.endpoint] ? JSON.stringify(endpointResponses[a.endpoint], null, 2) : '{\n  "status": "success",\n  "message": "Custom API response"\n}';
        cards += '<div class="endpoint-card">'+
            '<div class="ep-header"><span class="ep-icon">🔧</span><div class="ep-name">/'+esc(a.endpoint)+'</div></div>'+
            '<div class="ep-desc">'+esc(a.name)+'</div>'+
            '<div class="ep-url"><span class="ep-method">GET</span>/api/custom/'+esc(a.endpoint)+'?key=<span class="key">YOUR_KEY</span>&'+esc(a.param)+'=<span class="param">'+esc(a.example||'value')+'</span></div>'+
            '<div class="json-preview"><pre>'+esc(preview)+'</pre></div>'+
        '</div>';
    });
    const annHTML = announcement.enabled && announcement.text ? '<div style="position:fixed;top:0;left:0;right:0;z-index:9999;padding:10px 20px;text-align:center;font-size:12.5px;font-weight:600;background:var(--accent);color:#fff">📢 '+esc(announcement.text)+'</div>' : '';
    const maintHTML = maintenance.enabled ? '<div style="position:fixed;inset:0;z-index:99999;background:var(--bg-primary);display:flex;align-items:center;justify-content:center;flex-direction:column;gap:16px;padding:40px;text-align:center"><div style="font-size:56px">🔧</div><h1 style="color:var(--warning);font-size:24px;letter-spacing:2px">MAINTENANCE MODE</h1><p style="color:var(--text-secondary);font-size:13px;max-width:500px">'+esc(maintenance.message)+'</p></div>' : '';
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>BRONX OSINT API V502 PRO</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Fira+Code:wght@400;500&display=swap" rel="stylesheet">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
${generateCSS()}
<style>
.topnav{position:sticky;top:0;z-index:1000;background:var(--bg-secondary);border-bottom:1px solid var(--border-color);padding:14px 24px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px}
.brand{font-size:15px;font-weight:700;letter-spacing:1px;color:var(--text-primary);text-decoration:none;display:flex;align-items:center;gap:8px}
.nav-links{display:flex;gap:8px;align-items:center}
.nav-links a{color:var(--text-secondary);text-decoration:none;font-size:12px;font-weight:500;padding:7px 12px;border-radius:5px;transition:var(--tr);border:1px solid transparent}
.nav-links a:hover{color:var(--text-primary);border-color:var(--border-color);background:var(--bg-primary)}
.hero{text-align:center;padding:48px 20px 32px;position:relative;z-index:10}
.hero h1{font-size:clamp(28px,5vw,42px);font-weight:700;color:var(--text-primary);margin-bottom:10px;letter-spacing:-0.5px}
.hero p{color:var(--text-muted);font-size:13px;letter-spacing:0.5px;max-width:600px;margin:0 auto}
.container{max-width:1200px;margin:0 auto;padding:16px;position:relative;z-index:10}
.section-head{display:flex;align-items:center;gap:10px;margin:28px 0 14px;padding-bottom:10px;border-bottom:1px solid var(--border-color)}
.section-head h2{font-size:15px;font-weight:600;color:var(--text-primary)}
.section-head .badge{background:var(--accent);color:#fff;padding:2px 8px;border-radius:10px;font-size:10px;font-weight:700}
.footer{text-align:center;padding:28px 16px;border-top:1px solid var(--border-color);position:relative;z-index:10;color:var(--text-muted);font-size:12px}
.footer b{color:var(--accent)}
</style></head><body>
<div class="grid-bg"></div>
${annHTML}${maintHTML}
<nav class="topnav">
<a href="/" class="brand">🛡️ BRONX OSINT</a>
<div class="nav-links">
<a href="/test"><i class="fas fa-heartbeat"></i> Status</a>
<span style="padding:5px 10px;border-radius:20px;font-size:11px;font-weight:600;background:${hexToRgbStr(theme.colors.success,0.1)};color:${theme.colors.success};border:1px solid ${hexToRgbStr(theme.colors.success,0.3)}">🟢 Online</span>
</div>
</nav>
<header class="hero"><h1>BRONX OSINT API</h1><p>Professional OSINT API Platform · Smart DDoS Protection · Developer Friendly</p></header>
<div class="container">
<div class="section-head"><h2><i class="fas fa-plug" style="color:var(--accent)"></i> Built-in Endpoints</h2><span class="badge">${Object.keys(endpoints).length}</span></div>
<div class="endpoint-grid">${cards.split('<!--SPLIT-->')[0]}</div>
<div class="section-head"><h2><i class="fas fa-puzzle-piece" style="color:var(--accent)"></i> Custom Endpoints</h2><span class="badge">${vapi.length}</span></div>
<div class="endpoint-grid" id="customGrid"></div>
</div>
<footer class="footer">Powered by <b>${esc(globalConfig.developerName)}</b> · V502 PRO</footer>
<script>
// Move custom cards to their own grid
const allCards = document.querySelectorAll('.endpoint-card');
let splitIndex = ${Object.keys(endpoints).length};
allCards.forEach((c, i) => {
    if(i >= splitIndex){ document.getElementById('customGrid').appendChild(c); }
});
</script></body></html>`;
}

// ============================================================
// ADMIN PANEL
// ============================================================
function renderAdmin(token){
    const stoken = esc(token);
    const themesList = Object.keys(PRESETS);

    // Scope checkboxes
    const epKeys = Object.keys(endpoints);
    const genScopeHTML = '<label class="scope-item"><input type="checkbox" value="*" checked> <span>🌟 ALL</span></label>' +
        epKeys.map(e => '<label class="scope-item"><input type="checkbox" value="'+e+'"> <span>'+e+'</span></label>').join('') +
        '<label class="scope-item"><input type="checkbox" value="custom"> <span>🔧 CUSTOM</span></label>';
    const updateScopeHTML = '<label class="scope-item"><input type="checkbox" value="*"> <span>🌟 ALL</span></label>' +
        epKeys.map(e => '<label class="scope-item"><input type="checkbox" value="'+e+'"> <span>'+e+'</span></label>').join('') +
        '<label class="scope-item"><input type="checkbox" value="custom"> <span>🔧 CUSTOM</span></label>';

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>BRONX V502 ADMIN</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Fira+Code:wght@400;500&display=swap" rel="stylesheet">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
${generateCSS()}
</head><body>
<div class="grid-bg"></div>
<div class="admin-container">
<div class="sidebar">
<div class="sidebar-header"><div style="font-size:24px">🛡️</div><div class="sidebar-title">BRONX V502</div><div class="sidebar-subtitle">Admin Panel</div></div>
<ul class="sidebar-nav">
<li><a class="active" data-section="dashboard"><i class="fas fa-chart-pie"></i><span>Dashboard</span></a></li>
<li><a data-section="generate"><i class="fas fa-plus-circle"></i><span>Generate Key</span></a></li>
<li><a data-section="keys"><i class="fas fa-key"></i><span>All Keys</span></a></li>
<li><a data-section="endpoints"><i class="fas fa-list"></i><span>Endpoints</span></a></li>
<li><a data-section="responses"><i class="fas fa-code"></i><span>Edit Responses</span></a></li>
<li><a data-section="settings-response"><i class="fas fa-sliders-h"></i><span>Response Settings</span></a></li>
<li><a data-section="monitor"><i class="fas fa-desktop"></i><span>Live Monitor</span></a></li>
<li><a data-section="stats"><i class="fas fa-chart-bar"></i><span>Statistics</span></a></li>
<li><a data-section="theme"><i class="fas fa-palette"></i><span>Theme</span></a></li>
<li><a data-section="import"><i class="fas fa-download"></i><span>Import</span></a></li>
<li><a data-section="export"><i class="fas fa-upload"></i><span>Export</span></a></li>
<li><a data-section="scopes"><i class="fas fa-crosshairs"></i><span>Update Scopes</span></a></li>
<li><a data-section="protect"><i class="fas fa-shield-alt"></i><span>Protection</span></a></li>
<li><a data-section="apis"><i class="fas fa-plug"></i><span>Custom APIs</span></a></li>
<li><a data-section="addapi"><i class="fas fa-puzzle-piece"></i><span>Add API</span></a></li>
<li><a data-section="ddos"><i class="fas fa-shield-virus"></i><span>Smart DDoS</span></a></li>
<li><a data-section="bans"><i class="fas fa-ban"></i><span>Bans</span></a></li>
<li><a data-section="devices"><i class="fas fa-laptop"></i><span>Devices</span></a></li>
<li><a data-section="bulk"><i class="fas fa-layer-group"></i><span>Bulk Actions</span></a></li>
<li><a data-section="pushall"><i class="fas fa-arrow-up"></i><span>Push All</span></a></li>
<li><a data-section="announce"><i class="fas fa-bullhorn"></i><span>Announcement</span></a></li>
<li><a data-section="maintenance"><i class="fas fa-wrench"></i><span>Maintenance</span></a></li>
<li><a data-section="audit"><i class="fas fa-clipboard-list"></i><span>Audit Log</span></a></li>
<li><a data-section="backup"><i class="fas fa-database"></i><span>Backup</span></a></li>
<li><a data-section="settings"><i class="fas fa-cog"></i><span>Settings</span></a></li>
</ul>
</div>
<div class="main-content">

<!-- Stats Header -->
<div class="stats-grid">
<div class="stat-card"><div class="stat-icon">🔑</div><div class="stat-value" id="s-keys">0</div><div class="stat-label">Keys</div></div>
<div class="stat-card"><div class="stat-icon">📊</div><div class="stat-value" id="s-today">0</div><div class="stat-label">Today</div></div>
<div class="stat-card"><div class="stat-icon">📈</div><div class="stat-value" id="s-total">0</div><div class="stat-label">Total</div></div>
<div class="stat-card"><div class="stat-icon">🚫</div><div class="stat-value" id="s-bans">0</div><div class="stat-label">Bans</div></div>
<div class="stat-card"><div class="stat-icon">📱</div><div class="stat-value" id="s-devices">0</div><div class="stat-label">Devices</div></div>
<div class="stat-card"><div class="stat-icon">🔧</div><div class="stat-value" id="s-apis">0</div><div class="stat-label">APIs</div></div>
</div>

<!-- DASHBOARD -->
<div class="glow-card section" id="section-dashboard">
<h3><i class="fas fa-chart-pie"></i> Overview</h3>
<div class="stats-grid">
<div class="stat-card"><div class="stat-value" id="d-today">-</div><div class="stat-label">Today</div></div>
<div class="stat-card"><div class="stat-value" id="d-week">-</div><div class="stat-label">Week</div></div>
<div class="stat-card"><div class="stat-value" id="d-month">-</div><div class="stat-label">Month</div></div>
<div class="stat-card"><div class="stat-value" id="d-total">-</div><div class="stat-label">Total</div></div>
</div>
<h4><i class="fas fa-fire"></i> Top Endpoints</h4>
<div class="table-container"><table><thead><tr><th>Endpoint</th><th>Requests</th></tr></thead><tbody id="topEndpoints"><tr><td colspan="2" style="text-align:center;color:var(--text-muted)">Loading...</td></tr></tbody></table></div>
</div>

<!-- GENERATE -->
<div class="glow-card section" id="section-generate" style="display:none">
<h3><i class="fas fa-wand-magic-sparkles"></i> Generate New Key</h3>
<div class="form-group"><label>Key ID (leave empty for auto-generate)</label><input class="form-input" id="g-key" placeholder="MY_KEY"></div>
<button class="btn-primary btn-warning" onclick="randomKey()" style="width:100%;margin-bottom:14px"><i class="fas fa-dice"></i> 🎲 Generate Random</button>
<div class="form-group"><label>Owner Name *</label><input class="form-input" id="g-owner" placeholder="Client Name"></div>
<div class="form-group"><label>Custom Developer Name (Optional - overrides global for this key only)</label><input class="form-input" id="g-dev" placeholder="@YOUR_CUSTOM_NAME"></div>
<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px">
<div class="form-group"><label>Total Limit</label><input class="form-input" id="g-limit" type="number" value="100"></div>
<div class="form-group"><label>Daily (0=∞)</label><input class="form-input" id="g-daily" type="number" value="0"></div>
<div class="form-group"><label>Per Sec (0=∞)</label><input class="form-input" id="g-persec" type="number" value="0"></div>
</div>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
<div class="form-group"><label>Cooldown (sec)</label><input class="form-input" id="g-cooldown" type="number" value="0"></div>
<div class="form-group"><label>Days Valid</label><input class="form-input" id="g-days" type="number" value="30"></div>
</div>
<div class="form-group"><label>Notes</label><input class="form-input" id="g-notes" placeholder="Optional"></div>
<div class="form-group"><label>Scopes</label><div class="scope-box" id="g-scopes">${genScopeHTML}</div></div>
<button class="btn-primary" onclick="generateKey()" style="width:100%"><i class="fas fa-rocket"></i> Generate Key</button>
</div>

<!-- KEYS -->
<div class="glow-card section" id="section-keys" style="display:none">
<h3><i class="fas fa-key"></i> All Keys (<span id="keysCount">0</span>)</h3>
<div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap">
<input class="form-input" id="keysFilter" placeholder="🔍 Filter..." style="flex:1;min-width:200px" oninput="renderKeys()">
<button class="btn-primary" onclick="loadAll()" style="padding:9px 14px"><i class="fas fa-sync"></i></button>
</div>
<div class="table-container" style="max-height:600px">
<table><thead><tr><th><input type="checkbox" id="selectAllKeys" onchange="toggleSelectAll(this)"></th><th>Key</th><th>Owner</th><th>Limit</th><th>Used</th><th>Left</th><th>Expiry</th><th>Dev Name</th><th>Status</th><th>Actions</th></tr></thead><tbody id="keysBody"><tr><td colspan="10" style="text-align:center;color:var(--text-muted)">Loading...</td></tr></tbody></table>
</div>
</div>

<!-- ENDPOINTS -->
<div class="glow-card section" id="section-endpoints" style="display:none">
<h3><i class="fas fa-list"></i> All Endpoints</h3>
<div class="endpoint-grid" id="endpointsList"></div>
</div>

<!-- RESPONSES -->
<div class="glow-card section" id="section-responses" style="display:none">
<h3><i class="fas fa-code"></i> Edit Endpoint Responses</h3>
<p style="color:var(--text-muted);font-size:12px;margin-bottom:14px">Set custom JSON response shown in public dashboard & returned when no real API configured. Leave empty for default sample.</p>
<div class="form-group"><label>Endpoint</label>
<select class="form-input" id="resp-select" onchange="loadResponse()"><option value="">-- Select --</option></select></div>
<div class="form-group"><label>Response JSON</label>
<textarea class="form-input" id="resp-data" rows="12" placeholder='{"status":"success","data":{}}'></textarea></div>
<div style="display:flex;gap:8px">
<button class="btn-primary" onclick="saveResponse()" style="flex:1"><i class="fas fa-save"></i> Save</button>
<button class="btn-primary btn-warning" onclick="document.getElementById('resp-data').value='';saveResponse()"><i class="fas fa-trash"></i> Clear</button>
</div>
</div>

<!-- RESPONSE SETTINGS -->
<div class="glow-card section" id="section-settings-response" style="display:none">
<h3><i class="fas fa-sliders-h"></i> Response Settings</h3>
<h4>Developer Name</h4>
<div class="form-group"><label>Global Developer Name (shown in all API responses)</label>
<input class="form-input" id="rs-devName" placeholder="@BRONX_ULTRA"></div>
<h4>Hidden Fields</h4>
<p style="color:var(--text-muted);font-size:11px;margin-bottom:8px">Comma-separated fields removed from ALL API responses (e.g. credit, by, channel, api_by)</p>
<div class="form-group">
<textarea class="form-input" id="rs-hidden" rows="3" placeholder="credit, channel, by, api_by"></textarea></div>
<button class="btn-primary btn-success" onclick="saveResponseSettings()" style="width:100%;margin-bottom:20px"><i class="fas fa-save"></i> Save Developer & Hidden Fields</button>
<h4>Custom Error Messages (Plain Text, emoji supported)</h4>
<p style="color:var(--text-muted);font-size:11px;margin-bottom:8px">Placeholders: {used}, {limit}, {date}. Shown as plain text, NOT JSON.</p>
<div class="form-group"><label>Key Not Found</label><input class="form-input" id="msg-keyNotFound"></div>
<div class="form-group"><label>Limit Reached</label><input class="form-input" id="msg-limitReached"></div>
<div class="form-group"><label>Key Stopped</label><input class="form-input" id="msg-keyStopped"></div>
<div class="form-group"><label>Key Disabled</label><input class="form-input" id="msg-keyDisabled"></div>
<div class="form-group"><label>Key Expired</label><input class="form-input" id="msg-keyExpired"></div>
<div class="form-group"><label>Missing Key</label><input class="form-input" id="msg-missingKey"></div>
<div class="form-group"><label>Scope Denied</label><input class="form-input" id="msg-scopeDenied"></div>
<button class="btn-primary" onclick="saveMessages()" style="width:100%"><i class="fas fa-save"></i> Save Messages</button>
</div>

<!-- MONITOR -->
<div class="glow-card section" id="section-monitor" style="display:none">
<h3><i class="fas fa-desktop"></i> Live Monitor</h3>
<div style="display:flex;gap:8px;margin-bottom:12px">
<input class="form-input" id="mon-filter" placeholder="🔍 Filter" style="flex:1" oninput="renderMonitor()">
<button class="btn-primary" onclick="loadMonitor()" style="padding:9px 14px"><i class="fas fa-sync"></i></button>
</div>
<div class="live-logs" id="monitor-logs">Loading...</div>
</div>

<!-- STATS -->
<div class="glow-card section" id="section-stats" style="display:none">
<h3><i class="fas fa-chart-bar"></i> Statistics</h3>
<div class="stats-grid">
<div class="stat-card"><div class="stat-value" id="st-total">-</div><div class="stat-label">Total</div></div>
<div class="stat-card"><div class="stat-value" id="st-today">-</div><div class="stat-label">Today</div></div>
<div class="stat-card"><div class="stat-value" id="st-week">-</div><div class="stat-label">Week</div></div>
<div class="stat-card"><div class="stat-value" id="st-month">-</div><div class="stat-label">Month</div></div>
</div>
<h4><i class="fas fa-chart-pie"></i> Top Endpoints</h4>
<div class="table-container"><table><thead><tr><th>Endpoint</th><th>Requests</th></tr></thead><tbody id="statsEndpoints"></tbody></table></div>
</div>

<!-- THEME -->
<div class="glow-card section" id="section-theme" style="display:none">
<h3><i class="fas fa-palette"></i> Theme Presets</h3>
<div class="endpoint-grid" id="themeGrid"></div>
</div>

<!-- IMPORT -->
<div class="glow-card section" id="section-import" style="display:none">
<h3><i class="fas fa-download"></i> Import Data</h3>
<div class="form-group"><label>Upload JSON File</label><input type="file" id="import-file" accept=".json" onchange="handleImportFile(this)" class="form-input" style="padding:8px"></div>
<div class="form-group"><label>Or Paste JSON</label><textarea class="form-input" id="import-data" rows="10" placeholder='{"keys":{...}}'></textarea></div>
<button class="btn-primary" onclick="importData()" style="width:100%"><i class="fas fa-download"></i> Import</button>
<p id="import-msg" style="margin-top:12px;text-align:center;font-size:13px"></p>
</div>

<!-- EXPORT -->
<div class="glow-card section" id="section-export" style="display:none">
<h3><i class="fas fa-upload"></i> Export Data</h3>
<div style="display:flex;gap:8px;margin-bottom:12px">
<button class="btn-primary" onclick="loadExport()" style="flex:1"><i class="fas fa-sync"></i> Load</button>
<button class="btn-primary btn-success" onclick="copyExport()" style="flex:1"><i class="fas fa-copy"></i> Copy</button>
<button class="btn-primary btn-warning" onclick="downloadExport()" style="flex:1"><i class="fas fa-download"></i> Download</button>
</div>
<textarea class="form-input" id="export-data" rows="15" readonly style="color:var(--success)"></textarea>
</div>

<!-- SCOPES -->
<div class="glow-card section" id="section-scopes" style="display:none">
<h3><i class="fas fa-crosshairs"></i> Update Key Scopes</h3>
<div class="form-group"><label>Key Name</label><input class="form-input" id="sc-key" placeholder="BRONX_..."></div>
<div class="form-group"><label>Scopes</label><div class="scope-box" id="sc-scopes">${updateScopeHTML}</div></div>
<button class="btn-primary" onclick="updateScopes()" style="width:100%"><i class="fas fa-save"></i> Update Scopes</button>
</div>

<!-- PROTECT -->
<div class="glow-card section" id="section-protect" style="display:none">
<h3><i class="fas fa-shield-alt"></i> Data Protection</h3>
<p style="color:var(--text-muted);font-size:12px;margin-bottom:12px">Block specific values from being queried via any API.</p>
<div class="form-group"><label>Value to Protect</label><input class="form-input" id="prot-val" placeholder="e.g. 9876543210"></div>
<button class="btn-primary" onclick="addProtection()" style="width:100%"><i class="fas fa-lock"></i> Add Protection</button>
<div class="table-container" style="margin-top:16px"><table><thead><tr><th>Value</th><th>Action</th></tr></thead><tbody id="prot-list"></tbody></table></div>
</div>

<!-- APIS -->
<div class="glow-card section" id="section-apis" style="display:none">
<h3><i class="fas fa-plug"></i> Custom APIs (<span id="apiCount">0</span>)</h3>
<div class="table-container" style="max-height:500px"><table><thead><tr><th>ID</th><th>Name</th><th>Endpoint</th><th>Param</th><th>Visible</th><th>Actions</th></tr></thead><tbody id="apisBody"></tbody></table></div>
</div>

<!-- ADD API -->
<div class="glow-card section" id="section-addapi" style="display:none">
<h3><i class="fas fa-puzzle-piece"></i> Add Custom API</h3>
<div class="form-group"><label>Name</label><input class="form-input" id="api-name" placeholder="My API"></div>
<div class="form-group"><label>Endpoint (lowercase, no spaces)</label><input class="form-input" id="api-ep" placeholder="my-endpoint"></div>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
<div class="form-group"><label>Param</label><input class="form-input" id="api-param" value="num"></div>
<div class="form-group"><label>Example</label><input class="form-input" id="api-ex" placeholder="9876543210"></div>
</div>
<div class="form-group"><label>Real URL (use {param} placeholder)</label><input class="form-input" id="api-url" placeholder="https://api.com?x={param}"></div>
<button class="btn-primary" onclick="addAPI()" style="width:100%"><i class="fas fa-plus"></i> Add API</button>
</div>

<!-- DDOS -->
<div class="glow-card section" id="section-ddos" style="display:none">
<h3><i class="fas fa-shield-virus"></i> DDoS Protection</h3>
<div class="form-group"><label>Mode</label>
<select class="form-input" id="dd-mode">
<option value="off">🔴 Off</option>
<option value="smart">🟢 Smart (Recommended)</option>
<option value="strict">🟠 Strict (70% stricter)</option>
</select></div>
<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px">
<div class="form-group"><label>IP Burst /10s</label><input class="form-input" id="dd-ip10" type="number"></div>
<div class="form-group"><label>IP /Min</label><input class="form-input" id="dd-ip1m" type="number"></div>
<div class="form-group"><label>IP /Hour</label><input class="form-input" id="dd-ip1h" type="number"></div>
</div>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
<div class="form-group"><label>Temp Ban (min)</label><input class="form-input" id="dd-temp" type="number"></div>
<div class="form-group"><label>Long Ban (min)</label><input class="form-input" id="dd-long" type="number"></div>
</div>
<button class="btn-primary" onclick="saveDDOS()" style="width:100%"><i class="fas fa-save"></i> Save DDoS Config</button>
<button class="btn-primary btn-warning" onclick="clearStrikes()" style="width:100%;margin-top:10px"><i class="fas fa-eraser"></i> Clear All Strikes</button>
</div>

<!-- BANS -->
<div class="glow-card section" id="section-bans" style="display:none">
<h3><i class="fas fa-ban"></i> Bans Manager</h3>
<div style="display:grid;grid-template-columns:1.5fr 2fr 1fr;gap:8px;margin-bottom:12px">
<select class="form-input" id="ban-type"><option value="ip">IP</option><option value="device">Device</option><option value="key">Key</option></select>
<input class="form-input" id="ban-id" placeholder="Value to ban">
<button class="btn-primary btn-danger" onclick="manualBan()"><i class="fas fa-ban"></i> Ban</button>
</div>
<h4>Banned IPs</h4>
<div class="table-container"><table><thead><tr><th>IP</th><th>Reason</th><th>Until</th><th>Action</th></tr></thead><tbody id="banBody"></tbody></table></div>
<button class="btn-primary btn-warning" onclick="unbanAll()" style="width:100%;margin-top:12px"><i class="fas fa-unlock"></i> Unban All</button>
</div>

<!-- DEVICES -->
<div class="glow-card section" id="section-devices" style="display:none">
<h3><i class="fas fa-laptop"></i> Tracked Devices</h3>
<div class="table-container" style="max-height:500px"><table><thead><tr><th>Device ID</th><th>Type</th><th>OS</th><th>Req</th><th>Last Seen</th><th>Status</th><th>Action</th></tr></thead><tbody id="devBody"></tbody></table></div>
</div>

<!-- BULK -->
<div class="glow-card section" id="section-bulk" style="display:none">
<h3><i class="fas fa-layer-group"></i> Bulk Actions</h3>
<p style="color:var(--text-muted);font-size:12px;margin-bottom:12px">Select keys from "All Keys" first. <span id="bulkCount" style="color:var(--accent);font-weight:700">0 selected</span></p>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
<button class="btn-primary btn-success" onclick="bulkAction('bulk-reset')"><i class="fas fa-sync"></i> Reset</button>
<button class="btn-primary btn-warning" onclick="bulkAction('bulk-stop',true)"><i class="fas fa-pause"></i> Stop</button>
<button class="btn-primary" onclick="bulkAction('bulk-stop',false)"><i class="fas fa-play"></i> Activate</button>
<button class="btn-primary btn-info" onclick="bulkAction('bulk-disable',true)"><i class="fas fa-ban"></i> Disable</button>
<button class="btn-primary btn-info" onclick="bulkAction('bulk-disable',false)"><i class="fas fa-check"></i> Enable</button>
<button class="btn-primary btn-danger" onclick="bulkAction('bulk-delete')"><i class="fas fa-trash"></i> Delete</button>
</div>
<div style="margin-top:12px;display:flex;gap:8px">
<input class="form-input" id="bulk-days" type="number" value="30">
<button class="btn-primary btn-warning" onclick="bulkPush()" style="white-space:nowrap"><i class="fas fa-arrow-up"></i> Push</button>
</div>
</div>

<!-- PUSH ALL -->
<div class="glow-card section" id="section-pushall" style="display:none">
<h3><i class="fas fa-arrow-up"></i> Push All Keys</h3>
<div class="form-group"><label>Days to add to ALL keys</label><input class="form-input" id="push-days" type="number" value="30"></div>
<button class="btn-primary btn-warning" onclick="pushAll()" style="width:100%"><i class="fas fa-arrow-up"></i> Push All Keys</button>
</div>

<!-- ANNOUNCEMENT -->
<div class="glow-card section" id="section-announce" style="display:none">
<h3><i class="fas fa-bullhorn"></i> Announcement</h3>
<div class="form-group"><label>Status</label>
<select class="form-input" id="ann-enabled"><option value="false">Off</option><option value="true">On</option></select></div>
<div class="form-group"><label>Text</label><input class="form-input" id="ann-text" placeholder="Welcome to BRONX!"></div>
<button class="btn-primary" onclick="saveAnnouncement()" style="width:100%"><i class="fas fa-save"></i> Save Announcement</button>
</div>

<!-- MAINTENANCE -->
<div class="glow-card section" id="section-maintenance" style="display:none">
<h3><i class="fas fa-wrench"></i> Maintenance Mode</h3>
<div class="form-group"><label>Status</label>
<select class="form-input" id="mt-enabled"><option value="false">Off</option><option value="true">On</option></select></div>
<div class="form-group"><label>Message</label><input class="form-input" id="mt-msg" placeholder="System under maintenance"></div>
<button class="btn-primary btn-warning" onclick="saveMaintenance()" style="width:100%"><i class="fas fa-save"></i> Save Maintenance</button>
</div>

<!-- AUDIT -->
<div class="glow-card section" id="section-audit" style="display:none">
<h3><i class="fas fa-clipboard-list"></i> Audit Log</h3>
<div class="table-container" style="max-height:500px"><table><thead><tr><th>Time</th><th>User</th><th>Action</th><th>Details</th></tr></thead><tbody id="auditBody"></tbody></table></div>
</div>

<!-- BACKUP -->
<div class="glow-card section" id="section-backup" style="display:none">
<h3><i class="fas fa-database"></i> Full Backup & Restore</h3>
<p style="color:var(--text-muted);font-size:12px;margin-bottom:14px">Full backup includes: keys, APIs, settings, protected values, endpoint responses, etc.</p>
<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px">
<button class="btn-primary btn-success" onclick="fullBackup()" style="flex:1"><i class="fas fa-download"></i> Download Backup</button>
<button class="btn-primary" onclick="copyBackup()" style="flex:1"><i class="fas fa-copy"></i> Copy JSON</button>
</div>
<textarea class="form-input" id="backup-output" rows="10" readonly placeholder="Click 'Download' or 'Copy' to load backup..." style="margin-bottom:14px"></textarea>
<h4>Restore</h4>
<div class="form-group"><label>Upload Backup File</label><input type="file" id="restore-file" accept=".json" onchange="handleRestoreFile(this)" class="form-input" style="padding:8px"></div>
<div class="form-group"><label>Or Paste JSON</label><textarea class="form-input" id="restore-data" rows="8" placeholder='{"keys":{...}}'></textarea></div>
<button class="btn-primary btn-warning" onclick="doRestore()" style="width:100%"><i class="fas fa-upload"></i> Restore Backup</button>
</div>

<!-- SETTINGS -->
<div class="glow-card section" id="section-settings" style="display:none">
<h3><i class="fas fa-cog"></i> Settings</h3>
<button class="btn-primary btn-danger" onclick="resetAll()" style="width:100%;margin-bottom:10px"><i class="fas fa-sync"></i> Reset All Usage</button>
<button class="btn-primary btn-danger" onclick="clearLogs()" style="width:100%;margin-bottom:10px"><i class="fas fa-trash"></i> Clear All Logs</button>
<button class="btn-primary btn-warning" onclick="unbanAll()" style="width:100%;margin-bottom:10px"><i class="fas fa-unlock"></i> Unban All</button>
<button class="btn-primary btn-warning" onclick="clearStrikes()" style="width:100%"><i class="fas fa-eraser"></i> Clear All Strikes</button>
</div>

</div>
</div>

<script>
// ============================================================
// ADMIN DASHBOARD JAVASCRIPT
// ============================================================
const TOKEN = '${stoken}';
const ADMIN_PATH = '${ADMIN_PATH}';
const PRESETS = ${JSON.stringify(PRESETS)};
let STATE = { keys: [], apis: [], totals: {}, announcement: {}, maintenance: {}, globalConfig: {}, customMessages: {}, ddosConfig: {}, theme: 'pro-dark', protected: [], endpointResponses: [] };
let monitorData = [];

// --- Helpers ---
function showToast(msg, type){
    type = type || 'success';
    const el = document.createElement('div');
    el.className = 'toast ' + type;
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3500);
}
async function api(path, body){
    try{
        const opts = {
            method: body ? 'POST' : 'GET',
            headers: {'x-admin-token': TOKEN, 'Content-Type': 'application/json'}
        };
        if(body) opts.body = JSON.stringify(body);
        const r = await fetch(ADMIN_PATH + path, opts);
        return await r.json();
    }catch(e){ return { e: 'Network error: ' + e.message }; }
}
function esc(s){ if(s===undefined||s===null) return ''; return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'})[m]); }

// --- Section switching ---
function switchSection(name){
    document.querySelectorAll('.section').forEach(s => s.style.display = 'none');
    document.querySelectorAll('.sidebar-nav a').forEach(a => a.classList.remove('active'));
    const sec = document.getElementById('section-' + name);
    if(sec) sec.style.display = 'block';
    const link = document.querySelector('.sidebar-nav a[data-section="' + name + '"]');
    if(link) link.classList.add('active');
    // Load data per section
    if(name === 'dashboard') loadStats();
    else if(name === 'keys') renderKeys();
    else if(name === 'endpoints') renderEndpoints();
    else if(name === 'monitor') loadMonitor();
    else if(name === 'stats') loadStatsFull();
    else if(name === 'theme') renderThemeGrid();
    else if(name === 'protect') renderProtect();
    else if(name === 'apis') renderAPIs();
    else if(name === 'bans') loadBans();
    else if(name === 'devices') loadDevices();
    else if(name === 'audit') loadAudit();
    else if(name === 'settings-response') loadResponseSettings();
    else if(name === 'responses') loadRespSelect();
    else if(name === 'ddos') loadDDOSConfig();
    else if(name === 'announce') loadAnnouncement();
    else if(name === 'maintenance') loadMaintenance();
}
document.querySelectorAll('.sidebar-nav a').forEach(a => {
    a.addEventListener('click', () => switchSection(a.getAttribute('data-section')));
});

// --- Load all data ---
async function loadAll(){
    const d = await api('/data');
    if(d.e){ showToast(d.e, 'error'); return; }
    STATE = d;
    document.getElementById('s-keys').textContent = d.totals.totalKeys || 0;
    document.getElementById('s-today').textContent = d.totals.todayRequests || 0;
    document.getElementById('s-total').textContent = d.totals.totalRequests || 0;
    document.getElementById('s-bans').textContent = d.totals.totalBans || 0;
    document.getElementById('s-devices').textContent = d.totals.totalDevices || 0;
    document.getElementById('s-apis').textContent = d.totals.totalApis || 0;
    renderKeys();
    renderAPIs();
    loadStats();
}
function renderKeys(){
    const filter = (document.getElementById('keysFilter')?.value || '').toLowerCase();
    const keys = (STATE.keys || []).filter(k => k.key.toLowerCase().includes(filter) || (k.name||'').toLowerCase().includes(filter));
    document.getElementById('keysCount').textContent = keys.length;
    const tb = document.getElementById('keysBody');
    if(!tb) return;
    if(!keys.length){ tb.innerHTML = '<tr><td colspan="10" style="text-align:center;color:var(--text-muted);padding:24px">No keys found</td></tr>'; return; }
    tb.innerHTML = keys.map(k => {
        let status = '<span style="color:var(--success)">✅ Active</span>';
        if(k.stopped) status = '<span style="color:var(--danger)">⛔ Stopped</span>';
        else if(k.disabled) status = '<span style="color:var(--warning)">🚫 Disabled</span>';
        else if(k.isExpired) status = '<span style="color:var(--danger)">⏰ Expired</span>';
        return '<tr>' +
            '<td><input type="checkbox" class="key-cb" value="'+esc(k.key)+'" onchange="updateBulkCount()"></td>' +
            '<td><code style="font-size:10.5px">'+esc(k.key)+'</code></td>' +
            '<td>'+esc(k.name)+'</td>' +
            '<td>'+k.limit+'</td>' +
            '<td><strong style="color:var(--accent)">'+k.used+'</strong></td>' +
            '<td>'+k.left+'</td>' +
            '<td style="font-size:11px">'+esc(k.expiry)+'</td>' +
            '<td style="font-size:11px;color:var(--accent)">'+esc(k.developerName||'—')+'</td>' +
            '<td>'+status+'</td>' +
            '<td style="white-space:nowrap">' +
                '<button class="btn-action" title="Edit" onclick="editKey(\''+esc(k.key)+'\')"><i class="fas fa-edit"></i></button>' +
                '<button class="btn-action" title="Reset" onclick="resetKey(\''+esc(k.key)+'\')"><i class="fas fa-sync"></i></button>' +
                '<button class="btn-action" title="Push" onclick="pushKey(\''+esc(k.key)+'\')"><i class="fas fa-arrow-up"></i></button>' +
                '<button class="btn-action" title="Stop/Start" onclick="toggleStop(\''+esc(k.key)+'\')"><i class="fas fa-pause"></i></button>' +
                '<button class="btn-action" title="Clone" onclick="cloneKey(\''+esc(k.key)+'\')"><i class="fas fa-copy"></i></button>' +
                '<button class="btn-action" title="Delete" style="color:var(--danger)" onclick="deleteKey(\''+esc(k.key)+'\')"><i class="fas fa-trash"></i></button>' +
            '</td></tr>';
    }).join('');
}
function toggleSelectAll(cb){ document.querySelectorAll('.key-cb').forEach(c => c.checked = cb.checked); updateBulkCount(); }
function getSelectedKeys(){ return Array.from(document.querySelectorAll('.key-cb:checked')).map(c => c.value); }
function updateBulkCount(){
    const n = getSelectedKeys().length;
    const el = document.getElementById('bulkCount');
    if(el) el.textContent = n + ' selected';
}
function renderAPIs(){
    const tb = document.getElementById('apisBody');
    if(!tb) return;
    const apis = STATE.apis || [];
    document.getElementById('apiCount').textContent = apis.length;
    tb.innerHTML = apis.length ? apis.map(a => '<tr>' +
        '<td>'+a.id+'</td>' +
        '<td>'+esc(a.name)+'</td>' +
        '<td><code>'+esc(a.endpoint)+'</code></td>' +
        '<td>'+esc(a.param)+'</td>' +
        '<td>'+(a.visible ? '<span style="color:var(--success)">✅</span>' : '<span style="color:var(--danger)">❌</span>')+'</td>' +
        '<td><button class="btn-action" onclick="toggleAPI('+a.id+')"><i class="fas fa-eye"></i></button>' +
        '<button class="btn-action" style="color:var(--danger)" onclick="deleteAPI('+a.id+')"><i class="fas fa-trash"></i></button></td>' +
    '</tr>').join('') : '<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:24px">No custom APIs</td></tr>';
}
async function loadStats(){
    const d = await api('/stats');
    if(d.e) return;
    const set = (id, v) => { const el = document.getElementById(id); if(el) el.textContent = v; };
    set('d-today', d.todayRequests || 0);
    set('d-week', d.weeklyRequests || 0);
    set('d-month', d.monthlyRequests || 0);
    set('d-total', d.totalRequests || 0);
    const tb = document.getElementById('topEndpoints');
    if(tb) tb.innerHTML = (d.topEndpoints || []).length ? d.topEndpoints.map(e => '<tr><td><code>'+esc(e.k)+'</code></td><td><strong style="color:var(--accent)">'+e.v+'</strong></td></tr>').join('') : '<tr><td colspan="2" style="text-align:center;color:var(--text-muted)">No data yet</td></tr>';
}
async function loadStatsFull(){
    const d = await api('/stats');
    if(d.e) return;
    const set = (id, v) => { const el = document.getElementById(id); if(el) el.textContent = v; };
    set('st-total', d.totalRequests || 0);
    set('st-today', d.todayRequests || 0);
    set('st-week', d.weeklyRequests || 0);
    set('st-month', d.monthlyRequests || 0);
    const tb = document.getElementById('statsEndpoints');
    if(tb) tb.innerHTML = (d.topEndpoints || []).length ? d.topEndpoints.map(e => '<tr><td><code>'+esc(e.k)+'</code></td><td><strong style="color:var(--accent)">'+e.v+'</strong></td></tr>').join('') : '<tr><td colspan="2" style="text-align:center;color:var(--text-muted)">No data yet</td></tr>';
}

// --- Key Actions ---
function randomKey(){ document.getElementById('g-key').value = 'BRONX_' + Math.random().toString(36).substring(2,12).toUpperCase(); }
async function generateKey(){
    const scopes = Array.from(document.querySelectorAll('#g-scopes input:checked')).map(c => c.value);
    const body = {
        keyName: document.getElementById('g-key').value.trim(),
        keyOwner: document.getElementById('g-owner').value.trim(),
        developerName: document.getElementById('g-dev').value.trim(),
        limit: document.getElementById('g-limit').value,
        dailyLimit: document.getElementById('g-daily').value,
        perSecondLimit: document.getElementById('g-persec').value,
        cooldown: document.getElementById('g-cooldown').value,
        days: document.getElementById('g-days').value,
        notes: document.getElementById('g-notes').value,
        scopes: scopes.length ? scopes : ['*']
    };
    if(!body.keyOwner){ showToast('Owner name required', 'error'); return; }
    const d = await api('/generate-key', body);
    if(d.success){ showToast(d.message || 'Key generated!', 'success'); loadAll(); setTimeout(() => switchSection('keys'), 800); }
    else showToast(d.e || 'Error', 'error');
}
async function resetKey(k){ if(!confirm('Reset usage for ' + k + '?')) return; const d = await api('/reset-key-usage', {keyName: k}); if(d.success){ showToast('Reset ✓','success'); loadAll(); } else showToast(d.e,'error'); }
async function pushKey(k){ const days = prompt('Days to add?', '30'); if(!days) return; const d = await api('/push-key', {keyName: k, days}); if(d.success){ showToast(d.message,'success'); loadAll(); } else showToast(d.e,'error'); }
async function toggleStop(k){ const d = await api('/stop-key', {keyName: k}); if(d.success){ showToast(d.stopped ? 'Stopped' : 'Activated','info'); loadAll(); } }
async function cloneKey(k){ const d = await api('/clone-key', {keyName: k}); if(d.success){ showToast('Cloned: ' + d.key,'success'); loadAll(); } else showToast(d.e,'error'); }
async function deleteKey(k){ if(!confirm('DELETE key ' + k + '?')) return; const d = await api('/delete-key', {keyName: k}); if(d.success){ showToast('Deleted','success'); loadAll(); } else showToast(d.e,'error'); }
async function editKey(k){
    const kd = STATE.keys.find(x => x.key === k);
    const newOwner = prompt('Owner name:', kd ? kd.name : '');
    if(newOwner === null) return;
    const newLimit = prompt('Limit:', kd ? kd.limit : '100');
    if(newLimit === null) return;
    const newDev = prompt('Custom Developer Name (blank = global):', kd ? kd.developerName : '');
    if(newDev === null) return;
    const d = await api('/edit-key', {keyName: k, newOwner, newLimit, newDeveloperName: newDev});
    if(d.success){ showToast(d.message,'success'); loadAll(); } else showToast(d.e,'error');
}

// --- Endpoints ---
async function renderEndpoints(){
    const d = await api('/data');
    if(d.e) return;
    const all = [...${JSON.stringify(Object.entries(endpoints).map(([n,e]) => ({name: n, d: e.d, i: e.i, p: e.p, e: e.e})))}, ...(d.apis||[]).filter(a => a.visible).map(a => ({name: a.endpoint, d: a.name, i: '🔧', p: a.param, e: a.example, custom: true}))];
    const el = document.getElementById('endpointsList');
    if(!el) return;
    el.innerHTML = all.map(e => '<div class="endpoint-card">' +
        '<div class="ep-header"><span class="ep-icon">'+e.i+'</span><div class="ep-name">/'+esc(e.name)+'</div></div>' +
        '<div class="ep-desc">'+esc(e.d)+'</div>' +
        '<div class="ep-url">/api/' + (e.custom ? 'custom' : 'key-bronx') + '/'+esc(e.name)+'?key=KEY&'+e.p+'='+esc(e.e||'value')+'</div>' +
    '</div>').join('');
}

// --- Responses ---
function loadRespSelect(){
    const sel = document.getElementById('resp-select');
    if(!sel) return;
    let opts = '<option value="">-- Select --</option>';
    Object.keys(${JSON.stringify(endpoints)}).forEach(e => { opts += '<option value="'+e+'">'+e+'</option>'; });
    (STATE.apis || []).forEach(a => { opts += '<option value="'+a.endpoint+'">'+a.endpoint+' (custom)</option>'; });
    sel.innerHTML = opts;
}
async function loadResponse(){
    const ep = document.getElementById('resp-select').value;
    if(!ep){ document.getElementById('resp-data').value = ''; return; }
    const d = await api('/get-endpoint-response?endpoint=' + encodeURIComponent(ep));
    document.getElementById('resp-data').value = d.data ? JSON.stringify(d.data, null, 2) : '';
}
async function saveResponse(){
    const ep = document.getElementById('resp-select').value;
    if(!ep){ showToast('Select endpoint', 'error'); return; }
    const data = document.getElementById('resp-data').value;
    const d = await api('/update-endpoint-response', {endpoint: ep, responseData: data});
    if(d.success) showToast('Saved ✓','success');
    else showToast(d.e || 'Invalid JSON','error');
}

// --- Response Settings ---
async function loadResponseSettings(){
    const d = await api('/response-settings');
    if(d.e) return;
    document.getElementById('rs-devName').value = d.globalConfig.developerName || '';
    document.getElementById('rs-hidden').value = d.globalConfig.hiddenFields || '';
    Object.keys(d.customMessages || {}).forEach(k => {
        const el = document.getElementById('msg-' + k);
        if(el) el.value = d.customMessages[k];
    });
}
async function saveResponseSettings(){
    const d = await api('/update-response-settings', {
        developerName: document.getElementById('rs-devName').value,
        hiddenFields: document.getElementById('rs-hidden').value
    });
    if(d.success) showToast('Developer & hidden fields saved ✓','success');
    else showToast(d.e || 'Error','error');
}
async function saveMessages(){
    const messages = {};
    ['keyNotFound','limitReached','keyStopped','keyDisabled','keyExpired','missingKey','scopeDenied'].forEach(k => {
        const el = document.getElementById('msg-' + k);
        if(el) messages[k] = el.value;
    });
    const d = await api('/update-response-settings', {messages});
    if(d.success) showToast('Messages saved ✓','success');
    else showToast(d.e || 'Error','error');
}

// --- Monitor ---
async function loadMonitor(){
    const d = await api('/monitor-logs');
    if(d.e) return;
    monitorData = d.logs || [];
    renderMonitor();
}
function renderMonitor(){
    const filter = (document.getElementById('mon-filter')?.value || '').toLowerCase();
    const el = document.getElementById('monitor-logs');
    if(!el) return;
    const filtered = monitorData.filter(l => JSON.stringify(l).toLowerCase().includes(filter));
    el.innerHTML = filtered.length ? filtered.slice().reverse().map(l => '<div class="log-entry">' +
        '<span class="log-time">'+esc(l.timestamp)+'</span>' +
        '<span class="log-key">'+esc(l.key)+'</span>' +
        '<span class="log-endpoint">'+esc(l.endpoint)+'</span>' +
        '<span class="log-ip">'+esc(l.ip)+'</span>' +
    '</div>').join('') : '<div style="text-align:center;color:var(--text-muted);padding:24px">No logs yet</div>';
}

// --- Theme ---
function renderThemeGrid(){
    const el = document.getElementById('themeGrid');
    if(!el) return;
    el.innerHTML = Object.keys(PRESETS).map(name => {
        const p = PRESETS[name];
        const active = STATE.theme === name ? 'border-color:var(--accent);box-shadow:0 0 0 2px var(--accent)' : '';
        return '<div class="endpoint-card" style="cursor:pointer;text-align:center;'+active+'" onclick="applyPreset(\''+name+'\')">' +
            '<div style="height:40px;border-radius:5px;margin-bottom:10px;background:linear-gradient(135deg,'+p.accent+','+p.accent2+')"></div>' +
            '<div style="font-weight:600;color:var(--text-primary)">'+name+'</div>' +
        '</div>';
    }).join('');
}
async function applyPreset(name){
    const d = await api('/theme/preset', {preset: name});
    if(d.success){ showToast('Theme: ' + name,'success'); setTimeout(() => location.reload(), 500); }
    else showToast(d.e,'error');
}

// --- Import ---
function handleImportFile(input){
    const f = input.files[0]; if(!f) return;
    const r = new FileReader();
    r.onload = e => {
        try{ JSON.parse(e.target.result); document.getElementById('import-data').value = e.target.result; showToast('File loaded','success'); }
        catch(err){ showToast('Invalid JSON','error'); }
    };
    r.readAsText(f);
}
async function importData(){
    const data = document.getElementById('import-data').value.trim();
    if(!data){ showToast('No data','error'); return; }
    let parsed;
    try{ parsed = JSON.parse(data); }catch(e){ showToast('Invalid JSON','error'); return; }
    const d = await api('/import-keys', parsed);
    const el = document.getElementById('import-msg');
    if(d.success){ el.innerHTML = '<span style="color:var(--success)">'+esc(d.message)+'</span>'; showToast(d.message,'success'); loadAll(); }
    else{ el.innerHTML = '<span style="color:var(--danger)">'+esc(d.e)+'</span>'; showToast(d.e,'error'); }
}

// --- Export ---
async function loadExport(){
    const d = await api('/export-keys');
    if(d.e){ showToast(d.e,'error'); return; }
    document.getElementById('export-data').value = JSON.stringify(d, null, 2);
    showToast('Loaded ' + d.total + ' keys','success');
}
function copyExport(){ const t = document.getElementById('export-data'); if(!t.value){ showToast('Click Load first','error'); return; } t.select(); document.execCommand('copy'); showToast('Copied ✓','success'); }
function downloadExport(){
    const data = document.getElementById('export-data').value;
    if(!data){ showToast('Click Load first','error'); return; }
    const blob = new Blob([data], {type: 'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'bronx_keys_' + Date.now() + '.json';
    a.click();
    showToast('Downloaded','success');
}

// --- Scopes ---
async function updateScopes(){
    const keyName = document.getElementById('sc-key').value.trim();
    if(!keyName){ showToast('Enter key','error'); return; }
    const scopes = Array.from(document.querySelectorAll('#sc-scopes input:checked')).map(c => c.value);
    if(!scopes.length){ showToast('Select at least one scope','error'); return; }
    const d = await api('/update-scopes', {keyName, scopes});
    if(d.success) showToast('Scopes updated ✓','success');
    else showToast(d.e,'error');
}

// --- Protect ---
async function renderProtect(){
    const d = await api('/data');
    if(d.e) return;
    STATE.protected = d.protected || [];
    const tb = document.getElementById('prot-list');
    if(!tb) return;
    tb.innerHTML = STATE.protected.length ? STATE.protected.map(v => '<tr><td><code>'+esc(v)+'</code></td><td><button class="btn-action" style="color:var(--danger)" onclick="removeProtection(\''+esc(v)+'\')"><i class="fas fa-trash"></i></button></td></tr>').join('') : '<tr><td colspan="2" style="text-align:center;color:var(--text-muted);padding:24px">No protected values</td></tr>';
}
async function addProtection(){
    const v = document.getElementById('prot-val').value.trim();
    if(!v){ showToast('Enter value','error'); return; }
    const d = await api('/add-protection', {value: v});
    if(d.success){ showToast('Protected','success'); document.getElementById('prot-val').value = ''; renderProtect(); }
    else showToast(d.e,'error');
}
async function removeProtection(v){
    const d = await api('/remove-protection', {value: v});
    if(d.success){ showToast('Removed','success'); renderProtect(); }
}

// --- APIs ---
async function addAPI(){
    const body = {
        name: document.getElementById('api-name').value.trim(),
        endpoint: document.getElementById('api-ep').value.trim(),
        param: document.getElementById('api-param').value.trim(),
        example: document.getElementById('api-ex').value.trim(),
        realAPI: document.getElementById('api-url').value.trim(),
        visible: true
    };
    if(!body.name || !body.endpoint){ showToast('Name + endpoint required','error'); return; }
    const d = await api('/add-api', body);
    if(d.success){ showToast(d.message,'success'); loadAll(); }
    else showToast(d.e,'error');
}
async function toggleAPI(id){ const d = await api('/toggle-api', {id}); if(d.success){ showToast('Toggled','info'); loadAll(); } }
async function deleteAPI(id){ if(!confirm('Delete?')) return; const d = await api('/delete-api', {id}); if(d.success){ showToast('Deleted','success'); loadAll(); } }

// --- DDoS ---
async function loadDDOSConfig(){
    const d = await api('/ddos-config');
    if(d.e) return;
    document.getElementById('dd-mode').value = d.mode;
    document.getElementById('dd-ip10').value = d.ip.burst10s;
    document.getElementById('dd-ip1m').value = d.ip.perMinute;
    document.getElementById('dd-ip1h').value = d.ip.perHour;
    document.getElementById('dd-temp').value = d.tempBanMs / 60000;
    document.getElementById('dd-long').value = d.longBanMs / 60000;
}
async function saveDDOS(){
    const body = {
        mode: document.getElementById('dd-mode').value,
        ip: {
            burst10s: document.getElementById('dd-ip10').value,
            perMinute: document.getElementById('dd-ip1m').value,
            perHour: document.getElementById('dd-ip1h').value
        },
        tempBanMs: parseInt(document.getElementById('dd-temp').value) * 60000,
        longBanMs: parseInt(document.getElementById('dd-long').value) * 60000
    };
    const d = await api('/ddos-config', body);
    if(d.success) showToast('DDoS saved ✓','success');
    else showToast(d.e,'error');
}
async function clearStrikes(){ const d = await api('/clear-strikes', {}); if(d.success) showToast('Strikes cleared','success'); }

// --- Bans ---
async function loadBans(){
    const d = await api('/bans');
    if(d.e) return;
    const tb = document.getElementById('banBody');
    if(!tb) return;
    tb.innerHTML = (d.ip || []).length ? d.ip.map(b => '<tr>' +
        '<td><code>'+esc(b.id)+'</code></td>' +
        '<td>'+esc(b.reason || '')+'</td>' +
        '<td>'+(b.permanent ? '<span style="color:var(--danger)">PERMANENT</span>' : new Date(b.until).toLocaleString())+'</td>' +
        '<td><button class="btn-action" onclick="unban(\'ip\',\''+esc(b.id)+'\')"><i class="fas fa-unlock"></i></button></td>' +
    '</tr>').join('') : '<tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:24px">No IP bans</td></tr>';
}
async function manualBan(){
    const type = document.getElementById('ban-type').value;
    const id = document.getElementById('ban-id').value.trim();
    if(!id){ showToast('Enter value','error'); return; }
    const d = await api('/ban', {type, id, permanent: true, reason: 'Manual'});
    if(d.success){ showToast('Banned','success'); loadBans(); }
}
async function unban(type, id){ const d = await api('/unban', {type, id}); if(d.success){ showToast('Unbanned','success'); loadBans(); } }
async function unbanAll(){ const d = await api('/unban-all', {}); if(d.success){ showToast('All unbanned','success'); loadBans(); loadAll(); } }

// --- Devices ---
async function loadDevices(){
    const d = await api('/devices');
    if(d.e) return;
    const tb = document.getElementById('devBody');
    if(!tb) return;
    tb.innerHTML = (d.devices || []).length ? d.devices.slice(0, 100).map(dev => '<tr>' +
        '<td><code style="font-size:10.5px">'+esc(dev.id)+'</code></td>' +
        '<td>'+(dev.deviceIcon || '')+' '+esc(dev.deviceType || '')+'</td>' +
        '<td>'+esc(dev.os || '')+'</td>' +
        '<td><strong>'+dev.requests+'</strong></td>' +
        '<td style="font-size:11px">'+esc(dev.lastSeen)+'</td>' +
        '<td>'+(dev.banned ? '<span style="color:var(--danger)">Banned</span>' : '<span style="color:var(--success)">OK</span>')+'</td>' +
        '<td><button class="btn-action" onclick="banDevice(\''+esc(dev.id)+'\')"><i class="fas fa-ban"></i></button></td>' +
    '</tr>').join('') : '<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:24px">No devices tracked</td></tr>';
}
async function banDevice(id){ const d = await api('/ban', {type: 'device', id, permanent: true, reason: 'Manual'}); if(d.success){ showToast('Device banned','success'); loadDevices(); } }

// --- Bulk ---
async function bulkAction(ep, state){
    const keys = getSelectedKeys();
    if(!keys.length){ showToast('Select keys first','error'); return; }
    const body = {keys};
    if(state !== undefined) body.state = state;
    const d = await api('/' + ep, body);
    if(d.success){ showToast('Done ✓','success'); loadAll(); }
    else showToast(d.e,'error');
}
async function bulkPush(){
    const keys = getSelectedKeys();
    if(!keys.length){ showToast('Select keys first','error'); return; }
    const days = document.getElementById('bulk-days').value;
    const d = await api('/bulk-push', {keys, days});
    if(d.success){ showToast('Pushed ' + d.count,'success'); loadAll(); }
    else showToast(d.e,'error');
}

// --- Push All ---
async function pushAll(){
    const days = document.getElementById('push-days').value;
    if(!confirm('Push ' + days + ' days to ALL keys?')) return;
    const d = await api('/push-all', {days});
    if(d.success){ showToast(d.message,'success'); loadAll(); }
    else showToast(d.e,'error');
}

// --- Announcement ---
async function loadAnnouncement(){
    const d = await api('/data');
    if(d.e) return;
    document.getElementById('ann-enabled').value = d.announcement?.enabled ? 'true' : 'false';
    document.getElementById('ann-text').value = d.announcement?.text || '';
}
async function saveAnnouncement(){
    const body = {
        enabled: document.getElementById('ann-enabled').value === 'true',
        text: document.getElementById('ann-text').value
    };
    const d = await api('/announcement', body);
    if(d.success) showToast('Announcement saved ✓','success');
    else showToast(d.e,'error');
}

// --- Maintenance ---
async function loadMaintenance(){
    const d = await api('/data');
    if(d.e) return;
    document.getElementById('mt-enabled').value = d.maintenance?.enabled ? 'true' : 'false';
    document.getElementById('mt-msg').value = d.maintenance?.message || '';
}
async function saveMaintenance(){
    const body = {
        enabled: document.getElementById('mt-enabled').value === 'true',
        message: document.getElementById('mt-msg').value
    };
    const d = await api('/maintenance', body);
    if(d.success) showToast('Maintenance saved ✓','success');
    else showToast(d.e,'error');
}

// --- Audit ---
async function loadAudit(){
    const d = await api('/audit-log');
    if(d.e) return;
    const tb = document.getElementById('auditBody');
    if(!tb) return;
    tb.innerHTML = (d.logs || []).length ? d.logs.slice().reverse().slice(0, 100).map(l => '<tr>' +
        '<td style="font-size:11px">'+esc(l.timestamp)+'</td>' +
        '<td>'+esc(l.user)+'</td>' +
        '<td><code>'+esc(l.action)+'</code></td>' +
        '<td style="font-size:10.5px">'+esc(JSON.stringify(l.details || {}))+'</td>' +
    '</tr>').join('') : '<tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:24px">No audit logs</td></tr>';
}

// --- Backup ---
async function fullBackup(){
    const d = await api('/backup');
    if(d.e){ showToast(d.e,'error'); return; }
    const str = JSON.stringify(d, null, 2);
    document.getElementById('backup-output').value = str;
    const blob = new Blob([str], {type: 'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'bronx_full_backup_' + Date.now() + '.json';
    a.click();
    showToast('Backup downloaded ✓','success');
}
async function copyBackup(){
    const d = await api('/backup');
    if(d.e){ showToast(d.e,'error'); return; }
    const str = JSON.stringify(d, null, 2);
    document.getElementById('backup-output').value = str;
    document.getElementById('backup-output').select();
    document.execCommand('copy');
    showToast('Copied ✓','success');
}
function handleRestoreFile(input){
    const f = input.files[0]; if(!f) return;
    const r = new FileReader();
    r.onload = e => {
        try{ JSON.parse(e.target.result); document.getElementById('restore-data').value = e.target.result; showToast('File loaded','success'); }
        catch(err){ showToast('Invalid JSON','error'); }
    };
    r.readAsText(f);
}
async function doRestore(){
    const data = document.getElementById('restore-data').value.trim();
    if(!data){ showToast('No data','error'); return; }
    let parsed;
    try{ parsed = JSON.parse(data); }catch(e){ showToast('Invalid JSON','error'); return; }
    if(!confirm('Restore this backup? Existing data will be merged.')) return;
    const d = await api('/restore', parsed);
    if(d.success){ showToast(d.message || 'Restored ✓','success'); loadAll(); }
    else showToast(d.e,'error');
}

// --- Settings ---
async function resetAll(){ if(!confirm('Reset ALL key usage?')) return; const d = await api('/reset-all', {}); if(d.success){ showToast('Reset all','success'); loadAll(); } }
async function clearLogs(){ if(!confirm('Clear all logs?')) return; const d = await api('/clear-logs', {}); if(d.success) showToast('Logs cleared','success'); }

// --- Init ---
loadAll();
setInterval(loadAll, 30000);
</script>

</body></html>`;
    return html;
}

// ============================================================
// 🚀 START
// ============================================================
initHardcoded();
const loaded = loadFromDisk();
if(!loaded || customAPIs.length === 0) initCustomAPIs();

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log('╔══════════════════════════════════════════════════╗');
    console.log('║  🛡️  BRONX OSINT V502 PRO — ONLINE              ║');
    console.log('║  📡  Port: ' + PORT);
    console.log('║  🔐  Admin: ' + ADMIN_PATH);
    console.log('║  👤  User: ' + ADMIN_USERNAME);
    console.log('║  🎨  Theme: ' + theme.preset);
    console.log('║  🛡️  DDoS: ' + ddosConfig.mode);
    console.log('║  🔑  Keys: ' + Object.keys(keyStorage).length);
    console.log('║  🔧  APIs: ' + customAPIs.length);
    console.log('╚══════════════════════════════════════════════════╝');
});
