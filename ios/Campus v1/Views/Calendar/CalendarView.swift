//
//  CalendarView.swift
//  Campus v1
//

import SwiftUI

struct CalendarView: View {
    @EnvironmentObject var dataManager: DataManager
    @State private var currentMonthDate = Date()
    @State private var selectedDate = Date()
    @State private var showingAddTodoSheet = false
    
    private let calendar = Calendar.current
    private let weekdaysHeader = ["日", "一", "二", "三", "四", "五", "六"]
    
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 16) {
                    // 月曆卡片
                    monthCalendarCard
                        .campusCardStyle()
                        .padding(.horizontal, 16)
                        .padding(.top, 10)
                    
                    // 選取日期的詳細行程清單
                    selectedDayAgendaSection
                        .padding(.horizontal, 16)
                        .padding(.bottom, 20)
                }
            }
            .background(CalicoTheme.warmPageBackground)
            .navigationTitle("行事曆")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .principal) {
                    HStack(spacing: 6) {
                        CalicoCatAvatar(size: 24, mood: .happy)
                        Text("可樂行事曆")
                            .font(.system(.headline, design: .rounded).weight(.bold))
                            .foregroundColor(.primary)
                    }
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        withAnimation {
                            currentMonthDate = Date()
                            selectedDate = Date()
                        }
                    } label: {
                        Text("今天")
                            .font(.system(.subheadline, design: .rounded).weight(.semibold))
                            .foregroundColor(CalicoTheme.warmOrange)
                    }
                }
            }
            .sheet(isPresented: $showingAddTodoSheet) {
                AddTodoSheet(preselectedDate: selectedDate)
            }
        }
    }
    
    // MARK: - 月曆卡片本體
    private var monthCalendarCard: some View {
        VStack(spacing: 14) {
            // 月份切換標題
            HStack {
                HStack(spacing: 6) {
                    Image(systemName: "pawprint.fill")
                        .font(.system(size: 13))
                        .foregroundColor(CalicoTheme.warmOrange)
                    Text(monthYearString(from: currentMonthDate))
                        .font(.system(.headline, design: .rounded))
                        .foregroundColor(.primary)
                }
                
                Spacer()
                
                HStack(spacing: 12) {
                    Button {
                        changeMonth(by: -1)
                    } label: {
                        Image(systemName: "chevron.left")
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundColor(CalicoTheme.cocoaBrown)
                            .frame(width: 32, height: 32)
                            .background(CalicoTheme.warmSecondaryBackground)
                            .clipShape(Circle())
                    }
                    
                    Button {
                        changeMonth(by: 1)
                    } label: {
                        Image(systemName: "chevron.right")
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundColor(CalicoTheme.cocoaBrown)
                            .frame(width: 32, height: 32)
                            .background(CalicoTheme.warmSecondaryBackground)
                            .clipShape(Circle())
                    }
                }
            }
            
            // 星期標題（日 一 二 三 四 五 六）
            HStack {
                ForEach(weekdaysHeader, id: \.self) { day in
                    Text(day)
                        .font(.system(.caption, design: .rounded).weight(.semibold))
                        .foregroundColor(day == "日" || day == "六" ? CalicoTheme.pawPink : .secondary)
                        .frame(maxWidth: .infinity)
                }
            }
            
            // 日期網格
            let days = daysInMonth(for: currentMonthDate)
            LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 4), count: 7), spacing: 8) {
                ForEach(days, id: \.self) { date in
                    dayCell(for: date)
                }
            }
        }
    }
    
    // MARK: - 單一日期單元格
    private func dayCell(for date: Date) -> some View {
        let isSelected = calendar.isDate(date, inSameDayAs: selectedDate)
        let isToday = calendar.isDateInToday(date)
        let isCurrentMonth = calendar.isDate(date, equalTo: currentMonthDate, toGranularity: .month)
        
        let indicators = dataManager.hasEvents(on: date)
        
        return Button {
            withAnimation(.spring(response: 0.25, dampingFraction: 0.7)) {
                selectedDate = date
                if !isCurrentMonth {
                    currentMonthDate = date
                }
            }
        } label: {
            VStack(spacing: 3) {
                Text("\(calendar.component(.day, from: date))")
                    .font(.system(.callout, design: .rounded).weight(isSelected ? .bold : (isToday ? .semibold : .regular)))
                    .foregroundColor(
                        isSelected ? .white :
                        (!isCurrentMonth ? .secondary :
                        (isToday ? CalicoTheme.warmOrange : .primary))
                    )
                
                // 動態圓點標記 (課堂與待辦)
                HStack(spacing: 2) {
                    if indicators.hasCourse {
                        Circle()
                            .fill(isSelected ? Color.white : CalicoTheme.warmOrange)
                            .frame(width: 4, height: 4)
                    }
                    if indicators.hasTodo {
                        Circle()
                            .fill(isSelected ? Color.white : CalicoTheme.pawPink)
                            .frame(width: 4, height: 4)
                    }
                }
                .frame(height: 4)
            }
            .frame(maxWidth: .infinity)
            .frame(height: 42)
            .background(
                Group {
                    if isSelected {
                        Circle()
                            .fill(CalicoTheme.warmOrange)
                    } else if isToday {
                        Circle()
                            .fill(CalicoTheme.warmOrange.opacity(0.15))
                    } else if !isCurrentMonth {
                        RoundedRectangle(cornerRadius: 8)
                            .fill(CalicoTheme.warmSecondaryBackground.opacity(0.6))
                    } else {
                        Color.clear
                    }
                }
            )
        }
        .buttonStyle(.plain)
    }
    
    // MARK: - 選定日期詳細行程
    private var selectedDayAgendaSection: some View {
        let courses = dataManager.courses(for: selectedDate)
        let todos = dataManager.todos(for: selectedDate)
        
        return VStack(alignment: .leading, spacing: 14) {
            // 選取日期標題列
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text(selectedDateFormatted)
                        .font(.system(.headline, design: .rounded))
                    Text("\(WeekDay.from(date: selectedDate).shortName)")
                        .font(.system(.subheadline, design: .rounded))
                        .foregroundColor(.secondary)
                }
                
                Spacer()
                
                Button {
                    showingAddTodoSheet = true
                } label: {
                    Label("新增待辦", systemImage: "plus")
                        .font(.system(.caption, design: .rounded).weight(.semibold))
                        .padding(.horizontal, 10)
                        .padding(.vertical, 6)
                        .background(CalicoTheme.warmOrange.opacity(0.14))
                        .foregroundColor(CalicoTheme.warmOrange)
                        .clipShape(Capsule())
                }
            }
            .padding(.top, 4)
            
            // 課表區塊
            VStack(alignment: .leading, spacing: 10) {
                HStack {
                    Image(systemName: "book.fill")
                        .foregroundColor(CalicoTheme.warmOrange)
                    Text("當日課程 (\(courses.count))")
                        .font(.system(.subheadline, design: .rounded).weight(.semibold))
                }
                
                if courses.isEmpty {
                    Text("當日無固定課表")
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .padding(.leading, 24)
                } else {
                    ForEach(courses) { course in
                        HStack(spacing: 12) {
                            RoundedRectangle(cornerRadius: 2)
                                .fill(Color(hex: course.colorHex))
                                .frame(width: 3, height: 36)
                            
                            VStack(alignment: .leading, spacing: 2) {
                                Text(course.name)
                                    .font(.subheadline.weight(.medium))
                                Text("\(course.startTime) - \(course.endTime) · \(course.classroom)")
                                    .font(.caption2)
                                    .foregroundColor(.secondary)
                            }
                            Spacer()
                        }
                        .padding(10)
                        .background(Color(.secondarySystemGroupedBackground))
                        .cornerRadius(10)
                    }
                }
            }
            
            Divider()
            
            // 當日待辦事項區塊
            VStack(alignment: .leading, spacing: 10) {
                HStack {
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundColor(.orange)
                    Text("當日待辦 (\(todos.count))")
                        .font(.subheadline.weight(.semibold))
                }
                
                if todos.isEmpty {
                    Text("當天沒有待辦或進行中事項")
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .padding(.leading, 24)
                } else {
                    ForEach(todos) { todo in
                        HStack(spacing: 12) {
                            Button {
                                withAnimation {
                                    dataManager.toggleTodoCompletion(id: todo.id)
                                }
                            } label: {
                                Image(systemName: todo.isCompleted ? "checkmark.circle.fill" : "circle")
                                    .foregroundColor(todo.isCompleted ? .green : .secondary)
                                    .font(.title3)
                            }
                            .buttonStyle(.plain)
                            
                            VStack(alignment: .leading, spacing: 3) {
                                Text(todo.title)
                                    .font(.subheadline)
                                    .strikethrough(todo.isCompleted)
                                    .foregroundColor(todo.isCompleted ? .secondary : .primary)
                                
                                HStack(spacing: 6) {
                                    HStack(spacing: 3) {
                                        Image(systemName: todo.category.iconName)
                                            .font(.system(size: 9))
                                        Text(todo.displayCategoryName)
                                    }
                                    .font(.caption2.weight(.bold))
                                    .foregroundColor(Color(hex: todo.displayCategoryColorHex))
                                    .padding(.horizontal, 6)
                                    .padding(.vertical, 3)
                                    .background(Color(hex: todo.displayCategoryColorHex).opacity(0.12))
                                    .cornerRadius(4)

                                    PriorityBadge(priority: todo.priority)
                                    
                                    if let periodText = todo.periodText {
                                        HStack(spacing: 3) {
                                            Image(systemName: "clock.arrow.2.circlepath")
                                                .font(.system(size: 8))
                                            Text(periodText)
                                                .font(.system(size: 9, weight: .medium))
                                        }
                                        .foregroundColor(.indigo)
                                        .padding(.horizontal, 5)
                                        .padding(.vertical, 2)
                                        .background(Color.indigo.opacity(0.1))
                                        .clipShape(Capsule())
                                    }
                                }
                            }
                            Spacer()
                        }
                        .padding(10)
                        .background(Color(.secondarySystemGroupedBackground))
                        .cornerRadius(10)
                    }
                }
            }
        }
        .campusCardStyle()
    }
    
    // MARK: - 日期運算輔助
    private func monthYearString(from date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy 年 M 月"
        return formatter.string(from: date)
    }
    
    private var selectedDateFormatted: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "M 月 d 日"
        return formatter.string(from: selectedDate)
    }
    
    private func changeMonth(by amount: Int) {
        if let newDate = calendar.date(byAdding: .month, value: amount, to: currentMonthDate) {
            currentMonthDate = newDate
        }
    }
    
    private func daysInMonth(for date: Date) -> [Date] {
        guard let monthInterval = calendar.dateInterval(of: .month, for: date) else { return [] }
        let firstDay = monthInterval.start
        
        // 算出該月第一天是星期幾 (Sunday = 1 ... Saturday = 7)
        let firstWeekday = calendar.component(.weekday, from: firstDay)
        let leadingEmptyCount = firstWeekday - 1
        
        guard let range = calendar.range(of: .day, in: .month, for: date) else { return [] }
        let totalDays = range.count
        
        var result: [Date] = []
        
        // 上個月底部補齊日期（灰底，但數字正常顯示）
        for p in 0..<leadingEmptyCount {
            if let prevDate = calendar.date(byAdding: .day, value: -(leadingEmptyCount - p), to: firstDay) {
                result.append(prevDate)
            }
        }
        
        // 當月所有日期
        for day in 0..<totalDays {
            if let dayDate = calendar.date(byAdding: .day, value: day, to: firstDay) {
                result.append(dayDate)
            }
        }
        
        // 下個月開頭補齊日期（灰底，但數字正常接續 1, 2, 3, 4...）
        var nextDayOffset = 1
        if let lastDay = calendar.date(byAdding: .day, value: totalDays - 1, to: firstDay) {
            while result.count % 7 != 0 {
                if let nextDate = calendar.date(byAdding: .day, value: nextDayOffset, to: lastDay) {
                    result.append(nextDate)
                }
                nextDayOffset += 1
            }
        }
        
        return result
    }
}
