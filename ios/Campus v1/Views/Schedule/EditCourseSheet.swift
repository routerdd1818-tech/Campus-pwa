//
//  EditCourseSheet.swift
//  Campus v1
//

import SwiftUI

struct EditCourseSheet: View {
    @Environment(\.dismiss) var dismiss
    @EnvironmentObject var dataManager: DataManager
    @ObservedObject var periodManager = PeriodScheduleManager.shared
    
    let course: Course
    
    @State private var name: String
    @State private var code: String
    @State private var classroom: String
    @State private var instructor: String
    @State private var selectedWeekday: WeekDay
    @State private var selectedPeriodIds: Set<Int>
    @State private var isManualTime: Bool = false
    @State private var startTimeString: String
    @State private var endTimeString: String
    @State private var selectedColorHex: String
    @State private var isSharedWithFriends: Bool
    @State private var showingPeriodSettings = false
    @State private var showingDeleteAlert = false
    
    init(course: Course) {
        self.course = course
        _name = State(initialValue: course.name)
        _code = State(initialValue: course.code)
        _classroom = State(initialValue: course.classroom)
        _instructor = State(initialValue: course.instructor)
        _selectedWeekday = State(initialValue: course.weekday)
        _startTimeString = State(initialValue: course.startTime)
        _endTimeString = State(initialValue: course.endTime)
        _selectedColorHex = State(initialValue: course.colorHex)
        _isSharedWithFriends = State(initialValue: course.isSharedWithFriends)
        
        // 算出初始匹配的節次（支援中午節次 id=100 精準識別）
        let matched = PeriodScheduleManager.shared.matchedPeriods(
            startTime: course.startTime,
            endTime: course.endTime
        ).map { $0.id }
        
        _selectedPeriodIds = State(initialValue: Set(matched.isEmpty ? [1] : matched))
    }
    
    var body: some View {
        NavigationStack {
            Form {
                Section("課程基本資訊") {
                    TextField("課程名稱", text: $name)
                    TextField("課程代碼", text: $code)
                    TextField("教室地點", text: $classroom)
                    TextField("授課教師", text: $instructor)
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
                            Text("點選節次（支援中午排課與多節連堂）：")
                                .font(.caption)
                                .foregroundColor(.secondary)
                            Spacer()
                            if selectedPeriodIds.count > 1, let firstId = selectedPeriodIds.sorted().first {
                                Button("改為單節") {
                                    selectedPeriodIds = [firstId]
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
                    Text("上課節次與時間")
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
                        .tint(.indigo)
                    if !isSharedWithFriends {
                        Text("關閉後，此課程僅您自己可見，好友透過分享代碼將看不到此課程。")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
                
                Section {
                    Button(role: .destructive) {
                        showingDeleteAlert = true
                    } label: {
                        HStack {
                            Spacer()
                            Label("刪除此課程", systemImage: "trash")
                            Spacer()
                        }
                    }
                }
            }
            .navigationTitle("編輯課程")
            .navigationBarTitleDisplayMode(.inline)
            .onTapGesture { hideKeyboard() }
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("取消") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("儲存修改") {
                        saveChanges()
                    }
                    .disabled(name.trimmingCharacters(in: .whitespaces).isEmpty)
                }
            }
            .sheet(isPresented: $showingPeriodSettings) {
                PeriodSettingsSheet()
            }
            .alert("確定要刪除這堂課嗎？", isPresented: $showingDeleteAlert) {
                Button("刪除", role: .destructive) {
                    dataManager.deleteCourse(course)
                    dismiss()
                }
                Button("取消", role: .cancel) {}
            } message: {
                Text("刪除後將無法復原。")
            }
        }
    }
    
    private func togglePeriod(_ id: Int) {
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
    
    private func saveChanges() {
        var updated = course
        updated.name = name.trimmingCharacters(in: .whitespaces)
        updated.code = code.trimmingCharacters(in: .whitespaces)
        updated.classroom = classroom.trimmingCharacters(in: .whitespaces)
        updated.instructor = instructor.trimmingCharacters(in: .whitespaces)
        updated.dayOfWeek = selectedWeekday.rawValue
        updated.startTime = startTimeString
        updated.endTime = endTimeString
        updated.colorHex = selectedColorHex
        updated.isSharedWithFriends = isSharedWithFriends
        
        dataManager.updateCourse(updated)
        dismiss()
    }
}
