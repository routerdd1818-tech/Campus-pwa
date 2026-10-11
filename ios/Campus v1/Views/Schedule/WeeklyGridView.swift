//
//  WeeklyGridView.swift
//  Campus v1
//

import SwiftUI

struct WeeklyGridView: View {
    @EnvironmentObject var dataManager: DataManager
    @ObservedObject var periodManager = PeriodScheduleManager.shared
    
    @State private var includeWeekend = false
    @State private var fitToScreen = true
    @State private var selectedCourse: Course? = nil
    
    private var displayedDays: [WeekDay] {
        if includeWeekend {
            return WeekDay.allCases
        } else {
            return [.monday, .tuesday, .wednesday, .thursday, .friday]
        }
    }
    
    // 計算當週各星期的具體公曆日期 (例如 9/21)
    private func dateString(for weekday: WeekDay) -> String {
        let calendar = Calendar.current
        let today = Date()
        let comp = calendar.dateComponents([.yearForWeekOfYear, .weekOfYear], from: today)
        let monday = calendar.date(from: comp)?.addingTimeInterval(86400) ?? today
        let offset = weekday.rawValue - 1
        if let targetDate = calendar.date(byAdding: .day, value: offset, to: monday) {
            let df = DateFormatter()
            df.dateFormat = "M/d"
            return df.string(from: targetDate)
        }
        return ""
    }
    
    var body: some View {
        GeometryReader { geo in
            VStack(spacing: 0) {
                // 頂部控制列：iOS 27 Liquid Glass 全螢幕全覽與週末開關
                HStack(spacing: 8) {
                    Image(systemName: "pawprint.fill")
                        .font(.system(size: 11, weight: .bold))
                        .foregroundColor(CalicoTheme.warmOrange)
                    Text("每週課表總覽")
                        .font(.system(.caption, design: .rounded).weight(.bold))
                        .foregroundColor(CalicoTheme.cocoaBrown)
                    
                    Spacer()
                    
                    Toggle(isOn: $fitToScreen) {
                        Text(fitToScreen ? "全屏完整" : "自由滾動")
                            .font(.system(size: 11, weight: .semibold, design: .rounded))
                    }
                    .toggleStyle(.button)
                    .tint(CalicoTheme.warmOrange)
                    
                    Toggle(isOn: $includeWeekend) {
                        Text(includeWeekend ? "含週末" : "僅工作日")
                            .font(.system(size: 11, weight: .semibold, design: .rounded))
                    }
                    .toggleStyle(.button)
                    .tint(CalicoTheme.cocoaBrown)
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 8)
                .background(.ultraThinMaterial)
                .overlay(alignment: .bottom) {
                    Divider().opacity(0.4)
                }
                
                let dayWidth = calculateColumnWidth(totalWidth: geo.size.width)
                
                // 課表網格主體
                ScrollView(fitToScreen ? [.vertical] : [.vertical, .horizontal]) {
                    VStack(spacing: 0) {
                        // 星期與具體日期標題行
                        HStack(spacing: 3) {
                            // 左上角節次欄
                            Text("節次")
                                .font(.system(size: 10, weight: .bold, design: .rounded))
                                .foregroundColor(.secondary)
                                .frame(width: 40, height: 42)
                                .background(CalicoTheme.warmSecondaryBackground)
                                .clipShape(RoundedRectangle(cornerRadius: 9, style: .continuous))
                            
                            ForEach(displayedDays) { day in
                                let isToday = WeekDay.from(date: Date()) == day
                                VStack(spacing: 1) {
                                    Text(dateString(for: day))
                                        .font(.system(size: 9, weight: .semibold, design: .rounded))
                                        .foregroundColor(isToday ? .white.opacity(0.92) : .secondary)
                                    Text(day.shortName)
                                        .font(.system(.caption2, design: .rounded).weight(isToday ? .bold : .semibold))
                                        .foregroundColor(isToday ? .white : .primary)
                                }
                                .frame(width: dayWidth, height: 42)
                                .background {
                                    if isToday {
                                        RoundedRectangle(cornerRadius: 10, style: .continuous)
                                            .fill(CalicoTheme.accentGradient)
                                    } else {
                                        RoundedRectangle(cornerRadius: 10, style: .continuous)
                                            .fill(CalicoTheme.warmSecondaryBackground)
                                    }
                                }
                                .overlay(
                                    RoundedRectangle(cornerRadius: 10, style: .continuous)
                                        .strokeBorder(isToday ? Color.white.opacity(0.5) : Color.white.opacity(0.35), lineWidth: 0.8)
                                )
                                .shadow(color: isToday ? CalicoTheme.warmOrange.opacity(0.25) : .clear, radius: 4, y: 2)
                            }
                        }
                        .padding(.vertical, 5)
                        
                        // 節次行（確保依 1~4 -> 中午 -> 5~14 邏輯順序排列）
                        let sortedPeriods = PeriodScheduleManager.sortPeriodsLogically(periodManager.periods)
                        ForEach(sortedPeriods) { period in
                            let isNoon = (period.id == 100 || period.name.contains("中午"))
                            HStack(spacing: 3) {
                                // 節次標籤
                                VStack(spacing: 1) {
                                    Text(period.displayCode)
                                        .font(.system(size: isNoon ? 10 : 12, weight: .bold, design: .rounded))
                                        .foregroundColor(isNoon ? CalicoTheme.warmOrange : .primary)
                                    Text(period.startTime)
                                        .font(.system(size: 8, weight: .medium, design: .rounded))
                                        .foregroundColor(isNoon ? CalicoTheme.warmOrange.opacity(0.85) : .secondary)
                                }
                                .frame(width: 40, height: isNoon ? 48 : 54)
                                .background(
                                    RoundedRectangle(cornerRadius: 8, style: .continuous)
                                        .fill(isNoon ? CalicoTheme.warmOrange.opacity(0.14) : CalicoTheme.warmCardBackground)
                                )
                                .overlay(
                                    RoundedRectangle(cornerRadius: 8, style: .continuous)
                                        .strokeBorder(isNoon ? CalicoTheme.warmOrange.opacity(0.35) : Color.white.opacity(0.4), lineWidth: 0.8)
                                )
                                
                                // 當節各星期的課堂
                                ForEach(displayedDays) { day in
                                    let coursesForDay = dataManager.courses(for: day.rawValue)
                                    let matchedCourse = coursesForDay.first { course in
                                        matchesPeriod(course: course, period: period, isNoon: isNoon)
                                    }
                                    
                                    cellView(course: matchedCourse, period: period, isNoon: isNoon)
                                        .frame(width: dayWidth, height: isNoon ? 48 : 54)
                                }
                            }
                            .padding(.vertical, 1.5)
                        }
                        
                        // 好友課表折疊檢視（不覆蓋自己的一週課表）
                        FriendScheduleCollapsibleCard()
                            .padding(.top, 14)
                            .padding(.bottom, 18)
                    }
                    .padding(8)
                    .frame(minWidth: fitToScreen ? geo.size.width : nil)
                }
            }
        }
        .sheet(item: $selectedCourse) { course in
            CourseDetailSheet(course: course)
        }
    }
    
    /// 判斷課程是否屬於該節次（特別強化「中午」時段 12:00~13:10 匹配）
    private func matchesPeriod(course: Course, period: ClassPeriod, isNoon: Bool) -> Bool {
        let matchedIds = periodManager.matchedPeriods(startTime: course.startTime, endTime: course.endTime).map { $0.id }
        if matchedIds.contains(period.id) {
            return true
        }
        if isNoon {
            if let cStart = timeToMinutes(course.startTime),
               let cEnd = timeToMinutes(course.endTime) {
                let pStart = timeToMinutes(period.startTime) ?? (12 * 60 + 10)
                let pEnd = timeToMinutes(period.endTime) ?? (13 * 60 + 10)
                // 同時涵蓋 12:00~13:10 午休區間
                let noonWindowStart = min(pStart, 12 * 60)
                let noonWindowEnd = max(pEnd, 13 * 60 + 10)
                let overlap = min(cEnd, noonWindowEnd) - max(cStart, noonWindowStart)
                if overlap >= 10 || (cStart >= 12 * 60 && cStart < 13 * 60 + 10) {
                    return true
                }
            }
        }
        if matchedIds.isEmpty {
            return course.startTime < period.endTime && course.endTime > period.startTime
        }
        return false
    }
    
    private func timeToMinutes(_ time: String) -> Int? {
        let cleaned = time.trimmingCharacters(in: .whitespacesAndNewlines).replacingOccurrences(of: "：", with: ":")
        let parts = cleaned.split(separator: ":")
        guard parts.count >= 2,
              let h = Int(parts[0].trimmingCharacters(in: .whitespaces)),
              let m = Int(parts[1].prefix(2).trimmingCharacters(in: .whitespaces)) else {
            return nil
        }
        return h * 60 + m
    }
    
    private func calculateColumnWidth(totalWidth: CGFloat) -> CGFloat {
        if fitToScreen {
            let dayCount = CGFloat(displayedDays.count)
            let periodWidth: CGFloat = 40
            let horizontalPadding: CGFloat = 16
            let spacings = CGFloat(displayedDays.count) * 3
            let available = totalWidth - periodWidth - horizontalPadding - spacings
            return max(44, available / dayCount)
        } else {
            return includeWeekend ? 58 : 72
        }
    }
    
    @ViewBuilder
    private func cellView(course: Course?, period: ClassPeriod, isNoon: Bool) -> some View {
        if let course = course {
            let matchedIds = periodManager.matchedPeriods(startTime: course.startTime, endTime: course.endTime).map { $0.id }
            let isFirstPeriod = matchedIds.isEmpty ? (course.startTime <= period.startTime) : (matchedIds.first == period.id)
            let baseColor = Color(hex: course.colorHex)
            Button {
                UIImpactFeedbackGenerator(style: .light).impactOccurred()
                selectedCourse = course
            } label: {
                ZStack {
                    RoundedRectangle(cornerRadius: 9, style: .continuous)
                        .fill(
                            LinearGradient(
                                colors: [
                                    baseColor.opacity(isFirstPeriod ? 0.94 : 0.82),
                                    baseColor.opacity(isFirstPeriod ? 0.82 : 0.72)
                                ],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                    
                    // iOS 27 Liquid Glass 頂部高光折射
                    RoundedRectangle(cornerRadius: 9, style: .continuous)
                        .fill(
                            LinearGradient(
                                colors: [Color.white.opacity(0.28), Color.clear],
                                startPoint: .topLeading,
                                endPoint: .center
                            )
                        )
                    
                    VStack(alignment: .leading, spacing: 2) {
                        Text(course.name)
                            .font(.system(size: 10, weight: .bold, design: .rounded))
                            .foregroundColor(.white)
                            .lineLimit(isNoon ? 1 : 2)
                        
                        if !course.classroom.isEmpty {
                            Text(course.classroom)
                                .font(.system(size: 8, weight: .medium, design: .rounded))
                                .foregroundColor(.white.opacity(0.92))
                                .lineLimit(1)
                        }
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.horizontal, 4)
                    .padding(.vertical, 3)
                }
                .overlay(
                    RoundedRectangle(cornerRadius: 9, style: .continuous)
                        .strokeBorder(Color.white.opacity(0.38), lineWidth: 0.8)
                )
                .shadow(color: baseColor.opacity(0.22), radius: 3, x: 0, y: 1.5)
            }
            .buttonStyle(.plain)
        } else {
            RoundedRectangle(cornerRadius: 8, style: .continuous)
                .fill(isNoon ? CalicoTheme.warmOrange.opacity(0.05) : CalicoTheme.warmCardBackground.opacity(0.55))
                .overlay(
                    RoundedRectangle(cornerRadius: 8, style: .continuous)
                        .strokeBorder(isNoon ? CalicoTheme.warmOrange.opacity(0.14) : Color.white.opacity(0.35), lineWidth: 0.6)
                )
        }
    }
}

// MARK: - 課程詳情彈窗
struct CourseDetailSheet: View {
    @Environment(\.dismiss) var dismiss
    let course: Course
    @State private var showingEditSheet = false
    
    var body: some View {
        NavigationStack {
            List {
                Section {
                    HStack {
                        RoundedRectangle(cornerRadius: 4)
                            .fill(Color(hex: course.colorHex))
                            .frame(width: 6, height: 40)
                        
                        VStack(alignment: .leading, spacing: 4) {
                            Text(course.name)
                                .font(.title3.weight(.bold))
                            if !course.code.isEmpty {
                                Text(course.code)
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }
                        }
                    }
                    .padding(.vertical, 4)
                }
                
                Section("時間與地點") {
                    Label("\(course.weekday.shortName) \(course.startTime) - \(course.endTime)", systemImage: "clock.fill")
                    if !course.classroom.isEmpty {
                        Label(course.classroom, systemImage: "mappin.and.ellipse")
                    }
                    if !course.instructor.isEmpty {
                        Label(course.instructor, systemImage: "person.fill")
                    }
                }
                
                Section {
                    Button {
                        showingEditSheet = true
                    } label: {
                        Label("編輯此課程", systemImage: "pencil")
                    }
                }
            }
            .navigationTitle("課程詳情")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("關閉") { dismiss() }
                }
            }
            .sheet(isPresented: $showingEditSheet) {
                EditCourseSheet(course: course)
            }
        }
        .presentationDetents([.medium])
    }
}
