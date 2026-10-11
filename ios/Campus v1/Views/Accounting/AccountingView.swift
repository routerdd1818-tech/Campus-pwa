//
//  AccountingView.swift
//  Campus v1
//

import SwiftUI

private enum TransactionFilterType: String, CaseIterable, Identifiable {
    case all = "全部"
    case expense = "支出"
    case income = "收入"
    
    var id: String { rawValue }
}

struct AccountingView: View {
    @EnvironmentObject var dataManager: DataManager
    
    @State private var selectedSubTab: Int = 0
    @State private var showingAddTransaction = false
    @State private var showingAddInstallment = false
    @State private var showingAddSplitBill = false
    @State private var showingRecurringSheet = false
    @State private var showingShareRatingSheet = false
    @State private var transactionToEdit: TransactionItem? = nil
    @State private var searchText: String = ""
    @State private var filterType: TransactionFilterType = .all
    
    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // 次導覽分段器 (明細 / 圖表 / 分期 / 分帳) — 輕巧固定於頂部，讓下方內容擁有整頁完整滑動空間
                Picker("記帳功能", selection: $selectedSubTab) {
                    Text("收支明細").tag(0)
                    Text("統計分析").tag(1)
                    Text("分期紀錄").tag(2)
                    Text("墊錢分帳").tag(3)
                }
                .pickerStyle(.segmented)
                .padding(.horizontal, 16)
                .padding(.vertical, 8)
                .background(CalicoTheme.warmCardBackground)
                
                // 子頁面切換（移除 .page TabView 避免攔截手勢，讓整個收支清單與總覽卡片可全螢幕順暢上下滑動）
                Group {
                    switch selectedSubTab {
                    case 0:
                        transactionsListView
                    case 1:
                        AccountingAnalyticsView()
                    case 2:
                        InstallmentsView(showingAddSheet: $showingAddInstallment)
                    case 3:
                        SplitBillsView(showingAddSheet: $showingAddSplitBill)
                    default:
                        transactionsListView
                    }
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
            .background(CalicoTheme.warmPageBackground)
            .navigationTitle("記帳理財")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .principal) {
                    HStack(spacing: 5) {
                        CalicoCatAvatar(size: 22, mood: .happy)
                        Text("可樂記帳本")
                            .font(.system(size: 16, weight: .bold, design: .rounded))
                            .foregroundColor(.primary)
                            .lineLimit(1)
                            .fixedSize(horizontal: true, vertical: false)
                    }
                }
                ToolbarItem(placement: .topBarLeading) {
                    HStack(spacing: 6) {
                        Button {
                            showingRecurringSheet = true
                        } label: {
                            Image(systemName: "repeat.circle")
                                .font(.system(size: 17))
                                .foregroundColor(CalicoTheme.cocoaBrown)
                        }
                        
                        Button {
                            showingShareRatingSheet = true
                        } label: {
                            HStack(spacing: 3) {
                                Image(systemName: "person.2.wave.2.fill")
                                    .font(.system(size: 10))
                                Text("互評")
                                    .font(.caption2.weight(.bold))
                                    .lineLimit(1)
                            }
                            .padding(.horizontal, 7)
                            .padding(.vertical, 4)
                            .background(CalicoTheme.warmOrange.opacity(0.14))
                            .foregroundColor(CalicoTheme.warmOrange)
                            .clipShape(Capsule())
                            .fixedSize(horizontal: true, vertical: false)
                        }
                    }
                }
                
                ToolbarItem(placement: .topBarTrailing) {
                    Group {
                        switch selectedSubTab {
                        case 0:
                            Button {
                                showingAddTransaction = true
                            } label: {
                                HStack(spacing: 4) {
                                    Image(systemName: "plus")
                                    Text("記一筆")
                                }
                                .font(.system(.subheadline, design: .rounded).weight(.semibold))
                                .foregroundColor(CalicoTheme.warmOrange)
                                .fixedSize(horizontal: true, vertical: false)
                            }
                        case 2:
                            Button {
                                showingAddInstallment = true
                            } label: {
                                HStack(spacing: 4) {
                                    Image(systemName: "plus")
                                    Text("新增分期")
                                }
                                .font(.system(.subheadline, design: .rounded).weight(.semibold))
                                .foregroundColor(CalicoTheme.warmOrange)
                                .fixedSize(horizontal: true, vertical: false)
                            }
                        case 3:
                            Button {
                                showingAddSplitBill = true
                            } label: {
                                HStack(spacing: 4) {
                                    Image(systemName: "plus")
                                    Text("新增分帳")
                                }
                                .font(.system(.subheadline, design: .rounded).weight(.semibold))
                                .foregroundColor(CalicoTheme.warmOrange)
                                .fixedSize(horizontal: true, vertical: false)
                            }
                        default:
                            EmptyView()
                        }
                    }
                }
            }
            .sheet(isPresented: $showingAddTransaction) {
                AddTransactionSheet()
            }
            .sheet(isPresented: $showingRecurringSheet) {
                RecurringTransactionsSheet()
            }
            .sheet(isPresented: $showingShareRatingSheet) {
                PeerExpenseReviewView(isModal: true)
            }
            .sheet(item: $transactionToEdit) { item in
                AddTransactionSheet(transactionToEdit: item)
            }
        }
    }
    
    // MARK: - 當月結餘大卡片（放入 List 第一個 Section，隨列表一起上下滑動，金額單行不斷行）
    private var monthlyOverviewCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            // 1. 頂部月份與雙標籤列
            HStack(spacing: 6) {
                HStack(spacing: 5) {
                    Image(systemName: "pawprint.fill")
                        .font(.system(size: 12))
                        .foregroundColor(CalicoTheme.warmOrange)
                    Text(currentMonthTitle)
                        .font(.system(.subheadline, design: .rounded).weight(.bold))
                        .foregroundColor(CalicoTheme.cocoaBrown)
                        .lineLimit(1)
                        .fixedSize(horizontal: true, vertical: false)
                }
                
                Spacer(minLength: 4)
                
                if let score = dataManager.monthRationalScore {
                    HStack(spacing: 3) {
                        Image(systemName: "sparkles")
                            .font(.system(size: 10))
                        Text(String(format: "理性 %.1f", score))
                            .lineLimit(1)
                    }
                    .font(.caption2.weight(.bold))
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(score >= 7.0 ? CalicoTheme.sageGreen.opacity(0.15) : (score >= 4.5 ? CalicoTheme.warmOrange.opacity(0.15) : Color.red.opacity(0.15)))
                    .foregroundColor(score >= 7.0 ? CalicoTheme.sageGreen : (score >= 4.5 ? CalicoTheme.warmOrange : .red))
                    .clipShape(Capsule())
                    .fixedSize(horizontal: true, vertical: false)
                }
                
                if dataManager.totalPendingSplitAmount > 0 {
                    HStack(spacing: 3) {
                        Image(systemName: "person.2.fill")
                            .font(.system(size: 10))
                        Text("待收 $\(Int(dataManager.totalPendingSplitAmount))")
                            .lineLimit(1)
                    }
                    .font(.caption2.weight(.bold))
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(CalicoTheme.warmOrange.opacity(0.15))
                    .foregroundColor(CalicoTheme.warmOrange)
                    .clipShape(Capsule())
                    .fixedSize(horizontal: true, vertical: false)
                }
            }
            
            // 2. 本月結餘主視覺 + 三花貓頭像
            HStack(alignment: .center, spacing: 12) {
                VStack(alignment: .leading, spacing: 2) {
                    Text("本月結餘")
                        .font(.caption.weight(.medium))
                        .foregroundColor(.secondary)
                    
                    Text("$\(Int(dataManager.thisMonthBalance))")
                        .font(.system(size: 32, weight: .bold, design: .rounded))
                        .foregroundColor(dataManager.thisMonthBalance >= 0 ? .primary : .red)
                        .lineLimit(1)
                        .minimumScaleFactor(0.75)
                }
                
                Spacer()
                
                CalicoCatAvatar(size: 42, mood: dataManager.thisMonthBalance >= 0 ? .happy : .normal)
            }
            
            // 3. 收入與支出雙欄獨立卡片（各佔一半寬度，確保金額永遠單行完整顯示不換行）
            HStack(spacing: 10) {
                HStack(spacing: 8) {
                    Image(systemName: "arrow.down.left.circle.fill")
                        .font(.system(size: 18))
                        .foregroundColor(CalicoTheme.sageGreen)
                    
                    VStack(alignment: .leading, spacing: 1) {
                        Text("本月收入")
                            .font(.system(size: 11, weight: .medium))
                            .foregroundColor(.secondary)
                        Text("+$\(Int(dataManager.thisMonthIncome))")
                            .font(.system(size: 16, weight: .bold, design: .rounded))
                            .foregroundColor(CalicoTheme.sageGreen)
                            .lineLimit(1)
                            .minimumScaleFactor(0.75)
                    }
                    Spacer(minLength: 0)
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 9)
                .frame(maxWidth: .infinity)
                .background(CalicoTheme.sageGreen.opacity(0.10))
                .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                
                HStack(spacing: 8) {
                    Image(systemName: "arrow.up.right.circle.fill")
                        .font(.system(size: 18))
                        .foregroundColor(.red.opacity(0.85))
                    
                    VStack(alignment: .leading, spacing: 1) {
                        Text("本月支出")
                            .font(.system(size: 11, weight: .medium))
                            .foregroundColor(.secondary)
                        Text("-$\(Int(dataManager.thisMonthExpense))")
                            .font(.system(size: 16, weight: .bold, design: .rounded))
                            .foregroundColor(.red)
                            .lineLimit(1)
                            .minimumScaleFactor(0.75)
                    }
                    Spacer(minLength: 0)
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 9)
                .frame(maxWidth: .infinity)
                .background(Color.red.opacity(0.08))
                .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
            }
            
            // 4. 收支類型快速篩選膠囊 (全部 / 支出 / 收入) + 筆數統計
            HStack(spacing: 8) {
                ForEach(TransactionFilterType.allCases) { fType in
                    Button {
                        withAnimation(.easeInOut(duration: 0.15)) {
                            filterType = fType
                        }
                    } label: {
                        Text(fType.rawValue)
                            .font(.system(size: 12, weight: .bold, design: .rounded))
                            .padding(.horizontal, 12)
                            .padding(.vertical, 5)
                            .background(filterType == fType ? CalicoTheme.warmOrange : Color(.tertiarySystemGroupedBackground))
                            .foregroundColor(filterType == fType ? .white : .secondary)
                            .clipShape(Capsule())
                    }
                    .buttonStyle(.plain)
                }
                
                Spacer()
                
                Text("共 \(filteredTransactions.count) 筆")
                    .font(.caption2.weight(.semibold))
                    .foregroundColor(.secondary)
                    .lineLimit(1)
                    .fixedSize(horizontal: true, vertical: false)
            }
        }
        .campusCardStyle(cornerRadius: 22, padding: 16)
    }
    
    private var currentMonthTitle: String {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "zh_Hant_TW")
        formatter.dateFormat = "yyyy 年 M 月"
        return formatter.string(from: Date())
    }
    
    // MARK: - 明細清單檢視（全螢幕可順暢上下滑動）
    private var transactionsListView: some View {
        List {
            // 第一區塊：當月結餘總覽卡片（與下方收支卡片左右對齊，並可隨滑動收起）
            Section {
                monthlyOverviewCard
            }
            .listRowInsets(EdgeInsets(top: 6, leading: 0, bottom: 6, trailing: 0))
            .listRowBackground(Color.clear)
            .listRowSeparator(.hidden)
            
            if filteredTransactions.isEmpty {
                Section {
                    VStack(spacing: 12) {
                        Image(systemName: "tray")
                            .font(.system(size: 40))
                            .foregroundColor(.secondary.opacity(0.5))
                        Text("目前尚無符合條件的收支紀錄")
                            .font(.headline)
                            .foregroundColor(.secondary)
                        Text("點擊右上角「記一筆」即可快速記錄餐飲、日常開銷或打工收入。")
                            .font(.caption)
                            .foregroundColor(.secondary)
                            .multilineTextAlignment(.center)
                            .padding(.horizontal, 24)
                        
                        Button {
                            showingAddTransaction = true
                        } label: {
                            Label("記一筆收支", systemImage: "plus")
                                .font(.subheadline.weight(.semibold))
                                .padding(.horizontal, 20)
                                .padding(.vertical, 10)
                                .background(CalicoTheme.warmOrange)
                                .foregroundColor(.white)
                                .clipShape(Capsule())
                        }
                        .buttonStyle(.plain)
                        .padding(.top, 4)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 32)
                }
                .listRowBackground(Color.clear)
            } else {
                let grouped = groupedTransactions
                ForEach(grouped.keys.sorted(by: >), id: \.self) { dateKey in
                    let dayItems = grouped[dateKey] ?? []
                    let dayExpenseTotal = dayItems.filter { $0.type == .expense }.reduce(0) { $0 + $1.amount }
                    let dayIncomeTotal = dayItems.filter { $0.type == .income }.reduce(0) { $0 + $1.amount }
                    
                    Section {
                        ForEach(dayItems) { item in
                            transactionRow(item: item)
                                .contentShape(Rectangle())
                                .onTapGesture {
                                    transactionToEdit = item
                                }
                        }
                        .onDelete { indexSet in
                            for idx in indexSet {
                                dataManager.deleteTransaction(id: dayItems[idx].id)
                            }
                        }
                    } header: {
                        HStack(spacing: 8) {
                            Text(dateKey)
                                .font(.system(size: 13, weight: .bold, design: .rounded))
                                .foregroundColor(CalicoTheme.cocoaBrown)
                                .lineLimit(1)
                            Spacer(minLength: 4)
                            if dayIncomeTotal > 0 {
                                Text("收入 +$\(Int(dayIncomeTotal))")
                                    .font(.system(size: 11, weight: .semibold, design: .rounded))
                                    .foregroundColor(CalicoTheme.sageGreen)
                                    .lineLimit(1)
                                    .fixedSize(horizontal: true, vertical: false)
                            }
                            if dayExpenseTotal > 0 {
                                Text("支出 -$\(Int(dayExpenseTotal))")
                                    .font(.system(size: 11, weight: .semibold, design: .rounded))
                                    .foregroundColor(.red.opacity(0.85))
                                    .lineLimit(1)
                                    .fixedSize(horizontal: true, vertical: false)
                            }
                        }
                    }
                }
            }
        }
        .listStyle(.insetGrouped)
        .scrollContentBackground(.hidden)
        .background(CalicoTheme.warmPageBackground)
        .searchable(text: $searchText, prompt: "搜尋備註、分類或支付方式")
    }
    
    private var filteredTransactions: [TransactionItem] {
        let baseList: [TransactionItem] = {
            switch filterType {
            case .all:
                return dataManager.transactions
            case .expense:
                return dataManager.transactions.filter { $0.type == .expense }
            case .income:
                return dataManager.transactions.filter { $0.type == .income }
            }
        }()
        
        if searchText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            return baseList
        }
        return baseList.filter {
            $0.notes.localizedCaseInsensitiveContains(searchText) ||
            $0.categoryName.localizedCaseInsensitiveContains(searchText) ||
            $0.paymentMethodName.localizedCaseInsensitiveContains(searchText)
        }
    }
    
    private var groupedTransactions: [String: [TransactionItem]] {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "zh_Hant_TW")
        formatter.dateFormat = "yyyy/MM/dd (E)"
        
        return Dictionary(grouping: filteredTransactions) { item in
            formatter.string(from: item.date)
        }
    }
    
    private func transactionRow(item: TransactionItem) -> some View {
        HStack(spacing: 12) {
            Image(systemName: item.categoryIcon)
                .font(.system(size: 16, weight: .bold))
                .foregroundColor(.white)
                .frame(width: 38, height: 38)
                .background(item.color)
                .clipShape(Circle())
            
            VStack(alignment: .leading, spacing: 2) {
                HStack(spacing: 6) {
                    Text(item.categoryName)
                        .font(.body.weight(.semibold))
                        .lineLimit(1)
                    
                    if item.relatedInstallmentId != nil {
                        Text("分期")
                            .font(.caption2.weight(.bold))
                            .padding(.horizontal, 5)
                            .padding(.vertical, 1)
                            .background(Color.blue.opacity(0.12))
                            .foregroundColor(.blue)
                            .clipShape(Capsule())
                            .fixedSize(horizontal: true, vertical: false)
                    }
                    if item.relatedSplitBillId != nil {
                        Text("分帳")
                            .font(.caption2.weight(.bold))
                            .padding(.horizontal, 5)
                            .padding(.vertical, 1)
                            .background(Color.orange.opacity(0.12))
                            .foregroundColor(.orange)
                            .clipShape(Capsule())
                            .fixedSize(horizontal: true, vertical: false)
                    }
                    if item.type == .expense {
                        Text(item.valueScoreLabel)
                            .font(.caption2.weight(.bold))
                            .padding(.horizontal, 5)
                            .padding(.vertical, 1)
                            .background(item.valueScoreColor.opacity(0.12))
                            .foregroundColor(item.valueScoreColor)
                            .clipShape(Capsule())
                            .fixedSize(horizontal: true, vertical: false)
                    }
                    if let peer = item.peerRating {
                        Text("好友\(Int(peer))分")
                            .font(.caption2.weight(.bold))
                            .padding(.horizontal, 5)
                            .padding(.vertical, 1)
                            .background(Color.purple.opacity(0.15))
                            .foregroundColor(.purple)
                            .clipShape(Capsule())
                            .fixedSize(horizontal: true, vertical: false)
                    }
                }
                
                HStack(spacing: 6) {
                    Text(item.paymentMethodName)
                        .font(.caption2)
                        .foregroundColor(.secondary)
                        .lineLimit(1)
                    
                    if !item.notes.isEmpty {
                        Text("•")
                            .font(.caption2)
                            .foregroundColor(.secondary)
                        Text(item.notes)
                            .font(.caption2)
                            .foregroundColor(.secondary)
                            .lineLimit(1)
                    }
                }
            }
            
            Spacer(minLength: 8)
            
            Text(item.type == .expense ? "-$\(Int(item.amount))" : "+$\(Int(item.amount))")
                .font(.system(size: 17, weight: .bold, design: .rounded))
                .foregroundColor(item.type == .expense ? .red : .green)
                .lineLimit(1)
                .fixedSize(horizontal: true, vertical: false)
        }
        .padding(.vertical, 2)
    }
}
