//
//  QuickWidgetsDashboardView.swift
//  Campus v1
//

import SwiftUI

struct QuickWidgetsDashboardView: View {
    @Environment(\.dismiss) var dismiss
    @EnvironmentObject var dataManager: DataManager
    
    @State private var quickAmountInput: String = ""
    @State private var quickExpenseNote: String = ""
    @State private var quickSuccessToast: String? = nil
    
    var body: some View {
        NavigationStack {
            ZStack {
                CalicoSpatialBackground()
                
                ScrollView(showsIndicators: false) {
                    VStack(spacing: 18) {
                        // 頂部三花貓「可樂」小工具橫幅
                        HStack(spacing: 12) {
                            CalicoCatAvatar(size: 42, mood: .happy)
                            VStack(alignment: .leading, spacing: 2) {
                                Text("可樂快捷小工具中心")
                                    .font(.system(size: 16, weight: .heavy, design: .rounded))
                                    .foregroundColor(.primary)
                                Text("桌面與鎖定畫面小工具已同步升級 iOS 27 液態玻璃風格")
                                    .font(.system(size: 11.5, weight: .medium, design: .rounded))
                                    .foregroundColor(.secondary)
                            }
                            Spacer()
                        }
                        .campusCardStyle(cornerRadius: 20, padding: 14)
                        
                        // 1. 待辦事項倒數小工具 (Tasks Widget)
                        todoQuickWidget
                        
                        // 2. 今日與一週課表小工具 (Schedule Widget)
                        scheduleQuickWidget
                        
                        // 3. 快速記帳小工具 (Quick Accounting Widget)
                        accountingQuickWidget
                    }
                    .padding(.horizontal)
                    .padding(.vertical, 14)
                }
            }
            .navigationTitle("快捷小工具")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("完成") { dismiss() }
                        .font(.system(.headline, design: .rounded))
                        .foregroundColor(CalicoTheme.warmOrange)
                }
            }
            .overlay(alignment: .top) {
                if let toast = quickSuccessToast {
                    HStack(spacing: 6) {
                        Image(systemName: "pawprint.fill")
                            .font(.caption)
                        Text(toast)
                            .font(.system(.subheadline, design: .rounded, weight: .semibold))
                    }
                    .foregroundColor(.white)
                    .padding(.horizontal, 16)
                    .padding(.vertical, 10)
                    .background(CalicoTheme.accentGradient)
                    .clipShape(Capsule())
                    .shadow(color: CalicoTheme.warmOrange.opacity(0.35), radius: 8, x: 0, y: 4)
                    .transition(.move(edge: .top).combined(with: .opacity))
                    .padding(.top, 12)
                }
            }
        }
    }
    
    // MARK: - 1. 待辦事項小工具
    private var todoQuickWidget: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                HStack(spacing: 6) {
                    Image(systemName: "pawprint.fill")
                        .font(.system(size: 13))
                        .foregroundColor(CalicoTheme.pawPink)
                    Text("待辦事項與倒數日")
                        .font(.system(.headline, design: .rounded, weight: .bold))
                        .foregroundColor(CalicoTheme.cocoaBrown)
                }
                
                Spacer()
                
                let uncompletedCount = dataManager.todos.filter { !$0.isCompleted }.count
                Text("剩餘 \(uncompletedCount) 項")
                    .font(.system(.caption2, design: .rounded, weight: .bold))
                    .padding(.horizontal, 9)
                    .padding(.vertical, 4)
                    .background(CalicoTheme.accentGradient)
                    .foregroundColor(.white)
                    .clipShape(Capsule())
            }
            
            let urgentTodos = Array(dataManager.thisWeekTodos().filter { !$0.isCompleted }.prefix(3))
            
            if urgentTodos.isEmpty {
                HStack(spacing: 8) {
                    CalicoCatAvatar(size: 28, mood: .happy)
                    Text("本週沒有待辦作業，進度全數完成！")
                        .font(.system(.subheadline, design: .rounded, weight: .medium))
                        .foregroundColor(.secondary)
                }
                .frame(maxWidth: .infinity, alignment: .center)
                .padding(.vertical, 14)
            } else {
                VStack(spacing: 8) {
                    ForEach(urgentTodos) { todo in
                        HStack(spacing: 10) {
                            Button {
                                withAnimation {
                                    dataManager.toggleTodoCompletion(id: todo.id)
                                }
                            } label: {
                                Image(systemName: todo.isCompleted ? "checkmark.circle.fill" : "circle")
                                    .font(.system(size: 20))
                                    .foregroundColor(todo.isCompleted ? CalicoTheme.sageGreen : CalicoTheme.warmOrange)
                            }
                            .buttonStyle(.plain)
                            
                            VStack(alignment: .leading, spacing: 2) {
                                Text(todo.title)
                                    .font(.system(.subheadline, design: .rounded, weight: .semibold))
                                    .lineLimit(1)
                                
                                if let authors = todo.paperAuthors, !authors.isEmpty {
                                    Text("文獻: \(authors)")
                                        .font(.caption2)
                                        .foregroundColor(CalicoTheme.sageGreen)
                                }
                            }
                            
                            Spacer()
                            
                            Text(todo.countdownBadgeText)
                                .font(.system(.caption2, design: .rounded, weight: .bold))
                                .padding(.horizontal, 8)
                                .padding(.vertical, 3.5)
                                .background(todo.countdownColor.opacity(0.15))
                                .foregroundColor(todo.countdownColor)
                                .clipShape(Capsule())
                        }
                        .padding(.vertical, 4)
                        
                        if todo.id != urgentTodos.last?.id {
                            Divider().opacity(0.5)
                        }
                    }
                }
            }
        }
        .campusCardStyle(cornerRadius: 22, padding: 16)
    }
    
    // MARK: - 2. 課表小工具
    private var scheduleQuickWidget: some View {
        let todayCourses = dataManager.courses(for: Date())
        let weekday = WeekDay.from(date: Date())
        
        return VStack(alignment: .leading, spacing: 12) {
            HStack {
                HStack(spacing: 6) {
                    Image(systemName: "calendar.badge.clock")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundColor(CalicoTheme.warmOrange)
                    Text("今日課表 (\(weekday.shortName))")
                        .font(.system(.headline, design: .rounded, weight: .bold))
                        .foregroundColor(CalicoTheme.cocoaBrown)
                }
                
                Spacer()
                
                Text("\(todayCourses.count) 堂課")
                    .font(.system(.caption2, design: .rounded, weight: .bold))
                    .padding(.horizontal, 9)
                    .padding(.vertical, 4)
                    .background(CalicoTheme.warmOrange.opacity(0.14))
                    .foregroundColor(CalicoTheme.warmOrange)
                    .clipShape(Capsule())
            }
            
            if todayCourses.isEmpty {
                HStack(spacing: 8) {
                    CalicoCatAvatar(size: 28, mood: .happy)
                    Text("今天沒有任何排課，好好享受空堂時光！")
                        .font(.system(.subheadline, design: .rounded, weight: .medium))
                        .foregroundColor(.secondary)
                }
                .frame(maxWidth: .infinity, alignment: .center)
                .padding(.vertical, 14)
            } else {
                VStack(spacing: 8) {
                    ForEach(todayCourses) { course in
                        HStack(spacing: 12) {
                            Text("\(course.startTime)")
                                .font(.system(.caption, design: .monospaced, weight: .bold))
                                .foregroundColor(.secondary)
                                .frame(width: 48, alignment: .leading)
                            
                            RoundedRectangle(cornerRadius: 2.5, style: .continuous)
                                .fill(course.color)
                                .frame(width: 4, height: 32)
                            
                            VStack(alignment: .leading, spacing: 2) {
                                Text(course.name)
                                    .font(.system(.subheadline, design: .rounded, weight: .bold))
                                
                                Text(course.classroom.isEmpty ? "未指定教室" : "📍 \(course.classroom)")
                                    .font(.system(.caption2, design: .rounded))
                                    .foregroundColor(.secondary)
                            }
                            
                            Spacer()
                            
                            if !course.isSharedWithFriends {
                                Image(systemName: "lock.fill")
                                    .font(.caption2)
                                    .foregroundColor(.secondary)
                            }
                        }
                        .padding(.horizontal, 10)
                        .padding(.vertical, 6)
                        .background(course.color.opacity(0.08))
                        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                    }
                }
            }
        }
        .campusCardStyle(cornerRadius: 22, padding: 16)
    }
    
    // MARK: - 3. 快速記帳小工具
    private var accountingQuickWidget: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                HStack(spacing: 6) {
                    Image(systemName: "fork.knife.circle.fill")
                        .font(.system(size: 15))
                        .foregroundColor(CalicoTheme.warmOrange)
                    Text("可樂飲食快速記帳")
                        .font(.system(.headline, design: .rounded, weight: .bold))
                        .foregroundColor(CalicoTheme.cocoaBrown)
                }
                
                Spacer()
                
                Text("今日支出 $\(Int(dataManager.todayExpense))")
                    .font(.system(.caption2, design: .rounded, weight: .bold))
                    .padding(.horizontal, 9)
                    .padding(.vertical, 4)
                    .background(CalicoTheme.pawPink.opacity(0.15))
                    .foregroundColor(CalicoTheme.pawPink)
                    .clipShape(Capsule())
            }
            
            // 快速備註輸入列
            HStack {
                Image(systemName: "note.text")
                    .foregroundColor(CalicoTheme.warmOrange)
                    .font(.caption)
                TextField("備註（如：排骨飯、無糖青茶、雞排...）", text: $quickExpenseNote)
                    .font(.system(.caption, design: .rounded))
                if !quickExpenseNote.isEmpty {
                    Button {
                        quickExpenseNote = ""
                    } label: {
                        Image(systemName: "xmark.circle.fill")
                            .foregroundColor(.secondary)
                            .font(.caption)
                    }
                }
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
            .background(CalicoTheme.warmSecondaryBackground)
            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
            
            Text("一鍵秒記三餐、宵夜與手搖飲：")
                .font(.system(.caption2, design: .rounded, weight: .medium))
                .foregroundColor(.secondary)
            
            // 5大飲食類別一秒快捷鍵 (早餐、中餐、晚餐、宵夜、飲料)
            LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 8), count: 5), spacing: 8) {
                quickMealLogButton(meal: .breakfast, defaultAmount: 65)
                quickMealLogButton(meal: .lunch, defaultAmount: 100)
                quickMealLogButton(meal: .dinner, defaultAmount: 120)
                quickMealLogButton(meal: .supper, defaultAmount: 90)
                quickMealLogButton(meal: .drink, defaultAmount: 60)
            }
            
            Divider()
                .opacity(0.5)
                .padding(.vertical, 2)
            
            // 自訂金額入帳
            HStack {
                TextField("其他自訂項目", text: $quickExpenseNote)
                    .textFieldStyle(.roundedBorder)
                    .font(.system(.caption, design: .rounded))
                
                HStack(spacing: 2) {
                    Text("$")
                        .foregroundColor(.secondary)
                        .font(.system(.caption, design: .rounded, weight: .bold))
                    TextField("金額", text: $quickAmountInput)
                        .keyboardType(.numberPad)
                        .frame(width: 60)
                        .textFieldStyle(.roundedBorder)
                        .font(.system(.caption, design: .rounded))
                }
                
                Button {
                    recordCustomQuickExpense()
                } label: {
                    Text("入帳")
                        .font(.system(.caption, design: .rounded, weight: .bold))
                        .padding(.horizontal, 14)
                        .padding(.vertical, 7)
                        .background(CalicoTheme.accentGradient)
                        .foregroundColor(.white)
                        .clipShape(Capsule())
                }
                .disabled(Double(quickAmountInput) == nil)
            }
        }
        .campusCardStyle(cornerRadius: 22, padding: 16)
    }
    
    private func quickMealLogButton(meal: FoodMealType, defaultAmount: Double) -> some View {
        Button {
            let note = quickExpenseNote.trimmingCharacters(in: .whitespacesAndNewlines)
            dataManager.quickRecordFoodExpense(
                mealType: meal,
                amount: defaultAmount,
                notes: note.isEmpty ? meal.rawValue : note,
                paymentMethod: "現金",
                score: 8
            )
            triggerToast("已快速記錄【\(meal.rawValue)】$\(Int(defaultAmount)) \(note) 🐾")
            quickExpenseNote = ""
        } label: {
            VStack(spacing: 4) {
                Image(systemName: meal.iconName)
                    .font(.system(size: 16))
                Text(meal.rawValue)
                    .font(.system(.caption2, design: .rounded, weight: .bold))
                Text("$\(Int(defaultAmount))")
                    .font(.system(size: 10, weight: .bold, design: .rounded))
                    .foregroundColor(.secondary)
            }
            .foregroundColor(meal.color)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 9)
            .background(meal.color.opacity(0.13))
            .overlay(
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .strokeBorder(meal.color.opacity(0.28), lineWidth: 0.8)
            )
            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
        }
        .buttonStyle(.plain)
    }
    
    private func recordCustomQuickExpense() {
        guard let amt = Double(quickAmountInput), amt > 0 else { return }
        let note = quickExpenseNote.trimmingCharacters(in: .whitespacesAndNewlines)
        
        dataManager.quickRecordExpense(
            amount: amt,
            categoryName: "餐飲美食",
            icon: "fork.knife",
            colorHex: "#F59E0B",
            notes: note.isEmpty ? "日常餐飲" : note,
            paymentMethod: "現金"
        )
        
        triggerToast("已記錄：$\(Int(amt)) \(note) 🐾")
        quickAmountInput = ""
        quickExpenseNote = ""
    }
    
    private func triggerToast(_ msg: String) {
        withAnimation {
            quickSuccessToast = msg
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 2.0) {
            withAnimation {
                quickSuccessToast = nil
            }
        }
    }
}
