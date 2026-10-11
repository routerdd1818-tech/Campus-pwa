//
//  SplitBillsView.swift
//  Campus v1
//

import SwiftUI

struct SplitBillsView: View {
    @EnvironmentObject var dataManager: DataManager
    @Binding var showingAddSheet: Bool
    
    init(showingAddSheet: Binding<Bool> = .constant(false)) {
        self._showingAddSheet = showingAddSheet
    }
    
    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                // 待收回墊款總額橫幅
                let pendingTotal = dataManager.totalPendingSplitAmount
                
                HStack(spacing: 12) {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("待收回墊款總計")
                            .font(.caption)
                            .foregroundColor(.secondary)
                        
                        Text("$\(Int(pendingTotal))")
                            .font(.system(size: 26, weight: .bold, design: .rounded))
                            .foregroundColor(pendingTotal > 0 ? .orange : .green)
                    }
                    
                    Spacer()
                    
                    VStack(alignment: .trailing, spacing: 4) {
                        Text("分帳項目數")
                            .font(.caption)
                            .foregroundColor(.secondary)
                        Text("\(dataManager.splitBills.count) 筆")
                            .font(.headline)
                            .foregroundColor(.primary)
                    }
                }
                .padding()
                .background(Color(.secondarySystemBackground))
                .cornerRadius(16)
                .padding(.horizontal)
                
                // 分帳清單
                if dataManager.splitBills.isEmpty {
                    VStack(spacing: 12) {
                        Image(systemName: "person.2.circle")
                            .font(.system(size: 44))
                            .foregroundColor(.secondary.opacity(0.6))
                        Text("目前沒有墊錢分帳紀錄")
                            .font(.headline)
                        Text("大家聚餐、宿舍採購如果由您先墊付全額，可在這裡自動分帳，隨時追蹤誰已還錢、誰還沒給。")
                            .font(.caption)
                            .foregroundColor(.secondary)
                            .multilineTextAlignment(.center)
                            .padding(.horizontal, 24)
                        
                        Button {
                            showingAddSheet = true
                        } label: {
                            Label("新增墊錢分帳", systemImage: "plus")
                                .font(.subheadline.weight(.semibold))
                                .padding(.horizontal, 16)
                                .padding(.vertical, 10)
                                .background(Color.indigo)
                                .foregroundColor(.white)
                                .clipShape(Capsule())
                        }
                        .padding(.top, 4)
                    }
                    .padding(.vertical, 40)
                    .frame(maxWidth: .infinity)
                    .background(Color(.secondarySystemBackground))
                    .cornerRadius(16)
                    .padding(.horizontal)
                } else {
                    VStack(spacing: 14) {
                        ForEach(dataManager.splitBills) { bill in
                            splitBillCard(bill: bill)
                        }
                    }
                    .padding(.horizontal)
                }
            }
            .padding(.vertical, 10)
        }
        .background(Color(.systemGroupedBackground))
        .sheet(isPresented: $showingAddSheet) {
            AddSplitBillSheet()
        }
    }
    
    private func splitBillCard(bill: SplitBill) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    HStack(spacing: 6) {
                        Text(bill.title)
                            .font(.headline)
                        if bill.isSettled {
                            Text("已結清")
                                .font(.caption2.weight(.bold))
                                .padding(.horizontal, 6)
                                .padding(.vertical, 2)
                                .background(Color.green.opacity(0.15))
                                .foregroundColor(.green)
                                .clipShape(Capsule())
                        }
                    }
                    Text(bill.date.formatted(date: .abbreviated, time: .omitted))
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                
                Spacer()
                
                VStack(alignment: .trailing, spacing: 2) {
                    Text("總墊付 $\(Int(bill.totalAmount))")
                        .font(.subheadline.weight(.bold))
                    Text("自付 $\(Int(bill.myAmount)) • 他人 $\(Int(bill.totalAdvanceAmount))")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }
            }
            
            Divider()
            
            // 成員清單與一鍵切換還款
            VStack(spacing: 8) {
                ForEach(bill.members) { member in
                    HStack {
                        Image(systemName: "person.fill")
                            .font(.caption)
                            .foregroundColor(.secondary)
                        
                        Text(member.name)
                            .font(.subheadline)
                        
                        Spacer()
                        
                        Text("$\(Int(member.amount))")
                            .font(.subheadline.weight(.semibold))
                            .padding(.trailing, 6)
                        
                        Button {
                            withAnimation {
                                dataManager.toggleMemberPaid(billId: bill.id, memberId: member.id)
                            }
                        } label: {
                            HStack(spacing: 4) {
                                Image(systemName: member.isPaid ? "checkmark.circle.fill" : "clock.arrow.circlepath")
                                Text(member.isPaid ? "已還款" : "未還款")
                            }
                            .font(.caption.weight(.bold))
                            .padding(.horizontal, 8)
                            .padding(.vertical, 4)
                            .background(member.isPaid ? Color.green.opacity(0.15) : Color.orange.opacity(0.15))
                            .foregroundColor(member.isPaid ? .green : .orange)
                            .clipShape(Capsule())
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
            
            Divider()
            
            HStack {
                if bill.pendingCollectionAmount > 0 {
                    Text("尚欠您 $\(Int(bill.pendingCollectionAmount)) 元")
                        .font(.caption.weight(.bold))
                        .foregroundColor(.orange)
                } else {
                    Text("全數還清，帳目結平")
                        .font(.caption.weight(.bold))
                        .foregroundColor(.green)
                }
                
                Spacer()
                
                Button(role: .destructive) {
                    dataManager.deleteSplitBill(id: bill.id)
                } label: {
                    Image(systemName: "trash")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
        }
        .padding(14)
        .background(Color(.secondarySystemBackground))
        .cornerRadius(14)
    }
}

// MARK: - 新增墊錢分帳視窗
struct AddSplitBillSheet: View {
    @Environment(\.dismiss) var dismiss
    @EnvironmentObject var dataManager: DataManager
    
    @State private var title: String = ""
    @State private var totalAmountString: String = ""
    @State private var splitMode: String = "均分"
    @State private var totalParticipants: Int = 3 // 包含自己
    
    @State private var customMemberNames: [String] = ["小明", "阿華"]
    @State private var customMemberAmounts: [String] = ["", ""]
    
    var body: some View {
        NavigationStack {
            Form {
                Section("分帳活動資訊") {
                    TextField("活動名稱 (如: 期中聚餐、宿舍好市多採購)", text: $title)
                    
                    HStack {
                        Text("我先墊付的總金額 $")
                        TextField("1200", text: $totalAmountString)
                            .keyboardType(.numberPad)
                    }
                }
                
                Section("分帳方式") {
                    Picker("分攤模式", selection: $splitMode) {
                        Text("包含我全員均分").tag("均分")
                        Text("自訂個別金額").tag("自訂")
                    }
                    .pickerStyle(.segmented)
                    
                    if splitMode == "均分" {
                        Stepper("總共分攤人數（含我）：\(totalParticipants) 人", value: $totalParticipants, in: 2...10)
                            .onChange(of: totalParticipants) { _, newCount in
                                adjustCustomMembers(to: newCount - 1)
                            }
                        
                        if let total = Double(totalAmountString), total > 0 {
                            let per = total / Double(totalParticipants)
                            VStack(alignment: .leading, spacing: 4) {
                                Text("每人應分攤：$\(Int(per)) 元")
                                    .font(.headline)
                                    .foregroundColor(.indigo)
                                Text("（我的實質支出 $\(Int(per))，墊付給其他人 $\(Int(total - per))）")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }
                            .padding(.vertical, 2)
                        }
                    }
                }
                
                Section("參與人名單 (您先代墊的對象)") {
                    ForEach(0..<customMemberNames.count, id: \.self) { idx in
                        HStack {
                            TextField("成員 \(idx + 1) 姓名", text: $customMemberNames[idx])
                            
                            if splitMode == "均分" {
                                if let total = Double(totalAmountString), total > 0 {
                                    let per = total / Double(totalParticipants)
                                    Text("$\(Int(per))")
                                        .font(.subheadline.weight(.semibold))
                                        .foregroundColor(.secondary)
                                }
                            } else {
                                HStack(spacing: 2) {
                                    Text("$")
                                    TextField("金額", text: $customMemberAmounts[idx])
                                        .keyboardType(.numberPad)
                                        .frame(width: 80)
                                }
                            }
                        }
                    }
                    
                    if splitMode == "自訂" {
                        Button {
                            customMemberNames.append("朋友 \(customMemberNames.count + 1)")
                            customMemberAmounts.append("")
                        } label: {
                            Label("增加成員", systemImage: "plus")
                        }
                    }
                }
            }
            .navigationTitle("新增墊錢分帳")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("取消") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("建立") {
                        saveSplitBill()
                    }
                    .disabled(title.isEmpty || Double(totalAmountString) == nil)
                }
            }
            .onAppear {
                adjustCustomMembers(to: totalParticipants - 1)
            }
        }
    }
    
    private func adjustCustomMembers(to count: Int) {
        while customMemberNames.count < count {
            customMemberNames.append("朋友 \(customMemberNames.count + 1)")
            customMemberAmounts.append("")
        }
        while customMemberNames.count > count {
            customMemberNames.removeLast()
            customMemberAmounts.removeLast()
        }
    }
    
    private func saveSplitBill() {
        guard let total = Double(totalAmountString), !title.isEmpty else { return }
        
        var members: [SplitMember] = []
        var myAmount: Double = 0
        
        if splitMode == "均分" {
            let per = total / Double(max(1, totalParticipants))
            myAmount = per
            for name in customMemberNames {
                let trimmed = name.trimmingCharacters(in: .whitespacesAndNewlines)
                members.append(SplitMember(name: trimmed.isEmpty ? "朋友" : trimmed, amount: per))
            }
        } else {
            var othersSum: Double = 0
            for i in 0..<customMemberNames.count {
                let name = customMemberNames[i].trimmingCharacters(in: .whitespacesAndNewlines)
                let amt = Double(customMemberAmounts[i]) ?? 0
                othersSum += amt
                members.append(SplitMember(name: name.isEmpty ? "朋友 \(i+1)" : name, amount: amt))
            }
            myAmount = max(0, total - othersSum)
        }
        
        let newBill = SplitBill(
            title: title,
            totalAmount: total,
            myAmount: myAmount,
            members: members,
            date: Date()
        )
        
        dataManager.addSplitBill(newBill)
        dismiss()
    }
}
