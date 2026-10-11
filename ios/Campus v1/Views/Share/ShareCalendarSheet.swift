//
//  ShareCalendarSheet.swift
//  Campus v1
//

import SwiftUI

struct ShareCalendarSheet: View {
    @Environment(\.dismiss) var dismiss
    @EnvironmentObject var dataManager: DataManager
    
    @State private var shareName: String = ""
    @State private var friendCodeInput: String = ""
    @State private var friendNicknameInput: String = ""
    @State private var isPublishing = false
    @State private var isLoadingFriend = false
    @State private var errorMessage: String? = nil
    @State private var successMessage: String? = nil
    @State private var editingFriendRecord: SavedFriendRecord? = nil
    @State private var editingNicknameText: String = ""
    
    var body: some View {
        NavigationStack {
            Form {
                // 1. 我的分享碼區塊
                Section {
                    VStack(alignment: .center, spacing: 12) {
                        Text("您的專屬分享代碼（課表與記帳通用）")
                            .font(.caption)
                            .foregroundColor(.secondary)
                        
                        HStack(spacing: 8) {
                            Text(dataManager.myShareCode)
                                .font(.system(size: 32, weight: .bold, design: .monospaced))
                                .kerning(4)
                                .foregroundColor(.indigo)
                            
                            Button {
                                UIPasteboard.general.string = dataManager.myShareCode
                                successMessage = "已複製分享代碼到剪貼簿！"
                            } label: {
                                Image(systemName: "doc.on.doc.fill")
                                    .font(.title3)
                                    .foregroundColor(.indigo)
                            }
                            .buttonStyle(.plain)
                        }
                        .padding(.vertical, 4)
                        
                        TextField("您的課表暱稱 (如: 小明)", text: $shareName)
                            .textFieldStyle(.roundedBorder)
                            .multilineTextAlignment(.center)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 8)
                } header: {
                    Text("我的行事曆與記帳分享")
                } footer: {
                    Text("將此 6 位代碼提供給朋友，對方即可在「好友記錄簿」中儲存並隨時查看您的課表與分享的記帳。")
                }
                
                // 2. 隱私控制開關與立即同步
                Section("隱私安全與雲端同步") {
                    Toggle("允許他人查看我的課表", isOn: Binding(
                        get: { dataManager.isMySharingEnabled },
                        set: { newValue in
                            Task {
                                await dataManager.toggleSharing(isEnabled: newValue)
                            }
                        }
                    ))
                    .tint(.indigo)
                    
                    if !dataManager.isMySharingEnabled {
                        HStack {
                            Image(systemName: "lock.fill")
                                .foregroundColor(.orange)
                            Text("目前為「不分享」狀態，其他人輸入您的代碼將無法讀取課表。")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                    }
                    
                    Button {
                        saveShareName()
                        Task {
                            isPublishing = true
                            await dataManager.publishMySchedule()
                            isPublishing = false
                            if let msg = dataManager.shareSyncMessage {
                                successMessage = msg
                            }
                        }
                    } label: {
                        HStack {
                            Spacer()
                            if isPublishing {
                                ProgressView()
                            } else {
                                Label("發布 / 同步最新課表與記帳至雲端", systemImage: "arrow.triangle.2.circlepath.icloud.fill")
                            }
                            Spacer()
                        }
                    }
                    .disabled(!dataManager.isMySharingEnabled)
                }
                
                // 3. 好友分享記錄簿 (免每次重複輸入代碼)
                Section {
                    if dataManager.savedFriends.isEmpty {
                        HStack(spacing: 10) {
                            Image(systemName: "book.closed.fill")
                                .foregroundColor(.secondary)
                            Text("記錄簿尚無好友，在下方輸入一次好友代碼即可自動永久保存！")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                        .padding(.vertical, 4)
                    } else {
                        ForEach(dataManager.savedFriends) { record in
                            let isCurrent = (dataManager.friendSchedule?.shareCode == record.shareCode && dataManager.isFriendScheduleExpanded)
                            HStack(spacing: 12) {
                                ZStack {
                                    Circle()
                                        .fill(Color.indigo.opacity(0.14))
                                        .frame(width: 38, height: 38)
                                    Text(String(record.displayName.prefix(1)))
                                        .font(.subheadline.weight(.bold))
                                        .foregroundColor(.indigo)
                                }
                                
                                VStack(alignment: .leading, spacing: 2) {
                                    HStack(spacing: 6) {
                                        Text(record.displayName)
                                            .font(.subheadline.weight(.bold))
                                        Text(record.shareCode)
                                            .font(.caption2.monospaced().weight(.semibold))
                                            .padding(.horizontal, 6)
                                            .padding(.vertical, 1)
                                            .background(Color.indigo.opacity(0.1))
                                            .foregroundColor(.indigo)
                                            .cornerRadius(4)
                                    }
                                    Text("課表 \(record.coursesCount) 門課 · 記帳 \(record.accountingCount) 筆")
                                        .font(.caption2)
                                        .foregroundColor(.secondary)
                                }
                                
                                Spacer()
                                
                                Button {
                                    editingFriendRecord = record
                                    editingNicknameText = record.nickname.isEmpty ? record.ownerName : record.nickname
                                } label: {
                                    Image(systemName: "pencil.circle")
                                        .foregroundColor(.secondary)
                                }
                                .buttonStyle(.plain)
                                
                                Button {
                                    dataManager.selectSavedFriendForSchedule(record)
                                    dismiss()
                                } label: {
                                    Text(isCurrent ? "折疊顯示中" : "在折疊中查看")
                                        .font(.caption.weight(.bold))
                                        .padding(.horizontal, 10)
                                        .padding(.vertical, 6)
                                        .background(isCurrent ? Color.green : Color.indigo)
                                        .foregroundColor(.white)
                                        .cornerRadius(8)
                                }
                                .buttonStyle(.plain)
                            }
                            .padding(.vertical, 2)
                            .swipeActions(edge: .trailing) {
                                Button(role: .destructive) {
                                    dataManager.removeSavedFriend(shareCode: record.shareCode)
                                } label: {
                                    Label("刪除", systemImage: "trash")
                                }
                            }
                        }
                    }
                } header: {
                    Text("📒 好友分享記錄簿 (\(dataManager.savedFriends.count) 位，點選免輸代碼)")
                } footer: {
                    Text("點選「在折疊中查看」會直接在課表頁面的「好友課表折疊匣」展開該好友課表，不會覆蓋您自己的課表！")
                }
                
                // 4. 新增好友代碼至記錄簿
                Section {
                    TextField("輸入好友 6 位分享代碼 (例如 AB12CD)", text: $friendCodeInput)
                        .autocorrectionDisabled()
                        .textInputAutocapitalization(.characters)
                        .font(.system(.body, design: .monospaced))
                    
                    TextField("好記的備註名稱（選填，例如：室友小明）", text: $friendNicknameInput)
                    
                    Button {
                        loadFriend()
                    } label: {
                        HStack {
                            Spacer()
                            if isLoadingFriend {
                                ProgressView()
                            } else {
                                Image(systemName: "person.badge.plus")
                                Text("加入好友記錄簿並在折疊中查看")
                                    .fontWeight(.bold)
                            }
                            Spacer()
                        }
                    }
                    .disabled(friendCodeInput.trimmingCharacters(in: .whitespaces).isEmpty || isLoadingFriend)
                } header: {
                    Text("新增好友至記錄簿")
                }
            }
            .navigationTitle("好友分享與記錄簿")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("完成") {
                        saveShareName()
                        dismiss()
                    }
                }
            }
            .onAppear {
                shareName = dataManager.myShareName
            }
            .alert("提示", isPresented: Binding(
                get: { successMessage != nil || errorMessage != nil },
                set: { _ in successMessage = nil; errorMessage = nil }
            )) {
                Button("確定") {}
            } message: {
                Text(successMessage ?? errorMessage ?? "")
            }
            .alert("修改好友備註名稱", isPresented: Binding(
                get: { editingFriendRecord != nil },
                set: { if !$0 { editingFriendRecord = nil } }
            )) {
                TextField("輸入備註名稱", text: $editingNicknameText)
                Button("取消", role: .cancel) { editingFriendRecord = nil }
                Button("儲存") {
                    if let rec = editingFriendRecord {
                        dataManager.updateSavedFriendNickname(shareCode: rec.shareCode, nickname: editingNicknameText)
                    }
                    editingFriendRecord = nil
                }
            }
        }
    }
    
    private func saveShareName() {
        let trimmed = shareName.trimmingCharacters(in: .whitespaces)
        if !trimmed.isEmpty {
            dataManager.myShareName = trimmed
            UserDefaults.standard.set(trimmed, forKey: "campus_my_share_name")
        }
    }
    
    private func loadFriend() {
        isLoadingFriend = true
        errorMessage = nil
        let nick = friendNicknameInput.trimmingCharacters(in: .whitespacesAndNewlines)
        Task {
            let result = await dataManager.loadFriendSchedule(shareCode: friendCodeInput, customNickname: nick)
            isLoadingFriend = false
            switch result {
            case .success(let friend):
                friendCodeInput = ""
                friendNicknameInput = ""
                successMessage = "已將「\(nick.isEmpty ? friend.ownerName : nick)」加入好友記錄簿，並展開好友課表折疊匣！"
            case .failure(let err):
                errorMessage = err.localizedDescription
            }
        }
    }
}

// MARK: - 課表頁面專用：好友課表折疊檢視卡片 (不覆蓋自己的課表，內建好友記錄簿與今日/週課表切換)
struct FriendScheduleCollapsibleCard: View {
    @EnvironmentObject var dataManager: DataManager
    @ObservedObject var periodManager = PeriodScheduleManager.shared
    
    enum FriendScheduleSubMode: String, CaseIterable, Identifiable {
        case weeklyGrid = "一週課表網格"
        case dailyList = "依星期列表"
        var id: String { rawValue }
    }
    
    @State private var subMode: FriendScheduleSubMode = .weeklyGrid
    @State private var selectedWeekday: WeekDay = WeekDay.from(date: Date())
    @State private var showingAddFriendRow: Bool = false
    @State private var newFriendCode: String = ""
    @State private var newFriendNickname: String = ""
    @State private var isLoading: Bool = false
    @State private var inlineError: String? = nil
    @State private var selectedFriendCourse: Course? = nil
    
    var body: some View {
        VStack(spacing: 0) {
            // 折疊標題列 (點擊展開 / 收合)
            Button {
                withAnimation(.spring(response: 0.32, dampingFraction: 0.8)) {
                    dataManager.isFriendScheduleExpanded.toggle()
                    if dataManager.isFriendScheduleExpanded && dataManager.friendSchedule == nil,
                       let first = dataManager.savedFriends.first {
                        dataManager.selectSavedFriendForSchedule(first)
                    }
                }
            } label: {
                HStack(spacing: 10) {
                    ZStack {
                        RoundedRectangle(cornerRadius: 10, style: .continuous)
                            .fill(Color.indigo.opacity(0.14))
                            .frame(width: 36, height: 36)
                        Image(systemName: "person.2.crop.square.stack.fill")
                            .font(.system(size: 16, weight: .bold))
                            .foregroundColor(.indigo)
                    }
                    
                    VStack(alignment: .leading, spacing: 2) {
                        HStack(spacing: 6) {
                            Text("好友課表折疊檢視")
                                .font(.system(.subheadline, design: .rounded).weight(.bold))
                                .foregroundColor(.primary)
                            
                            Text("記錄簿 \(dataManager.savedFriends.count) 人")
                                .font(.system(size: 10, weight: .bold, design: .rounded))
                                .padding(.horizontal, 6)
                                .padding(.vertical, 2)
                                .background(Color.indigo.opacity(0.12))
                                .foregroundColor(.indigo)
                                .clipShape(Capsule())
                        }
                        
                        if let friend = dataManager.friendSchedule {
                            let friendName = displayFriendName(for: friend)
                            let todayCount = dataManager.friendCourses(for: WeekDay.from(date: Date())).count
                            Text("目前選擇：\(friendName)（今日 \(todayCount) 堂課 · 共 \(friend.coursesData.filter { $0.isSharedWithFriends }.count) 門）")
                                .font(.caption2)
                                .foregroundColor(.secondary)
                                .lineLimit(1)
                        } else {
                            Text("點擊展開並從記錄簿選擇好友課表（不會覆蓋您的課表）")
                                .font(.caption2)
                                .foregroundColor(.secondary)
                                .lineLimit(1)
                        }
                    }
                    
                    Spacer()
                    
                    HStack(spacing: 4) {
                        Text(dataManager.isFriendScheduleExpanded ? "收合" : "展開")
                            .font(.caption2.weight(.bold))
                            .foregroundColor(.indigo)
                        Image(systemName: dataManager.isFriendScheduleExpanded ? "chevron.up.circle.fill" : "chevron.down.circle.fill")
                            .font(.system(size: 18))
                            .foregroundColor(.indigo)
                    }
                }
                .padding(.horizontal, 14)
                .padding(.vertical, 12)
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            
            // 展開後的折疊內容
            if dataManager.isFriendScheduleExpanded {
                Divider()
                    .padding(.horizontal, 12)
                
                VStack(alignment: .leading, spacing: 12) {
                    // 1. 好友分享記錄簿橫向快速切換列 (免每次輸入代碼)
                    VStack(alignment: .leading, spacing: 8) {
                        HStack {
                            Label("好友分享記錄簿（點擊直接切換）", systemImage: "book.pages.fill")
                                .font(.caption.weight(.bold))
                                .foregroundColor(.secondary)
                            Spacer()
                            Button {
                                withAnimation {
                                    showingAddFriendRow.toggle()
                                }
                            } label: {
                                HStack(spacing: 3) {
                                    Image(systemName: showingAddFriendRow ? "minus.circle.fill" : "plus.circle.fill")
                                    Text(showingAddFriendRow ? "隱藏新增" : "新增好友代碼")
                                }
                                .font(.caption2.weight(.bold))
                                .foregroundColor(.indigo)
                            }
                            .buttonStyle(.plain)
                        }
                        
                        if !dataManager.savedFriends.isEmpty {
                            ScrollView(.horizontal, showsIndicators: false) {
                                HStack(spacing: 8) {
                                    ForEach(dataManager.savedFriends) { record in
                                        let isSelected = dataManager.friendSchedule?.shareCode == record.shareCode
                                        Button {
                                            dataManager.selectSavedFriendForSchedule(record)
                                        } label: {
                                            HStack(spacing: 6) {
                                                Image(systemName: isSelected ? "person.crop.circle.fill.badge.checkmark" : "person.crop.circle")
                                                    .font(.system(size: 13, weight: .bold))
                                                VStack(alignment: .leading, spacing: 1) {
                                                    Text(record.displayName)
                                                        .font(.caption.weight(.bold))
                                                    Text("\(record.shareCode) · \(record.coursesCount)門課")
                                                        .font(.system(size: 9, design: .monospaced))
                                                        .opacity(0.85)
                                                }
                                            }
                                            .padding(.horizontal, 10)
                                            .padding(.vertical, 6)
                                            .background(isSelected ? Color.indigo : Color(.secondarySystemBackground))
                                            .foregroundColor(isSelected ? .white : .primary)
                                            .cornerRadius(10)
                                        }
                                        .buttonStyle(.plain)
                                        .contextMenu {
                                            Button {
                                                dataManager.selectSavedFriendForSchedule(record)
                                            } label: {
                                                Label("重新同步此好友課表", systemImage: "arrow.clockwise")
                                            }
                                            Button(role: .destructive) {
                                                dataManager.removeSavedFriend(shareCode: record.shareCode)
                                            } label: {
                                                Label("從記錄簿移除", systemImage: "trash")
                                            }
                                        }
                                    }
                                }
                            }
                        } else if !showingAddFriendRow {
                            Button {
                                withAnimation { showingAddFriendRow = true }
                            } label: {
                                HStack {
                                    Image(systemName: "plus.circle.fill")
                                    Text("記錄簿尚無好友，點此輸入一次 6 碼代碼永久保存")
                                        .font(.caption)
                                }
                                .foregroundColor(.indigo)
                                .padding(.vertical, 4)
                            }
                            .buttonStyle(.plain)
                        }
                        
                        // 新增好友代碼輸入列
                        if showingAddFriendRow || dataManager.savedFriends.isEmpty {
                            VStack(spacing: 8) {
                                HStack(spacing: 8) {
                                    TextField("好友 6 碼代碼 (如 AB12CD)", text: $newFriendCode)
                                        .textInputAutocapitalization(.characters)
                                        .autocorrectionDisabled()
                                        .font(.system(size: 13, design: .monospaced))
                                        .padding(8)
                                        .background(Color(.secondarySystemBackground))
                                        .cornerRadius(8)
                                    
                                    TextField("備註名 (如 小明)", text: $newFriendNickname)
                                        .font(.system(size: 13))
                                        .padding(8)
                                        .background(Color(.secondarySystemBackground))
                                        .cornerRadius(8)
                                        .frame(maxWidth: 120)
                                    
                                    Button {
                                        addAndLoadFriend()
                                    } label: {
                                        if isLoading {
                                            ProgressView()
                                                .frame(width: 56, height: 34)
                                        } else {
                                            Text("存入查看")
                                                .font(.caption.weight(.bold))
                                                .padding(.horizontal, 10)
                                                .frame(height: 34)
                                                .background(Color.indigo)
                                                .foregroundColor(.white)
                                                .cornerRadius(8)
                                        }
                                    }
                                    .buttonStyle(.plain)
                                    .disabled(newFriendCode.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || isLoading)
                                }
                                
                                if let err = inlineError {
                                    Text(err)
                                        .font(.caption2)
                                        .foregroundColor(.red)
                                }
                            }
                            .padding(10)
                            .background(Color.indigo.opacity(0.05))
                            .cornerRadius(10)
                        }
                    }
                    
                    // 2. 顯示選中好友的課表內容
                    if let friend = dataManager.friendSchedule {
                        let friendDisplay = displayFriendName(for: friend)
                        VStack(alignment: .leading, spacing: 10) {
                            HStack {
                                HStack(spacing: 6) {
                                    Image(systemName: "calendar.badge.clock")
                                        .foregroundColor(.indigo)
                                        .font(.caption)
                                    Text("【\(friendDisplay)】的課表")
                                        .font(.subheadline.weight(.bold))
                                        .foregroundColor(.indigo)
                                }
                                
                                Spacer()
                                
                                Button {
                                    refreshCurrentFriend(friend.shareCode)
                                } label: {
                                    HStack(spacing: 3) {
                                        if isLoading {
                                            ProgressView().scaleEffect(0.7)
                                        } else {
                                            Image(systemName: "arrow.clockwise")
                                        }
                                        Text("更新")
                                    }
                                    .font(.caption2.weight(.semibold))
                                    .foregroundColor(.indigo)
                                    .padding(.horizontal, 8)
                                    .padding(.vertical, 4)
                                    .background(Color.indigo.opacity(0.1))
                                    .cornerRadius(6)
                                }
                                .buttonStyle(.plain)
                                
                                Picker("檢視模式", selection: $subMode) {
                                    ForEach(FriendScheduleSubMode.allCases) { m in
                                        Text(m.rawValue).tag(m)
                                    }
                                }
                                .pickerStyle(.segmented)
                                .frame(width: 170)
                            }
                            
                            if subMode == .weeklyGrid {
                                friendCompactWeeklyGrid
                            } else {
                                friendDailyListView
                            }
                        }
                    }
                }
                .padding(14)
            }
        }
        .background(CalicoTheme.warmCardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 18, style: .continuous)
                .stroke(Color.indigo.opacity(0.22), lineWidth: 1.2)
        )
        .shadow(color: Color.indigo.opacity(0.06), radius: 8, x: 0, y: 3)
        .sheet(item: $selectedFriendCourse) { course in
            CourseDetailSheet(course: course)
        }
    }
    
    private func displayFriendName(for schedule: SharedSchedule) -> String {
        if let rec = dataManager.savedFriends.first(where: { $0.shareCode == schedule.shareCode }) {
            return rec.displayName
        }
        return schedule.ownerName
    }
    
    private func addAndLoadFriend() {
        let code = newFriendCode.trimmingCharacters(in: .whitespacesAndNewlines).uppercased()
        guard !code.isEmpty else { return }
        isLoading = true
        inlineError = nil
        let nick = newFriendNickname.trimmingCharacters(in: .whitespacesAndNewlines)
        Task {
            let res = await dataManager.loadFriendSchedule(shareCode: code, customNickname: nick)
            isLoading = false
            switch res {
            case .success:
                newFriendCode = ""
                newFriendNickname = ""
                showingAddFriendRow = false
            case .failure(let err):
                inlineError = err.localizedDescription
            }
        }
    }
    
    private func refreshCurrentFriend(_ code: String) {
        isLoading = true
        inlineError = nil
        Task {
            _ = await dataManager.loadFriendSchedule(shareCode: code)
            isLoading = false
        }
    }
    
    // MARK: - 折疊內嵌：好友一週課表網格
    private var friendCompactWeeklyGrid: some View {
        let days: [WeekDay] = [.monday, .tuesday, .wednesday, .thursday, .friday]
        return VStack(spacing: 2) {
            // 星期標頭
            HStack(spacing: 2) {
                Text("節次")
                    .font(.system(size: 9, weight: .bold))
                    .foregroundColor(.secondary)
                    .frame(width: 32, height: 28)
                    .background(Color(.secondarySystemBackground))
                    .cornerRadius(4)
                
                ForEach(days) { day in
                    let isToday = WeekDay.from(date: Date()) == day
                    Text(day.shortName)
                        .font(.system(size: 10, weight: isToday ? .bold : .semibold, design: .rounded))
                        .foregroundColor(isToday ? .white : .primary)
                        .frame(maxWidth: .infinity)
                        .frame(height: 28)
                        .background(isToday ? CalicoTheme.warmOrange : Color(.secondarySystemBackground))
                        .cornerRadius(6)
                }
            }
            
            // 各節次列（依 1~4 -> 中午 -> 5~14 排序）
            let sortedPeriods = PeriodScheduleManager.sortPeriodsLogically(periodManager.periods)
            ForEach(sortedPeriods) { period in
                let isNoon = (period.id == 100 || period.name.contains("中午"))
                HStack(spacing: 2) {
                    VStack(spacing: 0) {
                        Text(period.displayCode)
                            .font(.system(size: 9, weight: .bold, design: .rounded))
                            .foregroundColor(isNoon ? CalicoTheme.warmOrange : .primary)
                        Text(period.startTime)
                            .font(.system(size: 7))
                            .foregroundColor(.secondary)
                    }
                    .frame(width: 32, height: isNoon ? 36 : 42)
                    .background(isNoon ? CalicoTheme.warmOrange.opacity(0.12) : Color(.secondarySystemBackground))
                    .cornerRadius(5)
                    
                    ForEach(days) { day in
                        let coursesForDay = dataManager.friendCourses(for: day.rawValue)
                        let matchedCourse = coursesForDay.first { course in
                            let matchedIds = periodManager.matchedPeriods(startTime: course.startTime, endTime: course.endTime).map { $0.id }
                            if matchedIds.contains(period.id) {
                                return true
                            }
                            if isNoon && course.startTime < "13:10" && course.endTime > "12:00" {
                                return true
                            }
                            if matchedIds.isEmpty {
                                return course.startTime < period.endTime && course.endTime > period.startTime
                            }
                            return false
                        }
                        
                        if let course = matchedCourse {
                            Button {
                                selectedFriendCourse = course
                            } label: {
                                VStack(alignment: .leading, spacing: 1) {
                                    Text(course.name)
                                        .font(.system(size: 9, weight: .bold, design: .rounded))
                                        .foregroundColor(.white)
                                        .lineLimit(2)
                                    if !course.classroom.isEmpty {
                                        Text(course.classroom)
                                            .font(.system(size: 7))
                                            .foregroundColor(.white.opacity(0.9))
                                            .lineLimit(1)
                                    }
                                }
                                .padding(2)
                                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
                                .background(Color(hex: course.colorHex).opacity(0.9))
                                .cornerRadius(5)
                            }
                            .buttonStyle(.plain)
                            .frame(height: isNoon ? 36 : 42)
                        } else {
                            RoundedRectangle(cornerRadius: 5)
                                .fill(isNoon ? CalicoTheme.warmOrange.opacity(0.05) : Color(.secondarySystemBackground).opacity(0.45))
                                .frame(maxWidth: .infinity)
                                .frame(height: isNoon ? 36 : 42)
                        }
                    }
                }
            }
        }
    }
    
    // MARK: - 折疊內嵌：好友各星期課程清單
    private var friendDailyListView: some View {
        VStack(alignment: .leading, spacing: 8) {
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 6) {
                    ForEach(WeekDay.allCases) { day in
                        let isSelected = selectedWeekday == day
                        let count = dataManager.friendCourses(for: day.rawValue).count
                        Button {
                            selectedWeekday = day
                        } label: {
                            HStack(spacing: 4) {
                                Text(day.shortName)
                                    .font(.caption.weight(.bold))
                                if count > 0 {
                                    Text("\(count)")
                                        .font(.system(size: 9, weight: .bold))
                                        .padding(.horizontal, 4)
                                        .padding(.vertical, 1)
                                        .background(isSelected ? Color.white.opacity(0.25) : Color.indigo.opacity(0.15))
                                        .clipShape(Capsule())
                                }
                            }
                            .padding(.horizontal, 10)
                            .padding(.vertical, 6)
                            .background(isSelected ? Color.indigo : Color(.secondarySystemBackground))
                            .foregroundColor(isSelected ? .white : .primary)
                            .cornerRadius(8)
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
            
            let dayCourses = dataManager.friendCourses(for: selectedWeekday.rawValue)
            if dayCourses.isEmpty {
                HStack {
                    Spacer()
                    Text("好友在\(selectedWeekday.shortName)沒有排定公開課程（整天空堂 🎉）")
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .padding(.vertical, 14)
                    Spacer()
                }
                .background(Color(.secondarySystemBackground).opacity(0.5))
                .cornerRadius(10)
            } else {
                ForEach(dayCourses) { course in
                    HStack(spacing: 10) {
                        RoundedRectangle(cornerRadius: 2)
                            .fill(Color(hex: course.colorHex))
                            .frame(width: 4, height: 36)
                        VStack(alignment: .leading, spacing: 2) {
                            Text(course.name)
                                .font(.caption.weight(.bold))
                            HStack(spacing: 8) {
                                Text("\(course.startTime) - \(course.endTime)")
                                if !course.classroom.isEmpty {
                                    Text("📍\(course.classroom)")
                                }
                                if !course.instructor.isEmpty {
                                    Text("👤\(course.instructor)")
                                }
                            }
                            .font(.caption2)
                            .foregroundColor(.secondary)
                        }
                        Spacer()
                    }
                    .padding(8)
                    .background(Color(.secondarySystemBackground).opacity(0.6))
                    .cornerRadius(8)
                }
            }
        }
    }
}

// MARK: - 底部導覽列「好友」整合專區 (統整好友記錄簿、好友課表折疊、好友記帳折疊與獨立 LINE 推播中心)
struct FriendsHubView: View {
    @EnvironmentObject var dataManager: DataManager
    @ObservedObject var lineService = LineBotService.shared
    
    @State private var quickCodeInput: String = ""
    @State private var quickNoteInput: String = ""
    @State private var isSyncingBoth: Bool = false
    @State private var isPublishingMine: Bool = false
    @State private var copiedMyCode: Bool = false
    @State private var showingShareCalendarSheet: Bool = false
    @State private var showingShareAccountingSheet: Bool = false
    @State private var showingLinePushCenter: Bool = false
    @State private var editingFriend: SavedFriendRecord? = nil
    @State private var editNoteText: String = ""
    @State private var statusBannerText: String? = nil
    
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 16) {
                    // 1. 頂部：我的分享碼 ＆ 自動上傳狀態 ＆ 獨立 LINE 多人推播中心入口
                    myShareAndLinePushHeaderCard
                    
                    // 2. 共用好友分享記錄簿 (點選一位好友即可同時切換並載入課表 + 記帳)
                    unifiedFriendDirectoryCard
                    
                    // 3. 好友課表折疊檢視區
                    FriendScheduleCollapsibleCard()
                    
                    // 4. 好友記帳折疊檢視區
                    FriendAccountingCollapsibleCard()
                }
                .padding(.horizontal, 16)
                .padding(.top, 12)
                .padding(.bottom, 28)
            }
            .background(Color(.systemGroupedBackground))
            .navigationTitle("好友課表＆記帳")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button {
                        showingShareCalendarSheet = true
                    } label: {
                        HStack(spacing: 4) {
                            Image(systemName: "qrcode")
                            Text("我的代碼")
                                .font(.caption.weight(.bold))
                        }
                        .foregroundColor(.indigo)
                    }
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        showingLinePushCenter = true
                    } label: {
                        HStack(spacing: 4) {
                            Image(systemName: "paperplane.circle.fill")
                            Text("獨立推播中心")
                                .font(.caption.weight(.bold))
                        }
                        .padding(.horizontal, 9)
                        .padding(.vertical, 5)
                        .background(Color.green.opacity(0.14))
                        .foregroundColor(.green)
                        .clipShape(Capsule())
                    }
                }
            }
        }
        .sheet(isPresented: $showingShareCalendarSheet) {
            ShareCalendarSheet()
                .environmentObject(dataManager)
        }
        .sheet(isPresented: $showingShareAccountingSheet) {
            PeerExpenseReviewView(isModal: true)
                .environmentObject(dataManager)
        }
        .sheet(isPresented: $showingLinePushCenter) {
            LinePushCenterSheet()
                .environmentObject(dataManager)
        }
        .alert("修改好友備註名稱", isPresented: Binding(
            get: { editingFriend != nil },
            set: { if !$0 { editingFriend = nil } }
        )) {
            TextField("輸入備註名稱（例如：室友小明）", text: $editNoteText)
            Button("儲存") {
                if let f = editingFriend {
                    dataManager.updateSavedFriendNickname(shareCode: f.shareCode, nickname: editNoteText)
                }
                editingFriend = nil
            }
            Button("取消", role: .cancel) {
                editingFriend = nil
            }
        } message: {
            Text("設定備註後，好友課表、好友記帳與 LINE 推播中心皆會同步顯示此名稱。")
        }
    }
    
    // MARK: - 1. 我的分享碼與獨立 LINE 多人推播中心卡片
    private var myShareAndLinePushHeaderCard: some View {
        VStack(spacing: 12) {
            HStack(spacing: 12) {
                // 左側：我的 6 碼分享代碼
                VStack(alignment: .leading, spacing: 4) {
                    HStack(spacing: 6) {
                        Image(systemName: "qrcode.viewfinder")
                            .foregroundColor(.indigo)
                        Text("我的課表＆記帳分享碼")
                            .font(.caption.weight(.bold))
                            .foregroundColor(.secondary)
                    }
                    
                    HStack(spacing: 8) {
                        Text(dataManager.myShareCode)
                            .font(.system(size: 22, weight: .black, design: .monospaced))
                            .foregroundColor(.indigo)
                        
                        Button {
                            UIPasteboard.general.string = dataManager.myShareCode
                            withAnimation { copiedMyCode = true }
                            DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
                                withAnimation { copiedMyCode = false }
                            }
                        } label: {
                            HStack(spacing: 3) {
                                Image(systemName: copiedMyCode ? "checkmark.circle.fill" : "doc.on.doc")
                                Text(copiedMyCode ? "已複製" : "複製")
                            }
                            .font(.caption2.weight(.bold))
                            .padding(.horizontal, 8)
                            .padding(.vertical, 4)
                            .background(copiedMyCode ? Color.green.opacity(0.15) : Color.indigo.opacity(0.12))
                            .foregroundColor(copiedMyCode ? .green : .indigo)
                            .clipShape(Capsule())
                        }
                        .buttonStyle(.plain)
                    }
                }
                
                Spacer()
                
                // 右側：一鍵立即上傳我的課表＆記帳
                Button {
                    isPublishingMine = true
                    Task {
                        await dataManager.publishMySchedule()
                        _ = await dataManager.uploadAllAccountingContentNow(reason: "手動立即上傳")
                        await MainActor.run {
                            isPublishingMine = false
                            withAnimation {
                                statusBannerText = "✅ 已同步上傳我的最新課表與記帳（代碼 \(dataManager.myShareCode)）"
                            }
                        }
                    }
                } label: {
                    HStack(spacing: 5) {
                        if isPublishingMine {
                            ProgressView()
                                .scaleEffect(0.75)
                        } else {
                            Image(systemName: "icloud.and.arrow.up.fill")
                        }
                        Text("同步上傳我的資料")
                            .font(.caption.weight(.bold))
                    }
                    .padding(.horizontal, 12)
                    .padding(.vertical, 8)
                    .background(Color.indigo)
                    .foregroundColor(.white)
                    .cornerRadius(10)
                }
                .buttonStyle(.plain)
                .disabled(isPublishingMine)
            }
            
            Divider()
            
            // 下方雙快捷按鈕：自動上傳記帳設定 + 獨立 LINE 多人推播中心
            HStack(spacing: 10) {
                Button {
                    showingShareAccountingSheet = true
                } label: {
                    HStack(spacing: 6) {
                        Image(systemName: dataManager.isAutoUploadAccountingEnabled ? "clock.badge.checkmark.fill" : "clock")
                            .foregroundColor(.orange)
                        VStack(alignment: .leading, spacing: 1) {
                            Text("記帳自動上傳設定")
                                .font(.caption.weight(.bold))
                                .foregroundColor(.primary)
                            Text(dataManager.isAutoUploadAccountingEnabled ? "每日 13:30 / 22:30 自動上傳" : "點擊開啟每日定時上傳")
                                .font(.system(size: 10))
                                .foregroundColor(.secondary)
                        }
                        Spacer()
                        Image(systemName: "chevron.right")
                            .font(.caption2)
                            .foregroundColor(.secondary)
                    }
                    .padding(10)
                    .frame(maxWidth: .infinity)
                    .background(Color.orange.opacity(0.08))
                    .cornerRadius(10)
                }
                .buttonStyle(.plain)
                
                Button {
                    showingLinePushCenter = true
                } label: {
                    HStack(spacing: 6) {
                        Image(systemName: "paperplane.circle.fill")
                            .font(.title3)
                            .foregroundColor(.green)
                        VStack(alignment: .leading, spacing: 1) {
                            Text("LINE 多人獨立推播")
                                .font(.caption.weight(.bold))
                                .foregroundColor(.primary)
                            Text("\(lineService.registeredUsers.filter(\.isEnabled).count) 位啟用 · 獨立推送中心")
                                .font(.system(size: 10))
                                .foregroundColor(.secondary)
                        }
                        Spacer()
                        Image(systemName: "chevron.right")
                            .font(.caption2)
                            .foregroundColor(.secondary)
                    }
                    .padding(10)
                    .frame(maxWidth: .infinity)
                    .background(Color.green.opacity(0.1))
                    .cornerRadius(10)
                }
                .buttonStyle(.plain)
            }
            
            if let status = statusBannerText {
                HStack(spacing: 6) {
                    Text(status)
                        .font(.caption2.weight(.semibold))
                        .foregroundColor(.indigo)
                    Spacer()
                    Button {
                        withAnimation { statusBannerText = nil }
                    } label: {
                        Image(systemName: "xmark.circle.fill")
                            .font(.caption2)
                            .foregroundColor(.secondary)
                    }
                    .buttonStyle(.plain)
                }
                .padding(.top, 2)
            }
        }
        .padding(14)
        .background(Color(.systemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
        .shadow(color: .black.opacity(0.04), radius: 8, x: 0, y: 3)
    }
    
    // MARK: - 2. 共用好友分享記錄簿卡片 (一鍵同時載入好友課表 + 好友記帳)
    private var unifiedFriendDirectoryCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                HStack(spacing: 6) {
                    Image(systemName: "person.2.crop.square.stack.fill")
                        .foregroundColor(.teal)
                    Text("好友分享記錄簿")
                        .font(.subheadline.weight(.bold))
                }
                Spacer()
                Text("點選好友即可同時載入課表＆記帳")
                    .font(.caption2)
                    .foregroundColor(.secondary)
            }
            
            if !dataManager.savedFriends.isEmpty {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        ForEach(dataManager.savedFriends) { friend in
                            let isCurrentSchedule = dataManager.friendSchedule?.shareCode.uppercased() == friend.shareCode
                            let isCurrentExpense = dataManager.friendAccounting?.shareCode.uppercased() == friend.shareCode
                            let isSelected = isCurrentSchedule || isCurrentExpense
                            
                            HStack(spacing: 6) {
                                Button {
                                    loadBothScheduleAndExpense(for: friend.shareCode, note: friend.nickname)
                                } label: {
                                    HStack(spacing: 5) {
                                        Image(systemName: isSelected ? "checkmark.circle.fill" : "person.crop.circle")
                                            .font(.caption)
                                        VStack(alignment: .leading, spacing: 1) {
                                            Text(friend.displayName)
                                                .font(.caption.weight(.bold))
                                            Text(friend.shareCode)
                                                .font(.system(size: 9, design: .monospaced))
                                                .opacity(0.8)
                                        }
                                    }
                                    .padding(.leading, 10)
                                    .padding(.vertical, 6)
                                }
                                .buttonStyle(.plain)
                                
                                Menu {
                                    Button {
                                        loadBothScheduleAndExpense(for: friend.shareCode, note: friend.nickname)
                                    } label: {
                                        Label("同時載入課表與記帳", systemImage: "arrow.triangle.2.circlepath")
                                    }
                                    Button {
                                        editNoteText = friend.nickname.isEmpty ? friend.ownerName : friend.nickname
                                        editingFriend = friend
                                    } label: {
                                        Label("修改備註名稱", systemImage: "pencil")
                                    }
                                    Button {
                                        Task {
                                            try? await lineService.importSavedFriendToPushList(friend)
                                            await MainActor.run {
                                                statusBannerText = "🎯 已將「\(friend.displayName)」加入 LINE 多人獨立推播清單！"
                                            }
                                        }
                                    } label: {
                                        Label("加入 LINE 獨立推播名單", systemImage: "paperplane.fill")
                                    }
                                    Divider()
                                    Button(role: .destructive) {
                                        dataManager.removeSavedFriend(shareCode: friend.shareCode)
                                    } label: {
                                        Label("從記錄簿移除", systemImage: "trash")
                                    }
                                } label: {
                                    Image(systemName: "ellipsis.circle")
                                        .font(.caption)
                                        .padding(.trailing, 8)
                                        .padding(.vertical, 6)
                                }
                            }
                            .background(isSelected ? Color.teal : Color(.secondarySystemBackground))
                            .foregroundColor(isSelected ? .white : .primary)
                            .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                        }
                    }
                }
            } else {
                Text("尚無儲存的好友紀錄。在下方輸入好友的 6 碼分享代碼後，系統會自動存入記錄簿，下次點一下即可同時查看課表與記帳！")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            
            // 快速新增／載入好友輸入列
            HStack(spacing: 8) {
                TextField("6 碼代碼", text: $quickCodeInput)
                    .autocorrectionDisabled()
                    .textInputAutocapitalization(.characters)
                    .font(.system(.caption, design: .monospaced).weight(.bold))
                    .padding(.horizontal, 10)
                    .padding(.vertical, 8)
                    .frame(width: 96)
                    .background(Color(.secondarySystemBackground))
                    .cornerRadius(8)
                
                TextField("好友備註（選填，如：小明）", text: $quickNoteInput)
                    .font(.caption)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 8)
                    .background(Color(.secondarySystemBackground))
                    .cornerRadius(8)
                
                Button {
                    let code = quickCodeInput.trimmingCharacters(in: .whitespacesAndNewlines).uppercased()
                    let note = quickNoteInput.trimmingCharacters(in: .whitespacesAndNewlines)
                    guard !code.isEmpty else { return }
                    loadBothScheduleAndExpense(for: code, note: note)
                    quickCodeInput = ""
                    quickNoteInput = ""
                } label: {
                    HStack(spacing: 4) {
                        if isSyncingBoth {
                            ProgressView()
                                .scaleEffect(0.7)
                                .tint(.white)
                        } else {
                            Image(systemName: "plus.magnifyingglass")
                        }
                        Text("載入並儲存")
                    }
                    .font(.caption.weight(.bold))
                    .padding(.horizontal, 12)
                    .padding(.vertical, 8)
                    .background(quickCodeInput.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? Color.gray.opacity(0.35) : Color.teal)
                    .foregroundColor(.white)
                    .cornerRadius(8)
                }
                .buttonStyle(.plain)
                .disabled(quickCodeInput.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || isSyncingBoth)
            }
        }
        .padding(14)
        .background(Color(.systemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
        .shadow(color: .black.opacity(0.04), radius: 8, x: 0, y: 3)
    }
    
    private func loadBothScheduleAndExpense(for code: String, note: String = "") {
        let cleanCode = code.trimmingCharacters(in: .whitespacesAndNewlines).uppercased()
        guard !cleanCode.isEmpty else { return }
        isSyncingBoth = true
        Task {
            let customNote: String? = note.isEmpty ? nil : note
            async let schedOk = dataManager.loadFriendSchedule(shareCode: cleanCode, customNickname: customNote)
            async let expOk = dataManager.loadFriendAccounting(shareCode: cleanCode, customNickname: customNote)
            _ = await (schedOk, expOk)
            await MainActor.run {
                isSyncingBoth = false
                let friendTitle = dataManager.savedFriends.first(where: { $0.shareCode == cleanCode })?.displayName
                    ?? dataManager.friendSchedule?.ownerName
                    ?? cleanCode
                withAnimation {
                    statusBannerText = "✨ 已同時載入「\(friendTitle)」的課表與記帳！"
                }
            }
        }
    }
}


