//
//  SupabaseConfig.swift
//  Campus v1
//

import Foundation
import Combine

public final class SupabaseConfig {
    public static let shared = SupabaseConfig()
    
    private let urlKey = "supabase_project_url"
    private let anonKey = "supabase_anon_key"
    
    // 使用者 Supabase 連線憑證
    public let defaultURL = "https://dxoobrrjzaovwpyagzgn.supabase.co"
    public let defaultAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR4b29icnJqemFvdndweWFnemduIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkwNDAxNDksImV4cCI6MjEwNDYxNjE0OX0.MRF3i5yXveFpalZOPcquDtsbCa7lg_fDRWMZsA8uXm0"
    
    public var projectURL: String {
        get {
            let saved = UserDefaults.standard.string(forKey: urlKey) ?? ""
            if saved.isEmpty || saved.contains("dxoobrrijzaovwpyagzgn") {
                return defaultURL
            }
            return sanitizeURL(saved)
        }
        set {
            let sanitized = sanitizeURL(newValue)
            UserDefaults.standard.set(sanitized, forKey: urlKey)
        }
    }
    
    private func sanitizeURL(_ urlString: String) -> String {
        var trimmed = urlString.trimmingCharacters(in: .whitespacesAndNewlines)
        if trimmed.isEmpty { return defaultURL }
        if !trimmed.lowercased().hasPrefix("http://") && !trimmed.lowercased().hasPrefix("https://") {
            trimmed = "https://" + trimmed
        }
        return trimmed.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
    }
    
    public var anonPublicKey: String {
        get {
            let saved = UserDefaults.standard.string(forKey: anonKey) ?? ""
            if saved.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                return defaultAnonKey
            }
            return saved.trimmingCharacters(in: .whitespacesAndNewlines)
        }
        set {
            UserDefaults.standard.set(newValue.trimmingCharacters(in: .whitespacesAndNewlines), forKey: anonKey)
        }
    }
    
    public var isConfigured: Bool {
        guard !projectURL.isEmpty, !anonPublicKey.isEmpty else { return false }
        guard let url = URL(string: projectURL), url.host != nil else { return false }
        return true
    }
    
    public func resetToDefaults() {
        UserDefaults.standard.removeObject(forKey: urlKey)
        UserDefaults.standard.removeObject(forKey: anonKey)
    }
}

// MARK: - ☁️ Supabase 雲端 API 金鑰保險箱與代發轉傳中心 (SupabaseApiVault)
// 將原本寫死在 App 內的第三方 API (LINE Channel ID/Secret/Token/UserID、Gemini API Key) 改為儲存在 Supabase 雲端，
// App 端不寫死任何第三方金鑰，僅負責將訊息或辨識請求傳送至 Supabase RPC 進行雲端代發或從雲端保險箱動態載入。
public struct CloudApiConfigRow: Codable {
    public var configKey: String
    public var configValue: String
    public var description: String?
    public var updatedAt: String?
    
    enum CodingKeys: String, CodingKey {
        case configKey = "config_key"
        case configValue = "config_value"
        case description = "description"
        case updatedAt = "updated_at"
    }
}

public final class SupabaseApiVault: ObservableObject {
    public static let shared = SupabaseApiVault()
    
    @Published public var isSyncingVault: Bool = false
    @Published public var isVaultTableReady: Bool = false
    @Published public var isRelayRpcReady: Bool = false
    @Published public var lastSyncStatus: String = "尚未從 Supabase 同步雲端 API 設定"
    
    /// 快取自 Supabase 雲端的設定字典 (Key -> Value)
    @Published public private(set) var cloudConfigs: [String: String] = [:]
    
    private let localCacheKey = "campus_supabase_api_vault_cache_v1"
    
    private init() {
        if let cached = UserDefaults.standard.dictionary(forKey: localCacheKey) as? [String: String] {
            self.cloudConfigs = cached
        }
    }
    
    public func value(for key: String) -> String {
        return (cloudConfigs[key] ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
    }
    
    private func saveCache(_ dict: [String: String]) {
        self.cloudConfigs = dict
        UserDefaults.standard.set(dict, forKey: localCacheKey)
    }
    
    // MARK: - 1. 從 Supabase `app_api_configs` (及 `line_bot_settings` 備援列) 同步雲端 API 設定
    @MainActor
    public func fetchCloudApiConfigs() async {
        guard SupabaseConfig.shared.isConfigured else { return }
        isSyncingVault = true
        defer { isSyncingVault = false }
        
        let baseURL = SupabaseConfig.shared.projectURL.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
        let anonKey = SupabaseConfig.shared.anonPublicKey
        var updatedDict = cloudConfigs
        
        // A. 優先讀取 Supabase `public.app_api_configs` 表
        if let url = URL(string: "\(baseURL)/rest/v1/app_api_configs?select=*") {
            var req = URLRequest(url: url)
            req.setValue("Bearer \(anonKey)", forHTTPHeaderField: "Authorization")
            req.setValue(anonKey, forHTTPHeaderField: "apikey")
            
            if let (data, res) = try? await URLSession.shared.data(for: req),
               let http = res as? HTTPURLResponse,
               (200...299).contains(http.statusCode),
               let rows = try? JSONDecoder.robustDecoder.decode([CloudApiConfigRow].self, from: data) {
                self.isVaultTableReady = true
                for row in rows {
                    let k = row.configKey.trimmingCharacters(in: .whitespacesAndNewlines)
                    let v = row.configValue.trimmingCharacters(in: .whitespacesAndNewlines)
                    if !k.isEmpty && !v.isEmpty {
                        updatedDict[k] = v
                    }
                }
            }
        }
        
        // B. 同時從已存在的 `public.line_bot_settings` 讀取雲端設定與 `CLOUD_API_VAULT` 備援列（免額外建表亦可使用）
        if let fallbackURL = URL(string: "\(baseURL)/rest/v1/line_bot_settings?select=*&order=updated_at.desc") {
            var req = URLRequest(url: fallbackURL)
            req.setValue("Bearer \(anonKey)", forHTTPHeaderField: "Authorization")
            req.setValue(anonKey, forHTTPHeaderField: "apikey")
            
            if let (data, res) = try? await URLSession.shared.data(for: req),
               let http = res as? HTTPURLResponse,
               (200...299).contains(http.statusCode),
               let jsonArray = try? JSONSerialization.jsonObject(with: data) as? [[String: Any]] {
                for item in jsonArray {
                    let uid = (item["user_id"] as? String) ?? ""
                    let token = (item["channel_access_token"] as? String) ?? ""
                    if uid == "CLOUD_API_VAULT" {
                        // 解析備援列中攜帶的雲端 API 設定
                        if !token.isEmpty {
                            updatedDict["gemini_api_key"] = token
                        }
                        if let cid = item["device_id"] as? String, !cid.isEmpty {
                            updatedDict["line_channel_id"] = cid
                        }
                        if let csec = item["user_name"] as? String, !csec.isEmpty, csec != "CLOUD_API_VAULT" {
                            updatedDict["line_channel_secret"] = csec
                        }
                        if let defUid = item["share_code"] as? String, !defUid.isEmpty {
                            updatedDict["line_default_user_id"] = defUid
                        }
                    } else if !uid.hasPrefix("SHARE_") {
                        if (updatedDict["line_channel_access_token"] ?? "").isEmpty && !token.isEmpty {
                            updatedDict["line_channel_access_token"] = token
                        }
                        if (updatedDict["line_default_user_id"] ?? "").isEmpty && uid.hasPrefix("U") {
                            updatedDict["line_default_user_id"] = uid
                        }
                    }
                }
            }
        }
        
        saveCache(updatedDict)
        
        // 將從 Supabase 取得的雲端設定回填至執行期服務（App 程式碼本身不寫死金鑰）
        let geminiKey = value(for: "gemini_api_key")
        if !geminiKey.isEmpty && GeminiScheduleOCRService.shared.apiKey.isEmpty {
            GeminiScheduleOCRService.shared.apiKey = geminiKey
        }
        let lineCid = value(for: "line_channel_id")
        if !lineCid.isEmpty && LineBotService.shared.channelId.isEmpty {
            LineBotService.shared.channelId = lineCid
        }
        let lineSecret = value(for: "line_channel_secret")
        if !lineSecret.isEmpty && LineBotService.shared.channelSecret.isEmpty {
            LineBotService.shared.channelSecret = lineSecret
        }
        let lineToken = value(for: "line_channel_access_token")
        if !lineToken.isEmpty && LineBotService.shared.channelAccessToken.isEmpty {
            LineBotService.shared.channelAccessToken = lineToken
        }
        let lineUid = value(for: "line_default_user_id")
        if !lineUid.isEmpty && LineBotService.shared.userId.isEmpty {
            LineBotService.shared.userId = lineUid
        }
        
        lastSyncStatus = "已從 Supabase 同步 \(updatedDict.count) 項雲端 API 設定"
    }
    
    // MARK: - 2. 將 API 設定儲存至 Supabase 雲端 (`app_api_configs` 與備援列)
    @MainActor
    public func saveApiConfigsToSupabase(
        lineChannelId: String,
        lineChannelSecret: String,
        lineAccessToken: String,
        lineDefaultUserId: String,
        geminiApiKey: String
    ) async -> Bool {
        guard SupabaseConfig.shared.isConfigured else { return false }
        isSyncingVault = true
        defer { isSyncingVault = false }
        
        let baseURL = SupabaseConfig.shared.projectURL.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
        let anonKey = SupabaseConfig.shared.anonPublicKey
        let nowIso = ISO8601DateFormatter().string(from: Date())
        
        var updatedDict = cloudConfigs
        if !lineChannelId.isEmpty { updatedDict["line_channel_id"] = lineChannelId }
        if !lineChannelSecret.isEmpty { updatedDict["line_channel_secret"] = lineChannelSecret }
        if !lineAccessToken.isEmpty { updatedDict["line_channel_access_token"] = lineAccessToken }
        if !lineDefaultUserId.isEmpty { updatedDict["line_default_user_id"] = lineDefaultUserId }
        if !geminiApiKey.isEmpty { updatedDict["gemini_api_key"] = geminiApiKey }
        saveCache(updatedDict)
        
        var anySuccess = false
        
        // A. 寫入 `public.app_api_configs`
        if let url = URL(string: "\(baseURL)/rest/v1/app_api_configs?on_conflict=config_key") {
            var req = URLRequest(url: url)
            req.httpMethod = "POST"
            req.setValue("application/json", forHTTPHeaderField: "Content-Type")
            req.setValue("Bearer \(anonKey)", forHTTPHeaderField: "Authorization")
            req.setValue(anonKey, forHTTPHeaderField: "apikey")
            req.setValue("resolution=merge-duplicates", forHTTPHeaderField: "Prefer")
            
            let rows: [[String: Any]] = [
                ["config_key": "line_channel_id", "config_value": lineChannelId, "description": "LINE Messaging API Channel ID", "updated_at": nowIso],
                ["config_key": "line_channel_secret", "config_value": lineChannelSecret, "description": "LINE Messaging API Channel Secret", "updated_at": nowIso],
                ["config_key": "line_channel_access_token", "config_value": lineAccessToken, "description": "LINE Messaging API Access Token", "updated_at": nowIso],
                ["config_key": "line_default_user_id", "config_value": lineDefaultUserId, "description": "LINE Default Recipient User ID", "updated_at": nowIso],
                ["config_key": "gemini_api_key", "config_value": geminiApiKey, "description": "Google Gemini Multimodal OCR API Key", "updated_at": nowIso]
            ]
            req.httpBody = try? JSONSerialization.data(withJSONObject: rows)
            if let (_, res) = try? await URLSession.shared.data(for: req),
               let http = res as? HTTPURLResponse,
               (200...299).contains(http.statusCode) {
                self.isVaultTableReady = true
                anySuccess = true
            }
        }
        
        // B. 同步寫入 `public.line_bot_settings` 的 `CLOUD_API_VAULT` 紀錄（確保未執行新 SQL 前也能 100% 雲端保存）
        if let fallbackURL = URL(string: "\(baseURL)/rest/v1/line_bot_settings?on_conflict=user_id") {
            var req = URLRequest(url: fallbackURL)
            req.httpMethod = "POST"
            req.setValue("application/json", forHTTPHeaderField: "Content-Type")
            req.setValue("Bearer \(anonKey)", forHTTPHeaderField: "Authorization")
            req.setValue(anonKey, forHTTPHeaderField: "apikey")
            req.setValue("resolution=merge-duplicates", forHTTPHeaderField: "Prefer")
            
            let body: [String: Any] = [
                "user_id": "CLOUD_API_VAULT",
                "device_id": lineChannelId,
                "user_name": lineChannelSecret.isEmpty ? "CLOUD_API_VAULT" : lineChannelSecret,
                "share_code": lineDefaultUserId,
                "channel_access_token": geminiApiKey,
                "is_enabled": false,
                "push_hour": 0,
                "push_minute": 0,
                "courses_data": [],
                "todos_data": [],
                "last_sent_date": "VAULT",
                "updated_at": nowIso
            ]
            req.httpBody = try? JSONSerialization.data(withJSONObject: body)
            if let (_, res) = try? await URLSession.shared.data(for: req),
               let http = res as? HTTPURLResponse,
               (200...299).contains(http.statusCode) {
                anySuccess = true
            }
        }
        
        lastSyncStatus = anySuccess ? "已成功將 API 金鑰寫入 Supabase 雲端保險箱" : "寫入雲端失敗，請檢查網路或執行 SQL"
        return anySuccess
    }
    
    // MARK: - 3. App 只負責傳送 Payload -> 交由 Supabase RPC (`relay_line_message`) 在雲端讀取 Token 並發送至 LINE
    public func relayLineMessageViaSupabase(
        recipientId: String,
        isDirectPush: Bool,
        messages: [[String: Any]]
    ) async -> Bool {
        guard SupabaseConfig.shared.isConfigured else { return false }
        let baseURL = SupabaseConfig.shared.projectURL.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
        let anonKey = SupabaseConfig.shared.anonPublicKey
        guard let rpcURL = URL(string: "\(baseURL)/rest/v1/rpc/relay_line_message") else { return false }
        
        var req = URLRequest(url: rpcURL)
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.setValue("Bearer \(anonKey)", forHTTPHeaderField: "Authorization")
        req.setValue(anonKey, forHTTPHeaderField: "apikey")
        
        let rpcPayload: [String: Any] = [
            "p_recipient_id": recipientId,
            "p_is_direct_push": isDirectPush,
            "p_messages": messages
        ]
        guard let bodyData = try? JSONSerialization.data(withJSONObject: rpcPayload) else { return false }
        req.httpBody = bodyData
        
        if let (data, res) = try? await URLSession.shared.data(for: req),
           let http = res as? HTTPURLResponse,
           (200...299).contains(http.statusCode) {
            if let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
               let ok = json["ok"] as? Bool, ok == true {
                await MainActor.run { self.isRelayRpcReady = true }
                return true
            }
        }
        // Fallback: 嘗試透過 Supabase Edge Function `campus-api-gateway` 發送
        let firstText = (messages.first?["text"] as? String) ?? ""
        if !firstText.isEmpty,
           let gwJson = await callGatewayFunction(action: "line_push", payload: [
               "targetUserId": recipientId,
               "messageText": firstText
           ]),
           let status = gwJson["status"] as? String, status == "ok" {
            await MainActor.run { self.isRelayRpcReady = true }
            return true
        }
        return false
    }
    
    // MARK: - 4. 呼叫 Supabase Edge Function (`campus-api-gateway`) 統一執行雲端 API
    public func callGatewayFunction(action: String, payload: [String: Any]) async -> [String: Any]? {
        guard SupabaseConfig.shared.isConfigured else { return nil }
        let baseURL = SupabaseConfig.shared.projectURL.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
        let anonKey = SupabaseConfig.shared.anonPublicKey
        guard let fnURL = URL(string: "\(baseURL)/functions/v1/campus-api-gateway") else { return nil }
        
        var req = URLRequest(url: fnURL)
        req.httpMethod = "POST"
        req.timeoutInterval = 45
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.setValue("Bearer \(anonKey)", forHTTPHeaderField: "Authorization")
        req.setValue(anonKey, forHTTPHeaderField: "apikey")
        
        var body = payload
        body["action"] = action
        guard let bodyData = try? JSONSerialization.data(withJSONObject: body) else { return nil }
        req.httpBody = bodyData
        
        if let (data, res) = try? await URLSession.shared.data(for: req),
           let http = res as? HTTPURLResponse,
           (200...299).contains(http.statusCode),
           let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
            return json
        }
        return nil
    }
    
    // MARK: - 5. 透過 Supabase 雲端執行 Gemini AI 課表圖片辨識 (API Key 存在 Supabase 上)
    public func relayGeminiOCRViaSupabase(
        base64Image: String,
        prompt: String,
        models: [String]
    ) async -> (text: String, model: String)? {
        guard let json = await callGatewayFunction(action: "gemini_ocr", payload: [
            "base64Image": base64Image,
            "prompt": prompt,
            "models": models
        ]) else { return nil }
        
        if let status = json["status"] as? String, status == "ok",
           let text = json["text"] as? String, !text.isEmpty {
            let model = (json["model"] as? String) ?? "gemini-cloud"
            return (text, model)
        }
        return nil
    }
    
    // MARK: - 6. 建立「加好友自動綁定」15 分鐘待命工作階段 (`public.line_bind_sessions`)
    public func createLineBindSession(deviceId: String, shareCode: String, userName: String) async {
        guard SupabaseConfig.shared.isConfigured else { return }
        let baseURL = SupabaseConfig.shared.projectURL.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
        let anonKey = SupabaseConfig.shared.anonPublicKey
        guard let url = URL(string: "\(baseURL)/rest/v1/line_bind_sessions") else { return }
        
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.setValue("Bearer \(anonKey)", forHTTPHeaderField: "Authorization")
        req.setValue(anonKey, forHTTPHeaderField: "apikey")
        
        let expiresIso = ISO8601DateFormatter().string(from: Date().addingTimeInterval(15 * 60))
        let body: [String: Any] = [
            "device_id": deviceId,
            "share_code": shareCode.uppercased(),
            "user_name": userName.isEmpty ? "我的課表" : userName,
            "is_claimed": false,
            "expires_at": expiresIso
        ]
        req.httpBody = try? JSONSerialization.data(withJSONObject: body)
        _ = try? await URLSession.shared.data(for: req)
    }
    
    // MARK: - 7. 呼叫 Supabase RPC `claim_latest_line_follower` 自動認領剛加好友的真實 LINE ID (`U...`)
    public func claimLatestLineFollower(
        deviceId: String,
        shareCode: String,
        userName: String
    ) async -> (lineUserId: String, displayName: String, shareCode: String)? {
        guard SupabaseConfig.shared.isConfigured else { return nil }
        let baseURL = SupabaseConfig.shared.projectURL.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
        let anonKey = SupabaseConfig.shared.anonPublicKey
        guard let rpcURL = URL(string: "\(baseURL)/rest/v1/rpc/claim_latest_line_follower") else { return nil }
        
        var req = URLRequest(url: rpcURL)
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.setValue("Bearer \(anonKey)", forHTTPHeaderField: "Authorization")
        req.setValue(anonKey, forHTTPHeaderField: "apikey")
        
        let payload: [String: Any] = [
            "p_device_id": deviceId,
            "p_share_code": shareCode.uppercased(),
            "p_user_name": userName
        ]
        req.httpBody = try? JSONSerialization.data(withJSONObject: payload)
        
        if let (data, res) = try? await URLSession.shared.data(for: req),
           let http = res as? HTTPURLResponse,
           (200...299).contains(http.statusCode),
           let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
           let ok = json["ok"] as? Bool, ok == true,
           let lineUid = json["line_user_id"] as? String, lineUid.hasPrefix("U") {
            let dispName = (json["display_name"] as? String) ?? "LINE 好友"
            let matchedCode = (json["share_code"] as? String) ?? shareCode
            return (lineUid, dispName, matchedCode)
        }
        return nil
    }
    
    // MARK: - 8. 呼叫 Supabase RPC `bind_line_user_to_schedule` 將指定 LINE ID 綁定至課表分享碼
    public func bindLineUserToSchedule(
        lineUserId: String,
        displayName: String,
        shareCode: String,
        deviceId: String,
        pictureUrl: String = ""
    ) async -> Bool {
        guard SupabaseConfig.shared.isConfigured else { return false }
        let baseURL = SupabaseConfig.shared.projectURL.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
        let anonKey = SupabaseConfig.shared.anonPublicKey
        guard let rpcURL = URL(string: "\(baseURL)/rest/v1/rpc/bind_line_user_to_schedule") else { return false }
        
        var req = URLRequest(url: rpcURL)
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.setValue("Bearer \(anonKey)", forHTTPHeaderField: "Authorization")
        req.setValue(anonKey, forHTTPHeaderField: "apikey")
        
        let payload: [String: Any] = [
            "p_line_user_id": lineUserId,
            "p_display_name": displayName,
            "p_share_code": shareCode.uppercased(),
            "p_device_id": deviceId,
            "p_picture_url": pictureUrl
        ]
        req.httpBody = try? JSONSerialization.data(withJSONObject: payload)
        
        if let (data, res) = try? await URLSession.shared.data(for: req),
           let http = res as? HTTPURLResponse,
           (200...299).contains(http.statusCode),
           let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
           let ok = json["ok"] as? Bool {
            return ok
        }
        return false
    }
    
    // MARK: - 9. 讀取 Supabase `public.line_followers` 已加好友的 LINE 帳號列表
    public func fetchLineFollowersFromSupabase() async -> [LineFollowerRecord] {
        guard SupabaseConfig.shared.isConfigured else { return [] }
        let baseURL = SupabaseConfig.shared.projectURL.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
        let anonKey = SupabaseConfig.shared.anonPublicKey
        
        // 先嘗試觸發 Edge Function 同步最新 LINE Followers (若已部署)
        _ = await callGatewayFunction(action: "line_sync_followers", payload: [:])
        
        guard let url = URL(string: "\(baseURL)/rest/v1/line_followers?select=*&order=updated_at.desc&limit=50") else {
            return []
        }
        var req = URLRequest(url: url)
        req.httpMethod = "GET"
        req.setValue("Bearer \(anonKey)", forHTTPHeaderField: "Authorization")
        req.setValue(anonKey, forHTTPHeaderField: "apikey")
        
        if let (data, res) = try? await URLSession.shared.data(for: req),
           let http = res as? HTTPURLResponse,
           (200...299).contains(http.statusCode),
           let arr = try? JSONSerialization.jsonObject(with: data) as? [[String: Any]] {
            return arr.compactMap { dict in
                guard let uid = dict["line_user_id"] as? String, uid.hasPrefix("U") else { return nil }
                return LineFollowerRecord(
                    lineUserId: uid,
                    displayName: (dict["display_name"] as? String) ?? "LINE 好友",
                    pictureUrl: (dict["picture_url"] as? String) ?? "",
                    boundShareCode: (dict["bound_share_code"] as? String) ?? "",
                    boundDeviceId: (dict["bound_device_id"] as? String) ?? ""
                )
            }
        }
        return []
    }
}

/// 透過 LINE 加好友 Webhook 或 Followers API 自動探索到的真實 LINE 用戶紀錄
public struct LineFollowerRecord: Codable, Identifiable, Equatable {
    public var id: String { lineUserId }
    public var lineUserId: String
    public var displayName: String
    public var pictureUrl: String
    public var boundShareCode: String
    public var boundDeviceId: String
    
    public init(
        lineUserId: String,
        displayName: String,
        pictureUrl: String = "",
        boundShareCode: String = "",
        boundDeviceId: String = ""
    ) {
        self.lineUserId = lineUserId
        self.displayName = displayName
        self.pictureUrl = pictureUrl
        self.boundShareCode = boundShareCode
        self.boundDeviceId = boundDeviceId
    }
}

extension JSONDecoder {
    private static let isoFractionalFormatter: ISO8601DateFormatter = {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return f
    }()
    
    private static let isoStandardFormatter: ISO8601DateFormatter = {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime]
        return f
    }()
    
    private static let fallbackDateFormatters: [DateFormatter] = {
        let formats = [
            "yyyy-MM-dd'T'HH:mm:ss.SSSSSSZZZZZ",
            "yyyy-MM-dd'T'HH:mm:ss.SSSZZZZZ",
            "yyyy-MM-dd'T'HH:mm:ssZZZZZ",
            "yyyy-MM-dd'T'HH:mm:ss",
            "yyyy-MM-dd HH:mm:ss",
            "yyyy-MM-dd"
        ]
        return formats.map { fmt in
            let df = DateFormatter()
            df.locale = Locale(identifier: "en_US_POSIX")
            df.dateFormat = fmt
            return df
        }
    }()
    
    public static var robustDecoder: JSONDecoder {
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .custom { decoder in
            let container = try decoder.singleValueContainer()
            if let dateStr = try? container.decode(String.self) {
                if let date = Self.isoFractionalFormatter.date(from: dateStr) {
                    return date
                }
                if let date = Self.isoStandardFormatter.date(from: dateStr) {
                    return date
                }
                for df in Self.fallbackDateFormatters {
                    if let date = df.date(from: dateStr) {
                        return date
                    }
                }
                return Date()
            }
            
            if let timestamp = try? container.decode(Double.self) {
                if timestamp > 1_000_000_000_000 {
                    return Date(timeIntervalSince1970: timestamp / 1000.0)
                }
                return Date(timeIntervalSince1970: timestamp)
            }
            
            return Date()
        }
        return decoder
    }
}

extension JSONEncoder {
    public static var robustEncoder: JSONEncoder {
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        return encoder
    }
}
