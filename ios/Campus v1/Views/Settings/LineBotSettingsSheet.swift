//
//  LineBotSettingsSheet.swift
//  Campus v1
//
//  Created for Campus v1 LINE Bot Morning Briefing Integration.
//

import SwiftUI

struct LinePushCenterSheet: View {
    var body: some View {
        LineBotSettingsSheet(initialTab: 0)
    }
}

struct LineBotSettingsSheet: View {
    @Environment(\.dismiss) var dismiss
    @Environment(\.scenePhase) private var scenePhase
    @Environment(\.openURL) private var openURL
    @EnvironmentObject var dataManager: DataManager
    @ObservedObject var lineService = LineBotService.shared
    
    /// 0 = 🎯 多人獨立推播中心, 1 = ⚙️ 機器人金鑰與雲端設定
    @State private var selectedTab: Int
    @State private var showingTokenPlain: Bool = false
    @State private var alertTitle: String = ""
    @State private var alertMessage: String = ""
    @State private var showingAlert: Bool = false
    @State private var showingPreview: Bool = false
    @State private var previewTargetUserId: String = ""
    @State private var showingSqlCopiedToast: Bool = false
    @State private var showingAddUserSheet: Bool = false
    @State private var editingUserProfile: LineBotUserProfile? = nil
    @State private var testingUserId: String? = nil
    @State private var isBatchPushing: Bool = false
    
    init(initialTab: Int = 0) {
        _selectedTab = State(initialValue: initialTab)
    }
    
    // 綁定本機主帳號推播時間 Date
    private var pushTimeBinding: Binding<Date> {
        Binding<Date>(
            get: {
                var components = DateComponents()
                components.hour = lineService.pushHour
                components.minute = lineService.pushMinute
                return Calendar.current.date(from: components) ?? Date()
            },
            set: { newDate in
                let comp = Calendar.current.dateComponents([.hour, .minute], from: newDate)
                lineService.pushHour = comp.hour ?? 7
                lineService.pushMinute = comp.minute ?? 0
            }
        )
    }
    
    private var unimportedFriends: [SavedFriendRecord] {
        dataManager.savedFriends.filter { friend in
            let code = friend.shareCode.trimmingCharacters(in: .whitespacesAndNewlines).uppercased()
            return !lineService.registeredUsers.contains(where: { $0.shareCode.uppercased() == code })
        }
    }
    
    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // 頂部獨立切換器：將「多人獨立推播中心」與「機器人金鑰/雲端設定」完全分離
                Picker("模式切換", selection: $selectedTab) {
                    Text("🎯 多人獨立推播中心").tag(0)
                    Text("⚙️ 機器人與雲端設定").tag(1)
                }
                .pickerStyle(.segmented)
                .padding(.horizontal, 16)
                .padding(.vertical, 10)
                .background(Color(.systemGroupedBackground))
                
                if selectedTab == 0 {
                    independentPushCenterForm
                } else {
                    botCredentialsAndCloudForm
                }
            }
            .navigationTitle(selectedTab == 0 ? "LINE 多人獨立推播中心" : "LINE Bot 金鑰與雲端設定")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    if selectedTab == 0 {
                        Button {
                            showingAddUserSheet = true
                        } label: {
                            Label("新增推播對象", systemImage: "person.badge.plus")
                                .font(.caption.weight(.bold))
                        }
                    }
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button("完成") {
                        dismiss()
                    }
                    .font(.body.weight(.semibold))
                }
            }
            .alert(alertTitle, isPresented: $showingAlert) {
                Button("確定", role: .cancel) {}
            } message: {
                Text(alertMessage)
            }
            .sheet(isPresented: $showingAddUserSheet) {
                AddLineUserProfileSheet()
                    .environmentObject(dataManager)
            }
            .sheet(item: $editingUserProfile) { profile in
                AddLineUserProfileSheet(existingProfile: profile)
                    .environmentObject(dataManager)
            }
            .onAppear {
                if previewTargetUserId.isEmpty {
                    previewTargetUserId = lineService.userId
                }
                Task {
                    if lineService.channelAccessToken.isEmpty && !lineService.channelId.isEmpty && !lineService.channelSecret.isEmpty {
                        _ = try? await lineService.fetchAccessTokenFromOAuth()
                    }
                    _ = await lineService.syncAndAutoClaimLineUserId()
                    await lineService.syncSettingsToSupabase()
                    await lineService.fetchRegisteredUsersFromSupabase()
                }
            }
            .onChange(of: scenePhase) { _, newPhase in
                if newPhase == .active {
                    // 當使用者從 LINE App 加完好友切回 Campus App 時，自動向 Supabase 查詢並帶入真實 U... LINE ID！
                    Task {
                        _ = await lineService.syncAndAutoClaimLineUserId()
                    }
                }
            }
        }
    }
    
    // MARK: - 分頁 A：獨立出來的「多人獨立推播中心」
    private var independentPushCenterForm: some View {
        Form {
            // 1. 獨立推播總覽與批次控制台
            Section {
                HStack(spacing: 14) {
                    ZStack {
                        RoundedRectangle(cornerRadius: 12, style: .continuous)
                            .fill(Color.green.opacity(0.15))
                            .frame(width: 46, height: 46)
                        Image(systemName: "paperplane.circle.fill")
                            .font(.title2)
                            .foregroundColor(.green)
                    }
                    
                    VStack(alignment: .leading, spacing: 3) {
                        HStack(spacing: 6) {
                            Text("多人獨立推播控制台")
                                .font(.headline)
                            let enabledCount = lineService.registeredUsers.filter(\.isEnabled).count
                            Text("\(enabledCount)/\(max(lineService.registeredUsers.count, 1)) 啟用")
                                .font(.system(size: 10, weight: .bold))
                                .foregroundColor(.green)
                                .padding(.horizontal, 6)
                                .padding(.vertical, 2)
                                .background(Color.green.opacity(0.12))
                                .clipShape(Capsule())
                        }
                        Text("每位使用者皆擁有獨立的推播開關、時間與推送模組（課表／待辦／記帳），互不混淆。")
                            .font(.caption2)
                            .foregroundColor(.secondary)
                    }
                }
                .padding(.vertical, 4)
                
                // 一鍵批次獨立推送所有已啟用使用者
                Button {
                    batchPushAllEnabledUsers()
                } label: {
                    HStack {
                        Spacer()
                        if isBatchPushing || lineService.isSending {
                            ProgressView()
                                .tint(.white)
                                .padding(.trailing, 6)
                            Text("正在依序獨立推送各使用者專屬卡片...")
                                .font(.subheadline.weight(.bold))
                                .foregroundColor(.white)
                        } else {
                            Image(systemName: "bolt.horizontal.circle.fill")
                                .foregroundColor(.white)
                            Text("一鍵獨立推送所有已啟用使用者 (\(lineService.registeredUsers.filter(\.isEnabled).count) 位)")
                                .font(.subheadline.weight(.bold))
                                .foregroundColor(.white)
                        }
                        Spacer()
                    }
                    .padding(.vertical, 8)
                }
                .disabled(isBatchPushing || lineService.isSending || !lineService.isConfigured)
                .listRowBackground(lineService.isConfigured ? Color.indigo : Color.gray.opacity(0.3))
                
                Toggle(isOn: $lineService.onlyPushSelfOnDevice) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("本機僅自動補推自己的排程")
                            .font(.subheadline.weight(.medium))
                        Text("多位使用者各自持有手機時建議開啟，避免本機在背景代推其他人的排程")
                            .font(.caption2)
                            .foregroundColor(.secondary)
                    }
                }
                .tint(.indigo)
            } header: {
                Text("獨立推播總覽与防衝突控制")
            }
            
            // 2. 從「好友記錄簿」一鍵匯入為獨立推播對象
            if !unimportedFriends.isEmpty {
                Section {
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 10) {
                            ForEach(unimportedFriends) { friend in
                                Button {
                                    importFriendToPush(friend)
                                } label: {
                                    HStack(spacing: 8) {
                                        Image(systemName: "person.crop.circle.badge.plus")
                                            .foregroundColor(.teal)
                                        VStack(alignment: .leading, spacing: 1) {
                                            Text(friend.displayName)
                                                .font(.caption.weight(.bold))
                                                .foregroundColor(.primary)
                                            Text("代碼 \(friend.shareCode) · 點此匯入")
                                                .font(.system(size: 10, design: .monospaced))
                                                .foregroundColor(.secondary)
                                        }
                                    }
                                    .padding(.horizontal, 12)
                                    .padding(.vertical, 8)
                                    .background(Color.teal.opacity(0.1))
                                    .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                                }
                                .buttonStyle(.plain)
                            }
                        }
                        .padding(.vertical, 2)
                    }
                } header: {
                    Text("📒 從好友記錄簿一鍵匯入推播對象")
                } footer: {
                    Text("點選上方已儲存的好友，即可直接將對方的 6 碼分享代碼加入獨立推播名單，免手動重填！")
                }
            }
            
            // 3. 各使用者獨立推播清單與模組開關
            Section {
                if lineService.registeredUsers.isEmpty {
                    Text("目前尚無推播對象，請點擊下方按鈕新增。")
                        .font(.caption)
                        .foregroundColor(.secondary)
                } else {
                    ForEach(lineService.registeredUsers) { profile in
                        let isSelf = (profile.userId == lineService.userId.trimmingCharacters(in: .whitespacesAndNewlines))
                        VStack(alignment: .leading, spacing: 10) {
                            // 頂部：名稱、標籤、獨立啟用 Toggle
                            HStack(spacing: 8) {
                                Image(systemName: isSelf ? "iphone.gen3" : "person.crop.circle.fill")
                                    .font(.headline)
                                    .foregroundColor(isSelf ? .indigo : .teal)
                                
                                VStack(alignment: .leading, spacing: 2) {
                                    HStack(spacing: 6) {
                                        Text(profile.userName)
                                            .font(.subheadline.weight(.bold))
                                        
                                        Text(isSelf ? "本機主帳號" : (profile.shareCode.isEmpty ? "獨立對象" : "代碼 \(profile.shareCode)"))
                                            .font(.system(size: 10, weight: .semibold))
                                            .foregroundColor(isSelf ? .indigo : .teal)
                                            .padding(.horizontal, 6)
                                            .padding(.vertical, 2)
                                            .background((isSelf ? Color.indigo : Color.teal).opacity(0.12))
                                            .cornerRadius(4)
                                    }
                                    
                                    HStack(spacing: 6) {
                                        Text(profile.isDirectPushMode ? "🎯 單人專屬 Push (\(profile.maskedUserId))" : "✨ \(profile.maskedUserId)")
                                            .font(.system(size: 10, design: .monospaced))
                                            .foregroundColor(.secondary)
                                        
                                        Text("·")
                                            .foregroundColor(.secondary)
                                        
                                        HStack(spacing: 3) {
                                            Circle()
                                                .fill(profile.isSentToday ? Color.green : Color.orange)
                                                .frame(width: 6, height: 6)
                                            Text(profile.isSentToday ? "今日已推播" : "待推播 \(String(format: "%02d:%02d", profile.pushHour, profile.pushMinute))")
                                                .font(.system(size: 10, weight: .medium))
                                                .foregroundColor(.secondary)
                                        }
                                    }
                                }
                                
                                Spacer()
                                
                                Toggle("", isOn: Binding(
                                    get: { profile.isEnabled },
                                    set: { newVal in
                                        var updated = profile
                                        updated.isEnabled = newVal
                                        Task { await lineService.updateUserPushPreferences(updated) }
                                    }
                                ))
                                .labelsHidden()
                                .tint(.green)
                            }
                            
                            // 中段：此使用者專屬的「獨立推送內容模組」膠囊開關
                            ScrollView(.horizontal, showsIndicators: false) {
                                HStack(spacing: 6) {
                                    moduleToggleChip(
                                        title: "今日課表",
                                        icon: "calendar",
                                        isOn: profile.includeSchedule,
                                        color: .indigo
                                    ) {
                                        var updated = profile
                                        updated.includeSchedule.toggle()
                                        Task { await lineService.updateUserPushPreferences(updated) }
                                    }
                                    
                                    moduleToggleChip(
                                        title: "今日待辦",
                                        icon: "checklist",
                                        isOn: profile.includeTodos,
                                        color: .orange
                                    ) {
                                        var updated = profile
                                        updated.includeTodos.toggle()
                                        Task { await lineService.updateUserPushPreferences(updated) }
                                    }
                                    
                                    moduleToggleChip(
                                        title: "本週規劃",
                                        icon: "sparkles.rectangle.stack",
                                        isOn: profile.includeWeeklyPlan,
                                        color: .blue
                                    ) {
                                        var updated = profile
                                        updated.includeWeeklyPlan.toggle()
                                        Task { await lineService.updateUserPushPreferences(updated) }
                                    }
                                    
                                    moduleToggleChip(
                                        title: "記帳摘要",
                                        icon: "dollarsign.circle.fill",
                                        isOn: profile.includeExpenseSummary,
                                        color: .teal
                                    ) {
                                        var updated = profile
                                        updated.includeExpenseSummary.toggle()
                                        Task { await lineService.updateUserPushPreferences(updated) }
                                    }
                                }
                            }
                            
                            // 底段：單獨立即推送、時間調整與編輯按鈕
                            HStack(spacing: 10) {
                                Button {
                                    testSpecificUserPush(profile)
                                } label: {
                                    HStack(spacing: 4) {
                                        if testingUserId == profile.userId {
                                            ProgressView()
                                                .scaleEffect(0.7)
                                            Text("發送中...")
                                        } else {
                                            Image(systemName: "paperplane.fill")
                                            Text("單獨推送給 \(profile.userName)")
                                        }
                                    }
                                    .font(.caption2.weight(.bold))
                                    .padding(.horizontal, 10)
                                    .padding(.vertical, 6)
                                    .background(Color.green.opacity(0.14))
                                    .foregroundColor(.green)
                                    .cornerRadius(7)
                                }
                                .buttonStyle(.plain)
                                .disabled(testingUserId != nil)
                                
                                Button {
                                    previewTargetUserId = profile.userId
                                    withAnimation {
                                        showingPreview = true
                                    }
                                } label: {
                                    HStack(spacing: 3) {
                                        Image(systemName: "eye")
                                        Text("預覽卡片")
                                    }
                                    .font(.caption2.weight(.medium))
                                    .padding(.horizontal, 8)
                                    .padding(.vertical, 6)
                                    .background(Color(.systemGray6))
                                    .foregroundColor(.secondary)
                                    .cornerRadius(7)
                                }
                                .buttonStyle(.plain)
                                
                                Button {
                                    editingUserProfile = profile
                                } label: {
                                    HStack(spacing: 3) {
                                        Image(systemName: "slider.horizontal.3")
                                        Text("時間/設定")
                                    }
                                    .font(.caption2.weight(.medium))
                                    .padding(.horizontal, 8)
                                    .padding(.vertical, 6)
                                    .background(Color(.systemGray6))
                                    .foregroundColor(.primary)
                                    .cornerRadius(7)
                                }
                                .buttonStyle(.plain)
                                
                                Spacer()
                                
                                if !isSelf {
                                    Button(role: .destructive) {
                                        Task {
                                            await lineService.deleteUserProfile(userId: profile.userId)
                                        }
                                    } label: {
                                        Image(systemName: "trash")
                                            .font(.caption)
                                            .foregroundColor(.red)
                                            .padding(4)
                                    }
                                    .buttonStyle(.plain)
                                }
                            }
                        }
                        .padding(.vertical, 6)
                    }
                }
                
                Button {
                    showingAddUserSheet = true
                } label: {
                    HStack {
                        Image(systemName: "person.badge.plus")
                        Text("新增獨立推播使用者（可綁定各自課表與記帳代碼）")
                            .font(.subheadline.weight(.semibold))
                    }
                    .foregroundColor(.indigo)
                    .padding(.vertical, 4)
                }
            } header: {
                Text("👥 獨立推播對象清單 (\(lineService.registeredUsers.count) 位)")
            } footer: {
                Text("點選每位使用者下方的「今日課表／今日待辦／本週規劃／記帳摘要」標籤，即可為不同使用者客製化專屬的推播內容與時間。")
            }
            
            // 4. 加好友自動知道使用者的 LINE ID (`U...`) 與一鍵精準配對區
            Section {
                // 目前本機 LINE ID 綁定狀態指示列
                let hasRealLineId = lineService.userId.trimmingCharacters(in: .whitespacesAndNewlines).hasPrefix("U")
                HStack(spacing: 10) {
                    Image(systemName: hasRealLineId ? "checkmark.seal.fill" : "person.wave.2.fill")
                        .font(.title3)
                        .foregroundColor(hasRealLineId ? .green : .indigo)
                    VStack(alignment: .leading, spacing: 2) {
                        Text(hasRealLineId ? "已自動識別您的專屬 LINE ID" : "透過加好友自動取得您的 LINE ID")
                            .font(.subheadline.weight(.bold))
                        Text(hasRealLineId
                             ? "目前綁定：\(lineService.userName) (\(lineService.userId.prefix(8))...\(lineService.userId.suffix(4)))"
                             : "無須手動查詢 33 碼 ID！點擊下方按鈕加好友或傳送綁定碼，返回 App 即自動帶入。")
                            .font(.caption2)
                            .foregroundColor(.secondary)
                    }
                    Spacer()
                }
                .padding(.vertical, 2)
                
                if let statusMsg = lineService.autoBindStatusMessage, !statusMsg.isEmpty {
                    Text(statusMsg)
                        .font(.caption2.weight(.medium))
                        .foregroundColor(.teal)
                }
                
                // 步驟 1：點此加 LINE 好友（自動在 Supabase 建立 15 分鐘待綁定工作階段）
                if let friendURL = lineService.addFriendURL {
                    Button {
                        Task {
                            await lineService.prepareAutoBindSession()
                            openURL(friendURL)
                        }
                    } label: {
                        HStack(spacing: 10) {
                            Image(systemName: "1.circle.fill")
                                .font(.title3)
                                .foregroundColor(.green)
                            VStack(alignment: .leading, spacing: 2) {
                                Text("步驟 1：點此加「\(lineService.botDisplayName)」LINE 好友")
                                    .font(.subheadline.weight(.bold))
                                    .foregroundColor(.primary)
                                Text("按下加好友瞬間，Supabase Webhook 會自動記錄您的 LINE ID 與暱稱")
                                    .font(.caption2)
                                    .foregroundColor(.secondary)
                            }
                            Spacer()
                            Image(systemName: "arrow.up.right.square.fill")
                                .foregroundColor(.green)
                        }
                        .padding(.vertical, 2)
                    }
                    .buttonStyle(.plain)
                }
                
                // 步驟 2：已是好友？一鍵開啟 LINE 並預填「綁定課表_<分享碼>」（100% 精準配對您的 U... ID）
                if let bindMsgURL = lineService.oneClickBindMessageURL() {
                    Button {
                        Task {
                            await lineService.prepareAutoBindSession()
                            openURL(bindMsgURL)
                        }
                    } label: {
                        HStack(spacing: 10) {
                            Image(systemName: "2.circle.fill")
                                .font(.title3)
                                .foregroundColor(.indigo)
                            VStack(alignment: .leading, spacing: 2) {
                                Text("步驟 2：一鍵傳送專屬綁定碼至 LINE（100% 精準配對）")
                                    .font(.subheadline.weight(.bold))
                                    .foregroundColor(.primary)
                                Text("自動開啟 LINE 預填「綁定課表_\(dataManager.myShareCode)」，按傳送即自動綁定您的 LINE ID")
                                    .font(.caption2)
                                    .foregroundColor(.secondary)
                            }
                            Spacer()
                            Image(systemName: "paperplane.circle.fill")
                                .foregroundColor(.indigo)
                        }
                        .padding(.vertical, 2)
                    }
                    .buttonStyle(.plain)
                }
                
                // 步驟 3：我已加好友，立即從 Supabase 雲端自動偵測並帶入 LINE ID
                Button {
                    Task {
                        if let claimedId = await lineService.syncAndAutoClaimLineUserId() {
                            alertTitle = "🎉 已自動識別您的 LINE ID！"
                            alertMessage = "已成功從雲端自動綁定您的專屬 LINE User ID：\n\(claimedId)\n\n現在起您將收到單人專屬 Push 推播！"
                            showingAlert = true
                        } else {
                            alertTitle = "💡 尚未偵測到新加入的好友紀錄"
                            alertMessage = "請確認：\n1. 已在 Supabase 部署 line-webhook 並貼至 LINE Developers Webhook URL\n2. 或點擊上方「步驟 2：一鍵傳送專屬綁定碼至 LINE」傳送一次訊息後再點此偵測！"
                            showingAlert = true
                        }
                    }
                } label: {
                    HStack {
                        if lineService.isCheckingAutoBind {
                            ProgressView()
                                .padding(.trailing, 6)
                            Text("正在向 Supabase 查詢您剛加入好友的 LINE ID...")
                        } else {
                            Image(systemName: "sparkles")
                            Text("步驟 3：我已加好友，點此自動偵測並帶入 LINE ID")
                        }
                        Spacer()
                        Image(systemName: "arrow.clockwise.circle.fill")
                    }
                    .font(.caption.weight(.bold))
                    .foregroundColor(.teal)
                    .padding(.vertical, 4)
                }
                .disabled(lineService.isCheckingAutoBind)
                
                // 若雲端 `line_followers` 已探索到加好友的 LINE 用戶，提供一鍵點選綁定
                if !lineService.discoveredFollowers.isEmpty {
                    VStack(alignment: .leading, spacing: 6) {
                        Text("👇 已加入官方帳號的 LINE 好友（點選即可一鍵帶入真實 LINE ID）：")
                            .font(.caption2.weight(.semibold))
                            .foregroundColor(.secondary)
                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 8) {
                                ForEach(lineService.discoveredFollowers) { follower in
                                    let isCurrent = (follower.lineUserId == lineService.userId)
                                    Button {
                                        Task {
                                            await lineService.bindFollowerToCurrentUser(follower)
                                        }
                                    } label: {
                                        HStack(spacing: 6) {
                                            Image(systemName: isCurrent ? "checkmark.circle.fill" : "person.crop.circle.badge.checkmark")
                                                .foregroundColor(isCurrent ? .green : .indigo)
                                            VStack(alignment: .leading, spacing: 1) {
                                                Text(follower.displayName)
                                                    .font(.caption.weight(.bold))
                                                    .foregroundColor(.primary)
                                                Text("\(follower.lineUserId.prefix(7))... · \(follower.boundShareCode.isEmpty ? "點此綁定" : "已配對 \(follower.boundShareCode)")")
                                                    .font(.system(size: 9, design: .monospaced))
                                                    .foregroundColor(.secondary)
                                            }
                                        }
                                        .padding(.horizontal, 10)
                                        .padding(.vertical, 6)
                                        .background((isCurrent ? Color.green : Color.indigo).opacity(0.12))
                                        .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
                                    }
                                    .buttonStyle(.plain)
                                }
                            }
                        }
                    }
                    .padding(.vertical, 2)
                }
                
                if let friendURL = lineService.addFriendURL {
                    Button {
                        UIPasteboard.general.string = friendURL.absoluteString
                        alertTitle = "🔗 已複製 LINE Bot 加好友連結"
                        alertMessage = "已複製連結：\(friendURL.absoluteString)\n可直接傳給朋友點擊加入好友！"
                        showingAlert = true
                    } label: {
                        HStack {
                            Image(systemName: "link.badge.plus")
                            Text("複製 LINE Bot 加好友連結傳給朋友")
                            Spacer()
                            Image(systemName: "doc.on.doc")
                                .font(.caption)
                        }
                        .font(.caption.weight(.semibold))
                        .foregroundColor(.indigo)
                    }
                }
            } header: {
                Text("🤝 透過加好友自動取得並綁定 LINE ID")
            }
            
            // 5. 多使用者專屬 Flex 卡片視覺預覽器
            Section {
                DisclosureGroup("檢視 Flex Message 專屬卡片預覽", isExpanded: $showingPreview) {
                    if lineService.registeredUsers.count > 1 {
                        Picker("預覽對象", selection: $previewTargetUserId) {
                            ForEach(lineService.registeredUsers) { user in
                                Text(user.userName).tag(user.userId)
                            }
                        }
                        .pickerStyle(.segmented)
                        .padding(.vertical, 4)
                    }
                    briefingCardPreview
                        .padding(.vertical, 8)
                }
            } header: {
                Text("即時卡片預覽")
            }
        }
    }
    
    private func moduleToggleChip(title: String, icon: String, isOn: Bool, color: Color, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack(spacing: 4) {
                Image(systemName: isOn ? "checkmark.circle.fill" : icon)
                    .font(.system(size: 10, weight: .bold))
                Text(title)
                    .font(.system(size: 11, weight: .semibold))
            }
            .padding(.horizontal, 9)
            .padding(.vertical, 5)
            .background(isOn ? color.opacity(0.15) : Color(.systemGray6))
            .foregroundColor(isOn ? color : .secondary)
            .clipShape(Capsule())
            .overlay(
                Capsule()
                    .stroke(isOn ? color.opacity(0.35) : Color.clear, lineWidth: 1)
            )
        }
        .buttonStyle(.plain)
    }
    
    // MARK: - 分頁 B：機器人金鑰憑證與雲端 SQL 設定
    private var botCredentialsAndCloudForm: some View {
        Form {
            // 1. 雲端 24/7 關閉 App 自動推播狀態與一鍵啟用
            Section {
                HStack(spacing: 14) {
                    ZStack {
                        Circle()
                            .fill(lineService.isCloudCronReady ? Color.green.opacity(0.15) : Color.orange.opacity(0.15))
                            .frame(width: 44, height: 44)
                        Image(systemName: lineService.isCloudCronReady ? "cloud.bolt.fill" : "exclamationmark.icloud.fill")
                            .font(.title3)
                            .foregroundColor(lineService.isCloudCronReady ? .green : .orange)
                    }
                    
                    VStack(alignment: .leading, spacing: 3) {
                        Text(lineService.isCloudCronReady ? "雲端 24/7 離線自動推播已啟用" : "尚未啟用「關閉 App 雲端自動推播」")
                            .font(.headline)
                        Text(lineService.isCloudCronReady
                             ? "關閉 App 或鎖屏時，雲端將依各使用者設定時間準時分開推播"
                             : "目前僅支援開啟 App 時自動補推，請依下方 3 步驟啟用雲端排程")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
                .padding(.vertical, 4)
                
                if !lineService.isCloudCronReady {
                    VStack(alignment: .leading, spacing: 10) {
                        Text("💡 只需在 Supabase SQL Editor 貼上排程腳本執行一次，即可永久支援「關閉 App 準時推播」與「多使用者分開通知」！")
                            .font(.caption2)
                            .foregroundColor(.secondary)
                        
                        Button {
                            copySupabaseCronSql()
                        } label: {
                            HStack {
                                Image(systemName: showingSqlCopiedToast ? "checkmark.circle.fill" : "1.circle.fill")
                                Text(showingSqlCopiedToast ? "已複製雲端排程 SQL 腳本！" : "步驟 1：一鍵複製多使用者雲端排程 SQL")
                                Spacer()
                                Image(systemName: "doc.on.doc")
                                    .font(.caption)
                            }
                            .font(.caption.weight(.bold))
                            .foregroundColor(showingSqlCopiedToast ? .green : .indigo)
                            .padding(.vertical, 4)
                        }
                        .buttonStyle(.plain)
                        
                        Divider()
                        
                        if let sqlEditorURL = URL(string: "https://supabase.com/dashboard/project/dxoobrrjzaovwpyagzgn/sql/new") {
                            Link(destination: sqlEditorURL) {
                                HStack {
                                    Image(systemName: "2.circle.fill")
                                    Text("步驟 2：開啟 Supabase SQL Editor 貼上並點 Run")
                                    Spacer()
                                    Image(systemName: "arrow.up.right.square")
                                        .font(.caption)
                                }
                                .font(.caption.weight(.bold))
                                .foregroundColor(.blue)
                                .padding(.vertical, 4)
                            }
                        }
                        
                        Divider()
                        
                        Button {
                            verifyAndSyncCloudCron()
                        } label: {
                            HStack {
                                if lineService.isSyncingCloud {
                                    ProgressView()
                                        .padding(.trailing, 4)
                                    Text("正在驗證雲端資料表並同步課表...")
                                } else {
                                    Image(systemName: "3.circle.fill")
                                    Text("步驟 3：我已執行 SQL，點此檢測並同步課表")
                                }
                                Spacer()
                                Image(systemName: "arrow.triangle.2.circlepath")
                                    .font(.caption)
                            }
                            .font(.caption.weight(.bold))
                            .foregroundColor(.green)
                            .padding(.vertical, 4)
                        }
                        .buttonStyle(.plain)
                    }
                    .padding(.vertical, 4)
                } else {
                    Button {
                        verifyAndSyncCloudCron()
                    } label: {
                        HStack {
                            if lineService.isSyncingCloud {
                                ProgressView()
                                    .padding(.trailing, 4)
                                Text("正在同步最新課表與排程至雲端...")
                            } else {
                                Image(systemName: "icloud.and.arrow.up.fill")
                                    .foregroundColor(.indigo)
                                Text("立即同步最新課表、待辦與推播時間至雲端")
                            }
                        }
                        .font(.caption.weight(.semibold))
                        .foregroundColor(.indigo)
                    }
                }
                
                Button {
                    copySupabaseCronSql()
                } label: {
                    HStack {
                        Image(systemName: showingSqlCopiedToast ? "checkmark" : "doc.on.doc.fill")
                        Text(showingSqlCopiedToast ? "已複製 Supabase 多使用者排程 SQL 腳本！" : "複製 Supabase 多使用者雲端排程 SQL 腳本")
                    }
                    .font(.caption.weight(.semibold))
                    .foregroundColor(showingSqlCopiedToast ? .green : .indigo)
                }
            } header: {
                Text("雲端 24/7 離線自動推播與 SQL 腳本")
            }
            
            // 2. 本機帳號基礎設定
            Section {
                HStack {
                    Text("本機顯示名稱")
                        .font(.subheadline)
                    Spacer()
                    TextField("例如：我的課表", text: $lineService.userName)
                        .multilineTextAlignment(.trailing)
                        .font(.subheadline.weight(.medium))
                        .foregroundColor(.primary)
                }
                
                Toggle("本機每日晨間自動推播", isOn: $lineService.isMorningBriefingEnabled)
                    .tint(.green)
                
                if lineService.isMorningBriefingEnabled {
                    DatePicker("本機預設發送時間", selection: pushTimeBinding, displayedComponents: .hourAndMinute)
                }
                
                Button {
                    Task {
                        await lineService.enableUserIdFreeModeForCurrentDevice()
                        await MainActor.run {
                            alertTitle = "✨ 已啟用免填 User ID 模式！"
                            alertMessage = "本機課表（代碼：\(dataManager.myShareCode)）已自動綁定為「免填 ID・標籤廣播推播」！"
                            showingAlert = true
                        }
                    }
                } label: {
                    HStack(spacing: 8) {
                        Image(systemName: "sparkles")
                            .foregroundColor(.teal)
                        Text("我是新手機：免填 User ID 一鍵綁定本機課表 (\(dataManager.myShareCode))")
                            .font(.caption.weight(.bold))
                            .foregroundColor(.teal)
                    }
                }
            } header: {
                Text("本機帳號預設排程")
            }
            
            // 3. LINE 憑證設定
            Section {
                VStack(alignment: .leading, spacing: 4) {
                    HStack {
                        Text("Channel ID")
                            .font(.caption.weight(.bold))
                            .foregroundColor(.secondary)
                        Spacer()
                        Button("貼上") {
                            if let string = UIPasteboard.general.string {
                                lineService.channelId = string
                            }
                        }
                        .font(.caption2)
                        .foregroundColor(.indigo)
                    }
                    TextField("例如：2011715565", text: $lineService.channelId)
                        .autocorrectionDisabled()
                        .textInputAutocapitalization(.never)
                        .font(.system(size: 13, design: .monospaced))
                }
                .padding(.vertical, 2)
                
                VStack(alignment: .leading, spacing: 4) {
                    HStack {
                        Text("Channel Secret")
                            .font(.caption.weight(.bold))
                            .foregroundColor(.secondary)
                        Spacer()
                        Button("貼上") {
                            if let string = UIPasteboard.general.string {
                                lineService.channelSecret = string
                            }
                        }
                        .font(.caption2)
                        .foregroundColor(.indigo)
                    }
                    SecureField("例如：59a3e749a8...", text: $lineService.channelSecret)
                        .autocorrectionDisabled()
                        .textInputAutocapitalization(.never)
                        .font(.system(size: 13, design: .monospaced))
                }
                .padding(.vertical, 2)
                
                Button {
                    autoFetchToken()
                } label: {
                    HStack {
                        if lineService.isGeneratingToken {
                            ProgressView()
                                .padding(.trailing, 4)
                            Text("正在向 LINE OAuth 申請 Token...")
                        } else {
                            Image(systemName: "bolt.fill")
                                .foregroundColor(.yellow)
                            Text(lineService.channelAccessToken.isEmpty ? "⚡️ 依 ID & Secret 自動取得 Access Token" : "⚡️ 重新取得 Access Token")
                        }
                    }
                    .font(.caption.weight(.bold))
                    .foregroundColor(.indigo)
                }
                .disabled(lineService.isGeneratingToken || lineService.channelId.isEmpty || lineService.channelSecret.isEmpty)
                
                Divider().padding(.vertical, 2)
                
                VStack(alignment: .leading, spacing: 6) {
                    HStack {
                        Text("Channel Access Token")
                            .font(.caption.weight(.bold))
                            .foregroundColor(.secondary)
                        Spacer()
                        Button(showingTokenPlain ? "隱藏" : "顯示") {
                            showingTokenPlain.toggle()
                        }
                        .font(.caption2)
                        .foregroundColor(.indigo)
                        
                        Button("貼上") {
                            if let string = UIPasteboard.general.string {
                                lineService.channelAccessToken = string
                            }
                        }
                        .font(.caption2)
                        .foregroundColor(.indigo)
                    }
                    
                    if showingTokenPlain {
                        TextField("貼上 LINE Developers 發行的長期權杖", text: $lineService.channelAccessToken)
                            .autocorrectionDisabled()
                            .textInputAutocapitalization(.never)
                            .font(.system(size: 13, design: .monospaced))
                    } else {
                        SecureField("貼上 LINE Developers 發行的長期權杖", text: $lineService.channelAccessToken)
                            .autocorrectionDisabled()
                            .textInputAutocapitalization(.never)
                            .font(.system(size: 13, design: .monospaced))
                    }
                }
                .padding(.vertical, 2)
                
                VStack(alignment: .leading, spacing: 6) {
                    HStack {
                        Text("本機 LINE User ID (選填，以 U 開頭 33 碼)")
                            .font(.caption.weight(.bold))
                            .foregroundColor(.secondary)
                        Spacer()
                        Button("貼上") {
                            if let string = UIPasteboard.general.string {
                                lineService.userId = string
                            }
                        }
                        .font(.caption2)
                        .foregroundColor(.indigo)
                    }
                    
                    TextField("例如：U1234567890abcdef...", text: $lineService.userId)
                        .autocorrectionDisabled()
                        .textInputAutocapitalization(.never)
                        .font(.system(size: 13, design: .monospaced))
                }
                .padding(.vertical, 2)
            } header: {
                Text("LINE Bot 金鑰憑證")
            }
        }
    }
    
    // MARK: - 好友一鍵匯入與批次獨立推送
    private func importFriendToPush(_ friend: SavedFriendRecord) {
        Task {
            do {
                try await lineService.importSavedFriendToPushList(friend)
                await MainActor.run {
                    alertTitle = "✅ 已匯入「\(friend.displayName)」！"
                    alertMessage = "已將「\(friend.displayName)（代碼 \(friend.shareCode)）」加入獨立推播名單！您可以直接在清單中為對方獨立調整推播時間與推送模組。"
                    showingAlert = true
                }
            } catch {
                await MainActor.run {
                    alertTitle = "匯入失敗"
                    alertMessage = error.localizedDescription
                    showingAlert = true
                }
            }
        }
    }
    
    private func batchPushAllEnabledUsers() {
        isBatchPushing = true
        Task {
            let result = await lineService.pushAllEnabledUsersIndependently(forceAll: true)
            await MainActor.run {
                isBatchPushing = false
                alertTitle = "🚀 批次獨立推送完成！"
                alertMessage = "成功獨立推送：\(result.successCount) 位使用者\n失敗：\(result.failCount) 位\n每位使用者皆已收到根據其個人課表、待辦與設定模組生成的專屬卡片！"
                showingAlert = true
            }
        }
    }
    
    // MARK: - 驗證並同步雲端排程
    private func verifyAndSyncCloudCron() {
        Task {
            await lineService.syncSettingsToSupabase()
            await lineService.fetchRegisteredUsersFromSupabase()
            await MainActor.run {
                if lineService.isCloudCronReady {
                    alertTitle = "☁️ 雲端 24/7 自動推播已就緒！"
                    alertMessage = "已成功連線 Supabase `line_bot_settings` 並同步您的課表、待辦與多使用者排程！現在即使關閉 App，系統也會在設定的時間準時發送 LINE 通知。"
                } else {
                    alertTitle = "尚未偵測到雲端排程資料表"
                    alertMessage = "請先點擊「步驟 1：一鍵複製雲端排程 SQL」，並前往 Supabase SQL Editor 貼上並點擊 Run 執行後，再點此檢測。"
                }
                showingAlert = true
            }
        }
    }
    
    // MARK: - 單獨測試特定使用者推播
    private func testSpecificUserPush(_ profile: LineBotUserProfile) {
        testingUserId = profile.userId
        Task {
            defer { Task { @MainActor in testingUserId = nil } }
            do {
                try await lineService.sendBriefingToSpecificUser(profile)
                await MainActor.run {
                    alertTitle = "🎉 已發送給「\(profile.userName)」！"
                    alertMessage = "已根據「\(profile.userName)」專屬的課表與待辦事項，單獨發送 Flex 晨報卡片至該使用者的 LINE（\(profile.maskedUserId)）。"
                    showingAlert = true
                }
            } catch {
                await MainActor.run {
                    alertTitle = "發送失敗"
                    alertMessage = error.localizedDescription
                    showingAlert = true
                }
            }
        }
    }
    
    // MARK: - 依 Channel ID & Secret 自動向 LINE OAuth 申請 Token
    private func autoFetchToken() {
        Task {
            do {
                _ = try await lineService.fetchAccessTokenFromOAuth()
                await MainActor.run {
                    alertTitle = "⚡️ 成功取得 Access Token！"
                    alertMessage = "已成功透過 Channel ID 與 Secret 從 LINE 官方伺服器取得 Access Token 並自動同步！"
                    showingAlert = true
                }
            } catch {
                await MainActor.run {
                    alertTitle = "取得 Token 失敗"
                    alertMessage = error.localizedDescription
                    showingAlert = true
                }
            }
        }
    }
    
    // MARK: - 執行即時測試發送
    private func sendTestBriefing() {
        Task {
            do {
                try await dataManager.sendLineBriefingNow()
                await MainActor.run {
                    alertTitle = "🎉 發送成功！"
                    alertMessage = "今日晨間 Flex Message 卡片日報已成功推送至您的 LINE！請開啟 LINE App 查收。"
                    showingAlert = true
                }
            } catch {
                await MainActor.run {
                    alertTitle = "發送失敗"
                    alertMessage = error.localizedDescription
                    showingAlert = true
                }
            }
        }
    }
    
    // MARK: - 卡片內容模擬預覽 (支援切換預覽任一使用者及其獨立模組設定)
    private var briefingCardPreview: some View {
        let selectedProfile = lineService.registeredUsers.first(where: { $0.userId == previewTargetUserId })
        let isPreviewingSelf = selectedProfile == nil || selectedProfile?.userId == lineService.userId.trimmingCharacters(in: .whitespacesAndNewlines)
        let localBriefing = dataManager.fetchBriefingData(for: Date())
        
        let todayWeekday = WeekDay.from(date: Date()).rawValue
        let previewCourses: [Course] = isPreviewingSelf
            ? localBriefing.todayCourses
            : (selectedProfile?.coursesData ?? []).filter { $0.dayOfWeek == todayWeekday }.sorted { $0.startTime < $1.startTime }
        let previewTodos: [TodoItem] = isPreviewingSelf
            ? localBriefing.todayTodos
            : (selectedProfile?.todosData ?? []).filter { !$0.isCompleted }
        let previewRemainingCount: Int = isPreviewingSelf
            ? localBriefing.weeklyRemainingCoursesCount
            : (selectedProfile?.coursesData ?? []).filter { $0.dayOfWeek >= todayWeekday }.count
        
        let showSched = selectedProfile?.includeSchedule ?? true
        let showTodo = selectedProfile?.includeTodos ?? true
        let showWeek = selectedProfile?.includeWeeklyPlan ?? true
        let showExpense = selectedProfile?.includeExpenseSummary ?? false
        
        let df = DateFormatter()
        df.locale = Locale(identifier: "zh_Hant_TW")
        df.dateFormat = "M月d日"
        let dateString = df.string(from: Date())
        let weekdayNames = ["", "星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"]
        let weekdayIndex = Calendar.current.component(.weekday, from: Date())
        let weekdayString = (weekdayIndex >= 1 && weekdayIndex <= 7) ? weekdayNames[weekdayIndex] : ""
        let headerTitle = "\(dateString) \(weekdayString)"
        let cleanUser = (selectedProfile?.userName ?? lineService.userName).trimmingCharacters(in: .whitespacesAndNewlines)
        let eyebrow = cleanUser.isEmpty ? "CAMPUS BRIEFING" : "CAMPUS BRIEFING · \(cleanUser)"
        let previewHour = selectedProfile?.pushHour ?? lineService.pushHour
        let previewMin = selectedProfile?.pushMinute ?? lineService.pushMinute
        
        return VStack(spacing: 0) {
            VStack(alignment: .leading, spacing: 14) {
                // Eyebrow & Title
                VStack(alignment: .leading, spacing: 2) {
                    Text(eyebrow)
                        .font(.system(size: 10, weight: .bold))
                        .foregroundColor(.secondary)
                    
                    HStack(alignment: .bottom) {
                        Text(headerTitle)
                            .font(.title3.weight(.bold))
                            .foregroundColor(.primary)
                        Spacer()
                        Text("\(previewCourses.count) 堂課 · \(previewTodos.count) 項待辦")
                            .font(.caption2)
                            .foregroundColor(.secondary)
                    }
                }
                
                if showSched {
                    Divider()
                    
                    Text("今日課表")
                        .font(.caption.weight(.bold))
                        .foregroundColor(.secondary)
                    
                    if previewCourses.isEmpty {
                        Text("今日無排定課程")
                            .font(.caption)
                            .foregroundColor(.secondary)
                            .padding(.vertical, 2)
                    } else {
                        ForEach(previewCourses.prefix(3)) { c in
                            HStack(spacing: 10) {
                                RoundedRectangle(cornerRadius: 1.5)
                                    .fill(Color(hex: c.colorHex))
                                    .frame(width: 3, height: 26)
                                VStack(alignment: .leading, spacing: 2) {
                                    HStack {
                                        Text(c.name)
                                            .font(.subheadline.weight(.semibold))
                                            .foregroundColor(.primary)
                                        Spacer()
                                        Text("\(c.startTime) - \(c.endTime)")
                                            .font(.caption2)
                                            .foregroundColor(.secondary)
                                    }
                                    let room = c.classroom.isEmpty ? "未指定地點" : c.classroom
                                    let prof = c.instructor.isEmpty ? "" : " · \(c.instructor)"
                                    Text("\(room)\(prof)")
                                        .font(.caption2)
                                        .foregroundColor(.secondary)
                                }
                            }
                            .padding(.vertical, 2)
                        }
                    }
                }
                
                if showTodo {
                    Divider()
                    
                    Text("今日待辦")
                        .font(.caption.weight(.bold))
                        .foregroundColor(.secondary)
                    
                    if previewTodos.isEmpty {
                        Text("全部待辦事項皆已完成")
                            .font(.caption)
                            .foregroundColor(.secondary)
                            .padding(.vertical, 2)
                    } else {
                        ForEach(previewTodos.prefix(3)) { t in
                            let priorityColor: Color = (t.priority == .high) ? .red : ((t.priority == .medium) ? .orange : .green)
                            HStack(spacing: 8) {
                                Circle()
                                    .fill(priorityColor)
                                    .frame(width: 8, height: 8)
                                Text(t.title)
                                    .font(.subheadline)
                                    .foregroundColor(.primary)
                                    .lineLimit(1)
                                Spacer()
                                Text(t.displayCategoryName)
                                    .font(.system(size: 9))
                                    .foregroundColor(.secondary)
                                    .padding(.horizontal, 6)
                                    .padding(.vertical, 2)
                                    .background(Color(.systemGray6))
                                    .cornerRadius(4)
                            }
                            .padding(.vertical, 2)
                        }
                    }
                }
                
                if showWeek {
                    Divider()
                    
                    Text("本週規劃")
                        .font(.caption.weight(.bold))
                        .foregroundColor(.secondary)
                    
                    VStack(alignment: .leading, spacing: 4) {
                        Text("• 本週後續剩餘堂數：\(previewRemainingCount) 堂")
                            .font(.caption)
                            .foregroundColor(Color(.darkGray))
                        let exams = previewTodos.filter { $0.displayCategoryName == "考試" || $0.displayCategoryName == "期中複習" || $0.category == .exam }
                        if !exams.isEmpty {
                            Text("• 重大待辦：\(exams.map { $0.title }.joined(separator: "、"))")
                                .font(.caption.weight(.semibold))
                                .foregroundColor(Color(.darkGray))
                        } else {
                            Text("• 本週無重大考試或報告")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                    }
                    .padding(10)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(Color(.systemGray6))
                    .cornerRadius(10)
                }
                
                if showExpense {
                    let cal = Calendar.current
                    let now = Date()
                    let myTodayTotal = dataManager.transactions
                        .filter { $0.type == .expense && cal.isDate($0.date, inSameDayAs: now) }
                        .reduce(0.0) { $0 + $1.amount }
                    let myMonthTotal = dataManager.transactions
                        .filter { $0.type == .expense && cal.isDate($0.date, equalTo: now, toGranularity: .month) }
                        .reduce(0.0) { $0 + $1.amount }
                    Divider()
                    Text("記帳開銷摘要")
                        .font(.caption.weight(.bold))
                        .foregroundColor(.secondary)
                    HStack {
                        Image(systemName: "dollarsign.circle.fill")
                            .foregroundColor(.orange)
                        Text(isPreviewingSelf
                             ? "今日支出 NT$ \(Int(myTodayTotal)) · 本月累計 NT$ \(Int(myMonthTotal))"
                             : "自動附上「\(cleanUser)」最新共享記帳摘要")
                            .font(.caption.weight(.bold))
                            .foregroundColor(.orange)
                    }
                    .padding(10)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(Color.orange.opacity(0.1))
                    .cornerRadius(8)
                }
                
                // Footer Button
                VStack(spacing: 6) {
                    Text("確認今日日程")
                        .font(.subheadline.weight(.semibold))
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 9)
                        .background(Color(hex: "#007AFF"))
                        .cornerRadius(8)
                    
                    Text("Campus · 專屬推播 \(String(format: "%02d:%02d", previewHour, previewMin))")
                        .font(.system(size: 10))
                        .foregroundColor(Color(.tertiaryLabel))
                }
                .padding(.top, 4)
            }
            .padding(18)
            .background(Color.white)
        }
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(Color.gray.opacity(0.18), lineWidth: 1)
        )
        .shadow(color: .black.opacity(0.04), radius: 10, x: 0, y: 4)
    }
    
    // MARK: - 複製 Supabase 雲端 API 保險箱、代發 RPC 與多使用者定時發送腳本
    private func copySupabaseCronSql() {
        let vault = SupabaseApiVault.shared
        let token = lineService.channelAccessToken.isEmpty ? vault.value(for: "line_channel_access_token") : lineService.channelAccessToken
        let uid = lineService.userId.isEmpty ? (vault.value(for: "line_default_user_id").isEmpty ? "AUTO_\(DataManager.shared.myShareCode)" : vault.value(for: "line_default_user_id")) : lineService.userId
        let uname = lineService.userName.isEmpty ? "我的課表" : lineService.userName
        let cid = lineService.channelId.isEmpty ? vault.value(for: "line_channel_id") : lineService.channelId
        let csec = lineService.channelSecret.isEmpty ? vault.value(for: "line_channel_secret") : lineService.channelSecret
        let geminiKey = GeminiScheduleOCRService.shared.apiKey.isEmpty ? vault.value(for: "gemini_api_key") : GeminiScheduleOCRService.shared.apiKey
        
        let sql = """
        -- =======================================================
        -- Campus v1: Supabase 雲端 API 金鑰保險箱 + 雲端代發 RPC + 24/7 多使用者推播腳本
        -- App 只負責傳送 Payload，所有第三方 API 金鑰與發送邏輯皆儲存在 Supabase 雲端
        -- =======================================================

        CREATE EXTENSION IF NOT EXISTS pg_cron;
        CREATE EXTENSION IF NOT EXISTS pg_net;

        -- 1. 建立雲端 API 金鑰保險箱表 (app_api_configs)
        CREATE TABLE IF NOT EXISTS public.app_api_configs (
            config_key TEXT PRIMARY KEY,
            config_value TEXT NOT NULL DEFAULT '',
            description TEXT DEFAULT '',
            updated_at TIMESTAMPTZ DEFAULT now()
        );
        ALTER TABLE public.app_api_configs ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Allow public all access on app_api_configs" ON public.app_api_configs;
        CREATE POLICY "Allow public all access on app_api_configs"
        ON public.app_api_configs FOR ALL TO public USING (true) WITH CHECK (true);

        INSERT INTO public.app_api_configs (config_key, config_value, description)
        VALUES
            ('line_channel_id', '\(cid)', 'LINE Messaging API Channel ID'),
            ('line_channel_secret', '\(csec)', 'LINE Messaging API Channel Secret'),
            ('line_channel_access_token', '\(token)', 'LINE Messaging API Access Token'),
            ('line_default_user_id', '\(uid)', 'LINE Default Recipient User ID'),
            ('gemini_api_key', '\(geminiKey)', 'Google Gemini Multimodal OCR API Key')
        ON CONFLICT (config_key) DO UPDATE SET
            config_value = CASE WHEN EXCLUDED.config_value <> '' THEN EXCLUDED.config_value ELSE public.app_api_configs.config_value END,
            updated_at = now();

        -- 2. 建立雲端代發 LINE 訊息 RPC 函數 (App 只傳送 Payload，由 Supabase 讀取金鑰並呼叫 LINE API)
        CREATE OR REPLACE FUNCTION public.relay_line_message(
            p_recipient_id TEXT,
            p_is_direct_push BOOLEAN,
            p_messages JSONB
        )
        RETURNS JSONB
        LANGUAGE plpgsql
        SECURITY DEFINER
        AS $$
        DECLARE
            v_token TEXT;
            v_target_url TEXT;
            v_payload JSONB;
        BEGIN
            SELECT config_value INTO v_token FROM public.app_api_configs WHERE config_key = 'line_channel_access_token' LIMIT 1;
            IF v_token IS NULL OR v_token = '' THEN
                SELECT channel_access_token INTO v_token FROM public.line_bot_settings WHERE user_id = p_recipient_id AND channel_access_token <> '' LIMIT 1;
            END IF;
            IF v_token IS NULL OR v_token = '' THEN
                SELECT channel_access_token INTO v_token FROM public.line_bot_settings WHERE user_id NOT LIKE 'SHARE_%' AND user_id <> 'CLOUD_API_VAULT' AND channel_access_token <> '' LIMIT 1;
            END IF;

            IF v_token IS NULL OR v_token = '' THEN
                RETURN jsonb_build_object('ok', false, 'error', 'Missing LINE token in Supabase');
            END IF;

            IF p_is_direct_push THEN
                v_target_url := 'https://api.line.me/v2/bot/message/push';
                v_payload := jsonb_build_object('to', p_recipient_id, 'messages', p_messages);
            ELSE
                v_target_url := 'https://api.line.me/v2/bot/message/broadcast';
                v_payload := jsonb_build_object('messages', p_messages);
            END IF;

            PERFORM net.http_post(
                url := v_target_url,
                headers := jsonb_build_object(
                    'Content-Type', 'application/json',
                    'Authorization', 'Bearer ' || v_token
                ),
                body := v_payload
            );

            RETURN jsonb_build_object('ok', true, 'relayed_by', 'supabase_pg_net');
        END;
        $$;

        ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS device_id TEXT;
        ALTER TABLE public.todos ADD COLUMN IF NOT EXISTS device_id TEXT;
        ALTER TABLE public.todos ADD COLUMN IF NOT EXISTS start_date TIMESTAMPTZ;
        ALTER TABLE public.todos ADD COLUMN IF NOT EXISTS custom_category_name TEXT;
        ALTER TABLE public.todos ADD COLUMN IF NOT EXISTS custom_category_color_hex TEXT;
        ALTER TABLE public.todos ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
        ALTER TABLE public.todos ADD COLUMN IF NOT EXISTS remind_1_day_before BOOLEAN DEFAULT true;
        ALTER TABLE public.todos ADD COLUMN IF NOT EXISTS remind_3_days_before BOOLEAN DEFAULT true;

        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_schema = 'public' AND table_name = 'line_bot_settings' AND column_name = 'id'
            ) THEN
                DROP TABLE public.line_bot_settings;
            END IF;
        END $$;

        CREATE TABLE IF NOT EXISTS public.line_bot_settings (
            user_id TEXT PRIMARY KEY,
            device_id TEXT DEFAULT '',
            user_name TEXT DEFAULT '我的課表',
            share_code TEXT DEFAULT '',
            channel_access_token TEXT NOT NULL,
            is_enabled BOOLEAN DEFAULT true,
            push_hour INT DEFAULT 7,
            push_minute INT DEFAULT 0,
            courses_data JSONB DEFAULT '[]'::jsonb,
            todos_data JSONB DEFAULT '[]'::jsonb,
            last_sent_date TEXT DEFAULT '',
            updated_at TIMESTAMPTZ DEFAULT now()
        );

        ALTER TABLE public.line_bot_settings ADD COLUMN IF NOT EXISTS device_id TEXT DEFAULT '';
        ALTER TABLE public.line_bot_settings ADD COLUMN IF NOT EXISTS user_name TEXT DEFAULT '我的課表';
        ALTER TABLE public.line_bot_settings ADD COLUMN IF NOT EXISTS share_code TEXT DEFAULT '';
        ALTER TABLE public.line_bot_settings ADD COLUMN IF NOT EXISTS is_enabled BOOLEAN DEFAULT true;
        ALTER TABLE public.line_bot_settings ADD COLUMN IF NOT EXISTS push_hour INT DEFAULT 7;
        ALTER TABLE public.line_bot_settings ADD COLUMN IF NOT EXISTS push_minute INT DEFAULT 0;
        ALTER TABLE public.line_bot_settings ADD COLUMN IF NOT EXISTS courses_data JSONB DEFAULT '[]'::jsonb;
        ALTER TABLE public.line_bot_settings ADD COLUMN IF NOT EXISTS todos_data JSONB DEFAULT '[]'::jsonb;
        ALTER TABLE public.line_bot_settings ADD COLUMN IF NOT EXISTS last_sent_date TEXT DEFAULT '';

        ALTER TABLE public.line_bot_settings ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Allow public all access on line_bot_settings" ON public.line_bot_settings;
        CREATE POLICY "Allow public all access on line_bot_settings"
        ON public.line_bot_settings
        FOR ALL
        TO public
        USING (true)
        WITH CHECK (true);

        CREATE TABLE IF NOT EXISTS public.shared_schedules (
            share_code TEXT PRIMARY KEY,
            user_name TEXT DEFAULT '我的課表',
            courses_data JSONB DEFAULT '[]'::jsonb,
            todos_data JSONB DEFAULT '[]'::jsonb,
            updated_at TIMESTAMPTZ DEFAULT now()
        );
        ALTER TABLE public.shared_schedules ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Allow public all access on shared_schedules" ON public.shared_schedules;
        CREATE POLICY "Allow public all access on shared_schedules"
        ON public.shared_schedules
        FOR ALL
        TO public
        USING (true)
        WITH CHECK (true);

        INSERT INTO public.line_bot_settings (
            user_id, device_id, user_name, share_code, channel_access_token, is_enabled, push_hour, push_minute
        )
        VALUES (
            '\(uid)',
            '\(dataManager.deviceId)',
            '\(uname)',
            '\(dataManager.myShareCode)',
            '\(token)',
            \(lineService.isMorningBriefingEnabled ? "true" : "false"),
            \(lineService.pushHour),
            \(lineService.pushMinute)
        )
        ON CONFLICT (user_id) DO UPDATE SET
            channel_access_token = EXCLUDED.channel_access_token,
            user_name = EXCLUDED.user_name,
            push_hour = EXCLUDED.push_hour,
            push_minute = EXCLUDED.push_minute,
            is_enabled = EXCLUDED.is_enabled,
            updated_at = now();

        CREATE OR REPLACE FUNCTION public.send_line_daily_briefing()
        RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
        DECLARE
            cfg RECORD;
            shared_rec RECORD;
            now_tw TIMESTAMP;
            today_date DATE;
            today_date_str TEXT;
            current_hour INT;
            current_minute INT;
            today_weekday INT;
            v_courses JSONB;
            v_todos JSONB;
            courses_count INT;
            todos_count INT;
            remaining_courses_count INT;
            date_str TEXT;
            weekday_str TEXT;
            header_title TEXT;
            eyebrow_text TEXT;
            footer_time_str TEXT;
            summary_text TEXT;
            course_bubbles JSONB;
            todo_bubbles JSONB;
            week_info_bubbles JSONB;
            body_contents JSONB;
            flex_messages JSONB;
            flex_payload JSONB;
            target_url TEXT;
        BEGIN
            now_tw := now() AT TIME ZONE 'Asia/Taipei';
            today_date := now_tw::date;
            today_date_str := to_char(now_tw, 'YYYY-MM-DD');
            current_hour := EXTRACT(HOUR FROM now_tw)::INT;
            current_minute := EXTRACT(MINUTE FROM now_tw)::INT;

            today_weekday := CASE EXTRACT(DOW FROM now_tw)
                WHEN 0 THEN 7
                ELSE EXTRACT(DOW FROM now_tw)::INT
            END;

            date_str := to_char(now_tw, 'FMMM"月"FMDD"日"');
            weekday_str := CASE today_weekday
                WHEN 1 THEN '星期一'
                WHEN 2 THEN '星期二'
                WHEN 3 THEN '星期三'
                WHEN 4 THEN '星期四'
                WHEN 5 THEN '星期五'
                WHEN 6 THEN '星期六'
                WHEN 7 THEN '星期日'
            END;

            header_title := date_str || ' ' || weekday_str;

            FOR cfg IN
                SELECT * FROM public.line_bot_settings
                WHERE is_enabled = true
                  AND channel_access_token IS NOT NULL AND channel_access_token <> ''
                  AND user_id IS NOT NULL AND user_id <> ''
                  AND user_id NOT LIKE 'SHARE_%'
                  AND (last_sent_date IS NULL OR last_sent_date <> today_date_str)
                  AND (current_hour > push_hour OR (current_hour = push_hour AND current_minute >= push_minute))
            LOOP
                v_courses := COALESCE(cfg.courses_data, '[]'::jsonb);
                v_todos := COALESCE(cfg.todos_data, '[]'::jsonb);

                IF cfg.share_code IS NOT NULL AND cfg.share_code <> '' THEN
                    BEGIN
                        SELECT courses_data, todos_data INTO shared_rec
                        FROM public.shared_schedules
                        WHERE share_code = cfg.share_code
                        LIMIT 1;

                        IF FOUND THEN
                            IF jsonb_typeof(v_courses) <> 'array' OR jsonb_array_length(v_courses) = 0 THEN
                                v_courses := COALESCE(shared_rec.courses_data, '[]'::jsonb);
                            END IF;
                            IF jsonb_typeof(v_todos) <> 'array' OR jsonb_array_length(v_todos) = 0 THEN
                                v_todos := COALESCE(shared_rec.todos_data, '[]'::jsonb);
                            END IF;
                        END IF;
                    EXCEPTION WHEN OTHERS THEN NULL;
                    END;

                    IF jsonb_typeof(v_courses) <> 'array' OR jsonb_array_length(v_courses) = 0 THEN
                        SELECT courses_data, todos_data INTO shared_rec
                        FROM public.line_bot_settings
                        WHERE user_id = 'SHARE_' || cfg.share_code
                        LIMIT 1;

                        IF FOUND THEN
                            v_courses := COALESCE(shared_rec.courses_data, '[]'::jsonb);
                            v_todos := COALESCE(shared_rec.todos_data, '[]'::jsonb);
                        END IF;
                    END IF;
                END IF;

                IF jsonb_typeof(v_courses) = 'array' AND jsonb_array_length(v_courses) > 0 THEN
                    SELECT COUNT(*) INTO courses_count
                    FROM jsonb_array_elements(v_courses) AS c
                    WHERE COALESCE((c->>'day_of_week')::INT, 0) = today_weekday;

                    SELECT COUNT(*) INTO remaining_courses_count
                    FROM jsonb_array_elements(v_courses) AS c
                    WHERE COALESCE((c->>'day_of_week')::INT, 0) >= today_weekday;

                    SELECT jsonb_agg(jsonb_build_object(
                        'type', 'box',
                        'layout', 'horizontal',
                        'margin', 'md',
                        'spacing', 'md',
                        'contents', jsonb_build_array(
                            jsonb_build_object(
                                'type', 'box',
                                'layout', 'vertical',
                                'width', '3px',
                                'backgroundColor', COALESCE(NULLIF(c->>'color_hex', ''), '#007AFF'),
                                'cornerRadius', '2px',
                                'contents', jsonb_build_array(jsonb_build_object('type', 'text', 'text', ' ', 'size', 'xxs'))
                            ),
                            jsonb_build_object(
                                'type', 'box',
                                'layout', 'vertical',
                                'flex', 1,
                                'contents', jsonb_build_array(
                                    jsonb_build_object(
                                        'type', 'box',
                                        'layout', 'horizontal',
                                        'contents', jsonb_build_array(
                                            jsonb_build_object('type', 'text', 'text', COALESCE(c->>'name', '課程'), 'weight', 'bold', 'size', 'sm', 'color', '#1C1C1E', 'wrap', true),
                                            jsonb_build_object('type', 'text', 'text', COALESCE(c->>'start_time', '') || ' - ' || COALESCE(c->>'end_time', ''), 'size', 'xs', 'color', '#8E8E93', 'align', 'end')
                                        )
                                    ),
                                    jsonb_build_object('type', 'text', 'text', COALESCE(NULLIF(c->>'classroom', ''), '未指定地點') || CASE WHEN c->>'instructor' IS NOT NULL AND c->>'instructor' <> '' THEN ' · ' || (c->>'instructor') ELSE '' END, 'size', 'xs', 'color', '#8E8E93', 'margin', 'xs')
                                )
                            )
                        )
                    )) INTO course_bubbles
                    FROM (
                        SELECT c FROM jsonb_array_elements(v_courses) AS c
                        WHERE COALESCE((c->>'day_of_week')::INT, 0) = today_weekday
                        ORDER BY c->>'start_time' ASC
                    ) sub_c;
                ELSE
                    courses_count := 0;
                    remaining_courses_count := 0;
                    course_bubbles := NULL;
                END IF;

                IF course_bubbles IS NULL THEN
                    course_bubbles := jsonb_build_array(
                        jsonb_build_object('type', 'text', 'text', '今日無排定課程', 'size', 'xs', 'color', '#8E8E93', 'margin', 'sm')
                    );
                END IF;

                IF jsonb_typeof(v_todos) = 'array' AND jsonb_array_length(v_todos) > 0 THEN
                    SELECT COUNT(*) INTO todos_count
                    FROM jsonb_array_elements(v_todos) AS t
                    WHERE COALESCE((t->>'is_completed')::BOOLEAN, false) = false
                      AND (
                          (NULLIF(t->>'start_date', '') IS NOT NULL AND NULLIF(t->>'due_date', '') IS NOT NULL
                           AND today_date >= ((t->>'start_date')::timestamptz AT TIME ZONE 'Asia/Taipei')::date
                           AND today_date <= ((t->>'due_date')::timestamptz AT TIME ZONE 'Asia/Taipei')::date)
                          OR
                          (NULLIF(t->>'start_date', '') IS NULL AND NULLIF(t->>'due_date', '') IS NOT NULL
                           AND ((t->>'due_date')::timestamptz AT TIME ZONE 'Asia/Taipei')::date = today_date)
                      );

                    SELECT jsonb_agg(jsonb_build_object(
                        'type', 'box',
                        'layout', 'horizontal',
                        'margin', 'md',
                        'spacing', 'md',
                        'contents', jsonb_build_array(
                            jsonb_build_object(
                                'type', 'box',
                                'layout', 'vertical',
                                'width', '8px',
                                'height', '8px',
                                'cornerRadius', '4px',
                                'backgroundColor', CASE COALESCE(t->>'priority', 'medium') WHEN 'high' THEN '#FF3B30' WHEN 'medium' THEN '#FF9500' ELSE '#34C759' END,
                                'contents', jsonb_build_array(jsonb_build_object('type', 'text', 'text', ' ', 'size', 'xxs'))
                            ),
                            jsonb_build_object('type', 'text', 'text', COALESCE(t->>'title', '待辦事項'), 'size', 'sm', 'color', '#1C1C1E', 'flex', 1, 'wrap', true),
                            jsonb_build_object(
                                'type', 'box',
                                'layout', 'vertical',
                                'backgroundColor', '#F2F2F7',
                                'cornerRadius', '4px',
                                'paddingStart', '6px',
                                'paddingEnd', '6px',
                                'paddingTop', '2px',
                                'paddingBottom', '2px',
                                'contents', jsonb_build_array(
                                    jsonb_build_object('type', 'text', 'text', COALESCE(NULLIF(t->>'custom_category_name', ''), COALESCE(t->>'category', '待辦')), 'size', 'xxs', 'color', '#8E8E93')
                                )
                            )
                        )
                    )) INTO todo_bubbles
                    FROM (
                        SELECT t FROM jsonb_array_elements(v_todos) AS t
                        WHERE COALESCE((t->>'is_completed')::BOOLEAN, false) = false
                          AND (
                              (NULLIF(t->>'start_date', '') IS NOT NULL AND NULLIF(t->>'due_date', '') IS NOT NULL
                               AND today_date >= ((t->>'start_date')::timestamptz AT TIME ZONE 'Asia/Taipei')::date
                               AND today_date <= ((t->>'due_date')::timestamptz AT TIME ZONE 'Asia/Taipei')::date)
                              OR
                              (NULLIF(t->>'start_date', '') IS NULL AND NULLIF(t->>'due_date', '') IS NOT NULL
                               AND ((t->>'due_date')::timestamptz AT TIME ZONE 'Asia/Taipei')::date = today_date)
                          )
                        ORDER BY CASE COALESCE(t->>'priority', 'medium') WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END
                        LIMIT 4
                    ) sub_t;
                ELSE
                    todos_count := 0;
                    todo_bubbles := NULL;
                END IF;

                IF todo_bubbles IS NULL THEN
                    todo_bubbles := jsonb_build_array(
                        jsonb_build_object('type', 'text', 'text', '全部待辦事項皆已完成', 'size', 'xs', 'color', '#8E8E93', 'margin', 'sm')
                    );
                END IF;

                summary_text := courses_count || ' 堂課 · ' || todos_count || ' 項待辦';
                eyebrow_text := 'CAMPUS BRIEFING' || CASE WHEN cfg.user_name IS NOT NULL AND cfg.user_name <> '' THEN ' · ' || cfg.user_name ELSE '' END;
                footer_time_str := 'Campus · 晨間簡報 ' || LPAD(cfg.push_hour::text, 2, '0') || ':' || LPAD(cfg.push_minute::text, 2, '0');

                week_info_bubbles := jsonb_build_array(
                    jsonb_build_object('type', 'text', 'text', '• 本週後續剩餘堂數：' || remaining_courses_count || ' 堂', 'size', 'xs', 'color', '#3C3C43')
                );

                body_contents := jsonb_build_array(
                    jsonb_build_object('type', 'text', 'text', eyebrow_text, 'size', 'xxs', 'weight', 'bold', 'color', '#8E8E93'),
                    jsonb_build_object(
                        'type', 'box',
                        'layout', 'horizontal',
                        'margin', 'xs',
                        'contents', jsonb_build_array(
                            jsonb_build_object('type', 'text', 'text', header_title, 'size', 'xl', 'weight', 'bold', 'color', '#1C1C1E', 'flex', 1),
                            jsonb_build_object('type', 'text', 'text', summary_text, 'size', 'xs', 'color', '#8E8E93', 'align', 'end', 'gravity', 'bottom')
                        )
                    ),
                    jsonb_build_object('type', 'separator', 'margin', 'md', 'color', '#E5E5EA'),
                    jsonb_build_object('type', 'text', 'text', '今日課表', 'size', 'xs', 'weight', 'bold', 'color', '#8E8E93', 'margin', 'lg')
                ) || course_bubbles || jsonb_build_array(
                    jsonb_build_object('type', 'separator', 'margin', 'lg', 'color', '#E5E5EA'),
                    jsonb_build_object('type', 'text', 'text', '今日待辦', 'size', 'xs', 'weight', 'bold', 'color', '#8E8E93', 'margin', 'lg')
                ) || todo_bubbles || jsonb_build_array(
                    jsonb_build_object('type', 'separator', 'margin', 'lg', 'color', '#E5E5EA'),
                    jsonb_build_object('type', 'text', 'text', '本週規劃', 'size', 'xs', 'weight', 'bold', 'color', '#8E8E93', 'margin', 'lg'),
                    jsonb_build_object(
                        'type', 'box',
                        'layout', 'vertical',
                        'backgroundColor', '#F2F2F7',
                        'cornerRadius', '10px',
                        'paddingAll', '12px',
                        'margin', 'md',
                        'spacing', 'xs',
                        'contents', week_info_bubbles
                    )
                );

                flex_messages := jsonb_build_array(
                    jsonb_build_object(
                        'type', 'flex',
                        'altText', 'Campus 晨間簡報 (' || COALESCE(cfg.user_name, '今日課表') || ')：' || header_title,
                        'contents', jsonb_build_object(
                            'type', 'bubble',
                            'size', 'mega',
                            'body', jsonb_build_object(
                                'type', 'box',
                                'layout', 'vertical',
                                'backgroundColor', '#FFFFFF',
                                'paddingAll', '20px',
                                'contents', body_contents
                            ),
                            'footer', jsonb_build_object(
                                'type', 'box',
                                'layout', 'vertical',
                                'paddingTop', '10px',
                                'paddingBottom', '16px',
                                'paddingStart', '20px',
                                'paddingEnd', '20px',
                                'backgroundColor', '#FFFFFF',
                                'contents', jsonb_build_array(
                                    jsonb_build_object(
                                        'type', 'button',
                                        'action', jsonb_build_object('type', 'message', 'label', '確認今日日程', 'text', '已確認今日日程'),
                                        'style', 'primary',
                                        'color', '#007AFF',
                                        'height', 'sm'
                                    ),
                                    jsonb_build_object('type', 'text', 'text', footer_time_str, 'size', 'xxs', 'color', '#C7C7CC', 'align', 'center', 'margin', 'md')
                                )
                            )
                        )
                    )
                );

                IF cfg.user_id LIKE 'U%' AND length(cfg.user_id) >= 25 THEN
                    target_url := 'https://api.line.me/v2/bot/message/push';
                    flex_payload := jsonb_build_object(
                        'to', cfg.user_id,
                        'messages', flex_messages
                    );
                ELSE
                    target_url := 'https://api.line.me/v2/bot/message/broadcast';
                    flex_payload := jsonb_build_object(
                        'messages', flex_messages
                    );
                END IF;

                PERFORM net.http_post(
                    url := target_url,
                    headers := jsonb_build_object(
                        'Content-Type', 'application/json',
                        'Authorization', 'Bearer ' || cfg.channel_access_token
                    ),
                    body := flex_payload
                );

                UPDATE public.line_bot_settings
                SET last_sent_date = today_date_str,
                    updated_at = now()
                WHERE user_id = cfg.user_id;
            END LOOP;
        END;
        $$;

        DO $$
        BEGIN
            PERFORM cron.unschedule('daily-line-briefing-7am');
        EXCEPTION WHEN OTHERS THEN NULL;
        END $$;

        DO $$
        BEGIN
            PERFORM cron.unschedule('daily-line-briefing-every-minute');
        EXCEPTION WHEN OTHERS THEN NULL;
        END $$;

        SELECT cron.schedule(
            'daily-line-briefing-every-minute',
            '* * * * *',
            $$ SELECT public.send_line_daily_briefing(); $$
        );

        NOTIFY pgrst, 'reload schema';
        """
        
        UIPasteboard.general.string = sql
        withAnimation {
            showingSqlCopiedToast = true
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 3) {
            withAnimation {
                showingSqlCopiedToast = false
            }
        }
    }
}

// MARK: - 新增或編輯獨立推播使用者表單
struct AddLineUserProfileSheet: View {
    @Environment(\.dismiss) var dismiss
    @EnvironmentObject var dataManager: DataManager
    @ObservedObject var lineService = LineBotService.shared
    
    var existingProfile: LineBotUserProfile? = nil
    
    @State private var userName: String = ""
    @State private var targetUserId: String = ""
    @State private var shareCode: String = ""
    @State private var pushTime: Date = Calendar.current.date(from: DateComponents(hour: 7, minute: 0)) ?? Date()
    @State private var isEnabled: Bool = true
    @State private var includeSchedule: Bool = true
    @State private var includeTodos: Bool = true
    @State private var includeWeeklyPlan: Bool = true
    @State private var includeExpenseSummary: Bool = false
    @State private var isSaving: Bool = false
    @State private var errorMsg: String? = nil
    @State private var copiedFriendLink: Bool = false
    
    init(existingProfile: LineBotUserProfile? = nil) {
        self.existingProfile = existingProfile
        _userName = State(initialValue: existingProfile?.userName ?? "")
        let rawUid = existingProfile?.userId ?? ""
        _targetUserId = State(initialValue: (rawUid.hasPrefix("AUTO_") || rawUid.hasPrefix("BROADCAST")) ? "" : rawUid)
        _shareCode = State(initialValue: existingProfile?.shareCode ?? "")
        _isEnabled = State(initialValue: existingProfile?.isEnabled ?? true)
        _includeSchedule = State(initialValue: existingProfile?.includeSchedule ?? true)
        _includeTodos = State(initialValue: existingProfile?.includeTodos ?? true)
        _includeWeeklyPlan = State(initialValue: existingProfile?.includeWeeklyPlan ?? true)
        _includeExpenseSummary = State(initialValue: existingProfile?.includeExpenseSummary ?? false)
        
        var comp = DateComponents()
        comp.hour = existingProfile?.pushHour ?? 7
        comp.minute = existingProfile?.pushMinute ?? 0
        _pushTime = State(initialValue: Calendar.current.date(from: comp) ?? Date())
    }
    
    var body: some View {
        NavigationStack {
            Form {
                if !dataManager.savedFriends.isEmpty && existingProfile == nil {
                    Section("📒 從好友記錄簿一鍵帶入") {
                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 8) {
                                ForEach(dataManager.savedFriends) { friend in
                                    Button {
                                        userName = friend.displayName
                                        shareCode = friend.shareCode
                                    } label: {
                                        HStack(spacing: 5) {
                                            Image(systemName: "person.crop.circle.fill")
                                                .foregroundColor(.teal)
                                            Text("\(friend.displayName) (\(friend.shareCode))")
                                                .font(.caption.weight(.bold))
                                                .foregroundColor(.primary)
                                        }
                                        .padding(.horizontal, 10)
                                        .padding(.vertical, 6)
                                        .background(Color.teal.opacity(0.12))
                                        .clipShape(Capsule())
                                    }
                                    .buttonStyle(.plain)
                                }
                            }
                        }
                    }
                }
                
                Section {
                    TextField("使用者顯示名稱（例如：室友小明、女友）", text: $userName)
                    
                    TextField("對方的 6 位課表分享代碼（如 AB12CD）", text: $shareCode)
                        .autocorrectionDisabled()
                        .textInputAutocapitalization(.characters)
                        .font(.system(.body, design: .monospaced))
                } header: {
                    Text("步驟 1：輸入對方名稱與 6 碼分享代碼（免填 User ID！）")
                } footer: {
                    Text("✨ 完全不需要查詢 LINE User ID！只要填入對方的名稱與 Campus 6 碼分享代碼，系統就會自動讀取對方的專屬課表、待辦與記帳摘要進行推播！")
                }
                
                Section("步驟 2：此使用者的獨立推送內容模組") {
                    Toggle("📅 推送今日課表", isOn: $includeSchedule)
                        .tint(.indigo)
                    Toggle("☑️ 推送今日待辦事項", isOn: $includeTodos)
                        .tint(.orange)
                    Toggle("📊 推送本週規劃與考試提醒", isOn: $includeWeeklyPlan)
                        .tint(.blue)
                    Toggle("💰 推送今日記帳開銷摘要", isOn: $includeExpenseSummary)
                        .tint(.teal)
                }
                
                Section("步驟 3：專屬推播時間設定") {
                    Toggle("啟用每日自動推播", isOn: $isEnabled)
                        .tint(.green)
                    DatePicker("每日推播時間", selection: $pushTime, displayedComponents: .hourAndMinute)
                }
                
                if let friendURL = lineService.addFriendURL {
                    Section("步驟 4：讓對方將 LINE Bot 加為好友") {
                        Link(destination: friendURL) {
                            HStack {
                                Image(systemName: "person.crop.circle.badge.plus")
                                    .foregroundColor(.green)
                                Text("點此開啟「\(lineService.botDisplayName)」加好友頁面")
                                    .font(.subheadline.weight(.semibold))
                                Spacer()
                                Image(systemName: "arrow.up.right.square")
                                    .font(.caption)
                            }
                        }
                        
                        Button {
                            UIPasteboard.general.string = friendURL.absoluteString
                            copiedFriendLink = true
                        } label: {
                            HStack {
                                Image(systemName: copiedFriendLink ? "checkmark.circle.fill" : "doc.on.doc")
                                    .foregroundColor(copiedFriendLink ? .green : .indigo)
                                Text(copiedFriendLink ? "已複製加好友連結！可直接貼給對方" : "複製加好友連結傳給對方 (\(lineService.botBasicId))")
                                    .font(.caption.weight(.semibold))
                                    .foregroundColor(copiedFriendLink ? .green : .indigo)
                            }
                        }
                    }
                }
                
                if !lineService.discoveredFollowers.isEmpty {
                    Section("🤝 已加官方帳號的 LINE 好友（點選自動帶入對方真實 LINE ID）") {
                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 8) {
                                ForEach(lineService.discoveredFollowers) { follower in
                                    let isSelected = (targetUserId == follower.lineUserId)
                                    Button {
                                        targetUserId = follower.lineUserId
                                        if userName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && follower.displayName != "LINE 好友" {
                                            userName = follower.displayName
                                        }
                                        if shareCode.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && !follower.boundShareCode.isEmpty {
                                            shareCode = follower.boundShareCode
                                        }
                                    } label: {
                                        HStack(spacing: 6) {
                                            Image(systemName: isSelected ? "checkmark.circle.fill" : "person.crop.circle.badge.checkmark")
                                                .foregroundColor(isSelected ? .green : .indigo)
                                            VStack(alignment: .leading, spacing: 1) {
                                                Text(follower.displayName)
                                                    .font(.caption.weight(.bold))
                                                    .foregroundColor(.primary)
                                                Text("\(follower.lineUserId.prefix(8))...")
                                                    .font(.system(size: 9, design: .monospaced))
                                                    .foregroundColor(.secondary)
                                            }
                                        }
                                        .padding(.horizontal, 10)
                                        .padding(.vertical, 6)
                                        .background((isSelected ? Color.green : Color.indigo).opacity(0.12))
                                        .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
                                    }
                                    .buttonStyle(.plain)
                                }
                            }
                        }
                    }
                }
                
                Section {
                    VStack(alignment: .leading, spacing: 4) {
                        HStack {
                            Text("對方的 LINE User ID（選填，加好友後可自動帶入）")
                                .font(.caption)
                                .foregroundColor(.secondary)
                            Spacer()
                            Button("貼上") {
                                if let str = UIPasteboard.general.string {
                                    targetUserId = str
                                }
                            }
                            .font(.caption2)
                            .foregroundColor(.indigo)
                        }
                        TextField("選填：加好友後由系統自動識別，或點上方清單帶入", text: $targetUserId)
                            .autocorrectionDisabled()
                            .textInputAutocapitalization(.never)
                            .font(.system(size: 13, design: .monospaced))
                    }
                } header: {
                    Text("進階單人定位設定（加好友自動識別）")
                }
                
                if let errorMsg = errorMsg {
                    Section {
                        Text(errorMsg)
                            .font(.caption)
                            .foregroundColor(.red)
                    }
                }
            }
            .navigationTitle(existingProfile == nil ? "新增獨立推播對象" : "編輯獨立推播設定")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("取消") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button {
                        saveUser()
                    } label: {
                        if isSaving {
                            ProgressView()
                        } else {
                            Text("儲存")
                                .fontWeight(.semibold)
                        }
                    }
                    .disabled(
                        isSaving ||
                        (userName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty &&
                         shareCode.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                    )
                }
            }
        }
    }
    
    private func saveUser() {
        isSaving = true
        errorMsg = nil
        let comp = Calendar.current.dateComponents([.hour, .minute], from: pushTime)
        let h = comp.hour ?? 7
        let m = comp.minute ?? 0
        
        Task {
            do {
                if let existing = existingProfile,
                   existing.userId == lineService.userId.trimmingCharacters(in: .whitespacesAndNewlines) {
                    var updated = existing
                    updated.userName = userName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? existing.userName : userName
                    updated.pushHour = h
                    updated.pushMinute = m
                    updated.isEnabled = isEnabled
                    updated.includeSchedule = includeSchedule
                    updated.includeTodos = includeTodos
                    updated.includeWeeklyPlan = includeWeeklyPlan
                    updated.includeExpenseSummary = includeExpenseSummary
                    await lineService.updateUserPushPreferences(updated)
                } else {
                    try await lineService.upsertAdditionalUser(
                        userName: userName,
                        targetUserId: targetUserId,
                        shareCode: shareCode,
                        pushHour: h,
                        pushMinute: m,
                        isEnabled: isEnabled,
                        includeSchedule: includeSchedule,
                        includeTodos: includeTodos,
                        includeWeeklyPlan: includeWeeklyPlan,
                        includeExpenseSummary: includeExpenseSummary
                    )
                }
                await MainActor.run {
                    isSaving = false
                    dismiss()
                }
            } catch {
                await MainActor.run {
                    isSaving = false
                    errorMsg = error.localizedDescription
                }
            }
        }
    }
}
