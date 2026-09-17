// Cloudflare Worker: Telegram Unlimited File Storage & CORS Cloud Sync Proxy for SamGTU 3-INGT-110
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

          const body = await request.text();
          const res = await fetch(binUrl, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              "Accept": "application/json"
            },
            body: body
          });
          const text = await res.text();
          return new Response(text, {
            status: res.status,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }
      }

      if (url.pathname === "/upload" && request.method === "POST") {
        if (APP_SECRET && request.headers.get("X-App-Key") !== APP_SECRET) {
          return new Response(JSON.stringify({ error: "Unauthorized: Invalid or missing X-App-Key" }), {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

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

      // 3. Direct File Streaming (Bypasses RKN / Works in Russia without VPN!)
      if (url.pathname === "/file") {
        const fileId = url.searchParams.get("file_id");
        if (!fileId) return new Response("Missing file_id", { status: 400 });

        const infoRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${fileId}`);
        const info = await infoRes.json();
        if (!info.ok) return new Response("File not found in Telegram", { status: 404 });

        const directUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${info.result.file_path}`;
        const fileRes = await fetch(directUrl);
        const fileName = (info.result.file_path || "").split("/").pop() || "file";

        return new Response(fileRes.body, {
          headers: {
            ...corsHeaders,
            "Content-Type": fileRes.headers.get("Content-Type") || "application/octet-stream",
            "Content-Disposition": `inline; filename="${encodeURIComponent(fileName)}"`
          }
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
