//
//  ScheduleOCRSheet.swift
//  Campus v1
//

import SwiftUI
import PhotosUI
import UIKit

struct ScheduleOCRSheet: View {
    @Environment(\.dismiss) var dismiss
    @EnvironmentObject var dataManager: DataManager
    @ObservedObject var ocrService = GeminiScheduleOCRService.shared
    @ObservedObject var periodManager = PeriodScheduleManager.shared
    
    // 圖片選擇狀態
    @State private var selectedPhotoItem: PhotosPickerItem? = nil
    @State private var selectedImage: UIImage? = nil
    @State private var showingCamera = false
    
    // Gemini API 設定展開狀態
    @State private var showApiKeySection: Bool = false
    @State private var tempApiKey: String = ""
    @State private var showPlainApiKey: Bool = false
    
    // OCR 辨識結果狀態
    @State private var extractedPeriods: [OCRExtractedPeriod] = []
    @State private var extractedCourses: [OCRExtractedCourse] = []
    @State private var engineUsedLabel: String = ""
    @State private var hasAnalyzed: Bool = false
    
    // 匯入與自動修正選項
    @State private var autoUpdateSystemPeriods: Bool = true
    @State private var replaceExistingCourses: Bool = false
    @State private var autoAlignExistingCourses: Bool = true
    @State private var editingCourseId: UUID? = nil
    
    // 狀態提示訊息
    @State private var statusBannerText: String? = nil
    @State private var isStatusSuccess: Bool = true
    
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 18) {
                    // 1. 頂部 AI 智慧匯入橫幅與 Gemini API 設定卡片
                    geminiConfigCard
                    
                    // 2. 一鍵上傳 / 拍攝 / 剪貼簿 / 範例課表區
                    imageSourceCard
                    
                    // 3. 辨識進度或錯誤訊息
                    if ocrService.isAnalyzing {
                        analyzingProgressCard
                    }
                    
                    if let err = ocrService.errorMessage {
                        HStack(alignment: .top, spacing: 10) {
                            Image(systemName: "exclamationmark.triangle.fill")
                                .foregroundColor(.orange)
                            Text(err)
                                .font(.caption)
                                .foregroundColor(.primary)
                            Spacer()
                        }
                        .padding(14)
                        .background(Color.orange.opacity(0.12))
                        .cornerRadius(12)
                    }
                    
                    if let banner = statusBannerText {
                        HStack(spacing: 8) {
                            Image(systemName: isStatusSuccess ? "checkmark.circle.fill" : "info.circle.fill")
                                .foregroundColor(isStatusSuccess ? .green : .indigo)
                            Text(banner)
                                .font(.caption.weight(.semibold))
                                .foregroundColor(.primary)
                            Spacer()
                        }
                        .padding(12)
                        .background((isStatusSuccess ? Color.green : Color.indigo).opacity(0.12))
                        .cornerRadius(12)
                    }
                    
                    // 4. 辨識結果：自動修正課表時間（節次作息表）
                    if hasAnalyzed && !extractedPeriods.isEmpty {
                        extractedPeriodsCard
                    }
                    
                    // 5. 辨識結果：擷取到的課程清單與時間自動對齊
                    if hasAnalyzed {
                        extractedCoursesCard
                    }
                    
                    // 6. 底部匯入設定與一鍵執行按鈕
                    if hasAnalyzed && (!extractedCourses.isEmpty || !extractedPeriods.isEmpty) {
                        importActionCard
                    }
                    
                    // 7. 快捷工具：直接一鍵對齊現有課表時間
                    quickCalibrateExistingCard
                }
                .padding(16)
            }
            .background(CalicoTheme.warmPageBackground)
            .navigationTitle("Gemini 智慧課表 OCR")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("關閉") { dismiss() }
                }
                if hasAnalyzed && (!extractedCourses.isEmpty || !extractedPeriods.isEmpty) {
                    ToolbarItem(placement: .confirmationAction) {
                        Button("一鍵匯入") {
                            performOneClickImport()
                        }
                        .fontWeight(.bold)
                    }
                }
            }
            .onAppear {
                tempApiKey = ocrService.apiKey
                if !ocrService.hasApiKey {
                    showApiKeySection = true
                }
            }
            .onChange(of: selectedPhotoItem) { _, newItem in
                guard let newItem else { return }
                Task {
                    if let data = try? await newItem.loadTransferable(type: Data.self),
                       let uiImage = UIImage(data: data) {
                        await MainActor.run {
                            self.selectedImage = uiImage
                        }
                        await runOCRAnalysis(on: uiImage)
                    }
                }
            }
            .sheet(isPresented: $showingCamera) {
                ScheduleCameraPicker(image: $selectedImage) { capturedImage in
                    Task {
                        await runOCRAnalysis(on: capturedImage)
                    }
                }
            }
        }
    }
    
    // MARK: - 1. Gemini API 設定卡片
    private var geminiConfigCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 12) {
                CalicoCatAvatar(size: 46, mood: .studying)
                
                VStack(alignment: .leading, spacing: 3) {
                    HStack(spacing: 6) {
                        Text("可樂 × Gemini AI 課表辨識")
                            .font(.system(.subheadline, design: .rounded).weight(.bold))
                        Text(ocrService.hasApiKey ? "AI 已啟用 (已內建金鑰)" : "待填入 Key")
                            .font(.system(size: 10, weight: .bold, design: .rounded))
                            .padding(.horizontal, 7)
                            .padding(.vertical, 2)
                            .background((ocrService.hasApiKey ? CalicoTheme.sageGreen : CalicoTheme.warmOrange).opacity(0.16))
                            .foregroundColor(ocrService.hasApiKey ? CalicoTheme.sageGreen : CalicoTheme.warmOrange)
                            .clipShape(Capsule())
                    }
                    Text("一鍵辨識課表截圖中的「所有課程」與「每節作息時間」，並自動對齊修正課表時段 🐾")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }
                
                Spacer()
                
                Button {
                    withAnimation(.spring(response: 0.3, dampingFraction: 0.8)) {
                        showApiKeySection.toggle()
                    }
                } label: {
                    Image(systemName: showApiKeySection ? "chevron.up.circle.fill" : "gearshape.fill")
                        .font(.system(size: 18))
                        .foregroundColor(CalicoTheme.warmOrange)
                }
            }
            
            if showApiKeySection {
                Divider()
                
                VStack(alignment: .leading, spacing: 10) {
                    HStack {
                        Text("Gemini API Key")
                            .font(.caption.weight(.semibold))
                        Spacer()
                        if let url = URL(string: "https://aistudio.google.com/app/apikey") {
                            Link(destination: url) {
                                HStack(spacing: 3) {
                                    Text("免費取得 Google AI Studio Key")
                                    Image(systemName: "arrow.up.right.square")
                                }
                                .font(.caption2.weight(.bold))
                                .foregroundColor(.indigo)
                            }
                        }
                    }
                    
                    HStack(spacing: 8) {
                        Group {
                            if showPlainApiKey {
                                TextField("貼上 AIzaSy... 開頭的 Gemini API Key", text: $tempApiKey)
                            } else {
                                SecureField("貼上 AIzaSy... 開頭的 Gemini API Key", text: $tempApiKey)
                            }
                        }
                        .font(.caption)
                        .textFieldStyle(.roundedBorder)
                        .autocorrectionDisabled()
                        .textInputAutocapitalization(.never)
                        
                        Button {
                            showPlainApiKey.toggle()
                        } label: {
                            Image(systemName: showPlainApiKey ? "eye.slash" : "eye")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                        
                        Button("儲存") {
                            ocrService.apiKey = tempApiKey.trimmingCharacters(in: .whitespacesAndNewlines)
                            withAnimation {
                                statusBannerText = ocrService.hasApiKey ? "已儲存 Gemini API Key！現在上傳課表圖片即可使用 AI 深度辨識。" : "已清除 Gemini API Key（將使用 iOS 本機 Vision 引擎）。"
                                isStatusSuccess = true
                                if ocrService.hasApiKey {
                                    showApiKeySection = false
                                }
                            }
                        }
                        .font(.caption.weight(.bold))
                        .padding(.horizontal, 10)
                        .padding(.vertical, 6)
                        .background(Color.indigo)
                        .foregroundColor(.white)
                        .cornerRadius(8)
                    }
                    
                    HStack {
                        Text("辨識模型：")
                            .font(.caption2)
                            .foregroundColor(.secondary)
                        Picker("選擇模型", selection: $ocrService.selectedModel) {
                            ForEach(GeminiScheduleOCRService.availableModels, id: \.id) { m in
                                Text(m.title).tag(m.id)
                            }
                        }
                        .pickerStyle(.menu)
                        .labelsHidden()
                    }
                }
            }
        }
        .campusCardStyle()
    }
    
    // MARK: - 2. 課表圖片選取與一鍵啟動區
    private var imageSourceCard: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack {
                Label("選擇課表圖片（選取後自動一鍵辨識）", systemImage: "doc.text.viewfinder")
                    .font(.subheadline.weight(.bold))
                Spacer()
                if selectedImage != nil {
                    Button {
                        if let img = selectedImage {
                            Task { await runOCRAnalysis(on: img) }
                        }
                    } label: {
                        Label("重新辨識", systemImage: "arrow.clockwise")
                            .font(.caption.weight(.bold))
                            .foregroundColor(.indigo)
                    }
                }
            }
            
            // 圖片預覽（若已選取）
            if let img = selectedImage {
                ZStack(alignment: .topTrailing) {
                    Image(uiImage: img)
                        .resizable()
                        .scaledToFit()
                        .frame(maxHeight: 220)
                        .frame(maxWidth: .infinity)
                        .background(Color(.tertiarySystemGroupedBackground))
                        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                        .overlay(
                            RoundedRectangle(cornerRadius: 12, style: .continuous)
                                .stroke(Color.indigo.opacity(0.25), lineWidth: 1)
                        )
                    
                    Button {
                        withAnimation {
                            selectedImage = nil
                            selectedPhotoItem = nil
                            hasAnalyzed = false
                            extractedPeriods = []
                            extractedCourses = []
                        }
                    } label: {
                        Image(systemName: "xmark.circle.fill")
                            .font(.system(size: 22))
                            .foregroundColor(.white)
                            .shadow(radius: 3)
                            .padding(8)
                    }
                }
            }
            
            // 4 種便捷圖片來源按鈕
            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 10) {
                PhotosPicker(selection: $selectedPhotoItem, matching: .images) {
                    HStack(spacing: 6) {
                        Image(systemName: "photo.on.rectangle.angled")
                            .font(.system(size: 15, weight: .semibold))
                        Text("相簿選取課表截圖")
                            .font(.caption.weight(.bold))
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
                    .background(Color.indigo)
                    .foregroundColor(.white)
                    .cornerRadius(10)
                }
                
                Button {
                    if UIImagePickerController.isSourceTypeAvailable(.camera) {
                        showingCamera = true
                    } else {
                        statusBannerText = "目前裝置或模擬器不支援實體相機，請使用「相簿選取」或「範例課表測試」。"
                        isStatusSuccess = false
                    }
                } label: {
                    HStack(spacing: 6) {
                        Image(systemName: "camera.viewfinder")
                            .font(.system(size: 15, weight: .semibold))
                        Text("相機拍攝紙本/螢幕")
                            .font(.caption.weight(.bold))
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
                    .background(Color.indigo.opacity(0.12))
                    .foregroundColor(.indigo)
                    .cornerRadius(10)
                }
                
                Button {
                    if let pasted = UIPasteboard.general.image {
                        selectedImage = pasted
                        Task { await runOCRAnalysis(on: pasted) }
                    } else {
                        statusBannerText = "剪貼簿中目前沒有圖片，請先複製一張課表截圖再點擊。"
                        isStatusSuccess = false
                    }
                } label: {
                    HStack(spacing: 6) {
                        Image(systemName: "doc.on.clipboard")
                            .font(.system(size: 14, weight: .semibold))
                        Text("從剪貼簿貼上截圖")
                            .font(.caption.weight(.semibold))
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 10)
                    .background(Color(.tertiarySystemGroupedBackground))
                    .foregroundColor(.primary)
                    .cornerRadius(10)
                }
                
                Button {
                    let sample = GeminiScheduleOCRService.generateSampleTimetableImage()
                    selectedImage = sample
                    Task { await runOCRAnalysis(on: sample) }
                } label: {
                    HStack(spacing: 6) {
                        Image(systemName: "wand.and.stars")
                            .font(.system(size: 14, weight: .semibold))
                        Text("載入範例課表測試")
                            .font(.caption.weight(.semibold))
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 10)
                    .background(Color.purple.opacity(0.12))
                    .foregroundColor(.purple)
                    .cornerRadius(10)
                }
            }
        }
        .campusCardStyle()
    }
    
    // MARK: - 3. 辨識中動畫卡片
    private var analyzingProgressCard: some View {
        HStack(spacing: 14) {
            ProgressView()
                .tint(.indigo)
            VStack(alignment: .leading, spacing: 4) {
                Text("AI 正在辨識課表與計算時間...")
                    .font(.subheadline.weight(.bold))
                Text(ocrService.progressMessage)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            Spacer()
        }
        .campusCardStyle()
    }
    
    // MARK: - 4. 節次作息時間自動修正卡片
    private var extractedPeriodsCard: some View {
        let modifiedCount = extractedPeriods.filter { $0.isModifiedFromSystem }.count
        return VStack(alignment: .leading, spacing: 12) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    HStack(spacing: 6) {
                        Image(systemName: "clock.badge.checkmark.fill")
                            .foregroundColor(.indigo)
                        Text("課表節次時間自動修正")
                            .font(.subheadline.weight(.bold))
                        if modifiedCount > 0 {
                            Text("偵測到 \(modifiedCount) 節時段差異")
                                .font(.system(size: 10, weight: .bold))
                                .padding(.horizontal, 6)
                                .padding(.vertical, 2)
                                .background(Color.orange.opacity(0.15))
                                .foregroundColor(.orange)
                                .clipShape(Capsule())
                        }
                    }
                    Text("從課表圖片擷取的各節次上下課時間，開啟後將在匯入時自動修正系統作息表。")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }
                Spacer()
                Toggle("", isOn: $autoUpdateSystemPeriods)
                    .labelsHidden()
                    .tint(.indigo)
            }
            
            if autoUpdateSystemPeriods {
                Divider()
                
                VStack(spacing: 8) {
                    ForEach($extractedPeriods) { $period in
                        HStack(spacing: 8) {
                            Button {
                                period.isSelected.toggle()
                                recalibrateCoursesFromEditedPeriods()
                            } label: {
                                Image(systemName: period.isSelected ? "checkmark.circle.fill" : "circle")
                                    .foregroundColor(period.isSelected ? .indigo : .secondary)
                            }
                            .buttonStyle(.plain)
                            
                            Text(period.name)
                                .font(.caption.weight(.bold))
                                .frame(width: 56, alignment: .leading)
                            
                            if let orig = period.originalSystemTime, period.isModifiedFromSystem {
                                Text("原 \(orig)")
                                    .font(.system(size: 10))
                                    .foregroundColor(.orange)
                                    .lineLimit(1)
                            }
                            
                            Spacer()
                            
                            TextField("開始", text: $period.startTime)
                                .font(.caption.monospacedDigit())
                                .textFieldStyle(.roundedBorder)
                                .frame(width: 64)
                                .multilineTextAlignment(.center)
                                .onChange(of: period.startTime) { _, _ in
                                    recalibrateCoursesFromEditedPeriods()
                                }
                            
                            Text("~")
                                .font(.caption)
                                .foregroundColor(.secondary)
                            
                            TextField("結束", text: $period.endTime)
                                .font(.caption.monospacedDigit())
                                .textFieldStyle(.roundedBorder)
                                .frame(width: 64)
                                .multilineTextAlignment(.center)
                                .onChange(of: period.endTime) { _, _ in
                                    recalibrateCoursesFromEditedPeriods()
                                }
                        }
                        .padding(.vertical, 2)
                    }
                }
            }
        }
        .campusCardStyle()
    }
    
    // MARK: - 5. 擷取到的課程清單與時間自動校正預覽卡片
    private var extractedCoursesCard: some View {
        let selectedCount = extractedCourses.filter { $0.isSelected }.count
        return VStack(alignment: .leading, spacing: 12) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    HStack(spacing: 6) {
                        Image(systemName: "calendar.badge.plus")
                            .foregroundColor(.indigo)
                        Text("辨識到的課程內容 (\(selectedCount)/\(extractedCourses.count))")
                            .font(.subheadline.weight(.bold))
                    }
                    if !engineUsedLabel.isEmpty {
                        Text("辨識引擎：\(engineUsedLabel)")
                            .font(.system(size: 10))
                            .foregroundColor(.secondary)
                    }
                }
                Spacer()
                
                Button {
                    let allSelected = extractedCourses.allSatisfy { $0.isSelected }
                    for idx in extractedCourses.indices {
                        extractedCourses[idx].isSelected = !allSelected
                    }
                } label: {
                    Text(extractedCourses.allSatisfy { $0.isSelected } ? "取消全選" : "全選")
                        .font(.caption.weight(.semibold))
                        .foregroundColor(.indigo)
                }
            }
            
            if extractedCourses.isEmpty {
                Text("未在圖片中偵測到課程項目。您可點擊上方「重新辨識」或確認 Gemini API Key 已設定。")
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .padding(.vertical, 12)
            } else {
                Divider()
                
                VStack(spacing: 10) {
                    ForEach($extractedCourses) { $course in
                        extractedCourseRow(course: $course)
                    }
                }
            }
        }
        .campusCardStyle()
    }
    
    @ViewBuilder
    private func extractedCourseRow(course: Binding<OCRExtractedCourse>) -> some View {
        let item = course.wrappedValue
        let isEditing = (editingCourseId == item.id)
        
        VStack(alignment: .leading, spacing: 8) {
            HStack(alignment: .top, spacing: 10) {
                Button {
                    course.wrappedValue.isSelected.toggle()
                } label: {
                    Image(systemName: item.isSelected ? "checkmark.square.fill" : "square")
                        .font(.system(size: 18))
                        .foregroundColor(item.isSelected ? Color(hex: item.colorHex) : .secondary)
                }
                .buttonStyle(.plain)
                .padding(.top, 2)
                
                VStack(alignment: .leading, spacing: 4) {
                    HStack(spacing: 6) {
                        Text(item.weekday.shortName)
                            .font(.system(size: 11, weight: .bold))
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(Color(hex: item.colorHex).opacity(0.15))
                            .foregroundColor(Color(hex: item.colorHex))
                            .cornerRadius(5)
                        
                        Text(item.name)
                            .font(.subheadline.weight(.bold))
                            .foregroundColor(.primary)
                        
                        Spacer()
                        
                        Text("\(item.startTime) ~ \(item.endTime)")
                            .font(.caption.weight(.bold).monospacedDigit())
                            .foregroundColor(.indigo)
                    }
                    
                    HStack(spacing: 10) {
                        Text(item.periodBadgeText)
                            .font(.caption2.weight(.semibold))
                            .foregroundColor(.secondary)
                        
                        if !item.classroom.isEmpty {
                            Label(item.classroom, systemImage: "mappin.and.ellipse")
                                .font(.caption2)
                                .foregroundColor(.secondary)
                        }
                        if !item.instructor.isEmpty {
                            Label(item.instructor, systemImage: "person.fill")
                                .font(.caption2)
                                .foregroundColor(.secondary)
                        }
                        
                        Spacer()
                        
                        Button {
                            withAnimation {
                                editingCourseId = isEditing ? nil : item.id
                            }
                        } label: {
                            Label(isEditing ? "收起" : "微調", systemImage: isEditing ? "chevron.up" : "pencil")
                                .font(.caption2.weight(.semibold))
                                .foregroundColor(.indigo)
                        }
                        .buttonStyle(.plain)
                    }
                    
                    if item.wasTimeAutoCorrected, let note = item.correctionSummary {
                        HStack(spacing: 4) {
                            Image(systemName: "wand.and.stars")
                                .font(.system(size: 10))
                            Text(note)
                                .font(.system(size: 10, weight: .medium))
                        }
                        .foregroundColor(.teal)
                        .padding(.top, 2)
                    }
                }
            }
            
            if isEditing {
                Divider()
                VStack(spacing: 8) {
                    HStack {
                        Text("課程名稱")
                            .font(.caption)
                            .frame(width: 60, alignment: .leading)
                        TextField("課程名稱", text: course.name)
                            .font(.caption)
                            .textFieldStyle(.roundedBorder)
                    }
                    HStack {
                        Text("教室/教師")
                            .font(.caption)
                            .frame(width: 60, alignment: .leading)
                        TextField("教室", text: course.classroom)
                            .font(.caption)
                            .textFieldStyle(.roundedBorder)
                        TextField("授課教師", text: course.instructor)
                            .font(.caption)
                            .textFieldStyle(.roundedBorder)
                    }
                    HStack {
                        Text("星期/時間")
                            .font(.caption)
                            .frame(width: 60, alignment: .leading)
                        Picker("星期", selection: course.dayOfWeek) {
                            ForEach(WeekDay.allCases) { d in
                                Text(d.shortName).tag(d.rawValue)
                            }
                        }
                        .pickerStyle(.menu)
                        .labelsHidden()
                        
                        Spacer()
                        
                        TextField("開始", text: course.startTime)
                            .font(.caption.monospacedDigit())
                            .textFieldStyle(.roundedBorder)
                            .frame(width: 62)
                            .multilineTextAlignment(.center)
                        Text("~")
                            .font(.caption)
                        TextField("結束", text: course.endTime)
                            .font(.caption.monospacedDigit())
                            .textFieldStyle(.roundedBorder)
                            .frame(width: 62)
                            .multilineTextAlignment(.center)
                    }
                }
                .padding(.top, 4)
            }
        }
        .padding(10)
        .background(Color(.tertiarySystemGroupedBackground))
        .cornerRadius(10)
    }
    
    // MARK: - 6. 底部匯入選項與一鍵執行按鈕
    private var importActionCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("匯入與時間自動修正設定")
                .font(.subheadline.weight(.bold))
            
            Picker("匯入方式", selection: $replaceExistingCourses) {
                Text("合併加入現有課表").tag(false)
                Text("覆蓋現有課表 (新學期)").tag(true)
            }
            .pickerStyle(.segmented)
            
            Toggle(isOn: $autoAlignExistingCourses) {
                VStack(alignment: .leading, spacing: 2) {
                    Text("自動對齊並修正所有課程的上下課時間")
                        .font(.caption.weight(.semibold))
                    Text("確保課表內每一堂課的起訖時間與最新節次作息時間表完全一致")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }
            }
            .tint(.indigo)
            
            Button {
                performOneClickImport()
            } label: {
                HStack(spacing: 8) {
                    Image(systemName: "sparkles.rectangle.stack.fill")
                    Text("一鍵匯入課表並自動修正課表時間")
                        .fontWeight(.bold)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 14)
                .background(
                    LinearGradient(
                        colors: [Color.indigo, Color.purple],
                        startPoint: .leading,
                        endPoint: .trailing
                    )
                )
                .foregroundColor(.white)
                .cornerRadius(12)
            }
        }
        .campusCardStyle()
    }
    
    // MARK: - 7. 快捷工具：不需圖片直接修正現有課表時間
    private var quickCalibrateExistingCard: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Image(systemName: "wrench.and.screwdriver.fill")
                    .foregroundColor(.teal)
                Text("現有課表時間一鍵自動校正工具")
                    .font(.subheadline.weight(.bold))
                Spacer()
            }
            
            Text("若您目前的課表中有課程時間與節次作息時間不一致（例如手動輸入偏差或修改過節次時間），可點擊下方按鈕直接將所有現有課程自動對齊至標準節次時間。")
                .font(.caption2)
                .foregroundColor(.secondary)
            
            Button {
                let count = dataManager.autoCorrectAllCourseTimes()
                withAnimation {
                    if count > 0 {
                        statusBannerText = "已自動修正並對齊 \(count) 堂現有課程的上下課時間！"
                    } else {
                        statusBannerText = "檢查完成！目前所有 \(dataManager.courses.count) 堂課程的時間皆已精準對齊節次作息表。"
                    }
                    isStatusSuccess = true
                }
            } label: {
                HStack {
                    Image(systemName: "clock.arrow.2.circlepath")
                    Text("立即自動檢查並修正現有課表時間 (\(dataManager.courses.count) 堂課)")
                        .font(.caption.weight(.bold))
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 10)
                .background(Color.teal.opacity(0.14))
                .foregroundColor(.teal)
                .cornerRadius(10)
            }
        }
        .campusCardStyle()
    }
    
    // MARK: - 核心動作邏輯
    
    private func runOCRAnalysis(on image: UIImage) async {
        statusBannerText = nil
        do {
            let result = try await ocrService.analyzeScheduleImage(image)
            await MainActor.run {
                withAnimation {
                    self.extractedPeriods = result.periods
                    self.extractedCourses = result.courses
                    self.engineUsedLabel = result.engineUsed
                    self.hasAnalyzed = true
                    let correctedCoursesCount = result.courses.filter { $0.wasTimeAutoCorrected }.count
                    self.statusBannerText = "辨識成功！共抓取 \(result.courses.count) 堂課程、\(result.periods.count) 個節次時段（已自動校正 \(correctedCoursesCount) 堂課時間）。"
                    self.isStatusSuccess = true
                }
            }
        } catch {
            await MainActor.run {
                withAnimation {
                    self.ocrService.errorMessage = error.localizedDescription
                }
            }
        }
    }
    
    /// 當使用者在預覽區手動微調了某個節次的時間時，即時連動更新下方所有擷取課程的起訖時間
    private func recalibrateCoursesFromEditedPeriods() {
        var periodMap = Dictionary(uniqueKeysWithValues: periodManager.periods.map { ($0.id, $0) })
        for ep in extractedPeriods where ep.isSelected {
            if let ns = PeriodScheduleManager.normalizeTimeString(ep.startTime),
               let ne = PeriodScheduleManager.normalizeTimeString(ep.endTime) {
                periodMap[ep.id] = ClassPeriod(id: ep.id, name: ep.name, shortName: ep.shortName, startTime: ns, endTime: ne)
            }
        }
        let activeList = Array(periodMap.values).sorted { $0.startTime < $1.startTime }
        
        for idx in extractedCourses.indices {
            let pids = extractedCourses[idx].periodIds
            guard !pids.isEmpty else { continue }
            let matched = activeList.filter { pids.contains($0.id) }.sorted { $0.startTime < $1.startTime }
            if let first = matched.first, let last = matched.last {
                extractedCourses[idx].startTime = first.startTime
                extractedCourses[idx].endTime = last.endTime
                extractedCourses[idx].wasTimeAutoCorrected = true
                extractedCourses[idx].correctionSummary = "已連動對齊\(extractedCourses[idx].periodBadgeText)（\(first.startTime) ~ \(last.endTime)）"
            }
        }
    }
    
    /// 一鍵匯入課表並自動修正系統節次時間與課程時間
    private func performOneClickImport() {
        let oldPeriodsSnapshot = periodManager.periods
        
        // 1. 先套用並修正系統節次作息時間表
        if autoUpdateSystemPeriods {
            let selectedPeriodsToApply: [ClassPeriod] = extractedPeriods
                .filter { $0.isSelected }
                .map {
                    ClassPeriod(
                        id: $0.id,
                        name: $0.name,
                        shortName: $0.shortName,
                        startTime: PeriodScheduleManager.normalizeTimeString($0.startTime) ?? $0.startTime,
                        endTime: PeriodScheduleManager.normalizeTimeString($0.endTime) ?? $0.endTime
                    )
                }
            if !selectedPeriodsToApply.isEmpty {
                periodManager.applyExtractedPeriods(selectedPeriodsToApply)
            }
        }
        
        // 2. 將勾選的 OCR 課程轉換為正式 Course，並確保時間與更新後的節次表 100% 對齊
        let coursesToImport: [Course] = extractedCourses
            .filter { $0.isSelected }
            .map { item in
                let calibrated = periodManager.calibrateCourseTime(
                    rawStartTime: item.startTime,
                    rawEndTime: item.endTime,
                    explicitPeriodIds: item.periodIds,
                    referencePeriods: periodManager.periods
                )
                return Course(
                    name: item.name,
                    code: item.code,
                    classroom: item.classroom,
                    instructor: item.instructor,
                    dayOfWeek: item.dayOfWeek,
                    startTime: calibrated.startTime,
                    endTime: calibrated.endTime,
                    colorHex: item.colorHex,
                    isSharedWithFriends: true
                )
            }
        
        if !coursesToImport.isEmpty {
            dataManager.importOCRCourses(coursesToImport, replaceExisting: replaceExistingCourses)
        }
        
        // 3. 若開啟自動對齊現有課程時間，將課表中所有課程一併對齊至最新節次表
        if autoAlignExistingCourses {
            dataManager.autoCorrectAllCourseTimes(previousPeriods: oldPeriodsSnapshot)
        }
        
        dismiss()
    }
}

// MARK: - 相機拍攝 UIImagePickerController 封裝

struct ScheduleCameraPicker: UIViewControllerRepresentable {
    @Environment(\.dismiss) private var dismiss
    @Binding var image: UIImage?
    var onImagePicked: (UIImage) -> Void
    
    func makeUIViewController(context: Context) -> UIImagePickerController {
        let picker = UIImagePickerController()
        picker.sourceType = .camera
        picker.delegate = context.coordinator
        return picker
    }
    
    func updateUIViewController(_ uiViewController: UIImagePickerController, context: Context) {}
    
    func makeCoordinator() -> Coordinator {
        Coordinator(self)
    }
    
    final class Coordinator: NSObject, UINavigationControllerDelegate, UIImagePickerControllerDelegate {
        let parent: ScheduleCameraPicker
        
        init(_ parent: ScheduleCameraPicker) {
            self.parent = parent
        }
        
        func imagePickerController(_ picker: UIImagePickerController, didFinishPickingMediaWithInfo info: [UIImagePickerController.InfoKey : Any]) {
            if let uiImage = info[.originalImage] as? UIImage {
                parent.image = uiImage
                parent.onImagePicked(uiImage)
            }
            parent.dismiss()
        }
        
        func imagePickerControllerDidCancel(_ picker: UIImagePickerController) {
            parent.dismiss()
        }
    }
}
