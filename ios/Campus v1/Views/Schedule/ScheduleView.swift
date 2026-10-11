//
//  ScheduleView.swift
//  Campus v1
//

import SwiftUI

enum ScheduleDisplayMode: String, CaseIterable, Identifiable {
    case week = "一週課表"
    case day = "分日課表"
    
    var id: String { rawValue }
}

struct ScheduleView: View {
    @EnvironmentObject var dataManager: DataManager
    @State private var displayMode: ScheduleDisplayMode = .week
    @State private var selectedWeekday: WeekDay = WeekDay.from(date: Date())
    @State private var showingAddSheet = false
    @State private var showingShareSheet = false
    @State private var showingPeriodSettings = false
    @State private var showingLockScreenPreview = false
    @State private var showingLineBotSettings = false
    @State private var showingOCRSheet = false
    @State private var editingCourse: Course? = nil
    
    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // 頂部模式切換器：[ 一週課表 | 分日課表 ]
                Picker("課表模式", selection: $displayMode) {
                    ForEach(ScheduleDisplayMode.allCases) { mode in
                        Text(mode.rawValue).tag(mode)
                    }
                }
                .pickerStyle(.segmented)
                .padding(.horizontal, 16)
                .padding(.vertical, 8)
                .background(CalicoTheme.warmCardBackground)
                
                switch displayMode {
                case .week:
                    WeeklyGridView()
                case .day:
                    dayListView
                }
            }
            .background(CalicoTheme.warmPageBackground)
            .navigationTitle("可樂課表")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .principal) {
                    HStack(spacing: 6) {
                        CalicoCatAvatar(size: 24, mood: .happy)
                        Text("可樂課表")
                            .font(.system(.headline, design: .rounded).weight(.bold))
                            .foregroundColor(.primary)
                    }
                }
                
                ToolbarItem(placement: .topBarLeading) {
                    HStack(spacing: 10) {
                        Button {
                            showingShareSheet = true
                        } label: {
                            Image(systemName: "person.2.circle")
                                .font(.system(size: 18))
                                .foregroundColor(CalicoTheme.cocoaBrown)
                        }
                        
                        Button {
                            showingPeriodSettings = true
                        } label: {
                            Image(systemName: "slider.horizontal.3")
                                .font(.system(size: 16))
                                .foregroundColor(.secondary)
                        }
                        
                        Button {
                            showingLockScreenPreview = true
                        } label: {
                            Image(systemName: "iphone.gen3")
                                .font(.system(size: 16))
                                .foregroundColor(CalicoTheme.warmOrange)
                        }
                        
                        Button {
                            showingLineBotSettings = true
                        } label: {
                            Image(systemName: "bubble.left.and.bubble.right.fill")
                                .font(.system(size: 16))
                                .foregroundColor(CalicoTheme.sageGreen)
                        }
                    }
                }
                
                ToolbarItem(placement: .topBarTrailing) {
                    HStack(spacing: 10) {
                        Button {
                            showingOCRSheet = true
                        } label: {
                            HStack(spacing: 3) {
                                Image(systemName: "sparkles")
                                    .font(.system(size: 12, weight: .bold))
                                Text("AI 匯入")
                                    .font(.system(size: 12, weight: .bold, design: .rounded))
                            }
                            .padding(.horizontal, 9)
                            .padding(.vertical, 5)
                            .background(
                                LinearGradient(
                                    colors: [CalicoTheme.warmOrange, CalicoTheme.pawPink],
                                    startPoint: .leading,
                                    endPoint: .trailing
                                )
                            )
                            .foregroundColor(.white)
                            .clipShape(Capsule())
                            .shadow(color: CalicoTheme.warmOrange.opacity(0.25), radius: 4, x: 0, y: 2)
                        }
                        
                        Button {
                            showingAddSheet = true
                        } label: {
                            Image(systemName: "plus.circle.fill")
                                .font(.system(size: 20))
                                .foregroundColor(CalicoTheme.warmOrange)
                        }
                    }
                }
            }
            .refreshable {
                await dataManager.fetchFromSupabase()
            }
            .sheet(isPresented: $showingAddSheet) {
                AddCourseSheet(initialWeekday: selectedWeekday)
            }
            .sheet(isPresented: $showingOCRSheet) {
                ScheduleOCRSheet()
            }
            .sheet(isPresented: $showingShareSheet) {
                ShareCalendarSheet()
            }
            .sheet(isPresented: $showingPeriodSettings) {
                PeriodSettingsSheet()
            }
            .sheet(isPresented: $showingLockScreenPreview) {
                LockScreenPreviewSheet()
            }
            .sheet(isPresented: $showingLineBotSettings) {
                LineBotSettingsSheet()
            }
            .sheet(item: $editingCourse) { course in
                EditCourseSheet(course: course)
            }
        }
    }
    
    // MARK: - 單日列表視圖
    private var dayListView: some View {
        VStack(spacing: 0) {
            // 星期切換列
            weekdaySelector
                .padding(.vertical, 10)
                .background(.ultraThinMaterial)
            
            Divider().opacity(0.4)
            
            let dayCourses = dataManager.courses(for: selectedWeekday.rawValue)
            
            ScrollView {
                LazyVStack(spacing: 14) {
                    if dayCourses.isEmpty {
                        EmptyStateView(
                            icon: "sun.max.fill",
                            title: "\(selectedWeekday.shortName)沒有排課",
                            subtitle: "點擊右上角「+」即可為這一天新增課程（支援中午排課）"
                        )
                        .padding(.vertical, 32)
                    } else {
                        ForEach(dayCourses) { course in
                            Button {
                                editingCourse = course
                            } label: {
                                CourseTimelineCard(course: course)
                            }
                            .buttonStyle(.plain)
                            .contextMenu {
                                Button {
                                    editingCourse = course
                                } label: {
                                    Label("編輯課程", systemImage: "pencil")
                                }
                                
                                Button(role: .destructive) {
                                    withAnimation {
                                        dataManager.deleteCourse(course)
                                    }
                                } label: {
                                    Label("刪除課程", systemImage: "trash")
                                }
                            }
                        }
                    }
                }
                .padding(16)
            }
        }
    }
    
    // MARK: - 星期切換列 (iOS 27 Liquid Glass 膠囊方塊)
    private var weekdaySelector: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(WeekDay.allCases) { weekday in
                    let isSelected = selectedWeekday == weekday
                    let isToday = WeekDay.from(date: Date()) == weekday
                    let hasCourse = !dataManager.courses(for: weekday.rawValue).isEmpty
                    
                    Button {
                        UIImpactFeedbackGenerator(style: .light).impactOccurred()
                        withAnimation(.spring(response: 0.3, dampingFraction: 0.75)) {
                            selectedWeekday = weekday
                        }
                    } label: {
                        VStack(spacing: 4) {
                            Text(weekday.englishShort)
                                .font(.system(size: 10, weight: .semibold, design: .rounded))
                                .foregroundColor(isSelected ? .white.opacity(0.9) : .secondary)
                            Text(weekday.shortName)
                                .font(.system(.subheadline, design: .rounded).weight(.bold))
                                .foregroundColor(isSelected ? .white : .primary)
                            
                            Circle()
                                .fill(isSelected ? Color.white : (hasCourse ? CalicoTheme.warmOrange : Color.clear))
                                .frame(width: 5, height: 5)
                        }
                        .frame(width: 58, height: 62)
                        .background {
                            if isSelected {
                                RoundedRectangle(cornerRadius: 16, style: .continuous)
                                    .fill(CalicoTheme.accentGradient)
                            } else {
                                RoundedRectangle(cornerRadius: 16, style: .continuous)
                                    .fill(isToday ? CalicoTheme.warmOrange.opacity(0.12) : CalicoTheme.warmCardBackground)
                            }
                        }
                        .overlay(
                            RoundedRectangle(cornerRadius: 16, style: .continuous)
                                .strokeBorder(
                                    isSelected
                                        ? Color.white.opacity(0.55)
                                        : (isToday ? CalicoTheme.warmOrange.opacity(0.6) : Color.white.opacity(0.45)),
                                    lineWidth: 1.1
                                )
                        )
                        .shadow(color: isSelected ? CalicoTheme.warmOrange.opacity(0.28) : .clear, radius: 6, y: 3)
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(.horizontal, 16)
        }
    }
}

// MARK: - 課程時間軸卡片 (iOS 27 Liquid Glass + 節次/中午標籤)
struct CourseTimelineCard: View {
    let course: Course
    @ObservedObject var periodManager = PeriodScheduleManager.shared
    
    private var periodBadgeText: String? {
        let matched = periodManager.matchedPeriods(startTime: course.startTime, endTime: course.endTime)
        guard !matched.isEmpty else { return nil }
        if matched.count == 1, let first = matched.first {
            return first.id == 100 ? "☀️ 中午排課" : "第 \(first.displayCode) 節"
        }
        let codes = matched.map { $0.displayCode }.joined(separator: "·")
        return "第 \(codes) 節"
    }
    
    var body: some View {
        HStack(alignment: .top, spacing: 14) {
            VStack(alignment: .trailing, spacing: 4) {
                Text(course.startTime)
                    .font(.system(.callout, design: .rounded).weight(.bold))
                    .foregroundColor(.primary)
                Text(course.endTime)
                    .font(.system(.caption2, design: .rounded))
                    .foregroundColor(.secondary)
            }
            .frame(width: 52)
            
            RoundedRectangle(cornerRadius: 3, style: .continuous)
                .fill(Color(hex: course.colorHex))
                .frame(width: 4.5)
            
            VStack(alignment: .leading, spacing: 8) {
                HStack(spacing: 6) {
                    Text(course.name)
                        .font(.system(.headline, design: .rounded).weight(.bold))
                        .foregroundColor(.primary)
                    Spacer()
                    if let badge = periodBadgeText {
                        Text(badge)
                            .font(.system(size: 10, weight: .bold, design: .rounded))
                            .padding(.horizontal, 7)
                            .padding(.vertical, 2.5)
                            .background(CalicoTheme.warmOrange.opacity(0.14))
                            .foregroundColor(CalicoTheme.warmOrange)
                            .clipShape(Capsule())
                    }
                    if !course.code.isEmpty {
                        Text(course.code)
                            .font(.system(size: 10, weight: .bold, design: .rounded))
                            .padding(.horizontal, 7)
                            .padding(.vertical, 2.5)
                            .background(Color(hex: course.colorHex).opacity(0.15))
                            .foregroundColor(Color(hex: course.colorHex))
                            .clipShape(Capsule())
                    }
                }
                
                HStack(spacing: 12) {
                    if !course.classroom.isEmpty {
                        Label(course.classroom, systemImage: "mappin.and.ellipse")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    if !course.instructor.isEmpty {
                        Label(course.instructor, systemImage: "person.fill")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    if !course.isSharedWithFriends {
                        Label("私密", systemImage: "lock.fill")
                            .font(.caption2)
                            .foregroundColor(.secondary)
                    }
                }
            }
        }
        .campusCardStyle()
    }
}

// MARK: - 新增課程彈窗 (支援中午排課單擊直選、多節連堂與自訂時間)
struct AddCourseSheet: View {
    @Environment(\.dismiss) var dismiss
    @EnvironmentObject var dataManager: DataManager
    @ObservedObject var periodManager = PeriodScheduleManager.shared
    
    @State private var name: String = ""
    @State private var code: String = ""
    @State private var classroom: String = ""
    @State private var instructor: String = ""
    @State private var selectedWeekday: WeekDay
    
    // 勾選節次狀態
    @State private var selectedPeriodIds: Set<Int> = [1]
    @State private var hasInteractedWithPeriods: Bool = false
    @State private var isManualTime: Bool = false
    @State private var startTimeString: String = "08:10"
    @State private var endTimeString: String = "09:00"
    
    @State private var selectedColorHex: String = CampusColors.palette[0]
    @State private var isSharedWithFriends: Bool = true
    @State private var showingPeriodSettings = false
    @State private var showingOCRSheet = false
    
    init(initialWeekday: WeekDay = .monday) {
        _selectedWeekday = State(initialValue: initialWeekday)
    }
    
    var body: some View {
        NavigationStack {
            Form {
                Section {
                    Button {
                        showingOCRSheet = true
                    } label: {
                        HStack(spacing: 12) {
                            Image(systemName: "sparkles.rectangle.stack.fill")
                                .font(.system(size: 20))
                                .foregroundColor(CalicoTheme.warmOrange)
                            VStack(alignment: .leading, spacing: 2) {
                                Text("Gemini AI 課表截圖一鍵自動匯入")
                                    .font(.subheadline.weight(.bold))
                                    .foregroundColor(.primary)
                                Text("自動辨識整張課表內容與節次時間（支援中午排課時段）")
                                    .font(.caption2)
                                    .foregroundColor(.secondary)
                            }
                            Spacer()
                            Image(systemName: "chevron.right")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                        .padding(.vertical, 4)
                    }
                }
                
                Section("課程基本資訊") {
                    TextField("課程名稱 (例如：微積分 / 午間研討)", text: $name)
                    TextField("課程代碼 (例如：MATH101)", text: $code)
                    TextField("教室地點 (例如：工三館 101)", text: $classroom)
                    TextField("授課教師 (例如：陳教授)", text: $instructor)
                }
                
                Section {
                    Picker("上課星期", selection: $selectedWeekday) {
                        ForEach(WeekDay.allCases) { day in
                            Text(day.shortName).tag(day)
                        }
                    }
                } header: {
                    Text("上課星期")
                }
                
                // 節次勾選快速選擇
                Section {
                    VStack(alignment: .leading, spacing: 10) {
                        HStack {
                            Text("點選節次（支援「中午」或連堂多選）：")
                                .font(.caption)
                                .foregroundColor(.secondary)
                            Spacer()
                            if selectedPeriodIds.count > 1, let lastId = selectedPeriodIds.sorted().last {
                                Button("僅選單節") {
                                    selectedPeriodIds = [lastId]
                                    updateTimeFromSelectedPeriods()
                                }
                                .font(.caption2.weight(.bold))
                                .foregroundColor(CalicoTheme.pawPink)
                                .padding(.trailing, 6)
                            }
                            Button("自訂作息時間") {
                                showingPeriodSettings = true
                            }
                            .font(.caption2.weight(.bold))
                            .foregroundColor(CalicoTheme.warmOrange)
                        }
                        
                        // 節次多選按鈕網格（依 1~4 -> 中午 -> 5~14 排序）
                        let sortedPeriods = PeriodScheduleManager.sortPeriodsLogically(periodManager.periods)
                        LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 6), count: 5), spacing: 8) {
                            ForEach(sortedPeriods) { period in
                                let isSelected = selectedPeriodIds.contains(period.id)
                                let isNoon = (period.id == 100 || period.name.contains("中午"))
                                Button {
                                    togglePeriod(period.id)
                                } label: {
                                    VStack(spacing: 2) {
                                        Text(period.displayCode)
                                            .font(isNoon ? .caption.weight(.bold) : .subheadline.weight(.bold))
                                        Text(period.startTime)
                                            .font(.system(size: 9))
                                    }
                                    .frame(maxWidth: .infinity)
                                    .frame(height: 44)
                                    .background(
                                        isSelected
                                            ? CalicoTheme.warmOrange
                                            : (isNoon ? CalicoTheme.warmOrange.opacity(0.14) : Color(.secondarySystemBackground))
                                    )
                                    .foregroundColor(isSelected ? .white : (isNoon ? CalicoTheme.warmOrange : .primary))
                                    .cornerRadius(10)
                                    .overlay(
                                        RoundedRectangle(cornerRadius: 10)
                                            .stroke(isSelected ? CalicoTheme.warmOrange : (isNoon ? CalicoTheme.warmOrange.opacity(0.4) : Color.clear), lineWidth: 1.5)
                                    )
                                }
                                .buttonStyle(.plain)
                            }
                        }
                    }
                    .padding(.vertical, 4)
                    
                    // 自動計算的時段顯示
                    HStack {
                        Text("計算時段：")
                            .font(.subheadline)
                        Spacer()
                        Text("\(startTimeString) ~ \(endTimeString)")
                            .font(.subheadline.weight(.bold))
                            .foregroundColor(CalicoTheme.warmOrange)
                    }
                    
                    Toggle("手動自訂開始與結束時間", isOn: $isManualTime)
                    
                    if isManualTime {
                        HStack {
                            TextField("開始", text: $startTimeString)
                                .textFieldStyle(.roundedBorder)
                                .frame(width: 80)
                            Text("~")
                            TextField("結束", text: $endTimeString)
                                .textFieldStyle(.roundedBorder)
                                .frame(width: 80)
                        }
                    }
                } header: {
                    Text("上課節次與時間 (點選快速勾選)")
                }
                
                Section("代表色彩") {
                    HStack(spacing: 12) {
                        ForEach(CampusColors.palette, id: \.self) { colorHex in
                            Circle()
                                .fill(Color(hex: colorHex))
                                .frame(width: 32, height: 32)
                                .overlay(
                                    Circle()
                                        .stroke(Color.white, lineWidth: selectedColorHex == colorHex ? 3 : 0)
                                )
                                .shadow(radius: selectedColorHex == colorHex ? 2 : 0)
                                .scaleEffect(selectedColorHex == colorHex ? 1.15 : 1.0)
                                .onTapGesture {
                                    selectedColorHex = colorHex
                                }
                        }
                    }
                    .padding(.vertical, 4)
                }
                
                Section("好友分享隱私設定") {
                    Toggle("與好友共用此課程", isOn: $isSharedWithFriends)
                        .tint(CalicoTheme.warmOrange)
                    if !isSharedWithFriends {
                        Text("關閉後，此課程僅您自己可見，好友透過分享代碼將看不到此課程。")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
            }
            .navigationTitle("新增課程")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("取消") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("儲存") {
                        saveCourse()
                    }
                    .disabled(name.trimmingCharacters(in: .whitespaces).isEmpty)
                }
            }
            .sheet(isPresented: $showingPeriodSettings) {
                PeriodSettingsSheet()
            }
            .sheet(isPresented: $showingOCRSheet) {
                ScheduleOCRSheet()
            }
            .onAppear {
                updateTimeFromSelectedPeriods()
            }
        }
    }
    
    private func togglePeriod(_ id: Int) {
        // 首次點擊若不是預設第 1 節（例如直接點擊「中午」或第 5 節），直接單選該節次，避免與預設第 1 節連成 08:10~13:10
        if !hasInteractedWithPeriods {
            hasInteractedWithPeriods = true
            selectedPeriodIds = [id]
            updateTimeFromSelectedPeriods()
            return
        }
        
        if selectedPeriodIds.contains(id) {
            if selectedPeriodIds.count > 1 {
                selectedPeriodIds.remove(id)
            }
        } else {
            selectedPeriodIds.insert(id)
        }
        updateTimeFromSelectedPeriods()
    }
    
    private func updateTimeFromSelectedPeriods() {
        if let range = periodManager.timeRange(for: selectedPeriodIds) {
            startTimeString = range.startTime
            endTimeString = range.endTime
        }
    }
    
    private func saveCourse() {
        let newCourse = Course(
            name: name.trimmingCharacters(in: .whitespaces),
            code: code.trimmingCharacters(in: .whitespaces),
            classroom: classroom.trimmingCharacters(in: .whitespaces),
            instructor: instructor.trimmingCharacters(in: .whitespaces),
            dayOfWeek: selectedWeekday.rawValue,
            startTime: startTimeString,
            endTime: endTimeString,
            colorHex: selectedColorHex,
            isSharedWithFriends: isSharedWithFriends
        )
        
        dataManager.addCourse(newCourse)
        dismiss()
    }
}
