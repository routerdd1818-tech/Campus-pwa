//
//  LineBotService.swift
//  Campus v1
//
//  Created for Campus v1 LINE Bot Morning Briefing Integration.
//

import Foundation
import Combine
import SwiftUI
import UserNotifications
import BackgroundTasks

// MARK: - 多使用者 LINE 推播設定模型
public struct LineBotUserProfile: Identifiable, Codable, Equatable {
    public var userId: String           // LINE User ID (U開頭33碼，或 AUTO_分享碼)
    public var deviceId: String         // 裝置識別碼 (區分不同手機使用者)
    public var userName: String         // 使用者顯示名稱 (例如：「我的課表」、「室友小明」)
    public var shareCode: String        // 綁定的 6 碼課表分享代碼 (可自動讀取該代碼的專屬課表、待辦與記帳)
    public var channelAccessToken: String
    public var isEnabled: Bool          // 是否啟用此使用者的每日獨立推播
    public var pushHour: Int            // 此使用者專屬的推播小時 (0-23)
    public var pushMinute: Int          // 此使用者專屬的推播分鐘 (0-59)
    public var includeSchedule: Bool    // 獨立開關：是否推送今日課表
    public var includeTodos: Bool       // 獨立開關：是否推送今日待辦
    public var includeWeeklyPlan: Bool  // 獨立開關：是否推送本週規劃
    public var includeExpenseSummary: Bool // 獨立開關：是否推送今日記帳摘要
    public var coursesData: [Course]?   // 此使用者專屬的課表快照
    public var todosData: [TodoItem]?   // 此使用者專屬的待辦快照
    public var lastSentDate: String?    // 上次發送日期 (yyyy-MM-dd，台灣時間)
    public var updatedAt: String?
    
    public var id: String { userId }
    
    enum CodingKeys: String, CodingKey {
        case userId = "user_id"
        case deviceId = "device_id"
        case userName = "user_name"
        case shareCode = "share_code"
        case channelAccessToken = "channel_access_token"
        case isEnabled = "is_enabled"
        case pushHour = "push_hour"
        case pushMinute = "push_minute"
        case includeSchedule = "include_schedule"
        case includeTodos = "include_todos"
        case includeWeeklyPlan = "include_weekly_plan"
        case includeExpenseSummary = "include_expense_summary"
        case coursesData = "courses_data"
        case todosData = "todos_data"
        case lastSentDate = "last_sent_date"
        case updatedAt = "updated_at"
    }
    
    public init(
        userId: String,
        deviceId: String = "",
        userName: String = "我的課表",
        shareCode: String = "",
        channelAccessToken: String = "",
        isEnabled: Bool = true,
        pushHour: Int = 7,
        pushMinute: Int = 0,
        includeSchedule: Bool = true,
        includeTodos: Bool = true,
        includeWeeklyPlan: Bool = true,
        includeExpenseSummary: Bool = false,
        coursesData: [Course]? = nil,
        todosData: [TodoItem]? = nil,
        lastSentDate: String? = nil,
        updatedAt: String? = nil
    ) {
        self.userId = userId
        self.deviceId = deviceId
        self.userName = userName
        self.shareCode = shareCode
        self.channelAccessToken = channelAccessToken
        self.isEnabled = isEnabled
        self.pushHour = pushHour
        self.pushMinute = pushMinute
        self.includeSchedule = includeSchedule
        self.includeTodos = includeTodos
        self.includeWeeklyPlan = includeWeeklyPlan
        self.includeExpenseSummary = includeExpenseSummary
        self.coursesData = coursesData
        self.todosData = todosData
        self.lastSentDate = lastSentDate
        self.updatedAt = updatedAt
    }
    
    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        self.userId = try container.decode(String.self, forKey: .userId)
        self.deviceId = try container.decodeIfPresent(String.self, forKey: .deviceId) ?? ""
        self.userName = try container.decodeIfPresent(String.self, forKey: .userName) ?? "我的課表"
        self.shareCode = try container.decodeIfPresent(String.self, forKey: .shareCode) ?? ""
        self.channelAccessToken = try container.decodeIfPresent(String.self, forKey: .channelAccessToken) ?? ""
        self.isEnabled = try container.decodeIfPresent(Bool.self, forKey: .isEnabled) ?? true
        self.pushHour = try container.decodeIfPresent(Int.self, forKey: .pushHour) ?? 7
        self.pushMinute = try container.decodeIfPresent(Int.self, forKey: .pushMinute) ?? 0
        self.includeSchedule = try container.decodeIfPresent(Bool.self, forKey: .includeSchedule) ?? true
        self.includeTodos = try container.decodeIfPresent(Bool.self, forKey: .includeTodos) ?? true
        self.includeWeeklyPlan = try container.decodeIfPresent(Bool.self, forKey: .includeWeeklyPlan) ?? true
        self.includeExpenseSummary = try container.decodeIfPresent(Bool.self, forKey: .includeExpenseSummary) ?? false
        self.coursesData = try container.decodeIfPresent([Course].self, forKey: .coursesData)
        self.todosData = try container.decodeIfPresent([TodoItem].self, forKey: .todosData)
        self.lastSentDate = try container.decodeIfPresent(String.self, forKey: .lastSentDate)
        self.updatedAt = try container.decodeIfPresent(String.self, forKey: .updatedAt)
    }
    
    public var isDirectPushMode: Bool {
        let clean = userId.trimmingCharacters(in: .whitespacesAndNewlines)
        return clean.hasPrefix("U") && clean.count >= 25
    }
    
    public var maskedUserId: String {
        let clean = userId.trimmingCharacters(in: .whitespacesAndNewlines)
        if clean.hasPrefix("AUTO_") || clean.hasPrefix("BROADCAST") {
            return "免填 ID・標籤廣播推播"
        }
        guard clean.count > 10 else { return clean }
        return "\(clean.prefix(6))...\(clean.suffix(4))"
    }
    
    public var isSentToday: Bool {
        guard let last = lastSentDate, !last.isEmpty else { return false }
        return last == LineBotService.todayDateString()
    }
}

public final class LineBotService: ObservableObject {
    public static let shared = LineBotService()
    public static let bgTaskIdentifier = "Router.Campus-v1.dailyBriefing"
    
    // UserDefaults Keys
    private let tokenKey = "line_bot_channel_access_token"
    private let userIdKey = "line_bot_user_id"
    private let userNameKey = "line_bot_user_name"
    private let isEnabledKey = "line_bot_morning_briefing_enabled"
    private let channelIdKey = "line_bot_channel_id"
    private let channelSecretKey = "line_bot_channel_secret"
    private let pushHourKey = "line_bot_push_hour"
    private let pushMinuteKey = "line_bot_push_minute"
    private let lastSentDateKey = "line_bot_last_sent_date"
    private let registeredUsersKey = "line_bot_registered_users"
    private let botBasicIdKey = "line_bot_basic_id"
    private let botDisplayNameKey = "line_bot_display_name"
    private let onlyPushSelfKey = "line_bot_only_push_self_on_device"
    
    private var isInitializing = true
    
    @Published public var channelId: String {
        didSet {
            UserDefaults.standard.set(channelId.trimmingCharacters(in: .whitespacesAndNewlines), forKey: channelIdKey)
        }
    }
    
    @Published public var channelSecret: String {
        didSet {
            UserDefaults.standard.set(channelSecret.trimmingCharacters(in: .whitespacesAndNewlines), forKey: channelSecretKey)
        }
    }
    
    @Published public var channelAccessToken: String {
        didSet {
            UserDefaults.standard.set(channelAccessToken.trimmingCharacters(in: .whitespacesAndNewlines), forKey: tokenKey)
            guard !isInitializing, oldValue != channelAccessToken else { return }
            Task {
                await fetchBotInfo()
                await syncSettingsToSupabase()
            }
        }
    }
    
    @Published public var userId: String {
        didSet {
            UserDefaults.standard.set(userId.trimmingCharacters(in: .whitespacesAndNewlines), forKey: userIdKey)
            guard !isInitializing, oldValue != userId else { return }
            Task { await syncSettingsToSupabase() }
        }
    }
    
    @Published public var userName: String {
        didSet {
            UserDefaults.standard.set(userName.trimmingCharacters(in: .whitespacesAndNewlines), forKey: userNameKey)
            guard !isInitializing, oldValue != userName else { return }
            Task { await syncSettingsToSupabase() }
        }
    }
    
    @Published public var isMorningBriefingEnabled: Bool {
        didSet {
            UserDefaults.standard.set(isMorningBriefingEnabled, forKey: isEnabledKey)
            guard !isInitializing, oldValue != isMorningBriefingEnabled else { return }
            updateNotificationSchedule()
            scheduleBackgroundBriefingTask()
            Task { await syncSettingsToSupabase() }
        }
    }
    
    @Published public var pushHour: Int {
        didSet {
            UserDefaults.standard.set(pushHour, forKey: pushHourKey)
            guard !isInitializing, oldValue != pushHour else { return }
            updateNotificationSchedule()
            scheduleBackgroundBriefingTask()
            // 修改推播時間時重置今日已發送標記，讓新設定的時間可於當日觸發
            self.lastSentDate = nil
            UserDefaults.standard.removeObject(forKey: lastSentDateKey)
            Task { await syncSettingsToSupabase(resetLastSent: true) }
        }
    }
    
    @Published public var pushMinute: Int {
        didSet {
            UserDefaults.standard.set(pushMinute, forKey: pushMinuteKey)
            guard !isInitializing, oldValue != pushMinute else { return }
            updateNotificationSchedule()
            scheduleBackgroundBriefingTask()
            // 修改推播時間時重置今日已發送標記，讓新設定的時間可於當日觸發
            self.lastSentDate = nil
            UserDefaults.standard.removeObject(forKey: lastSentDateKey)
            Task { await syncSettingsToSupabase(resetLastSent: true) }
        }
    }
    
    @Published public var isSending: Bool = false
    @Published public var isGeneratingToken: Bool = false
    @Published public var isSyncingCloud: Bool = false
    @Published public var isCloudCronReady: Bool = false
    @Published public var lastSentDate: Date? = nil
    @Published public var lastErrorMessage: String? = nil
    @Published public var registeredUsers: [LineBotUserProfile] = []
    @Published public var discoveredFollowers: [LineFollowerRecord] = []
    @Published public var isCheckingAutoBind: Bool = false
    @Published public var autoBindStatusMessage: String? = nil
    @Published public var botBasicId: String = ""
    @Published public var botDisplayName: String = ""
    @Published public var onlyPushSelfOnDevice: Bool {
        didSet {
            UserDefaults.standard.set(onlyPushSelfOnDevice, forKey: onlyPushSelfKey)
        }
    }
    
    /// 一鍵加入 LINE Bot 好友連結（免查 User ID）
    public var addFriendURL: URL? {
        let cleanBasic = botBasicId.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !cleanBasic.isEmpty else { return nil }
        let formatted = cleanBasic.hasPrefix("@") ? cleanBasic : "@\(cleanBasic)"
        return URL(string: "https://line.me/R/ti/p/\(formatted)")
    }
    
    /// 一鍵打開 LINE 聊天室並自動預填「綁定課表_<分享碼>」訊息 Deep Link（100% 精準觸發 Webhook 自動取得您的 U... LINE ID）
    public func oneClickBindMessageURL(forShareCode customCode: String? = nil) -> URL? {
        let cleanBasic = botBasicId.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !cleanBasic.isEmpty else { return addFriendURL }
        let formatted = cleanBasic.hasPrefix("@") ? cleanBasic : "@\(cleanBasic)"
        let rawCode = (customCode ?? DataManager.shared.myShareCode).trimmingCharacters(in: .whitespacesAndNewlines).uppercased()
        let code = rawCode.isEmpty ? String(DataManager.shared.deviceId.prefix(6)).uppercased() : rawCode
        let messageText = "綁定課表_\(code)"
        let encodedMsg = messageText.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? messageText
        return URL(string: "https://line.me/R/oaMessage/\(formatted)/?\(encodedMsg)")
    }
    
    private static let taipeiDateFormatter: DateFormatter = {
        let df = DateFormatter()
        df.locale = Locale(identifier: "en_US_POSIX")
        df.timeZone = TimeZone(identifier: "Asia/Taipei") ?? .current
        df.dateFormat = "yyyy-MM-dd"
        return df
    }()
    
    public static func todayDateString(for date: Date = Date()) -> String {
        taipeiDateFormatter.string(from: date)
    }
    
    private init() {
        let vault = SupabaseApiVault.shared
        self.channelId = UserDefaults.standard.string(forKey: channelIdKey) ?? vault.value(for: "line_channel_id")
        self.channelSecret = UserDefaults.standard.string(forKey: channelSecretKey) ?? vault.value(for: "line_channel_secret")
        self.channelAccessToken = UserDefaults.standard.string(forKey: tokenKey) ?? vault.value(for: "line_channel_access_token")
        self.botBasicId = UserDefaults.standard.string(forKey: botBasicIdKey) ?? ""
        self.botDisplayName = UserDefaults.standard.string(forKey: botDisplayNameKey) ?? "Campus 課表助教"
        self.onlyPushSelfOnDevice = UserDefaults.standard.bool(forKey: onlyPushSelfKey)
        
        let savedUserId = UserDefaults.standard.string(forKey: userIdKey) ?? ""
        self.userId = savedUserId.isEmpty ? vault.value(for: "line_default_user_id") : savedUserId
        
        let savedUserName = UserDefaults.standard.string(forKey: userNameKey) ?? ""
        let defaultShareName = UserDefaults.standard.string(forKey: "campus_my_share_name") ?? "我的課表"
        self.userName = savedUserName.isEmpty ? defaultShareName : savedUserName
        
        if UserDefaults.standard.object(forKey: isEnabledKey) != nil {
            self.isMorningBriefingEnabled = UserDefaults.standard.bool(forKey: isEnabledKey)
        } else {
            self.isMorningBriefingEnabled = true // 預設開啟
        }
        
        let savedHour = UserDefaults.standard.integer(forKey: pushHourKey)
        self.pushHour = (UserDefaults.standard.object(forKey: pushHourKey) != nil) ? savedHour : 7 // 預設 7 點
        
        let savedMinute = UserDefaults.standard.integer(forKey: pushMinuteKey)
        self.pushMinute = (UserDefaults.standard.object(forKey: pushMinuteKey) != nil) ? savedMinute : 0 // 預設 00 分
        
        if let lastDate = UserDefaults.standard.object(forKey: lastSentDateKey) as? Date {
            self.lastSentDate = lastDate
        }
        
        if let savedUsersData = UserDefaults.standard.data(forKey: registeredUsersKey),
           let decoded = try? JSONDecoder.robustDecoder.decode([LineBotUserProfile].self, from: savedUsersData) {
            self.registeredUsers = decoded.filter { !$0.userId.hasPrefix("SHARE_") && $0.userId != "CLOUD_API_VAULT" }
        }
        
        self.isInitializing = false
        
        // 延後啟動雲端保險箱與 LINE Bot 同步，讓 App 啟動動畫與首頁滑動完全零卡頓
        Task(priority: .utility) {
            try? await Task.sleep(nanoseconds: 1_200_000_000)
            await MainActor.run {
                self.updateNotificationSchedule()
                self.scheduleBackgroundBriefingTask()
            }
            await SupabaseApiVault.shared.fetchCloudApiConfigs()
            if self.channelAccessToken.isEmpty && !self.channelId.isEmpty && !self.channelSecret.isEmpty {
                _ = try? await self.fetchAccessTokenFromOAuth()
            }
            await self.fetchBotInfo()
            _ = await self.syncAndAutoClaimLineUserId()
            await self.fetchRegisteredUsersFromSupabase()
            await self.syncSettingsToSupabase()
            await MainActor.run {
                self.checkAndAutoSendBriefingIfNeeded()
            }
        }
    }
    
    private func saveRegisteredUsersLocally() {
        if let data = try? JSONEncoder.robustEncoder.encode(registeredUsers) {
            UserDefaults.standard.set(data, forKey: registeredUsersKey)
        }
    }
    
    // MARK: - 自動取得 LINE Bot 官方帳號資訊 (@basicId 與名稱，供新使用者一鍵加好友免查 User ID)
    public func fetchBotInfo() async {
        // 優先嘗試透過 Supabase Edge Function 取得 Bot 資訊
        if let gwJson = await SupabaseApiVault.shared.callGatewayFunction(action: "line_bot_info", payload: [:]),
           let dataDict = gwJson["data"] as? [String: Any] {
            let basicId = (dataDict["basicId"] as? String) ?? ""
            let displayName = (dataDict["displayName"] as? String) ?? "Campus 課表助教"
            if !basicId.isEmpty {
                await MainActor.run {
                    self.botBasicId = basicId
                    UserDefaults.standard.set(basicId, forKey: self.botBasicIdKey)
                    if !displayName.isEmpty {
                        self.botDisplayName = displayName
                        UserDefaults.standard.set(displayName, forKey: self.botDisplayNameKey)
                    }
                }
                return
            }
        }
        
        let token = channelAccessToken.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !token.isEmpty, let url = URL(string: "https://api.line.me/v2/bot/info") else { return }
        
        var request = URLRequest(url: url)
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        
        if let (data, response) = try? await URLSession.shared.data(for: request),
           let httpRes = response as? HTTPURLResponse,
           (200...299).contains(httpRes.statusCode),
           let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
            let basicId = (json["basicId"] as? String) ?? ""
            let displayName = (json["displayName"] as? String) ?? "Campus 課表助教"
            await MainActor.run {
                if !basicId.isEmpty {
                    self.botBasicId = basicId
                    UserDefaults.standard.set(basicId, forKey: self.botBasicIdKey)
                }
                if !displayName.isEmpty {
                    self.botDisplayName = displayName
                    UserDefaults.standard.set(displayName, forKey: self.botDisplayNameKey)
                }
            }
        }
    }
    
    /// 新手機／新使用者免填 User ID 一鍵綁定本機課表（只要加 LINE Bot 好友即可自動識別並收到本機課表推播）
    @MainActor
    public func enableUserIdFreeModeForCurrentDevice() async {
        let code = DataManager.shared.myShareCode.trimmingCharacters(in: .whitespacesAndNewlines).uppercased()
        let effectiveCode = code.isEmpty ? String(DataManager.shared.deviceId.prefix(6)).uppercased() : code
        if self.userName.isEmpty || self.userName == "我的課表" {
            self.userName = DataManager.shared.myShareName
        }
        // 先建立 Supabase 15 分鐘加好友自動配對工作階段
        await SupabaseApiVault.shared.createLineBindSession(
            deviceId: DataManager.shared.deviceId,
            shareCode: effectiveCode,
            userName: self.userName
        )
        // 若尚未拿到真實 U... ID，先設為 AUTO_<分享碼> 讓雲端與本地都能即時配對
        if !self.userId.hasPrefix("U") {
            self.userId = "AUTO_\(effectiveCode)"
        }
        self.isMorningBriefingEnabled = true
        await DataManager.shared.publishMySchedule()
        await syncSettingsToSupabase(resetLastSent: true)
        _ = await syncAndAutoClaimLineUserId(targetShareCode: effectiveCode)
        await fetchRegisteredUsersFromSupabase()
    }
    
    // MARK: - 🤝 加好友自動知道使用者的真實 LINE ID (`U...`) 完整流程
    
    /// 當使用者點擊「加好友自動綁定」或「傳送綁定碼至 LINE」時呼叫：
    /// 1. 在 Supabase `line_bind_sessions` 登記此手機的 `device_id` 與 `share_code`
    /// 2. 預先發佈本機課表與待辦至雲端
    @MainActor
    public func prepareAutoBindSession(customShareCode: String? = nil, customUserName: String? = nil) async {
        let rawCode = (customShareCode ?? DataManager.shared.myShareCode).trimmingCharacters(in: .whitespacesAndNewlines).uppercased()
        let effectiveCode = rawCode.isEmpty ? String(DataManager.shared.deviceId.prefix(6)).uppercased() : rawCode
        let effectiveName = (customUserName ?? self.userName).trimmingCharacters(in: .whitespacesAndNewlines)
        
        self.autoBindStatusMessage = "已在 Supabase 建立加好友自動識別通道（代碼：\(effectiveCode)），加好友後返回 App 即自動帶入您的 LINE ID！"
        await SupabaseApiVault.shared.createLineBindSession(
            deviceId: DataManager.shared.deviceId,
            shareCode: effectiveCode,
            userName: effectiveName.isEmpty ? DataManager.shared.myShareName : effectiveName
        )
        if !self.userId.hasPrefix("U") {
            self.userId = "AUTO_\(effectiveCode)"
        }
        await DataManager.shared.publishMySchedule()
        await syncSettingsToSupabase()
    }
    
    /// 從 Supabase (`line_followers` / `claim_latest_line_follower`) 與 LINE Followers API 雙向同步，自動取得使用者的真實 `U...` LINE ID！
    @MainActor
    public func syncAndAutoClaimLineUserId(targetShareCode: String? = nil) async -> String? {
        self.isCheckingAutoBind = true
        defer { self.isCheckingAutoBind = false }
        
        let rawCode = (targetShareCode ?? DataManager.shared.myShareCode).trimmingCharacters(in: .whitespacesAndNewlines).uppercased()
        let effectiveCode = rawCode.isEmpty ? String(DataManager.shared.deviceId.prefix(6)).uppercased() : rawCode
        let myDevice = DataManager.shared.deviceId
        
        // 1. 若有 Access Token，順便查詢 LINE `/v2/bot/followers/ids` 並將最新好友同步寫入 Supabase `line_followers`
        let token = channelAccessToken.trimmingCharacters(in: .whitespacesAndNewlines)
        if !token.isEmpty, let followersURL = URL(string: "https://api.line.me/v2/bot/followers/ids?limit=30") {
            var req = URLRequest(url: followersURL)
            req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
            if let (data, res) = try? await URLSession.shared.data(for: req),
               let http = res as? HTTPURLResponse,
               (200...299).contains(http.statusCode),
               let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
               let uids = json["userIds"] as? [String] {
                for uid in uids.prefix(15) where uid.hasPrefix("U") {
                    var dispName = "LINE 好友"
                    var picUrl = ""
                    if let profURL = URL(string: "https://api.line.me/v2/bot/profile/\(uid)") {
                        var profReq = URLRequest(url: profURL)
                        profReq.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
                        if let (pData, pRes) = try? await URLSession.shared.data(for: profReq),
                           let pHttp = pRes as? HTTPURLResponse,
                           (200...299).contains(pHttp.statusCode),
                           let pJson = try? JSONSerialization.jsonObject(with: pData) as? [String: Any] {
                            dispName = (pJson["displayName"] as? String) ?? dispName
                            picUrl = (pJson["pictureUrl"] as? String) ?? ""
                        }
                    }
                    _ = await SupabaseApiVault.shared.bindLineUserToSchedule(
                        lineUserId: uid,
                        displayName: dispName,
                        shareCode: "",
                        deviceId: "",
                        pictureUrl: picUrl
                    )
                }
            }
        }
        
        // 2. 讀取 Supabase `line_followers` 清單供 UI 顯示
        let followers = await SupabaseApiVault.shared.fetchLineFollowersFromSupabase()
        self.discoveredFollowers = followers
        
        // 3. 呼叫 Supabase `claim_latest_line_follower` RPC 自動認領剛加好友或已綁定此分享碼的 LINE User ID
        if let claimed = await SupabaseApiVault.shared.claimLatestLineFollower(
            deviceId: myDevice,
            shareCode: effectiveCode,
            userName: self.userName
        ) {
            let realUid = claimed.lineUserId
            if realUid.hasPrefix("U") {
                self.userId = realUid
                if (self.userName.isEmpty || self.userName == "我的課表") && !claimed.displayName.isEmpty && claimed.displayName != "LINE 好友" {
                    self.userName = claimed.displayName
                }
                self.autoBindStatusMessage = "✅ 已自動識別並綁定您的 LINE 帳號：\(claimed.displayName) (\(realUid.prefix(8))...)"
                await syncSettingsToSupabase()
                await fetchRegisteredUsersFromSupabase()
                return realUid
            }
        }
        
        // 4. 若 `discoveredFollowers` 中已有綁定本機 `effectiveCode` 或 `myDevice` 的紀錄，直接自動套用
        if let matched = followers.first(where: {
            $0.boundShareCode.uppercased() == effectiveCode || (!$0.boundDeviceId.isEmpty && $0.boundDeviceId == myDevice)
        }) {
            self.userId = matched.lineUserId
            if (self.userName.isEmpty || self.userName == "我的課表") && !matched.displayName.isEmpty {
                self.userName = matched.displayName
            }
            self.autoBindStatusMessage = "✅ 已自動同步您的 LINE 帳號：\(matched.displayName) (\(matched.lineUserId.prefix(8))...)"
            await syncSettingsToSupabase()
            await fetchRegisteredUsersFromSupabase()
            return matched.lineUserId
        }
        
        return nil
    }
    
    /// 使用者從「已加好友的 LINE 帳號清單」點選任一帳號時，一鍵完成真實 LINE ID (`U...`) 綁定
    @MainActor
    public func bindFollowerToCurrentUser(_ follower: LineFollowerRecord, customShareCode: String? = nil) async {
        let rawCode = (customShareCode ?? DataManager.shared.myShareCode).trimmingCharacters(in: .whitespacesAndNewlines).uppercased()
        let effectiveCode = rawCode.isEmpty ? String(DataManager.shared.deviceId.prefix(6)).uppercased() : rawCode
        
        self.userId = follower.lineUserId
        if !follower.displayName.isEmpty && follower.displayName != "LINE 好友" {
            self.userName = follower.displayName
        }
        _ = await SupabaseApiVault.shared.bindLineUserToSchedule(
            lineUserId: follower.lineUserId,
            displayName: self.userName,
            shareCode: effectiveCode,
            deviceId: DataManager.shared.deviceId,
            pictureUrl: follower.pictureUrl
        )
        self.autoBindStatusMessage = "🎉 已成功將「\(follower.displayName)」(\(follower.lineUserId.prefix(8))...) 綁定至課表【\(effectiveCode)】！"
        await syncSettingsToSupabase(resetLastSent: true)
        await fetchRegisteredUsersFromSupabase()
        self.discoveredFollowers = await SupabaseApiVault.shared.fetchLineFollowersFromSupabase()
    }
    
    // MARK: - 自動透過 Channel ID & Secret 向 LINE OAuth 取得 Access Token
    public func fetchAccessTokenFromOAuth() async throws -> String {
        let cleanId = channelId.trimmingCharacters(in: .whitespacesAndNewlines)
        let cleanSecret = channelSecret.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !cleanId.isEmpty, !cleanSecret.isEmpty else {
            throw NSError(domain: "LineBotService", code: 400, userInfo: [NSLocalizedDescriptionKey: "請先填寫 Channel ID 與 Channel Secret"])
        }
        
        await MainActor.run { self.isGeneratingToken = true }
        defer { Task { @MainActor in self.isGeneratingToken = false } }
        
        guard let url = URL(string: "https://api.line.me/v2/oauth/accessToken") else {
            throw NSError(domain: "LineBotService", code: 400, userInfo: [NSLocalizedDescriptionKey: "OAuth 網址無效"])
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/x-www-form-urlencoded", forHTTPHeaderField: "Content-Type")
        
        let bodyParams = "grant_type=client_credentials&client_id=\(cleanId)&client_secret=\(cleanSecret)"
        request.httpBody = bodyParams.data(using: .utf8)
        
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse else {
            throw NSError(domain: "LineBotService", code: 500, userInfo: [NSLocalizedDescriptionKey: "LINE 伺服器無回應"])
        }
        
        guard httpResponse.statusCode == 200 else {
            var errMessage = "HTTP \(httpResponse.statusCode)"
            if let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
               let desc = json["error_description"] as? String ?? json["error"] as? String {
                errMessage = desc
            }
            throw NSError(domain: "LineBotService", code: httpResponse.statusCode, userInfo: [NSLocalizedDescriptionKey: "取得 Token 失敗：\(errMessage)"])
        }
        
        guard let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let token = json["access_token"] as? String else {
            throw NSError(domain: "LineBotService", code: 500, userInfo: [NSLocalizedDescriptionKey: "解析 Token 失敗"])
        }
        
        await MainActor.run {
            self.channelAccessToken = token
        }
        await self.syncSettingsToSupabase()
        return token
    }
    
    public var isConfigured: Bool {
        return !channelAccessToken.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }
    
    // MARK: - iOS 背景任務排程 (BGTaskScheduler)
    public func scheduleBackgroundBriefingTask() {
        guard isMorningBriefingEnabled, isConfigured else {
            BGTaskScheduler.shared.cancel(taskRequestWithIdentifier: Self.bgTaskIdentifier)
            return
        }
        
        let request = BGAppRefreshTaskRequest(identifier: Self.bgTaskIdentifier)
        let cal = Calendar.current
        let now = Date()
        var components = cal.dateComponents([.year, .month, .day], from: now)
        components.hour = pushHour
        components.minute = pushMinute
        components.second = 0
        
        if let targetToday = cal.date(from: components) {
            if targetToday > now {
                request.earliestBeginDate = targetToday
            } else if let targetTomorrow = cal.date(byAdding: .day, value: 1, to: targetToday) {
                request.earliestBeginDate = targetTomorrow
            }
        }
        
        try? BGTaskScheduler.shared.submit(request)
    }
    
    public func handleBackgroundBriefingTask() async {
        scheduleBackgroundBriefingTask()
        await fetchRegisteredUsersFromSupabase()
        await checkAndAutoSendAllUsersAsync()
    }
    
    // MARK: - 本地每日通知排程
    public func updateNotificationSchedule() {
        let center = UNUserNotificationCenter.current()
        center.removePendingNotificationRequests(withIdentifiers: ["campus_daily_line_briefing"])
        
        guard isMorningBriefingEnabled else { return }
        
        let content = UNMutableNotificationContent()
        content.title = "晨間校園日報 (\(String(format: "%02d:%02d", pushHour, pushMinute)))"
        content.body = "今日課表、待辦清單與本週計畫已發送至您的 LINE！"
        content.sound = .default
        
        var dateComponents = DateComponents()
        dateComponents.hour = pushHour
        dateComponents.minute = pushMinute
        
        let trigger = UNCalendarNotificationTrigger(dateMatching: dateComponents, repeats: true)
        let request = UNNotificationRequest(identifier: "campus_daily_line_briefing", content: content, trigger: trigger)
        
        center.add(request) { error in
            if let error = error {
                print("Failed to schedule daily briefing notification: \(error.localizedDescription)")
            }
        }
    }
    
    // MARK: - 自動檢查並補推晨報 (支援雲端防重複與多使用者分開推播)
    public func checkAndAutoSendBriefingIfNeeded() {
        Task {
            await checkAndAutoSendAllUsersAsync()
        }
    }
    
    public func checkAndAutoSendAllUsersAsync() async {
        guard isMorningBriefingEnabled, isConfigured else { return }
        
        // 先從雲端拉取最新狀態，確認雲端排程是否已經在關閉 App 期間發送過
        await fetchRegisteredUsersFromSupabase()
        
        let cal = Calendar.current
        let now = Date()
        let todayStr = Self.todayDateString(for: now)
        let currentHour = cal.component(.hour, from: now)
        let currentMinute = cal.component(.minute, from: now)
        
        // 1. 檢查本機主使用者
        let isPastMyTime = (currentHour > pushHour) || (currentHour == pushHour && currentMinute >= pushMinute)
        if isPastMyTime {
            let cleanMyUid = userId.trimmingCharacters(in: .whitespacesAndNewlines)
            let cloudAlreadySent = registeredUsers.first(where: { $0.userId == cleanMyUid })?.lastSentDate == todayStr
            let localAlreadySent = (lastSentDate != nil && cal.isDate(lastSentDate!, inSameDayAs: now))
            
            if cloudAlreadySent {
                if !localAlreadySent {
                    await MainActor.run {
                        self.lastSentDate = now
                        UserDefaults.standard.set(now, forKey: self.lastSentDateKey)
                    }
                }
            } else if !localAlreadySent {
                do {
                    try await DataManager.shared.sendLineBriefingNow()
                    await syncSettingsToSupabase()
                } catch {
                    print("自動發送主使用者 LINE 晨報失敗：\(error.localizedDescription)")
                }
            }
        }
        
        // 2. 檢查其他已註冊的多使用者 (若未限制僅本機且雲端尚未發送、已達該使用者的設定時間，則分開推播各自內容)
        guard !onlyPushSelfOnDevice else { return }
        let cleanMyUid = userId.trimmingCharacters(in: .whitespacesAndNewlines)
        for profile in registeredUsers where profile.userId != cleanMyUid && profile.isEnabled {
            let isPastUserTime = (currentHour > profile.pushHour) || (currentHour == profile.pushHour && currentMinute >= profile.pushMinute)
            if isPastUserTime && profile.lastSentDate != todayStr {
                try? await sendBriefingToSpecificUser(profile)
            }
        }
    }
    
    // MARK: - 同步本機使用者設定與課表/待辦快照至 Supabase 雲端排程表
    public func syncSettingsToSupabase(resetLastSent: Bool = false) async {
        guard SupabaseConfig.shared.isConfigured else { return }
        let cleanToken = channelAccessToken.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !cleanToken.isEmpty else { return }
        
        let (coursesSnapshot, todosSnapshot, myDeviceId, myShareCode, myShareName) = await MainActor.run {
            (
                DataManager.shared.courses,
                DataManager.shared.todos,
                DataManager.shared.deviceId,
                DataManager.shared.myShareCode,
                DataManager.shared.myShareName
            )
        }
        
        var cleanUid = userId.trimmingCharacters(in: .whitespacesAndNewlines)
        let savedExplicitUid = UserDefaults.standard.string(forKey: userIdKey) ?? ""
        let existingOwner = await MainActor.run {
            self.registeredUsers.first(where: { $0.userId == cleanUid })
        }
        
        // 若本機未填 User ID，或新手機安裝時偵測到預設 User ID 已被其他裝置綁定，自動切換為「免填 ID・自動好友推播 (AUTO_<分享碼>)」
        if cleanUid.isEmpty || (savedExplicitUid.isEmpty && existingOwner != nil && !existingOwner!.deviceId.isEmpty && existingOwner!.deviceId != myDeviceId) {
            let suffix = myShareCode.isEmpty ? String(myDeviceId.prefix(6)).uppercased() : myShareCode.uppercased()
            cleanUid = "AUTO_\(suffix)"
            await MainActor.run {
                self.userId = cleanUid
            }
        }
        
        await MainActor.run { self.isSyncingCloud = true }
        defer { Task { @MainActor in self.isSyncingCloud = false } }
        
        let baseURL = SupabaseConfig.shared.projectURL.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
        let anonKey = SupabaseConfig.shared.anonPublicKey
        
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        let coursesJson = (try? encoder.encode(coursesSnapshot)).flatMap { try? JSONSerialization.jsonObject(with: $0) } ?? []
        let todosJson = (try? encoder.encode(todosSnapshot)).flatMap { try? JSONSerialization.jsonObject(with: $0) } ?? []
        
        let todayStr = Self.todayDateString()
        let lastSentStr: String = {
            if resetLastSent { return "" }
            if let lastDate = self.lastSentDate, Calendar.current.isDateInToday(lastDate) {
                return todayStr
            }
            if let existing = self.registeredUsers.first(where: { $0.userId == cleanUid })?.lastSentDate, existing == todayStr {
                return todayStr
            }
            return ""
        }()
        
        let displayUserName = userName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? myShareName : userName.trimmingCharacters(in: .whitespacesAndNewlines)
        let nowIso = ISO8601DateFormatter().string(from: Date())
        
        let existingSelf = await MainActor.run {
            self.registeredUsers.first(where: { $0.userId == cleanUid })
        }
        
        // 更新本地多使用者陣列中的自己 (保留原本的獨立推送開關設定)
        let myProfile = LineBotUserProfile(
            userId: cleanUid,
            deviceId: myDeviceId,
            userName: displayUserName,
            shareCode: myShareCode,
            channelAccessToken: cleanToken,
            isEnabled: isMorningBriefingEnabled,
            pushHour: pushHour,
            pushMinute: pushMinute,
            includeSchedule: existingSelf?.includeSchedule ?? true,
            includeTodos: existingSelf?.includeTodos ?? true,
            includeWeeklyPlan: existingSelf?.includeWeeklyPlan ?? true,
            includeExpenseSummary: existingSelf?.includeExpenseSummary ?? false,
            coursesData: coursesSnapshot,
            todosData: todosSnapshot,
            lastSentDate: lastSentStr,
            updatedAt: nowIso
        )
        
        await MainActor.run {
            if let idx = self.registeredUsers.firstIndex(where: { $0.userId == cleanUid }) {
                self.registeredUsers[idx] = myProfile
            } else {
                self.registeredUsers.insert(myProfile, at: 0)
            }
            self.saveRegisteredUsersLocally()
        }
        
        guard let url = URL(string: "\(baseURL)/rest/v1/line_bot_settings?on_conflict=user_id") else { return }
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(anonKey)", forHTTPHeaderField: "Authorization")
        request.setValue(anonKey, forHTTPHeaderField: "apikey")
        request.setValue("resolution=merge-duplicates,return=representation", forHTTPHeaderField: "Prefer")
        
        let body: [String: Any] = [
            "user_id": cleanUid,
            "device_id": myDeviceId,
            "user_name": displayUserName,
            "share_code": myShareCode,
            "channel_access_token": cleanToken,
            "is_enabled": isMorningBriefingEnabled,
            "push_hour": pushHour,
            "push_minute": pushMinute,
            "courses_data": coursesJson,
            "todos_data": todosJson,
            "last_sent_date": lastSentStr,
            "updated_at": nowIso
        ]
        
        guard let data = try? JSONSerialization.data(withJSONObject: body) else { return }
        request.httpBody = data
        
        if let (_, response) = try? await URLSession.shared.data(for: request),
           let httpRes = response as? HTTPURLResponse {
            if (200...299).contains(httpRes.statusCode) {
                await MainActor.run {
                    self.isCloudCronReady = true
                }
            } else if httpRes.statusCode == 404 || httpRes.statusCode == 400 {
                // 若為舊版 schema 或尚未建立資料表，檢測狀態
                await checkCloudTableStatus()
            }
        }
    }
    
    // MARK: - 從 Supabase 讀取所有已註冊的通知使用者清單
    @MainActor
    public func fetchRegisteredUsersFromSupabase() async {
        guard SupabaseConfig.shared.isConfigured else { return }
        let baseURL = SupabaseConfig.shared.projectURL.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
        let anonKey = SupabaseConfig.shared.anonPublicKey
        guard let url = URL(string: "\(baseURL)/rest/v1/line_bot_settings?select=*&order=updated_at.asc") else { return }
        
        var request = URLRequest(url: url)
        request.setValue("Bearer \(anonKey)", forHTTPHeaderField: "Authorization")
        request.setValue(anonKey, forHTTPHeaderField: "apikey")
        
        do {
            let (data, response) = try await URLSession.shared.data(for: request)
            guard let httpRes = response as? HTTPURLResponse else { return }
            
            if (200...299).contains(httpRes.statusCode) {
                self.isCloudCronReady = true
                let decoder = JSONDecoder.robustDecoder
                if let cloudUsers = try? decoder.decode([LineBotUserProfile].self, from: data), !cloudUsers.isEmpty {
                    // 過濾掉專供課表分享備援使用的 SHARE_ 紀錄與 CLOUD_API_VAULT 保險箱紀錄，只保留真實 LINE 通知使用者
                    var merged: [LineBotUserProfile] = []
                    for var cloudUser in cloudUsers where !cloudUser.userId.hasPrefix("SHARE_") && cloudUser.userId != "CLOUD_API_VAULT" {
                        if let localMatch = self.registeredUsers.first(where: { $0.userId == cloudUser.userId }) {
                            cloudUser.includeSchedule = localMatch.includeSchedule
                            cloudUser.includeTodos = localMatch.includeTodos
                            cloudUser.includeWeeklyPlan = localMatch.includeWeeklyPlan
                            cloudUser.includeExpenseSummary = localMatch.includeExpenseSummary
                        }
                        merged.append(cloudUser)
                    }
                    for localUser in self.registeredUsers where !localUser.userId.hasPrefix("SHARE_") && localUser.userId != "CLOUD_API_VAULT" {
                        if !merged.contains(where: { $0.userId == localUser.userId }) {
                            merged.append(localUser)
                        }
                    }
                    self.registeredUsers = merged
                    self.saveRegisteredUsersLocally()
                    
                    // 若雲端排程已在今日發送過本機使用者的通知，同步更新本機 lastSentDate
                    let cleanMyUid = self.userId.trimmingCharacters(in: .whitespacesAndNewlines)
                    let todayStr = Self.todayDateString()
                    if let myCloudRecord = merged.first(where: { $0.userId == cleanMyUid }),
                       myCloudRecord.lastSentDate == todayStr {
                        if self.lastSentDate == nil || !Calendar.current.isDateInToday(self.lastSentDate!) {
                            self.lastSentDate = Date()
                            UserDefaults.standard.set(self.lastSentDate, forKey: self.lastSentDateKey)
                        }
                    }
                }
            } else {
                self.isCloudCronReady = false
            }
        } catch {
            print("Fetch registered users failed: \(error.localizedDescription)")
        }
    }
    
    @MainActor
    public func checkCloudTableStatus() async {
        await fetchRegisteredUsersFromSupabase()
    }
    
    // MARK: - 更新單一使用者的獨立推播偏好 (開關、時間、推送內容模組)
    @MainActor
    public func updateUserPushPreferences(_ updatedProfile: LineBotUserProfile) async {
        if let idx = registeredUsers.firstIndex(where: { $0.userId == updatedProfile.userId }) {
            registeredUsers[idx] = updatedProfile
            saveRegisteredUsersLocally()
        }
        let cleanMyUid = userId.trimmingCharacters(in: .whitespacesAndNewlines)
        if updatedProfile.userId == cleanMyUid {
            if self.isMorningBriefingEnabled != updatedProfile.isEnabled {
                self.isMorningBriefingEnabled = updatedProfile.isEnabled
            }
            if self.pushHour != updatedProfile.pushHour {
                self.pushHour = updatedProfile.pushHour
            }
            if self.pushMinute != updatedProfile.pushMinute {
                self.pushMinute = updatedProfile.pushMinute
            }
        }
        guard SupabaseConfig.shared.isConfigured else { return }
        let baseURL = SupabaseConfig.shared.projectURL.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
        let anonKey = SupabaseConfig.shared.anonPublicKey
        guard let patchURL = URL(string: "\(baseURL)/rest/v1/line_bot_settings?user_id=eq.\(updatedProfile.userId)") else { return }
        var req = URLRequest(url: patchURL)
        req.httpMethod = "PATCH"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.setValue("Bearer \(anonKey)", forHTTPHeaderField: "Authorization")
        req.setValue(anonKey, forHTTPHeaderField: "apikey")
        let body: [String: Any] = [
            "user_name": updatedProfile.userName,
            "share_code": updatedProfile.shareCode,
            "is_enabled": updatedProfile.isEnabled,
            "push_hour": updatedProfile.pushHour,
            "push_minute": updatedProfile.pushMinute,
            "updated_at": ISO8601DateFormatter().string(from: Date())
        ]
        req.httpBody = try? JSONSerialization.data(withJSONObject: body)
        _ = try? await URLSession.shared.data(for: req)
    }
    
    // MARK: - 從「好友分享記錄簿」一鍵匯入好友至獨立推播清單
    @MainActor
    public func importSavedFriendToPushList(_ friend: SavedFriendRecord, pushHour: Int = 7, pushMinute: Int = 30) async throws {
        try await upsertAdditionalUser(
            userName: friend.displayName,
            targetUserId: "",
            shareCode: friend.shareCode,
            pushHour: pushHour,
            pushMinute: pushMinute,
            isEnabled: true,
            includeSchedule: true,
            includeTodos: true,
            includeWeeklyPlan: true,
            includeExpenseSummary: true
        )
    }
    
    // MARK: - 一鍵批次獨立推送所有已啟用使用者 (每位使用者收到各自專屬的課表、待辦與記帳摘要)
    public func pushAllEnabledUsersIndependently(forceAll: Bool = true) async -> (successCount: Int, failCount: Int) {
        let targets = await MainActor.run {
            self.registeredUsers.filter { forceAll ? $0.isEnabled : ($0.isEnabled && !$0.isSentToday) }
        }
        var ok = 0
        var fail = 0
        for profile in targets {
            do {
                try await sendBriefingToSpecificUser(profile)
                ok += 1
            } catch {
                fail += 1
            }
        }
        return (ok, fail)
    }
    
    // MARK: - 新增或更新其他通知使用者 (支援綁定分享代碼分開通知各自課表与獨立模組)
    @MainActor
    public func upsertAdditionalUser(
        userName: String,
        targetUserId: String,
        shareCode: String,
        pushHour: Int,
        pushMinute: Int,
        isEnabled: Bool = true,
        includeSchedule: Bool = true,
        includeTodos: Bool = true,
        includeWeeklyPlan: Bool = true,
        includeExpenseSummary: Bool = false
    ) async throws {
        let rawUid = targetUserId.trimmingCharacters(in: .whitespacesAndNewlines)
        let cleanName = userName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? "使用者" : userName.trimmingCharacters(in: .whitespacesAndNewlines)
        let cleanShareCode = shareCode.trimmingCharacters(in: .whitespacesAndNewlines).uppercased()
        let cleanToken = channelAccessToken.trimmingCharacters(in: .whitespacesAndNewlines)
        
        // 免填 User ID：若未填寫 U 開頭 ID，自動以 AUTO_<分享碼> 作為識別碼並透過好友推播發送
        let cleanUid: String
        if rawUid.isEmpty {
            let suffix = cleanShareCode.isEmpty ? String(UUID().uuidString.prefix(6)).uppercased() : cleanShareCode
            cleanUid = "AUTO_\(suffix)"
        } else {
            cleanUid = rawUid
        }
        
        guard !cleanToken.isEmpty else {
            throw NSError(domain: "LineBotService", code: 400, userInfo: [NSLocalizedDescriptionKey: "請先取得或填寫 Channel Access Token"])
        }
        
        var userCourses: [Course] = []
        var userTodos: [TodoItem] = []
        
        // 若有填寫 6 碼分享代碼，從 Supabase shared_schedules 或 line_bot_settings 備援通道抓取該使用者的專屬課表與待辦
        if !cleanShareCode.isEmpty, SupabaseConfig.shared.isConfigured {
            let baseURL = SupabaseConfig.shared.projectURL.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
            let anonKey = SupabaseConfig.shared.anonPublicKey
            if let schedURL = URL(string: "\(baseURL)/rest/v1/shared_schedules?share_code=eq.\(cleanShareCode)&select=*") {
                var req = URLRequest(url: schedURL)
                req.setValue(anonKey, forHTTPHeaderField: "apikey")
                req.setValue("Bearer \(anonKey)", forHTTPHeaderField: "Authorization")
                if let (data, res) = try? await URLSession.shared.data(for: req),
                   let http = res as? HTTPURLResponse, (200...299).contains(http.statusCode),
                   let schedules = try? JSONDecoder.robustDecoder.decode([SharedSchedule].self, from: data),
                   let matched = schedules.first {
                    userCourses = matched.coursesData
                    userTodos = matched.todosData
                }
            }
            if userCourses.isEmpty,
               let fallbackURL = URL(string: "\(baseURL)/rest/v1/line_bot_settings?share_code=eq.\(cleanShareCode)&select=*") {
                var req = URLRequest(url: fallbackURL)
                req.setValue(anonKey, forHTTPHeaderField: "apikey")
                req.setValue("Bearer \(anonKey)", forHTTPHeaderField: "Authorization")
                if let (data, res) = try? await URLSession.shared.data(for: req),
                   let http = res as? HTTPURLResponse, (200...299).contains(http.statusCode),
                   let profiles = try? JSONDecoder.robustDecoder.decode([LineBotUserProfile].self, from: data),
                   let chosen = profiles.first(where: { $0.userId == "SHARE_\(cleanShareCode)" }) ?? profiles.first {
                    userCourses = chosen.coursesData ?? []
                    userTodos = chosen.todosData ?? []
                }
            }
        } else if cleanUid == self.userId.trimmingCharacters(in: .whitespacesAndNewlines) {
            userCourses = DataManager.shared.courses
            userTodos = DataManager.shared.todos
        }
        
        let nowIso = ISO8601DateFormatter().string(from: Date())
        let profile = LineBotUserProfile(
            userId: cleanUid,
            deviceId: cleanUid == self.userId ? DataManager.shared.deviceId : "ext_\(cleanShareCode.isEmpty ? String(cleanUid.suffix(6)) : cleanShareCode)",
            userName: cleanName,
            shareCode: cleanShareCode,
            channelAccessToken: cleanToken,
            isEnabled: isEnabled,
            pushHour: pushHour,
            pushMinute: pushMinute,
            includeSchedule: includeSchedule,
            includeTodos: includeTodos,
            includeWeeklyPlan: includeWeeklyPlan,
            includeExpenseSummary: includeExpenseSummary,
            coursesData: userCourses,
            todosData: userTodos,
            lastSentDate: "",
            updatedAt: nowIso
        )
        
        if let idx = self.registeredUsers.firstIndex(where: { $0.userId == cleanUid || (!cleanShareCode.isEmpty && $0.shareCode == cleanShareCode && $0.userId.hasPrefix("AUTO_")) }) {
            self.registeredUsers[idx] = profile
        } else {
            self.registeredUsers.append(profile)
        }
        self.saveRegisteredUsersLocally()
        
        // 同步寫入 Supabase line_bot_settings
        if SupabaseConfig.shared.isConfigured {
            let baseURL = SupabaseConfig.shared.projectURL.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
            let anonKey = SupabaseConfig.shared.anonPublicKey
            if let url = URL(string: "\(baseURL)/rest/v1/line_bot_settings?on_conflict=user_id") {
                var request = URLRequest(url: url)
                request.httpMethod = "POST"
                request.setValue("application/json", forHTTPHeaderField: "Content-Type")
                request.setValue("Bearer \(anonKey)", forHTTPHeaderField: "Authorization")
                request.setValue(anonKey, forHTTPHeaderField: "apikey")
                request.setValue("resolution=merge-duplicates", forHTTPHeaderField: "Prefer")
                
                let encoder = JSONEncoder()
                encoder.dateEncodingStrategy = .iso8601
                let coursesJson = (try? encoder.encode(userCourses)).flatMap { try? JSONSerialization.jsonObject(with: $0) } ?? []
                let todosJson = (try? encoder.encode(userTodos)).flatMap { try? JSONSerialization.jsonObject(with: $0) } ?? []
                
                let body: [String: Any] = [
                    "user_id": profile.userId,
                    "device_id": profile.deviceId,
                    "user_name": profile.userName,
                    "share_code": profile.shareCode,
                    "channel_access_token": profile.channelAccessToken,
                    "is_enabled": profile.isEnabled,
                    "push_hour": profile.pushHour,
                    "push_minute": profile.pushMinute,
                    "courses_data": coursesJson,
                    "todos_data": todosJson,
                    "last_sent_date": "",
                    "updated_at": nowIso
                ]
                request.httpBody = try? JSONSerialization.data(withJSONObject: body)
                _ = try? await URLSession.shared.data(for: request)
            }
        }
    }
    
    @MainActor
    public func deleteUserProfile(userId targetUid: String) async {
        registeredUsers.removeAll { $0.userId == targetUid }
        saveRegisteredUsersLocally()
        
        guard SupabaseConfig.shared.isConfigured else { return }
        let baseURL = SupabaseConfig.shared.projectURL.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
        let anonKey = SupabaseConfig.shared.anonPublicKey
        guard let url = URL(string: "\(baseURL)/rest/v1/line_bot_settings?user_id=eq.\(targetUid)") else { return }
        
        var request = URLRequest(url: url)
        request.httpMethod = "DELETE"
        request.setValue("Bearer \(anonKey)", forHTTPHeaderField: "Authorization")
        request.setValue(anonKey, forHTTPHeaderField: "apikey")
        _ = try? await URLSession.shared.data(for: request)
    }
    
    // MARK: - 針對特定使用者單獨發送其專屬課表、待辦與記帳晨報
    public func sendBriefingToSpecificUser(_ profile: LineBotUserProfile, date: Date = Date()) async throws {
        let cleanMyUid = userId.trimmingCharacters(in: .whitespacesAndNewlines)
        
        var targetCourses: [Course] = profile.coursesData ?? []
        var targetTodos: [TodoItem] = profile.todosData ?? []
        var expenseSummaryText: String? = nil
        
        if profile.userId == cleanMyUid {
            let myData = await MainActor.run {
                let cal = Calendar.current
                let todayTotal = DataManager.shared.transactions
                    .filter { $0.type == .expense && cal.isDate($0.date, inSameDayAs: date) }
                    .reduce(0.0) { $0 + $1.amount }
                let monthTotal = DataManager.shared.transactions
                    .filter { $0.type == .expense && cal.isDate($0.date, equalTo: date, toGranularity: .month) }
                    .reduce(0.0) { $0 + $1.amount }
                return (DataManager.shared.courses, DataManager.shared.todos, todayTotal, monthTotal)
            }
            targetCourses = myData.0
            targetTodos = myData.1
            if profile.includeExpenseSummary {
                expenseSummaryText = "今日支出 NT$ \(Int(myData.2)) · 本月累計 NT$ \(Int(myData.3))"
            }
        } else if !profile.shareCode.isEmpty, SupabaseConfig.shared.isConfigured {
            // 若綁定分享代碼，即時從 shared_schedules 或 line_bot_settings 備援通道拉取最新課表、待辦與記帳
            let baseURL = SupabaseConfig.shared.projectURL.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
            let anonKey = SupabaseConfig.shared.anonPublicKey
            if let schedURL = URL(string: "\(baseURL)/rest/v1/shared_schedules?share_code=eq.\(profile.shareCode)&select=*") {
                var req = URLRequest(url: schedURL)
                req.setValue(anonKey, forHTTPHeaderField: "apikey")
                req.setValue("Bearer \(anonKey)", forHTTPHeaderField: "Authorization")
                if let (data, res) = try? await URLSession.shared.data(for: req),
                   let http = res as? HTTPURLResponse, (200...299).contains(http.statusCode),
                   let schedules = try? JSONDecoder.robustDecoder.decode([SharedSchedule].self, from: data),
                   let matched = schedules.first {
                    targetCourses = matched.coursesData
                    targetTodos = matched.todosData
                    if profile.includeExpenseSummary, !matched.accountingData.isEmpty {
                        let cal = Calendar.current
                        let todayTotal = matched.accountingData
                            .filter { $0.type == .expense && cal.isDate($0.date, inSameDayAs: date) }
                            .reduce(0.0) { $0 + $1.amount }
                        let monthTotal = matched.accountingData
                            .filter { $0.type == .expense && cal.isDate($0.date, equalTo: date, toGranularity: .month) }
                            .reduce(0.0) { $0 + $1.amount }
                        expenseSummaryText = "今日支出 NT$ \(Int(todayTotal)) · 本月累計 NT$ \(Int(monthTotal))"
                    }
                }
            }
            if targetCourses.isEmpty,
               let fallbackURL = URL(string: "\(baseURL)/rest/v1/line_bot_settings?share_code=eq.\(profile.shareCode)&select=*") {
                var req = URLRequest(url: fallbackURL)
                req.setValue(anonKey, forHTTPHeaderField: "apikey")
                req.setValue("Bearer \(anonKey)", forHTTPHeaderField: "Authorization")
                if let (data, res) = try? await URLSession.shared.data(for: req),
                   let http = res as? HTTPURLResponse, (200...299).contains(http.statusCode),
                   let profiles = try? JSONDecoder.robustDecoder.decode([LineBotUserProfile].self, from: data),
                   let chosen = profiles.first(where: { $0.userId == "SHARE_\(profile.shareCode)" }) ?? profiles.first {
                    targetCourses = chosen.coursesData ?? []
                    targetTodos = chosen.todosData ?? []
                }
            }
        }
        
        // 計算該使用者的今日課表、今日待辦、本週待辦與剩餘堂數
        let calendar = Calendar.current
        let todayWeekday = WeekDay.from(date: date).rawValue
        let todayCoursesList = targetCourses
            .filter { $0.dayOfWeek == todayWeekday }
            .sorted { $0.startTime < $1.startTime }
        
        let targetDayStart = calendar.startOfDay(for: date)
        let targetDayEnd = calendar.date(bySettingHour: 23, minute: 59, second: 59, of: date) ?? date
        
        let todayTodosList = targetTodos.filter { todo in
            guard !todo.isCompleted else { return false }
            if let start = todo.startDate, let due = todo.dueDate {
                let s = calendar.startOfDay(for: start)
                let d = calendar.date(bySettingHour: 23, minute: 59, second: 59, of: due) ?? due
                return targetDayStart <= d && targetDayEnd >= s
            } else if let dueDate = todo.dueDate {
                return calendar.isDate(dueDate, inSameDayAs: date)
            }
            return false
        }
        
        let weekInterval = calendar.dateInterval(of: .weekOfYear, for: date)
        let weekTodosList = targetTodos.filter { todo in
            guard !todo.isCompleted else { return false }
            guard let interval = weekInterval else { return true }
            if let start = todo.startDate, let due = todo.dueDate {
                let s = calendar.startOfDay(for: start)
                let d = calendar.date(bySettingHour: 23, minute: 59, second: 59, of: due) ?? due
                return !(d < interval.start || s > interval.end)
            } else if let dueDate = todo.dueDate {
                return dueDate >= interval.start && dueDate <= interval.end
            }
            return false
        }
        
        let remainingCoursesCount = targetCourses.filter { $0.dayOfWeek >= todayWeekday }.count
        
        try await sendBriefingPush(
            date: date,
            todayCourses: todayCoursesList,
            todayTodos: todayTodosList,
            weekTodos: weekTodosList,
            weeklyRemainingCoursesCount: remainingCoursesCount,
            targetUserId: profile.userId,
            targetUserName: profile.userName,
            targetPushTimeText: String(format: "%02d:%02d", profile.pushHour, profile.pushMinute),
            includeSchedule: profile.includeSchedule,
            includeTodos: profile.includeTodos,
            includeWeeklyPlan: profile.includeWeeklyPlan,
            expenseSummaryText: expenseSummaryText
        )
        
        // 更新該使用者的 last_sent_date
        let todayStr = Self.todayDateString(for: date)
        await MainActor.run {
            if let idx = self.registeredUsers.firstIndex(where: { $0.userId == profile.userId }) {
                self.registeredUsers[idx].lastSentDate = todayStr
                self.saveRegisteredUsersLocally()
            }
        }
        
        if SupabaseConfig.shared.isConfigured {
            let baseURL = SupabaseConfig.shared.projectURL.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
            let anonKey = SupabaseConfig.shared.anonPublicKey
            if let patchURL = URL(string: "\(baseURL)/rest/v1/line_bot_settings?user_id=eq.\(profile.userId)") {
                var req = URLRequest(url: patchURL)
                req.httpMethod = "PATCH"
                req.setValue("application/json", forHTTPHeaderField: "Content-Type")
                req.setValue("Bearer \(anonKey)", forHTTPHeaderField: "Authorization")
                req.setValue(anonKey, forHTTPHeaderField: "apikey")
                let body: [String: Any] = [
                    "last_sent_date": todayStr,
                    "updated_at": ISO8601DateFormatter().string(from: Date())
                ]
                req.httpBody = try? JSONSerialization.data(withJSONObject: body)
                _ = try? await URLSession.shared.data(for: req)
            }
        }
    }
    
    // MARK: - 建構 LINE Flex Message (iOS 原生極簡風格卡片，支援每位使用者獨立模組開關)
    public func buildDailyBriefingFlexMessage(
        date: Date,
        todayCourses: [Course],
        todayTodos: [TodoItem],
        weekTodos: [TodoItem],
        weeklyRemainingCoursesCount: Int,
        recipientName: String? = nil,
        pushTimeText: String? = nil,
        includeSchedule: Bool = true,
        includeTodos: Bool = true,
        includeWeeklyPlan: Bool = true,
        expenseSummaryText: String? = nil
    ) -> [String: Any] {
        let cal = Calendar.current
        let df = DateFormatter()
        df.locale = Locale(identifier: "zh_Hant_TW")
        df.dateFormat = "M月d日"
        let dateString = df.string(from: date)
        
        let weekdayNames = ["", "星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"]
        let weekdayIndex = cal.component(.weekday, from: date)
        let weekdayString = (weekdayIndex >= 1 && weekdayIndex <= 7) ? weekdayNames[weekdayIndex] : ""
        
        let headerTitle = "\(dateString) \(weekdayString)"
        let summaryText = "\(todayCourses.count) 堂課 · \(todayTodos.count) 項待辦"
        
        let cleanRecipient = (recipientName ?? userName).trimmingCharacters(in: .whitespacesAndNewlines)
        let eyebrowText = cleanRecipient.isEmpty ? "CAMPUS BRIEFING" : "CAMPUS BRIEFING · \(cleanRecipient)"
        let displayTime = pushTimeText ?? String(format: "%02d:%02d", pushHour, pushMinute)
        
        var bodyContents: [[String: Any]] = []
        
        // 1. Eyebrow & Title (Apple Calendar / Widget Style)
        bodyContents.append([
            "type": "text",
            "text": eyebrowText,
            "size": "xxs",
            "weight": "bold",
            "color": "#8E8E93"
        ])
        
        bodyContents.append([
            "type": "box",
            "layout": "horizontal",
            "margin": "xs",
            "contents": [
                [
                    "type": "text",
                    "text": headerTitle,
                    "size": "xl",
                    "weight": "bold",
                    "color": "#1C1C1E",
                    "flex": 1
                ],
                [
                    "type": "text",
                    "text": summaryText,
                    "size": "xs",
                    "color": "#8E8E93",
                    "align": "end",
                    "gravity": "bottom"
                ]
            ]
        ])
        
        // 2. Hairline Divider
        bodyContents.append([
            "type": "separator",
            "margin": "md",
            "color": "#E5E5EA"
        ])
        
        // 3. Section A: 今日課表
        if includeSchedule {
            bodyContents.append([
                "type": "text",
                "text": "今日課表",
                "size": "xs",
                "weight": "bold",
                "color": "#8E8E93",
                "margin": "lg"
            ])
            
            if todayCourses.isEmpty {
                bodyContents.append([
                    "type": "text",
                    "text": "今日無排定課程",
                    "size": "xs",
                    "color": "#8E8E93",
                    "margin": "sm"
                ])
            } else {
                for course in todayCourses {
                    let colorHex = course.colorHex.isEmpty ? "#007AFF" : course.colorHex
                    let room = course.classroom.isEmpty ? "未指定地點" : course.classroom
                    let prof = course.instructor.isEmpty ? "" : " · \(course.instructor)"
                    
                    bodyContents.append([
                        "type": "box",
                        "layout": "horizontal",
                        "margin": "md",
                        "spacing": "md",
                        "contents": [
                            [
                                "type": "box",
                                "layout": "vertical",
                                "width": "3px",
                                "backgroundColor": colorHex,
                                "cornerRadius": "2px",
                                "contents": [
                                    [
                                        "type": "text",
                                        "text": " ",
                                        "size": "xxs"
                                    ]
                                ]
                            ],
                            [
                                "type": "box",
                                "layout": "vertical",
                                "flex": 1,
                                "contents": [
                                    [
                                        "type": "box",
                                        "layout": "horizontal",
                                        "contents": [
                                            [
                                                "type": "text",
                                                "text": course.name,
                                                "size": "sm",
                                                "weight": "bold",
                                                "color": "#1C1C1E"
                                            ],
                                            [
                                                "type": "text",
                                                "text": "\(course.startTime) - \(course.endTime)",
                                                "size": "xs",
                                                "color": "#8E8E93",
                                                "align": "end"
                                            ]
                                        ]
                                    ],
                                    [
                                        "type": "text",
                                        "text": "\(room)\(prof)",
                                        "size": "xs",
                                        "color": "#8E8E93",
                                        "margin": "xs"
                                    ]
                                ]
                            ]
                        ]
                    ])
                }
            }
        }
        
        // 5. Section B: 今日待辦
        if includeTodos {
            bodyContents.append([
                "type": "separator",
                "margin": "lg",
                "color": "#E5E5EA"
            ])
            
            bodyContents.append([
                "type": "text",
                "text": "今日待辦",
                "size": "xs",
                "weight": "bold",
                "color": "#8E8E93",
                "margin": "lg"
            ])
            
            if todayTodos.isEmpty {
                bodyContents.append([
                    "type": "text",
                    "text": "全部待辦事項皆已完成",
                    "size": "xs",
                    "color": "#8E8E93",
                    "margin": "sm"
                ])
            } else {
                for todo in todayTodos.prefix(4) {
                    let priorityDotColor = (todo.priority == .high ? "#FF3B30" : (todo.priority == .medium ? "#FF9500" : "#34C759"))
                    
                    bodyContents.append([
                        "type": "box",
                        "layout": "horizontal",
                        "margin": "md",
                        "spacing": "md",
                        "contents": [
                            [
                                "type": "box",
                                "layout": "vertical",
                                "width": "8px",
                                "height": "8px",
                                "cornerRadius": "4px",
                                "backgroundColor": priorityDotColor,
                                "contents": [
                                    [
                                        "type": "text",
                                        "text": " ",
                                        "size": "xxs"
                                    ]
                                ]
                            ],
                            [
                                "type": "text",
                                "text": todo.title,
                                "size": "sm",
                                "color": "#1C1C1E",
                                "flex": 1,
                                "wrap": true
                            ],
                            [
                                "type": "box",
                                "layout": "vertical",
                                "backgroundColor": "#F2F2F7",
                                "cornerRadius": "4px",
                                "paddingStart": "6px",
                                "paddingEnd": "6px",
                                "paddingTop": "2px",
                                "paddingBottom": "2px",
                                "contents": [
                                    [
                                        "type": "text",
                                        "text": todo.displayCategoryName,
                                        "size": "xxs",
                                        "color": "#8E8E93"
                                    ]
                                ]
                            ]
                        ]
                    ])
                }
                if todayTodos.count > 4 {
                    bodyContents.append([
                        "type": "text",
                        "text": "...還有 \(todayTodos.count - 4) 項待辦",
                        "size": "xxs",
                        "color": "#8E8E93",
                        "align": "center",
                        "margin": "xs"
                    ])
                }
            }
        }
        
        // 7. Section C: 本週規劃
        if includeWeeklyPlan {
            bodyContents.append([
                "type": "separator",
                "margin": "lg",
                "color": "#E5E5EA"
            ])
            
            bodyContents.append([
                "type": "text",
                "text": "本週規劃",
                "size": "xs",
                "weight": "bold",
                "color": "#8E8E93",
                "margin": "lg"
            ])
            
            let upcomingWeekExamsAndProjects = weekTodos.filter {
                $0.displayCategoryName == "考試" || $0.displayCategoryName == "期中複習" || $0.displayCategoryName == "專案實作" || $0.displayCategoryName == "簡報報告" || $0.category == .exam || $0.category == .project
            }
            
            var weekInfoContents: [[String: Any]] = []
            weekInfoContents.append([
                "type": "text",
                "text": "• 本週後續剩餘堂數：\(weeklyRemainingCoursesCount) 堂",
                "size": "xs",
                "color": "#3C3C43"
            ])
            
            if upcomingWeekExamsAndProjects.isEmpty {
                weekInfoContents.append([
                    "type": "text",
                    "text": "• 本週無重大考試或報告",
                    "size": "xs",
                    "color": "#8E8E93",
                    "margin": "xs"
                ])
            } else {
                for item in upcomingWeekExamsAndProjects.prefix(3) {
                    var dueSnippet = ""
                    if let periodText = item.periodText {
                        dueSnippet = "(\(periodText)) "
                    } else if let due = item.dueDate {
                        let shortDf = DateFormatter()
                        shortDf.dateFormat = "M/d"
                        dueSnippet = "(\(shortDf.string(from: due))) "
                    }
                    weekInfoContents.append([
                        "type": "text",
                        "text": "• \(dueSnippet)\(item.displayCategoryName)：\(item.title)",
                        "size": "xs",
                        "color": "#3C3C43",
                        "weight": "bold",
                        "margin": "xs"
                    ])
                }
            }
            
            bodyContents.append([
                "type": "box",
                "layout": "vertical",
                "backgroundColor": "#F2F2F7",
                "cornerRadius": "10px",
                "paddingAll": "12px",
                "margin": "md",
                "spacing": "xs",
                "contents": weekInfoContents
            ])
        }
        
        // 8. Section D: 記帳與開銷摘要 (選用模組)
        if let expText = expenseSummaryText, !expText.isEmpty {
            bodyContents.append([
                "type": "separator",
                "margin": "lg",
                "color": "#E5E5EA"
            ])
            bodyContents.append([
                "type": "text",
                "text": "記帳開銷摘要",
                "size": "xs",
                "weight": "bold",
                "color": "#8E8E93",
                "margin": "lg"
            ])
            bodyContents.append([
                "type": "box",
                "layout": "vertical",
                "backgroundColor": "#FFF8EB",
                "cornerRadius": "8px",
                "paddingAll": "10px",
                "margin": "sm",
                "contents": [
                    [
                        "type": "text",
                        "text": expText,
                        "size": "xs",
                        "weight": "bold",
                        "color": "#FF9500"
                    ]
                ]
            ])
        }
        
        let bodyBox: [String: Any] = [
            "type": "box",
            "layout": "vertical",
            "backgroundColor": "#FFFFFF",
            "paddingAll": "20px",
            "contents": bodyContents
        ]
        
        // --- 9. Footer ---
        let footerBox: [String: Any] = [
            "type": "box",
            "layout": "vertical",
            "paddingTop": "10px",
            "paddingBottom": "16px",
            "paddingStart": "20px",
            "paddingEnd": "20px",
            "backgroundColor": "#FFFFFF",
            "contents": [
                [
                    "type": "button",
                    "action": [
                        "type": "message",
                        "label": "確認今日日程",
                        "text": "已確認今日日程"
                    ],
                    "style": "primary",
                    "color": "#007AFF",
                    "height": "sm"
                ],
                [
                    "type": "text",
                    "text": "Campus · 專屬推播 \(displayTime)",
                    "size": "xxs",
                    "color": "#C7C7CC",
                    "align": "center",
                    "margin": "md"
                ]
            ]
        ]
        
        // Assemble Bubble
        let bubble: [String: Any] = [
            "type": "bubble",
            "size": "mega",
            "body": bodyBox,
            "footer": footerBox
        ]
        
        return bubble
    }
    
    // MARK: - 發送 LINE Messaging API Push / Broadcast (支援多使用者獨立推播隔離)
    public func sendBriefingPush(
        date: Date = Date(),
        todayCourses: [Course],
        todayTodos: [TodoItem],
        weekTodos: [TodoItem],
        weeklyRemainingCoursesCount: Int,
        targetUserId: String? = nil,
        targetUserName: String? = nil,
        targetPushTimeText: String? = nil,
        includeSchedule: Bool = true,
        includeTodos: Bool = true,
        includeWeeklyPlan: Bool = true,
        expenseSummaryText: String? = nil
    ) async throws {
        let recipientId = (targetUserId ?? userId).trimmingCharacters(in: .whitespacesAndNewlines)
        var token = channelAccessToken.trimmingCharacters(in: .whitespacesAndNewlines)
        if token.isEmpty {
            await SupabaseApiVault.shared.fetchCloudApiConfigs()
            token = SupabaseApiVault.shared.value(for: "line_channel_access_token")
            if !token.isEmpty {
                await MainActor.run { self.channelAccessToken = token }
            }
        }
        
        await MainActor.run {
            self.isSending = true
            self.lastErrorMessage = nil
        }
        
        defer {
            Task { @MainActor in
                self.isSending = false
            }
        }
        
        let displayRecipientName = (targetUserName ?? userName).trimmingCharacters(in: .whitespacesAndNewlines)
        let bubbleContents = buildDailyBriefingFlexMessage(
            date: date,
            todayCourses: todayCourses,
            todayTodos: todayTodos,
            weekTodos: weekTodos,
            weeklyRemainingCoursesCount: weeklyRemainingCoursesCount,
            recipientName: displayRecipientName,
            pushTimeText: targetPushTimeText,
            includeSchedule: includeSchedule,
            includeTodos: includeTodos,
            includeWeeklyPlan: includeWeeklyPlan,
            expenseSummaryText: expenseSummaryText
        )
        
        let messagesArray: [[String: Any]] = [
            [
                "type": "flex",
                "altText": "Campus 專屬簡報 (\(displayRecipientName.isEmpty ? "今日課表" : displayRecipientName))：今日課表、待辦與本週計畫",
                "contents": bubbleContents
            ]
        ]
        
        // 若為 U 開頭的 33 碼 LINE User ID 則使用單人獨立 Push，否則（如 AUTO_<分享碼> 或空白）使用免 ID 標籤好友推播 Broadcast
        let isDirectUserId = recipientId.hasPrefix("U") && recipientId.count >= 25
        
        // 1. 優先由 App 傳送 Payload 至 Supabase RPC (`relay_line_message`)，由 Supabase 雲端讀取金鑰並代發至 LINE API
        let relayedBySupabase = await SupabaseApiVault.shared.relayLineMessageViaSupabase(
            recipientId: recipientId,
            isDirectPush: isDirectUserId,
            messages: messagesArray
        )
        if relayedBySupabase {
            let isSelf = (recipientId == self.userId.trimmingCharacters(in: .whitespacesAndNewlines))
            if isSelf {
                await MainActor.run {
                    self.lastSentDate = Date()
                    UserDefaults.standard.set(self.lastSentDate, forKey: self.lastSentDateKey)
                }
                Task {
                    await self.syncSettingsToSupabase()
                }
            }
            return
        }
        
        // 2. 若 Supabase 尚未部署 `relay_line_message` RPC 函數，則使用從 Supabase 雲端保險箱拉取的 Token 進行備援發送
        guard !token.isEmpty else {
            throw NSError(
                domain: "LineBotService",
                code: 400,
                userInfo: [NSLocalizedDescriptionKey: "請先在 Supabase 雲端 API 保險箱或 LINE 設定中填妥 Channel Access Token"]
            )
        }
        
        let endpointString = isDirectUserId
            ? "https://api.line.me/v2/bot/message/push"
            : "https://api.line.me/v2/bot/message/broadcast"
        
        var payload: [String: Any] = ["messages": messagesArray]
        if isDirectUserId {
            payload["to"] = recipientId
        }
        
        guard let postData = try? JSONSerialization.data(withJSONObject: payload, options: []),
              let url = URL(string: endpointString) else {
            throw NSError(domain: "LineBotService", code: 400, userInfo: [NSLocalizedDescriptionKey: "訊息封裝失敗"])
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = postData
        
        var (data, response) = try await URLSession.shared.data(for: request)
        
        // 僅在單一使用者環境下才將無效 User ID 降級為 Broadcast，避免多位使用者時把單人課表誤廣播給所有人
        let userCount = await MainActor.run { self.registeredUsers.count }
        if isDirectUserId,
           userCount <= 1,
           let firstHttp = response as? HTTPURLResponse,
           firstHttp.statusCode == 400,
           let broadcastURL = URL(string: "https://api.line.me/v2/bot/message/broadcast"),
           let broadcastData = try? JSONSerialization.data(withJSONObject: ["messages": messagesArray], options: []) {
            var fallbackReq = URLRequest(url: broadcastURL)
            fallbackReq.httpMethod = "POST"
            fallbackReq.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
            fallbackReq.setValue("application/json", forHTTPHeaderField: "Content-Type")
            fallbackReq.httpBody = broadcastData
            if let fallbackResult = try? await URLSession.shared.data(for: fallbackReq) {
                data = fallbackResult.0
                response = fallbackResult.1
            }
        }
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw NSError(domain: "LineBotService", code: 500, userInfo: [NSLocalizedDescriptionKey: "伺服器無回應"])
        }
        
        if httpResponse.statusCode == 200 {
            let isSelf = (recipientId == self.userId.trimmingCharacters(in: .whitespacesAndNewlines))
            if isSelf {
                await MainActor.run {
                    self.lastSentDate = Date()
                    UserDefaults.standard.set(self.lastSentDate, forKey: self.lastSentDateKey)
                }
                Task {
                    await self.syncSettingsToSupabase()
                }
            }
        } else {
            var errorDetail = "HTTP \(httpResponse.statusCode)"
            if let json = try? JSONSerialization.jsonObject(with: data, options: []) as? [String: Any] {
                if let message = json["message"] as? String {
                    errorDetail = "\(errorDetail): \(message)"
                }
                if let details = json["details"] as? [[String: Any]], !details.isEmpty {
                    let detailStrings = details.compactMap { d -> String? in
                        let prop = d["property"] as? String ?? ""
                        let msg = d["message"] as? String ?? ""
                        return prop.isEmpty ? msg : "\(prop): \(msg)"
                    }
                    if !detailStrings.isEmpty {
                        errorDetail += " (\(detailStrings.joined(separator: ", ")))"
                    }
                }
            } else if let rawString = String(data: data, encoding: .utf8) {
                errorDetail = "\(errorDetail): \(rawString)"
            }
            
            await MainActor.run {
                self.lastErrorMessage = errorDetail
            }
            throw NSError(domain: "LineBotService", code: httpResponse.statusCode, userInfo: [NSLocalizedDescriptionKey: "發送失敗：\(errorDetail)"])
        }
    }
}
