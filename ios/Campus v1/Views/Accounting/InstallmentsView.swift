//
//  InstallmentsView.swift
//  Campus v1
//

import SwiftUI

struct InstallmentsView: View {
    @EnvironmentObject var dataManager: DataManager
    @Binding var showingAddSheet: Bool
    @State private var installmentToEdit: InstallmentItem? = nil
    
    init(showingAddSheet: Binding<Bool> = .constant(false)) {
        self._showingAddSheet = showingAddSheet
    }
    
    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                // 頂部統計卡片
                let totalRemaining = dataManager.installments.filter { !$0.isCompleted }.reduce(0) { $0 + $1.remainingAmount }
                let thisMonthDues = dataManager.installments.filter { !$0.isCompleted }.reduce(0) { $0 + $1.periodAmount }
                
                HStack(spacing: 12) {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("分期剩餘待繳總額")
                            .font(.caption)
                            .foregroundColor(.secondary)
                        Text("$\(Int(totalRemaining))")
                            .font(.system(size: 22, weight: .bold, design: .rounded))
                            .foregroundColor(.primary)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding()
                    .background(Color(.secondarySystemBackground))
                    .cornerRadius(14)
                    
                    VStack(alignment: .leading, spacing: 4) {
                        Text("每月分期應繳小計")
                            .font(.caption)
                            .foregroundColor(.secondary)
                        Text("$\(Int(thisMonthDues))")
                            .font(.system(size: 22, weight: .bold, design: .rounded))
                            .foregroundColor(.indigo)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding()
                    .background(Color(.secondarySystemBackground))
                    .cornerRadius(14)
                }
                .padding(.horizontal)
                
                // 分期列表
                if dataManager.installments.isEmpty {
                    VStack(spacing: 10) {
                        Image(systemName: "creditcard.and.123")
                            .font(.system(size: 40))
                            .foregroundColor(.secondary.opacity(0.6))
                        Text("目前沒有分期紀錄")
                            .font(.headline)
                        Text("大型支出（如筆電、機車、學費）可建立分期，每月自動提醒與記錄支出。")
                            .font(.caption)
                            .foregroundColor(.secondary)
                            .multilineTextAlignment(.center)
                            .padding(.horizontal, 30)
                        
                        Button {
                            showingAddSheet = true
                        } label: {
                            Label("新增分期紀錄", systemImage: "plus")
                                .font(.subheadline.weight(.semibold))
                                .padding(.horizontal, 16)
                                .padding(.vertical, 10)
                                .background(Color.indigo)
                                .foregroundColor(.white)
                                .clipShape(Capsule())
                        }
                        .padding(.top, 6)
                    }
                    .padding(.vertical, 40)
                    .frame(maxWidth: .infinity)
                    .background(Color(.secondarySystemBackground))
                    .cornerRadius(16)
                    .padding(.horizontal)
                } else {
                    VStack(spacing: 12) {
                        ForEach(dataManager.installments) { inst in
                            installmentCard(inst: inst)
                        }
                    }
                    .padding(.horizontal)
                }
            }
            .padding(.vertical, 10)
        }
        .background(Color(.systemGroupedBackground))
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button {
                    showingAddSheet = true
                } label: {
                    Label("新增分期", systemImage: "plus")
                }
            }
        }
        .sheet(isPresented: $showingAddSheet) {
            AddInstallmentSheet()
        }
        .sheet(item: $installmentToEdit) { inst in
            AddInstallmentSheet(installmentToEdit: inst)
        }
    }
    
    private func installmentCard(inst: InstallmentItem) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    HStack(spacing: 6) {
                        Text(inst.title)
                            .font(.headline)
                        if inst.isCompleted {
                            Text("已結清")
                                .font(.caption2.weight(.bold))
                                .padding(.horizontal, 6)
                                .padding(.vertical, 2)
                                .background(Color.green.opacity(0.15))
                                .foregroundColor(.green)
                                .clipShape(Capsule())
                        }
                    }
                    Text("\(inst.categoryName) • \(inst.paymentMethodName) (每月 \(inst.billingDay) 號扣款)")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                
                Spacer()
                
                VStack(alignment: .trailing, spacing: 2) {
                    Text("$\(Int(inst.periodAmount)) / 期")
                        .font(.subheadline.weight(.bold))
                        .foregroundColor(.indigo)
                    Text("總額 $\(Int(inst.totalAmount))")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }
            }
            
            // 進度條
            VStack(alignment: .leading, spacing: 4) {
                ProgressView(value: inst.progress)
                    .tint(inst.isCompleted ? .green : .indigo)
                
                HStack {
                    Text("已繳 \(inst.paidPeriods)/\(inst.totalPeriods) 期")
                        .font(.caption2.weight(.medium))
                        .foregroundColor(.secondary)
                    Spacer()
                    Text("剩餘 \(inst.remainingPeriods) 期 (約 $\(Int(inst.remainingAmount)))")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }
            }
            
            Divider()
            
            HStack {
                Button {
                    installmentToEdit = inst
                } label: {
                    Label("編輯", systemImage: "pencil")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                
                Spacer()
                
                if !inst.isCompleted {
                    Button {
                        withAnimation {
                            dataManager.payInstallmentPeriod(id: inst.id)
                        }
                    } label: {
                        HStack(spacing: 4) {
                            Image(systemName: "checkmark.circle.fill")
                            Text("登記繳納本期")
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
        }
        .padding(14)
        .background(Color(.secondarySystemBackground))
        .cornerRadius(14)
    }
}

// MARK: - 新增 / 編輯分期視窗
struct AddInstallmentSheet: View {
    @Environment(\.dismiss) var dismiss
    @EnvironmentObject var dataManager: DataManager
    
    var installmentToEdit: InstallmentItem? = nil
    
    @State private var title: String = ""
    @State private var totalAmountString: String = ""
    @State private var totalPeriods: Int = 12
    @State private var paidPeriods: Int = 0
    @State private var billingDay: Int = 15
    @State private var paymentMethodName: String = "信用卡"
    @State private var categoryName: String = "數位 3C"
    @State private var notes: String = ""
    
    private let commonPeriods = [3, 6, 12, 24, 30]
    
    var body: some View {
        NavigationStack {
            Form {
                Section("分期標題與金額") {
                    TextField("分期項目名稱 (如: MacBook Pro 16吋)", text: $title)
                    
                    HStack {
                        Text("總金額 $")
                        TextField("24000", text: $totalAmountString)
                            .keyboardType(.numberPad)
                    }
                }
                
                Section("期數設定") {
                    Picker("總期數", selection: $totalPeriods) {
                        ForEach(commonPeriods, id: \.self) { p in
                            Text("\(p) 期").tag(p)
                        }
                    }
                    
                    Stepper("已繳納期數: \(paidPeriods) 期", value: $paidPeriods, in: 0...totalPeriods)
                    
                    Stepper("每月扣款日: 每月 \(billingDay) 號", value: $billingDay, in: 1...31)
                    
                    if let total = Double(totalAmountString), total > 0 {
                        let per = total / Double(max(1, totalPeriods))
                        HStack {
                            Text("預估每期應繳")
                            Spacer()
                            Text("$\(Int(per)) 元")
                                .font(.headline)
                                .foregroundColor(.indigo)
                        }
                    }
                }
                
                Section("付款方式與分類") {
                    Picker("扣款方式", selection: $paymentMethodName) {
                        ForEach(dataManager.paymentMethods) { m in
                            Text(m.name).tag(m.name)
                        }
                    }
                    
                    Picker("類別", selection: $categoryName) {
                        ForEach(dataManager.categories.filter { $0.type == .expense }) { c in
                            Text(c.name).tag(c.name)
                        }
                    }
                    
                    TextField("備註", text: $notes)
                }
                
                if installmentToEdit != nil {
                    Section {
                        Button(role: .destructive) {
                            if let inst = installmentToEdit {
                                dataManager.deleteInstallment(id: inst.id)
                                dismiss()
                            }
                        } label: {
                            HStack {
                                Spacer()
                                Text("刪除此分期紀錄")
                                Spacer()
                            }
                        }
                    }
                }
            }
            .navigationTitle(installmentToEdit != nil ? "編輯分期" : "新增分期付款")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("取消") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("儲存") {
                        save()
                    }
                    .disabled(title.isEmpty || Double(totalAmountString) == nil)
                }
            }
            .onAppear {
                if let inst = installmentToEdit {
                    self.title = inst.title
                    self.totalAmountString = String(format: "%.0f", inst.totalAmount)
                    self.totalPeriods = inst.totalPeriods
                    self.paidPeriods = inst.paidPeriods
                    self.billingDay = inst.billingDay
                    self.paymentMethodName = inst.paymentMethodName
                    self.categoryName = inst.categoryName
                    self.notes = inst.notes
                }
            }
        }
    }
    
    private func save() {
        guard let total = Double(totalAmountString), !title.isEmpty else { return }
        
        if var inst = installmentToEdit {
            inst.title = title
            inst.totalAmount = total
            inst.totalPeriods = totalPeriods
            inst.paidPeriods = paidPeriods
            inst.periodAmount = total / Double(max(1, totalPeriods))
            inst.billingDay = billingDay
            inst.paymentMethodName = paymentMethodName
            inst.categoryName = categoryName
            inst.notes = notes
            inst.isCompleted = paidPeriods >= totalPeriods
            dataManager.updateInstallment(inst)
        } else {
            let newInst = InstallmentItem(
                title: title,
                totalAmount: total,
                totalPeriods: totalPeriods,
                paidPeriods: paidPeriods,
                billingDay: billingDay,
                paymentMethodName: paymentMethodName,
                categoryName: categoryName,
                notes: notes
            )
            dataManager.addInstallment(newInst)
        }
        
        dismiss()
    }
}
