//
//  ContentView.swift
//  Campus v1
//

import SwiftUI

struct ContentView: View {
    @EnvironmentObject var dataManager: DataManager
    @Environment(\.scenePhase) private var scenePhase
    @State private var selectedTab: Int = 0
    @State private var showingSettings = false
    @State private var showingQuickExpenseSheet = false
    @State private var quickExpenseInitialMeal: String = ""
    @State private var quickExpenseInitialAmount: String = ""
    @State private var quickExpenseInitialNote: String = ""
    @State private var showSuccessToast = false
    
    @Namespace private var tabAnimationNamespace
    
    private struct BottomTabItem: Identifiable {
        let id: Int
        let title: String
        let icon: String
    }
    
    private let tabItems: [BottomTabItem] = [
        BottomTabItem(id: 0, title: "今日", icon: "sun.max.fill"),
        BottomTabItem(id: 1, title: "課表", icon: "calendar.badge.clock"),
        BottomTabItem(id: 2, title: "月曆", icon: "calendar"),
        BottomTabItem(id: 3, title: "待辦", icon: "checklist"),
        BottomTabItem(id: 4, title: "記帳", icon: "creditcard.fill"),
        BottomTabItem(id: 5, title: "好友", icon: "person.2.fill")
    ]
    
    var body: some View {
        ZStack {
            CalicoSpatialBackground()
            
            VStack(spacing: 0) {
                ZStack {
                    switch selectedTab {
                    case 0:
                        TodayOverviewView(isStandaloneTab: true)
                    case 1:
                        ScheduleView()
                    case 2:
                        CalendarView()
                    case 3:
                        TasksView()
                    case 4:
                        AccountingView()
                    case 5:
                        FriendsHubView()
                    default:
                        TodayOverviewView(isStandaloneTab: true)
                    }
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                
                // 🐾 iOS 27 Liquid Glass 懸浮膠囊導覽列（今日・課表・月曆・待辦・記帳・好友）
                HStack(spacing: 2) {
                    ForEach(tabItems) { item in
                        let isSelected = (selectedTab == item.id)
                        Button {
                            if selectedTab != item.id {
                                UIImpactFeedbackGenerator(style: .light).impactOccurred()
                                withAnimation(.spring(response: 0.34, dampingFraction: 0.76)) {
                                    selectedTab = item.id
                                }
                            }
                        } label: {
                            VStack(spacing: 3) {
                                ZStack {
                                    if isSelected {
                                        Capsule()
                                            .fill(
                                                LinearGradient(
                                                    colors: [
                                                        CalicoTheme.warmOrange.opacity(0.22),
                                                        CalicoTheme.pawPink.opacity(0.14)
                                                    ],
                                                    startPoint: .topLeading,
                                                    endPoint: .bottomTrailing
                                                )
                                            )
                                            .overlay(
                                                Capsule()
                                                    .strokeBorder(
                                                        LinearGradient(
                                                            colors: [Color.white.opacity(0.8), CalicoTheme.warmOrange.opacity(0.35)],
                                                            startPoint: .topLeading,
                                                            endPoint: .bottomTrailing
                                                        ),
                                                        lineWidth: 0.9
                                                    )
                                            )
                                            .frame(width: 44, height: 26)
                                            .matchedGeometryEffect(id: "ActiveTabGlassPill", in: tabAnimationNamespace)
                                    }
                                    
                                    Image(systemName: item.icon)
                                        .font(.system(size: 16, weight: isSelected ? .bold : .medium))
                                        .symbolEffect(.bounce, value: isSelected)
                                        .frame(height: 22)
                                }
                                
                                Text(item.title)
                                    .font(.system(size: 10, weight: isSelected ? .bold : .medium, design: .rounded))
                            }
                            .foregroundColor(isSelected ? CalicoTheme.warmOrange : Color(.secondaryLabel))
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 6)
                            .contentShape(Rectangle())
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(.horizontal, 8)
                .padding(.vertical, 4)
                .background {
                    ZStack {
                        Capsule()
                            .fill(.ultraThinMaterial)
                        Capsule()
                            .fill(CalicoTheme.warmCardBackground.opacity(0.82))
                        Capsule()
                            .fill(
                                LinearGradient(
                                    colors: [Color.white.opacity(0.55), Color.clear],
                                    startPoint: .top,
                                    endPoint: .bottom
                                )
                            )
                    }
                }
                .overlay(
                    Capsule()
                        .strokeBorder(CalicoTheme.glassBorderGradient, lineWidth: 1.2)
                )
                .shadow(color: CalicoTheme.cocoaBrown.opacity(0.10), radius: 16, x: 0, y: 6)
                .padding(.horizontal, 14)
                .padding(.top, 4)
                .padding(.bottom, 4)
            }
        }
        .ignoresSafeArea(.keyboard, edges: .bottom)
        .tint(CalicoTheme.warmOrange)
        .overlay(alignment: .bottomTrailing) {
            // 右下角 iOS 27 Liquid Glass 三花貓可樂雲端膠囊按鈕
            Button {
                UIImpactFeedbackGenerator(style: .soft).impactOccurred()
                showingSettings = true
            } label: {
                HStack(spacing: 5) {
                    Image(systemName: "pawprint.fill")
                        .font(.system(size: 10, weight: .bold))
                        .foregroundColor(CalicoTheme.pawPink)
                    Image(systemName: dataManager.isUsingCloud ? "icloud.fill" : "icloud")
                        .font(.system(size: 10, weight: .bold))
                        .foregroundColor(dataManager.isUsingCloud ? CalicoTheme.warmOrange : .secondary)
                    Text(dataManager.isUsingCloud ? "可樂雲端" : "本地模式")
                        .font(.system(size: 11, weight: .bold, design: .rounded))
                }
                .padding(.horizontal, 11)
                .padding(.vertical, 6)
                .background {
                    ZStack {
                        Capsule().fill(.ultraThinMaterial)
                        Capsule().fill(CalicoTheme.warmCardBackground.opacity(0.85))
                    }
                }
                .foregroundColor(dataManager.isUsingCloud ? CalicoTheme.cocoaBrown : .secondary)
                .overlay(
                    Capsule()
                        .strokeBorder(CalicoTheme.glassBorderGradient, lineWidth: 1.1)
                )
                .clipShape(Capsule())
                .shadow(color: CalicoTheme.cocoaBrown.opacity(0.10), radius: 8, x: 0, y: 4)
            }
            .padding(.trailing, 18)
            .padding(.bottom, 68)
        }
        .sheet(isPresented: $showingSettings) {
            SupabaseSettingsSheet()
        }
        .sheet(isPresented: $showingQuickExpenseSheet) {
            AddTransactionSheet(
                initialCategoryName: quickExpenseInitialMeal,
                initialAmount: quickExpenseInitialAmount,
                initialNote: quickExpenseInitialNote
            )
        }
        .onOpenURL { url in
            guard url.scheme == "campus" else { return }
            let host = url.host ?? ""
            let path = url.path
            
            if host == "quick-expense" || path.contains("quick-expense") {
                let components = URLComponents(url: url, resolvingAgainstBaseURL: false)
                let mealParam = components?.queryItems?.first(where: { $0.name == "meal" })?.value ?? ""
                let amountParam = components?.queryItems?.first(where: { $0.name == "amount" })?.value ?? ""
                let noteParam = components?.queryItems?.first(where: { $0.name == "note" })?.value ?? ""
                quickExpenseInitialMeal = mealParam
                quickExpenseInitialAmount = amountParam
                quickExpenseInitialNote = noteParam
                selectedTab = 4
                showingQuickExpenseSheet = true
            } else if host == "today" || path.contains("today") {
                selectedTab = 0
            } else if host == "schedule" || host == "courses" || path.contains("schedule") {
                selectedTab = 1
            } else if host == "calendar" || path.contains("calendar") {
                selectedTab = 2
            } else if host == "tasks" || host == "todos" || path.contains("tasks") || path.contains("todos") {
                selectedTab = 3
            } else if host == "accounting" || path.contains("accounting") {
                selectedTab = 4
            } else if host == "friends" || path.contains("friends") {
                selectedTab = 5
            }
        }
        
        .overlay(alignment: .top) {
            if showSuccessToast {
                HStack(spacing: 10) {
                    CalicoCatAvatar(size: 28, mood: .happy)
                    Text("可樂幫你記好帳囉 🐾")
                        .font(.system(.subheadline, design: .rounded).bold())
                }
                .padding(.horizontal, 18)
                .padding(.vertical, 10)
                .background(.ultraThickMaterial)
                .clipShape(Capsule())
                .overlay(
                    Capsule()
                        .strokeBorder(CalicoTheme.glassBorderGradient, lineWidth: 1.2)
                )
                .shadow(color: CalicoTheme.cocoaBrown.opacity(0.15), radius: 12, y: 5)
                .padding(.top, 50)
                .transition(.move(edge: .top).combined(with: .opacity))
                .zIndex(999)
            }
        }
        .onReceive(NotificationCenter.default.publisher(for: NSNotification.Name("ShowExpenseSuccessToast"))) { _ in
            withAnimation(.spring()) {
                showSuccessToast = true
            }
            let generator = UINotificationFeedbackGenerator()
            generator.notificationOccurred(.success)
            DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
                withAnimation(.easeIn) {
                    showSuccessToast = false
                }
            }
        }

        .onChange(of: scenePhase) { _, newPhase in
            if newPhase == .active {
                dataManager.reloadTransactionsFromShared()
            }
        }
    }
}

struct ContentView_Previews: PreviewProvider {
    static var previews: some View {
        ContentView()
            .environmentObject(DataManager.shared)
    }
}
