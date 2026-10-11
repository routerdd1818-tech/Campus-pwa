//
//  LockScreenPreviewSheet.swift
//  Campus v1
//
//  Created for Campus v1 (可樂助手).
//

import SwiftUI
import WidgetKit

struct LockScreenPreviewSheet: View {
    @Environment(\.dismiss) var dismiss
    @EnvironmentObject var dataManager: DataManager
    @State private var showingSyncSuccess = false
    
    private var today: Date { Date() }
    
    private var dateHeaderString: String {
        let df = DateFormatter()
        df.locale = Locale(identifier: "zh_Hant_TW")
        df.dateFormat = "M月d日 EEEE"
        return df.string(from: today)
    }
    
    private var timeString: String {
        let df = DateFormatter()
        df.dateFormat = "HH:mm"
        return df.string(from: today)
    }
    
    var body: some View {
        NavigationStack {
            ZStack {
                // 背景：模擬鎖定畫面桌布（漸層與微光藍天）
                LinearGradient(
                    colors: [
                        Color(red: 0.08, green: 0.28, blue: 0.48),
                        Color(red: 0.12, green: 0.42, blue: 0.62),
                        Color(red: 0.25, green: 0.55, blue: 0.72)
                    ],
                    startPoint: .top,
                    endPoint: .bottom
                )
                .ignoresSafeArea()
                
                ScrollView {
                    VStack(spacing: 16) {
                        // 1. 頂部日期與時間（仿 iOS 鎖定畫面）
                        VStack(spacing: 2) {
                            Text(dateHeaderString)
                                .font(.system(size: 15, weight: .medium))
                                .foregroundColor(.white.opacity(0.85))
                            
                            Text(timeString)
                                .font(.system(size: 76, weight: .thin, design: .rounded))
                                .foregroundColor(.cyan.opacity(0.95))
                                .shadow(color: .black.opacity(0.3), radius: 8, x: 0, y: 4)
                        }
                        .padding(.top, 10)
                        
                        // 2. 三花貓可樂暖心陪伴標章
                        HStack(spacing: 6) {
                            Image(systemName: "pawprint.fill")
                                .font(.system(size: 12))
                                .foregroundColor(Color(red: 0.94, green: 0.47, blue: 0.55))
                            Text("三花貓可樂・陪你度過充實的一天")
                                .font(.system(size: 13, weight: .medium, design: .rounded))
                                .foregroundColor(.white.opacity(0.92))
                        }
                        .padding(.horizontal, 14)
                        .padding(.vertical, 6)
                        .background(Capsule().fill(Color.white.opacity(0.14)))
                        .padding(.horizontal)
                        
                        // 3. 毛玻璃核心小工具卡片 (依據截圖設計)
                        VStack(alignment: .leading, spacing: 14) {
                            // (A) 一週課表 (7 天網格)
                            weeklyGridView
                            
                            Divider()
                                .background(Color.white.opacity(0.2))
                            
                            // (B) 今日行程 (左側彩色豎條)
                            todayScheduleSection
                            
                            Divider()
                                .background(Color.white.opacity(0.2))
                            
                            // (C) 提醒事項 (小圓點與待辦清單)
                            remindersSection
                        }
                        .padding(16)
                        .background(
                            RoundedRectangle(cornerRadius: 22, style: .continuous)
                                .fill(Color.black.opacity(0.38))
                                .background(.ultraThinMaterial)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 22, style: .continuous)
                                        .stroke(Color.white.opacity(0.18), lineWidth: 1)
                                )
                        )
                        .padding(.horizontal, 16)
                        
                        // 4. 手動同步與小工具教學
                        VStack(spacing: 12) {
                            Button {
                                dataManager.syncToWidgets()
                                withAnimation {
                                    showingSyncSuccess = true
                                }
                                DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
                                    withAnimation {
                                        showingSyncSuccess = false
                                    }
                                }
                            } label: {
                                HStack(spacing: 8) {
                                    Image(systemName: showingSyncSuccess ? "checkmark.circle.fill" : "arrow.triangle.2.circlepath")
                                    Text(showingSyncSuccess ? "小工具已同步更新！" : "立即手動同步至桌面/鎖定螢幕小工具")
                                }
                                .font(.system(size: 14, weight: .bold))
                                .foregroundColor(.white)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 14)
                                .background(showingSyncSuccess ? Color.green : Color.cyan.opacity(0.85))
                                .cornerRadius(12)
                            }
                            
                            VStack(alignment: .leading, spacing: 6) {
                                Text("💡 如何在桌面與鎖定畫面新增可樂助手小工具：")
                                    .font(.caption.weight(.bold))
                                    .foregroundColor(.white)
                                Text("1. 長按鎖定畫面或 iPhone 桌面空白處進入編輯狀態。")
                                Text("2. 點擊「+」新增小工具，搜尋「可樂助手」或「可樂助手小工具」。")
                                Text("3. 選擇【一週課表全覽】或【課表與今日行程】即可享受同款半透明毛玻璃質感！")
                            }
                            .font(.caption2)
                            .foregroundColor(.white.opacity(0.8))
                            .padding(14)
                            .background(Color.black.opacity(0.25))
                            .cornerRadius(12)
                        }
                        .padding(.horizontal, 16)
                        .padding(.bottom, 30)
                    }
                }
            }
            .navigationTitle("鎖定畫面小工具效果")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("完成") {
                        dismiss()
                    }
                    .foregroundColor(.white)
                }
            }
            .toolbarBackground(.hidden, for: .navigationBar)
        }
    }
    
    // MARK: - 一週課表 (7 天網格)
    private var weeklyGridView: some View {
        let cal = Calendar(identifier: .gregorian)
        let currentComp = cal.component(.weekday, from: today)
        let daysFromMonday = (currentComp == 1) ? 6 : (currentComp - 2)
        let mondayDate = cal.date(byAdding: .day, value: -daysFromMonday, to: cal.startOfDay(for: today)) ?? today
        let weekdaysNames = ["週一", "週二", "週三", "週四", "週五", "週六", "週日"]
        let dfDayNum = DateFormatter()
        dfDayNum.dateFormat = "d"
        
        return VStack(alignment: .leading, spacing: 6) {
            HStack(alignment: .top, spacing: 4) {
                ForEach(1...7, id: \.self) { w in
                    let colDate = cal.date(byAdding: .day, value: w - 1, to: mondayDate) ?? today
                    let colDayNum = dfDayNum.string(from: colDate)
                    let isToday = cal.isDate(colDate, inSameDayAs: today)
                    let colCourses = dataManager.courses(for: w)
                    
                    VStack(spacing: 3) {
                        VStack(spacing: 1) {
                            Text(weekdaysNames[w - 1])
                                .font(.system(size: 8, weight: isToday ? .bold : .medium))
                                .foregroundColor(isToday ? .white : .white.opacity(0.75))
                            Text(colDayNum)
                                .font(.system(size: 10, weight: isToday ? .heavy : .semibold))
                                .foregroundColor(isToday ? .white : .white.opacity(0.9))
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 3)
                        .background(
                            isToday ?
                            LinearGradient(colors: [.blue, .cyan], startPoint: .top, endPoint: .bottom) :
                            LinearGradient(colors: [Color.white.opacity(0.12), Color.white.opacity(0.06)], startPoint: .top, endPoint: .bottom)
                        )
                        .cornerRadius(4)
                        
                        if colCourses.isEmpty {
                            Text("—")
                                .font(.system(size: 8))
                                .foregroundColor(.white.opacity(0.25))
                                .frame(height: 24)
                        } else {
                            VStack(spacing: 2) {
                                ForEach(colCourses.prefix(2)) { c in
                                    VStack(alignment: .leading, spacing: 1) {
                                        Text(c.startTime)
                                            .font(.system(size: 7, weight: .medium))
                                            .foregroundColor(.white.opacity(0.85))
                                            .lineLimit(1)
                                        Text(c.name)
                                            .font(.system(size: 8, weight: .bold))
                                            .foregroundColor(.white)
                                            .lineLimit(1)
                                    }
                                    .padding(2)
                                    .frame(maxWidth: .infinity, alignment: .leading)
                                    .background(Color(hex: c.colorHex).opacity(0.85))
                                    .cornerRadius(3)
                                }
                            }
                        }
                    }
                    .frame(maxWidth: .infinity)
                }
            }
        }
    }
    
    // MARK: - 今日行程 (左側彩色豎條)
    private var todayScheduleSection: some View {
        let weekday = WeekDay.from(date: today).rawValue
        let todayCourses = dataManager.courses(for: weekday)
        
        return VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text("今日行程")
                    .font(.system(size: 14, weight: .bold))
                    .foregroundColor(.white)
                Spacer()
                Text("共 \(todayCourses.count) 堂課")
                    .font(.system(size: 11))
                    .foregroundColor(.white.opacity(0.65))
            }
            
            if todayCourses.isEmpty {
                HStack(spacing: 8) {
                    Capsule().fill(Color.cyan).frame(width: 3.5, height: 26)
                    VStack(alignment: .leading, spacing: 2) {
                        Text("今日無排課")
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundColor(.white)
                        Text("享受自由空堂時光")
                            .font(.system(size: 10))
                            .foregroundColor(.white.opacity(0.7))
                    }
                }
            } else {
                VStack(spacing: 6) {
                    ForEach(todayCourses) { c in
                        HStack(alignment: .center, spacing: 8) {
                            Capsule()
                                .fill(Color(hex: c.colorHex))
                                .frame(width: 3.5, height: 28)
                            
                            VStack(alignment: .leading, spacing: 2) {
                                Text("\(c.startTime) - \(c.endTime)")
                                    .font(.system(size: 10, weight: .medium))
                                    .foregroundColor(.white.opacity(0.75))
                                HStack(spacing: 6) {
                                    Text(c.name)
                                        .font(.system(size: 13, weight: .bold))
                                        .foregroundColor(.white)
                                        .lineLimit(1)
                                    if !c.classroom.isEmpty {
                                        Text("· \(c.classroom)")
                                            .font(.system(size: 11))
                                            .foregroundColor(.white.opacity(0.65))
                                            .lineLimit(1)
                                    }
                                }
                            }
                            Spacer()
                        }
                    }
                }
            }
        }
    }
    
    // MARK: - 提醒事項 (小圓點與待辦清單)
    private var remindersSection: some View {
        let pending = dataManager.todos.filter { !$0.isCompleted }
        
        return VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text("提醒事項")
                    .font(.system(size: 14, weight: .bold))
                    .foregroundColor(.white)
                Spacer()
                Text("剩餘 \(pending.count) 項")
                    .font(.system(size: 11))
                    .foregroundColor(.white.opacity(0.65))
            }
            
            if pending.isEmpty {
                HStack(spacing: 6) {
                    Circle().fill(Color.green).frame(width: 6, height: 6)
                    Text("太棒了，所有待辦與作業均已完成！")
                        .font(.system(size: 12))
                        .foregroundColor(.white.opacity(0.8))
                }
            } else {
                VStack(spacing: 6) {
                    ForEach(pending.prefix(4)) { item in
                        HStack(spacing: 6) {
                            Circle()
                                .fill(item.priority == .high ? Color.red : Color.orange)
                                .frame(width: 6, height: 6)
                            Text(item.title)
                                .font(.system(size: 12, weight: .medium))
                                .foregroundColor(.white)
                                .lineLimit(1)
                            Spacer()
                            Text(item.countdownBadgeText)
                                .font(.system(size: 9, weight: .bold))
                                .foregroundColor(item.priority == .high ? .red : .yellow)
                                .padding(.horizontal, 5)
                                .padding(.vertical, 2)
                                .background(Color.white.opacity(0.12))
                                .cornerRadius(4)
                        }
                    }
                }
            }
        }
    }
}
