//
//  ShareExpenseRatingSheet.swift
//  Campus v1
//
//  Created for Campus v1.
//

import SwiftUI

struct ShareExpenseRatingSheet: View {
    @Environment(\.dismiss) var dismiss
    @EnvironmentObject var dataManager: DataManager
    
    @State private var selectedItemForRating: TransactionItem? = nil
    @State private var inputRating: Double = 8
    @State private var inputFeedback: String = ""
    
    private var todayExpenses: [TransactionItem] {
        let calendar = Calendar.current
        let today = Date()
        return dataManager.transactions.filter {
            $0.type == .expense && calendar.isDate($0.date, inSameDayAs: today)
        }
    }
    
    private var shareMessage: String {
        dataManager.shareTodayExpenseSummary()
    }
    
    var body: some View {
        NavigationStack {
            List {
                // 1. 分享開關與提醒好友區塊
                Section {
                    VStack(alignment: .leading, spacing: 10) {
                        Toggle(isOn: Binding(
                            get: { dataManager.isSharingTodayExpense },
                            set: { dataManager.toggleShareTodayExpense($0) }
                        )) {
                            HStack(spacing: 8) {
                                Image(systemName: "person.2.wave.2.fill")
                                    .foregroundColor(.indigo)
                                VStack(alignment: .leading, spacing: 2) {
                                    Text("分享今日花費給好友")
                                        .font(.headline)
                                    Text(dataManager.isSharingTodayExpense ? "目前狀態：公開給好友評審" : "目前狀態：私人隱藏")
                                        .font(.caption)
                                        .foregroundColor(.secondary)
                                }
                            }
                        }
                        .tint(.indigo)
                        
                        Text("將評價花錢理性的權力交給好友！讓朋友從 1 到 10 分評判每筆花費是否理性，杜絕衝動購物。")
                            .font(.caption)
                            .foregroundColor(.secondary)
                        
                        Divider()
                            .padding(.vertical, 4)
                        
                        // 提醒好友評分按鈕 (原生分享卡片)
                        ShareLink(
                            item: shareMessage,
                            subject: Text("請幫我評審今天的花費！"),
                            message: Text(shareMessage)
                        ) {
                            HStack {
                                Spacer()
                                Image(systemName: "bell.badge.fill")
                                    .font(.subheadline)
                                Text("🔔 提醒好友評分 (一鍵發送今日清單)")
                                    .font(.subheadline.weight(.bold))
                                Spacer()
                            }
                            .padding(.vertical, 10)
                            .background(Color.indigo)
                            .foregroundColor(.white)
                            .cornerRadius(10)
                        }
                    }
                    .padding(.vertical, 6)
                } header: {
                    Text("花費分享與評審機制")
                }
                
                // 2. 今日開銷清單與評審打分
                Section {
                    if todayExpenses.isEmpty {
                        HStack {
                            Spacer()
                            VStack(spacing: 8) {
                                Image(systemName: "cart.badge.questionmark")
                                    .font(.system(size: 32))
                                    .foregroundColor(.secondary)
                                Text("今日尚無任何支出項目")
                                    .font(.subheadline)
                                    .foregroundColor(.secondary)
                            }
                            .padding(.vertical, 20)
                            Spacer()
                        }
                    } else {
                        ForEach(todayExpenses) { item in
                            VStack(alignment: .leading, spacing: 8) {
                                HStack(spacing: 12) {
                                    Image(systemName: item.categoryIcon)
                                        .font(.system(size: 16, weight: .bold))
                                        .foregroundColor(.white)
                                        .frame(width: 36, height: 36)
                                        .background(item.color)
                                        .clipShape(Circle())
                                    
                                    VStack(alignment: .leading, spacing: 2) {
                                        Text(item.categoryName)
                                            .font(.subheadline.weight(.semibold))
                                        if !item.notes.isEmpty {
                                            Text(item.notes)
                                                .font(.caption2)
                                                .foregroundColor(.secondary)
                                        }
                                    }
                                    
                                    Spacer()
                                    
                                    Text("-$\(Int(item.amount))")
                                        .font(.subheadline.weight(.bold))
                                        .foregroundColor(.red)
                                }
                                
                                Divider()
                                
                                HStack {
                                    // 自評分數
                                    HStack(spacing: 4) {
                                        Text("自評:")
                                            .font(.caption2)
                                            .foregroundColor(.secondary)
                                        Text("\(item.valueScore)分")
                                            .font(.caption2.weight(.bold))
                                            .foregroundColor(item.valueScoreColor)
                                    }
                                    
                                    Spacer()
                                    
                                    // 好友打分顯示
                                    if let peer = item.peerRating {
                                        HStack(spacing: 4) {
                                            Image(systemName: "person.crop.circle.badge.checkmark")
                                                .foregroundColor(.purple)
                                            Text("好友評: \(Int(peer))分")
                                                .font(.caption2.weight(.bold))
                                                .foregroundColor(.purple)
                                        }
                                        .padding(.horizontal, 6)
                                        .padding(.vertical, 2)
                                        .background(Color.purple.opacity(0.12))
                                        .clipShape(Capsule())
                                    }
                                    
                                    Button {
                                        selectedItemForRating = item
                                        inputRating = item.peerRating ?? 8
                                        inputFeedback = item.peerFeedback ?? ""
                                    } label: {
                                        Text(item.peerRating == nil ? "協助打分" : "修改評分")
                                            .font(.caption2.weight(.bold))
                                            .foregroundColor(.indigo)
                                            .padding(.horizontal, 8)
                                            .padding(.vertical, 3)
                                            .background(Color.indigo.opacity(0.12))
                                            .cornerRadius(6)
                                    }
                                    .buttonStyle(.plain)
                                }
                                
                                if let feedback = item.peerFeedback, !feedback.isEmpty {
                                    HStack(alignment: .top, spacing: 4) {
                                        Image(systemName: "quote.opening")
                                            .font(.system(size: 9))
                                            .foregroundColor(.purple)
                                        Text("好友點評：\(feedback)")
                                            .font(.caption2)
                                            .foregroundColor(.purple)
                                    }
                                    .padding(6)
                                    .background(Color.purple.opacity(0.06))
                                    .cornerRadius(6)
                                }
                            }
                            .padding(.vertical, 4)
                        }
                    }
                } header: {
                    Text("今日消費明細與評價列表 (共 $\(Int(dataManager.todayExpense)))")
                }
            }
            .navigationTitle("今日花費好友評審")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("完成") { dismiss() }
                }
            }
            .sheet(item: $selectedItemForRating) { item in
                NavigationStack {
                    Form {
                        Section("消費項目") {
                            HStack {
                                Text(item.categoryName)
                                    .font(.headline)
                                Spacer()
                                Text("$\(Int(item.amount))")
                                    .font(.headline)
                                    .foregroundColor(.red)
                            }
                            if !item.notes.isEmpty {
                                Text("備註：\(item.notes)")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }
                        }
                        
                        Section("好友理性度打分 (1 ~ 10 分)") {
                            VStack(spacing: 8) {
                                HStack {
                                    Text("\(Int(inputRating)) 分")
                                        .font(.title2.weight(.bold))
                                        .foregroundColor(ratingColor(inputRating))
                                    
                                    Spacer()
                                    
                                    Text(ratingText(inputRating))
                                        .font(.subheadline.weight(.semibold))
                                        .foregroundColor(ratingColor(inputRating))
                                }
                                
                                Slider(value: $inputRating, in: 1...10, step: 1)
                                    .tint(ratingColor(inputRating))
                            }
                            .padding(.vertical, 4)
                        }
                        
                        Section("好友評語 / 吐槽建議") {
                            TextField("例如：這杯手搖可以忍一忍！或是超值推薦！", text: $inputFeedback, axis: .vertical)
                                .lineLimit(3...5)
                        }
                    }
                    .navigationTitle("為好友打分")
                    .navigationBarTitleDisplayMode(.inline)
                    .toolbar {
                        ToolbarItem(placement: .cancellationAction) {
                            Button("取消") { selectedItemForRating = nil }
                        }
                        ToolbarItem(placement: .confirmationAction) {
                            Button("確認打分") {
                                dataManager.rateFriendTransaction(
                                    id: item.id,
                                    rating: inputRating,
                                    feedback: inputFeedback
                                )
                                selectedItemForRating = nil
                            }
                        }
                    }
                }
                .presentationDetents([.medium, .large])
            }
        }
    }
    
    private func ratingText(_ score: Double) -> String {
        switch score {
        case 9...10: return "絕對理性！必買神作"
        case 7...8: return "很理性，非常值得"
        case 5...6: return "平平常常，尚可接受"
        case 3...4: return "有點衝動，下次想想"
        default: return "太盤了！請剁手警告"
        }
    }
    
    private func ratingColor(_ score: Double) -> Color {
        switch score {
        case 7...10: return .green
        case 5..<7: return .orange
        default: return .red
        }
    }
}
