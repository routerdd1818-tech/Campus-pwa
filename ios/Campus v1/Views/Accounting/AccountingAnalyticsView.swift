//
//  AccountingAnalyticsView.swift
//  Campus v1
//

import SwiftUI
import Charts

struct AccountingAnalyticsView: View {
    @EnvironmentObject var dataManager: DataManager
    
    @State private var selectedRange: StatsRange = .monthly
    @State private var currentDate: Date = Date()
    @State private var chartType: String = "支出來源"
    
    private let calendar = Calendar.current
    
    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                // 統計週期切換 (一週 / 一個月 / 一年)
                Picker("週期", selection: $selectedRange) {
                    ForEach(StatsRange.allCases) { range in
                        Text(range.rawValue).tag(range)
                    }
                }
                .pickerStyle(.segmented)
                .padding(.horizontal)
                .padding(.top, 8)
                
                // 日期區間切換控制列
                dateNavigationBar
                    .padding(.horizontal)
                
                let stats = dataManager.stats(for: currentDate, range: selectedRange)
                
                // KPI 指標卡片 (總收支與結餘)
                kpiSummaryGrid(stats: stats)
                    .padding(.horizontal)
                
                // 支出來源 vs 收入來源 切換
                Picker("圖表類型", selection: $chartType) {
                    Text("支出來源分析").tag("支出來源")
                    Text("收入來源分析").tag("收入來源")
                    Text("支付方式分佈").tag("支付方式")
                }
                .pickerStyle(.segmented)
                .padding(.horizontal)
                
                if chartType == "支出來源" {
                    expenseBreakdownSection(stats: stats)
                        .padding(.horizontal)
                } else if chartType == "收入來源" {
                    incomeBreakdownSection(stats: stats)
                        .padding(.horizontal)
                } else {
                    paymentBreakdownSection(stats: stats)
                        .padding(.horizontal)
                }
            }
            .padding(.bottom, 30)
        }
        .background(Color(.systemGroupedBackground))
    }
    
    // MARK: - 日期導覽列
    private var dateNavigationBar: some View {
        HStack {
            Button {
                stepDate(by: -1)
            } label: {
                Image(systemName: "chevron.left")
                    .font(.system(size: 14, weight: .bold))
                    .foregroundColor(.secondary)
                    .frame(width: 32, height: 32)
                    .background(Color(.secondarySystemBackground))
                    .clipShape(Circle())
            }
            
            Spacer()
            
            Text(currentDateRangeTitle)
                .font(.headline)
                .foregroundColor(.primary)
            
            Spacer()
            
            Button {
                stepDate(by: 1)
            } label: {
                Image(systemName: "chevron.right")
                    .font(.system(size: 14, weight: .bold))
                    .foregroundColor(.secondary)
                    .frame(width: 32, height: 32)
                    .background(Color(.secondarySystemBackground))
                    .clipShape(Circle())
            }
        }
        .padding(.vertical, 4)
    }
    
    private var currentDateRangeTitle: String {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "zh_Hant_TW")
        
        switch selectedRange {
        case .weekly:
            guard let interval = calendar.dateInterval(of: .weekOfYear, for: currentDate) else { return "" }
            formatter.dateFormat = "M/d"
            let start = formatter.string(from: interval.start)
            let end = formatter.string(from: calendar.date(byAdding: .day, value: 6, to: interval.start) ?? interval.end)
            return "\(start) - \(end) (本週)"
        case .monthly:
            formatter.dateFormat = "yyyy 年 M 月"
            return formatter.string(from: currentDate)
        case .yearly:
            formatter.dateFormat = "yyyy 年度"
            return formatter.string(from: currentDate)
        }
    }
    
    private func stepDate(by delta: Int) {
        withAnimation {
            switch selectedRange {
            case .weekly:
                currentDate = calendar.date(byAdding: .weekOfYear, value: delta, to: currentDate) ?? currentDate
            case .monthly:
                currentDate = calendar.date(byAdding: .month, value: delta, to: currentDate) ?? currentDate
            case .yearly:
                currentDate = calendar.date(byAdding: .year, value: delta, to: currentDate) ?? currentDate
            }
        }
    }
    
    // MARK: - KPI 指標卡片
    private func kpiSummaryGrid(stats: AccountingPeriodStats) -> some View {
        VStack(spacing: 10) {
            HStack(spacing: 12) {
                kpiCard(
                    title: "總支出",
                    amount: stats.totalExpense,
                    color: .red,
                    icon: "arrow.up.circle.fill"
                )
                kpiCard(
                    title: "總收入",
                    amount: stats.totalIncome,
                    color: .green,
                    icon: "arrow.down.circle.fill"
                )
            }
            
            HStack(spacing: 12) {
                kpiCard(
                    title: "淨結餘",
                    amount: stats.netBalance,
                    color: stats.netBalance >= 0 ? .indigo : .orange,
                    icon: "banknote.fill"
                )
                kpiCard(
                    title: "日均支出",
                    amount: stats.dailyAverageExpense,
                    color: .secondary,
                    icon: "calendar.badge.clock"
                )
            }
            
            // 理性消費指數卡片
            VStack(alignment: .leading, spacing: 4) {
                HStack {
                    Image(systemName: "sparkles")
                        .foregroundColor(stats.rationalBadgeColor)
                    Text("週期理性消費指數")
                        .font(.caption.weight(.semibold))
                        .foregroundColor(.primary)
                    Spacer()
                    Text(String(format: "%.1f / 10 分", stats.averageRationalScore))
                        .font(.subheadline.weight(.bold))
                        .foregroundColor(stats.rationalBadgeColor)
                }
                Text(stats.rationalEvaluationText)
                    .font(.caption2)
                    .foregroundColor(.secondary)
            }
            .padding(12)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Color(.secondarySystemBackground))
            .cornerRadius(12)
        }
    }
    
    private func kpiCard(title: String, amount: Double, color: Color, icon: String) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Image(systemName: icon)
                    .foregroundColor(color)
                    .font(.caption)
                Text(title)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            
            Text("$\(Int(amount))")
                .font(.system(size: 20, weight: .bold, design: .rounded))
                .foregroundColor(color)
                .lineLimit(1)
                .minimumScaleFactor(0.8)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(14)
        .background(Color(.secondarySystemBackground))
        .cornerRadius(14)
    }
    
    // MARK: - 支出分析區塊
    private func expenseBreakdownSection(stats: AccountingPeriodStats) -> some View {
        VStack(alignment: .leading, spacing: 14) {
            if stats.expenseByCategory.isEmpty {
                emptyPlaceholder(title: "此期間尚無任何支出紀錄")
            } else {
                // 圓餅/環形圖 (SectorMark)
                VStack(spacing: 8) {
                    Chart(stats.expenseByCategory) { item in
                        SectorMark(
                            angle: .value("金額", item.amount),
                            innerRadius: .ratio(0.55),
                            angularInset: 1.5
                        )
                        .cornerRadius(4)
                        .foregroundStyle(item.color)
                    }
                    .frame(height: 190)
                    .padding(.top, 10)
                    
                    Text("總計：$\(Int(stats.totalExpense))")
                        .font(.caption.weight(.bold))
                        .foregroundColor(.secondary)
                }
                .frame(maxWidth: .infinity)
                .padding()
                .background(Color(.secondarySystemBackground))
                .cornerRadius(16)
                
                // 分類排行榜
                VStack(spacing: 12) {
                    Text("支出類別排行榜")
                        .font(.headline)
                        .frame(maxWidth: .infinity, alignment: .leading)
                    
                    ForEach(stats.expenseByCategory) { cat in
                        VStack(spacing: 6) {
                            HStack {
                                Image(systemName: cat.iconName)
                                    .font(.caption.weight(.bold))
                                    .foregroundColor(.white)
                                    .frame(width: 24, height: 24)
                                    .background(cat.color)
                                    .clipShape(Circle())
                                
                                Text(cat.name)
                                    .font(.subheadline.weight(.medium))
                                
                                Spacer()
                                
                                Text("\(Int(cat.percentage * 100))%")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                                
                                Text("$\(Int(cat.amount))")
                                    .font(.subheadline.weight(.bold))
                            }
                            
                            // 進度條
                            GeometryReader { geo in
                                ZStack(alignment: .leading) {
                                    Capsule()
                                        .fill(Color(.tertiarySystemBackground))
                                        .frame(height: 6)
                                    
                                    Capsule()
                                        .fill(cat.color)
                                        .frame(width: max(4, geo.size.width * CGFloat(cat.percentage)), height: 6)
                                }
                            }
                            .frame(height: 6)
                        }
                        .padding(.vertical, 2)
                    }
                }
                .padding()
                .background(Color(.secondarySystemBackground))
                .cornerRadius(16)
            }
        }
    }
    
    // MARK: - 收入分析區塊
    private func incomeBreakdownSection(stats: AccountingPeriodStats) -> some View {
        VStack(alignment: .leading, spacing: 14) {
            if stats.incomeByCategory.isEmpty {
                emptyPlaceholder(title: "此期間尚無任何收入紀錄")
            } else {
                VStack(spacing: 12) {
                    Text("收入來源明細")
                        .font(.headline)
                        .frame(maxWidth: .infinity, alignment: .leading)
                    
                    ForEach(stats.incomeByCategory) { cat in
                        VStack(spacing: 6) {
                            HStack {
                                Image(systemName: cat.iconName)
                                    .font(.caption.weight(.bold))
                                    .foregroundColor(.white)
                                    .frame(width: 24, height: 24)
                                    .background(cat.color)
                                    .clipShape(Circle())
                                
                                Text(cat.name)
                                    .font(.subheadline.weight(.medium))
                                
                                Spacer()
                                
                                Text("\(Int(cat.percentage * 100))%")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                                
                                Text("+\(Int(cat.amount))")
                                    .font(.subheadline.weight(.bold))
                                    .foregroundColor(.green)
                            }
                            
                            GeometryReader { geo in
                                ZStack(alignment: .leading) {
                                    Capsule()
                                        .fill(Color(.tertiarySystemBackground))
                                        .frame(height: 6)
                                    
                                    Capsule()
                                        .fill(cat.color)
                                        .frame(width: max(4, geo.size.width * CGFloat(cat.percentage)), height: 6)
                                }
                            }
                            .frame(height: 6)
                        }
                        .padding(.vertical, 2)
                    }
                }
                .padding()
                .background(Color(.secondarySystemBackground))
                .cornerRadius(16)
            }
        }
    }
    
    // MARK: - 支付方式分析
    private func paymentBreakdownSection(stats: AccountingPeriodStats) -> some View {
        VStack(alignment: .leading, spacing: 14) {
            if stats.paymentMethodBreakdown.isEmpty {
                emptyPlaceholder(title: "此期間無支付方式紀錄")
            } else {
                VStack(spacing: 12) {
                    Text("支付管道使用分佈")
                        .font(.headline)
                        .frame(maxWidth: .infinity, alignment: .leading)
                    
                    ForEach(stats.paymentMethodBreakdown) { pm in
                        HStack {
                            Image(systemName: pm.iconName)
                                .font(.subheadline)
                                .foregroundColor(.indigo)
                                .frame(width: 28, height: 28)
                                .background(Color.indigo.opacity(0.12))
                                .clipShape(Circle())
                            
                            Text(pm.name)
                                .font(.subheadline.weight(.medium))
                            
                            Spacer()
                            
                            Text("\(Int(pm.percentage * 100))%")
                                .font(.caption)
                                .foregroundColor(.secondary)
                            
                            Text("$\(Int(pm.amount))")
                                .font(.subheadline.weight(.bold))
                        }
                    }
                }
                .padding()
                .background(Color(.secondarySystemBackground))
                .cornerRadius(16)
            }
        }
    }
    
    private func emptyPlaceholder(title: String) -> some View {
        VStack(spacing: 8) {
            Image(systemName: "chart.pie")
                .font(.system(size: 36))
                .foregroundColor(.secondary.opacity(0.5))
            Text(title)
                .font(.subheadline)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 50)
        .background(Color(.secondarySystemBackground))
        .cornerRadius(16)
    }
}
