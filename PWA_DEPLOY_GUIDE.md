# 📱 Campus 可樂校園 — PWA 漸進式網頁應用程式部署與使用指南

恭喜！專案已成功轉型為 **現代化 PWA (Progressive Web App)** 架構。

現在起，您與同學：
- **不用再透過 SideStore / 越獄簽名**（徹底解決 7 天憑證過期痛點）
- **iPhone / Android / Mac / Windows 全平台通用**
- **在 Safari 點擊「加入主畫面」**，即可像原生 iOS App 一樣**全螢幕運行、無瀏覽器網址列、擁有獨立桌面 App 圖標、支援離線瀏覽**！

---

## 🚀 本地開發與即時預覽

在終端機中執行：

```bash
# 啟動即時開發伺服器（熱重載）
npm run dev
```

啟動後瀏覽器打開 `http://localhost:3000` 即可立即使用！

若要在同一個 Wi-Fi 下使用您的 iPhone 實機測試：
1. 終端機會顯示 `Network: http://192.168.x.x:3000`
2. 用 iPhone Safari 開啟該網址，即可在手機上體驗！

---

## ☁️ 一鍵部署到 Vercel（推薦，全球免費 CDN + 自動 HTTPS）

### 方式 A：透過 GitHub 連動（最推薦，每次 git push 自動更新）
1. 將專案推送到您的 GitHub Repository。
2. 前往 [Vercel 官網](https://vercel.com/) 登入。
3. 點擊 **「Add New...」➔ 「Project」**，選取您的 GitHub 專案。
4. 在設定項目中：
   - **Root Directory**：點選 Edit 設為 `pwa`（或保留根目錄，因為已內建自動代理）
   - **Framework Preset**：會自動辨識為 **Vite**
5. 點擊 **「Deploy」**，約 30 秒內即可獲得一組專屬 HTTPS 網址（例如 `https://campus-cola.vercel.app`）！

### 方式 B：透過 Cloudflare Pages
1. 前往 [Cloudflare Dashboard](https://dash.cloudflare.com/) ➔ **Workers & Pages** ➔ **Create application** ➔ **Pages**。
2. 連接 GitHub 倉庫，設定 Root directory: `pwa`，Build command: `npm run build`，Build output: `dist`。
3. 點擊部署即可享有 Cloudflare 全球頂級 CDN 加速。

---

## 📲 如何在手機上「加入主畫面」安裝為原生 App？

### 🍎 iOS (iPhone / iPad - Safari)
1. 使用 **Safari** 瀏覽器開啟您的網站網址。
2. 點擊下方工具列正中間的 **「分享」圖示**（一個方框帶有向上箭頭）。
3. 往下滑動找到並點擊 **「加入主畫面（Add to Home Screen）」**。
4. 點擊右上角「新增」，桌面便會出現精美可愛的 **「可樂三花貓」App 圖標**！
5. 點擊桌面圖標開啟，即為 **100% 全螢幕獨立 App 體驗（無網址列、支援觸控滑動、離線快取）**。

### 🤖 Android (Chrome)
1. 使用 **Chrome** 開啟網站網址。
2. 畫面上方會自動彈出「加到主畫面」提示，或點擊右上角三點選單 ➔ **「安裝應用程式」**。

---

## 🐾 功能亮點與架構總覽

1. **三花貓 Calico Theme & iOS 27 流暢美學**：
   - 溫暖米白色背景、三花貓活力橘、深焙可可棕、鼠尾草綠配色。
   - 毛玻璃浮動式底部分頁導覽列（TabBar）與互動式心情頭像（可點擊切換表情！）。
2. **週課表 / 本日行程 (Schedule)**：
   - 完整的週一至週日節次課表矩陣與單日時間軸清單。
   - 整合 **Google Gemini AI 課表圖片辨識**：直接上傳課表截圖，AI 自動提取課程名稱、教室、教授與節次一鍵匯入。
3. **作業與考試待辦 (Todos)**：
   - 支援作業、考試、報告、生活、論文閱讀分類與優先級標籤。
   - 完成任務時自帶歡慶彩帶紙屑動效（Confetti）！
4. **極簡智慧記帳 (Accounting)**：
   - 今日預算進度環與限額警示。
   - 每日重置日自動倒數、收支明細與價值感評分。
5. **Supabase 雲端保險箱與 LINE 晨報**：
   - 預設連線至您的 Supabase 專案，跨裝置自動同步。
   - 支援「加好友自動偵測 LINE User ID」與每日定時推播。
