// ============================================================================
// Campus v1 — Supabase Edge Function: line-webhook
// 用途：接收 LINE Messaging API Webhook (加好友 follow 事件 & 傳訊 message 事件)
//       自動取得使用者的 LINE User ID (U 開頭 33 碼) 與 LINE 暱稱，
//       並自動配對 App 內的課表分享碼 (無須手動查詢或輸入 LINE ID！)
//
// 部署後 Webhook 網址：
// https://xjdwjrmtiutapoeikvln.supabase.co/functions/v1/line-webhook
// (請記得在 Supabase Edge Function 設定關閉 "Enforce JWT Verification")
// ============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-line-signature",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // 支援瀏覽器或 LINE Developers Verify 測試
  if (req.method === "GET") {
    return new Response(
      JSON.stringify({ status: "ok", service: "Campus v1 LINE Webhook on Supabase" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "https://xjdwjrmtiutapoeikvln.supabase.co";
    const supabaseKey =
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
      Deno.env.get("SUPABASE_ANON_KEY") ??
      "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    const events = body?.events ?? [];

    // Verify 按鈕測試時 events 為空陣列，直接回傳 200 OK
    if (!Array.isArray(events) || events.length === 0) {
      return new Response(JSON.stringify({ status: "ok", events: 0 }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. 從 Supabase 雲端保險箱 (app_api_configs) 讀取 LINE Channel Access Token 或透過 ID/Secret 動態簽發
    const { data: configRows } = await supabase
      .from("app_api_configs")
      .select("config_key, config_value");

    const vault: Record<string, string> = {};
    for (const row of configRows ?? []) {
      if (row.config_key && row.config_value) {
        vault[row.config_key] = String(row.config_value).trim();
      }
    }

    const getLineToken = async (): Promise<string> => {
      if (vault["line_channel_access_token"]) {
        return vault["line_channel_access_token"];
      }
      const channelId = vault["line_channel_id"];
      const channelSecret = vault["line_channel_secret"];
      if (channelId && channelSecret) {
        try {
          const oauthRes = await fetch("https://api.line.me/v2/oauth/accessToken", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
              grant_type: "client_credentials",
              client_id: channelId,
              client_secret: channelSecret,
            }),
          });
          if (oauthRes.ok) {
            const oauthJson = await oauthRes.json();
            const token = oauthJson?.access_token ?? "";
            if (token) {
              await supabase.from("app_api_configs").upsert({
                config_key: "line_channel_access_token",
                config_value: token,
                updated_at: new Date().toISOString(),
              });
              return token;
            }
          }
        } catch (_e) {
          // Ignore oauth fetch errors
        }
      }
      return "";
    };

    const lineAccessToken = await getLineToken();

    const results = [];

    for (const ev of events) {
      const eventType: string = ev?.type ?? "unknown";
      const lineUserId: string = ev?.source?.userId ?? "";
      const replyToken: string = ev?.replyToken ?? "";
      const messageText: string = ev?.message?.text?.trim() ?? "";

      if (!lineUserId.startsWith("U")) {
        continue;
      }

      // 2. 透過 LINE Profile API 自動取得好友的 LINE 顯示名稱與頭像
      let displayName = "LINE 好友";
      let pictureUrl = "";
      if (lineAccessToken) {
        try {
          const profileRes = await fetch(`https://api.line.me/v2/bot/profile/${lineUserId}`, {
            headers: { Authorization: `Bearer ${lineAccessToken}` },
          });
          if (profileRes.ok) {
            const profile = await profileRes.json();
            displayName = profile.displayName ?? displayName;
            pictureUrl = profile.pictureUrl ?? "";
          }
        } catch (_e) {
          // 忽略個人資料讀取失敗，仍繼續綁定 userId
        }
      }

      // 3. 解析訊息內是否包含 6 碼課表分享碼 (例如「綁定課表_AB12CD」或直接輸入「AB12CD」)
      let extractedCode: string | null = null;
      if (eventType === "message" && messageText) {
        const cleaned = messageText
          .toUpperCase()
          .replace("綁定課表_", "")
          .replace("綁定_", "")
          .replace("綁定", "")
          .replace("BIND_", "")
          .replace("BIND", "")
          .trim();
        if (/^[A-Z0-9]{6}$/.test(cleaned)) {
          extractedCode = cleaned;
        }
      }

      // 4. 呼叫 Supabase 資料庫 RPC 自動記錄好友並配對課表分享碼
      const { data: bindResult, error: bindErr } = await supabase.rpc(
        "bind_line_user_to_schedule",
        {
          p_line_user_id: lineUserId,
          p_display_name: displayName,
          p_share_code: extractedCode ?? "",
          p_device_id: "",
          p_picture_url: pictureUrl,
        }
      );

      const matchedShareCode = bindResult?.bound_share_code ?? extractedCode ?? "";

      // 5. 若有 replyToken 且有 Access Token，自動在 LINE 聊天室回覆綁定結果與專屬 LINE ID
      if (replyToken && lineAccessToken) {
        let replyMessage = "";
        if (eventType === "follow") {
          if (matchedShareCode) {
            replyMessage =
              `🎉 歡迎加入 Campus 課表小幫手！\n\n` +
              `👤 哈囉 ${displayName}，系統已自動識別您的 LINE ID 並成功綁定課表分享碼【${matchedShareCode}】！\n\n` +
              `✅ 請直接返回 Campus App，您的 LINE 推播已自動啟用，無須手動輸入 ID。`;
          } else {
            replyMessage =
              `🎉 歡迎加入 Campus 課表小幫手！\n\n` +
              `👤 哈囉 ${displayName}，系統已自動記錄您的 LINE ID：\n${lineUserId}\n\n` +
              `📲 請返回 Campus App 點擊「自動偵測並帶入 LINE ID」，或直接在此聊天室傳送您的 6 碼課表分享碼即可完成綁定！`;
          }
        } else if (eventType === "message" && matchedShareCode && extractedCode) {
          replyMessage =
            `✅ 課表綁定成功！\n\n` +
            `👤 帳號：${displayName}\n` +
            `🔗 已綁定課表分享碼：【${matchedShareCode}】\n` +
            `🆔 您的 LINE ID：${lineUserId}\n\n` +
            `返回 Campus App 後即可自動同步並接收每日課表與待辦提醒！`;
        } else if (
          eventType === "message" &&
          (messageText.toUpperCase().includes("ID") || messageText.includes("查詢") || messageText.includes("綁定"))
        ) {
          replyMessage =
            `🆔 您的專屬 LINE User ID 為：\n${lineUserId}\n\n` +
            (matchedShareCode
              ? `🔗 目前已綁定課表分享碼：【${matchedShareCode}】`
              : `💡 您也可以直接傳送 6 碼「課表分享碼」自動完成綁定！`);
        }

        if (replyMessage) {
          await fetch("https://api.line.me/v2/bot/message/reply", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${lineAccessToken}`,
            },
            body: JSON.stringify({
              replyToken,
              messages: [{ type: "text", text: replyMessage }],
            }),
          });
        }
      }

      results.push({
        eventType,
        lineUserId,
        displayName,
        matchedShareCode,
        error: bindErr?.message ?? null,
      });
    }

    return new Response(JSON.stringify({ status: "ok", processed: results }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ status: "error", message: err instanceof Error ? err.message : String(err) }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
