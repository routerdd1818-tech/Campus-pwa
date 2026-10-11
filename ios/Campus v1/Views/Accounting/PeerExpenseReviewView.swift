//
//  PeerExpenseReviewView.swift
//  Campus v1
//
//  Created for Campus v1 (可樂助手).
//

import SwiftUI

// MARK: - 記帳頁面內嵌：好友記帳折疊卡片（內建好友記錄簿 + 自動上傳設定，不覆蓋自己的記帳頁面）
struct FriendAccountingCollapsibleCard: View {
    @EnvironmentObject var dataManager: DataManager
    
    @State private var friendCodeInput: String = ""
    @State private var friendNicknameInput: String = ""
    @State private var isLoadingFriend: Bool = false
    @State private var showAddFriendInput: Bool = false
    @State private var showAutoUploadTimeConfig: Bool = false
    @State private var showingFullReviewSheet: Bool = false
    @State private var statusBannerText: String? = nil
    @State private var isErrorBanner: Bool = false
    
    // 修改備註彈窗
    @State private var editingRecord: SavedFriendRecord? = nil
    @State private var editingNickname: String = ""
    
    // 評分彈窗狀態
    @State private var ratingTargetItem: TransactionItem? = nil
    @State private var inputRating: Double = 8
    @State private var inputFeedback: String = ""
    @State private var isSubmittingRating: Bool = false
    
    private var activeFriendDisplayName: String? {
        guard let friend = dataManager.friendAccounting else { return nil }
        if let saved = dataManager.savedFriends.first(where: { $0.shareCode == friend.shareCode }) {
            return saved.displayName
        }
        return friend.ownerName
    }
    
    private var formattedSlot1: String {
        String(format: "%02d:%02d", dataManager.autoUploadSlot1Hour, dataManager.autoUploadSlot1Minute)
    }
    
    private var formattedSlot2: String {
        String(format: "%02d:%02d", dataManager.autoUploadSlot2Hour, dataManager.autoUploadSlot2Minute)
    }
    
    var body: some View {
        VStack(spacing: 0) {
            // 折疊標題列
            HStack(spacing: 10) {
                Button {
                    withAnimation(.spring(response: 0.32, dampingFraction: 0.8)) {
                        dataManager.isFriendAccountingExpanded.toggle()
                    }
                } label: {
                    HStack(spacing: 10) {
                        ZStack {
                            Circle()
                                .fill(Color.indigo.opacity(0.14))
                                .frame(width: 34, height: 34)
                            Image(systemName: "person.2.wave.2.fill")
                                .font(.system(size: 14, weight: .bold))
                                .foregroundColor(.indigo)
                        }
                        
                        VStack(alignment: .leading, spacing: 2) {
                            HStack(spacing: 6) {
                                Text("好友記帳折疊檢視")
                                    .font(.system(.subheadline, design: .rounded).weight(.bold))
                                    .foregroundColor(.primary)
                                
                                if let displayName = activeFriendDisplayName {
                                    Text(displayName)
                                        .font(.caption2.weight(.bold))
                                        .padding(.horizontal, 7)
                                        .padding(.vertical, 2)
                                        .background(Color.indigo)
                                        .foregroundColor(.white)
                                        .clipShape(Capsule())
                                }
                            }
                            
                            Text("記錄簿 \(dataManager.savedFriends.count) 位 • 自動上傳 \(formattedSlot1)/\(formattedSlot2) \(dataManager.isAutoUploadAccountingEnabled ? "開啟" : "關閉")")
                                .font(.system(size: 11, design: .rounded))
                                .foregroundColor(.secondary)
                                .lineLimit(1)
                        }
                        
                        Spacer()
                    }
                    .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                
                Button {
                    showingFullReviewSheet = true
                } label: {
                    HStack(spacing: 3) {
                        Image(systemName: "qrcode.viewfinder")
                        Text("分享碼")
                    }
                    .font(.caption2.weight(.bold))
                    .padding(.horizontal, 8)
                    .padding(.vertical, 5)
                    .background(Color.indigo.opacity(0.10))
                    .foregroundColor(.indigo)
                    .clipShape(Capsule())
                }
                .buttonStyle(.plain)
                
                Button {
                    withAnimation(.spring(response: 0.32, dampingFraction: 0.8)) {
                        dataManager.isFriendAccountingExpanded.toggle()
                    }
                } label: {
                    Image(systemName: dataManager.isFriendAccountingExpanded ? "chevron.up.circle.fill" : "chevron.down.circle.fill")
                        .font(.system(size: 20))
                        .foregroundColor(.indigo)
                }
                .buttonStyle(.plain)
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 11)
            
            // 展開內容（在折疊內顯示，不覆蓋自己的記帳頁面）
            if dataManager.isFriendAccountingExpanded {
                Divider()
                    .padding(.horizontal, 12)
                
                VStack(alignment: .leading, spacing: 12) {
                    // 狀態通知橫幅
                    if let banner = statusBannerText {
                        HStack(spacing: 6) {
                            Image(systemName: isErrorBanner ? "exclamationmark.triangle.fill" : "checkmark.circle.fill")
                                .foregroundColor(isErrorBanner ? .red : .green)
                                .font(.caption)
                            Text(banner)
                                .font(.caption2.weight(.bold))
                                .foregroundColor(isErrorBanner ? .red : .primary)
                            Spacer()
                            Button {
                                statusBannerText = nil
                            } label: {
                                Image(systemName: "xmark.circle.fill")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }
                        }
                        .padding(.horizontal, 10)
                        .padding(.vertical, 6)
                        .background((isErrorBanner ? Color.red : Color.green).opacity(0.12))
                        .cornerRadius(8)
                    }
                    
                    // 1. 每日定時自動上傳記帳內容列（預設 13:30 與 22:30）
                    autoUploadCompactSection
                    
                    // 2. 好友分享記錄簿選擇列（免每次輸入代碼）
                    friendDirectoryBar
                    
                    // 3. 新增好友輸入框（按需展開）
                    if showAddFriendInput || dataManager.savedFriends.isEmpty {
                        inlineAddFriendBox
                    }
                    
                    // 4. 好友記帳明細與評分（折疊內獨立捲動，不覆蓋下方自己的記帳）
                    if let friend = dataManager.friendAccounting {
                        friendAccountingInlineContent(friend: friend)
                    } else if !dataManager.savedFriends.isEmpty {
                        HStack {
                            Spacer()
                            VStack(spacing: 4) {
                                Image(systemName: "hand.tap.fill")
                                    .font(.title3)
                                    .foregroundColor(.indigo.opacity(0.7))
                                Text("請點選上方「好友記錄簿」中的好友，即可在此折疊內直接查看記帳與打分")
                                    .font(.caption2)
                                    .foregroundColor(.secondary)
                                    .multilineTextAlignment(.center)
                            }
                            .padding(.vertical, 10)
                            Spacer()
                        }
                        .background(Color(.secondarySystemBackground).opacity(0.5))
                        .cornerRadius(10)
                    }
                }
                .padding(12)
            }
        }
        .background(CalicoTheme.warmCardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .stroke(Color.indigo.opacity(dataManager.isFriendAccountingExpanded ? 0.32 : 0.16), lineWidth: 1.2)
        )
        .shadow(color: CalicoTheme.cocoaBrown.opacity(0.05), radius: 6, x: 0, y: 2)
        .sheet(isPresented: $showingFullReviewSheet) {
            PeerExpenseReviewView(isModal: true)
        }
        .sheet(item: $ratingTargetItem) { item in
            PeerRatingModalSheet(
                item: item,
                targetShareCode: dataManager.friendAccounting?.shareCode ?? dataManager.myShareCode,
                initialRating: inputRating,
                initialFeedback: inputFeedback
            ) { msg in
                showBanner(msg, isError: false)
            }
        }
        .alert("修改好友備註名稱", isPresented: Binding(
            get: { editingRecord != nil },
            set: { if !$0 { editingRecord = nil } }
        )) {
            TextField("輸入好記的暱稱（例：室友阿明）", text: $editingNickname)
            Button("取消", role: .cancel) {
                editingRecord = nil
            }
            Button("儲存") {
                if let rec = editingRecord {
                    dataManager.updateSavedFriendNickname(shareCode: rec.shareCode, nickname: editingNickname)
                }
                editingRecord = nil
            }
        } message: {
            if let rec = editingRecord {
                Text("代碼：\(rec.shareCode)（原名：\(rec.ownerName)）")
            }
        }
    }
    
    // MARK: - 1. 自動上傳記帳內容迷你設定列（預設 13:30 與 22:30）
    private var autoUploadCompactSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 8) {
                Image(systemName: "clock.arrow.2.circlepath")
                    .font(.system(size: 13, weight: .bold))
                    .foregroundColor(.indigo)
                
                VStack(alignment: .leading, spacing: 1) {
                    HStack(spacing: 5) {
                        Text("定時自動上傳記帳")
                            .font(.caption.weight(.bold))
                            .foregroundColor(.primary)
                        Text("每日 \(formattedSlot1) & \(formattedSlot2)")
                            .font(.system(size: 10, weight: .bold, design: .monospaced))
                            .padding(.horizontal, 6)
                            .padding(.vertical, 1.5)
                            .background(Color.indigo.opacity(0.12))
                            .foregroundColor(.indigo)
                            .clipShape(Capsule())
                    }
                    Text("上次上傳：\(dataManager.lastAutoUploadAccountingString)")
                        .font(.system(size: 10))
                        .foregroundColor(.secondary)
                }
                
                Spacer()
                
                Button {
                    withAnimation(.easeInOut(duration: 0.2)) {
                        showAutoUploadTimeConfig.toggle()
                    }
                } label: {
                    Image(systemName: "slider.horizontal.3")
                        .font(.caption)
                        .foregroundColor(.indigo)
                        .padding(6)
                        .background(Color.indigo.opacity(0.1))
                        .clipShape(Circle())
                }
                .buttonStyle(.plain)
                
                Button {
                    Task {
                        await dataManager.uploadAllAccountingContentNow(reason: "手動立即上傳")
                        showBanner("已立即同步上傳最新記帳內容！", isError: false)
                    }
                } label: {
                    HStack(spacing: 3) {
                        if dataManager.isUploadingAccounting {
                            ProgressView()
                                .scaleEffect(0.65)
                                .tint(.white)
                        } else {
                            Image(systemName: "icloud.and.arrow.up.fill")
                                .font(.system(size: 10))
                        }
                        Text("立即上傳")
                            .font(.system(size: 10, weight: .bold))
                    }
                    .padding(.horizontal, 8)
                    .padding(.vertical, 5)
                    .background(Color.indigo)
                    .foregroundColor(.white)
                    .clipShape(Capsule())
                }
                .buttonStyle(.plain)
                .disabled(dataManager.isUploadingAccounting)
                
                Toggle("", isOn: $dataManager.isAutoUploadAccountingEnabled)
                    .labelsHidden()
                    .tint(.indigo)
                    .scaleEffect(0.8)
            }
            
            if showAutoUploadTimeConfig {
                Divider()
                HStack(spacing: 12) {
                    HStack(spacing: 4) {
                        Text("下午時段:")
                            .font(.caption2)
                            .foregroundColor(.secondary)
                        DatePicker(
                            "",
                            selection: Binding(
                                get: {
                                    Calendar.current.date(from: DateComponents(hour: dataManager.autoUploadSlot1Hour, minute: dataManager.autoUploadSlot1Minute)) ?? Date()
                                },
                                set: { newDate in
                                    let comps = Calendar.current.dateComponents([.hour, .minute], from: newDate)
                                    dataManager.autoUploadSlot1Hour = comps.hour ?? 13
                                    dataManager.autoUploadSlot1Minute = comps.minute ?? 30
                                }
                            ),
                            displayedComponents: .hourAndMinute
                        )
                        .labelsHidden()
                        .scaleEffect(0.85)
                    }
                    
                    HStack(spacing: 4) {
                        Text("晚上時段:")
                            .font(.caption2)
                            .foregroundColor(.secondary)
                        DatePicker(
                            "",
                            selection: Binding(
                                get: {
                                    Calendar.current.date(from: DateComponents(hour: dataManager.autoUploadSlot2Hour, minute: dataManager.autoUploadSlot2Minute)) ?? Date()
                                },
                                set: { newDate in
                                    let comps = Calendar.current.dateComponents([.hour, .minute], from: newDate)
                                    dataManager.autoUploadSlot2Hour = comps.hour ?? 22
                                    dataManager.autoUploadSlot2Minute = comps.minute ?? 30
                                }
                            ),
                            displayedComponents: .hourAndMinute
                        )
                        .labelsHidden()
                        .scaleEffect(0.85)
                    }
                    
                    Spacer()
                    
                    Button("還原預設(13:30/22:30)") {
                        dataManager.autoUploadSlot1Hour = 13
                        dataManager.autoUploadSlot1Minute = 30
                        dataManager.autoUploadSlot2Hour = 22
                        dataManager.autoUploadSlot2Minute = 30
                        showBanner("已還原預設 13:30 與 22:30 自動上傳", isError: false)
                    }
                    .font(.system(size: 10, weight: .bold))
                    .foregroundColor(.indigo)
                }
            }
        }
        .padding(10)
        .background(Color(.secondarySystemBackground).opacity(0.65))
        .cornerRadius(10)
    }
    
    // MARK: - 2. 好友分享記錄簿選擇列
    private var friendDirectoryBar: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Label("好友分享記錄簿（點選免輸入代碼）", systemImage: "book.closed.fill")
                    .font(.caption.weight(.bold))
                    .foregroundColor(.secondary)
                
                Spacer()
                
                if let currentCode = dataManager.friendAccounting?.shareCode,
                   let currentRec = dataManager.savedFriends.first(where: { $0.shareCode == currentCode }) {
                    Button {
                        editingRecord = currentRec
                        editingNickname = currentRec.nickname
                    } label: {
                        HStack(spacing: 2) {
                            Image(systemName: "pencil")
                            Text("改備註")
                        }
                        .font(.system(size: 10, weight: .semibold))
                        .foregroundColor(.indigo)
                    }
                }
                
                Button {
                    withAnimation(.easeInOut(duration: 0.2)) {
                        showAddFriendInput.toggle()
                    }
                } label: {
                    HStack(spacing: 3) {
                        Image(systemName: showAddFriendInput ? "minus.circle.fill" : "plus.circle.fill")
                        Text(showAddFriendInput ? "收起輸入" : "新增好友代碼")
                    }
                    .font(.caption2.weight(.bold))
                    .foregroundColor(.indigo)
                }
            }
            
            if !dataManager.savedFriends.isEmpty {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        ForEach(dataManager.savedFriends) { record in
                            let isSelected = dataManager.friendAccounting?.shareCode == record.shareCode
                            Button {
                                dataManager.selectSavedFriendForAccounting(record)
                                showBanner("已切換至【\(record.displayName)】的記帳", isError: false)
                            } label: {
                                HStack(spacing: 6) {
                                    Image(systemName: isSelected ? "person.crop.circle.fill.badge.checkmark" : "person.crop.circle.fill")
                                        .font(.system(size: 13))
                                    VStack(alignment: .leading, spacing: 1) {
                                        Text(record.displayName)
                                            .font(.caption.weight(.bold))
                                        Text("\(record.shareCode) • \(record.accountingCount)筆")
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
                                    editingRecord = record
                                    editingNickname = record.nickname
                                } label: {
                                    Label("修改備註名稱", systemImage: "pencil")
                                }
                                
                                Button {
                                    Task {
                                        _ = await dataManager.loadFriendAccounting(shareCode: record.shareCode)
                                    }
                                } label: {
                                    Label("重新同步最新記帳", systemImage: "arrow.clockwise")
                                }
                                
                                Button(role: .destructive) {
                                    dataManager.removeSavedFriend(shareCode: record.shareCode)
                                } label: {
                                    Label("從記錄簿刪除", systemImage: "trash")
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    
    // MARK: - 3. 內嵌新增好友輸入框
    private var inlineAddFriendBox: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 8) {
                TextField("輸入 6 碼好友代碼 (如 A8K2M9)", text: $friendCodeInput)
                    .textInputAutocapitalization(.characters)
                    .autocorrectionDisabled()
                    .font(.system(.caption, design: .monospaced).weight(.bold))
                    .padding(8)
                    .background(Color(.systemBackground))
                    .cornerRadius(8)
                
                TextField("備註暱稱 (選填)", text: $friendNicknameInput)
                    .font(.caption)
                    .padding(8)
                    .frame(width: 105)
                    .background(Color(.systemBackground))
                    .cornerRadius(8)
                
                Button {
                    if let pasted = UIPasteboard.general.string {
                        friendCodeInput = pasted.trimmingCharacters(in: .whitespacesAndNewlines).uppercased()
                    }
                } label: {
                    Image(systemName: "doc.on.clipboard")
                        .font(.caption)
                        .foregroundColor(.indigo)
                        .padding(8)
                        .background(Color.indigo.opacity(0.12))
                        .cornerRadius(8)
                }
                .buttonStyle(.plain)
                
                Button {
                    addAndLoadFriend()
                } label: {
                    if isLoadingFriend {
                        ProgressView()
                            .scaleEffect(0.75)
                            .frame(width: 48, height: 30)
                    } else {
                        Text("載入")
                            .font(.caption.weight(.bold))
                            .padding(.horizontal, 12)
                            .padding(.vertical, 8)
                            .background(Color.indigo)
                            .foregroundColor(.white)
                            .cornerRadius(8)
                    }
                }
                .buttonStyle(.plain)
                .disabled(friendCodeInput.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || isLoadingFriend)
            }
            
            Text("輸入一次即自動存入「好友分享記錄簿」，課表與記帳頁面共用，下次點選即可直接查看！")
                .font(.system(size: 10))
                .foregroundColor(.secondary)
        }
        .padding(10)
        .background(Color(.secondarySystemBackground).opacity(0.6))
        .cornerRadius(10)
    }
    
    // MARK: - 4. 折疊內好友記帳詳情與評分列表
    private func friendAccountingInlineContent(friend: SharedSchedule) -> some View {
        let friendExpenses = friend.accountingData.filter { $0.type == .expense }
        let totalSpent = friendExpenses.reduce(0) { $0 + $1.amount }
        let scored = friendExpenses.filter { $0.valueScore > 0 }
        let selfAvg = scored.isEmpty ? 0 : (Double(scored.reduce(0) { $0 + $1.valueScore }) / Double(scored.count))
        let peerScored = friendExpenses.compactMap { $0.peerRating }
        let peerAvg = peerScored.isEmpty ? nil : (Double(peerScored.reduce(0) { $0 + $1 }) / Double(peerScored.count))
        
        return VStack(alignment: .leading, spacing: 10) {
            // 好友頂部列與操作
            HStack {
                HStack(spacing: 6) {
                    Image(systemName: "person.crop.circle.badge.checkmark")
                        .foregroundColor(.indigo)
                    Text("【\(activeFriendDisplayName ?? friend.ownerName)】的花費明細 (\(friendExpenses.count) 筆)")
                        .font(.caption.weight(.bold))
                        .foregroundColor(.primary)
                }
                
                Spacer()
                
                Button {
                    Task {
                        isLoadingFriend = true
                        _ = await dataManager.loadFriendAccounting(shareCode: friend.shareCode)
                        isLoadingFriend = false
                        showBanner("已更新 \(activeFriendDisplayName ?? friend.ownerName) 的最新記帳", isError: false)
                    }
                } label: {
                    HStack(spacing: 2) {
                        Image(systemName: "arrow.clockwise")
                        Text("重整")
                    }
                    .font(.system(size: 10, weight: .bold))
                    .foregroundColor(.indigo)
                    .padding(.horizontal, 7)
                    .padding(.vertical, 3)
                    .background(Color.indigo.opacity(0.1))
                    .clipShape(Capsule())
                }
                .buttonStyle(.plain)
                
                Button {
                    withAnimation {
                        dataManager.friendAccounting = nil
                    }
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .foregroundColor(.secondary)
                        .font(.caption)
                }
                .buttonStyle(.plain)
            }
            
            // 指標小卡
            HStack(spacing: 8) {
                HStack(spacing: 4) {
                    Text("總花費")
                        .font(.system(size: 10))
                        .foregroundColor(.secondary)
                    Text("$\(Int(totalSpent))")
                        .font(.caption.weight(.heavy))
                        .foregroundColor(.red)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 6)
                .background(Color(.systemBackground))
                .cornerRadius(8)
                
                HStack(spacing: 4) {
                    Text("自評理性")
                        .font(.system(size: 10))
                        .foregroundColor(.secondary)
                    Text(String(format: "%.1f分", selfAvg))
                        .font(.caption.weight(.bold))
                        .foregroundColor(.orange)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 6)
                .background(Color(.systemBackground))
                .cornerRadius(8)
                
                HStack(spacing: 4) {
                    Text("好友評審")
                        .font(.system(size: 10))
                        .foregroundColor(.secondary)
                    if let p = peerAvg {
                        Text(String(format: "%.1f分", p))
                            .font(.caption.weight(.bold))
                            .foregroundColor(.purple)
                    } else {
                        Text("待評分")
                            .font(.system(size: 10, weight: .semibold))
                            .foregroundColor(.secondary)
                    }
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 6)
                .background(Color(.systemBackground))
                .cornerRadius(8)
            }
            
            if friendExpenses.isEmpty {
                HStack {
                    Spacer()
                    Text("這位好友目前還沒有公開的支出紀錄喔！")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                        .padding(.vertical, 12)
                    Spacer()
                }
                .background(Color(.systemBackground))
                .cornerRadius(10)
            } else {
                // 限制折疊內清單最大高度，確保下方自己的記帳列表永遠清晰可見不被覆蓋
                ScrollView {
                    VStack(spacing: 8) {
                        ForEach(friendExpenses) { item in
                            compactFriendExpenseRow(item)
                        }
                    }
                }
                .frame(maxHeight: 240)
            }
        }
        .padding(10)
        .background(Color.indigo.opacity(0.05))
        .cornerRadius(12)
    }
    
    private func compactFriendExpenseRow(_ item: TransactionItem) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: 10) {
                Image(systemName: item.categoryIcon)
                    .font(.system(size: 13, weight: .bold))
                    .foregroundColor(.white)
                    .frame(width: 30, height: 30)
                    .background(item.color)
                    .clipShape(Circle())
                
                VStack(alignment: .leading, spacing: 1) {
                    HStack(spacing: 5) {
                        Text(item.categoryName)
                            .font(.caption.weight(.bold))
                        Text("自評\(item.valueScore)分")
                            .font(.system(size: 9, weight: .bold))
                            .padding(.horizontal, 4)
                            .padding(.vertical, 1)
                            .background(item.valueScoreColor.opacity(0.14))
                            .foregroundColor(item.valueScoreColor)
                            .cornerRadius(4)
                        if let peer = item.peerRating {
                            Text("評審\(Int(peer))分")
                                .font(.system(size: 9, weight: .bold))
                                .padding(.horizontal, 4)
                                .padding(.vertical, 1)
                                .background(Color.purple.opacity(0.14))
                                .foregroundColor(.purple)
                                .cornerRadius(4)
                        }
                    }
                    if !item.notes.isEmpty {
                        Text(item.notes)
                            .font(.system(size: 10))
                            .foregroundColor(.secondary)
                            .lineLimit(1)
                    }
                }
                
                Spacer()
                
                Text("-$\(Int(item.amount))")
                    .font(.caption.weight(.heavy))
                    .foregroundColor(.red)
                
                Button {
                    inputRating = item.peerRating ?? 8
                    inputFeedback = item.peerFeedback ?? ""
                    ratingTargetItem = item
                } label: {
                    HStack(spacing: 2) {
                        Image(systemName: item.peerRating == nil ? "star.fill" : "pencil")
                        Text(item.peerRating == nil ? "評分" : "改分")
                    }
                    .font(.system(size: 10, weight: .bold))
                    .foregroundColor(.white)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(Color.indigo)
                    .cornerRadius(6)
                }
                .buttonStyle(.plain)
            }
            
            if let feedback = item.peerFeedback, !feedback.isEmpty {
                Text("💬 評語：\(feedback)")
                    .font(.system(size: 10))
                    .foregroundColor(.purple)
                    .padding(.horizontal, 6)
                    .padding(.vertical, 3)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(Color.purple.opacity(0.07))
                    .cornerRadius(5)
            }
        }
        .padding(8)
        .background(Color(.systemBackground))
        .cornerRadius(10)
    }
    
    private func addAndLoadFriend() {
        let code = friendCodeInput.trimmingCharacters(in: .whitespacesAndNewlines).uppercased()
        let nick = friendNicknameInput.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !code.isEmpty else { return }
        
        isLoadingFriend = true
        Task {
            let result = await dataManager.loadFriendAccounting(shareCode: code)
            isLoadingFriend = false
            switch result {
            case .success(let schedule):
                if !nick.isEmpty {
                    dataManager.updateSavedFriendNickname(shareCode: schedule.shareCode, nickname: nick)
                }
                friendCodeInput = ""
                friendNicknameInput = ""
                showAddFriendInput = false
                showBanner("已載入並將【\(nick.isEmpty ? schedule.ownerName : nick)】存入記錄簿！", isError: false)
            case .failure(let err):
                showBanner(err.localizedDescription, isError: true)
            }
        }
    }
    
    private func showBanner(_ text: String, isError: Bool) {
        statusBannerText = text
        isErrorBanner = isError
        DispatchQueue.main.asyncAfter(deadline: .now() + 3) {
            if statusBannerText == text {
                statusBannerText = nil
            }
        }
    }
}

// MARK: - 獨立共用評分彈窗
struct PeerRatingModalSheet: View {
    @Environment(\.dismiss) var dismiss
    @EnvironmentObject var dataManager: DataManager
    
    let item: TransactionItem
    let targetShareCode: String
    @State var inputRating: Double
    @State var inputFeedback: String
    var onComplete: (String) -> Void
    
    @State private var isSubmittingRating: Bool = false
    
    init(
        item: TransactionItem,
        targetShareCode: String,
        initialRating: Double,
        initialFeedback: String,
        onComplete: @escaping (String) -> Void
    ) {
        self.item = item
        self.targetShareCode = targetShareCode
        _inputRating = State(initialValue: initialRating)
        _inputFeedback = State(initialValue: initialFeedback)
        self.onComplete = onComplete
    }
    
    var body: some View {
        NavigationStack {
            Form {
                Section("消費項目明細") {
                    HStack {
                        Image(systemName: item.categoryIcon)
                            .foregroundColor(item.color)
                        Text(item.categoryName)
                            .font(.headline)
                        Spacer()
                        Text("$\(Int(item.amount))")
                            .font(.headline)
                            .foregroundColor(.red)
                    }
                    if !item.notes.isEmpty {
                        Text("備註：\(item.notes)")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    HStack {
                        Text("對方自評理性分")
                            .font(.caption)
                            .foregroundColor(.secondary)
                        Spacer()
                        Text("\(item.valueScore) 分")
                            .font(.caption.weight(.bold))
                            .foregroundColor(item.valueScoreColor)
                    }
                }
                
                Section("好友理性度打分 (1 ~ 10 分)") {
                    VStack(spacing: 8) {
                        HStack {
                            Text("\(Int(inputRating)) 分")
                                .font(.title.weight(.heavy))
                                .foregroundColor(ratingColor(inputRating))
                            Spacer()
                            Text(ratingTitle(inputRating))
                                .font(.subheadline.weight(.bold))
                                .foregroundColor(ratingColor(inputRating))
                        }
                        
                        Slider(value: $inputRating, in: 1...10, step: 1)
                            .tint(ratingColor(inputRating))
                        
                        HStack {
                            Text("1 (衝動浪費)")
                                .font(.caption2)
                                .foregroundColor(.secondary)
                            Spacer()
                            Text("10 (物超所值)")
                                .font(.caption2)
                                .foregroundColor(.secondary)
                        }
                    }
                    .padding(.vertical, 4)
                }
                
                Section("給予好友的理性評語 / 吐槽建議") {
                    TextField("輸入評語，例如：這杯飲料下次可以忍忍、超划算讚啦！", text: $inputFeedback, axis: .vertical)
                        .lineLimit(3...5)
                    
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 6) {
                            quickFeedbackButton("超級值得！支持你 👍")
                            quickFeedbackButton("這餐太省啦，模範生 🌟")
                            quickFeedbackButton("飲料少喝點，存錢吧 🥤")
                            quickFeedbackButton("衝動是魔鬼！剁手警告 ⚠️")
                        }
                    }
                    .padding(.vertical, 2)
                }
            }
            .navigationTitle("為好友打分")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("取消") {
                        dismiss()
                    }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button {
                        submitRating()
                    } label: {
                        if isSubmittingRating {
                            ProgressView()
                        } else {
                            Text("確認送出")
                                .bold()
                        }
                    }
                    .disabled(isSubmittingRating)
                }
            }
        }
        .presentationDetents([.medium, .large])
    }
    
    private func quickFeedbackButton(_ text: String) -> some View {
        Button {
            inputFeedback = text
        } label: {
            Text(text)
                .font(.caption2)
                .foregroundColor(.indigo)
                .padding(.horizontal, 8)
                .padding(.vertical, 4)
                .background(Color.indigo.opacity(0.1))
                .cornerRadius(6)
        }
        .buttonStyle(.plain)
    }
    
    private func submitRating() {
        isSubmittingRating = true
        Task {
            _ = await dataManager.submitPeerRating(
                targetShareCode: targetShareCode,
                transactionId: item.id,
                rating: inputRating,
                feedback: inputFeedback
            )
            isSubmittingRating = false
            onComplete("已成功送出理性評分與回饋！")
            dismiss()
        }
    }
    
    private func ratingTitle(_ score: Double) -> String {
        switch score {
        case 9...10: return "絕對理性！物超所值"
        case 7...8: return "很理性，非常值得"
        case 5...6: return "日常必需，尚可接受"
        case 3...4: return "有點衝動，下次想想"
        default: return "衝動消費！剁手警告"
        }
    }
    
    private func ratingColor(_ score: Double) -> Color {
        switch score {
        case 7...10: return .green
        case 5..<7: return .orange
        default: return .red
        }
    }
}

// MARK: - 完整好友記帳與分享設定頁 (分頁或彈窗)
struct PeerExpenseReviewView: View {
    var isModal: Bool = false
    @Environment(\.dismiss) var dismiss
    @EnvironmentObject var dataManager: DataManager
    
    enum ReviewTab: String, CaseIterable, Identifiable {
        case viewFriend = "好友記帳與記錄簿"
        case mySharing = "我的分享與自動上傳"
        var id: String { rawValue }
    }
    
    @State private var selectedTab: ReviewTab = .viewFriend
    @State private var friendCodeInput: String = ""
    @State private var friendNicknameInput: String = ""
    @State private var isLoadingFriend: Bool = false
    @State private var errorMessage: String? = nil
    @State private var successMessage: String? = nil
    
    // 修改備註狀態
    @State private var editingRecord: SavedFriendRecord? = nil
    @State private var editingNickname: String = ""
    
    // 評審彈窗狀態
    @State private var ratingTargetItem: TransactionItem? = nil
    @State private var inputRating: Double = 8
    @State private var inputFeedback: String = ""
    
    var body: some View {
        if isModal {
            NavigationStack {
                mainContent
                    .navigationTitle("好友記帳與自動上傳")
                    .navigationBarTitleDisplayMode(.inline)
                    .toolbar {
                        ToolbarItem(placement: .confirmationAction) {
                            Button("完成") {
                                dismiss()
                            }
                        }
                    }
                    .sheet(item: $ratingTargetItem) { item in
                        PeerRatingModalSheet(
                            item: item,
                            targetShareCode: dataManager.friendAccounting?.shareCode ?? dataManager.myShareCode,
                            initialRating: inputRating,
                            initialFeedback: inputFeedback
                        ) { msg in
                            successMessage = msg
                        }
                    }
            }
        } else {
            mainContent
                .sheet(item: $ratingTargetItem) { item in
                    PeerRatingModalSheet(
                        item: item,
                        targetShareCode: dataManager.friendAccounting?.shareCode ?? dataManager.myShareCode,
                        initialRating: inputRating,
                        initialFeedback: inputFeedback
                    ) { msg in
                        successMessage = msg
                    }
                }
        }
    }
    
    private var mainContent: some View {
        VStack(spacing: 0) {
            // 頂部分頁切換器
            Picker("評審分頁", selection: $selectedTab) {
                ForEach(ReviewTab.allCases) { tab in
                    Text(tab.rawValue).tag(tab)
                }
            }
            .pickerStyle(.segmented)
            .padding(.horizontal, 16)
            .padding(.vertical, 10)
            .background(Color(.systemBackground))
            
            // 提示通知橫幅
            if let msg = successMessage {
                HStack(spacing: 8) {
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundColor(.green)
                    Text(msg)
                        .font(.caption.weight(.bold))
                        .foregroundColor(.primary)
                    Spacer()
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 8)
                .background(Color.green.opacity(0.12))
            }
            
            if let err = errorMessage {
                HStack(spacing: 8) {
                    Image(systemName: "exclamationmark.triangle.fill")
                        .foregroundColor(.red)
                    Text(err)
                        .font(.caption.weight(.bold))
                        .foregroundColor(.red)
                    Spacer()
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 8)
                .background(Color.red.opacity(0.12))
            }
            
            // 主內容
            ScrollView {
                VStack(spacing: 16) {
                    switch selectedTab {
                    case .viewFriend:
                        friendAccountingView
                    case .mySharing:
                        mySharingView
                    }
                }
                .padding(16)
            }
        }
        .background(Color(.systemGroupedBackground))
        .alert("修改好友備註名稱", isPresented: Binding(
            get: { editingRecord != nil },
            set: { if !$0 { editingRecord = nil } }
        )) {
            TextField("輸入好記的暱稱（例：室友阿明）", text: $editingNickname)
            Button("取消", role: .cancel) {
                editingRecord = nil
            }
            Button("儲存") {
                if let rec = editingRecord {
                    dataManager.updateSavedFriendNickname(shareCode: rec.shareCode, nickname: editingNickname)
                }
                editingRecord = nil
            }
        } message: {
            if let rec = editingRecord {
                Text("代碼：\(rec.shareCode)（原名：\(rec.ownerName)）")
            }
        }
    }
    
    // MARK: - 分頁 1：查看好友記帳與好友記錄簿
    private var friendAccountingView: some View {
        VStack(spacing: 16) {
            savedFriendsDirectoryCard
            addFriendCodeCard
            if let friend = dataManager.friendAccounting {
                loadedFriendDetailSection(friend: friend)
            }
        }
    }
    
    // 1. 好友分享記錄簿卡片（不用每次輸入代碼）
    private var savedFriendsDirectoryCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: "book.closed.fill")
                    .foregroundColor(.indigo)
                    .font(.title3)
                Text("好友分享記錄簿")
                    .font(.headline)
                Spacer()
                Text("共 \(dataManager.savedFriends.count) 位")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            
            if dataManager.savedFriends.isEmpty {
                Text("尚無儲存的好友。在下方輸入一次 6 位分享碼後，系統會自動存入記錄簿，以後點一下即可直接查看好友課表與記帳！")
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .padding(.vertical, 6)
            } else {
                VStack(spacing: 8) {
                    ForEach(dataManager.savedFriends) { record in
                        savedFriendDirectoryRow(record: record)
                    }
                }
            }
        }
        .padding(16)
        .background(Color(.systemBackground))
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.04), radius: 6, x: 0, y: 2)
    }
    
    private func savedFriendDirectoryRow(record: SavedFriendRecord) -> some View {
        let isCurrent = dataManager.friendAccounting?.shareCode == record.shareCode
        return HStack(spacing: 12) {
            Button {
                dataManager.selectSavedFriendForAccounting(record)
                successMessage = "已切換至【\(record.displayName)】的記帳狀況"
            } label: {
                HStack(spacing: 10) {
                    ZStack {
                        Circle()
                            .fill(isCurrent ? Color.indigo : Color.indigo.opacity(0.12))
                            .frame(width: 38, height: 38)
                        Image(systemName: isCurrent ? "person.crop.circle.fill.badge.checkmark" : "person.crop.circle.fill")
                            .foregroundColor(isCurrent ? .white : .indigo)
                    }
                    
                    VStack(alignment: .leading, spacing: 2) {
                        HStack(spacing: 6) {
                            Text(record.displayName)
                                .font(.subheadline.weight(.bold))
                                .foregroundColor(.primary)
                            Text(record.shareCode)
                                .font(.system(size: 11, weight: .bold, design: .monospaced))
                                .padding(.horizontal, 6)
                                .padding(.vertical, 1.5)
                                .background(Color.indigo.opacity(0.12))
                                .foregroundColor(.indigo)
                                .clipShape(Capsule())
                        }
                        Text("公開記帳 \(record.accountingCount) 筆 • 課表 \(record.coursesCount) 堂")
                            .font(.caption2)
                            .foregroundColor(.secondary)
                    }
                    Spacer()
                }
            }
            .buttonStyle(.plain)
            
            Button {
                editingRecord = record
                editingNickname = record.nickname
            } label: {
                Image(systemName: "pencil.circle.fill")
                    .font(.title3)
                    .foregroundColor(.secondary)
            }
            .buttonStyle(.plain)
            
            Button(role: .destructive) {
                dataManager.removeSavedFriend(shareCode: record.shareCode)
            } label: {
                Image(systemName: "trash.circle.fill")
                    .font(.title3)
                    .foregroundColor(.red.opacity(0.75))
            }
            .buttonStyle(.plain)
        }
        .padding(10)
        .background(isCurrent ? Color.indigo.opacity(0.08) : Color(.secondarySystemBackground))
        .cornerRadius(12)
    }
    
    // 2. 新增好友代碼卡片
    private var addFriendCodeCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: "person.badge.plus")
                    .foregroundColor(.indigo)
                    .font(.title3)
                Text("新增好友代碼至記錄簿")
                    .font(.headline)
                Spacer()
            }
            
            HStack(spacing: 10) {
                TextField("6 位好友分享碼 (如 A8K2M9)", text: $friendCodeInput)
                    .textInputAutocapitalization(.characters)
                    .autocorrectionDisabled()
                    .font(.system(.body, design: .monospaced))
                    .padding(10)
                    .background(Color(.secondarySystemBackground))
                    .cornerRadius(10)
                
                Button {
                    if let pasteString = UIPasteboard.general.string {
                        friendCodeInput = pasteString.trimmingCharacters(in: .whitespacesAndNewlines).uppercased()
                    }
                } label: {
                    Image(systemName: "doc.on.clipboard")
                        .foregroundColor(.indigo)
                        .padding(10)
                        .background(Color.indigo.opacity(0.12))
                        .cornerRadius(10)
                }
            }
            
            TextField("自訂好友備註名稱 (選填，例如：室友小華)", text: $friendNicknameInput)
                .font(.subheadline)
                .padding(10)
                .background(Color(.secondarySystemBackground))
                .cornerRadius(10)
            
            Button {
                loadFriendData()
            } label: {
                HStack {
                    Spacer()
                    if isLoadingFriend {
                        ProgressView()
                            .tint(.white)
                    } else {
                        Image(systemName: "arrow.down.circle.fill")
                        Text("載入好友記帳並存入記錄簿")
                            .font(.subheadline.weight(.bold))
                    }
                    Spacer()
                }
                .padding(.vertical, 12)
                .background(Color.indigo)
                .foregroundColor(.white)
                .cornerRadius(10)
            }
            .disabled(friendCodeInput.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || isLoadingFriend)
        }
        .padding(16)
        .background(Color(.systemBackground))
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.04), radius: 6, x: 0, y: 2)
    }
    
    // 3. 好友記帳詳情 (若已載入)
    private func loadedFriendDetailSection(friend: SharedSchedule) -> some View {
        let friendExpenses = friend.accountingData.filter { $0.type == .expense }
        let totalSpent = friendExpenses.reduce(0) { $0 + $1.amount }
        let scored = friendExpenses.filter { $0.valueScore > 0 }
        let selfAvg = scored.isEmpty ? 0 : (Double(scored.reduce(0) { $0 + $1.valueScore }) / Double(scored.count))
        let peerScored = friendExpenses.compactMap { $0.peerRating }
        let peerAvg = peerScored.isEmpty ? nil : (Double(peerScored.reduce(0) { $0 + $1 }) / Double(peerScored.count))
        let displayName = dataManager.savedFriends.first(where: { $0.shareCode == friend.shareCode })?.displayName ?? friend.ownerName
        
        return VStack(spacing: 14) {
            HStack(spacing: 12) {
                Image(systemName: "person.circle.fill")
                    .font(.system(size: 40))
                    .foregroundColor(.indigo)
                
                VStack(alignment: .leading, spacing: 2) {
                    HStack {
                        Text("【\(displayName)】的記帳狀況")
                            .font(.headline)
                        Spacer()
                        Text("代碼: \(friend.shareCode)")
                            .font(.caption2.weight(.bold))
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(Color.indigo.opacity(0.12))
                            .foregroundColor(.indigo)
                            .clipShape(Capsule())
                    }
                    Text("公開消費項目共 \(friend.accountingData.count) 筆")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
            .padding(14)
            .background(Color(.systemBackground))
            .cornerRadius(14)
            
            HStack(spacing: 10) {
                VStack(spacing: 4) {
                    Text("總花費")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                    Text("$\(Int(totalSpent))")
                        .font(.headline.weight(.heavy))
                        .foregroundColor(.red)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 10)
                .background(Color(.systemBackground))
                .cornerRadius(12)
                
                VStack(spacing: 4) {
                    Text("自評理性")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                    Text(String(format: "%.1f 分", selfAvg))
                        .font(.headline.weight(.bold))
                        .foregroundColor(.orange)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 10)
                .background(Color(.systemBackground))
                .cornerRadius(12)
                
                VStack(spacing: 4) {
                    Text("好友評審均分")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                    if let p = peerAvg {
                        Text(String(format: "%.1f 分", p))
                            .font(.headline.weight(.bold))
                            .foregroundColor(.purple)
                    } else {
                        Text("尚無評分")
                            .font(.caption.weight(.semibold))
                            .foregroundColor(.secondary)
                    }
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 10)
                .background(Color(.systemBackground))
                .cornerRadius(12)
            }
            
            VStack(alignment: .leading, spacing: 10) {
                Text("消費明細與評審打分")
                    .font(.subheadline.weight(.bold))
                    .foregroundColor(.secondary)
                    .padding(.leading, 4)
                
                if friendExpenses.isEmpty {
                    HStack {
                        Spacer()
                        Text("好友尚未有公開的支出紀錄")
                            .font(.caption)
                            .foregroundColor(.secondary)
                            .padding(.vertical, 20)
                        Spacer()
                    }
                    .background(Color(.systemBackground))
                    .cornerRadius(12)
                } else {
                    ForEach(friendExpenses) { item in
                        friendExpenseCard(item, targetShareCode: friend.shareCode)
                    }
                }
            }
        }
    }
    
    // 好友花費單項卡片
    private func friendExpenseCard(_ item: TransactionItem, targetShareCode: String) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 12) {
                Image(systemName: item.categoryIcon)
                    .font(.system(size: 16, weight: .bold))
                    .foregroundColor(.white)
                    .frame(width: 38, height: 38)
                    .background(item.color)
                    .clipShape(Circle())
                
                VStack(alignment: .leading, spacing: 2) {
                    HStack(spacing: 6) {
                        Text(item.categoryName)
                            .font(.subheadline.weight(.bold))
                        Text(item.paymentMethodName)
                            .font(.system(size: 9))
                            .foregroundColor(.secondary)
                            .padding(.horizontal, 4)
                            .padding(.vertical, 1)
                            .background(Color(.secondarySystemBackground))
                            .cornerRadius(4)
                    }
                    if !item.notes.isEmpty {
                        Text(item.notes)
                            .font(.caption2)
                            .foregroundColor(.secondary)
                    }
                }
                
                Spacer()
                
                Text("-$\(Int(item.amount))")
                    .font(.subheadline.weight(.heavy))
                    .foregroundColor(.red)
            }
            
            Divider()
            
            HStack {
                // 自評分數
                HStack(spacing: 3) {
                    Text("自評:")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                    Text("\(item.valueScore) 分")
                        .font(.caption2.weight(.bold))
                        .foregroundColor(item.valueScoreColor)
                }
                
                Spacer()
                
                // 好友評審狀態
                if let peer = item.peerRating {
                    HStack(spacing: 4) {
                        Image(systemName: "star.fill")
                            .font(.system(size: 10))
                            .foregroundColor(.purple)
                        Text("評審: \(Int(peer)) 分")
                            .font(.caption2.weight(.bold))
                            .foregroundColor(.purple)
                    }
                    .padding(.horizontal, 6)
                    .padding(.vertical, 2)
                    .background(Color.purple.opacity(0.12))
                    .clipShape(Capsule())
                }
                
                Button {
                    inputRating = item.peerRating ?? 8
                    inputFeedback = item.peerFeedback ?? ""
                    ratingTargetItem = item
                } label: {
                    HStack(spacing: 4) {
                        Image(systemName: item.peerRating == nil ? "star" : "pencil")
                        Text(item.peerRating == nil ? "給予評分" : "修改評分")
                    }
                    .font(.caption2.weight(.bold))
                    .foregroundColor(.white)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 5)
                    .background(Color.indigo)
                    .cornerRadius(8)
                }
            }
            
            if let feedback = item.peerFeedback, !feedback.isEmpty {
                HStack(alignment: .top, spacing: 4) {
                    Image(systemName: "quote.opening")
                        .font(.system(size: 9))
                        .foregroundColor(.purple)
                    Text("評語：\(feedback)")
                        .font(.caption2)
                        .foregroundColor(.purple)
                }
                .padding(6)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(Color.purple.opacity(0.06))
                .cornerRadius(6)
            }
        }
        .padding(12)
        .background(Color(.systemBackground))
        .cornerRadius(14)
        .shadow(color: .black.opacity(0.03), radius: 4, x: 0, y: 1)
    }
    
    // MARK: - 分頁 2：我的記帳分享與每日自動上傳設定
    private var mySharingView: some View {
        VStack(spacing: 16) {
            // 我的分享碼區塊
            VStack(alignment: .center, spacing: 10) {
                Text("您的專屬課表與記帳分享代碼")
                    .font(.caption)
                    .foregroundColor(.secondary)
                
                HStack(spacing: 8) {
                    Text(dataManager.myShareCode)
                        .font(.system(size: 32, weight: .bold, design: .monospaced))
                        .kerning(4)
                        .foregroundColor(.indigo)
                    
                    Button {
                        UIPasteboard.general.string = dataManager.myShareCode
                        successMessage = "已成功複製您的 6 位代碼到剪貼簿！"
                        DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
                            successMessage = nil
                        }
                    } label: {
                        Image(systemName: "doc.on.doc.fill")
                            .font(.title3)
                            .foregroundColor(.indigo)
                    }
                }
                
                Text("將此代碼告訴朋友，好友存入記錄簿後即可隨時查看您的課表或為每筆花費打分數！")
                    .font(.caption2)
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.center)
            }
            .frame(maxWidth: .infinity)
            .padding(16)
            .background(Color(.systemBackground))
            .cornerRadius(16)
            
            // 自動上傳記帳內容設定卡片（預設每天下午 1:30 與 晚上 10:30）
            VStack(alignment: .leading, spacing: 12) {
                HStack {
                    Image(systemName: "clock.arrow.2.circlepath")
                        .foregroundColor(.indigo)
                        .font(.title3)
                    VStack(alignment: .leading, spacing: 2) {
                        Text("自動上傳記帳內容排程")
                            .font(.headline)
                        Text("預設每天下午 1:30 與晚上 10:30 自動同步至雲端")
                            .font(.caption2)
                            .foregroundColor(.secondary)
                    }
                    Spacer()
                    Toggle("", isOn: $dataManager.isAutoUploadAccountingEnabled)
                        .labelsHidden()
                        .tint(.indigo)
                }
                
                Divider()
                
                HStack {
                    Label("時段一（預設下午 1:30）", systemImage: "sun.max.fill")
                        .font(.subheadline)
                        .foregroundColor(.primary)
                    Spacer()
                    DatePicker(
                        "",
                        selection: Binding(
                            get: {
                                Calendar.current.date(from: DateComponents(hour: dataManager.autoUploadSlot1Hour, minute: dataManager.autoUploadSlot1Minute)) ?? Date()
                            },
                            set: { newDate in
                                let comps = Calendar.current.dateComponents([.hour, .minute], from: newDate)
                                dataManager.autoUploadSlot1Hour = comps.hour ?? 13
                                dataManager.autoUploadSlot1Minute = comps.minute ?? 30
                            }
                        ),
                        displayedComponents: .hourAndMinute
                    )
                    .labelsHidden()
                }
                
                HStack {
                    Label("時段二（預設晚上 10:30）", systemImage: "moon.stars.fill")
                        .font(.subheadline)
                        .foregroundColor(.primary)
                    Spacer()
                    DatePicker(
                        "",
                        selection: Binding(
                            get: {
                                Calendar.current.date(from: DateComponents(hour: dataManager.autoUploadSlot2Hour, minute: dataManager.autoUploadSlot2Minute)) ?? Date()
                            },
                            set: { newDate in
                                let comps = Calendar.current.dateComponents([.hour, .minute], from: newDate)
                                dataManager.autoUploadSlot2Hour = comps.hour ?? 22
                                dataManager.autoUploadSlot2Minute = comps.minute ?? 30
                            }
                        ),
                        displayedComponents: .hourAndMinute
                    )
                    .labelsHidden()
                }
                
                HStack {
                    Text("上次自動/手動上傳時間：\(dataManager.lastAutoUploadAccountingString)")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                    Spacer()
                    Button("還原預設時段") {
                        dataManager.autoUploadSlot1Hour = 13
                        dataManager.autoUploadSlot1Minute = 30
                        dataManager.autoUploadSlot2Hour = 22
                        dataManager.autoUploadSlot2Minute = 30
                        successMessage = "已還原為每天 13:30 與 22:30 自動上傳！"
                    }
                    .font(.caption2.weight(.bold))
                    .foregroundColor(.indigo)
                }
                
                Divider()
                
                Toggle("允許好友透過分享碼查看我的記帳並評分", isOn: Binding(
                    get: { dataManager.isSharingTodayExpense },
                    set: { newValue in
                        Task {
                            await dataManager.toggleExpenseSharing(isEnabled: newValue)
                        }
                    }
                ))
                .font(.subheadline)
                .tint(.indigo)
                
                Button {
                    Task {
                        await dataManager.uploadAllAccountingContentNow(reason: "手動立即上傳")
                        successMessage = "記帳明細與雲端備份已成功上傳同步！"
                        DispatchQueue.main.asyncAfter(deadline: .now() + 2.5) {
                            successMessage = nil
                        }
                    }
                } label: {
                    HStack {
                        Spacer()
                        if dataManager.isUploadingAccounting {
                            ProgressView()
                                .tint(.white)
                        } else {
                            Image(systemName: "arrow.triangle.2.circlepath.icloud.fill")
                            Text("立即上傳 / 同步最新記帳至雲端")
                                .font(.subheadline.weight(.bold))
                        }
                        Spacer()
                    }
                    .padding(.vertical, 12)
                    .background(Color.indigo)
                    .foregroundColor(.white)
                    .cornerRadius(10)
                }
                .disabled(dataManager.isUploadingAccounting)
            }
            .padding(16)
            .background(Color(.systemBackground))
            .cornerRadius(16)
            
            // 我收到的好友評分回饋清單
            VStack(alignment: .leading, spacing: 10) {
                Text("我收到的好友評審回饋")
                    .font(.subheadline.weight(.bold))
                    .foregroundColor(.secondary)
                    .padding(.leading, 4)
                
                let peerReviewed = dataManager.transactions.filter { $0.peerRating != nil }
                
                if peerReviewed.isEmpty {
                    HStack {
                        Spacer()
                        VStack(spacing: 6) {
                            Image(systemName: "bubble.left.and.exclamationmark.bubble.right")
                                .font(.title2)
                                .foregroundColor(.secondary)
                            Text("目前尚無好友評語，快把代碼分享給好友評審吧！")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                        .padding(.vertical, 24)
                        Spacer()
                    }
                    .background(Color(.systemBackground))
                    .cornerRadius(12)
                } else {
                    ForEach(peerReviewed) { item in
                        VStack(alignment: .leading, spacing: 6) {
                            HStack {
                                Text(item.categoryName)
                                    .font(.subheadline.weight(.bold))
                                if !item.notes.isEmpty {
                                    Text("(\(item.notes))")
                                        .font(.caption2)
                                        .foregroundColor(.secondary)
                                }
                                Spacer()
                                Text("$\(Int(item.amount))")
                                    .font(.subheadline.weight(.bold))
                                    .foregroundColor(.red)
                            }
                            
                            HStack {
                                Text("好友評分: \(Int(item.peerRating ?? 0)) 分")
                                    .font(.caption2.weight(.heavy))
                                    .foregroundColor(.purple)
                                Spacer()
                                if let fb = item.peerFeedback, !fb.isEmpty {
                                    Text("“\(fb)”")
                                        .font(.caption2)
                                        .foregroundColor(.purple)
                                }
                            }
                        }
                        .padding(12)
                        .background(Color(.systemBackground))
                        .cornerRadius(12)
                    }
                }
            }
        }
    }
    
    private func loadFriendData() {
        let code = friendCodeInput.trimmingCharacters(in: .whitespacesAndNewlines).uppercased()
        let nick = friendNicknameInput.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !code.isEmpty else { return }
        
        isLoadingFriend = true
        errorMessage = nil
        successMessage = nil
        
        Task {
            let result = await dataManager.loadFriendAccounting(shareCode: code)
            isLoadingFriend = false
            switch result {
            case .success(let friend):
                if !nick.isEmpty {
                    dataManager.updateSavedFriendNickname(shareCode: friend.shareCode, nickname: nick)
                }
                friendCodeInput = ""
                friendNicknameInput = ""
                successMessage = "已成功載入並儲存 \(nick.isEmpty ? friend.ownerName : nick) 的記帳狀況！"
            case .failure(let err):
                errorMessage = err.localizedDescription
            }
        }
    }
}
