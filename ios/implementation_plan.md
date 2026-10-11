# 大規模功能更新與小工具重新設計

本次更新涵蓋記帳反饋、記帳週期設定、小工具全面重新排版（月曆與記帳）、待辦事項自訂類別與自動刪除，以及全域收起鍵盤的功能。

## 提出的修改內容

### 1. 記帳快速紀錄反饋 (Quick Entry Feedback)
- 在 `AddTransactionSheet.swift` 儲存成功時，加入震動回饋 (`UINotificationFeedbackGenerator`)。
- 在 `ContentView.swift` 加入全域的 Toast 提示（例如：「✅ 記帳成功」），當快速記帳關閉時顯示 2 秒。

### 2. 記帳週期自訂 (Custom Accounting Cycle)
- 在 `DataManager` 中新增 `accountingCycleStartDay` (預設為 1 號)，並儲存於 `UserDefaults`。
- 修改 `thisMonthExpense`、`thisMonthIncome` 等屬性的計算邏輯，將「當月」的定義改為「上一個發薪日到下一個發薪日之間」。
- 在 `SupabaseSettingsSheet.swift` (或設定頁面) 增加一個選擇器，讓使用者設定「每月重置日 (1~31)」。

### 3. 記帳桌面小工具重新設計 (Accounting Widget)
- 移除原本的早餐/午餐等細項按鈕。
- 在 `AccountingQuickWidgetView` 中顯示「今日花費」、「今日合理花費 (每日限額)」。
- 整個小工具設定為點擊後透過 `campus://quick-expense` 打開 App 的記帳頁面。

### 4. 月曆桌面小工具 (Calendar Widget Redesign)
- **頂部**：實作類似 TimeTree 的「一週日期列 (週日~週六)」，在日期下方用小色塊標示當天是否有待辦或排課。
- **中部 (排課)**：以方塊形式 (Grid 或橫向 Scroll 概念) 顯示當日下午或全天的所有課程。
- **中下部 (待辦)**：條列顯示今日待辦事項，直到空間填滿為止 (`Spacer(minLength: 0)`)。
- **底部**：加入今日累計花費的顯示。

### 5. 待辦事項進階功能 (To-Do Enhancements)
- **自訂類別**：將 `TodoItem` 的 `category` 從嚴格的 Enum 改為 String (或保留 enum 並新增 `customCategory` 屬性)，並在 `DataManager` 維護一個自訂類別列表。
- **長按修改**：在 `TasksView.swift` 的列表中加入 `.contextMenu` 或 `.onLongPressGesture`，點擊後彈出修改視窗。
- **自動刪除**：在 `TodoItem` 新增 `completedAt: Date?` 欄位。當 App 啟動 (`DataManager.loadInitialData`) 時，自動過濾並刪除 `completedAt` 超過 3 天的待辦事項。

### 6. 全域退出鍵盤 (Global Keyboard Dismiss)
- 在 `ContentView` 或是最外層加入 `.onTapGesture { UIApplication.shared.sendAction(#selector(UIResponder.resignFirstResponder), to: nil, from: nil, for: nil) }`。
- 確保不會影響到 ScrollView 的正常滑動。

## 驗證計畫
- 編譯並確認沒有任何語法錯誤。
- 確保所有 Widget 都能正確渲染。
