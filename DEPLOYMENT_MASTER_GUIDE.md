# 🚀 Campus v1 全平台雲端部署與配置全指南 (LINE Bot + Supabase + Vercel PWA)

> 本指南整合所有要修改與設定的平台（LINE Developers、Supabase 資料庫、Supabase Edge Functions、Vercel 部署），已完全移除所有 iOS / Swift 原生代碼，全面轉移為 **PWA 跨平台網頁應用 + Supabase 雲端資料庫 + LINE Bot 專屬個人化推播**。

---

## 📋 目錄
1. [架構總覽](#1-架構總覽)
2. [Supabase 雲端資料庫一鍵設定 (SQL Editor)](#2-supabase-雲端資料庫一鍵設定)
3. [LINE Developers Console 設定](#3-line-developers-console-設定)
4. [Supabase Edge Functions 部署 (LINE Webhook & API Gateway)](#4-supabase-edge-functions-部署)
5. [Vercel PWA 前端網頁部署](#5-vercel-pwa-前端網頁部署)
6. [多帳號資料獨立與自訂節次功能驗證](#6-多帳號資料獨立與自訂節次功能驗證)

---

## 1. 架構總覽

```
┌────────────────────────────────────────────────────────┐
│                   使用者 (iOS / Android / 桌面)          │
│               PWA 跨平台 App (可加入手機主畫面全螢幕)      │
└───────────────▲────────────────────────▲───────────────┘
                │                        │
       (1) HTTPS / REST          (2) LINE 加好友 / 晨報
                │                        │
┌───────────────▼─────────────┐   ┌──────▼───────────────┐
│     Vercel 託管前端          │   │  LINE 官方帳號 Bot   │
│  (自動讀取 GitHub main 分支)  │   │  (Messaging API)     │
└─────────────────────────────┘   └──────▲───────────────┘
                │                        │
                │                        │ Webhook / Push
                │                        │
┌───────────────▼────────────────────────▼───────────────┐
│                    Supabase 雲端平台                    │
│  1. PostgreSQL 資料表 (帳號隔離, 課表, 待辦, 記帳, 行事曆)   │
│  2. app_api_configs (LINE Token, Gemini API 雲端保險箱)│
│  3. pg_cron + pg_net (24/7 免開手機自動定時晨報推播)       │
│  4. Edge Functions (line-webhook, campus-api-gateway)  │
└────────────────────────────────────────────────────────┘
```

---

## 2. Supabase 雲端資料庫一鍵設定

### 步驟說明：
1. 登入 [Supabase Dashboard](https://supabase.com/dashboard/project/xjdwjrmtiutapoeikvln)。
2. 點選左側選單的 **「SQL Editor」**。
3. 點選 **「+ New query」**。
4. 打開本專案中的 `supabase/supabase_all_in_one.sql`，全選複製內容並貼入 SQL Editor。
5. 點擊右下角綠色的 **「Run」** 按鈕執行。

### 包含的資料表與功能：
- `public.user_accounts`：多使用者註冊、登入密碼驗證、課表分享碼綁定。
- `public.courses`：課程課表資料（含 `device_id` 帳號隔離欄位）。
- `public.todos`：待辦事項與作業（含出國旅遊跨日自訂週期 `start_date` ~ `due_date`、`reading_status`、`device_id`）。
- `public.accounting_transactions`：記帳收支明細（含 `device_id` 帳號隔離欄位、`value_score` 性價比評分）。
- `public.calendar_events`：TimeTree 風格行事曆跨天連續彩色活動條（含 `device_id` 帳號隔離）。
- `public.shared_schedules`：課表、記帳、待辦好友共享中樞。
- `public.line_followers`：LINE Bot 加好友自動識別與綁定資料表（記錄真實 U 開頭 33 碼 LINE ID）。
- `public.app_api_configs`：所有第三方 API 金鑰雲端保險箱。
- `public.send_line_daily_briefing()`：24/7 自動排程晨報生成函數。
- `pg_cron` 排程：每分鐘自動檢查使用者設定的推播時間（預設早上 07:00 / 08:00）自動經由 `pg_net` 發送 LINE Flex Message。

### 填入您的 LINE Bot 與 Gemini API 金鑰：
在 Supabase SQL Editor 執行以下 SQL（替換為您的真實金鑰）：
```sql
UPDATE public.app_api_configs SET config_value = '你的_LINE_Channel_Access_Token' WHERE config_key = 'line_channel_access_token';
UPDATE public.app_api_configs SET config_value = '你的_LINE_Channel_ID' WHERE config_key = 'line_channel_id';
UPDATE public.app_api_configs SET config_value = '你的_LINE_Channel_Secret' WHERE config_key = 'line_channel_secret';
UPDATE public.app_api_configs SET config_value = '你的_Google_Gemini_API_Key' WHERE config_key = 'gemini_api_key';
```

---

## 3. LINE Developers Console 設定

1. 前往 [LINE Developers Console](https://developers.line.biz/console/)。
2. 進入您的 Provider -> 選擇或建立 **Messaging API** Channel。
3. 在 **Messaging API** 頁籤中：
   - **Webhook URL** 填入：
     ```text
     https://xjdwjrmtiutapoeikvln.supabase.co/functions/v1/line-webhook
     ```
     （若使用您自己的 Supabase 專案，請替換專案 ID）
   - 開啟 **「Use webhook」**（切換至綠色啟用狀態）。
   - 點擊 **「Verify」** 按鈕驗證，應顯示 `Success` (200 OK)。
   - 在頁面下方產生 **Channel access token (long-lived)** 並複製。
4. 在 **LINE Official Account Manager**（LINE 官方帳號管理後台）：
   - 點選右上角「回應設定 (Response settings)」。
   - **「回應模式」** 選擇：`聊天機器人 (Bot)`。
   - **「加入好友的歡迎訊息」**：設為 `關閉`（改由我們的 Edge Function 自動識別並傳送個人化綁定歡迎詞）。
   - **「自動回應訊息」**：設為 `關閉`。
   - **「Webhook」**：設為 `開啟`。

---

## 4. Supabase Edge Functions 部署

專案中內建兩個雲端無伺服器函數（位於 `supabase/functions/`）：
1. **`line-webhook`**：
   - 接收使用者加好友事件與傳送訊息。
   - 自動調用 LINE Profile API 取得好友暱稱與頭像。
   - 自動將 LINE User ID（U 開頭 33 碼）綁定至使用者的課表分享碼。
2. **`campus-api-gateway`**：
   - 在 Supabase 雲端呼叫 Google Gemini 進行 AI 課表圖片辨識。
   - 在雲端發送 LINE Push / Broadcast 訊息。
   - 查詢 LINE Bot 資訊與好友同步。

### 部署指令：
若您有安裝 Supabase CLI：
```bash
# 登入 Supabase
supabase login

# 關聯您的專案
supabase link --project-ref dxoobrrjzaovwpyagzgn

# 部署 Webhook (需關閉 JWT 驗證以接收 LINE 請求)
supabase functions deploy line-webhook --no-verify-jwt

# 部署 API Gateway
supabase functions deploy campus-api-gateway --no-verify-jwt
```

---

## 5. Vercel PWA 前端網頁部署

本專案已完全適配 Vercel，根目錄已提供 `vercel.json` 與 `package.json`：

1. 前往 [Vercel Dashboard](https://vercel.com/new)。
2. 選擇匯入 GitHub 倉庫 `routerdd1818-tech/Campus-pwa`。
3. 部署設定：
   - **Framework Preset**：`Vite`
   - **Root Directory**：`./` (根目錄)
   - **Build Command**：`npm --prefix pwa run build`
   - **Output Directory**：`pwa/dist`
4. 點擊 **「Deploy」**，即可在 1 分鐘內獲得專屬的 HTTPS 網址！
5. 使用手機（iOS Safari / Android Chrome）開啟該網址，點擊「加入主畫面」，即可像原生 App 一樣全螢幕流暢使用。

---

## 6. 多帳號資料獨立與自訂節次功能驗證

- **課表每節課時間自訂**：
  - 進入「課表」點擊「節次時間」按鈕或直接點擊左側「第 1 節」時段。
  - 可自由修改每節課時間、新增夜間部第 11 節、套用 08:00 / 08:10 範本。
- **帳號完全隔離**：
  - 支援使用者註冊（使用者名稱、密碼、課表分享碼）。
  - 切換帳號或登出為訪客時，課表、待辦、記帳、行事曆與節次時間完全分離獨立，互不干擾。
- **LINE 推播**：
  - 加好友自動識別 LINE ID，無須手動輸入複製。
  - 每日定時由雲端送出圖文並茂的課表晨報。
