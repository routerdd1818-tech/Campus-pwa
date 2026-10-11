# ☁️ Campus v1 — Supabase 全雲端 API 與 LINE 加好友自動識別設定教學

本專案已將 **所有外部 API 金鑰、雲端中繼函數、每日定時排程、以及 LINE 加好友自動識別 User ID (`U...`)** 完整整合至 Supabase！您不需要在本地寫任何後端伺服器，只要照著以下 **3 個步驟** 在 Supabase 網頁後台貼上即可完成。

---

## 📁 為您建立的 Supabase 檔案清單

1. **[`supabase/supabase_all_in_one.sql`](file:///Users/routertt/Documents/VSCode/Campus%20v1/supabase/supabase_all_in_one.sql)**（核心 SQL 總表，必執行！）
   - 建立所有資料表（課表 `courses`、待辦 `todos`、分享課表 `shared_schedules`、記帳 4 張表）。
   - 建立 **API 雲端保險箱 (`public.app_api_configs`)**，統一存放：
     - `line_channel_id` / `line_channel_secret` / `line_channel_access_token`
     - `gemini_api_key`（Google Gemini AI 課表圖片辨識金鑰）
   - 建立 **LINE 好友自動探索表 (`public.line_followers` & `public.line_bind_sessions`)**。
   - 建立 **雲端 RPC 函數**：
     - `relay_line_message`：由 Supabase PostgreSQL (`pg_net`) 直接發送 LINE 推播，並自動將 `AUTO_<課表分享碼>` 轉換為真實 `U...` LINE ID！
     - `bind_line_user_to_schedule` & `claim_latest_line_follower`：當使用者加好友或傳送分享碼時，自動將 `U...` LINE ID 綁定至他的課表與裝置。
     - `send_line_daily_briefing`：每分鐘透過 `pg_cron` 自動檢查並發送今日課表與待辦提醒（關掉 App 也會準時推播）。

2. **[`supabase/functions/line-webhook/index.ts`](file:///Users/routertt/Documents/VSCode/Campus%20v1/supabase/functions/line-webhook/index.ts)**（LINE Webhook 自動抓 ID 函數）
   - 當使用者點擊 **「加好友」** 時，LINE 官方伺服器會立即通知此 Webhook，自動抓取使用者的 **33 碼 `U...` LINE User ID** 與 **LINE 暱稱/頭像**，寫入 `public.line_followers` 並自動配對他在 App 內的課表分享碼！

3. **[`supabase/functions/campus-api-gateway/index.ts`](file:///Users/routertt/Documents/VSCode/Campus%20v1/supabase/functions/campus-api-gateway/index.ts)**（雲端 API 統一閘道）
   - 將 **Google Gemini AI 課表圖片辨識 (`gemini_ocr`)**、**LINE 推播 (`line_push`)**、**LINE 官方帳號資訊 (`line_bot_info`)**、**LINE 好友清單同步 (`line_sync_followers`)** 全部跑在 Supabase 雲端，App 只需傳送資料給 Supabase。

---

## 🚀 步驟 1：在 Supabase SQL Editor 執行一鍵建表與 API 腳本（只需 30 秒）

1. 登入您的 [Supabase Dashboard](https://supabase.com/dashboard/project/dxoobrrjzaovwpyagzgn)。
2. 點擊左側選單的 **「SQL Editor」** ➔ 點擊 **「+ New query」**。
3. 打開專案中的 [`supabase/supabase_all_in_one.sql`](file:///Users/routertt/Documents/VSCode/Campus%20v1/supabase/supabase_all_in_one.sql)（或在 App 內「設定 ➔ 雲端與資料庫設定」點擊 **「一鍵複製完整雲端 SQL 腳本」**）。
4. 全選貼上至 SQL Editor，點擊右下角綠色的 **「Run」**。
5. 畫面下方出現 **`Success. No rows returned`** 即代表所有資料表、API 金鑰保險箱與雲端定時推播皆已部署完成！

> 💡 **如何修改或更新雲端 API 金鑰？**
> 您可以直接在 Supabase 左側點擊 **「Table Editor」 ➔ `app_api_configs`**，直接點兩下修改 `gemini_api_key` 或 `line_channel_access_token`，所有人的 App 打開時就會自動套用最新金鑰，完全不用重新編譯 App！

---

## 🤖 步驟 2：部署 Edge Functions（讓加好友自動知道使用者 LINE ID）

您不需要安裝終端機工具，直接在 **Supabase 網頁後台** 即可建立：

### 2-1. 建立 `line-webhook`（加好友自動抓 LINE ID）
1. 在 Supabase 左側選單點擊 **「Edge Functions」** ➔ 點擊右上角 **「Deploy a new function」 ➔ 「Via Editor」**。
2. **Function Name** 輸入：`line-webhook`
3. 將 [`supabase/functions/line-webhook/index.ts`](file:///Users/routertt/Documents/VSCode/Campus%20v1/supabase/functions/line-webhook/index.ts) 的內容完整貼上，點擊 **「Deploy function」**。
4. 部署後點擊該 Function 的 **「Details / Settings」**，將 **「Enforce JWT Verification」關閉 (Off)**（因為 LINE 伺服器呼叫 Webhook 時不會帶 Supabase JWT）。
5. 複製顯示的網址：
   ```text
   https://dxoobrrjzaovwpyagzgn.supabase.co/functions/v1/line-webhook
   ```

### 2-2. 建立 `campus-api-gateway`（Gemini AI 課表辨識與 LINE 雲端閘道）
1. 同樣在 **「Edge Functions」** 點擊 **「Deploy a new function」 ➔ 「Via Editor」**。
2. **Function Name** 輸入：`campus-api-gateway`
3. 將 [`supabase/functions/campus-api-gateway/index.ts`](file:///Users/routertt/Documents/VSCode/Campus%20v1/supabase/functions/campus-api-gateway/index.ts) 的內容完整貼上，點擊 **「Deploy function」**。
4. 同樣在設定中將 **「Enforce JWT Verification」關閉 (Off)**。

---

## 🔗 步驟 3：在 LINE Developers 綁定 Webhook 網址（設定一次永久有效）

1. 前往 [LINE Developers Console](https://developers.line.biz/console/) ➔ 進入您的 **Messaging API Channel**。
2. 切換到 **「Messaging API」** 分頁，往下滑找到 **「Webhook settings」**。
3. 在 **Webhook URL** 填入剛才的 Supabase 網址：
   ```text
   https://dxoobrrjzaovwpyagzgn.supabase.co/functions/v1/line-webhook
   ```
4. 點擊 **「Update」** 後，點擊 **「Verify」**（會顯示 `Success`），並將下方的 **「Use webhook」開關打開 (Enabled)**！
5. *(選用)* 建議至 **LINE Official Account Manager ➔ 回應設定**，將「加入好友的歡迎訊息」與「自動回應訊息」關閉，由我們的 Supabase Webhook 自動回覆綁定成功訊息。

---

## ✨ 現在使用者如何「加好友自動取得 LINE ID」？

設定完成後，使用者在 Campus App 內 **完全不需要自己去查 33 碼的 `U...` LINE ID**：

1. **方式 A（加好友零輸入自動綁定）**：
   - 使用者在 App「LINE 機器人推播設定」點擊 **「步驟 1：點此加 LINE 好友（自動識別您的 LINE ID）」**。
   - App 會在 Supabase `line_bind_sessions` 登記 15 分鐘的待綁定工作階段並跳轉至 LINE。
   - 使用者按下「加入好友」瞬間，LINE Webhook 自動把他的 `U...` ID 與 LINE 暱稱寫入 Supabase 並配對他的課表分享碼！回到 App 即自動帶入真實 `U...` ID。
2. **方式 B（已是好友？一鍵傳送綁定碼 100% 精準配對）**：
   - 點擊 App 內的 **「步驟 2：一鍵傳送專屬綁定碼至 LINE」**，會自動打開 LINE 聊天室並預填 `綁定課表_XXXXXX`。
   - 按下傳送後，Bot 會立即回覆「✅ 課表綁定成功！您的 LINE ID：U...」，回到 App 即自動完成綁定！
3. **方式 C（從已加好友清單一鍵點選）**：
   - App 內會即時列出所有已加入官方帳號的 LINE 好友暱稱（`discoveredFollowers`），點擊自己的 LINE 名字即可 1 秒填入專屬 `U...` ID！
