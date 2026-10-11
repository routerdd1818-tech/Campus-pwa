//
//  ClassPeriod.swift
//  Campus v1
//

import Foundation
import SwiftUI
import Combine

public struct ClassPeriod: Identifiable, Codable, Equatable, Hashable {
    public var id: Int // 節次編號：1, 2, 3, 4, 100(中午), 5...
    public var name: String // "第 1 節", "中午"
    public var shortName: String? // "1", "2", "3", "4", "中午", "5"
    public var startTime: String // "08:10"
    public var endTime: String // "09:00"
    
    public init(id: Int, name: String, shortName: String? = nil, startTime: String, endTime: String) {
        self.id = id
        self.name = name
        self.shortName = shortName
        self.startTime = startTime
        self.endTime = endTime
    }
    
    public var displayCode: String {
        if let short = shortName, !short.isEmpty {
            return short
        }
        if name.contains("中午") {
            return "中午"
        }
        return "\(id)"
    }
}

@MainActor
public final class PeriodScheduleManager: ObservableObject {
    public static let shared = PeriodScheduleManager()
    
    private let storageKey = "campus_custom_period_schedule"
    
    @Published public var periods: [ClassPeriod] = []
    
    public init() {
        loadPeriods()
    }
    
    public func loadPeriods() {
        if let data = UserDefaults.standard.data(forKey: storageKey),
           let saved = try? JSONDecoder().decode([ClassPeriod].self, from: data),
           !saved.isEmpty {
            var loaded = saved
            // 若舊版資料尚未包含「中午」，自動補上並對齊第 4 節與第 5 節之間的空檔
            if !loaded.contains(where: { $0.name.contains("中午") || $0.id == 100 }) {
                let p4End = loaded.first(where: { $0.id == 4 })?.endTime ?? "12:10"
                let p5Start = loaded.first(where: { $0.id == 5 })?.startTime ?? "13:10"
                let noonPeriod = ClassPeriod(id: 100, name: "中午", shortName: "中午", startTime: p4End, endTime: p5Start)
                loaded.append(noonPeriod)
            }
            self.periods = Self.sortPeriodsLogically(loaded)
            savePeriods()
        } else {
            self.periods = Self.sortPeriodsLogically(Self.defaultPeriods)
            savePeriods()
        }
    }
    
    /// 依據課表邏輯順序排列節次（1~4 節 -> 中午(100) -> 5~14 節），避免因自訂時間微調導致中午順序錯位
    public static func sortPeriodsLogically(_ list: [ClassPeriod]) -> [ClassPeriod] {
        return list.sorted { a, b in
            let orderA: Double = (a.id == 100 || a.name.contains("中午")) ? 4.5 : Double(a.id)
            let orderB: Double = (b.id == 100 || b.name.contains("中午")) ? 4.5 : Double(b.id)
            if orderA != orderB {
                return orderA < orderB
            }
            return a.startTime < b.startTime
        }
    }
    
    public func savePeriods() {
        if let data = try? JSONEncoder().encode(periods) {
            UserDefaults.standard.set(data, forKey: storageKey)
        }
    }
    
    public func updatePeriod(id: Int, startTime: String, endTime: String) {
        if let index = periods.firstIndex(where: { $0.id == id }) {
            periods[index].startTime = startTime
            periods[index].endTime = endTime
            periods = Self.sortPeriodsLogically(periods)
            savePeriods()
        }
    }
    
    public func resetToDefaults() {
        self.periods = Self.sortPeriodsLogically(Self.defaultPeriods)
        savePeriods()
    }
    
    /// 依據選取的節次集合，計算對應的最早起始與最晚結束時間
    public func timeRange(for selectedIds: Set<Int>) -> (startTime: String, endTime: String)? {
        let selectedPeriods = Self.sortPeriodsLogically(periods.filter { selectedIds.contains($0.id) })
        guard let first = selectedPeriods.first, let last = selectedPeriods.last else { return nil }
        return (first.startTime, last.endTime)
    }
    
    // MARK: - 時間字串正規化與分鐘換算工具
    
    /// 將各種時間字串（如 "8:10", "0810", "08:10:00", "8點10分"）正規化為標準 "HH:mm"
    public static func normalizeTimeString(_ raw: String) -> String? {
        let trimmed = raw.trimmingCharacters(in: .whitespacesAndNewlines)
            .replacingOccurrences(of: "：", with: ":")
            .replacingOccurrences(of: "點", with: ":")
            .replacingOccurrences(of: "分", with: "")
            .replacingOccurrences(of: ".", with: ":")
        
        // 情況 1：包含冒號 "H:m" 或 "HH:mm" 或 "HH:mm:ss"
        let parts = trimmed.split(separator: ":").map { String($0).filter { $0.isNumber } }
        if parts.count >= 2,
           let h = Int(parts[0]), let m = Int(parts[1]),
           (0...23).contains(h), (0...59).contains(m) {
            return String(format: "%02d:%02d", h, m)
        }
        
        // 情況 2：純數字 3~4 碼，例如 "810" -> "08:10", "1320" -> "13:20"
        let digits = trimmed.filter { $0.isNumber }
        if digits.count == 3,
           let h = Int(digits.prefix(1)),
           let m = Int(digits.suffix(2)),
           (0...23).contains(h), (0...59).contains(m) {
            return String(format: "%02d:%02d", h, m)
        } else if digits.count == 4,
                  let h = Int(digits.prefix(2)),
                  let m = Int(digits.suffix(2)),
                  (0...23).contains(h), (0...59).contains(m) {
            return String(format: "%02d:%02d", h, m)
        }
        
        return nil
    }
    
    /// 將 "HH:mm" 轉換為當日 00:00 起的總分鐘數
    public static func minutesFromMidnight(_ timeStr: String) -> Int? {
        let norm = normalizeTimeString(timeStr) ?? timeStr
        let parts = norm.split(separator: ":")
        guard parts.count >= 2,
              let h = Int(parts[0]),
              let m = Int(parts[1]) else { return nil }
        return h * 60 + m
    }
    
    // MARK: - 智慧節次匹配與課程時間自動修正 (Auto Time Calibration)
    
    /// 根據課程的開始與結束時間，在指定的節次表中找出對應的節次列表（完整支援「中午(100)」排課顯示與跨節次匹配）
    public func matchedPeriods(
        startTime: String,
        endTime: String,
        in referencePeriods: [ClassPeriod]? = nil
    ) -> [ClassPeriod] {
        let targetPeriods = Self.sortPeriodsLogically(referencePeriods ?? self.periods)
        guard !targetPeriods.isEmpty else { return [] }
        
        guard let cStart = Self.minutesFromMidnight(startTime),
              let cEnd = Self.minutesFromMidnight(endTime),
              cEnd > cStart else {
            return []
        }
        
        let courseDuration = max(1, cEnd - cStart)
        
        // 1. 找出重疊時長達標的節次（針對「中午(100)」放寬判定，支援 12:00~13:00、12:10~13:10、12:00~12:50 等各種午間時段）
        var overlapped: [ClassPeriod] = []
        for p in targetPeriods {
            guard let pStart = Self.minutesFromMidnight(p.startTime),
                  let pEnd = Self.minutesFromMidnight(p.endTime),
                  pEnd > pStart else { continue }
            
            let isNoonPeriod = (p.id == 100 || p.name.contains("中午"))
            // 中午節次同時涵蓋標準 12:00~13:10 彈性區間，避免第 4 節/第 5 節作息微調導致中午課程漏配
            let effectivePStart = isNoonPeriod ? min(pStart, 12 * 60) : pStart
            let effectivePEnd = isNoonPeriod ? max(pEnd, 13 * 60 + 10) : pEnd
            
            let overlapStart = max(cStart, effectivePStart)
            let overlapEnd = min(cEnd, effectivePEnd)
            let overlapMinutes = overlapEnd - overlapStart
            let periodDuration = max(1, pEnd - pStart)
            
            let thresholdMinutes = isNoonPeriod ? 10 : 15
            let ratioThreshold = isNoonPeriod ? 0.25 : 0.35
            
            if overlapMinutes >= thresholdMinutes
                || Double(overlapMinutes) / Double(periodDuration) >= ratioThreshold
                || Double(overlapMinutes) / Double(courseDuration) >= 0.5 {
                overlapped.append(p)
            }
        }
        
        // 若同時匹配到多個節次且包含「中午(100)」，僅在「中午與一般節次時間設定本身重疊，而課程其實完全落在第 4 節或第 5 節」時才排除誤觸的中午；
        // 若課程本身就是中午課、或跨中午連堂（如第 4 節+中午、中午+第 5 節），一律保留「中午(100)」！
        if overlapped.count > 1,
           let noonP = overlapped.first(where: { $0.id == 100 || $0.name.contains("中午") }) {
            let nonNoon = overlapped.filter { $0.id != 100 && !$0.name.contains("中午") }
            // 檢查這堂課是否與 किसी單一非中午節次完全吻合 (誤差 <= 5 分鐘)
            let exactMatchNonNoon = nonNoon.contains { p in
                guard let pS = Self.minutesFromMidnight(p.startTime),
                      let pE = Self.minutesFromMidnight(p.endTime) else { return false }
                return abs(cStart - pS) <= 5 && abs(cEnd - pE) <= 5
            }
            if exactMatchNonNoon {
                overlapped = nonNoon
            } else {
                _ = noonP // 保留中午節次，讓中午排課與跨午休連堂皆能正常顯示於課表上
            }
        }
        
        if !overlapped.isEmpty {
            return Self.sortPeriodsLogically(overlapped)
        }
        
        // 2. 若因時間偏差過大未命中，尋找開始時間最接近與結束時間最接近的節次（完整保留中午節次 id=100）
        let closestStart = targetPeriods.min { a, b in
            let aMin = Self.minutesFromMidnight(a.startTime) ?? 0
            let bMin = Self.minutesFromMidnight(b.startTime) ?? 0
            return abs(aMin - cStart) < abs(bMin - cStart)
        }
        let closestEnd = targetPeriods.min { a, b in
            let aMin = Self.minutesFromMidnight(a.endTime) ?? 0
            let bMin = Self.minutesFromMidnight(b.endTime) ?? 0
            return abs(aMin - cEnd) < abs(bMin - cEnd)
        }
        
        if let sPeriod = closestStart, let ePeriod = closestEnd,
           let sMin = Self.minutesFromMidnight(sPeriod.startTime),
           let eMin = Self.minutesFromMidnight(ePeriod.endTime),
           sMin <= eMin {
            if sPeriod.id == ePeriod.id {
                return [sPeriod]
            }
            let rangePeriods = targetPeriods.filter { p in
                guard let pS = Self.minutesFromMidnight(p.startTime),
                      let pE = Self.minutesFromMidnight(p.endTime) else { return false }
                return pS >= sMin && pE <= eMin
            }
            if !rangePeriods.isEmpty {
                return Self.sortPeriodsLogically(rangePeriods)
            }
        }
        
        return []
    }
    
    /// 依據節次編號陣列或原始時間，自動校正為標準節次作息時間
    public func calibrateCourseTime(
        rawStartTime: String,
        rawEndTime: String,
        explicitPeriodIds: [Int] = [],
        referencePeriods: [ClassPeriod]? = nil
    ) -> (startTime: String, endTime: String, matchedPeriodIds: [Int], wasCorrected: Bool) {
        let normStart = Self.normalizeTimeString(rawStartTime) ?? rawStartTime
        let normEnd = Self.normalizeTimeString(rawEndTime) ?? rawEndTime
        let activePeriods = Self.sortPeriodsLogically(self.periods)
        
        // 1. 若明確指定了節次 ID（例如 OCR 辨識出第 2, 3, 4 節 或 中午 100）
        if !explicitPeriodIds.isEmpty {
            let matched = Self.sortPeriodsLogically(activePeriods.filter { explicitPeriodIds.contains($0.id) })
            if let first = matched.first, let last = matched.last {
                let corrected = (first.startTime != rawStartTime || last.endTime != rawEndTime)
                return (first.startTime, last.endTime, matched.map { $0.id }, corrected)
            }
        }
        
        // 2. 否則透過時間匹配（可先對照舊節次表找節次 ID，再映射到最新節次表）
        let oldMatched = matchedPeriods(startTime: normStart, endTime: normEnd, in: referencePeriods ?? activePeriods)
        if !oldMatched.isEmpty {
            let ids = Set(oldMatched.map { $0.id })
            let newMatched = Self.sortPeriodsLogically(activePeriods.filter { ids.contains($0.id) })
            if let first = newMatched.first, let last = newMatched.last {
                let corrected = (first.startTime != rawStartTime || last.endTime != rawEndTime)
                return (first.startTime, last.endTime, newMatched.map { $0.id }, corrected)
            }
        }
        
        let correctedFormat = (normStart != rawStartTime || normEnd != rawEndTime)
        return (normStart, normEnd, [], correctedFormat)
    }
    
    /// 批次套用從 Gemini OCR 擷取到的節次作息時間表（支援更新既有節次、自動對齊中午時段、或新增晚間節次如第 11~14 節）
    public func applyExtractedPeriods(_ extracted: [ClassPeriod]) {
        guard !extracted.isEmpty else { return }
        var updatedMap = Dictionary(uniqueKeysWithValues: self.periods.map { ($0.id, $0) })
        var didExplicitlyUpdateNoon = false
        
        for item in extracted {
            guard let normStart = Self.normalizeTimeString(item.startTime),
                  let normEnd = Self.normalizeTimeString(item.endTime),
                  let sMin = Self.minutesFromMidnight(normStart),
                  let eMin = Self.minutesFromMidnight(normEnd),
                  eMin > sMin else { continue }
            
            if item.id == 100 || item.name.contains("中午") {
                didExplicitlyUpdateNoon = true
            }
            
            let cleanPeriod = ClassPeriod(
                id: item.id,
                name: item.name.isEmpty ? (item.id == 100 ? "中午" : "第 \(item.id) 節") : item.name,
                shortName: item.shortName ?? (item.id == 100 ? "中午" : "\(item.id)"),
                startTime: normStart,
                endTime: normEnd
            )
            updatedMap[item.id] = cleanPeriod
        }
        
        // 若 OCR 更新了第 4 節與第 5 節，但圖片未單獨標示「中午」時間，自動將「中午(100)」對齊至第 4 節結束與第 5 節開始之間，防止時間重疊
        if !didExplicitlyUpdateNoon,
           let p4 = updatedMap[4],
           let p5 = updatedMap[5],
           let p4EndMin = Self.minutesFromMidnight(p4.endTime),
           let p5StartMin = Self.minutesFromMidnight(p5.startTime),
           p5StartMin > p4EndMin {
            updatedMap[100] = ClassPeriod(
                id: 100,
                name: "中午",
                shortName: "中午",
                startTime: p4.endTime,
                endTime: p5.startTime
            )
        }
        
        self.periods = Self.sortPeriodsLogically(Array(updatedMap.values))
        savePeriods()
    }
    
    public static let defaultPeriods: [ClassPeriod] = [
        ClassPeriod(id: 1, name: "第 1 節", shortName: "1", startTime: "08:10", endTime: "09:00"),
        ClassPeriod(id: 2, name: "第 2 節", shortName: "2", startTime: "09:10", endTime: "10:00"),
        ClassPeriod(id: 3, name: "第 3 節", shortName: "3", startTime: "10:10", endTime: "11:00"),
        ClassPeriod(id: 4, name: "第 4 節", shortName: "4", startTime: "11:10", endTime: "12:00"),
        ClassPeriod(id: 100, name: "中午", shortName: "中午", startTime: "12:10", endTime: "13:10"),
        ClassPeriod(id: 5, name: "第 5 節", shortName: "5", startTime: "13:20", endTime: "14:10"),
        ClassPeriod(id: 6, name: "第 6 節", shortName: "6", startTime: "14:20", endTime: "15:10"),
        ClassPeriod(id: 7, name: "第 7 節", shortName: "7", startTime: "15:30", endTime: "16:20"),
        ClassPeriod(id: 8, name: "第 8 節", shortName: "8", startTime: "16:30", endTime: "17:20"),
        ClassPeriod(id: 9, name: "第 9 節", shortName: "9", startTime: "17:30", endTime: "18:20"),
        ClassPeriod(id: 10, name: "第 10 節", shortName: "10", startTime: "18:30", endTime: "19:20")
    ]
}
