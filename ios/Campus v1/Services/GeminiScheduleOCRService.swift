//
//  GeminiScheduleOCRService.swift
//  Campus v1
//

import Foundation
import SwiftUI
import UIKit
import Vision
import Combine

// MARK: - OCR 擷取資料模型

public struct OCRExtractedPeriod: Identifiable, Codable, Equatable {
    public var id: Int // 1~14, 100 為中午
    public var name: String // "第 1 節", "中午"
    public var shortName: String // "1", "2", "中午"
    public var startTime: String // "08:10"
    public var endTime: String // "09:00"
    public var isSelected: Bool = true
    public var isModifiedFromSystem: Bool = false
    public var originalSystemTime: String? = nil
    
    enum CodingKeys: String, CodingKey {
        case id
        case name
        case shortName = "short_name"
        case startTime = "start_time"
        case endTime = "end_time"
    }
    
    public init(
        id: Int,
        name: String,
        shortName: String? = nil,
        startTime: String,
        endTime: String,
        isSelected: Bool = true,
        isModifiedFromSystem: Bool = false,
        originalSystemTime: String? = nil
    ) {
        self.id = id
        self.name = name
        self.shortName = shortName ?? (id == 100 ? "中午" : "\(id)")
        self.startTime = startTime
        self.endTime = endTime
        self.isSelected = isSelected
        self.isModifiedFromSystem = isModifiedFromSystem
        self.originalSystemTime = originalSystemTime
    }
    
    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        self.id = (try? container.decode(Int.self, forKey: .id)) ?? 1
        self.name = (try? container.decode(String.self, forKey: .name)) ?? "第 \(id) 節"
        self.shortName = (try? container.decodeIfPresent(String.self, forKey: .shortName)) ?? (id == 100 ? "中午" : "\(id)")
        self.startTime = (try? container.decode(String.self, forKey: .startTime)) ?? "08:10"
        self.endTime = (try? container.decode(String.self, forKey: .endTime)) ?? "09:00"
    }
}

public struct OCRExtractedCourse: Identifiable, Codable, Equatable {
    public var id: UUID = UUID()
    public var name: String
    public var code: String
    public var classroom: String
    public var instructor: String
    public var dayOfWeek: Int // 1(週一) ... 7(週日)
    public var periodIds: [Int] // 例如 [2, 3, 4]
    public var startTime: String // "09:10"
    public var endTime: String // "12:00"
    public var rawStartTime: String = ""
    public var rawEndTime: String = ""
    public var colorHex: String = "#4F46E5"
    public var isSelected: Bool = true
    public var wasTimeAutoCorrected: Bool = false
    public var correctionSummary: String? = nil
    
    enum CodingKeys: String, CodingKey {
        case name
        case code
        case classroom
        case instructor
        case dayOfWeek = "day_of_week"
        case periodIds = "period_ids"
        case startTime = "start_time"
        case endTime = "end_time"
    }
    
    public init(
        id: UUID = UUID(),
        name: String,
        code: String = "",
        classroom: String = "",
        instructor: String = "",
        dayOfWeek: Int = 1,
        periodIds: [Int] = [],
        startTime: String = "08:10",
        endTime: String = "09:00",
        rawStartTime: String = "",
        rawEndTime: String = "",
        colorHex: String = "#4F46E5",
        isSelected: Bool = true,
        wasTimeAutoCorrected: Bool = false,
        correctionSummary: String? = nil
    ) {
        self.id = id
        self.name = name
        self.code = code
        self.classroom = classroom
        self.instructor = instructor
        self.dayOfWeek = max(1, min(7, dayOfWeek))
        self.periodIds = periodIds
        self.startTime = startTime
        self.endTime = endTime
        self.rawStartTime = rawStartTime.isEmpty ? startTime : rawStartTime
        self.rawEndTime = rawEndTime.isEmpty ? endTime : rawEndTime
        self.colorHex = colorHex
        self.isSelected = isSelected
        self.wasTimeAutoCorrected = wasTimeAutoCorrected
        self.correctionSummary = correctionSummary
    }
    
    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        self.name = (try? container.decode(String.self, forKey: .name)) ?? ""
        self.code = (try? container.decodeIfPresent(String.self, forKey: .code)) ?? ""
        self.classroom = (try? container.decodeIfPresent(String.self, forKey: .classroom)) ?? ""
        self.instructor = (try? container.decodeIfPresent(String.self, forKey: .instructor)) ?? ""
        self.dayOfWeek = max(1, min(7, (try? container.decode(Int.self, forKey: .dayOfWeek)) ?? 1))
        self.periodIds = (try? container.decodeIfPresent([Int].self, forKey: .periodIds)) ?? []
        let st = (try? container.decodeIfPresent(String.self, forKey: .startTime)) ?? ""
        let et = (try? container.decodeIfPresent(String.self, forKey: .endTime)) ?? ""
        self.startTime = st
        self.endTime = et
        self.rawStartTime = st
        self.rawEndTime = et
    }
    
    public var weekday: WeekDay {
        WeekDay(rawValue: dayOfWeek) ?? .monday
    }
    
    public var periodBadgeText: String {
        guard !periodIds.isEmpty else { return "自訂時段" }
        let sorted = periodIds.sorted()
        let labels = sorted.map { $0 == 100 ? "中午" : "\($0)" }
        if sorted.count >= 2 && sorted.last! - sorted.first! == sorted.count - 1 && !sorted.contains(100) {
            return "第 \(sorted.first!)-\(sorted.last!) 節"
        }
        return "第 \(labels.joined(separator: ",")) 節"
    }
}

public struct GeminiOCRResponsePayload: Codable {
    public var periods: [OCRExtractedPeriod]?
    public var courses: [OCRExtractedCourse]?
}

public struct OCRAnalysisResult {
    public var periods: [OCRExtractedPeriod]
    public var courses: [OCRExtractedCourse]
    public var engineUsed: String
    public var rawOCRTextCount: Int
}

// MARK: - Gemini API 課表 OCR 智慧辨識服務

@MainActor
public final class GeminiScheduleOCRService: ObservableObject {
    public static let shared = GeminiScheduleOCRService()
    
    private let apiKeyStorageKey = "campus_gemini_api_key"
    private let modelStorageKey = "campus_gemini_model"
    
    /// 從 Supabase 雲端 API 保險箱動態取得 Gemini API Key（App 端不寫死金鑰）
    public static var defaultApiKey: String {
        SupabaseApiVault.shared.value(for: "gemini_api_key")
    }
    
    public static let availableModels: [(id: String, title: String)] = [
        ("gemini-2.5-flash", "Gemini 2.5 Flash (推薦・極速高精準)"),
        ("gemini-2.0-flash", "Gemini 2.0 Flash (穩定高速)"),
        ("gemini-2.5-pro", "Gemini 2.5 Pro (複雜表格深度推論)")
    ]
    
    @Published public var apiKey: String {
        didSet {
            UserDefaults.standard.set(apiKey.trimmingCharacters(in: .whitespacesAndNewlines), forKey: apiKeyStorageKey)
        }
    }
    
    @Published public var selectedModel: String {
        didSet {
            UserDefaults.standard.set(selectedModel, forKey: modelStorageKey)
        }
    }
    
    @Published public var isAnalyzing: Bool = false
    @Published public var progressMessage: String = ""
    @Published public var errorMessage: String? = nil
    
    public var hasApiKey: Bool {
        !apiKey.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }
    
    private init() {
        let savedKey = (UserDefaults.standard.string(forKey: apiKeyStorageKey) ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        if savedKey.isEmpty {
            let cloudKey = Self.defaultApiKey
            self.apiKey = cloudKey
        } else {
            self.apiKey = savedKey
        }
        self.selectedModel = UserDefaults.standard.string(forKey: modelStorageKey) ?? "gemini-2.5-flash"
    }
    
    // MARK: - 主流程：結合 Apple Vision 空間座標 OCR + Supabase 雲端 Gemini 多模態視覺模型
    
    public func analyzeScheduleImage(_ image: UIImage) async throws -> OCRAnalysisResult {
        isAnalyzing = true
        errorMessage = nil
        progressMessage = "正在透過 iOS Vision 擷取課表文字與格線座標..."
        defer {
            isAnalyzing = false
            progressMessage = ""
        }
        
        // 1. 先執行 Apple Vision 原生高精度 OCR，取得每個文字區塊的 (X, Y) 座標與 2D 格子預聚類結果
        let visionBlocks = await Self.extractVisionTextBlocks(from: image)
        let localPayload = Self.parseScheduleFromVisionBlocksLocally(visionBlocks)
        let spatialTextDump = Self.formatVisionBlocksForPrompt(
            visionBlocks,
            preClusteredCourses: localPayload.courses
        )
        
        var trimmedKey = apiKey.trimmingCharacters(in: .whitespacesAndNewlines)
        if trimmedKey.isEmpty {
            await SupabaseApiVault.shared.fetchCloudApiConfigs()
            trimmedKey = SupabaseApiVault.shared.value(for: "gemini_api_key")
            if !trimmedKey.isEmpty {
                self.apiKey = trimmedKey
            }
        }
        
        // 2. 優先呼叫 Supabase 雲端 API 閘道 (`campus-api-gateway` -> `gemini_ocr`) 或雲端保險箱金鑰解析課表結構與節次時間
        progressMessage = "正在透過 Supabase 雲端 Gemini AI 解析課表結構與節次時間..."
        do {
            let rawPayload = try await callGeminiMultimodalAPI(
                image: image,
                spatialOCRText: spatialTextDump,
                apiKey: trimmedKey
            )
            progressMessage = "正在自動校正節次作息時間與合併同格／連堂課程..."
            let processed = postProcessAndCalibrate(
                rawPeriods: (rawPayload.periods?.isEmpty == false) ? (rawPayload.periods ?? []) : localPayload.periods,
                rawCourses: rawPayload.courses ?? []
            )
            if !processed.courses.isEmpty || !processed.periods.isEmpty {
                errorMessage = nil
                return OCRAnalysisResult(
                    periods: processed.periods,
                    courses: processed.courses,
                    engineUsed: "Supabase 雲端 Gemini AI (\(selectedModel)) + iOS Vision",
                    rawOCRTextCount: visionBlocks.count
                )
            }
        } catch {
            // 雲端若因 API Key 權限 (403) 或網路限制無法回應，無縫切換至本機 2D 空間幾何 AI 引擎，不拋出 403 阻斷使用者
        }
        
        // 3. 使用升級版 iOS Vision 2D 空間幾何深度解析引擎（支援全格式課表與無縫備援）
        progressMessage = "正在透過 AI 2D 空間幾何引擎解析課表與自動校正時間..."
        let processed = postProcessAndCalibrate(
            rawPeriods: localPayload.periods,
            rawCourses: localPayload.courses
        )
        errorMessage = nil
        if processed.courses.isEmpty && processed.periods.isEmpty {
            throw DataManager.CampusError("未能從圖片中偵測到課表文字，請確認圖片清晰且包含課表內容後再試一次 🐾")
        }
        return OCRAnalysisResult(
            periods: processed.periods,
            courses: processed.courses,
            engineUsed: "可樂 AI 視覺幾何雙引擎",
            rawOCRTextCount: visionBlocks.count
        )
    }
    
    // MARK: - 呼叫 Gemini REST API (支援 AI Studio 與 Vertex AI Express 雙端點、camelCase inlineData 與 403 自動修復)
    
    private func callGeminiMultimodalAPI(
        image: UIImage,
        spatialOCRText: String,
        apiKey: String
    ) async throws -> GeminiOCRResponsePayload {
        guard let resizedImage = Self.resizeImageIfNeeded(image, maxDimension: 1400),
              let jpegData = resizedImage.jpegData(compressionQuality: 0.82) else {
            throw DataManager.CampusError("課表圖片壓縮處理失敗，請換一張圖片重試。")
        }
        let base64Image = jpegData.base64EncodedString()
        
        // 整理目前系統預設節次供 Gemini 對照
        let currentPeriodsDesc = PeriodScheduleManager.shared.periods.map { p in
            "id=\(p.id) (\(p.name)): \(p.startTime)~\(p.endTime)"
        }.joined(separator: ", ")
        
        let systemPrompt = """
        你是一位專精於台灣與華語區大學課表 OCR 與時間校正的 AI 助教。
        請根據使用者上傳的「課表圖片」以及下方提供的「iOS Vision OCR 座標文字與同格預聚類資訊」，精準擷取出：
        1. `periods`（課表上的每節課作息時間表）
        2. `courses`（課表上的所有課程內容）

        【極重要解析規則】：
        1. **節次作息時間 (`periods`)**：
           - 仔細查看圖片左側或標題列是否有印出每節課的編號與時間（例如：「第1節 08:10~09:00」、「1 08:00-08:50」、「中午 12:10-13:00」、「第5節 13:10-14:00」）。
           - `id` 請使用整數：第 1 節為 `1`、第 2 節為 `2` ... 第 14 節為 `14`；若是「中午 / 午休 / N」請設 `id = 100`。
           - `start_time` 與 `end_time` 必須為 24 小時制 `"HH:mm"` 格式（例如 `"08:10"`, `"13:20"`）。
           - 如果圖片中完全沒有標示某節課的具體時間，可參考目前系統預設節次：[\(currentPeriodsDesc)]。
        2. **同一個格子內的多行文字整合（極重要！嚴禁拆成多堂課）**：
           - 許多大學課表的**同一個格子（同一門課）**內會分多行同時印出：
             (a) **英文課名**（例如 `"Operating Systems"`, `"Introduction to Computer Science"`）
             (b) **中文課名**（例如 `"作業系統"`, `"計算機概論"`）
             (c) **上課地點／教室**（例如 `"資電 402"`, `"工三館 101"`, `"EC405"`, `"雙溪 R0204"`）
             (d) 授課教師或選課代號
           - **絕對不可**把同一格內的「英文課名」、「中文課名」、「上課地點」誤認成兩堂或三堂不同的課！它們是**同一門課**！
           - 若同一格內同時有「英文課名」與「中文課名」，`name` 請優先填寫**中文課名**（例如 `"作業系統"`），不要將英文課名另建一筆課程；若該格只有英文課名才填英文課名。
           - 格內的上課地點請填入該課程的 `classroom` 欄位，**絕對不可**把教室或地點當成另一堂課的 `name`！
        3. **課程內容與連堂合併 (`courses`)**：
           - 仔細判斷表格的「星期欄（Column）」順序！請根據欄位頂端的星期標題（「一/週一/星期一/Mon」對應 `day_of_week = 1`，...，「五/週五/Fri」對應 `5`，「六」對應 `6`，「日」對應 `7`）正確設定 `day_of_week` (1~7)。
           - 若同一天（同一個 `day_of_week`）的同一門課連續跨越多節（例如第 2、3、4 節都是同一門課，或一個跨多節的大格子內印有英文課名、中文課名、上課地點），請**合併為同一筆課程**，`period_ids` 填 `[2, 3, 4]`，`start_time` 填第 2 節的開始時間，`end_time` 填第 4 節的結束時間！
           - 從格子文字中分離出：
             - `name`：純課程名稱（優先取中文課名，不含教室、教師、節次代號，去除多餘換行）
             - `code`：課程代碼或選課代號（若無則填 `""`）
             - `classroom`：上課教室或館別（例如 `"工三館 101"`, `"資電 402"`, `"EC405"`，若無則填 `""`）
             - `instructor`：授課教師姓名（例如 `"李教授"`, `"王大明"`，若無則填 `""`）
             - `period_ids`：該課程涵蓋的節次整數陣列，例如 `[2, 3, 4]`。
             - `start_time` / `end_time`：該課程連堂的起始與結束時間 `"HH:mm"`。

        請只回傳符合以下結構的純 JSON 物件（不要包含 Markdown ```json 標籤）：
        {
          "periods": [
            { "id": 1, "name": "第 1 節", "short_name": "1", "start_time": "08:10", "end_time": "09:00" }
          ],
          "courses": [
            {
              "name": "計算機概論",
              "code": "CS101",
              "classroom": "工三館 101",
              "instructor": "李教授",
              "day_of_week": 1,
              "period_ids": [2, 3, 4],
              "start_time": "09:10",
              "end_time": "12:00"
            }
          ]
        }

        【iOS Vision OCR 座標文字與同格預聚類輔助資訊 (x: 0左~1右, y: 0上~1下)】：
        \(spatialOCRText)
        """
        
        // 建立候選模型清單（優先使用使用者選擇的模型，若失敗則自動 Fallback）
        var candidateModels = [selectedModel, "gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"]
        var seen = Set<String>()
        candidateModels = candidateModels.filter { seen.insert($0).inserted }
        
        // 優先步驟 A：透過 Supabase Edge Function (`campus-api-gateway`) 執行 Gemini OCR（API Key 完全保存在 Supabase 上）
        if let cloudRelay = await SupabaseApiVault.shared.relayGeminiOCRViaSupabase(
            base64Image: base64Image,
            prompt: systemPrompt,
            models: candidateModels
        ), let payload = try? Self.decodeGeminiRawText(cloudRelay.text) {
            return payload
        }
        
        // 備援步驟 B：若尚未部署 Edge Function，使用從 Supabase `app_api_configs` 同步下來的雲端金鑰直接呼叫
        guard !apiKey.isEmpty else {
            throw DataManager.CampusError("Supabase 尚未設定 gemini_api_key")
        }
        
        // 注意：Vertex AI (aiplatform.googleapis.com) 嚴格要求 camelCase "inlineData" 與 "mimeType"
        let multimodalParts: [[String: Any]] = [
            [
                "inlineData": [
                    "mimeType": "image/jpeg",
                    "data": base64Image
                ]
            ],
            [
                "text": systemPrompt
            ]
        ]
        
        let betaBody: [String: Any] = [
            "contents": [
                [
                    "role": "user",
                    "parts": multimodalParts
                ]
            ],
            "generationConfig": [
                "temperature": 0.1,
                "responseMimeType": "application/json"
            ]
        ]
        
        // v1 正式版端點有時不支援 responseMimeType 欄位，提供相容結構避免 HTTP 400
        let v1CompatibleBody: [String: Any] = [
            "contents": [
                [
                    "role": "user",
                    "parts": multimodalParts
                ]
            ],
            "generationConfig": [
                "temperature": 0.1
            ]
        ]
        
        let betaBodyData = try JSONSerialization.data(withJSONObject: betaBody)
        let v1BodyData = try JSONSerialization.data(withJSONObject: v1CompatibleBody)
        
        var lastError: Error? = nil
        let isVertexKey = apiKey.hasPrefix("AQ.")
        let bundleId = Bundle.main.bundleIdentifier ?? "Router.Campus-v1"
        
        for modelName in candidateModels {
            let endpointConfigs: [(url: String, isBeta: Bool)] = isVertexKey ? [
                ("https://aiplatform.googleapis.com/v1beta1/publishers/google/models/\(modelName):generateContent?key=\(apiKey)", true),
                ("https://aiplatform.googleapis.com/v1/publishers/google/models/\(modelName):generateContent?key=\(apiKey)", false),
                ("https://generativelanguage.googleapis.com/v1beta/models/\(modelName):generateContent?key=\(apiKey)", true)
            ] : [
                ("https://generativelanguage.googleapis.com/v1beta/models/\(modelName):generateContent?key=\(apiKey)", true),
                ("https://generativelanguage.googleapis.com/v1/models/\(modelName):generateContent?key=\(apiKey)", false),
                ("https://aiplatform.googleapis.com/v1beta1/publishers/google/models/\(modelName):generateContent?key=\(apiKey)", true),
                ("https://aiplatform.googleapis.com/v1/publishers/google/models/\(modelName):generateContent?key=\(apiKey)", false)
            ]
            
            for config in endpointConfigs {
                guard let url = URL(string: config.url) else { continue }
                
                var request = URLRequest(url: url)
                request.httpMethod = "POST"
                request.setValue("application/json", forHTTPHeaderField: "Content-Type")
                request.setValue(apiKey, forHTTPHeaderField: "x-goog-api-key")
                request.timeoutInterval = 22
                request.httpBody = config.isBeta ? betaBodyData : v1BodyData
                
                do {
                    let (data, response) = try await URLSession.shared.data(for: request)
                    guard let httpRes = response as? HTTPURLResponse else { continue }
                    
                    if (200...299).contains(httpRes.statusCode) {
                        if let payload = try? Self.decodeGeminiResponse(from: data) {
                            return payload
                        }
                    } else if httpRes.statusCode == 403 {
                        // 若金鑰在 Google Cloud 設定了 iOS Bundle ID 限制，補上 X-Ios-Bundle-Identifier Header 自動重試
                        var retryReq = request
                        retryReq.setValue(bundleId, forHTTPHeaderField: "X-Ios-Bundle-Identifier")
                        if let (retryData, retryRes) = try? await URLSession.shared.data(for: retryReq),
                           let retryHttp = retryRes as? HTTPURLResponse,
                           (200...299).contains(retryHttp.statusCode),
                           let payload = try? Self.decodeGeminiResponse(from: retryData) {
                            return payload
                        }
                        lastError = DataManager.CampusError("Gemini API 權限受限 (403)")
                    } else if httpRes.statusCode == 400 && config.isBeta {
                        // 若 beta 端點對 responseMimeType 回傳 400，改用 v1BodyData 重試一次
                        var retryReq = request
                        retryReq.httpBody = v1BodyData
                        if let (retryData, retryRes) = try? await URLSession.shared.data(for: retryReq),
                           let retryHttp = retryRes as? HTTPURLResponse,
                           (200...299).contains(retryHttp.statusCode),
                           let payload = try? Self.decodeGeminiResponse(from: retryData) {
                            return payload
                        }
                    }
                } catch {
                    lastError = error
                }
            }
        }
        
        throw lastError ?? DataManager.CampusError("無法連線至雲端 Gemini API")
    }
    
    private static func decodeGeminiResponse(from data: Data) throws -> GeminiOCRResponsePayload {
        guard let root = try JSONSerialization.jsonObject(with: data) as? [String: Any],
              let candidates = root["candidates"] as? [[String: Any]],
              let firstCandidate = candidates.first,
              let content = firstCandidate["content"] as? [String: Any],
              let parts = content["parts"] as? [[String: Any]],
              let rawText = parts.compactMap({ $0["text"] as? String }).first else {
            throw DataManager.CampusError("Gemini API 回傳格式無法解析")
        }
        return try decodeGeminiRawText(rawText)
    }
    
    private static func decodeGeminiRawText(_ rawText: String) throws -> GeminiOCRResponsePayload {
        // 清理可能殘留的 ```json 標記或前後說明文字，擷取最外層 { ... }
        var cleanedJSON = rawText
            .replacingOccurrences(of: "```json", with: "")
            .replacingOccurrences(of: "```", with: "")
            .trimmingCharacters(in: .whitespacesAndNewlines)
        
        if let firstBrace = cleanedJSON.firstIndex(of: "{"),
           let lastBrace = cleanedJSON.lastIndex(of: "}"),
           firstBrace <= lastBrace {
            cleanedJSON = String(cleanedJSON[firstBrace...lastBrace])
        }
        
        guard let jsonData = cleanedJSON.data(using: .utf8) else {
            throw DataManager.CampusError("JSON 編碼轉換失敗")
        }
        
        return try JSONDecoder().decode(GeminiOCRResponsePayload.self, from: jsonData)
    }
    
    // MARK: - 後處理：自動修正作息時間、連堂合併、以及課程時間對齊 (Auto Time Calibration)
    
    public func postProcessAndCalibrate(
        rawPeriods: [OCRExtractedPeriod],
        rawCourses: [OCRExtractedCourse]
    ) -> (periods: [OCRExtractedPeriod], courses: [OCRExtractedCourse]) {
        let systemPeriods = PeriodScheduleManager.shared.periods
        let systemMap = Dictionary(uniqueKeysWithValues: systemPeriods.map { ($0.id, $0) })
        
        // 1. 整理並驗證擷取出的節次時間表
        var calibratedPeriods: [OCRExtractedPeriod] = []
        var effectivePeriodMap = systemMap
        
        for var p in rawPeriods {
            guard let normStart = PeriodScheduleManager.normalizeTimeString(p.startTime),
                  let normEnd = PeriodScheduleManager.normalizeTimeString(p.endTime),
                  let sMin = PeriodScheduleManager.minutesFromMidnight(normStart),
                  let eMin = PeriodScheduleManager.minutesFromMidnight(normEnd),
                  eMin > sMin else { continue }
            
            p.startTime = normStart
            p.endTime = normEnd
            if p.name.trimmingCharacters(in: .whitespaces).isEmpty {
                p.name = p.id == 100 ? "中午" : "第 \(p.id) 節"
            }
            if p.shortName.trimmingCharacters(in: .whitespaces).isEmpty {
                p.shortName = p.id == 100 ? "中午" : "\(p.id)"
            }
            
            if let sys = systemMap[p.id] {
                if sys.startTime != normStart || sys.endTime != normEnd {
                    p.isModifiedFromSystem = true
                    p.originalSystemTime = "\(sys.startTime) ~ \(sys.endTime)"
                }
            } else {
                p.isModifiedFromSystem = true
                p.originalSystemTime = "新增節次"
            }
            
            calibratedPeriods.append(p)
            effectivePeriodMap[p.id] = ClassPeriod(
                id: p.id,
                name: p.name,
                shortName: p.shortName,
                startTime: normStart,
                endTime: normEnd
            )
        }
        
        calibratedPeriods.sort { $0.startTime < $1.startTime }
        let effectivePeriods = Array(effectivePeriodMap.values).sorted { $0.startTime < $1.startTime }
        
        // 2. 整理課程、正規化時間並根據有效節次表自動對齊時間
        var intermediateCourses: [OCRExtractedCourse] = []
        
        for var course in rawCourses {
            course.name = course.name
                .replacingOccurrences(of: "\n", with: " ")
                .trimmingCharacters(in: .whitespacesAndNewlines)
            guard !course.name.isEmpty else { continue }
            
            course.code = course.code.trimmingCharacters(in: .whitespacesAndNewlines)
            course.classroom = course.classroom
                .replacingOccurrences(of: "\n", with: " ")
                .trimmingCharacters(in: .whitespacesAndNewlines)
            course.instructor = course.instructor
                .replacingOccurrences(of: "\n", with: " ")
                .trimmingCharacters(in: .whitespacesAndNewlines)
            
            let origStart = PeriodScheduleManager.normalizeTimeString(course.startTime) ?? course.startTime
            let origEnd = PeriodScheduleManager.normalizeTimeString(course.endTime) ?? course.endTime
            course.rawStartTime = origStart
            course.rawEndTime = origEnd
            
            // A. 若有明確節次 ID，直接依據節次表設定精準的起訖時間
            if !course.periodIds.isEmpty {
                let matched = effectivePeriods.filter { course.periodIds.contains($0.id) }.sorted { $0.startTime < $1.startTime }
                if let first = matched.first, let last = matched.last {
                    let newStart = first.startTime
                    let newEnd = last.endTime
                    course.periodIds = matched.map { $0.id }
                    if newStart != origStart || newEnd != origEnd {
                        course.wasTimeAutoCorrected = true
                        if !origStart.isEmpty && !origEnd.isEmpty && (origStart != newStart || origEnd != newEnd) {
                            course.correctionSummary = "已依\(course.periodBadgeText)自動修正時間（原 \(origStart)~\(origEnd) ➜ \(newStart)~\(newEnd)）"
                        } else {
                            course.correctionSummary = "已依\(course.periodBadgeText)自動配置時間（\(newStart) ~ \(newEnd)）"
                        }
                    }
                    course.startTime = newStart
                    course.endTime = newEnd
                }
            } else {
                // B. 若無節次 ID，透過時間重疊反推節次並對齊標準節次時間
                let matched = PeriodScheduleManager.shared.matchedPeriods(
                    startTime: origStart,
                    endTime: origEnd,
                    in: effectivePeriods
                )
                if let first = matched.first, let last = matched.last {
                    course.periodIds = matched.map { $0.id }
                    let newStart = first.startTime
                    let newEnd = last.endTime
                    if newStart != origStart || newEnd != origEnd {
                        course.wasTimeAutoCorrected = true
                        course.correctionSummary = "已自動對齊至\(course.periodBadgeText)（原 \(origStart)~\(origEnd) ➜ \(newStart)~\(newEnd)）"
                    }
                    course.startTime = newStart
                    course.endTime = newEnd
                } else {
                    course.startTime = origStart.isEmpty ? "08:10" : origStart
                    course.endTime = origEnd.isEmpty ? "09:00" : origEnd
                }
            }
            
            intermediateCourses.append(course)
        }
        
        // 3. 自動合併同一格內被誤拆的「英文課名 + 中文課名 + 上課地點／教師」（防止單一格子三行被誤認為三堂課）
        let cellConsolidatedCourses = Self.consolidateSameCellSplitCourses(
            intermediateCourses,
            effectivePeriods: effectivePeriods
        )
        
        // 4. 自動合併同一天、同名且相鄰節次的課程（防止 OCR 將連堂課拆成多筆單節課）
        let mergedCourses = Self.mergeConsecutiveCourses(cellConsolidatedCourses, effectivePeriods: effectivePeriods)
        
        // 5. 為不同課程分配固定且美觀的代表色（同名課程共用同色）
        var colorAssignment: [String: String] = [:]
        var paletteIdx = 0
        let finalCourses: [OCRExtractedCourse] = mergedCourses.map { c in
            var copy = c
            if let assigned = colorAssignment[c.name] {
                copy.colorHex = assigned
            } else {
                let color = CampusColors.palette[paletteIdx % CampusColors.palette.count]
                colorAssignment[c.name] = color
                paletteIdx += 1
                copy.colorHex = color
            }
            return copy
        }.sorted {
            if $0.dayOfWeek != $1.dayOfWeek { return $0.dayOfWeek < $1.dayOfWeek }
            return $0.startTime < $1.startTime
        }
        
        return (calibratedPeriods, finalCourses)
    }
    
    // MARK: - 格子內單行語意分類器（精準區分：英文課名、中文課名、上課地點／教室、授課教師、課程代碼）
    
    public enum CellLineRole: Sendable, Equatable {
        case englishCourseName
        case chineseCourseName
        case classroom
        case instructor
        case courseCode
        case noise
    }
    
    /// 判斷課表單一格內的某一行文字屬於「英文課名」、「中文課名」、「上課地點」、「授課教師」或「課程代碼」
    nonisolated public static func classifyCellLine(_ rawLine: String) -> CellLineRole {
        let trimmed = rawLine
            .trimmingCharacters(in: .whitespacesAndNewlines)
            .trimmingCharacters(in: CharacterSet(charactersIn: "[]【】()（）<>《》「」"))
            .trimmingCharacters(in: .whitespacesAndNewlines)
        
        guard trimmed.count >= 2 else { return .noise }
        
        // 1. 排除無意義的學分／必選修標籤
        let noiseExact: Set<String> = [
            "必修", "選修", "必", "選", "通識", "半學年", "全學年", "學年", "學期",
            "1學分", "2學分", "3學分", "4學分", "0學分", "1.0", "2.0", "3.0", "4.0"
        ]
        if noiseExact.contains(trimmed) { return .noise }
        
        // 2. 檢查是否為授課教師
        let instructorTokens = ["教授", "老師", "教練", "講師", "助教", "博士", "Prof.", "Prof ", "Dr.", "Dr ", "Teacher"]
        if instructorTokens.contains(where: { trimmed.contains($0) }) && trimmed.count <= 16 {
            return .instructor
        }
        
        // 3. 檢查是否為上課地點／教室 (Classroom / Location)
        if isClassroomText(trimmed) {
            return .classroom
        }
        
        // 4. 檢查是否為純選課代號／課程代碼 (例如 "1121-0452", "CS1010", "A1234")
        let codeRegex = try? NSRegularExpression(pattern: #"^(?:\d{4,8}|\d{2,4}[\-\_]\d{2,5}|[A-Za-z]{2,4}\d{4,6})$"#)
        if let regex = codeRegex,
           regex.firstMatch(in: trimmed, range: NSRange(trimmed.startIndex..., in: trimmed)) != nil {
            return .courseCode
        }
        
        // 5. 統計中文字元 (CJK) 與英文字母數量
        let cjkCount = trimmed.unicodeScalars.filter { (0x4E00...0x9FFF).contains($0.value) || (0x3400...0x4DBF).contains($0.value) }.count
        let latinCount = trimmed.unicodeScalars.filter {
            (0x0041...0x005A).contains($0.value) || (0x0061...0x007A).contains($0.value)
        }.count
        
        // 若不含中文字且具有至少 3 個英文字母（且非教室代號），即為「英文課名」
        if cjkCount == 0 && latinCount >= 3 {
            return .englishCourseName
        }
        
        // 若含有中文字元，即為「中文課名」
        if cjkCount >= 1 {
            return .chineseCourseName
        }
        
        return latinCount >= 2 ? .englishCourseName : .noise
    }
    
    /// 精準識別台灣各大專院校常見的上課地點與教室格式（避免將「物理實驗」、「室內設計」、「大一體育」誤判為教室）
    nonisolated public static func isClassroomText(_ text: String) -> Bool {
        let s = text
            .trimmingCharacters(in: .whitespacesAndNewlines)
            .trimmingCharacters(in: CharacterSet(charactersIn: "[]【】()（）"))
            .trimmingCharacters(in: .whitespacesAndNewlines)
        guard !s.isEmpty, s.count <= 18 else { return false }
        
        // 先排除常見含「室／實驗／體育／場」但實為課程名稱的詞彙
        if s.hasPrefix("室內") || s.hasSuffix("實驗") || s.hasSuffix("實驗(一)") || s.hasSuffix("實驗(二)") ||
           s.hasSuffix("實驗（一）") || s.hasSuffix("實驗（二）") || s.hasSuffix("實習") ||
           s == "體育" || s.hasSuffix("體育") || s.contains("體育(") || s.contains("體育（") {
            return false
        }
        
        // (a) 明確的場館／教室結尾或關鍵詞
        let venueSuffixes = [
            "教室", "實驗室", "會議室", "視聽室", "研究室", "電腦室", "韻律室", "重訓室", "圖書室", "討論室", "琴房",
            "體育館", "綜合館", "游泳池", "泳池", "健身房", "田徑場", "操場", "籃球場", "排球場", "網球場", "羽球場",
            "桌球室", "棒球場", "高爾夫球場", "禮堂", "講堂", "國際會議廳", "演講廳",
            "線上", "遠距", "網路教學", "線上教學", "線上上課", "遠距教學", "未定", "待定", "校外", "TBA", "Online"
        ]
        if venueSuffixes.contains(where: { s.hasSuffix($0) || s == $0 }) {
            return true
        }
        
        // (b) 英文代碼 + 房號 (例如 "EC402", "TR-311", "SF648", "RB-102", "E6-A205", "B204", "R0204", "M201", "101室", "3F", "B1")
        let alphaNumRoomRegex = try? NSRegularExpression(
            pattern: #"^(?:[A-Za-z]{1,5}[\s\-\.]?[A-Za-z]?\d{2,5}[A-Za-z]?|[B]?\d{1,2}F|\d{3,5}[A-Za-z]?室?)$"#
        )
        if let regex = alphaNumRoomRegex,
           regex.firstMatch(in: s, range: NSRange(s.startIndex..., in: s)) != nil {
            return true
        }
        
        // (c) 中文館別／校區簡稱 + 房號 (例如 "資電 402", "工三館 101", "電資大樓 402", "人社 C203", "雙溪 R0204", "城中 5211", "大恩 405", "理學院 102")
        let cjkBuildingRoomRegex = try? NSRegularExpression(
            pattern: #"^[\u4e00-\u9fa5]{1,7}(?:[館樓堂院區中心])?[\s\-]*[A-Za-z]{0,3}[\s\-]*\d{2,5}[A-Za-z]?室?$"#
        )
        if let regex = cjkBuildingRoomRegex,
           regex.firstMatch(in: s, range: NSRange(s.startIndex..., in: s)) != nil {
            return true
        }
        
        // (d) 含「館／大樓／樓／中心」且長度簡短的地點描述 (例如 "工三館", "綜合大樓3F", "資訊中心")
        if (s.contains("館") || s.contains("大樓") || s.hasSuffix("樓") || s.hasSuffix("中心")) && s.count <= 10 {
            return true
        }
        
        return false
    }
    
    /// 若單一行文字內同時夾帶了「英文課名 + 中文課名」或「課名 + 教室」，將其智慧拆解
    nonisolated public static func extractInlineComponents(from rawText: String) -> (
        chineseName: String,
        englishName: String,
        classroom: String,
        instructor: String
    ) {
        var working = rawText
            .replacingOccurrences(of: "\n", with: " ")
            .trimmingCharacters(in: .whitespacesAndNewlines)
        var detectedClassroom = ""
        var detectedInstructor = ""
        
        // 1. 先檢查尾端是否帶有空白分隔的教室或教師 (例如 "作業系統 資電402" 或 "作業系統 EC402")
        let tokens = working.components(separatedBy: .whitespaces).filter { !$0.isEmpty }
        if tokens.count >= 2, let lastToken = tokens.last {
            if isClassroomText(lastToken) {
                detectedClassroom = lastToken
                working = tokens.dropLast().joined(separator: " ")
            } else if tokens.count >= 3 {
                let lastTwo = tokens.suffix(2).joined(separator: " ")
                if isClassroomText(lastTwo) {
                    detectedClassroom = lastTwo
                    working = tokens.dropLast(2).joined(separator: " ")
                }
            }
        }
        
        // 2. 檢查是否同一行同時包含「多字英文課名 (2個以上英文單字、>=8字母)」與「中文課名 (>=2個中文字)」
        let cjkScalars = working.unicodeScalars.filter { (0x4E00...0x9FFF).contains($0.value) || (0x3400...0x4DBF).contains($0.value) }
        if cjkScalars.count >= 2 {
            // 尋找連續兩個以上英文單字組成的英文課名片段 (例如 "Operating Systems 作業系統" 或 "作業系統 Operating Systems")
            if let multiWordEngRegex = try? NSRegularExpression(pattern: #"[A-Za-z]{2,}(?:[\s\-\&\/]+[A-Za-z\(\)\.]{1,})+"#),
               let match = multiWordEngRegex.firstMatch(in: working, range: NSRange(working.startIndex..., in: working)),
               let range = Range(match.range, in: working) {
                let engPart = String(working[range]).trimmingCharacters(in: .whitespacesAndNewlines)
                if engPart.count >= 7 {
                    var cnPart = working
                    cnPart.removeSubrange(range)
                    cnPart = cnPart.trimmingCharacters(in: .whitespacesAndNewlines)
                    if cnPart.count >= 2 {
                        return (cnPart, engPart, detectedClassroom, detectedInstructor)
                    }
                }
            }
            return (working, "", detectedClassroom, detectedInstructor)
        }
        
        // 若整行只有英文課名
        let role = classifyCellLine(working)
        switch role {
        case .classroom:
            return ("", "", working, "")
        case .instructor:
            return ("", "", "", working)
        case .englishCourseName:
            return ("", working, detectedClassroom, detectedInstructor)
        case .chineseCourseName:
            return (working, "", detectedClassroom, detectedInstructor)
        default:
            return (working, "", detectedClassroom, detectedInstructor)
        }
    }
    
    /// 後處理專用：當雲端或本機 OCR 把同一個格子的「英文課名」、「中文課名」、「上課地點」誤拆成 2~3 筆同日同節或相鄰節次的課程時，自動合併為單一門課
    private static func consolidateSameCellSplitCourses(
        _ courses: [OCRExtractedCourse],
        effectivePeriods: [ClassPeriod]
    ) -> [OCRExtractedCourse] {
        guard !courses.isEmpty else { return [] }
        
        let sorted = courses.sorted {
            if $0.dayOfWeek != $1.dayOfWeek { return $0.dayOfWeek < $1.dayOfWeek }
            let min0 = $0.periodIds.min() ?? 999
            let min1 = $1.periodIds.min() ?? 999
            if min0 != min1 { return min0 < min1 }
            return $0.startTime < $1.startTime
        }
        
        struct ClusteredItem {
            var course: OCRExtractedCourse
            var hasEnglishName: Bool
            var hasChineseName: Bool
            var englishNameText: String
            var chineseNameText: String
        }
        
        var items: [ClusteredItem] = []
        
        for var c in sorted {
            // 先對單筆 c.name 進行內嵌拆解（若 c.name 本身就是地點、或同時含英中課名）
            let inline = extractInlineComponents(from: c.name)
            let role = classifyCellLine(c.name)
            
            if !inline.classroom.isEmpty && c.classroom.isEmpty && (!inline.chineseName.isEmpty || !inline.englishName.isEmpty) {
                c.classroom = inline.classroom
            }
            if !inline.chineseName.isEmpty && !inline.englishName.isEmpty {
                c.name = inline.chineseName
            }
            
            let isAdjacentOrSameToLast: (ClusteredItem) -> Bool = { prev in
                guard prev.course.dayOfWeek == c.dayOfWeek else { return false }
                if let maxPrev = prev.course.periodIds.max(), let minCurr = c.periodIds.min() {
                    if minCurr <= maxPrev + 1 { return true }
                }
                if let prevEnd = PeriodScheduleManager.minutesFromMidnight(prev.course.endTime),
                   let currStart = PeriodScheduleManager.minutesFromMidnight(c.startTime) {
                    return currStart - prevEnd <= 20
                }
                return false
            }
            
            let mergePeriodAndTime: (inout OCRExtractedCourse, OCRExtractedCourse) -> Void = { target, incoming in
                let combinedIds = Set(target.periodIds).union(incoming.periodIds).sorted()
                target.periodIds = combinedIds
                let matched = effectivePeriods.filter { combinedIds.contains($0.id) }.sorted { $0.startTime < $1.startTime }
                if let firstP = matched.first, let lastP = matched.last {
                    target.startTime = firstP.startTime
                    target.endTime = lastP.endTime
                } else {
                    if incoming.startTime < target.startTime && !incoming.startTime.isEmpty {
                        target.startTime = incoming.startTime
                    }
                    if incoming.endTime > target.endTime {
                        target.endTime = incoming.endTime
                    }
                }
                if target.classroom.isEmpty && !incoming.classroom.isEmpty {
                    target.classroom = incoming.classroom
                }
                if target.instructor.isEmpty && !incoming.instructor.isEmpty {
                    target.instructor = incoming.instructor
                }
                if target.code.isEmpty && !incoming.code.isEmpty {
                    target.code = incoming.code
                }
            }
            
            // 情況 A：這筆被誤認成課程的其實是「上課地點／教室」、「授課教師」或「選課代號」
            if role == .classroom || role == .instructor || role == .courseCode {
                if var last = items.last, isAdjacentOrSameToLast(last) {
                    if role == .classroom {
                        if last.course.classroom.isEmpty {
                            last.course.classroom = c.name
                        } else if !last.course.classroom.contains(c.name) {
                            last.course.classroom += " \(c.name)"
                        }
                    } else if role == .instructor {
                        if last.course.instructor.isEmpty {
                            last.course.instructor = c.name
                        }
                    } else if role == .courseCode {
                        if last.course.code.isEmpty {
                            last.course.code = c.name
                        }
                    }
                    mergePeriodAndTime(&last.course, c)
                    last.course.wasTimeAutoCorrected = true
                    last.course.correctionSummary = "已自動整合同一格內的課名與上課地點（\(last.course.periodBadgeText)）"
                    items[items.count - 1] = last
                    continue
                }
            }
            
            // 情況 B：這筆是「中文課名」，而上一筆同格／相鄰格是尚未配對中文課名的「英文課名」
            if role == .chineseCourseName,
               var last = items.last,
               isAdjacentOrSameToLast(last),
               last.hasEnglishName && !last.hasChineseName {
                last.chineseNameText = inline.chineseName.isEmpty ? c.name : inline.chineseName
                last.course.name = last.chineseNameText
                last.hasChineseName = true
                mergePeriodAndTime(&last.course, c)
                last.course.wasTimeAutoCorrected = true
                last.course.correctionSummary = "已自動合併同格中英文課名與地點（\(last.course.periodBadgeText)）"
                items[items.count - 1] = last
                continue
            }
            
            // 情況 C：這筆是「英文課名」，而上一筆同格／相鄰格是尚未配對英文課名的「中文課名」或「純英文課名換行」
            if role == .englishCourseName,
               var last = items.last,
               isAdjacentOrSameToLast(last) {
                if last.hasChineseName && !last.hasEnglishName && last.course.classroom.isEmpty {
                    // 上一筆是中文課名、這一筆是同格的英文課名 -> 保留中文課名並吸收此筆的節次與教室資訊
                    last.englishNameText = c.name
                    last.hasEnglishName = true
                    mergePeriodAndTime(&last.course, c)
                    last.course.wasTimeAutoCorrected = true
                    last.course.correctionSummary = "已自動合併同格中英文課名與地點（\(last.course.periodBadgeText)）"
                    items[items.count - 1] = last
                    continue
                } else if last.hasEnglishName && !last.hasChineseName && last.course.classroom.isEmpty {
                    // 多行英文課名被拆成兩行 -> 先合併英文課名，等待下一行中文課名或教室
                    last.englishNameText += " \(c.name)"
                    last.course.name = last.englishNameText
                    mergePeriodAndTime(&last.course, c)
                    items[items.count - 1] = last
                    continue
                }
            }
            
            let hasCN = (role == .chineseCourseName) || !inline.chineseName.isEmpty
            let hasEN = (role == .englishCourseName) || !inline.englishName.isEmpty
            items.append(ClusteredItem(
                course: c,
                hasEnglishName: hasEN,
                hasChineseName: hasCN,
                englishNameText: hasEN ? (inline.englishName.isEmpty ? c.name : inline.englishName) : "",
                chineseNameText: hasCN ? (inline.chineseName.isEmpty ? c.name : inline.chineseName) : ""
            ))
        }
        
        return items.map { $0.course }
    }
    
    private static func mergeConsecutiveCourses(
        _ courses: [OCRExtractedCourse],
        effectivePeriods: [ClassPeriod]
    ) -> [OCRExtractedCourse] {
        let sorted = courses.sorted {
            if $0.dayOfWeek != $1.dayOfWeek { return $0.dayOfWeek < $1.dayOfWeek }
            return $0.startTime < $1.startTime
        }
        
        var result: [OCRExtractedCourse] = []
        for course in sorted {
            if var last = result.last,
               last.dayOfWeek == course.dayOfWeek,
               last.name == course.name {
                // 檢查是否為相鄰節次或時間相接
                let combinedIds = Set(last.periodIds).union(course.periodIds).sorted()
                let isConsecutiveIds: Bool = {
                    guard let maxLast = last.periodIds.max(), let minCurr = course.periodIds.min() else { return false }
                    return minCurr <= maxLast + 1
                }()
                let isTimeAdjacent: Bool = {
                    guard let lastEnd = PeriodScheduleManager.minutesFromMidnight(last.endTime),
                          let currStart = PeriodScheduleManager.minutesFromMidnight(course.startTime) else { return false }
                    return abs(currStart - lastEnd) <= 20
                }()
                
                if isConsecutiveIds || isTimeAdjacent {
                    last.periodIds = combinedIds
                    let matched = effectivePeriods.filter { combinedIds.contains($0.id) }.sorted { $0.startTime < $1.startTime }
                    if let firstP = matched.first, let lastP = matched.last {
                        last.startTime = firstP.startTime
                        last.endTime = lastP.endTime
                    } else if course.endTime > last.endTime {
                        last.endTime = course.endTime
                    }
                    if last.classroom.isEmpty && !course.classroom.isEmpty {
                        last.classroom = course.classroom
                    }
                    if last.instructor.isEmpty && !course.instructor.isEmpty {
                        last.instructor = course.instructor
                    }
                    if last.code.isEmpty && !course.code.isEmpty {
                        last.code = course.code
                    }
                    last.wasTimeAutoCorrected = true
                    last.correctionSummary = "已自動合併連堂節次（\(last.periodBadgeText)：\(last.startTime) ~ \(last.endTime)）"
                    result[result.count - 1] = last
                    continue
                }
            }
            result.append(course)
        }
        return result
    }
    
    // MARK: - iOS Native Vision OCR (擷取文字與 2D 空間座標)
    
    public struct VisionTextBlock: Sendable {
        public let text: String
        public let midX: Double // 0.0 (左) ~ 1.0 (右)
        public let midY: Double // 0.0 (上) ~ 1.0 (下)
        public let width: Double
        public let height: Double
    }
    
    nonisolated public static func extractVisionTextBlocks(from image: UIImage) async -> [VisionTextBlock] {
        guard let cgImage = image.cgImage else { return [] }
        
        return await withCheckedContinuation { continuation in
            let request = VNRecognizeTextRequest { req, _ in
                guard let observations = req.results as? [VNRecognizedTextObservation] else {
                    continuation.resume(returning: [])
                    return
                }
                
                var blocks: [VisionTextBlock] = []
                for obs in observations {
                    guard let topCandidate = obs.topCandidates(1).first else { continue }
                    let str = topCandidate.string.trimmingCharacters(in: .whitespacesAndNewlines)
                    guard !str.isEmpty else { continue }
                    
                    let box = obs.boundingBox
                    // Vision 的 origin 在左下角，轉換為左上角 (0, 0) 至右下角 (1, 1)
                    let midX = Double(box.midX)
                    let midY = Double(1.0 - box.midY)
                    blocks.append(VisionTextBlock(
                        text: str,
                        midX: midX,
                        midY: midY,
                        width: Double(box.width),
                        height: Double(box.height)
                    ))
                }
                
                // 依照由上而下、由左而右排序
                blocks.sort {
                    if abs($0.midY - $1.midY) > 0.018 {
                        return $0.midY < $1.midY
                    }
                    return $0.midX < $1.midX
                }
                continuation.resume(returning: blocks)
            }
            
            request.recognitionLevel = .accurate
            request.recognitionLanguages = ["zh-Hant", "zh-Hans", "en-US"]
            request.usesLanguageCorrection = true
            
            let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
            do {
                try handler.perform([request])
            } catch {
                continuation.resume(returning: [])
            }
        }
    }
    
    nonisolated private static func formatVisionBlocksForPrompt(
        _ blocks: [VisionTextBlock],
        preClusteredCourses: [OCRExtractedCourse] = []
    ) -> String {
        guard !blocks.isEmpty else { return "(無 OCR 預擷取文字，請直接由影像視覺辨識)" }
        
        var sections: [String] = []
        if !preClusteredCourses.isEmpty {
            let clusterSummary = preClusteredCourses.map { c in
                let pText = c.periodIds.map(String.init).joined(separator: ",")
                return "- 星期\(c.dayOfWeek) [節次 \(pText)]: 課名=\(c.name) | 地點=\(c.classroom) | 教師=\(c.instructor)"
            }.joined(separator: "\n")
            sections.append("【2D 空間同格預聚類結果（已將同一格內的英文課名＋中文課名＋上課地點整合為單一課程，請優先參考）】：\n\(clusterSummary)")
        }
        
        let rawLines = blocks.prefix(220).map { b in
            String(format: "[x=%.2f, y=%.2f] %@", b.midX, b.midY, b.text)
        }.joined(separator: "\n")
        sections.append("【原始 OCR 座標區塊】：\n\(rawLines)")
        
        return sections.joined(separator: "\n\n")
    }
    
    // MARK: - 升級版 iOS Vision 2D 空間幾何課表深度解析引擎 (支援同格「英文課名+中文課名+上課地點」智慧聚類)
    
    public static func parseScheduleFromVisionBlocksLocally(
        _ blocks: [VisionTextBlock]
    ) -> (periods: [OCRExtractedPeriod], courses: [OCRExtractedCourse]) {
        guard !blocks.isEmpty else { return ([], []) }
        
        var extractedPeriods: [OCRExtractedPeriod] = []
        var weekdayColumns: [(day: Int, x: Double, y: Double)] = []
        var periodRows: [(id: Int, y: Double, startTime: String, endTime: String)] = []
        
        // 1. 尋找星期欄位標題（支援「週一/周一/星期一/Mon」以及單字「一 二 三 四 五 六 日」與合併區塊拆分）
        let multiCharDayPatterns: [(day: Int, tokens: [String])] = [
            (1, ["週一", "周一", "星期一", "禮拜一", "(一)", "（一）", "Mon", "MON"]),
            (2, ["週二", "周二", "星期二", "禮拜二", "(二)", "（二）", "Tue", "TUE"]),
            (3, ["週三", "周三", "星期三", "禮拜三", "(三)", "（三）", "Wed", "WED"]),
            (4, ["週四", "周四", "星期四", "禮拜四", "(四)", "（四）", "Thu", "THU"]),
            (5, ["週五", "周五", "星期五", "禮拜五", "(五)", "（五）", "Fri", "FRI"]),
            (6, ["週六", "周六", "星期六", "禮拜六", "(六)", "（六）", "Sat", "SAT"]),
            (7, ["週日", "周日", "星期日", "星期天", "禮拜日", "(日)", "（日）", "Sun", "SUN"])
        ]
        
        let singleCharDayMap: [String: Int] = [
            "一": 1, "二": 2, "三": 3, "四": 4, "五": 5, "六": 6, "日": 7
        ]
        
        for b in blocks where b.midY < 0.42 {
            let trimmed = b.text.trimmingCharacters(in: .whitespacesAndNewlines)
            
            // (a) 檢查是否為單一區塊包含多個星期標題（例如 "一 二 三 四 五" 或 "週一 週二 週三"）
            var matchedDaysInBlock: [Int] = []
            for pat in multiCharDayPatterns {
                if pat.tokens.contains(where: { trimmed.contains($0) }) {
                    matchedDaysInBlock.append(pat.day)
                }
            }
            if matchedDaysInBlock.count >= 2 {
                let minX = max(0.05, b.midX - b.width / 2.0)
                let maxX = min(0.98, b.midX + b.width / 2.0)
                let step = (maxX - minX) / Double(matchedDaysInBlock.count)
                for (idx, day) in matchedDaysInBlock.enumerated() {
                    if !weekdayColumns.contains(where: { $0.day == day }) {
                        let colX = minX + step * (Double(idx) + 0.5)
                        weekdayColumns.append((day: day, x: colX, y: b.midY))
                    }
                }
                continue
            } else if let singleMatchedDay = matchedDaysInBlock.first {
                if !weekdayColumns.contains(where: { $0.day == singleMatchedDay }) {
                    weekdayColumns.append((day: singleMatchedDay, x: b.midX, y: b.midY))
                }
                continue
            }
            
            // (b) 檢查單字元星期標題（例如 "一"、"二"、"三"、"四"、"五" 或空白分隔的 "一 二 三 四 五"）
            let tokens = trimmed.components(separatedBy: .whitespaces).filter { !$0.isEmpty }
            let mappedSingleDays = tokens.compactMap { singleCharDayMap[$0] }
            if mappedSingleDays.count >= 2 && mappedSingleDays.count == tokens.count {
                let minX = max(0.12, b.midX - b.width / 2.0)
                let maxX = min(0.98, b.midX + b.width / 2.0)
                let step = (maxX - minX) / Double(mappedSingleDays.count)
                for (idx, day) in mappedSingleDays.enumerated() {
                    if !weekdayColumns.contains(where: { $0.day == day }) {
                        let colX = minX + step * (Double(idx) + 0.5)
                        weekdayColumns.append((day: day, x: colX, y: b.midY))
                    }
                }
            } else if let day = singleCharDayMap[trimmed], b.midX > 0.14 {
                if !weekdayColumns.contains(where: { $0.day == day }) {
                    weekdayColumns.append((day: day, x: b.midX, y: b.midY))
                }
            }
        }
        
        // 若識別到的星期欄少於 3 欄，自動推算標準 5 欄（週一至週五）網格座標
        weekdayColumns.sort { $0.x < $1.x }
        if weekdayColumns.count < 3 {
            let hasLeftPeriodCol = blocks.contains(where: { $0.midX < 0.22 && $0.midY > 0.18 })
            let startX = hasLeftPeriodCol ? 0.24 : 0.14
            let endX = 0.92
            let step = (endX - startX) / 4.0
            let headerY = weekdayColumns.first?.y ?? 0.12
            weekdayColumns = (1...5).map { d in
                (day: d, x: startX + Double(d - 1) * step, y: headerY)
            }
        }
        
        // 2. 尋找左側節次列與時間範圍
        let timeRangeRegex = try? NSRegularExpression(pattern: #"(\d{1,2}[:：]\d{2})\s*[~～\-－至—]\s*(\d{1,2}[:：]\d{2})"#)
        let singleTimeRegex = try? NSRegularExpression(pattern: #"\b(\d{1,2}[:：]\d{2})\b"#)
        let periodNumRegex = try? NSRegularExpression(pattern: #"第?\s*(\d{1,2})\s*節"#)
        let purePeriodRegex = try? NSRegularExpression(pattern: #"^0?([1-9]|1[0-4])$"#)
        let chinesePeriodMap: [String: Int] = [
            "第一節": 1, "第二節": 2, "第三節": 3, "第四節": 4, "第五節": 5,
            "第六節": 6, "第七節": 7, "第八節": 8, "第九節": 9, "第十節": 10,
            "第十一節": 11, "第十二節": 12, "第十三節": 13, "第十四節": 14
        ]
        
        let headerMaxY = min(0.30, weekdayColumns.map { $0.y }.max() ?? 0.14)
        let leftBlocks = blocks.filter { $0.midX < 0.32 && $0.midY > headerMaxY }
        
        for b in leftBlocks {
            let cleanText = b.text.trimmingCharacters(in: .whitespacesAndNewlines)
            var detectedPeriodId: Int? = nil
            
            if cleanText.contains("中午") || cleanText.contains("午休") || cleanText == "午" || cleanText == "N" {
                detectedPeriodId = 100
            } else if let cnId = chinesePeriodMap.first(where: { cleanText.contains($0.key) })?.value {
                detectedPeriodId = cnId
            } else if let regex = periodNumRegex,
                      let match = regex.firstMatch(in: cleanText, range: NSRange(cleanText.startIndex..., in: cleanText)),
                      let range = Range(match.range(at: 1), in: cleanText),
                      let num = Int(cleanText[range]), (1...14).contains(num) {
                detectedPeriodId = num
            } else if b.midX < 0.24,
                      let regex = purePeriodRegex,
                      let match = regex.firstMatch(in: cleanText, range: NSRange(cleanText.startIndex..., in: cleanText)),
                      let range = Range(match.range(at: 1), in: cleanText),
                      let num = Int(cleanText[range]), (1...14).contains(num) {
                detectedPeriodId = num
            }
            
            var detectedStart: String? = nil
            var detectedEnd: String? = nil
            if let regex = timeRangeRegex,
               let match = regex.firstMatch(in: cleanText, range: NSRange(cleanText.startIndex..., in: cleanText)),
               let r1 = Range(match.range(at: 1), in: cleanText),
               let r2 = Range(match.range(at: 2), in: cleanText) {
                detectedStart = String(cleanText[r1]).replacingOccurrences(of: "：", with: ":")
                detectedEnd = String(cleanText[r2]).replacingOccurrences(of: "：", with: ":")
            } else if let regex = singleTimeRegex {
                let matches = regex.matches(in: cleanText, range: NSRange(cleanText.startIndex..., in: cleanText))
                if matches.count >= 2,
                   let r1 = Range(matches[0].range(at: 1), in: cleanText),
                   let r2 = Range(matches[1].range(at: 1), in: cleanText) {
                    detectedStart = String(cleanText[r1]).replacingOccurrences(of: "：", with: ":")
                    detectedEnd = String(cleanText[r2]).replacingOccurrences(of: "：", with: ":")
                }
            }
            
            if detectedPeriodId == nil, let st = detectedStart {
                let hourPart = Int(st.prefix(2).replacingOccurrences(of: ":", with: "")) ?? 8
                let hourToPeriod: [Int: Int] = [
                    8: 1, 9: 2, 10: 3, 11: 4, 12: 100, 13: 5, 14: 6, 15: 7, 16: 8, 17: 9, 18: 10, 19: 11, 20: 12, 21: 13
                ]
                detectedPeriodId = hourToPeriod[hourPart]
            }
            
            if let pid = detectedPeriodId {
                if detectedStart == nil {
                    let nearbyTimeBlocks = leftBlocks.filter { abs($0.midY - b.midY) < 0.055 && $0.text != b.text }
                    var foundTimes: [String] = []
                    for nearby in nearbyTimeBlocks {
                        if let regex = timeRangeRegex,
                           let match = regex.firstMatch(in: nearby.text, range: NSRange(nearby.text.startIndex..., in: nearby.text)),
                           let r1 = Range(match.range(at: 1), in: nearby.text),
                           let r2 = Range(match.range(at: 2), in: nearby.text) {
                            detectedStart = String(nearby.text[r1]).replacingOccurrences(of: "：", with: ":")
                            detectedEnd = String(nearby.text[r2]).replacingOccurrences(of: "：", with: ":")
                            break
                        } else if let regex = singleTimeRegex {
                            for m in regex.matches(in: nearby.text, range: NSRange(nearby.text.startIndex..., in: nearby.text)) {
                                if let r = Range(m.range(at: 1), in: nearby.text) {
                                    foundTimes.append(String(nearby.text[r]).replacingOccurrences(of: "：", with: ":"))
                                }
                            }
                        }
                    }
                    if detectedStart == nil && foundTimes.count >= 2 {
                        detectedStart = foundTimes[0]
                        detectedEnd = foundTimes[1]
                    }
                }
                
                let defaultP = PeriodScheduleManager.defaultPeriods.first(where: { $0.id == pid })
                let st = detectedStart ?? defaultP?.startTime ?? "08:10"
                let et = detectedEnd ?? defaultP?.endTime ?? "09:00"
                
                if !periodRows.contains(where: { $0.id == pid }) {
                    periodRows.append((id: pid, y: b.midY, startTime: st, endTime: et))
                }
                if detectedStart != nil, !extractedPeriods.contains(where: { $0.id == pid }) {
                    extractedPeriods.append(OCRExtractedPeriod(
                        id: pid,
                        name: pid == 100 ? "中午" : "第 \(pid) 節",
                        shortName: pid == 100 ? "中午" : "\(pid)",
                        startTime: st,
                        endTime: et
                    ))
                }
            }
        }
        
        // 若圖片未拍到左側節次欄或辨識到的節次列少於 3 列，自動依據系統標準節次（含中午 100）建立垂直網格列
        if periodRows.count < 3 {
            let standardPeriods = PeriodScheduleManager.sortPeriodsLogically(
                PeriodScheduleManager.defaultPeriods.filter { (1...10).contains($0.id) || $0.id == 100 }
            )
            let topY = headerMaxY + 0.05
            let bottomY = 0.92
            let rowStep = (bottomY - topY) / Double(max(1, standardPeriods.count - 1))
            for (idx, sp) in standardPeriods.enumerated() {
                if !periodRows.contains(where: { $0.id == sp.id }) {
                    let rowY = topY + Double(idx) * rowStep
                    periodRows.append((id: sp.id, y: rowY, startTime: sp.startTime, endTime: sp.endTime))
                }
            }
        }
        periodRows.sort { $0.y < $1.y }
        
        // 計算節次列之間的平均垂直間距，作為同格多行聚類的幾何尺度基準
        let avgRowStep: Double = {
            guard periodRows.count >= 2 else { return 0.08 }
            var diffs: [Double] = []
            for i in 1..<periodRows.count {
                let d = periodRows[i].y - periodRows[i - 1].y
                if d > 0.02 { diffs.append(d) }
            }
            guard !diffs.isEmpty else { return 0.08 }
            return diffs.reduce(0, +) / Double(diffs.count)
        }()
        
        // 3. 先將表格內的文字區塊依「星期欄 (dayOfWeek)」分組，並在每一欄內由上而下進行「同格多行智慧聚類 (CellCluster)」
        //    解決一個格子內同時有「英文課名 + 中文課名 + 上課地點」時被誤拆成三堂課的問題！
        let firstDayColX = weekdayColumns.map { $0.x }.min() ?? 0.24
        let leftColMaxX = max(0.14, firstDayColX - 0.09)
        let ignoreKeywords = ["每週課表", "可樂課表", "一週課表", "學年度", "學期", "節次", "時間", "全屏完整", "自由滾動", "僅工作日", "含週末", "AI 匯入", "當日"]
        
        struct ColumnLineItem {
            let text: String
            let midY: Double
            let height: Double
            let role: CellLineRole
        }
        
        var columnLines: [Int: [ColumnLineItem]] = [:]
        
        for b in blocks {
            guard b.midY > headerMaxY + 0.015, b.midX > leftColMaxX else { continue }
            guard let nearestDay = weekdayColumns.min(by: { abs($0.x - b.midX) < abs($1.x - b.midX) }),
                  abs(nearestDay.x - b.midX) < 0.20 else {
                continue
            }
            
            // 若單一 Vision 區塊內含多行文字 (\n)，拆分為獨立行並依序內插 Y 座標
            let subLines = b.text
                .components(separatedBy: .newlines)
                .map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
                .filter { !$0.isEmpty }
            guard !subLines.isEmpty else { continue }
            
            let lineHeight = b.height / Double(max(1, subLines.count))
            let topY = b.midY - b.height / 2.0
            
            for (idx, rawLine) in subLines.enumerated() {
                guard rawLine.count >= 2 else { continue }
                if ignoreKeywords.contains(where: { rawLine.contains($0) }) { continue }
                if periodNumRegex?.firstMatch(in: rawLine, range: NSRange(rawLine.startIndex..., in: rawLine)) != nil { continue }
                if timeRangeRegex?.firstMatch(in: rawLine, range: NSRange(rawLine.startIndex..., in: rawLine)) != nil { continue }
                if purePeriodRegex?.firstMatch(in: rawLine, range: NSRange(rawLine.startIndex..., in: rawLine)) != nil { continue }
                
                let interpY = subLines.count == 1 ? b.midY : (topY + lineHeight * (Double(idx) + 0.5))
                let role = classifyCellLine(rawLine)
                guard role != .noise else { continue }
                
                columnLines[nearestDay.day, default: []].append(ColumnLineItem(
                    text: rawLine,
                    midY: interpY,
                    height: lineHeight,
                    role: role
                ))
            }
        }
        
        struct CellCluster {
            let day: Int
            var minY: Double
            var maxY: Double
            var englishLines: [String] = []
            var chineseLines: [String] = []
            var classroomLines: [String] = []
            var instructorLines: [String] = []
            var codeLines: [String] = []
            var lastAddedRole: CellLineRole
            
            var hasAnyCourseName: Bool {
                !chineseLines.isEmpty || !englishLines.isEmpty
            }
        }
        
        var courses: [OCRExtractedCourse] = []
        
        for (day, rawItems) in columnLines {
            let sortedItems = rawItems.sorted { $0.midY < $1.midY }
            var clusters: [CellCluster] = []
            
            for item in sortedItems {
                let inline = extractInlineComponents(from: item.text)
                
                if var current = clusters.last {
                    let verticalGap = item.midY - current.maxY
                    let maxCellLineGap = max(0.115, avgRowStep * 1.45)
                    let tightWrapGap = max(0.042, avgRowStep * 0.58)
                    
                    var shouldMergeIntoCurrent = false
                    
                    if verticalGap <= maxCellLineGap {
                        switch item.role {
                        case .classroom, .instructor, .courseCode:
                            // 上課地點、授課教師、課程代號永遠隸屬於上方的同格課程，絕不單獨變成一堂新課！
                            shouldMergeIntoCurrent = true
                            
                        case .chineseCourseName:
                            if current.chineseLines.isEmpty && current.classroomLines.isEmpty {
                                // 同一格內先出現「英文課名」（或課程代號），緊接著這行是「中文課名」 -> 合併為同一門課！
                                shouldMergeIntoCurrent = true
                            } else if current.lastAddedRole == .chineseCourseName && current.classroomLines.isEmpty && verticalGap <= tightWrapGap {
                                // 中文課名過長換行（例如「資料結構與」+「演算法」） -> 合併！
                                shouldMergeIntoCurrent = true
                            }
                            
                        case .englishCourseName:
                            if current.englishLines.isEmpty && current.classroomLines.isEmpty {
                                // 同一格內先出現「中文課名」（或課程代號），緊接著這行是「英文課名」 -> 合併為同一門課！
                                shouldMergeIntoCurrent = true
                            } else if current.lastAddedRole == .englishCourseName && current.classroomLines.isEmpty && verticalGap <= max(0.048, avgRowStep * 0.68) {
                                // 英文課名過長換成多行（例如 "Introduction to" + "Computer Science"） -> 合併！
                                shouldMergeIntoCurrent = true
                            }
                            
                        case .noise:
                            break
                        }
                    }
                    
                    if shouldMergeIntoCurrent {
                        current.minY = min(current.minY, item.midY)
                        current.maxY = max(current.maxY, item.midY)
                        current.lastAddedRole = item.role
                        
                        switch item.role {
                        case .classroom:
                            if !current.classroomLines.contains(item.text) {
                                current.classroomLines.append(item.text)
                            }
                        case .instructor:
                            if !current.instructorLines.contains(item.text) {
                                current.instructorLines.append(item.text)
                            }
                        case .courseCode:
                            if !current.codeLines.contains(item.text) {
                                current.codeLines.append(item.text)
                            }
                        case .chineseCourseName:
                            let cn = inline.chineseName.isEmpty ? item.text : inline.chineseName
                            current.chineseLines.append(cn)
                            if !inline.englishName.isEmpty && current.englishLines.isEmpty {
                                current.englishLines.append(inline.englishName)
                            }
                            if !inline.classroom.isEmpty && !current.classroomLines.contains(inline.classroom) {
                                current.classroomLines.append(inline.classroom)
                            }
                        case .englishCourseName:
                            let en = inline.englishName.isEmpty ? item.text : inline.englishName
                            current.englishLines.append(en)
                            if !inline.classroom.isEmpty && !current.classroomLines.contains(inline.classroom) {
                                current.classroomLines.append(inline.classroom)
                            }
                        case .noise:
                            break
                        }
                        
                        clusters[clusters.count - 1] = current
                        continue
                    }
                }
                
                // 開啟一個新的課表單元格聚類 (CellCluster)
                var newCluster = CellCluster(
                    day: day,
                    minY: item.midY,
                    maxY: item.midY,
                    lastAddedRole: item.role
                )
                switch item.role {
                case .chineseCourseName:
                    newCluster.chineseLines.append(inline.chineseName.isEmpty ? item.text : inline.chineseName)
                    if !inline.englishName.isEmpty {
                        newCluster.englishLines.append(inline.englishName)
                    }
                    if !inline.classroom.isEmpty {
                        newCluster.classroomLines.append(inline.classroom)
                    }
                case .englishCourseName:
                    newCluster.englishLines.append(inline.englishName.isEmpty ? item.text : inline.englishName)
                    if !inline.chineseName.isEmpty {
                        newCluster.chineseLines.append(inline.chineseName)
                    }
                    if !inline.classroom.isEmpty {
                        newCluster.classroomLines.append(inline.classroom)
                    }
                case .classroom:
                    newCluster.classroomLines.append(item.text)
                case .instructor:
                    newCluster.instructorLines.append(item.text)
                case .courseCode:
                    newCluster.codeLines.append(item.text)
                case .noise:
                    break
                }
                clusters.append(newCluster)
            }
            
            // 將每個聚類完成的 CellCluster 轉換為單一門 OCRExtractedCourse
            for cluster in clusters {
                let finalCourseName: String
                if !cluster.chineseLines.isEmpty {
                    // 若格內同時有中文課名與英文課名，優先採用中文課名，避免重複合併成多堂課
                    finalCourseName = cluster.chineseLines.joined(separator: "")
                } else if !cluster.englishLines.isEmpty {
                    finalCourseName = cluster.englishLines.joined(separator: " ")
                } else {
                    continue
                }
                
                guard finalCourseName.count >= 2 else { continue }
                
                let finalClassroom = cluster.classroomLines.joined(separator: " ")
                let finalInstructor = cluster.instructorLines.joined(separator: " ")
                let finalCode = cluster.codeLines.joined(separator: " ")
                
                // 根據該格文字群組的垂直範圍 [minY ... maxY] 對應節次
                let spanY = cluster.maxY - cluster.minY
                let clusterMidY = (cluster.minY + cluster.maxY) / 2.0
                var matchedPeriodIds: [Int] = []
                
                if spanY >= avgRowStep * 0.88 {
                    // 跨越多節的大格子：涵蓋所有落在 [minY - 0.35*step ... maxY + 0.35*step] 的節次列
                    let margin = avgRowStep * 0.35
                    matchedPeriodIds = periodRows
                        .filter { $0.y >= (cluster.minY - margin) && $0.y <= (cluster.maxY + margin) }
                        .map { $0.id }
                }
                
                if matchedPeriodIds.isEmpty {
                    // 單節課格子（內含英文課名+中文課名+地點三行文字）：以格子中心點對齊最近的一節課
                    if let nearestPeriod = periodRows.min(by: { abs($0.y - clusterMidY) < abs($1.y - clusterMidY) }),
                       abs(nearestPeriod.y - clusterMidY) < max(0.12, avgRowStep * 1.4) {
                        matchedPeriodIds = [nearestPeriod.id]
                    }
                }
                
                guard !matchedPeriodIds.isEmpty else { continue }
                let matchedRows = periodRows.filter { matchedPeriodIds.contains($0.id) }.sorted { $0.y < $1.y }
                let st = matchedRows.first?.startTime ?? "08:10"
                let et = matchedRows.last?.endTime ?? "09:00"
                
                courses.append(OCRExtractedCourse(
                    name: finalCourseName,
                    code: finalCode,
                    classroom: finalClassroom,
                    instructor: finalInstructor,
                    dayOfWeek: day,
                    periodIds: matchedRows.map { $0.id },
                    startTime: st,
                    endTime: et
                ))
            }
        }
        
        return (extractedPeriods, courses)
    }
    
    // MARK: - 圖片縮放輔助與測試用範例課表圖片產生器
    
    nonisolated private static func resizeImageIfNeeded(_ image: UIImage, maxDimension: CGFloat) -> UIImage? {
        let size = image.size
        let maxSide = max(size.width, size.height)
        guard maxSide > maxDimension else { return image }
        
        let scale = maxDimension / maxSide
        let newSize = CGSize(width: size.width * scale, height: size.height * scale)
        let renderer = UIGraphicsImageRenderer(size: newSize)
        return renderer.image { _ in
            image.draw(in: CGRect(origin: .zero, size: newSize))
        }
    }
    
    /// 產生一張高解析度的大學課表圖片（含自訂節次作息時間與連堂課程），方便使用者一鍵測試 Gemini OCR 與自動修正課表時間功能
    public static func generateSampleTimetableImage() -> UIImage {
        let width: CGFloat = 1080
        let height: CGFloat = 1360
        let renderer = UIGraphicsImageRenderer(size: CGSize(width: width, height: height))
        
        return renderer.image { ctx in
            let cg = ctx.cgContext
            
            // 背景白底
            UIColor.white.setFill()
            cg.fill(CGRect(x: 0, y: 0, width: width, height: height))
            
            // 頂部標題
            let titleAttrs: [NSAttributedString.Key: Any] = [
                .font: UIFont.boldSystemFont(ofSize: 30),
                .foregroundColor: UIColor(red: 0.15, green: 0.18, blue: 0.35, alpha: 1)
            ]
            let title = "115 學年度 第 1 學期 學生個人課表（含節次作息時間）"
            title.draw(at: CGPoint(x: 40, y: 28), withAttributes: titleAttrs)
            
            let leftMargin: CGFloat = 36
            let topMargin: CGFloat = 90
            let periodColWidth: CGFloat = 190
            let dayColWidth: CGFloat = (width - leftMargin * 2 - periodColWidth) / 5.0
            let headerHeight: CGFloat = 56
            let rowHeight: CGFloat = 108
            
            // 畫標題列背景
            UIColor(red: 0.24, green: 0.28, blue: 0.65, alpha: 1).setFill()
            cg.fill(CGRect(x: leftMargin, y: topMargin, width: width - leftMargin * 2, height: headerHeight))
            
            let headerAttrs: [NSAttributedString.Key: Any] = [
                .font: UIFont.boldSystemFont(ofSize: 22),
                .foregroundColor: UIColor.white
            ]
            "節次 / 時間".draw(at: CGPoint(x: leftMargin + 32, y: topMargin + 14), withAttributes: headerAttrs)
            
            let days = ["星期一", "星期二", "星期三", "星期四", "星期五"]
            for (i, d) in days.enumerated() {
                let x = leftMargin + periodColWidth + CGFloat(i) * dayColWidth
                d.draw(at: CGPoint(x: x + 48, y: topMargin + 14), withAttributes: headerAttrs)
            }
            
            // 定義範例節次（故意設定與系統預設 08:10 不同的作息時間，以展示「自動修正課表時間」效果）
            let samplePeriods: [(num: Int, label: String, time: String)] = [
                (1, "第 1 節", "08:00~08:50"),
                (2, "第 2 節", "09:00~09:50"),
                (3, "第 3 節", "10:10~11:00"),
                (4, "第 4 節", "11:10~12:00"),
                (100, "中午", "12:00~13:00"),
                (5, "第 5 節", "13:10~14:00"),
                (6, "第 6 節", "14:10~15:00"),
                (7, "第 7 節", "15:20~16:10"),
                (8, "第 8 節", "16:20~17:10"),
                (9, "第 9 節", "17:20~18:10"),
                (10, "第 10 節", "18:20~19:10")
            ]
            
            // 定義範例課程 (dayIndex: 0~4, rowIndex: 0~10)，每格包含「英文課名 + 中文課名 + 上課地點」三行
            let sampleCourses: [(dayIdx: Int, rowIdx: Int, engName: String, name: String, room: String)] = [
                // 週一：第2~4節 資料結構與演算法、第6~7節 作業系統
                (0, 1, "Data Structures", "資料結構與演算法", "電資大樓 402"),
                (0, 2, "Data Structures", "資料結構與演算法", "電資大樓 402"),
                (0, 3, "Data Structures", "資料結構與演算法", "電資大樓 402"),
                (0, 6, "Operating Systems", "作業系統概論", "工三館 105"),
                (0, 7, "Operating Systems", "作業系統概論", "工三館 105"),
                // 週二：第1~2節 大學英文、第5~7節 人工智慧實務
                (1, 0, "Academic English", "高階科技英文", "人社館 201"),
                (1, 1, "Academic English", "高階科技英文", "人社館 201"),
                (1, 5, "Machine Learning", "人工智慧與機器學習", "電資大樓 301"),
                (1, 6, "Machine Learning", "人工智慧與機器學習", "電資大樓 301"),
                (1, 7, "Machine Learning", "人工智慧與機器學習", "電資大樓 301"),
                // 週三：第2~4節 資料庫系統
                (2, 1, "Database Systems", "資料庫系統設計", "工三館 203"),
                (2, 2, "Database Systems", "資料庫系統設計", "工三館 203"),
                (2, 3, "Database Systems", "資料庫系統設計", "工三館 203"),
                // 週四：第5~6節 統計學、第8~9節 體育
                (3, 5, "Probability & Stats", "機率與統計", "理學院 102"),
                (3, 6, "Probability & Stats", "機率與統計", "理學院 102"),
                (3, 8, "Badminton", "羽球進階", "綜合體育館"),
                (3, 9, "Badminton", "羽球進階", "綜合體育館"),
                // 週五：第2~4節 軟體工程
                (4, 1, "Software Engineering", "敏捷軟體工程", "電資大樓 108"),
                (4, 2, "Software Engineering", "敏捷軟體工程", "電資大樓 108"),
                (4, 3, "Software Engineering", "敏捷軟體工程", "電資大樓 108")
            ]
            
            let periodTitleAttrs: [NSAttributedString.Key: Any] = [
                .font: UIFont.boldSystemFont(ofSize: 20),
                .foregroundColor: UIColor.black
            ]
            let periodTimeAttrs: [NSAttributedString.Key: Any] = [
                .font: UIFont.systemFont(ofSize: 17, weight: .medium),
                .foregroundColor: UIColor.darkGray
            ]
            let courseEngAttrs: [NSAttributedString.Key: Any] = [
                .font: UIFont.systemFont(ofSize: 13, weight: .semibold),
                .foregroundColor: UIColor(red: 0.32, green: 0.36, blue: 0.52, alpha: 1)
            ]
            let courseNameAttrs: [NSAttributedString.Key: Any] = [
                .font: UIFont.boldSystemFont(ofSize: 17),
                .foregroundColor: UIColor(red: 0.1, green: 0.12, blue: 0.25, alpha: 1)
            ]
            let courseMetaAttrs: [NSAttributedString.Key: Any] = [
                .font: UIFont.systemFont(ofSize: 15, weight: .medium),
                .foregroundColor: UIColor(red: 0.25, green: 0.3, blue: 0.45, alpha: 1)
            ]
            
            for (rIdx, p) in samplePeriods.enumerated() {
                let y = topMargin + headerHeight + CGFloat(rIdx) * rowHeight
                
                // 左側節次背景
                UIColor(red: 0.95, green: 0.96, blue: 0.99, alpha: 1).setFill()
                cg.fill(CGRect(x: leftMargin, y: y, width: periodColWidth, height: rowHeight))
                
                p.label.draw(at: CGPoint(x: leftMargin + 20, y: y + 24), withAttributes: periodTitleAttrs)
                p.time.draw(at: CGPoint(x: leftMargin + 20, y: y + 56), withAttributes: periodTimeAttrs)
                
                // 各星期格子
                for dIdx in 0..<5 {
                    let x = leftMargin + periodColWidth + CGFloat(dIdx) * dayColWidth
                    if let c = sampleCourses.first(where: { $0.dayIdx == dIdx && $0.rowIdx == rIdx }) {
                        UIColor(red: 0.91, green: 0.94, blue: 1.0, alpha: 1).setFill()
                        cg.fill(CGRect(x: x + 2, y: y + 2, width: dayColWidth - 4, height: rowHeight - 4))
                        
                        c.engName.draw(at: CGPoint(x: x + 10, y: y + 12), withAttributes: courseEngAttrs)
                        c.name.draw(at: CGPoint(x: x + 10, y: y + 38), withAttributes: courseNameAttrs)
                        c.room.draw(at: CGPoint(x: x + 10, y: y + 68), withAttributes: courseMetaAttrs)
                    }
                    
                    // 畫格線
                    UIColor(white: 0.82, alpha: 1).setStroke()
                    cg.setLineWidth(1)
                    cg.stroke(CGRect(x: x, y: y, width: dayColWidth, height: rowHeight))
                }
                
                UIColor(white: 0.82, alpha: 1).setStroke()
                cg.stroke(CGRect(x: leftMargin, y: y, width: periodColWidth, height: rowHeight))
            }
        }
    }
}
