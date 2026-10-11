import SwiftUI
import Combine
//
//  TasksView.swift
//  Campus v1
//



enum TaskFilterStatus: String, CaseIterable, Identifiable {
    case active = "進行中"
    case thisWeek = "本週待辦"
    case all = "全部"
    case completed = "已完成"
    
    var id: String { rawValue }
}

struct TasksView: View {
    @EnvironmentObject var dataManager: DataManager
    @StateObject private var catManager = TodoCategoryManager()
    @State private var statusFilter: TaskFilterStatus = .active
    @State private var selectedCategoryName: String? = nil
    @State private var showingAddSheet = false
    @State private var editingTodo: TodoItem?
    
    var filteredTodos: [TodoItem] {
        let baseList: [TodoItem]
        switch statusFilter {
        case .active:
            baseList = dataManager.todos.filter { !$0.isCompleted }
        case .thisWeek:
            baseList = dataManager.thisWeekTodos().filter { !$0.isCompleted }
        case .all:
            baseList = dataManager.todos.filter { !$0.isCompleted }
        case .completed:
            baseList = dataManager.todos.filter { $0.isCompleted }
        }
        
        return baseList.filter { todo in
            if let selectedName = selectedCategoryName {
                return todo.displayCategoryName == selectedName
            }
            return true
        }
    }
    
    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // 三花貓可樂待辦陪伴小橫幅
                HStack(spacing: 10) {
                    CalicoCatAvatar(size: 36, mood: filteredTodos.isEmpty ? .happy : .studying)
                    VStack(alignment: .leading, spacing: 2) {
                        Text(filteredTodos.isEmpty ? "太棒了喵！目前的事項都完成囉 ✨" : "還有 \(filteredTodos.count) 項待辦，可樂陪你一起完成！")
                            .font(.system(size: 13, weight: .bold, design: .rounded))
                            .foregroundColor(.primary)
                        Text("支援設定自訂週期（起訖日期）與課堂作業綁定 🐾")
                            .font(.system(size: 10, design: .rounded))
                            .foregroundColor(.secondary)
                    }
                    Spacer()
                }
                .padding(.horizontal, 16)
                .padding(.top, 10)
                .padding(.bottom, 6)
                .background(CalicoTheme.warmCardBackground)
                
                // 狀態篩選 Segment
                Picker("狀態", selection: $statusFilter) {
                    ForEach(TaskFilterStatus.allCases) { status in
                        Text(status.rawValue).tag(status)
                    }
                }
                .pickerStyle(.segmented)
                .padding(.horizontal, 16)
                .padding(.vertical, 8)
                .background(CalicoTheme.warmCardBackground)
                
                // 類別標籤水平捲軸
                categoryFilterBar
                    .padding(.vertical, 6)
                    .background(CalicoTheme.warmCardBackground)
                
                Divider()
                
                // 待辦事項清單
                if filteredTodos.isEmpty {
                    Spacer()
                    EmptyStateView(
                        icon: statusFilter == .completed ? "checkmark.seal.fill" : (statusFilter == .thisWeek ? "calendar.badge.clock" : "checklist"),
                        title: statusFilter == .completed ? "尚無已完成事項" : (statusFilter == .thisWeek ? "本週沒有即將到期的待辦" : "太棒了！目前沒有待辦事項"),
                        subtitle: "點擊右上角「+」隨手記下作業或考試"
                    )
                    Spacer()
                } else {
                    List {
                        ForEach(filteredTodos) { todo in
                            TodoItemRow(todo: todo)
                                .listRowInsets(EdgeInsets(top: 6, leading: 16, bottom: 6, trailing: 16))
                                .listRowBackground(Color.clear)
                                .contextMenu {
                                    Button {
                                        editingTodo = todo
                                    } label: {
                                        Label("編輯", systemImage: "pencil")
                                    }
                                    Button(role: .destructive) {
                                        withAnimation {
                                            dataManager.deleteTodo(todo)
                                        }
                                    } label: {
                                        Label("刪除", systemImage: "trash")
                                    }
                                }

                                .listRowSeparator(.hidden)
                                .swipeActions(edge: .trailing, allowsFullSwipe: true) {
                                    Button(role: .destructive) {
                                        withAnimation {
                                            dataManager.deleteTodo(todo)
                                        }
                                    } label: {
                                        Label("刪除", systemImage: "trash")
                                    }
                                }
                        }
                    }
                    .listStyle(.plain)
                    .scrollContentBackground(.hidden)
                }
            }
            .background(CalicoTheme.warmPageBackground)
            .navigationTitle("待辦與作業")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .principal) {
                    HStack(spacing: 6) {
                        CalicoCatAvatar(size: 24, mood: .studying)
                        Text("待辦與作業")
                            .font(.system(.headline, design: .rounded).weight(.bold))
                            .foregroundColor(.primary)
                    }
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        showingAddSheet = true
                    } label: {
                        Image(systemName: "plus.circle.fill")
                            .font(.system(size: 20))
                            .foregroundColor(.accentColor)
                    }
                }
            }
            .refreshable {
                await dataManager.fetchFromSupabase()
            }
            .sheet(isPresented: $showingAddSheet) {
                AddTodoSheet()
            }
            .sheet(item: $editingTodo) { todo in
                AddTodoSheet(todoToEdit: todo)
            }

        }
    }
    
    // MARK: - 類別過濾條
    private var categoryFilterBar: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                Button {
                    withAnimation {
                        selectedCategoryName = nil
                    }
                } label: {
                    Text("全部")
                        .font(.caption.weight(.medium))
                        .padding(.horizontal, 12)
                        .padding(.vertical, 6)
                        .background(selectedCategoryName == nil ? Color.primary : Color(.secondarySystemBackground))
                        .foregroundColor(selectedCategoryName == nil ? Color(.systemBackground) : .secondary)
                        .clipShape(Capsule())
                }
                
                ForEach(catManager.categories) { cat in
                    let isSelected = selectedCategoryName == cat.name
                    Button {
                        withAnimation {
                            selectedCategoryName = isSelected ? nil : cat.name
                        }
                    } label: {
                        HStack(spacing: 4) {
                            Image(systemName: cat.iconName)
                            Text(cat.name)
                        }
                        .font(.caption.weight(.medium))
                        .padding(.horizontal, 12)
                        .padding(.vertical, 6)
                        .background(isSelected ? Color(hex: cat.colorHex) : Color(.secondarySystemBackground))
                        .foregroundColor(isSelected ? .white : .secondary)
                        .clipShape(Capsule())
                    }
                }
            }
            .padding(.horizontal, 16)
        }
    }
}

// MARK: - 待辦事項卡片 (含倒數日功能)
struct TodoItemRow: View {
    @EnvironmentObject var dataManager: DataManager
    let todo: TodoItem
    
    var linkedCourse: Course? {
        guard let id = todo.courseId else { return nil }
        return dataManager.courses.first(where: { $0.id == id })
    }
    
    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            // 完成打勾按鈕
            Button {
                withAnimation(.spring(response: 0.25, dampingFraction: 0.7)) {
                    dataManager.toggleTodoCompletion(todo)
                }
            } label: {
                Image(systemName: todo.isCompleted ? "checkmark.circle.fill" : "circle")
                    .font(.title2)
                    .foregroundColor(todo.isCompleted ? .green : .secondary)
            }
            .buttonStyle(.plain)
            .padding(.top, 2)
            
            // 待辦主體內容
            VStack(alignment: .leading, spacing: 6) {
                HStack(alignment: .top) {
                    Text(todo.title)
                        .font(.headline)
                        .strikethrough(todo.isCompleted)
                        .foregroundColor(todo.isCompleted ? .secondary : .primary)
                    
                    Spacer()
                    
                    // 倒數日膠囊標籤 (D-Day)
                    if todo.dueDate != nil {
                        HStack(spacing: 3) {
                            Image(systemName: todo.isPeriod ? "calendar.badge.clock" : "hourglass")
                                .font(.system(size: 9))
                            Text(todo.countdownBadgeText)
                                .font(.caption2.weight(.bold))
                        }
                        .foregroundColor(todo.countdownColor)
                        .padding(.horizontal, 7)
                        .padding(.vertical, 3)
                        .background(todo.countdownColor.opacity(0.12))
                        .clipShape(Capsule())
                    }
                }
                
                if !todo.notes.isEmpty {
                    Text(todo.notes)
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .lineLimit(2)
                }
                
                // 待讀論文專用資訊列
                if todo.category == .paper {
                    VStack(alignment: .leading, spacing: 4) {
                        if let authors = todo.paperAuthors, !authors.isEmpty {
                            HStack(spacing: 4) {
                                Image(systemName: "person.text.rectangle")
                                    .font(.system(size: 10))
                                    .foregroundColor(.secondary)
                                Text(authors)
                                    .font(.caption2)
                                    .foregroundColor(.secondary)
                            }
                        }
                        
                        if let urlStr = todo.paperURL, !urlStr.isEmpty, let url = URL(string: urlStr) {
                            Link(destination: url) {
                                HStack(spacing: 3) {
                                    Image(systemName: "link.circle.fill")
                                    Text("開啟論文連結 / DOI")
                                }
                                .font(.caption2.weight(.medium))
                                .foregroundColor(.teal)
                            }
                        }
                    }
                    .padding(.vertical, 2)
                }
                
                // 標籤列
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

                    
                    if todo.category == .paper, let status = todo.readingStatus {
                        Text(status.rawValue)
                            .font(.caption2.weight(.bold))
                            .foregroundColor(status.color)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(status.color.opacity(0.12))
                            .clipShape(Capsule())
                    }
                    
                    PriorityBadge(priority: todo.priority)
                    
                    if let course = linkedCourse {
                        HStack(spacing: 3) {
                            Circle()
                                .fill(Color(hex: course.colorHex))
                                .frame(width: 6, height: 6)
                            Text(course.name)
                                .font(.caption2.weight(.medium))
                                .foregroundColor(.secondary)
                        }
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(Color(.tertiarySystemBackground))
                        .clipShape(Capsule())
                    }
                    
                    if todo.hasReminder {
                        HStack(spacing: 3) {
                            Image(systemName: "bell.fill")
                                .font(.system(size: 8))
                            Text("提醒")
                                .font(.system(size: 9, weight: .bold))
                        }
                        .foregroundColor(.indigo)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(Color.indigo.opacity(0.12))
                        .clipShape(Capsule())
                    }
                    
                    if !todo.isSharedWithFriends {
                        Image(systemName: "lock.fill")
                            .font(.caption2)
                            .foregroundColor(.secondary)
                    }
                    
                    Spacer()
                    
                    if let periodText = todo.periodText {
                        periodBadge(text: periodText)
                    } else if let dueDate = todo.dueDate {
                        dueDateBadge(for: dueDate)
                    }
                }
                .padding(.top, 2)
            }
        }
        .campusCardStyle()
    }
    
    private func periodBadge(text: String) -> some View {
        HStack(spacing: 3) {
            Image(systemName: "clock.arrow.2.circlepath")
                .font(.system(size: 9))
            Text(text)
                .font(.caption2.weight(.medium))
        }
        .foregroundColor(.indigo)
        .padding(.horizontal, 6)
        .padding(.vertical, 2)
        .background(Color.indigo.opacity(0.1))
        .clipShape(Capsule())
    }
    
    private func dueDateBadge(for date: Date) -> some View {
        let calendar = Calendar.current
        let isPast = date < Date() && !calendar.isDateInToday(date)
        let isToday = calendar.isDateInToday(date)
        
        let formatter = DateFormatter()
        if calendar.isDateInToday(date) {
            formatter.dateFormat = "今日 HH:mm"
        } else if calendar.isDateInTomorrow(date) {
            formatter.dateFormat = "明日 HH:mm"
        } else {
            formatter.dateFormat = "M/d HH:mm"
        }
        
        return HStack(spacing: 3) {
            Image(systemName: isPast ? "exclamationmark.circle.fill" : "clock")
                .font(.system(size: 9))
            Text(formatter.string(from: date))
                .font(.caption2.weight(.medium))
        }
        .foregroundColor(isPast ? .red : (isToday ? .orange : .secondary))
        .padding(.horizontal, 6)
        .padding(.vertical, 2)
        .background(isPast ? Color.red.opacity(0.1) : (isToday ? Color.orange.opacity(0.1) : Color(.tertiarySystemBackground)))
        .clipShape(Capsule())
    }
}

// MARK: - 新增待辦事項彈窗
struct AddTodoSheet: View {
    @Environment(\.dismiss) var dismiss
    var todoToEdit: TodoItem?
    @EnvironmentObject var dataManager: DataManager
    
    @State private var title: String = ""
    @State private var notes: String = ""
    @State private var category: TodoCategory = .todo
    @State private var selectedCustomCat: CustomTodoCategory?
    @StateObject private var catManager = TodoCategoryManager()
    @State private var showingCatManager = false
    @State private var priority: TodoPriority = .medium
    @State private var isPeriodEnabled: Bool = false
    @State private var startDate: Date
    @State private var hasDueDate: Bool = true
    @State private var dueDate: Date
    @State private var hasReminder: Bool = false
    @State private var reminderDate: Date = Date().addingTimeInterval(3600)
    @State private var remind1DayBefore: Bool = true
    @State private var remind3DaysBefore: Bool = true
    @State private var selectedCourseId: UUID? = nil
    
    // 待讀論文專用欄位
    @State private var paperAuthors: String = ""
    @State private var paperURL: String = ""
    @State private var readingStatus: ReadingStatus = .unread
    @State private var isSharedWithFriends: Bool = true
    
    @State private var customCategoryName: String = ""
    @State private var customCategoryColorHex: String = "#95A5A6" 
    
    init(todoToEdit: TodoItem? = nil, preselectedDate: Date? = nil, preselectedStartHour: Int? = nil) {
        self.todoToEdit = todoToEdit
        let cal = Calendar.current
        let baseDate = preselectedDate ?? Date()
        
        if let todo = todoToEdit {
            _dueDate = State(initialValue: todo.dueDate ?? baseDate)
            _startDate = State(initialValue: todo.startDate ?? baseDate)
            _isPeriodEnabled = State(initialValue: todo.startDate != nil)
        } else if let hour = preselectedStartHour {
            let start = cal.date(bySettingHour: hour, minute: 0, second: 0, of: baseDate) ?? baseDate
            let end = cal.date(byAdding: .hour, value: 1, to: start) ?? start
            _startDate = State(initialValue: start)
            _dueDate = State(initialValue: end)
            _isPeriodEnabled = State(initialValue: true)
        } else {
            let initialDue = preselectedDate ?? cal.date(byAdding: .day, value: 1, to: Date()) ?? Date()
            _dueDate = State(initialValue: initialDue)
            _startDate = State(initialValue: baseDate)
            _isPeriodEnabled = State(initialValue: false)
        }
        _title = State(initialValue: todoToEdit?.title ?? "")
        _notes = State(initialValue: todoToEdit?.notes ?? "")
        _category = State(initialValue: todoToEdit?.category ?? .assignment)
        _priority = State(initialValue: todoToEdit?.priority ?? .medium)
        _hasDueDate = State(initialValue: todoToEdit != nil ? (todoToEdit?.dueDate != nil) : true)
        _hasReminder = State(initialValue: todoToEdit?.hasReminder ?? false)
        _reminderDate = State(initialValue: todoToEdit?.reminderDate ?? Date().addingTimeInterval(3600))
        _remind1DayBefore = State(initialValue: todoToEdit?.remind1DayBefore ?? true)
        _remind3DaysBefore = State(initialValue: todoToEdit?.remind3DaysBefore ?? true)
        _selectedCourseId = State(initialValue: todoToEdit?.courseId)
        _paperAuthors = State(initialValue: todoToEdit?.paperAuthors ?? "")
        _paperURL = State(initialValue: todoToEdit?.paperURL ?? "")
        _readingStatus = State(initialValue: todoToEdit?.readingStatus ?? .unread)
        _isSharedWithFriends = State(initialValue: todoToEdit?.isSharedWithFriends ?? true)
        _customCategoryName = State(initialValue: todoToEdit?.customCategoryName ?? "")
        _customCategoryColorHex = State(initialValue: todoToEdit?.customCategoryColorHex ?? "#95A5A6")
        
        let tempManager = TodoCategoryManager()
        let targetName = todoToEdit?.customCategoryName ?? todoToEdit?.category.rawValue
        let matched = tempManager.categories.first(where: { $0.name == targetName }) ?? tempManager.categories.first
        _selectedCustomCat = State(initialValue: matched)
    }
    
    var body: some View {
        NavigationStack {
            Form {
                Section("基本資訊") {
                    TextField(category == .paper ? "論文標題 (例如：Attention Is All You Need)" : "待辦標題 (例如：微積分作業 3)", text: $title)
                    TextField("備註說明 (選填)", text: $notes, axis: .vertical)
                        .lineLimit(3...6)
                }
                
                Section("分類與優先度") {
                    HStack {
                        Picker("類型", selection: $selectedCustomCat) {
                            ForEach(catManager.categories) { cat in
                                Label(cat.name, systemImage: cat.iconName).tag(cat as CustomTodoCategory?)
                            }
                        }
                        Button {
                            showingCatManager = true
                        } label: {
                            Image(systemName: "gearshape")
                        }
                    }

                    Picker("優先度", selection: $priority) {
                        ForEach(TodoPriority.allCases) { pri in
                            Text(pri.displayName).tag(pri)
                        }
                    }
                }
                
                // 待讀論文專屬區塊
                if selectedCustomCat?.name == "待讀論文" || category == .paper {
                    Section("待讀論文 / 文獻詳細資訊") {
                        TextField("作者 / 發表期刊或會議 (例如: Vaswani et al., NeurIPS)", text: $paperAuthors)
                        TextField("論文連結或 DOI 網址 (https://...)", text: $paperURL)
                            .autocorrectionDisabled()
                            .textInputAutocapitalization(.never)
                        
                        Picker("研讀進度", selection: $readingStatus) {
                            ForEach(ReadingStatus.allCases) { status in
                                Text(status.rawValue).tag(status)
                            }
                        }
                    }
                }
                
                Section("關聯課程 (選填)") {
                    Picker("所屬課程", selection: $selectedCourseId) {
                        Text("無關聯課程").tag(nil as UUID?)
                        ForEach(dataManager.courses) { course in
                            Text(course.name).tag(course.id as UUID?)
                        }
                    }
                }
                
                Section(category == .paper ? "研讀期限與自訂週期" : "日期與自訂週期") {
                    Toggle("設定自訂週期（從…到…）", isOn: $isPeriodEnabled)
                        .tint(.indigo)
                    
                    if isPeriodEnabled {
                        DatePicker("開始時間 (從)", selection: $startDate, displayedComponents: [.date, .hourAndMinute])
                            .onChange(of: startDate) { newStart in
                                if dueDate < newStart {
                                    dueDate = Calendar.current.date(byAdding: .hour, value: 1, to: newStart) ?? newStart
                                }
                            }
                        
                        DatePicker("結束時間 (到)", selection: $dueDate, in: startDate..., displayedComponents: [.date, .hourAndMinute])
                        
                        HStack(spacing: 4) {
                            Image(systemName: "info.circle")
                            Text("自訂週期期間每日均會顯示在行事曆與當日待辦中")
                        }
                        .font(.caption2)
                        .foregroundColor(.secondary)
                    } else {
                        Toggle("設定截止時間", isOn: $hasDueDate)
                        if hasDueDate {
                            DatePicker("截止時間", selection: $dueDate, displayedComponents: [.date, .hourAndMinute])
                        }
                    }
                }
                
                Section("時間提醒通知") {
                    if isPeriodEnabled || hasDueDate {
                        Toggle(isPeriodEnabled ? "週期結束前 1 天提醒 (上午 09:00)" : "截止前 1 天提醒 (上午 09:00)", isOn: $remind1DayBefore)
                            .tint(.indigo)
                        
                        Toggle(isPeriodEnabled ? "週期結束前 3 天提醒 (上午 09:00)" : "截止前 3 天提醒 (上午 09:00)", isOn: $remind3DaysBefore)
                            .tint(.indigo)
                    }
                    
                    Toggle("自訂時間推播提醒", isOn: $hasReminder)
                        .tint(.indigo)
                    if hasReminder {
                        DatePicker("提醒時間", selection: $reminderDate, displayedComponents: [.date, .hourAndMinute])
                    }
                }
                
                Section("好友分享隱私設定") {
                    Toggle("與好友共用此行程待辦", isOn: $isSharedWithFriends)
                        .tint(.indigo)
                    if !isSharedWithFriends {
                        Text("關閉後，此事項僅您自己可見，好友透過分享代碼將看不到此項目。")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
            }
            .scrollDismissesKeyboard(.interactively)
            .navigationTitle(category == .paper ? "新增待讀論文" : "新增待辦 / 作業")
            .navigationBarTitleDisplayMode(.inline)
        .sheet(isPresented: $showingCatManager) { TodoCategoryManagerSheet() }
            .toolbar {
                ToolbarItemGroup(placement: .keyboard) {
                    Spacer()
                    Button("完成") {
                        UIApplication.shared.sendAction(#selector(UIResponder.resignFirstResponder), to: nil, from: nil, for: nil)
                    }
                }
                ToolbarItem(placement: .cancellationAction) {
                    Button("取消") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("儲存") {
                        saveTodo()
                    }
                    .disabled(title.trimmingCharacters(in: .whitespaces).isEmpty)
                }
            }
        }
    }
    
    private func saveTodo() {
        let catName = selectedCustomCat?.name ?? "待辦"
        let catColor = selectedCustomCat?.colorHex ?? "#64748B"
        let finalStartDate: Date? = isPeriodEnabled ? startDate : nil
        let finalDueDate: Date? = isPeriodEnabled ? dueDate : (hasDueDate ? dueDate : nil)
        
        if var item = todoToEdit {
            item.title = title.trimmingCharacters(in: .whitespaces)
            item.notes = notes.trimmingCharacters(in: .whitespaces)
            item.startDate = finalStartDate
            item.dueDate = finalDueDate
            item.priority = priority
            item.category = .todo
            item.customCategoryName = catName
            item.customCategoryColorHex = catColor
            item.courseId = selectedCourseId
            item.paperAuthors = (catName == "待讀論文" || category == .paper) ? paperAuthors.trimmingCharacters(in: .whitespaces) : nil
            item.paperURL = (catName == "待讀論文" || category == .paper) ? paperURL.trimmingCharacters(in: .whitespaces) : nil
            item.readingStatus = (catName == "待讀論文" || category == .paper) ? readingStatus : nil
            item.isSharedWithFriends = isSharedWithFriends
            item.hasReminder = hasReminder
            item.reminderDate = hasReminder ? reminderDate : nil
            item.remind1DayBefore = remind1DayBefore
            item.remind3DaysBefore = remind3DaysBefore
            dataManager.updateTodo(item)
        } else {
            let newTodo = TodoItem(
                title: title.trimmingCharacters(in: .whitespaces),
                notes: notes.trimmingCharacters(in: .whitespaces),
                startDate: finalStartDate,
                dueDate: finalDueDate,
                priority: priority,
                category: .todo,
                customCategoryName: catName,
                customCategoryColorHex: catColor,
                courseId: selectedCourseId,
                paperAuthors: (catName == "待讀論文" || category == .paper) ? paperAuthors.trimmingCharacters(in: .whitespaces) : nil,
                paperURL: (catName == "待讀論文" || category == .paper) ? paperURL.trimmingCharacters(in: .whitespaces) : nil,
                readingStatus: (catName == "待讀論文" || category == .paper) ? readingStatus : nil,
                isSharedWithFriends: isSharedWithFriends,
                hasReminder: hasReminder,
                reminderDate: hasReminder ? reminderDate : nil,
                remind1DayBefore: remind1DayBefore,
                remind3DaysBefore: remind3DaysBefore
            )
            dataManager.addTodo(newTodo)
        }
        dismiss()
    }
}


struct CustomTodoCategory: Identifiable, Codable, Hashable {
    var id = UUID()
    var name: String
    var colorHex: String
    var iconName: String
}

class TodoCategoryManager: ObservableObject {
    public static let defaultCategories: [CustomTodoCategory] = [
        CustomTodoCategory(name: "作業", colorHex: "#4F46E5", iconName: "book.closed.fill"),
        CustomTodoCategory(name: "考試", colorHex: "#EA580C", iconName: "pencil.and.ruler.fill"),
        CustomTodoCategory(name: "待讀論文", colorHex: "#0D9488", iconName: "books.vertical.fill"),
        CustomTodoCategory(name: "專案實作", colorHex: "#0284C7", iconName: "folder.fill"),
        CustomTodoCategory(name: "簡報報告", colorHex: "#2563EB", iconName: "doc.text.fill"),
        CustomTodoCategory(name: "實驗實習", colorHex: "#059669", iconName: "flask.fill"),
        CustomTodoCategory(name: "會議討論", colorHex: "#7C3AED", iconName: "person.2.fill"),
        CustomTodoCategory(name: "社團活動", colorHex: "#DB2777", iconName: "flag.fill"),
        CustomTodoCategory(name: "日常生活", colorHex: "#D97706", iconName: "cup.and.saucer.fill"),
        CustomTodoCategory(name: "兼職打工", colorHex: "#16A34A", iconName: "briefcase.fill"),
        CustomTodoCategory(name: "期中複習", colorHex: "#8B5CF6", iconName: "brain.head.profile"),
        CustomTodoCategory(name: "一般待辦", colorHex: "#64748B", iconName: "checklist")
    ]
    
    @Published var categories: [CustomTodoCategory] = [] {
        didSet { save() }
    }
    
    init() {
        if let data = UserDefaults.standard.data(forKey: "customTodoCategories"),
           let saved = try? JSONDecoder().decode([CustomTodoCategory].self, from: data),
           !saved.isEmpty {
            if saved.count <= 3 {
                var merged = saved
                for def in Self.defaultCategories {
                    if !merged.contains(where: { $0.name == def.name }) {
                        merged.append(def)
                    }
                }
                self.categories = merged
                save()
            } else {
                self.categories = saved
            }
        } else {
            self.categories = Self.defaultCategories
            save()
        }
    }
    
    private func save() {
        if let data = try? JSONEncoder().encode(categories) {
            UserDefaults.standard.set(data, forKey: "customTodoCategories")
        }
    }
}

struct TodoCategoryManagerSheet: View {
    @Environment(\.dismiss) var dismiss
    @StateObject private var manager = TodoCategoryManager()
    @State private var newName = ""
    @State private var newColor = Color.indigo
    @State private var newIcon = "star.fill"
    
    let icons = ["star.fill", "book.fill", "folder.fill", "paperplane.fill", "bell.fill", "flag.fill", "heart.fill", "flame.fill"]
    
    var body: some View {
        NavigationView {
            Form {
                Section("新增自訂類別") {
                    TextField("類別名稱", text: $newName)
                    ColorPicker("標籤顏色", selection: $newColor)
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack {
                            
                            ForEach(icons, id: \.self) { icon in
                                if newIcon == icon {
                                    Image(systemName: icon)
                                        .padding(8)
                                        .background(Color.gray.opacity(0.2))
                                        .cornerRadius(8)
                                        .onTapGesture { newIcon = icon }
                                } else {
                                    Image(systemName: icon)
                                        .padding(8)
                                        .background(Color.clear)
                                        .cornerRadius(8)
                                        .onTapGesture { newIcon = icon }
                                }
                            }

                        }
                    }
                    Button("新增") {
                        if !newName.isEmpty {
                            manager.categories.append(CustomTodoCategory(name: newName, colorHex: newColor.toHexStr(), iconName: newIcon))
                            newName = ""
                        }
                    }
                    .disabled(newName.isEmpty)
                }
                
                Section("現有類別") {
                    ForEach(manager.categories) { cat in
                        HStack {
                            Image(systemName: cat.iconName)
                                .foregroundColor(Color(hex: cat.colorHex))
                            Text(cat.name)
                        }
                    }
                    .onDelete { indexSet in
                        manager.categories.remove(atOffsets: indexSet)
                    }
                }
            }
            .navigationTitle("管理待辦類別")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("完成") { dismiss() }
                }
            }
        }
    }
}


extension Color {
    func toHexStr() -> String {
        let uiColor = UIColor(self)
        var r: CGFloat = 0
        var g: CGFloat = 0
        var b: CGFloat = 0
        var a: CGFloat = 0
        uiColor.getRed(&r, green: &g, blue: &b, alpha: &a)
        let rgb: Int = (Int)(r*255)<<16 | (Int)(g*255)<<8 | (Int)(b*255)<<0
        return String(format: "#%06x", rgb)
    }
}
