//
//  TodayOverviewView.swift
//  Campus v1
//
//  Created for Campus v1.
//

import SwiftUI

/// Google 日曆風格時間軸的時段新增參數
private struct TimelineHourSelection: Identifiable {
    let id = UUID()
    let date: Date
    let hour: Int
}

/// 「今天要做什麼 ＆ 功課有什麼」子分頁
private enum TodayTaskFilterTab: String, CaseIterable, Identifiable {
    case todayTodo = "今天要做什麼"
    case homework = "功課有什麼"
    case completed = "已完成"
    
    var id: String { rawValue }
}

struct TodayOverviewView: View {
    @EnvironmentObject var dataManager: DataManager
    var isStandaloneTab: Bool = true
    
    private static let fullDateFormatter: DateFormatter = {
        let f = DateFormatter()
        f.locale = Locale(identifier: "zh_Hant_TW")
        f.dateFormat = "yyyy 年 M 月 d 日 EEEE"
        return f
    }()
    
    private static let shortDateFormatter: DateFormatter = {
        let f = DateFormatter()
        f.locale = Locale(identifier: "zh_Hant_TW")
        f.dateFormat = "M/d (E)"
        return f
    }()
    
    private static let hourMinFormatter: DateFormatter = {
        let f = DateFormatter()
        f.locale = Locale(identifier: "en_US_POSIX")
        f.dateFormat = "HH:mm"
        return f
    }()
    
    // MARK: - 日期與行事曆時間軸狀態
    @State private var selectedDate: Date = Date()
    @State private var compactTimelineMode: Bool = true
    @State private var timelineHourToCreate: TimelineHourSelection? = nil
    @State private var showingAddTodoSheet: Bool = false
    @State private var todoToEdit: TodoItem? = nil
    @State private var selectedCourseDetail: Course? = nil
    
    // 行事曆下方一秒快速新增狀態
    @State private var quickTodoTitle: String = ""
    @State private var quickTodoCategory: TodoCategory = .todo
    @State private var quickTodoHour: Int? = nil // nil 代表全天/不指定小時
    
    // MARK: - 今天要做什麼 ＆ 功課有什麼 狀態
    @State private var selectedTaskTab: TodayTaskFilterTab = .todayTodo
    
    // MARK: - 記帳與飲食快捷記帳狀態
    @State private var selectedMeal: FoodMealType = .lunch
    @State private var mealAmount: String = "100"
    @State private var mealNote: String = ""
    @State private var selectedPayment: String = "現金"
    @State private var mealScore: Int = 8
    @State private var showSuccessBanner: Bool = false
    @State private var successMessage: String = ""
    
    @State private var showingAddTransactionSheet: Bool = false
    @State private var transactionToEdit: TransactionItem? = nil
    @State private var showingPeerReviewSheet: Bool = false
    
    // MARK: - 頂部導覽列工具 Sheet 狀態
    @State private var showingShareSheet: Bool = false
    @State private var showingLineBotSheet: Bool = false
    @State private var showingLockScreenPreview: Bool = false
    @State private var showingDatePickerPopover: Bool = false
    
    private let commonAmounts: [Double] = [50, 70, 100, 120, 150, 200]
    
    var body: some View {
        Group {
            if isStandaloneTab {
                NavigationStack {
                    mainScrollContent
                        .navigationTitle("今日總覽")
                        .navigationBarTitleDisplayMode(.inline)
                        .toolbar {
                            todayToolbarContent
                        }
                }
            } else {
                mainScrollContent
            }
        }
        .sheet(isPresented: $showingAddTodoSheet) {
            AddTodoSheet(preselectedDate: selectedDate)
        }
        .sheet(item: $timelineHourToCreate) { slot in
            AddTodoSheet(preselectedDate: slot.date, preselectedStartHour: slot.hour)
        }
        .sheet(item: $todoToEdit) { item in
            AddTodoSheet(todoToEdit: item)
        }
        .sheet(item: $selectedCourseDetail) { course in
            EditCourseSheet(course: course)
        }
        .sheet(isPresented: $showingAddTransactionSheet) {
            AddTransactionSheet()
        }
        .sheet(item: $transactionToEdit) { tx in
            AddTransactionSheet(transactionToEdit: tx)
        }
        .sheet(isPresented: $showingPeerReviewSheet) {
            PeerExpenseReviewView(isModal: true)
        }
        .sheet(isPresented: $showingShareSheet) {
            ShareCalendarSheet()
        }
        .sheet(isPresented: $showingLineBotSheet) {
            LineBotSettingsSheet()
        }
        .sheet(isPresented: $showingLockScreenPreview) {
            LockScreenPreviewSheet()
        }
    }
    
    // MARK: - 主捲動內容
    private var mainScrollContent: some View {
        ScrollView {
            VStack(spacing: 18) {
                // 1. 頂部問候 + 7日日期快速切換 + 四大核心指標總覽 (課表 / 待辦 / 功課 / 今日花費)
                headerAndSnapshotCard
                
                // 2. Google 日曆風格「當日行事曆時間軸 (融入 To-Do List)」
                googleDayTimelineSection
                
                // 3. 「今天要做什麼 ＆ 功課有什麼」專區
                todayTasksAndHomeworkSection
                
                // 4. 「查詢今日課表」專區
                todayCoursesSection
                
                // 5. 「今天花多少」今日開銷統整 + 飲食快速記帳
                todayExpenseSummarySection
                
                foodQuickAccountingSection
                
                Spacer(minLength: 40)
            }
            .padding(.vertical, 12)
        }
        .background(CalicoTheme.warmPageBackground)
        .onTapGesture { hideKeyboard() }
        .overlay(successBannerOverlay)
        .toolbar {
            ToolbarItemGroup(placement: .keyboard) {
                Spacer()
                Button("完成") { hideKeyboard() }
            }
        }
    }
    
    // MARK: - 頂部導覽列按鈕
    @ToolbarContentBuilder
    private var todayToolbarContent: some ToolbarContent {
        ToolbarItem(placement: .principal) {
            HStack(spacing: 6) {
                CalicoCatAvatar(size: 24, mood: .happy)
                Text("今日生活總覽")
                    .font(.system(.headline, design: .rounded).weight(.bold))
                    .foregroundColor(.primary)
            }
        }
        
        ToolbarItem(placement: .topBarLeading) {
            HStack(spacing: 10) {
                Button {
                    showingShareSheet = true
                } label: {
                    Image(systemName: "person.2.wave.2.fill")
                        .font(.system(size: 14))
                        .foregroundColor(CalicoTheme.warmOrange)
                }
                
                Button {
                    showingLineBotSheet = true
                } label: {
                    Image(systemName: "message.badge.waveform.fill")
                        .font(.system(size: 14))
                        .foregroundColor(.green)
                }
                
                Button {
                    showingLockScreenPreview = true
                } label: {
                    Image(systemName: "platter.filled.top.iphone")
                        .font(.system(size: 14))
                        .foregroundColor(CalicoTheme.cocoaBrown)
                }
            }
        }
        
        ToolbarItem(placement: .topBarTrailing) {
            HStack(spacing: 8) {
                Button {
                    showingAddTodoSheet = true
                } label: {
                    HStack(spacing: 3) {
                        Image(systemName: "calendar.badge.plus")
                        Text("事項")
                    }
                    .font(.caption.weight(.bold))
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(CalicoTheme.pawPink.opacity(0.15))
                    .foregroundColor(CalicoTheme.pawPink)
                    .clipShape(Capsule())
                }
                
                Button {
                    showingAddTransactionSheet = true
                } label: {
                    HStack(spacing: 3) {
                        Image(systemName: "dollarsign.circle.fill")
                        Text("記帳")
                    }
                    .font(.caption.weight(.bold))
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(CalicoTheme.warmOrange.opacity(0.15))
                    .foregroundColor(CalicoTheme.warmOrange)
                    .clipShape(Capsule())
                }
            }
        }
    }
    
    // MARK: - 浮動成功提示
    private var successBannerOverlay: some View {
        Group {
            if showSuccessBanner {
                VStack(spacing: 10) {
                    CalicoCatAvatar(size: 64, mood: .happy)
                    Text(successMessage)
                        .font(.system(.headline, design: .rounded))
                        .foregroundColor(.primary)
                        .multilineTextAlignment(.center)
                }
                .padding(24)
                .background(CalicoTheme.warmCardBackground.opacity(0.98))
                .cornerRadius(22)
                .overlay(
                    RoundedRectangle(cornerRadius: 22, style: .continuous)
                        .stroke(CalicoTheme.warmOrange.opacity(0.25), lineWidth: 1.5)
                )
                .shadow(color: CalicoTheme.cocoaBrown.opacity(0.18), radius: 20, x: 0, y: 8)
                .transition(.scale.combined(with: .opacity))
                .zIndex(100)
            }
        }
    }
    
    // MARK: - 資料計算輔助屬性
    private var isSelectedDateToday: Bool {
        Calendar.current.isDateInToday(selectedDate)
    }
    
    private var selectedWeekday: Int {
        WeekDay.from(date: selectedDate).rawValue
    }
    
    private var selectedDayCourses: [Course] {
        dataManager.courses(for: selectedWeekday)
    }
    
    private var selectedDayTodos: [TodoItem] {
        dataManager.todos(for: selectedDate)
    }
    
    private var pendingDayTodos: [TodoItem] {
        selectedDayTodos.filter { !$0.isCompleted }
    }
    
    private var homeworkCategories: Set<TodoCategory> {
        [.assignment, .exam, .project, .paper]
    }
    
    /// 當日功課/作業/考試/報告 + 未來 7 天內未完成功課
    private var dayHomeworkItems: [TodoItem] {
        selectedDayTodos.filter { homeworkCategories.contains($0.category) }
    }
    
    private var upcomingHomeworkItems: [TodoItem] {
        let cal = Calendar.current
        let startOfSelected = cal.startOfDay(for: selectedDate)
        guard let sevenDaysLater = cal.date(byAdding: .day, value: 7, to: startOfSelected) else { return [] }
        return dataManager.todos.filter { item in
            guard !item.isCompleted, homeworkCategories.contains(item.category) else { return false }
            guard let due = item.dueDate else { return true }
            return due >= startOfSelected && due <= sevenDaysLater
        }
        .sorted { ($0.dueDate ?? .distantFuture) < ($1.dueDate ?? .distantFuture) }
    }
    
    private var selectedDayExpenses: [TransactionItem] {
        dataManager.transactions.filter {
            Calendar.current.isDate($0.date, inSameDayAs: selectedDate) && $0.type == .expense
        }
    }
    
    private var selectedDayTotalExpense: Double {
        selectedDayExpenses.reduce(0) { $0 + $1.amount }
    }
    
    // MARK: - 1. 頂部問候 + 日期切換 + 四大核心指標總覽
    private var headerAndSnapshotCard: some View {
        let dateString = Self.fullDateFormatter.string(from: selectedDate)
        
        let hour = Calendar.current.component(.hour, from: Date())
        let greetingTitle: String = {
            if !isSelectedDateToday {
                return "正在檢視 \(Self.shortDateFormatter.string(from: selectedDate)) 的行程"
            }
            if hour < 11 {
                return "早安喵～今天要做什麼都幫你整理好囉！"
            } else if hour < 14 {
                return "午安喵～別忘了記錄午餐與查看下午行程！"
            } else if hour < 18 {
                return "下午好喵～可樂陪你把今日待辦與功課清光！"
            } else {
                return "晚安喵～檢視一下今天花多少與明日準備吧！"
            }
        }()
        
        return VStack(spacing: 14) {
            // 頂部問候與日期標題
            HStack(spacing: 12) {
                VStack(alignment: .leading, spacing: 5) {
                    HStack(spacing: 6) {
                        Image(systemName: "pawprint.fill")
                            .font(.system(size: 10))
                            .foregroundColor(CalicoTheme.warmOrange)
                        Text(dateString)
                            .font(.system(size: 12, weight: .semibold, design: .rounded))
                            .foregroundColor(CalicoTheme.cocoaBrown.opacity(0.85))
                        
                        if !isSelectedDateToday {
                            Button {
                                withAnimation(.spring(response: 0.3, dampingFraction: 0.75)) {
                                    selectedDate = Date()
                                }
                            } label: {
                                Text("回今天")
                                    .font(.system(size: 10, weight: .bold, design: .rounded))
                                    .padding(.horizontal, 7)
                                    .padding(.vertical, 2)
                                    .background(CalicoTheme.warmOrange)
                                    .foregroundColor(.white)
                                    .clipShape(Capsule())
                            }
                        }
                        
                        Button {
                            showingDatePickerPopover.toggle()
                        } label: {
                            Image(systemName: "calendar")
                                .font(.system(size: 12, weight: .semibold))
                                .foregroundColor(CalicoTheme.warmOrange)
                        }
                        .popover(isPresented: $showingDatePickerPopover) {
                            VStack {
                                DatePicker(
                                    "選擇日期",
                                    selection: $selectedDate,
                                    displayedComponents: [.date]
                                )
                                .datePickerStyle(.graphical)
                                .padding()
                            }
                            .frame(minWidth: 300, minHeight: 320)
                            .presentationCompactAdaptation(.popover)
                        }
                    }
                    
                    Text(greetingTitle)
                        .font(.system(size: 17, weight: .bold, design: .rounded))
                        .foregroundColor(.primary)
                        .fixedSize(horizontal: false, vertical: true)
                }
                
                Spacer(minLength: 4)
                
                VStack(spacing: 2) {
                    CalicoCatAvatar(size: 50, mood: selectedDayCourses.isEmpty ? .happy : .studying)
                    Text("可樂日曆管家")
                        .font(.system(size: 9, weight: .bold, design: .rounded))
                        .foregroundColor(CalicoTheme.cocoaBrown.opacity(0.75))
                }
            }
            
            // 7 日快速切換膠囊列
            weekDayStripBar
            
            // 四大核心指標總覽 (今日課表 / 今天要做什麼 / 功課有什麼 / 今天花多少)
            LazyVGrid(columns: [GridItem(.flexible(), spacing: 10), GridItem(.flexible(), spacing: 10)], spacing: 10) {
                // 1. 查詢今日課表
                snapshotMetricTile(
                    icon: "book.closed.fill",
                    title: "查詢今日課表",
                    value: selectedDayCourses.isEmpty ? "今日無課" : "\(selectedDayCourses.count) 堂課",
                    subtitle: nextCourseSubtitle,
                    accentColor: CalicoTheme.warmOrange
                ) {
                    if let first = selectedDayCourses.first {
                        selectedCourseDetail = first
                    }
                }
                
                // 2. 今天要做什麼
                snapshotMetricTile(
                    icon: "checklist.checked",
                    title: "今天要做什麼",
                    value: pendingDayTodos.isEmpty ? "全部完成" : "待辦 \(pendingDayTodos.count) 項",
                    subtitle: "今日共 \(selectedDayTodos.count) 項行程與事項",
                    accentColor: CalicoTheme.pawPink
                ) {
                    withAnimation {
                        selectedTaskTab = .todayTodo
                    }
                }
                
                // 3. 功課有什麼
                let pendingHWCount = upcomingHomeworkItems.count
                snapshotMetricTile(
                    icon: "graduationcap.fill",
                    title: "功課有什麼",
                    value: pendingHWCount == 0 ? "無待交功課" : "\(pendingHWCount) 項功課",
                    subtitle: upcomingHomeworkItems.first.map { "最近：\($0.title)" } ?? "作業‧考試‧報告都完成囉",
                    accentColor: .indigo
                ) {
                    withAnimation {
                        selectedTaskTab = .homework
                    }
                }
                
                // 4. 今天花多少
                snapshotMetricTile(
                    icon: "dollarsign.circle.fill",
                    title: "今天花多少",
                    value: "NT$ \(Int(selectedDayTotalExpense))",
                    subtitle: selectedDayExpenses.isEmpty ? "點擊快速記一筆開銷" : "已記 \(selectedDayExpenses.count) 筆消費",
                    accentColor: CalicoTheme.sageGreen
                ) {
                    showingAddTransactionSheet = true
                }
            }
        }
        .padding(16)
        .background(
            RoundedRectangle(cornerRadius: 24, style: .continuous)
                .fill(CalicoTheme.warmCardBackground)
                .overlay(
                    RoundedRectangle(cornerRadius: 24, style: .continuous)
                        .fill(
                            LinearGradient(
                                colors: [
                                    Color.white.opacity(0.45),
                                    CalicoTheme.warmOrange.opacity(0.08),
                                    CalicoTheme.pawPink.opacity(0.06)
                                ],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                )
                .overlay(
                    RoundedRectangle(cornerRadius: 24, style: .continuous)
                        .strokeBorder(CalicoTheme.glassBorderGradient, lineWidth: 1.2)
                )
                .shadow(color: CalicoTheme.cocoaBrown.opacity(0.06), radius: 12, x: 0, y: 5)
        )
        .padding(.horizontal, 16)
    }
    
    private var nextCourseSubtitle: String {
        guard !selectedDayCourses.isEmpty else { return "自由安排自習或休息時光" }
        let nowStr = Self.hourMinFormatter.string(from: Date())
        if isSelectedDateToday,
           let upcoming = selectedDayCourses.first(where: { $0.endTime >= nowStr }) {
            return "\(upcoming.startTime) \(upcoming.name)"
        }
        if let first = selectedDayCourses.first {
            return "\(first.startTime) \(first.name)"
        }
        return ""
    }
    
    private var weekDayStripBar: some View {
        let cal = Calendar.current
        let centerDate = cal.startOfDay(for: selectedDate)
        let days: [Date] = (-3...3).compactMap { offset in
            cal.date(byAdding: .day, value: offset, to: centerDate)
        }
        let weekdaySymbols = ["日", "一", "二", "三", "四", "五", "六"]
        
        return HStack(spacing: 6) {
            ForEach(days, id: \.self) { day in
                let isSelected = cal.isDate(day, inSameDayAs: selectedDate)
                let isToday = cal.isDateInToday(day)
                let wdIndex = cal.component(.weekday, from: day) - 1
                let dayNumber = cal.component(.day, from: day)
                let hasTodoOrCourse = !dataManager.todos(for: day).isEmpty || !dataManager.courses(for: WeekDay.from(date: day).rawValue).isEmpty
                
                Button {
                    UIImpactFeedbackGenerator(style: .light).impactOccurred()
                    withAnimation(.spring(response: 0.28, dampingFraction: 0.78)) {
                        selectedDate = day
                    }
                } label: {
                    VStack(spacing: 4) {
                        Text(weekdaySymbols[max(0, min(6, wdIndex))])
                            .font(.system(size: 10, weight: .semibold, design: .rounded))
                            .foregroundColor(isSelected ? .white.opacity(0.92) : (isToday ? CalicoTheme.warmOrange : .secondary))
                        
                        Text("\(dayNumber)")
                            .font(.system(size: 14, weight: .bold, design: .rounded))
                            .foregroundColor(isSelected ? .white : (isToday ? CalicoTheme.warmOrange : .primary))
                        
                        Circle()
                            .fill(isSelected ? Color.white : (hasTodoOrCourse ? CalicoTheme.warmOrange : Color.clear))
                            .frame(width: 4.5, height: 4.5)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 7)
                    .background {
                        if isSelected {
                            RoundedRectangle(cornerRadius: 14, style: .continuous)
                                .fill(CalicoTheme.accentGradient)
                        } else {
                            RoundedRectangle(cornerRadius: 14, style: .continuous)
                                .fill(isToday ? CalicoTheme.warmOrange.opacity(0.12) : Color.white.opacity(0.55))
                        }
                    }
                    .overlay(
                        RoundedRectangle(cornerRadius: 14, style: .continuous)
                            .strokeBorder(isSelected ? Color.white.opacity(0.55) : Color.white.opacity(0.45), lineWidth: 0.9)
                    )
                    .shadow(color: isSelected ? CalicoTheme.warmOrange.opacity(0.26) : .clear, radius: 5, y: 2)
                }
                .buttonStyle(.plain)
            }
        }
    }
    
    private func snapshotMetricTile(
        icon: String,
        title: String,
        value: String,
        subtitle: String,
        accentColor: Color,
        action: @escaping () -> Void
    ) -> some View {
        Button(action: action) {
            VStack(alignment: .leading, spacing: 6) {
                HStack(spacing: 6) {
                    Image(systemName: icon)
                        .font(.system(size: 12, weight: .bold))
                        .foregroundColor(accentColor)
                        .frame(width: 24, height: 24)
                        .background(accentColor.opacity(0.14))
                        .clipShape(Circle())
                    
                    Text(title)
                        .font(.system(size: 11, weight: .semibold, design: .rounded))
                        .foregroundColor(.secondary)
                    
                    Spacer()
                }
                
                Text(value)
                    .font(.system(size: 16, weight: .bold, design: .rounded))
                    .foregroundColor(.primary)
                    .lineLimit(1)
                
                Text(subtitle)
                    .font(.system(size: 10, design: .rounded))
                    .foregroundColor(.secondary)
                    .lineLimit(1)
            }
            .padding(11)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(
                RoundedRectangle(cornerRadius: 16, style: .continuous)
                    .fill(CalicoTheme.warmCardBackground)
                    .overlay(
                        RoundedRectangle(cornerRadius: 16, style: .continuous)
                            .strokeBorder(
                                LinearGradient(
                                    colors: [Color.white.opacity(0.85), accentColor.opacity(0.28)],
                                    startPoint: .topLeading,
                                    endPoint: .bottomTrailing
                                ),
                                lineWidth: 1.0
                            )
                    )
                    .shadow(color: accentColor.opacity(0.05), radius: 5, x: 0, y: 2)
            )
        }
        .buttonStyle(.plain)
    }
    
    // MARK: - 2. Google 日曆風格「當日行事曆時間軸 (融入 To-Do List)」
    private var googleDayTimelineSection: some View {
        let allDayOrDeadlineTodos = unscheduledOrAllDayTodos
        let hours = displayedTimelineHours
        let currentHour = Calendar.current.component(.hour, from: Date())
        let currentMinute = Calendar.current.component(.minute, from: Date())
        
        return VStack(alignment: .leading, spacing: 12) {
            // 標題與模式切換
            HStack {
                Label("當日行事曆 ＆ 時段 To-Do", systemImage: "calendar.day.timeline.left")
                    .font(.system(.headline, design: .rounded))
                    .foregroundColor(CalicoTheme.warmOrange)
                
                Spacer()
                
                Button {
                    withAnimation(.easeInOut(duration: 0.2)) {
                        compactTimelineMode.toggle()
                    }
                } label: {
                    HStack(spacing: 4) {
                        Image(systemName: compactTimelineMode ? "arrow.up.left.and.arrow.down.right" : "rectangle.compress.vertical")
                            .font(.system(size: 10, weight: .bold))
                        Text(compactTimelineMode ? "顯示全天時段" : "僅看有事時段")
                            .font(.system(size: 11, weight: .semibold, design: .rounded))
                    }
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(CalicoTheme.warmOrange.opacity(0.12))
                    .foregroundColor(CalicoTheme.warmOrange)
                    .clipShape(Capsule())
                }
                
                Button {
                    showingAddTodoSheet = true
                } label: {
                    Image(systemName: "plus.circle.fill")
                        .font(.system(size: 18))
                        .foregroundColor(CalicoTheme.warmOrange)
                }
            }
            
            VStack(spacing: 0) {
                // 頂部：全天事項 / 今日未排定特定時段的待辦與到期功課 (Google Calendar All-Day Banner)
                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        HStack(spacing: 5) {
                            Image(systemName: "pin.circle.fill")
                                .foregroundColor(CalicoTheme.pawPink)
                                .font(.system(size: 13))
                            Text("全天待辦 / 今日到期功課 (\(allDayOrDeadlineTodos.count))")
                                .font(.system(size: 12, weight: .bold, design: .rounded))
                                .foregroundColor(.primary)
                        }
                        Spacer()
                        Text("可直接打勾完成")
                            .font(.system(size: 10, design: .rounded))
                            .foregroundColor(.secondary)
                    }
                    
                    if allDayOrDeadlineTodos.isEmpty {
                        Text("目前沒有未排時段的全天待辦，點擊下方任意時段 `+` 即可像 Google 日曆一樣排入行程或 To-Do！")
                            .font(.system(size: 11, design: .rounded))
                            .foregroundColor(.secondary)
                            .padding(.vertical, 2)
                    } else {
                        VStack(spacing: 6) {
                            ForEach(allDayOrDeadlineTodos) { todo in
                                timelineTodoChip(todo: todo, isAllDayBanner: true)
                            }
                        }
                    }
                }
                .padding(12)
                .background(CalicoTheme.pawPink.opacity(0.07))
                
                Divider()
                
                // 中間：Google 日曆風格小時時間軸 (左側時間刻度 + 右側課程與 To-Do 色塊)
                VStack(spacing: 0) {
                    ForEach(hours, id: \.self) { hour in
                        let coursesInHour = coursesStartingOrActive(at: hour)
                        let todosInHour = scheduledTodos(at: hour)
                        let isCurrentHour = isSelectedDateToday && currentHour == hour
                        
                        HStack(alignment: .top, spacing: 8) {
                            // 左側小時標籤 + 快速加號
                            VStack(alignment: .trailing, spacing: 2) {
                                Text(String(format: "%02d:00", hour))
                                    .font(.system(size: 11, weight: isCurrentHour ? .bold : .medium, design: .monospaced))
                                    .foregroundColor(isCurrentHour ? .red : .secondary)
                                
                                Button {
                                    timelineHourToCreate = TimelineHourSelection(date: selectedDate, hour: hour)
                                } label: {
                                    Image(systemName: "plus")
                                        .font(.system(size: 9, weight: .bold))
                                        .foregroundColor(CalicoTheme.warmOrange.opacity(0.8))
                                        .frame(width: 18, height: 18)
                                        .background(CalicoTheme.warmOrange.opacity(0.10))
                                        .clipShape(Circle())
                                }
                                .buttonStyle(.plain)
                            }
                            .frame(width: 48, alignment: .trailing)
                            .padding(.top, 6)
                            
                            // 右側時段格線與事項色塊
                            VStack(alignment: .leading, spacing: 6) {
                                // Google 日曆即時紅線指標 (Current Time Indicator)
                                if isCurrentHour {
                                    HStack(spacing: 4) {
                                        Circle()
                                            .fill(Color.red)
                                            .frame(width: 8, height: 8)
                                        Text(String(format: "現在 %02d:%02d", currentHour, currentMinute))
                                            .font(.system(size: 10, weight: .bold, design: .rounded))
                                            .foregroundColor(.red)
                                        Rectangle()
                                            .fill(Color.red.opacity(0.75))
                                            .frame(height: 1.5)
                                    }
                                    .padding(.top, 4)
                                }
                                
                                // 1. 該時段課程色塊
                                ForEach(coursesInHour) { course in
                                    timelineCourseBlock(course: course, hour: hour)
                                }
                                
                                // 2. 該時段排定的 To-Do / 功課色塊 (直接融入打勾按鈕)
                                ForEach(todosInHour) { todo in
                                    timelineTodoChip(todo: todo, isAllDayBanner: false)
                                }
                                
                                // 3. 空白時段點擊區（點擊即新增該時段行程/待辦）
                                if coursesInHour.isEmpty && todosInHour.isEmpty {
                                    Button {
                                        timelineHourToCreate = TimelineHourSelection(date: selectedDate, hour: hour)
                                    } label: {
                                        HStack {
                                            Text("點擊排入 \(String(format: "%02d:00", hour)) 待辦或行程...")
                                                .font(.system(size: 11, design: .rounded))
                                                .foregroundColor(.secondary.opacity(0.45))
                                            Spacer()
                                        }
                                        .frame(maxWidth: .infinity, minHeight: 28)
                                        .contentShape(Rectangle())
                                    }
                                    .buttonStyle(.plain)
                                }
                            }
                            .padding(.vertical, 6)
                            .padding(.trailing, 10)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .overlay(alignment: .top) {
                                Rectangle()
                                    .fill(Color.secondary.opacity(0.14))
                                    .frame(height: 0.5)
                            }
                        }
                        .padding(.leading, 8)
                        .background(isCurrentHour ? Color.red.opacity(0.03) : Color.clear)
                    }
                }
                
                Divider()
                
                // 底部：一秒快速排入當日行事曆 / To-Do 輸入列
                inlineQuickScheduleBar
                    .padding(12)
                    .background(Color(.tertiarySystemGroupedBackground).opacity(0.6))
            }
            .background(CalicoTheme.warmCardBackground)
            .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 18, style: .continuous)
                    .stroke(CalicoTheme.warmOrange.opacity(0.16), lineWidth: 1)
            )
        }
        .padding(.horizontal, 16)
    }
    
    /// 計算顯示在時間軸上的小時清單
    private var displayedTimelineHours: [Int] {
        let defaultHours = Array(7...22)
        guard compactTimelineMode else { return defaultHours }
        
        let currentHour = Calendar.current.component(.hour, from: Date())
        let activeHours = defaultHours.filter { hour in
            !coursesStartingOrActive(at: hour).isEmpty ||
            !scheduledTodos(at: hour).isEmpty ||
            (isSelectedDateToday && abs(hour - currentHour) <= 1)
        }
        return activeHours.isEmpty ? [8, 10, 12, 14, 16, 18, 20] : activeHours
    }
    
    /// 取得某小時開始或正在進行的課程（為避免跨多節課重複佔據太多高度，在起始小時完整呈現，後續小時顯示精簡延續條）
    private func coursesStartingOrActive(at hour: Int) -> [Course] {
        selectedDayCourses.filter { course in
            let startH = parseHour(from: course.startTime) ?? 8
            let endH = parseEndHour(startTime: course.startTime, endTime: course.endTime)
            return hour >= startH && hour < endH
        }
    }
    
    /// 判斷待辦是否有特定小時（非 00:00 且非 23:59 預設截止）
    private func scheduledHour(for todo: TodoItem) -> Int? {
        let cal = Calendar.current
        if let start = todo.startDate, cal.isDate(start, inSameDayAs: selectedDate) {
            let h = cal.component(.hour, from: start)
            let m = cal.component(.minute, from: start)
            if !(h == 0 && m == 0) {
                return max(7, min(22, h))
            }
        }
        if let due = todo.dueDate, cal.isDate(due, inSameDayAs: selectedDate) {
            let h = cal.component(.hour, from: due)
            let m = cal.component(.minute, from: due)
            // 若是 23:59 或 00:00 視為全天/當日截止，放在頂部全天橫幅
            if !(h == 23 && m >= 50) && !(h == 0 && m == 0) {
                return max(7, min(22, h))
            }
        }
        return nil
    }
    
    private var unscheduledOrAllDayTodos: [TodoItem] {
        selectedDayTodos.filter { scheduledHour(for: $0) == nil }
    }
    
    private func scheduledTodos(at hour: Int) -> [TodoItem] {
        selectedDayTodos.filter { scheduledHour(for: $0) == hour }
    }
    
    private func parseHour(from timeStr: String) -> Int? {
        let parts = timeStr.split(separator: ":")
        guard let first = parts.first, let h = Int(first) else { return nil }
        return h
    }
    
    private func parseEndHour(startTime: String, endTime: String) -> Int {
        let startH = parseHour(from: startTime) ?? 8
        let parts = endTime.split(separator: ":")
        guard let first = parts.first, let h = Int(first) else { return startH + 1 }
        let m = parts.count > 1 ? (Int(parts[1]) ?? 0) : 0
        let endH = m > 0 ? h + 1 : h
        return max(startH + 1, endH)
    }
    
    /// Google 日曆風格：時間軸上的課程色塊
    private func timelineCourseBlock(course: Course, hour: Int) -> some View {
        let startH = parseHour(from: course.startTime) ?? hour
        let isStartHour = (startH == hour)
        let courseTodos = dataManager.allTodos(for: course.id).filter { !$0.isCompleted }
        
        return Button {
            selectedCourseDetail = course
        } label: {
            HStack(spacing: 10) {
                RoundedRectangle(cornerRadius: 3)
                    .fill(course.color)
                    .frame(width: 4)
                
                VStack(alignment: .leading, spacing: 3) {
                    HStack(spacing: 6) {
                        Text("課程")
                            .font(.system(size: 9, weight: .bold, design: .rounded))
                            .padding(.horizontal, 5)
                            .padding(.vertical, 1.5)
                            .background(course.color.opacity(0.2))
                            .foregroundColor(course.color)
                            .cornerRadius(4)
                        
                        Text(course.name)
                            .font(.system(size: isStartHour ? 13 : 12, weight: .bold, design: .rounded))
                            .foregroundColor(.primary)
                            .lineLimit(1)
                        
                        Spacer()
                        
                        Text("\(course.startTime)-\(course.endTime)")
                            .font(.system(size: 10, weight: .semibold, design: .monospaced))
                            .foregroundColor(course.color)
                    }
                    
                    if isStartHour {
                        HStack(spacing: 8) {
                            if !course.classroom.isEmpty {
                                Label(course.classroom, systemImage: "mappin.and.ellipse")
                            }
                            if !course.instructor.isEmpty {
                                Label(course.instructor, systemImage: "person.fill")
                            }
                            if !courseTodos.isEmpty {
                                Label("\(courseTodos.count) 項課堂功課待完成", systemImage: "exclamationmark.bubble.fill")
                                    .foregroundColor(CalicoTheme.warmOrange)
                            }
                        }
                        .font(.system(size: 10, design: .rounded))
                        .foregroundColor(.secondary)
                    }
                }
            }
            .padding(.horizontal, 10)
            .padding(.vertical, isStartHour ? 8 : 5)
            .background(course.color.opacity(isStartHour ? 0.13 : 0.07))
            .cornerRadius(10)
            .overlay(
                RoundedRectangle(cornerRadius: 10, style: .continuous)
                    .stroke(course.color.opacity(0.3), lineWidth: 1)
            )
        }
        .buttonStyle(.plain)
    }
    
    private func courseName(for courseId: UUID?) -> String? {
        guard let courseId = courseId else { return nil }
        return dataManager.courses.first(where: { $0.id == courseId })?.name
    }
    
    /// Google 日曆風格：直接融入時間軸的 To-Do / 功課晶片（支援一鍵打勾 + 點擊編輯）
    private func timelineTodoChip(todo: TodoItem, isAllDayBanner: Bool) -> some View {
        let accentColor = todo.category.badgeColor
        let courseName = self.courseName(for: todo.courseId)
        
        return HStack(spacing: 8) {
            Button {
                withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
                    dataManager.toggleTodoCompletion(id: todo.id)
                }
            } label: {
                Image(systemName: todo.isCompleted ? "checkmark.circle.fill" : "circle")
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundColor(todo.isCompleted ? CalicoTheme.sageGreen : accentColor)
            }
            .buttonStyle(.plain)
            
            Button {
                todoToEdit = todo
            } label: {
                HStack(spacing: 6) {
                    VStack(alignment: .leading, spacing: 2) {
                        HStack(spacing: 5) {
                            Text(todo.category.rawValue)
                                .font(.system(size: 9, weight: .bold, design: .rounded))
                                .padding(.horizontal, 5)
                                .padding(.vertical, 1.5)
                                .background(accentColor.opacity(0.16))
                                .foregroundColor(accentColor)
                                .cornerRadius(4)
                            
                            if let cName = courseName {
                                Text(cName)
                                    .font(.system(size: 9, weight: .semibold, design: .rounded))
                                    .padding(.horizontal, 5)
                                    .padding(.vertical, 1.5)
                                    .background(Color.secondary.opacity(0.12))
                                    .foregroundColor(.secondary)
                                    .cornerRadius(4)
                                    .lineLimit(1)
                            }
                            
                            Text(todo.title)
                                .font(.system(size: 13, weight: todo.isCompleted ? .regular : .semibold, design: .rounded))
                                .strikethrough(todo.isCompleted, color: .secondary)
                                .foregroundColor(todo.isCompleted ? .secondary : .primary)
                                .lineLimit(1)
                        }
                        
                        if !todo.notes.isEmpty {
                            Text(todo.notes)
                                .font(.system(size: 10, design: .rounded))
                                .foregroundColor(.secondary)
                                .lineLimit(1)
                        }
                    }
                    
                    Spacer()
                    
                    if let timeLabel = formattedTodoTimeRange(todo) {
                        Text(timeLabel)
                            .font(.system(size: 10, weight: .semibold, design: .monospaced))
                            .foregroundColor(todo.isOverdue ? .red : .secondary)
                    }
                }
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 7)
        .background(isAllDayBanner ? CalicoTheme.warmCardBackground : accentColor.opacity(0.10))
        .cornerRadius(10)
        .overlay(
            RoundedRectangle(cornerRadius: 10, style: .continuous)
                .stroke(accentColor.opacity(0.25), lineWidth: 1)
        )
    }
    
    private func formattedTodoTimeRange(_ todo: TodoItem) -> String? {
        let fmt = DateFormatter()
        fmt.dateFormat = "HH:mm"
        if let start = todo.startDate, let due = todo.dueDate {
            return "\(fmt.string(from: start))-\(fmt.string(from: due))"
        } else if let due = todo.dueDate {
            return fmt.string(from: due)
        }
        return nil
    }
    
    /// 行事曆底部一秒快速排入行程 / 待辦 / 功課輸入列
    private var inlineQuickScheduleBar: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 8) {
                // 類別選擇 Menu
                Menu {
                    ForEach(TodoCategory.allCases) { cat in
                        Button {
                            quickTodoCategory = cat
                        } label: {
                            Label(cat.rawValue, systemImage: cat.iconName)
                        }
                    }
                } label: {
                    HStack(spacing: 4) {
                        Image(systemName: quickTodoCategory.iconName)
                            .font(.system(size: 11))
                        Text(quickTodoCategory.rawValue)
                            .font(.system(size: 11, weight: .bold, design: .rounded))
                        Image(systemName: "chevron.down")
                            .font(.system(size: 9))
                    }
                    .padding(.horizontal, 8)
                    .padding(.vertical, 5)
                    .background(quickTodoCategory.badgeColor.opacity(0.15))
                    .foregroundColor(quickTodoCategory.badgeColor)
                    .cornerRadius(8)
                }
                
                // 時段選擇 Menu
                Menu {
                    Button("全天 / 不限時段") {
                        quickTodoHour = nil
                    }
                    Divider()
                    ForEach(7...22, id: \.self) { h in
                        Button(String(format: "%02d:00 - %02d:00", h, h + 1)) {
                            quickTodoHour = h
                        }
                    }
                } label: {
                    HStack(spacing: 4) {
                        Image(systemName: "clock")
                            .font(.system(size: 11))
                        Text(quickTodoHour == nil ? "全天事項" : String(format: "%02d:00", quickTodoHour!))
                            .font(.system(size: 11, weight: .semibold, design: .rounded))
                        Image(systemName: "chevron.down")
                            .font(.system(size: 9))
                    }
                    .padding(.horizontal, 8)
                    .padding(.vertical, 5)
                    .background(Color(.secondarySystemGroupedBackground))
                    .foregroundColor(.primary)
                    .cornerRadius(8)
                }
                
                TextField("快速輸入今日待辦、行程或功課...", text: $quickTodoTitle)
                    .font(.system(size: 13, design: .rounded))
                    .submitLabel(.done)
                    .onSubmit {
                        submitQuickTodo()
                    }
                
                Button {
                    submitQuickTodo()
                } label: {
                    Image(systemName: "arrow.up.circle.fill")
                        .font(.system(size: 24))
                        .foregroundColor(quickTodoTitle.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? .secondary.opacity(0.4) : CalicoTheme.warmOrange)
                }
                .disabled(quickTodoTitle.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
            }
        }
    }
    
    private func submitQuickTodo() {
        let trimmed = quickTodoTitle.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }
        let cal = Calendar.current
        var startDate: Date? = nil
        var dueDate: Date? = nil
        
        if let hour = quickTodoHour {
            startDate = cal.date(bySettingHour: hour, minute: 0, second: 0, of: selectedDate)
            dueDate = cal.date(bySettingHour: min(23, hour + 1), minute: 0, second: 0, of: selectedDate)
        } else {
            dueDate = cal.date(bySettingHour: 23, minute: 59, second: 0, of: selectedDate)
        }
        
        let newItem = TodoItem(
            title: trimmed,
            notes: "",
            startDate: startDate,
            dueDate: dueDate,
            isCompleted: false,
            priority: homeworkCategories.contains(quickTodoCategory) ? .high : .medium,
            category: quickTodoCategory
        )
        dataManager.addTodo(newItem)
        quickTodoTitle = ""
        hideKeyboard()
    }
    
    // MARK: - 3. 「今天要做什麼 ＆ 功課有什麼」專區
    private var todayTasksAndHomeworkSection: some View {
        let displayedList: [TodoItem] = {
            switch selectedTaskTab {
            case .todayTodo:
                return pendingDayTodos
            case .homework:
                return upcomingHomeworkItems
            case .completed:
                return selectedDayTodos.filter { $0.isCompleted }
            }
        }()
        
        return VStack(alignment: .leading, spacing: 12) {
            HStack {
                Label("今天要做什麼 ＆ 功課有什麼", systemImage: "checklist")
                    .font(.system(.headline, design: .rounded))
                    .foregroundColor(CalicoTheme.pawPink)
                
                Spacer()
                
                Button {
                    showingAddTodoSheet = true
                } label: {
                    HStack(spacing: 3) {
                        Image(systemName: "plus")
                        Text("新增")
                    }
                    .font(.system(size: 12, weight: .bold, design: .rounded))
                    .padding(.horizontal, 10)
                    .padding(.vertical, 4)
                    .background(CalicoTheme.pawPink.opacity(0.15))
                    .foregroundColor(CalicoTheme.pawPink)
                    .clipShape(Capsule())
                }
            }
            
            // 分類切換 Picker
            HStack(spacing: 8) {
                ForEach(TodayTaskFilterTab.allCases) { tab in
                    let badgeCount: Int = {
                        switch tab {
                        case .todayTodo: return pendingDayTodos.count
                        case .homework: return upcomingHomeworkItems.count
                        case .completed: return selectedDayTodos.filter { $0.isCompleted }.count
                        }
                    }()
                    
                    Button {
                        withAnimation(.easeInOut(duration: 0.18)) {
                            selectedTaskTab = tab
                        }
                    } label: {
                        HStack(spacing: 5) {
                            Text(tab.rawValue)
                                .font(.system(size: 12, weight: .bold, design: .rounded))
                            Text("\(badgeCount)")
                                .font(.system(size: 10, weight: .bold, design: .rounded))
                                .padding(.horizontal, 6)
                                .padding(.vertical, 1.5)
                                .background(selectedTaskTab == tab ? Color.white.opacity(0.25) : Color.secondary.opacity(0.15))
                                .clipShape(Capsule())
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 8)
                        .background(selectedTaskTab == tab ? CalicoTheme.pawPink : Color(.tertiarySystemGroupedBackground))
                        .foregroundColor(selectedTaskTab == tab ? .white : .secondary)
                        .cornerRadius(10)
                    }
                    .buttonStyle(.plain)
                }
            }
            
            if displayedList.isEmpty {
                HStack {
                    Spacer()
                    VStack(spacing: 8) {
                        Image(systemName: selectedTaskTab == .homework ? "graduationcap.circle.fill" : "pawprint.circle.fill")
                            .font(.system(size: 30))
                            .foregroundColor(CalicoTheme.sageGreen)
                        Text(emptyTaskTabMessage)
                            .font(.system(.subheadline, design: .rounded))
                            .foregroundColor(.secondary)
                            .multilineTextAlignment(.center)
                    }
                    .padding(.vertical, 20)
                    Spacer()
                }
                .background(CalicoTheme.warmCardBackground)
                .cornerRadius(16)
                .overlay(
                    RoundedRectangle(cornerRadius: 16, style: .continuous)
                        .stroke(CalicoTheme.warmOrange.opacity(0.12), lineWidth: 1)
                )
            } else {
                VStack(spacing: 8) {
                    ForEach(displayedList) { todo in
                        todoRow(todo: todo, isDone: todo.isCompleted)
                    }
                }
            }
        }
        .padding(.horizontal, 16)
    }
    
    private var emptyTaskTabMessage: String {
        switch selectedTaskTab {
        case .todayTodo:
            return "今天沒有未完成的待辦事項，進度超前喵！"
        case .homework:
            return "未來 7 天內沒有待交的作業、考試或報告喵！"
        case .completed:
            return "今天還沒有已勾選完成的項目喔～"
        }
    }
    
    private func todoRow(todo: TodoItem, isDone: Bool) -> some View {
        let courseName = self.courseName(for: todo.courseId)
        
        return HStack(spacing: 12) {
            Button {
                withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
                    dataManager.toggleTodoCompletion(id: todo.id)
                }
            } label: {
                Image(systemName: isDone ? "checkmark.circle.fill" : "circle")
                    .font(.system(size: 20))
                    .foregroundColor(isDone ? CalicoTheme.sageGreen : todo.category.badgeColor)
            }
            .buttonStyle(.plain)
            
            Button {
                todoToEdit = todo
            } label: {
                HStack {
                    VStack(alignment: .leading, spacing: 3) {
                        HStack(spacing: 6) {
                            Text(todo.category.rawValue)
                                .font(.caption2.weight(.bold))
                                .padding(.horizontal, 6)
                                .padding(.vertical, 2)
                                .background(todo.category.badgeColor.opacity(0.15))
                                .foregroundColor(todo.category.badgeColor)
                                .cornerRadius(4)
                            
                            if let cName = courseName {
                                Text(cName)
                                    .font(.caption2.weight(.semibold))
                                    .padding(.horizontal, 6)
                                    .padding(.vertical, 2)
                                    .background(Color.indigo.opacity(0.12))
                                    .foregroundColor(.indigo)
                                    .cornerRadius(4)
                                    .lineLimit(1)
                            }
                            
                            Text(todo.title)
                                .font(.system(.subheadline, design: .rounded).weight(isDone ? .regular : .semibold))
                                .strikethrough(isDone, color: .secondary)
                                .foregroundColor(isDone ? .secondary : .primary)
                                .lineLimit(1)
                        }
                        
                        if !todo.notes.isEmpty {
                            Text(todo.notes)
                                .font(.caption2)
                                .foregroundColor(.secondary)
                                .lineLimit(1)
                        }
                    }
                    
                    Spacer()
                    
                    if let dueDate = todo.dueDate {
                        VStack(alignment: .trailing, spacing: 2) {
                            if !Calendar.current.isDate(dueDate, inSameDayAs: selectedDate) {
                                Text(dueDate.formatted(.dateTime.month(.defaultDigits).day(.defaultDigits)))
                                    .font(.system(size: 10, weight: .bold, design: .rounded))
                                    .foregroundColor(.indigo)
                            }
                            Text(dueDate, style: .time)
                                .font(.caption2)
                                .foregroundColor(todo.isOverdue ? .red : .secondary)
                        }
                    }
                }
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 10)
        .background(CalicoTheme.warmCardBackground)
        .cornerRadius(14)
        .overlay(
            RoundedRectangle(cornerRadius: 14, style: .continuous)
                .stroke(CalicoTheme.warmOrange.opacity(0.12), lineWidth: 1)
        )
    }
    
    // MARK: - 4. 查詢今日課表
    private var todayCoursesSection: some View {
        let todayCourses = selectedDayCourses
        
        return VStack(alignment: .leading, spacing: 12) {
            HStack {
                Label("查詢今日課表 (\(todayCourses.count) 堂)", systemImage: "book.pages.fill")
                    .font(.system(.headline, design: .rounded))
                    .foregroundColor(CalicoTheme.warmOrange)
                Spacer()
                Text(WeekDay.from(date: selectedDate).shortName)
                    .font(.system(size: 12, weight: .semibold, design: .rounded))
                    .foregroundColor(.secondary)
            }
            
            if todayCourses.isEmpty {
                HStack {
                    Spacer()
                    VStack(spacing: 8) {
                        CalicoCatAvatar(size: 46, mood: .happy)
                        Text("這天沒有安排課程，和可樂一起曬太陽或自由自習吧 🐾")
                            .font(.system(.subheadline, design: .rounded))
                            .foregroundColor(.secondary)
                            .multilineTextAlignment(.center)
                    }
                    .padding(.vertical, 18)
                    .padding(.horizontal, 12)
                    Spacer()
                }
                .background(CalicoTheme.warmCardBackground)
                .cornerRadius(16)
                .overlay(
                    RoundedRectangle(cornerRadius: 16, style: .continuous)
                        .stroke(CalicoTheme.warmOrange.opacity(0.12), lineWidth: 1)
                )
            } else {
                VStack(spacing: 8) {
                    ForEach(todayCourses) { course in
                        let courseTodos = dataManager.allTodos(for: course.id)
                        let pendingCourseTodos = courseTodos.filter { !$0.isCompleted }
                        
                        VStack(alignment: .leading, spacing: 8) {
                            Button {
                                selectedCourseDetail = course
                            } label: {
                                HStack(spacing: 12) {
                                    RoundedRectangle(cornerRadius: 3)
                                        .fill(course.color)
                                        .frame(width: 4, height: 48)
                                    
                                    VStack(alignment: .leading, spacing: 3) {
                                        Text(course.name)
                                            .font(.subheadline.weight(.semibold))
                                            .foregroundColor(.primary)
                                        HStack(spacing: 8) {
                                            Label("\(course.startTime) - \(course.endTime)", systemImage: "clock")
                                            if !course.classroom.isEmpty {
                                                Label(course.classroom, systemImage: "mappin.circle.fill")
                                            }
                                        }
                                        .font(.caption2)
                                        .foregroundColor(.secondary)
                                    }
                                    
                                    Spacer()
                                    
                                    if !course.instructor.isEmpty {
                                        Text(course.instructor)
                                            .font(.caption2)
                                            .padding(.horizontal, 8)
                                            .padding(.vertical, 4)
                                            .background(course.color.opacity(0.12))
                                            .foregroundColor(course.color)
                                            .cornerRadius(6)
                                    }
                                    
                                    Image(systemName: "chevron.right")
                                        .font(.caption2)
                                        .foregroundColor(.secondary)
                                }
                                .contentShape(Rectangle())
                            }
                            .buttonStyle(.plain)
                            
                            // 課程關聯待辦與作業
                            if !courseTodos.isEmpty {
                                VStack(alignment: .leading, spacing: 6) {
                                    Divider()
                                        .padding(.vertical, 2)
                                    
                                    HStack {
                                        Image(systemName: "pin.fill")
                                            .font(.system(size: 10))
                                            .foregroundColor(course.color)
                                        Text("本堂功課與待辦 (\(pendingCourseTodos.count) 項待完成)")
                                            .font(.caption2.weight(.bold))
                                            .foregroundColor(.secondary)
                                        Spacer()
                                    }
                                    
                                    ForEach(courseTodos) { task in
                                        HStack(spacing: 8) {
                                            Button {
                                                withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
                                                    dataManager.toggleTodoCompletion(task)
                                                }
                                            } label: {
                                                Image(systemName: task.isCompleted ? "checkmark.circle.fill" : "circle")
                                                    .foregroundColor(task.isCompleted ? .green : .secondary)
                                                    .font(.system(size: 14))
                                            }
                                            .buttonStyle(.plain)
                                            
                                            Text(task.title)
                                                .font(.caption)
                                                .strikethrough(task.isCompleted)
                                                .foregroundColor(task.isCompleted ? .secondary : .primary)
                                            
                                            Spacer()
                                            
                                            if let due = task.dueDate {
                                                Text(due.formatted(date: .omitted, time: .shortened))
                                                    .font(.caption2)
                                                    .foregroundColor(.secondary)
                                            }
                                        }
                                        .padding(.horizontal, 8)
                                        .padding(.vertical, 5)
                                        .background(Color(.tertiarySystemGroupedBackground))
                                        .cornerRadius(8)
                                    }
                                }
                            }
                        }
                        .padding(.horizontal, 14)
                        .padding(.vertical, 10)
                        .background(CalicoTheme.warmCardBackground)
                        .cornerRadius(14)
                        .overlay(
                            RoundedRectangle(cornerRadius: 14, style: .continuous)
                                .stroke(CalicoTheme.warmOrange.opacity(0.12), lineWidth: 1)
                        )
                    }
                }
            }
        }
        .padding(.horizontal, 16)
    }
    
    // MARK: - 5. 今天花多少（今日開銷統整與理性指數）
    private var todayExpenseSummarySection: some View {
        let todayExpenses = selectedDayExpenses
        
        return VStack(alignment: .leading, spacing: 12) {
            HStack {
                Label("今天花多少 ＆ 開銷明細", systemImage: "chart.pie.fill")
                    .font(.system(.headline, design: .rounded))
                    .foregroundColor(CalicoTheme.cocoaBrown)
                Spacer()
                
                // 理性指數 Badge
                if let score = dataManager.todayRationalScore, isSelectedDateToday {
                    HStack(spacing: 4) {
                        Image(systemName: "pawprint.fill")
                        Text(String(format: "理性指數 %.1f/10", score))
                    }
                    .font(.caption2.weight(.bold))
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(score >= 7.0 ? CalicoTheme.sageGreen.opacity(0.16) : (score >= 4.5 ? CalicoTheme.warmOrange.opacity(0.16) : Color.red.opacity(0.15)))
                    .foregroundColor(score >= 7.0 ? CalicoTheme.sageGreen : (score >= 4.5 ? CalicoTheme.warmOrange : .red))
                    .cornerRadius(8)
                }
                
                Button {
                    showingAddTransactionSheet = true
                } label: {
                    HStack(spacing: 3) {
                        Image(systemName: "plus")
                        Text("記一筆")
                    }
                    .font(.system(size: 12, weight: .bold, design: .rounded))
                    .padding(.horizontal, 10)
                    .padding(.vertical, 4)
                    .background(CalicoTheme.warmOrange.opacity(0.15))
                    .foregroundColor(CalicoTheme.warmOrange)
                    .clipShape(Capsule())
                }
            }
            
            VStack(spacing: 12) {
                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(isSelectedDateToday ? "今日總支出" : "當日總支出")
                            .font(.caption)
                            .foregroundColor(.secondary)
                        Text("NT$ \(Int(selectedDayTotalExpense))")
                            .font(.system(.title, design: .rounded).weight(.bold))
                            .foregroundColor(.primary)
                    }
                    Spacer()
                    VStack(alignment: .trailing, spacing: 2) {
                        Text("消費筆數")
                            .font(.caption)
                            .foregroundColor(.secondary)
                        Text("\(todayExpenses.count) 筆")
                            .font(.system(.title3, design: .rounded).weight(.semibold))
                            .foregroundColor(.secondary)
                    }
                }
                
                if !todayExpenses.isEmpty {
                    Divider()
                    
                    VStack(spacing: 8) {
                        ForEach(todayExpenses.prefix(6)) { item in
                            Button {
                                transactionToEdit = item
                            } label: {
                                HStack {
                                    Image(systemName: item.categoryIcon)
                                        .font(.system(size: 14))
                                        .foregroundColor(item.color)
                                        .frame(width: 26, height: 26)
                                        .background(item.color.opacity(0.12))
                                        .clipShape(Circle())
                                    
                                    VStack(alignment: .leading, spacing: 2) {
                                        Text(item.notes.isEmpty ? item.categoryName : item.notes)
                                            .font(.caption.weight(.semibold))
                                            .foregroundColor(.primary)
                                            .lineLimit(1)
                                        HStack(spacing: 4) {
                                            Text(item.categoryName)
                                            Text("•")
                                            Text(item.paymentMethodName)
                                            Text("•")
                                            Text(item.valueScoreLabel)
                                                .foregroundColor(item.valueScoreColor)
                                        }
                                        .font(.caption2)
                                        .foregroundColor(.secondary)
                                    }
                                    
                                    Spacer()
                                    
                                    Text("-NT$ \(Int(item.amount))")
                                        .font(.subheadline.weight(.bold))
                                        .foregroundColor(.red)
                                }
                                .contentShape(Rectangle())
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }
                
                Divider()
                
                Button {
                    showingPeerReviewSheet = true
                } label: {
                    HStack {
                        Image(systemName: "person.2.wave.2.fill")
                        Text("好友記帳互評與理性評分")
                        Spacer()
                        Image(systemName: "chevron.right")
                            .font(.caption)
                    }
                    .font(.system(.footnote, design: .rounded).weight(.semibold))
                    .foregroundColor(CalicoTheme.warmOrange)
                    .padding(.vertical, 8)
                    .padding(.horizontal, 12)
                    .background(CalicoTheme.warmOrange.opacity(0.10))
                    .cornerRadius(10)
                }
            }
            .padding(16)
            .background(CalicoTheme.warmCardBackground)
            .cornerRadius(18)
            .overlay(
                RoundedRectangle(cornerRadius: 18, style: .continuous)
                    .stroke(CalicoTheme.warmOrange.opacity(0.14), lineWidth: 1)
            )
        }
        .padding(.horizontal, 16)
    }
    
    // MARK: - 6. 飲食快速記帳
    private var foodQuickAccountingSection: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack {
                Label("三餐與手搖飲快速記帳", systemImage: "fork.knife")
                    .font(.headline)
                    .foregroundColor(.orange)
                Spacer()
                Text("早餐‧中餐‧晚餐‧宵夜‧飲料")
                    .font(.caption2)
                    .foregroundColor(.secondary)
            }
            
            VStack(spacing: 14) {
                // 餐別選擇器 (早餐、中餐、晚餐、宵夜、飲料)
                HStack(spacing: 8) {
                    ForEach(FoodMealType.allCases) { meal in
                        Button {
                            withAnimation(.easeInOut(duration: 0.15)) {
                                selectedMeal = meal
                            }
                        } label: {
                            VStack(spacing: 4) {
                                Image(systemName: meal.iconName)
                                    .font(.system(size: 16))
                                Text(meal.rawValue)
                                    .font(.caption2.weight(.semibold))
                            }
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 8)
                            .background(selectedMeal == meal ? meal.color.opacity(0.15) : Color(.tertiarySystemGroupedBackground))
                            .foregroundColor(selectedMeal == meal ? meal.color : .secondary)
                            .overlay(
                                RoundedRectangle(cornerRadius: 10)
                                    .stroke(selectedMeal == meal ? meal.color : Color.clear, lineWidth: 1.5)
                            )
                            .cornerRadius(10)
                        }
                        .buttonStyle(.plain)
                    }
                }
                
                // 金額快速按鈕與輸入
                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        Text("NT$")
                            .font(.headline)
                            .foregroundColor(.secondary)
                        TextField("金額", text: $mealAmount)
                            .font(.title2.weight(.bold))
                            .keyboardType(.numberPad)
                    }
                    .padding(.horizontal, 12)
                    .padding(.vertical, 8)
                    .background(Color(.tertiarySystemGroupedBackground))
                    .cornerRadius(10)
                    
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 6) {
                            ForEach(commonAmounts, id: \.self) { amt in
                                Button("$\(Int(amt))") {
                                    mealAmount = "\(Int(amt))"
                                }
                                .font(.caption.weight(.semibold))
                                .padding(.horizontal, 10)
                                .padding(.vertical, 5)
                                .background(Color(.tertiarySystemGroupedBackground))
                                .foregroundColor(.primary)
                                .cornerRadius(8)
                            }
                        }
                    }
                }
                
                // 備註輸入框
                HStack {
                    Image(systemName: "note.text")
                        .foregroundColor(.secondary)
                    TextField("備註（例：學餐雞排飯、微糖青茶）", text: $mealNote)
                        .font(.subheadline)
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 8)
                .background(Color(.tertiarySystemGroupedBackground))
                .cornerRadius(10)
                
                // 支付方式與理性價值評分 (1~10 分)
                HStack(spacing: 12) {
                    Menu {
                        ForEach(dataManager.paymentMethods) { pm in
                            Button(pm.name) {
                                selectedPayment = pm.name
                            }
                        }
                    } label: {
                        HStack {
                            Image(systemName: "creditcard.fill")
                                .font(.caption)
                            Text(selectedPayment)
                                .font(.caption.weight(.semibold))
                            Image(systemName: "chevron.down")
                                .font(.caption2)
                        }
                        .padding(.horizontal, 10)
                        .padding(.vertical, 8)
                        .background(Color(.tertiarySystemGroupedBackground))
                        .foregroundColor(.primary)
                        .cornerRadius(8)
                    }
                    
                    Spacer()
                    
                    HStack(spacing: 4) {
                        Text("價值評分:")
                            .font(.caption2)
                            .foregroundColor(.secondary)
                        
                        Stepper("\(mealScore) 分", value: $mealScore, in: 1...10)
                            .font(.caption.weight(.bold))
                            .labelsHidden()
                        
                        Text("\(mealScore)分")
                            .font(.caption.weight(.bold))
                            .foregroundColor(mealScore >= 7 ? .green : (mealScore >= 4 ? .orange : .red))
                    }
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(Color(.tertiarySystemGroupedBackground))
                    .cornerRadius(8)
                }
                
                Button {
                    recordFoodExpense()
                } label: {
                    HStack {
                        Image(systemName: "plus.circle.fill")
                        Text("快速記錄【\(selectedMeal.rawValue)】$ \(mealAmount.isEmpty ? "0" : mealAmount)")
                            .font(.headline)
                    }
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
                    .background(selectedMeal.color)
                    .cornerRadius(12)
                }
                .buttonStyle(.plain)
            }
            .padding(16)
            .background(CalicoTheme.warmCardBackground)
            .cornerRadius(18)
            .overlay(
                RoundedRectangle(cornerRadius: 18, style: .continuous)
                    .stroke(CalicoTheme.warmOrange.opacity(0.14), lineWidth: 1)
            )
        }
        .padding(.horizontal, 16)
    }
    
    // MARK: - 執行記帳
    private func recordFoodExpense() {
        hideKeyboard()
        guard let amount = Double(mealAmount), amount > 0 else { return }
        
        dataManager.quickRecordFoodExpense(
            mealType: selectedMeal,
            amount: amount,
            notes: mealNote.trimmingCharacters(in: .whitespacesAndNewlines),
            paymentMethod: selectedPayment,
            score: mealScore
        )
        
        let noteText = mealNote.isEmpty ? "" : " (\(mealNote))"
        successMessage = "可樂幫你記好【\(selectedMeal.rawValue)】$ \(Int(amount))\(noteText) 囉 🐾"
        mealNote = ""
        
        withAnimation {
            showSuccessBanner = true
        }
        
        DispatchQueue.main.asyncAfter(deadline: .now() + 2.5) {
            withAnimation {
                showSuccessBanner = false
            }
        }
    }
}
