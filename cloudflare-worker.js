// Cloudflare Worker: Telegram Unlimited File Storage & CORS Cloud Sync Proxy for SamGTU 3-INGT-110

// In-memory rate limiting and deduplication storage (per isolate)
export const recentErrorHashes = new Map();
export const recentAlertTimestamps = [];

export const recentUploadTimestamps = [];

export function clearWorkerRateLimits() {
  recentErrorHashes.clear();
  recentAlertTimestamps.length = 0;
  recentUploadTimestamps.length = 0;
}

export function isUploadRateLimited(now = Date.now()) {
  const UPLOAD_WINDOW_MS = 60 * 1000;
  const MAX_UPLOADS_PER_MINUTE = 3;
  while (recentUploadTimestamps.length > 0 && (now - recentUploadTimestamps[0]) > UPLOAD_WINDOW_MS) {
    recentUploadTimestamps.shift();
  }
  return recentUploadTimestamps.length >= MAX_UPLOADS_PER_MINUTE;
}

export function recordUploadSent(now = Date.now()) {
  recentUploadTimestamps.push(now);
}

// Strict Whitelist DTO Sanitizers (Video 2: Protection against Mass Assignment / Extra Fields)
export function sanitizeHomeworkItem(item, fallbackGroupId = '') {
  if (!item || typeof item !== 'object') return null;
  return {
    id: String(item.id || ''),
    groupId: String(item.groupId || fallbackGroupId || ''),
    subject: String(item.subject || '').slice(0, 200),
    title: String(item.title || '').slice(0, 300),
    description: String(item.description || '').slice(0, 4000),
    assignedDate: String(item.assignedDate || '').slice(0, 30),
    dueDate: String(item.dueDate || '').slice(0, 30),
    attachments: Array.isArray(item.attachments) ? item.attachments.slice(0, 10).map(att => ({
      name: String(att.name || '').slice(0, 200),
      type: String(att.type || 'file').slice(0, 30),
      size: Number(att.size) || 0,
      url: String(att.url || '').slice(0, 1000)
    })) : [],
    createdAt: String(item.createdAt || '').slice(0, 50)
  };
}

export function sanitizeAttendanceRecord(rec, fallbackGroupId = '') {
  if (!rec || typeof rec !== 'object') return null;
  const status = String(rec.status || '').toLowerCase();
  const validStatus = ['present', 'absent', 'excused', 'illness', ''].includes(status) ? status : '';
  return {
    studentId: typeof rec.studentId === 'number' ? rec.studentId : String(rec.studentId || '').slice(0, 50),
    lessonId: String(rec.lessonId || '').slice(0, 80),
    status: validStatus,
    date: String(rec.date || '').slice(0, 20),
    groupId: String(rec.groupId || fallbackGroupId || '').slice(0, 50),
    updatedAt: Number(rec.updatedAt) || Date.now()
  };
}

export function sanitizeScheduleOverride(ov) {
  if (!ov || typeof ov !== 'object') return null;
  const res = {};
  if (ov.subject !== undefined) res.subject = String(ov.subject).slice(0, 200);
  if (ov.type !== undefined) res.type = String(ov.type).slice(0, 50);
  if (ov.location !== undefined) res.location = String(ov.location).slice(0, 200);
  if (ov.teacher !== undefined) res.teacher = String(ov.teacher).slice(0, 150);
  if (ov.isCancelled !== undefined) res.isCancelled = Boolean(ov.isCancelled);
  if (ov.note !== undefined) res.note = String(ov.note).slice(0, 500);
  return res;
}

export function sanitizeSyncPayload(type, rawData) {
  if (!rawData || typeof rawData !== 'object') return rawData;
  const now = Date.now();

  // If payload is wrapped in { payload: string, updatedAt: number }
  if (typeof rawData.payload === 'string') {
    try {
      const inner = JSON.parse(rawData.payload);
      const cleanInner = sanitizeSyncPayload(type, inner);
      return {
        payload: JSON.stringify(cleanInner),
        updatedAt: Number(rawData.updatedAt) || now
      };
    } catch {
      return rawData;
    }
  }

  if (type === 'homework') {
    const res = { updatedAt: Number(rawData.updatedAt) || now };
    if (rawData.byGroup && typeof rawData.byGroup === 'object') {
      res.byGroup = {};
      for (const [gid, grp] of Object.entries(rawData.byGroup)) {
        if (grp && typeof grp === 'object') {
          res.byGroup[gid] = {
            items: Array.isArray(grp.items) ? grp.items.map(it => sanitizeHomeworkItem(it, gid)).filter(Boolean) : [],
            deletedIds: Array.isArray(grp.deletedIds) ? grp.deletedIds.map(String).slice(0, 200) : [],
            updatedAt: Number(grp.updatedAt) || now
          };
        }
      }
    }
    if (Array.isArray(rawData.items)) {
      res.items = rawData.items.map(it => sanitizeHomeworkItem(it)).filter(Boolean);
    }
    if (Array.isArray(rawData.deletedIds)) {
      res.deletedIds = rawData.deletedIds.map(String).slice(0, 200);
    }
    return res;
  }

  if (type === 'attendance') {
    const res = { updatedAt: Number(rawData.updatedAt) || now };
    if (rawData.byGroup && typeof rawData.byGroup === 'object') {
      res.byGroup = {};
      for (const [gid, grp] of Object.entries(rawData.byGroup)) {
        if (grp && typeof grp === 'object') {
          res.byGroup[gid] = {
            records: Array.isArray(grp.records) ? grp.records.map(r => sanitizeAttendanceRecord(r, gid)).filter(Boolean) : [],
            updatedAt: Number(grp.updatedAt) || now
          };
        }
      }
    }
    if (Array.isArray(rawData.records)) {
      res.records = rawData.records.map(r => sanitizeAttendanceRecord(r)).filter(Boolean);
    }
    return res;
  }

  if (type === 'schedule') {
    const res = { updatedAt: Number(rawData.updatedAt) || now };
    if (rawData.byGroup && typeof rawData.byGroup === 'object') {
      res.byGroup = {};
      for (const [gid, grp] of Object.entries(rawData.byGroup)) {
        if (grp && typeof grp === 'object') {
          const cleanGrp = { updatedAt: Number(grp.updatedAt) || now };
          if (grp.overrides && typeof grp.overrides === 'object') {
            cleanGrp.overrides = {};
            for (const [k, v] of Object.entries(grp.overrides)) {
              cleanGrp.overrides[k] = sanitizeScheduleOverride(v);
            }
          }
          if (grp.teachers && typeof grp.teachers === 'object') {
            cleanGrp.teachers = {};
            for (const [k, v] of Object.entries(grp.teachers)) {
              cleanGrp.teachers[k] = String(v).slice(0, 150);
            }
          }
          res.byGroup[gid] = cleanGrp;
        }
      }
    }
    if (rawData.scheduleOverrides && typeof rawData.scheduleOverrides === 'object') {
      res.scheduleOverrides = {};
      for (const [k, v] of Object.entries(rawData.scheduleOverrides)) {
        res.scheduleOverrides[k] = sanitizeScheduleOverride(v);
      }
    }
    if (rawData.subjectTeachers && typeof rawData.subjectTeachers === 'object') {
      res.subjectTeachers = {};
      for (const [k, v] of Object.entries(rawData.subjectTeachers)) {
        res.subjectTeachers[k] = String(v).slice(0, 150);
      }
    }
    return res;
  }

  return rawData;
}

export function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function isDeduplicated(errorKey, now = Date.now()) {
  const DEDUP_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
  for (const [key, timestamp] of recentErrorHashes.entries()) {
    if (now - timestamp > DEDUP_WINDOW_MS) {
      recentErrorHashes.delete(key);
    }
  }
  if (recentErrorHashes.has(errorKey)) {
    const lastTime = recentErrorHashes.get(errorKey);
    if (now - lastTime < DEDUP_WINDOW_MS) {
      return true;
    }
  }
  return false;
}

export function isRateLimited(now = Date.now()) {
  const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
  const MAX_ALERTS_PER_MINUTE = 5;
  while (recentAlertTimestamps.length > 0 && (now - recentAlertTimestamps[0]) > RATE_LIMIT_WINDOW_MS) {
    recentAlertTimestamps.shift();
  }
  return recentAlertTimestamps.length >= MAX_ALERTS_PER_MINUTE;
}

export function recordAlertSent(errorKey, now = Date.now()) {
  recentErrorHashes.set(errorKey, now);
  recentAlertTimestamps.push(now);
}

export function formatTelegramErrorHtml({ message, stack, component, group, platform, userAgent, timestamp }) {
  const safeGroup = escapeHtml(group || 'Не указана');
  const safePlatform = escapeHtml(platform || 'Не определена');
  const safeComponent = escapeHtml(component || 'Неизвестный компонент');
  const safeTime = escapeHtml(timestamp || new Date().toISOString());
  const safeMessage = escapeHtml((message || 'Без описания ошибки').slice(0, 1000));

  let text = `🚨 <b>СИГНАЛИЗАЦИЯ ОБ ОШИБКЕ (TMA)</b> 🚨\n\n` +
    `👥 <b>Группа:</b> <code>${safeGroup}</code>\n` +
    `📱 <b>Платформа:</b> ${safePlatform}\n` +
    `🧩 <b>Компонент:</b> <code>${safeComponent}</code>\n` +
    `⏰ <b>Время:</b> ${safeTime}\n\n` +
    `❌ <b>Ошибка:</b>\n<code>${safeMessage}</code>\n`;

  if (stack) {
    const safeStack = escapeHtml(String(stack).slice(0, 1500));
    text += `\n📑 <b>Фрагмент стека:</b>\n<pre>${safeStack}</pre>\n`;
  }

  if (userAgent) {
    const safeUa = escapeHtml(String(userAgent).slice(0, 200));
    text += `\n🌐 <b>User-Agent:</b> <pre>${safeUa}</pre>`;
  }

  return text;
}

export default {
  async fetch(request, env) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Accept, Cache-Control, Pragma, Authorization, X-App-Key",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);
    const BOT_TOKEN = (env && env.TELEGRAM_BOT_TOKEN) ? env.TELEGRAM_BOT_TOKEN : "";
    const CHANNEL_ID = (env && env.TELEGRAM_CHANNEL_ID) ? env.TELEGRAM_CHANNEL_ID : "-1002345678901";

    const APP_SECRET = (env && (env.APP_SECRET || env.X_APP_KEY)) ? (env.APP_SECRET || env.X_APP_KEY) : null;

    const BINS = {
      schedule: "https://extendsclass.com/api/json-storage/bin/cecbcbf",
      homework: "https://extendsclass.com/api/json-storage/bin/dfdebcc",
      attendance: "https://extendsclass.com/api/json-storage/bin/cdaacff"
    };

    try {
      // 0. Maintenance & Service Health Endpoint
      if (url.pathname === "/status" || url.pathname === "/maintenance") {
        const isMaintenance = (env && (env.MAINTENANCE_MODE === "true" || env.MAINTENANCE_MODE === true)) || false;
        const message = (env && env.MAINTENANCE_MESSAGE) || "Ведутся плановые технические работы по обновлению базы данных расписания.";
        const estimatedEndTime = (env && env.MAINTENANCE_UNTIL) || null;
        return new Response(JSON.stringify({
          ok: true,
          maintenance: isMaintenance,
          message,
          estimatedEndTime,
          timestamp: new Date().toISOString()
        }), {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
            "Cache-Control": "no-cache, no-store, must-revalidate"
          }
        });
      }

      // 1. Cloud Storage Sync (Schedule, Homework, Attendance)
      // Solves CORS Preflight 500 error & provides atomic server-to-server updates
      if (url.pathname.startsWith("/sync/")) {
        const type = url.pathname.replace("/sync/", "").replace(/^\/+|\/+$/g, "");
        const binUrl = BINS[type];
        if (!binUrl) {
          return new Response(JSON.stringify({ error: "Unknown sync type: " + type }), {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        // GET latest data from cloud bin
        if (request.method === "GET") {
          const res = await fetch(`${binUrl}?_t=${Date.now()}`, {
            headers: { "Accept": "application/json", "Cache-Control": "no-cache" }
          });
          const text = await res.text();
          return new Response(text, {
            status: res.status,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
              "Cache-Control": "no-cache, no-store, must-revalidate",
              "Pragma": "no-cache"
            }
          });
        }

        // PUT or POST save data to cloud bin (Worker does server-to-server PUT without browser CORS preflight block!)
        if (request.method === "PUT" || request.method === "POST") {
          if (APP_SECRET && request.headers.get("X-App-Key") !== APP_SECRET) {
            return new Response(JSON.stringify({ error: "Unauthorized: Invalid or missing X-App-Key" }), {
              status: 401,
              headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
          }

          const rawText = await request.text();
          let sanitizedBody = rawText;

          // Mass Assignment Protection (Video 2: Strict Whitelist DTO)
          try {
            const parsed = JSON.parse(rawText);
            const cleanData = sanitizeSyncPayload(type, parsed);
            sanitizedBody = JSON.stringify(cleanData);
          } catch {
            return new Response(JSON.stringify({ error: "Invalid JSON body for sync" }), {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
          }

          const res = await fetch(binUrl, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              "Accept": "application/json"
            },
            body: sanitizedBody
          });
          const text = await res.text();
          return new Response(text, {
            status: res.status,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }
      }

      // 2. File Upload to Telegram Channel
      if (url.pathname === "/upload" && request.method === "POST") {
        if (APP_SECRET && request.headers.get("X-App-Key") !== APP_SECRET) {
          return new Response(JSON.stringify({ error: "Unauthorized: Invalid or missing X-App-Key" }), {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        // Anti-DoS Rate Limiting for upload
        const now = Date.now();
        if (isUploadRateLimited(now)) {
          return new Response(JSON.stringify({ error: "Too many upload requests. Please wait a moment." }), {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }
        recordUploadSent(now);

        if (!BOT_TOKEN) {
          return new Response(JSON.stringify({ error: "TELEGRAM_BOT_TOKEN is not configured" }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const formData = await request.formData();
        formData.set("chat_id", CHANNEL_ID);

        const tgRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendDocument`, {
          method: "POST",
          body: formData,
        });

        const data = await tgRes.json();
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // 2b. Private Document Export for Starosta (Word .docx reports)
      if (url.pathname === "/export-doc" && request.method === "POST") {
        if (APP_SECRET && request.headers.get("X-App-Key") !== APP_SECRET) {
          return new Response(JSON.stringify({ error: "Unauthorized: Invalid or missing X-App-Key" }), {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        const now = Date.now();
        if (isUploadRateLimited(now)) {
          return new Response(JSON.stringify({ error: "Too many export requests. Please wait a moment." }), {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }
        recordUploadSent(now);

        if (!BOT_TOKEN) {
          return new Response(JSON.stringify({ error: "TELEGRAM_BOT_TOKEN is not configured" }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const formData = await request.formData();
        const file = formData.get("document");
        const requestedChatId = formData.get("chat_id");
        const rawFileName = formData.get("filename") || "Ведомость_посещаемости.docx";
        const caption = formData.get("caption") || "📄 Официальная ведомость пропусков";

        if (!file) {
          return new Response(JSON.stringify({ error: "Missing document file in formData" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        const PRIVATE_STORAGE_CHAT = (env && (env.TELEGRAM_DEV_CHAT_ID || env.DEV_CHAT_ID))
          ? (env.TELEGRAM_DEV_CHAT_ID || env.DEV_CHAT_ID)
          : CHANNEL_ID;

        let tgJson = null;
        let sentToUser = false;

        // Step 1: If requestedChatId (starosta's user ID) is present, send directly to their PM
        if (requestedChatId) {
          const userFormData = new FormData();
          userFormData.append("chat_id", String(requestedChatId));
          userFormData.append("document", file, String(rawFileName));
          userFormData.append("caption", String(caption));

          try {
            const userTgRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendDocument`, {
              method: "POST",
              body: userFormData
            });
            tgJson = await userTgRes.json();
            if (tgJson && tgJson.ok) {
              sentToUser = true;
            }
          } catch (e) {
            console.warn("Direct send to user chat failed, falling back to private storage chat:", e);
          }
        }

        // Step 2: Fallback to private storage chat if direct send failed (e.g. 403 Forbidden)
        if (!sentToUser) {
          const fallbackFormData = new FormData();
          fallbackFormData.append("chat_id", String(PRIVATE_STORAGE_CHAT));
          fallbackFormData.append("document", file, String(rawFileName));
          fallbackFormData.append("caption", `[Архив ведомостей] ${caption}`);

          const fallbackRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendDocument`, {
            method: "POST",
            body: fallbackFormData
          });
          tgJson = await fallbackRes.json();
        }

        if (!tgJson || !tgJson.ok) {
          return new Response(JSON.stringify({ error: tgJson?.description || "Failed to store document in Telegram" }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        const fileId = tgJson.result.document.file_id;
        const fileName = tgJson.result.document.file_name || rawFileName;
        const directUrl = `${url.origin}/file?file_id=${fileId}&download=1&filename=${encodeURIComponent(fileName)}`;

        return new Response(JSON.stringify({
          ok: true,
          file_id: fileId,
          filename: fileName,
          direct_url: directUrl,
          sent_to_pm: sentToUser
        }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // 3. Direct File Streaming (Bypasses RKN / Works in Russia without VPN!)
      if (url.pathname === "/file") {
        const fileId = url.searchParams.get("file_id");
        if (!fileId) return new Response("Missing file_id", { status: 400 });

        const infoRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${fileId}`);
        const info = await infoRes.json();
        if (!info.ok) return new Response("File not found in Telegram", { status: 404 });

        const directUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${info.result.file_path}`;
        const fileRes = await fetch(directUrl);
        
        const queryFilename = url.searchParams.get("filename") || url.searchParams.get("name");
        const rawFileName = queryFilename || (info.result.file_path || "").split("/").pop() || "file";
        
        // RFC 5987: ASCII fallback + UTF-8 encoded filename for Russian characters on mobile
        const safeAsciiName = rawFileName.replace(/[^\x20-\x7E]/g, '_');
        const utf8EncodedName = encodeURIComponent(rawFileName);

        let contentType = fileRes.headers.get("Content-Type") || "application/octet-stream";
        if (rawFileName.toLowerCase().endsWith(".docx")) {
          contentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        }

        const isDownload = url.searchParams.get("download") === "1" || rawFileName.toLowerCase().endsWith(".docx");
        const dispositionType = isDownload ? "attachment" : "inline";

        return new Response(fileRes.body, {
          headers: {
            ...corsHeaders,
            "Content-Type": contentType,
            "Content-Disposition": `${dispositionType}; filename="${safeAsciiName}"; filename*=UTF-8''${utf8EncodedName}`,
            "Cache-Control": "private, max-age=3600"
          }
        });
      }

      // 4. Proxy official SamGTU schedule API (CORS bypass for client admin verification)
      if (url.pathname === "/samgtu-schedule" && request.method === "GET") {
        const samgtuGroupId = url.searchParams.get("groupId");
        const weekNumber = url.searchParams.get("week") || "1";
        if (!samgtuGroupId) {
          return new Response(JSON.stringify({ error: "Missing groupId query param" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        const targetUrl = `https://samgtu.ru/students/getschedule?GroupID=${encodeURIComponent(samgtuGroupId)}&WeekNumber=${encodeURIComponent(weekNumber)}`;
        const samgtuRes = await fetch(targetUrl, {
          headers: {
            "Accept": "application/json, text/plain, */*",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
          }
        });
        const samgtuData = await samgtuRes.text();
        return new Response(samgtuData, {
          status: samgtuRes.status,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
            "Cache-Control": "public, max-age=3600"
          }
        });
      }

      // 5. Telegram Notification Endpoint (for nightly sync / system alerts)
      if (url.pathname === "/notify" && request.method === "POST") {
        if (APP_SECRET && request.headers.get("X-App-Key") !== APP_SECRET) {
          return new Response(JSON.stringify({ error: "Unauthorized: Invalid or missing X-App-Key" }), {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        if (!BOT_TOKEN) {
          return new Response(JSON.stringify({ error: "TELEGRAM_BOT_TOKEN is not configured" }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        const body = await request.json();
        const text = body.message || body.text;
        if (!text) {
          return new Response(JSON.stringify({ error: "Missing message text" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        const tgRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: body.chat_id || CHANNEL_ID,
            text: text,
            parse_mode: body.parse_mode || "HTML"
          })
        });
        const tgJson = await tgRes.json();
        return new Response(JSON.stringify(tgJson), {
          status: tgRes.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // 6. Telegram Telemetry & Error Alerting Endpoint (Video 1)
      if (url.pathname === "/report-error" && request.method === "POST") {
        let body = {};
        try {
          body = await request.json();
        } catch {
          return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        const message = body.message;
        if (!message || typeof message !== 'string') {
          return new Response(JSON.stringify({ error: "Missing or invalid 'message' field" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        const now = Date.now();
        const component = body.component || 'Unknown';
        const errorKey = `${component}::${message.trim()}`;

        // Deduplication check (max 1 message per identical error per 5 minutes)
        if (isDeduplicated(errorKey, now)) {
          return new Response(JSON.stringify({ ok: true, throttled: true, reason: "duplicate_error" }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        // Global Rate Limit check (max 5 alerts per minute across all errors)
        if (isRateLimited(now)) {
          return new Response(JSON.stringify({ ok: true, throttled: true, reason: "global_rate_limit" }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        // Record alert event
        recordAlertSent(errorKey, now);

        if (!BOT_TOKEN) {
          return new Response(JSON.stringify({ ok: true, warning: "TELEGRAM_BOT_TOKEN is not configured" }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        const targetChatId = (env && (env.TELEGRAM_DEV_CHAT_ID || env.DEV_CHAT_ID))
          ? (env.TELEGRAM_DEV_CHAT_ID || env.DEV_CHAT_ID)
          : CHANNEL_ID;

        const htmlText = formatTelegramErrorHtml({
          message: body.message,
          stack: body.stack,
          component: body.component,
          group: body.group,
          platform: body.platform,
          userAgent: body.userAgent || request.headers.get("User-Agent") || "Unknown",
          timestamp: body.timestamp
        });

        const tgRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: targetChatId,
            text: htmlText,
            parse_mode: "HTML"
          })
        });

        const tgJson = await tgRes.json().catch(() => ({}));
        return new Response(JSON.stringify({ ok: true, telegram: tgJson }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      return new Response("SamGTU Telegram Storage and Cloud Sync Worker is Running OK", { headers: corsHeaders });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }
};
