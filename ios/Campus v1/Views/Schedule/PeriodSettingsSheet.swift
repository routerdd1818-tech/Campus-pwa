//
//  PeriodSettingsSheet.swift
//  Campus v1
//

import SwiftUI

struct PeriodSettingsSheet: View {
    @Environment(\.dismiss) var dismiss
    @ObservedObject var periodManager = PeriodScheduleManager.shared
    @ObservedObject var dataManager = DataManager.shared
    
    @State private var tempPeriods: [ClassPeriod] = []
    @State private var autoSyncCourseTimes: Bool = true
    @State private var showingResetAlert = false
    @State private var showingOCRSheet = false
    @State private var statusMessage: String? = nil
    
    var body: some View {
        NavigationStack {
            List {
                Section {
                    Button {
                        showingOCRSheet = true
                    } label: {
                        HStack(spacing: 10) {
                            Image(systemName: "sparkles")
                                .foregroundColor(.indigo)
                            VStack(alignment: .leading, spacing: 2) {
                                Text("透過 Gemini AI OCR 自動抓取課表時間")
                                    .font(.subheadline.weight(.bold))
                                    .foregroundColor(.primary)
                                Text("上傳課表截圖，自動辨識各節次上下課時間與所有課程")
                                    .font(.caption2)
                                    .foregroundColor(.secondary)
                            }
                            Spacer()
                            Image(systemName: "chevron.right")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                        .padding(.vertical, 2)
                    }
                    
                    Toggle(isOn: $autoSyncCourseTimes) {
                        VStack(alignment: .leading, spacing: 2) {
                            Text("儲存時自動修正現有課表時間")
                                .font(.subheadline.weight(.semibold))
                            Text("當節次時間變更時，自動將現有課程的上下課時間對齊至新節次")
                                .font(.caption2)
                                .foregroundColor(.secondary)
                        }
                    }
                    .tint(.indigo)
                    
                    if let msg = statusMessage {
                        Text(msg)
                            .font(.caption.weight(.semibold))
                            .foregroundColor(.teal)
                    }
                }
                
                Section("各節次起訖時間") {
                    ForEach($tempPeriods) { $period in
                        HStack {
                            Text(period.name)
                                .font(.subheadline.weight(.semibold))
                                .frame(width: 70, alignment: .leading)
                            
                            Spacer()
                            
                            TextField("開始", text: $period.startTime)
                                .textFieldStyle(.roundedBorder)
                                .frame(width: 80)
                                .multilineTextAlignment(.center)
                            
                            Text("~")
                                .foregroundColor(.secondary)
                            
                            TextField("結束", text: $period.endTime)
                                .textFieldStyle(.roundedBorder)
                                .frame(width: 80)
                                .multilineTextAlignment(.center)
                        }
                        .padding(.vertical, 2)
                    }
                }
                
                Section {
                    Button {
                        let oldSnapshot = periodManager.periods
                        periodManager.periods = tempPeriods
                        periodManager.savePeriods()
                        let count = dataManager.autoCorrectAllCourseTimes(previousPeriods: oldSnapshot)
                        statusMessage = count > 0 ? "已自動修正 \(count) 堂課程的上下課時間！" : "所有課程時間皆已與目前節次時間完全一致！"
                    } label: {
                        Label("立即一鍵對齊所有現有課程時間", systemImage: "clock.arrow.2.circlepath")
                            .foregroundColor(.teal)
                    }
                    
                    Button(role: .destructive) {
                        showingResetAlert = true
                    } label: {
                        Label("恢復大學預設作息時間", systemImage: "arrow.counterclockwise")
                    }
                }
            }
            .navigationTitle("節次作息時間設定")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("取消") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("儲存") {
                        saveChanges()
                        dismiss()
                    }
                }
            }
            .onAppear {
                tempPeriods = periodManager.periods
            }
            .onChange(of: periodManager.periods) { _, newValue in
                tempPeriods = newValue
            }
            .sheet(isPresented: $showingOCRSheet) {
                ScheduleOCRSheet()
            }
            .alert("確認恢復預設？", isPresented: $showingResetAlert) {
                Button("恢復預設", role: .destructive) {
                    let oldSnapshot = periodManager.periods
                    periodManager.resetToDefaults()
                    tempPeriods = periodManager.periods
                    if autoSyncCourseTimes {
                        dataManager.autoCorrectAllCourseTimes(previousPeriods: oldSnapshot)
                    }
                }
                Button("取消", role: .cancel) {}
            } message: {
                Text("將重設所有節次為標準大學作息（第 1 節 08:10 開始），並自動對齊現有課程時間。")
            }
        }
    }
    
    private func saveChanges() {
        let oldSnapshot = periodManager.periods
        let normalizedPeriods: [ClassPeriod] = tempPeriods.map { p in
            var copy = p
            if let ns = PeriodScheduleManager.normalizeTimeString(p.startTime) { copy.startTime = ns }
            if let ne = PeriodScheduleManager.normalizeTimeString(p.endTime) { copy.endTime = ne }
            return copy
        }
        periodManager.periods = normalizedPeriods.sorted { $0.startTime < $1.startTime }
        periodManager.savePeriods()
        
        if autoSyncCourseTimes {
            dataManager.autoCorrectAllCourseTimes(previousPeriods: oldSnapshot)
        }
    }
}
