//
//  Campus_v1App.swift
//  Campus v1
//

import SwiftUI
import BackgroundTasks

@main
struct Campus_v1App: App {
    @StateObject private var dataManager = DataManager.shared
    @Environment(\.scenePhase) private var scenePhase
    @State private var hasCompletedInitialActive = false
    
    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(dataManager)
                .environment(\.locale, Locale(identifier: "zh_Hant_TW"))
                .onChange(of: scenePhase) { newPhase in
                    switch newPhase {
                    case .active:
                        // 首次冷啟動已由 DataManager / LineBotService 延遲排程處理，避免開 App 重複觸發阻塞主執行緒
                        guard hasCompletedInitialActive else {
                            hasCompletedInitialActive = true
                            return
                        }
                        Task(priority: .utility) {
                            try? await Task.sleep(nanoseconds: 500_000_000)
                            await MainActor.run {
                                LineBotService.shared.checkAndAutoSendBriefingIfNeeded()
                                dataManager.checkAndTriggerAutoAccountingUploadIfNeeded()
                            }
                            await LineBotService.shared.syncSettingsToSupabase()
                        }
                    case .background:
                        LineBotService.shared.scheduleBackgroundBriefingTask()
                        dataManager.checkAndTriggerAutoAccountingUploadIfNeeded()
                        Task(priority: .utility) {
                            await LineBotService.shared.syncSettingsToSupabase()
                        }
                    default:
                        break
                    }
                }
        }
        .backgroundTask(.appRefresh(LineBotService.bgTaskIdentifier)) {
            await LineBotService.shared.handleBackgroundBriefingTask()
        }
    }
}

extension UIApplication {
    func endEditing() {
        sendAction(#selector(UIResponder.resignFirstResponder), to: nil, from: nil, for: nil)
    }
}
