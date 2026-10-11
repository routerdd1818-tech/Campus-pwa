// ============================================================================
// Campus v1 — Supabase Edge Function: campus-api-gateway
// 用途：將所有外部 API（Google Gemini AI 課表辨識、LINE Messaging API 推播、
//       LINE Bot 資訊查詢、LINE OAuth Token 簽發、LINE 好友列表同步）
//       統一集中在 Supabase 雲端執行，API 金鑰全數由 public.app_api_configs 讀取！
//
// 部署後網址：
// https://dxoobrrjzaovwpyagzgn.supabase.co/functions/v1/campus-api-gateway
// ============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "https://dxoobrrjzaovwpyagzgn.supabase.co";
    const supabaseKey =
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
      Deno.env.get("SUPABASE_ANON_KEY") ??
      "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    const action: string = body?.action ?? "";

    // 從 public.app_api_configs 讀取所有雲端金鑰
    const { data: configRows } = await supabase
      .from("app_api_configs")
      .select("config_key, config_value");

    const vault: Record<string, string> = {};
    for (const row of configRows ?? []) {
      if (row.config_key && row.config_value) {
        vault[row.config_key] = String(row.config_value).trim();
      }
    }

    // 輔助函式：取得有效的 LINE Channel Access Token
    const getLineToken = async (): Promise<string> => {
      if (vault["line_channel_access_token"]) {
        return vault["line_channel_access_token"];
      }
      const channelId = vault["line_channel_id"];
      const channelSecret = vault["line_channel_secret"];
      if (channelId && channelSecret) {
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
      }
      return "";
    };

    // ========================================================================
    // Action 1: gemini_ocr — 在 Supabase 雲端呼叫 Google Gemini 辨識課表圖片
    // ========================================================================
    if (action === "gemini_ocr") {
      const geminiKey = vault["gemini_api_key"] ?? "";
      if (!geminiKey) {
        return new Response(
          JSON.stringify({ status: "error", message: "Supabase app_api_configs 尚未設定 gemini_api_key" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const base64Image: string = body?.base64Image ?? "";
      const prompt: string = body?.prompt ?? "";
      const models: string[] = body?.models ?? ["gemini-2.5-flash", "gemini-2.0-flash"];

      let lastErr = "未知錯誤";
      for (const model of models) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`;
        const geminiRes = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: prompt },
                  { inline_data: { mime_type: "image/jpeg", data: base64Image } },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.1,
              responseMimeType: "application/json",
            },
          }),
        });

        const geminiJson = await geminiRes.json();
        if (geminiRes.ok) {
          const text = geminiJson?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
          if (text) {
            return new Response(
              JSON.stringify({ status: "ok", model, text }),
              { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        } else {
          lastErr = geminiJson?.error?.message ?? `HTTP ${geminiRes.status}`;
        }
      }

      return new Response(
        JSON.stringify({ status: "error", message: lastErr }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ========================================================================
    // Action 2: line_push — 透過 Supabase 雲端發送 LINE 推播或廣播
    // ========================================================================
    if (action === "line_push") {
      const token = await getLineToken();
      if (!token) {
        return new Response(
          JSON.stringify({ status: "error", message: "無可用的 LINE Channel Access Token" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      let targetUserId: string = (body?.targetUserId ?? "").trim();
      const messageText: string = body?.messageText ?? "";

      // 若傳入 AUTO_<shareCode>，自動從 line_followers 查找真實 U 開頭 ID
      if (targetUserId.startsWith("AUTO_")) {
        const shareCode = targetUserId.replace("AUTO_", "").trim().toUpperCase();
        const { data: follower } = await supabase
          .from("line_followers")
          .select("line_user_id")
          .eq("bound_share_code", shareCode)
          .maybeSingle();
        if (follower?.line_user_id) {
          targetUserId = follower.line_user_id;
        }
      }

      const isValidUser = targetUserId.length === 33 && /^[UCR][0-9a-fA-F]{32}$/.test(targetUserId);
      const endpoint = isValidUser
        ? "https://api.line.me/v2/bot/message/push"
        : "https://api.line.me/v2/bot/message/broadcast";

      const linePayload = isValidUser
        ? { to: targetUserId, messages: [{ type: "text", text: messageText }] }
        : { messages: [{ type: "text", text: messageText }] };

      const lineRes = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(linePayload),
      });

      const respText = await lineRes.text();
      return new Response(
        JSON.stringify({
          status: lineRes.ok ? "ok" : "error",
          http_code: lineRes.status,
          mode: isValidUser ? "push" : "broadcast",
          resolved_user_id: targetUserId,
          response: respText,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ========================================================================
    // Action 3: line_bot_info — 查詢 LINE 官方帳號資訊 (@basicId, displayName)
    // ========================================================================
    if (action === "line_bot_info") {
      const token = await getLineToken();
      if (!token) {
        return new Response(
          JSON.stringify({ status: "error", message: "無可用的 LINE Channel Access Token" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const infoRes = await fetch("https://api.line.me/v2/bot/info", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const infoJson = await infoRes.json();
      return new Response(JSON.stringify({ status: infoRes.ok ? "ok" : "error", data: infoJson }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ========================================================================
    // Action 4: line_sync_followers — 同步已加好友的 LINE 用戶清單與個人檔案
    // ========================================================================
    if (action === "line_sync_followers") {
      const token = await getLineToken();
      if (token) {
        try {
          const followersRes = await fetch("https://api.line.me/v2/bot/followers/ids?limit=50", {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (followersRes.ok) {
            const followersJson = await followersRes.json();
            const userIds: string[] = followersJson?.userIds ?? [];
            for (const uid of userIds) {
              const profRes = await fetch(`https://api.line.me/v2/bot/profile/${uid}`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              if (profRes.ok) {
                const prof = await profRes.json();
                await supabase.rpc("bind_line_user_to_schedule", {
                  p_line_user_id: uid,
                  p_display_name: prof.displayName ?? "LINE 好友",
                  p_share_code: "",
                  p_device_id: "",
                  p_picture_url: prof.pictureUrl ?? "",
                });
              }
            }
          }
        } catch (_e) {
          // 若無權限呼叫 followers/ids (僅認證帳號或特定方案支援)，仍回傳資料庫內由 Webhook 收集的好友清單
        }
      }

      const { data: followers } = await supabase
        .from("line_followers")
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(50);

      return new Response(
        JSON.stringify({ status: "ok", followers: followers ?? [] }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ status: "error", message: `未知的 action: ${action}` }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ status: "error", message: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
