//
//  RecurringTransactionsSheet.swift
//  Campus v1
//
//  Created for Campus v1.
//

import SwiftUI

struct RecurringTransactionsSheet: View {
    @Environment(\.dismiss) var dismiss
    @EnvironmentObject var dataManager: DataManager
    
    @State private var showingAddForm = false
    @State private var itemToEdit: RecurringItem? = nil
    @State private var toastMessage: String? = nil
    
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 16) {
                    // 說明橫幅
                    HStack(spacing: 12) {
                        Image(systemName: "repeat.circle.fill")
                            .font(.system(size: 32))
                            .foregroundColor(.indigo)
                        
                        VStack(alignment: .leading, spacing: 2) {
                            Text("每月固定生活費與開銷")
                                .font(.headline)
                            Text("適合記錄每月的固定生活費、套房租金、電信費或訂閱服務，支援一鍵登記至本月帳本。")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                    }
                    .padding()
                    .background(Color(.secondarySystemBackground))
                    .cornerRadius(14)
                    .padding(.horizontal)
                    
                    if let toast = toastMessage {
                        HStack {
                            Image(systemName: "checkmark.circle.fill")
                                .foregroundColor(.green)
                            Text(toast)
                                .font(.caption.weight(.bold))
                            Spacer()
                        }
                        .padding(.horizontal, 16)
                        .padding(.vertical, 8)
                        .background(Color(.secondarySystemBackground))
                        .cornerRadius(10)
                        .padding(.horizontal)
                        .transition(.opacity)
                    }
                    
                    // 固定項目清單
                    if dataManager.recurringItems.isEmpty {
                        VStack(spacing: 12) {
                            Image(systemName: "calendar.badge.clock")
                                .font(.system(size: 40))
                                .foregroundColor(.secondary.opacity(0.6))
                            Text("尚未建立每月固定收支")
                                .font(.headline)
                            Text("點選右上角「+」立即新增每月的固定生活費或房租。")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                        .padding(.vertical, 40)
                        .frame(maxWidth: .infinity)
                        .background(Color(.secondarySystemBackground))
                        .cornerRadius(16)
                        .padding(.horizontal)
                    } else {
                        VStack(spacing: 12) {
                            ForEach(dataManager.recurringItems) { item in
                                recurringRow(item: item)
                            }
                        }
                        .padding(.horizontal)
                    }
                }
                .padding(.vertical, 10)
            }
            .background(Color(.systemGroupedBackground))
            .navigationTitle("每月固定收支")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("關閉") { dismiss() }
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        showingAddForm = true
                    } label: {
                        HStack(spacing: 4) {
                            Image(systemName: "plus")
                            Text("新增項目")
                        }
                        .font(.subheadline.weight(.semibold))
                    }
                }
            }
            .sheet(isPresented: $showingAddForm) {
                AddRecurringItemSheet()
            }
            .sheet(item: $itemToEdit) { item in
                AddRecurringItemSheet(itemToEdit: item)
            }
        }
    }
    
    private func recurringRow(item: RecurringItem) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 12) {
                Image(systemName: item.categoryIcon)
                    .font(.system(size: 16, weight: .bold))
                    .foregroundColor(Color(hex: item.categoryColorHex))
                    .frame(width: 34, height: 34)
                    .background(Color(hex: item.categoryColorHex).opacity(0.15))
                    .clipShape(Circle())
                
                VStack(alignment: .leading, spacing: 2) {
                    HStack(spacing: 6) {
                        Text(item.title)
                            .font(.headline)
                        Text(item.type == .income ? "固定收入" : "固定支出")
                            .font(.caption2.weight(.bold))
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(item.type == .income ? Color.green.opacity(0.15) : Color.red.opacity(0.15))
                            .foregroundColor(item.type == .income ? .green : .red)
                            .cornerRadius(4)
                    }
                    Text("每月 \(item.billingDay) 號 • \(item.paymentMethodName) • \(item.categoryName)")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                
                Spacer()
                
                Text("\(item.type == .income ? "+" : "-")NT$ \(Int(item.amount))")
                    .font(.subheadline.weight(.bold))
                    .foregroundColor(item.type == .income ? .green : .red)
            }
            
            if !item.notes.isEmpty {
                Text(item.notes)
                    .font(.caption2)
                    .foregroundColor(.secondary)
                    .padding(.horizontal, 4)
            }
            
            Divider()
            
            HStack {
                Button {
                    itemToEdit = item
                } label: {
                    Label("編輯", systemImage: "pencil")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                
                Button(role: .destructive) {
                    withAnimation {
                        dataManager.deleteRecurringItem(id: item.id)
                    }
                } label: {
                    Label("刪除", systemImage: "trash")
                        .font(.caption)
                        .foregroundColor(.red)
                }
                .padding(.leading, 8)
                
                Spacer()
                
                Button {
                    dataManager.applyRecurringItemNow(item)
                    withAnimation {
                        toastMessage = "已將【\(item.title)】登記至本月帳本！"
                    }
                    DispatchQueue.main.asyncAfter(deadline: .now() + 2.5) {
                        withAnimation {
                            toastMessage = nil
                        }
                    }
                } label: {
                    HStack(spacing: 4) {
                        Image(systemName: "plus.circle.fill")
                        Text("登記至本月帳本")
                    }
                    .font(.caption.weight(.bold))
                    .padding(.horizontal, 10)
                    .padding(.vertical, 6)
                    .background(Color.indigo.opacity(0.12))
                    .foregroundColor(.indigo)
                    .clipShape(Capsule())
                }
            }
        }
        .padding(14)
        .background(Color(.secondarySystemBackground))
        .cornerRadius(14)
    }
}

// MARK: - 新增 / 編輯固定收支項目
struct AddRecurringItemSheet: View {
    @Environment(\.dismiss) var dismiss
    @EnvironmentObject var dataManager: DataManager
    
    var itemToEdit: RecurringItem? = nil
    
    @State private var type: TransactionType = .income
    @State private var title: String = ""
    @State private var amountString: String = ""
    @State private var billingDay: Int = 1
    @State private var selectedPayment: String = "銀行轉帳"
    @State private var categoryName: String = "生活費 / 零用津貼"
    @State private var notes: String = ""
    
    var body: some View {
        NavigationStack {
            Form {
                Section("項目屬性") {
                    Picker("收支類型", selection: $type) {
                        Text("固定收入").tag(TransactionType.income)
                        Text("固定支出").tag(TransactionType.expense)
                    }
                    .pickerStyle(.segmented)
                    
                    TextField("項目名稱（例如：每月生活費、套房房租）", text: $title)
                    
                    HStack {
                        Text("每月金額 $")
                        TextField("15000", text: $amountString)
                            .keyboardType(.numberPad)
                    }
                }
                
                Section("扣款與記錄日程") {
                    Stepper("每月 \(billingDay) 號入帳/扣款", value: $billingDay, in: 1...31)
                    
                    Picker("支付/收款方式", selection: $selectedPayment) {
                        ForEach(dataManager.paymentMethods) { pm in
                            Text(pm.name).tag(pm.name)
                        }
                    }
                }
                
                Section("分類與備註") {
                    TextField("分類名稱", text: $categoryName)
                    TextField("備註說明（如：爸媽固定於月初匯入）", text: $notes)
                }
            }
            .navigationTitle(itemToEdit == nil ? "新增固定收支" : "編輯固定收支")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("取消") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("儲存") {
                        saveItem()
                    }
                    .font(.headline)
                    .disabled(title.trimmingCharacters(in: .whitespaces).isEmpty || Double(amountString) == nil)
                }
            }
            .onAppear {
                if let item = itemToEdit {
                    self.type = item.type
                    self.title = item.title
                    self.amountString = String(format: "%.0f", item.amount)
                    self.billingDay = item.billingDay
                    self.selectedPayment = item.paymentMethodName
                    self.categoryName = item.categoryName
                    self.notes = item.notes
                } else {
                    if let first = dataManager.paymentMethods.first {
                        self.selectedPayment = first.name
                    }
                }
            }
        }
    }
    
    private func saveItem() {
        guard let amt = Double(amountString), amt > 0 else { return }
        
        let icon = type == .income ? "gift.fill" : "house.fill"
        let color = type == .income ? "#10B981" : "#EF4444"
        
        if var item = itemToEdit {
            item.type = type
            item.title = title
            item.amount = amt
            item.billingDay = billingDay
            item.paymentMethodName = selectedPayment
            item.categoryName = categoryName
            item.notes = notes
            dataManager.updateRecurringItem(item)
        } else {
            let newItem = RecurringItem(
                title: title,
                amount: amt,
                type: type,
                categoryName: categoryName,
                categoryIcon: icon,
                categoryColorHex: color,
                billingDay: billingDay,
                paymentMethodName: selectedPayment,
                notes: notes
            )
            dataManager.addRecurringItem(newItem)
        }
        dismiss()
    }
}
