//
//  AddTransactionSheet.swift
//  Campus v1
//

import SwiftUI

struct AddTransactionSheet: View {
    @Environment(\.dismiss) var dismiss
    @EnvironmentObject var dataManager: DataManager
    
    var transactionToEdit: TransactionItem? = nil
    var initialCategoryName: String = ""
    
    @FocusState private var isAmountFocused: Bool
    
    @State private var type: TransactionType = .expense
    @State private var amountString: String = ""
    @State private var selectedCategory: AccountingCategory? = nil
    @State private var selectedPaymentMethod: String = "現金"
    @State private var date: Date = Date()
    @State private var notes: String = ""
    @State private var valueScore: Int = 8
    
    @State private var showingCategoryManager = false
    @State private var showingPaymentManager = false
    
    init(transactionToEdit: TransactionItem? = nil, initialCategoryName: String = "", initialAmount: String = "", initialNote: String = "") {
        self.transactionToEdit = transactionToEdit
        self.initialCategoryName = initialCategoryName
        _amountString = State(initialValue: initialAmount)
        _notes = State(initialValue: initialNote)
    }
    
    private var isEditing: Bool {
        transactionToEdit != nil
    }
    
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    // 收支切換
                    Picker("類型", selection: $type) {
                        Text("支出").tag(TransactionType.expense)
                        Text("收入").tag(TransactionType.income)
                    }
                    .pickerStyle(.segmented)
                    .padding(.horizontal)
                    .onChange(of: type) { _, newType in
                        // 當切換類型時，自動選第一個符合的分類
                        if let first = dataManager.categories.first(where: { $0.type == newType }) {
                            selectedCategory = first
                        }
                    }
                    
                    // 金額輸入區塊（大字體）
                    VStack(spacing: 8) {
                        Text(type == .expense ? "支出金額" : "收入金額")
                            .font(.caption)
                            .foregroundColor(.secondary)
                        
                        HStack(alignment: .firstTextBaseline, spacing: 4) {
                            Text("$")
                                .font(.system(size: 28, weight: .bold))
                                .foregroundColor(type == .expense ? .red : .green)
                            
                            TextField("0", text: $amountString)
                                .font(.system(size: 44, weight: .bold, design: .rounded))
                                .keyboardType(.decimalPad)
                                .multilineTextAlignment(.center)
                                .foregroundColor(type == .expense ? .red : .green)
                                .focused($isAmountFocused)
                        }
                        
                        // 快捷金額按鈕（收入增加 10000 單位）
                        HStack(spacing: 8) {
                            if type == .expense {
                                quickAmountButton(value: 50)
                                quickAmountButton(value: 100)
                                quickAmountButton(value: 500)
                                quickAmountButton(value: 1000)
                            } else {
                                quickAmountButton(value: 1000)
                                quickAmountButton(value: 3000)
                                quickAmountButton(value: 5000)
                                quickAmountButton(value: 10000)
                            }
                        }
                    }
                    .padding()
                    .frame(maxWidth: .infinity)
                    .background(Color(.secondarySystemBackground))
                    .cornerRadius(16)
                    .padding(.horizontal)
                    
                    // 分類選擇區塊
                    VStack(alignment: .leading, spacing: 14) {
                        HStack {
                            Text("選擇類別")
                                .font(.headline)
                            Spacer()
                            Button {
                                showingCategoryManager = true
                            } label: {
                                HStack(spacing: 4) {
                                    Image(systemName: "slider.horizontal.3")
                                    Text("管理類別")
                                }
                                .font(.caption.weight(.semibold))
                                .foregroundColor(.indigo)
                            }
                        }
                        
                        // 飲食餐點快捷選擇 (早餐、中餐、晚餐、宵夜、飲料)
                        if type == .expense {
                            VStack(alignment: .leading, spacing: 8) {
                                Text("餐點快捷")
                                    .font(.caption.weight(.semibold))
                                    .foregroundColor(.secondary)
                                
                                HStack(spacing: 6) {
                                    quickMealButton(name: "早餐", icon: "sun.horizon.fill", colorHex: "#F59E0B")
                                    quickMealButton(name: "午餐", icon: "takeoutbag.and.cup.and.straw.fill", colorHex: "#F97316")
                                    quickMealButton(name: "晚餐", icon: "frying.pan.fill", colorHex: "#EF4444")
                                    quickMealButton(name: "宵夜", icon: "moon.stars.fill", colorHex: "#8B5CF6")
                                    quickMealButton(name: "飲料", icon: "cup.and.saucer.fill", colorHex: "#06B6D4")
                                }
                            }
                            
                            Divider()
                        }
                        
                        let currentCategories = dataManager.categories.filter { $0.type == type }
                        LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 10), count: 5), spacing: 14) {
                            ForEach(currentCategories) { cat in
                                categoryTile(cat: cat)
                            }
                        }
                    }
                    .padding()
                    .background(Color(.secondarySystemBackground))
                    .cornerRadius(16)
                    .padding(.horizontal)
                    
                    // 備註與花費價值評分（放置於支付方式上方，方便養成紀錄花費習慣）
                    VStack(alignment: .leading, spacing: 12) {
                        HStack {
                            Text("備註說明")
                                .font(.headline)
                            Spacer()
                            Text("記錄花費內容")
                                .font(.caption2)
                                .foregroundColor(.secondary)
                        }
                        
                        HStack {
                            Image(systemName: "note.text")
                                .foregroundColor(.secondary)
                            TextField("例如：學餐排骨便當、期中考用書", text: $notes)
                        }
                        .padding(.horizontal, 12)
                        .padding(.vertical, 8)
                        .background(Color(.tertiarySystemBackground))
                        .cornerRadius(10)
                        
                        if type == .expense {
                            Divider()
                            
                            VStack(alignment: .leading, spacing: 8) {
                                HStack {
                                    Text("消費理性評分")
                                        .font(.subheadline.weight(.semibold))
                                    Spacer()
                                    Text("\(valueScore) 分 • \(scoreLabel(for: valueScore))")
                                        .font(.caption.weight(.bold))
                                        .foregroundColor(scoreColor(for: valueScore))
                                        .padding(.horizontal, 8)
                                        .padding(.vertical, 3)
                                        .background(scoreColor(for: valueScore).opacity(0.12))
                                        .cornerRadius(6)
                                }
                                
                                HStack(spacing: 10) {
                                    Text("1")
                                        .font(.caption2)
                                        .foregroundColor(.secondary)
                                    Slider(value: Binding(
                                        get: { Double(valueScore) },
                                        set: { valueScore = Int($0) }
                                    ), in: 1...10, step: 1)
                                    .tint(scoreColor(for: valueScore))
                                    Text("10")
                                        .font(.caption2)
                                        .foregroundColor(.secondary)
                                }
                                
                                HStack {
                                    Text("衝動浪費 (1-3)")
                                        .font(.caption2)
                                        .foregroundColor(.red)
                                    Spacer()
                                    Text("平實合理 (4-6)")
                                        .font(.caption2)
                                        .foregroundColor(.orange)
                                    Spacer()
                                    Text("物超所值 (7-10)")
                                        .font(.caption2)
                                        .foregroundColor(.green)
                                }
                            }
                        }
                    }
                    .padding()
                    .background(Color(.secondarySystemBackground))
                    .cornerRadius(16)
                    .padding(.horizontal)
                    
                    // 支付方式
                    VStack(alignment: .leading, spacing: 12) {
                        HStack {
                            Text("支付方式")
                                .font(.headline)
                            Spacer()
                            Button {
                                showingPaymentManager = true
                            } label: {
                                HStack(spacing: 4) {
                                    Image(systemName: "plus.circle.fill")
                                    Text("自訂支付")
                                }
                                .font(.caption.weight(.semibold))
                                .foregroundColor(.indigo)
                            }
                        }
                        
                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 10) {
                                ForEach(dataManager.paymentMethods) { method in
                                    let isSelected = selectedPaymentMethod == method.name
                                    Button {
                                        selectedPaymentMethod = method.name
                                    } label: {
                                        HStack(spacing: 6) {
                                            Image(systemName: method.iconName)
                                            Text(method.name)
                                        }
                                        .font(.subheadline.weight(isSelected ? .bold : .regular))
                                        .padding(.horizontal, 14)
                                        .padding(.vertical, 8)
                                        .background(isSelected ? Color.indigo : Color(.tertiarySystemBackground))
                                        .foregroundColor(isSelected ? .white : .primary)
                                        .clipShape(Capsule())
                                    }
                                    .buttonStyle(.plain)
                                }
                            }
                        }
                    }
                    .padding()
                    .background(Color(.secondarySystemBackground))
                    .cornerRadius(16)
                    .padding(.horizontal)
                    
                    // 日期時間
                    VStack(spacing: 14) {
                        DatePicker("日期時間", selection: $date, displayedComponents: [.date, .hourAndMinute])
                            .datePickerStyle(.compact)
                    }
                    .padding()
                    .background(Color(.secondarySystemBackground))
                    .cornerRadius(16)
                    .padding(.horizontal)
                    
                    // 編輯模式下的刪除按鈕
                    if isEditing {
                        Button(role: .destructive) {
                            if let item = transactionToEdit {
                                dataManager.deleteTransaction(id: item.id)
                                NotificationCenter.default.post(name: NSNotification.Name("ShowExpenseSuccessToast"), object: nil)
        dismiss()
                            }
                        } label: {
                            HStack {
                                Image(systemName: "trash")
                                Text("刪除此筆紀錄")
                            }
                            .font(.headline)
                            .foregroundColor(.red)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 14)
                            .background(Color.red.opacity(0.12))
                            .cornerRadius(14)
                        }
                        .padding(.horizontal)
                        .padding(.top, 10)
                    }
                }
                .padding(.vertical)
            }
            .scrollDismissesKeyboard(.interactively)
            .background(Color(.systemGroupedBackground))
            .onTapGesture {
                UIApplication.shared.endEditing()
            }
            .navigationTitle(isEditing ? "編輯紀錄" : "記一筆")
            .navigationBarTitleDisplayMode(.inline)
            .onTapGesture { hideKeyboard() }
            .toolbar {
                ToolbarItemGroup(placement: .keyboard) {
                    Spacer()
                    Button("完成") {
                        UIApplication.shared.endEditing()
                    }
                }
                ToolbarItem(placement: .cancellationAction) {
                    Button("取消") { NotificationCenter.default.post(name: NSNotification.Name("ShowExpenseSuccessToast"), object: nil)
        dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button(isEditing ? "儲存" : "完成") {
                        saveTransaction()
                    }
                    .font(.headline)
                    .disabled(Double(amountString) == nil || Double(amountString)! <= 0)
                }
            }
            .sheet(isPresented: $showingCategoryManager) {
                CategoryManagerSheet()
            }
            .sheet(isPresented: $showingPaymentManager) {
                PaymentMethodManagerSheet()
            }
            .onAppear {
                setupInitialValues()
                if !isEditing {
                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.15) {
                        isAmountFocused = true
                    }
                }
            }
        }
    }
    
    private func setupInitialValues() {
        if let item = transactionToEdit {
            self.type = item.type
            self.amountString = String(format: "%.0f", item.amount)
            self.selectedCategory = dataManager.categories.first { $0.name == item.categoryName }
            self.selectedPaymentMethod = item.paymentMethodName
            self.date = item.date
            self.notes = item.notes
            self.valueScore = item.valueScore
        } else {
            if !initialCategoryName.isEmpty, let matched = dataManager.categories.first(where: {
                $0.name == initialCategoryName ||
                $0.name.contains(initialCategoryName) ||
                initialCategoryName.contains($0.name) ||
                ((initialCategoryName == "午餐" || initialCategoryName == "中餐") && ($0.name == "午餐" || $0.name == "中餐"))
            }) {
                self.selectedCategory = matched
                self.type = matched.type
            } else if selectedCategory == nil {
                selectedCategory = dataManager.categories.first { $0.type == type }
            }
        }
    }
    
    private func scoreLabel(for score: Int) -> String {
        switch score {
        case 1...3: return "衝動浪費"
        case 4...6: return "平實合理"
        case 7...10: return "物超所值"
        default: return "正常花費"
        }
    }
    
    private func scoreColor(for score: Int) -> Color {
        switch score {
        case 1...3: return .red
        case 4...6: return .orange
        case 7...10: return .green
        default: return .secondary
        }
    }
    
    private func quickAmountButton(value: Int) -> some View {
        Button {
            let current = Double(amountString) ?? 0
            amountString = String(format: "%.0f", current + Double(value))
        } label: {
            Text("+\(value)")
                .font(.caption.weight(.semibold))
                .padding(.horizontal, 10)
                .padding(.vertical, 4)
                .background(Color(.tertiarySystemBackground))
                .clipShape(Capsule())
        }
        .buttonStyle(.plain)
    }
    
    private func quickMealButton(name: String, icon: String, colorHex: String) -> some View {
        let isSelected = selectedCategory?.name == name ||
            ((name == "午餐" || name == "中餐") && (selectedCategory?.name == "午餐" || selectedCategory?.name == "中餐"))
        let color = Color(hex: colorHex)
        return Button {
            if let cat = dataManager.categories.first(where: {
                $0.name == name ||
                ((name == "午餐" || name == "中餐") && ($0.name == "午餐" || $0.name == "中餐"))
            }) {
                selectedCategory = cat
            } else {
                let newCat = AccountingCategory(name: name, type: .expense, iconName: icon, colorHex: colorHex)
                selectedCategory = newCat
            }
        } label: {
            VStack(spacing: 4) {
                Image(systemName: icon)
                    .font(.system(size: 15, weight: .bold))
                Text(name)
                    .font(.caption2.weight(.bold))
            }
            .foregroundColor(isSelected ? .white : color)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 8)
            .background(isSelected ? color : color.opacity(0.12))
            .cornerRadius(10)
            .overlay(
                RoundedRectangle(cornerRadius: 10)
                    .stroke(color, lineWidth: isSelected ? 2 : 0)
            )
        }
        .buttonStyle(.plain)
    }
    
    private func categoryTile(cat: AccountingCategory) -> some View {
        let isSelected = selectedCategory?.id == cat.id || selectedCategory?.name == cat.name
        return Button {
            selectedCategory = cat
        } label: {
            VStack(spacing: 6) {
                ZStack {
                    Circle()
                        .fill(cat.color)
                        .frame(width: 44, height: 44)
                    
                    Image(systemName: cat.iconName)
                        .font(.system(size: 18, weight: .bold))
                        .foregroundColor(.white)
                }
                .overlay(
                    Circle()
                        .stroke(Color.primary, lineWidth: isSelected ? 3 : 0)
                )
                .scaleEffect(isSelected ? 1.08 : 1.0)
                
                Text(cat.name)
                    .font(.caption2.weight(isSelected ? .bold : .regular))
                    .foregroundColor(isSelected ? .primary : .secondary)
                    .lineLimit(1)
            }
        }
        .buttonStyle(.plain)
    }
    
    private func saveTransaction() {
        guard let amt = Double(amountString), amt > 0 else { return }
        let category = selectedCategory ?? dataManager.categories.first(where: { $0.type == type }) ?? AccountingCategory(name: "其他", type: type)
        
        if var item = transactionToEdit {
            item.amount = amt
            item.type = type
            item.categoryName = category.name
            item.categoryIcon = category.iconName
            item.categoryColorHex = category.colorHex
            item.paymentMethodName = selectedPaymentMethod
            item.date = date
            item.notes = notes
            item.valueScore = valueScore
            dataManager.updateTransaction(item)
        } else {
            let newItem = TransactionItem(
                amount: amt,
                type: type,
                categoryId: category.id,
                categoryName: category.name,
                categoryIcon: category.iconName,
                categoryColorHex: category.colorHex,
                paymentMethodName: selectedPaymentMethod,
                date: date,
                notes: notes,
                valueScore: valueScore
            )
            dataManager.addTransaction(newItem)
        }
        
        NotificationCenter.default.post(name: NSNotification.Name("ShowExpenseSuccessToast"), object: nil)
        dismiss()
    }
}
