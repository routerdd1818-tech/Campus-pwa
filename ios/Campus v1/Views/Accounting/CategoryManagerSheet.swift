//
//  CategoryManagerSheet.swift
//  Campus v1
//

import SwiftUI

struct CategoryManagerSheet: View {
    @Environment(\.dismiss) var dismiss
    @EnvironmentObject var dataManager: DataManager
    
    @State private var selectedTab: TransactionType = .expense
    @State private var showingAddCategory = false
    
    // 新增類別表單狀態
    @State private var newName: String = ""
    @State private var newType: TransactionType = .expense
    @State private var selectedIcon: String = "cart.fill"
    @State private var selectedColorHex: String = "#6366F1"
    
    private let availableIcons = [
        "fork.knife", "cup.and.saucer.fill", "car.fill", "bus.fill",
        "book.closed.fill", "books.vertical.fill", "gamecontroller.fill", "film.fill",
        "bag.fill", "cart.fill", "tshirt.fill", "house.fill",
        "cross.case.fill", "pills.fill", "laptopcomputer", "iphone",
        "dumbbell.fill", "pawprint.fill", "airplane", "gift.fill",
        "dollarsign.circle.fill", "banknote.fill", "creditcard.fill", "graduationcap.fill"
    ]
    
    private let availableColors = [
        "#F59E0B", "#3B82F6", "#10B981", "#EC4899",
        "#8B5CF6", "#6366F1", "#EF4444", "#14B8A6",
        "#06B6D4", "#F97316", "#64748B", "#84CC16"
    ]
    
    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                Picker("類型", selection: $selectedTab) {
                    Text("支出類別").tag(TransactionType.expense)
                    Text("收入類別").tag(TransactionType.income)
                }
                .pickerStyle(.segmented)
                .padding()
                
                List {
                    Section {
                        let filtered = dataManager.categories.filter { $0.type == selectedTab }
                        ForEach(filtered) { cat in
                            HStack(spacing: 12) {
                                Image(systemName: cat.iconName)
                                    .font(.system(size: 16, weight: .bold))
                                    .foregroundColor(.white)
                                    .frame(width: 32, height: 32)
                                    .background(cat.color)
                                    .clipShape(Circle())
                                
                                Text(cat.name)
                                    .font(.body)
                                
                                Spacer()
                                
                                if cat.isSystem {
                                    Text("內建")
                                        .font(.caption2)
                                        .padding(.horizontal, 6)
                                        .padding(.vertical, 2)
                                        .background(Color(.secondarySystemBackground))
                                        .foregroundColor(.secondary)
                                        .clipShape(Capsule())
                                }
                            }
                            .padding(.vertical, 2)
                        }
                        .onDelete(perform: deleteCategory)
                    } header: {
                        Text("現有類別 (左滑可刪除自訂類別)")
                    }
                }
            }
            .navigationTitle("類別管理")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("關閉") { dismiss() }
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        newType = selectedTab
                        showingAddCategory = true
                    } label: {
                        Label("新增", systemImage: "plus")
                    }
                }
            }
            .sheet(isPresented: $showingAddCategory) {
                addCategorySheet
            }
        }
    }
    
    private func deleteCategory(at offsets: IndexSet) {
        let filtered = dataManager.categories.filter { $0.type == selectedTab }
        for index in offsets {
            let cat = filtered[index]
            if !cat.isSystem {
                dataManager.deleteCategory(id: cat.id)
            }
        }
    }
    
    // MARK: - 新增自訂類別視窗
    private var addCategorySheet: some View {
        NavigationStack {
            Form {
                Section("類別基本資訊") {
                    TextField("類別名稱 (如: 健身房、手搖飲)", text: $newName)
                    
                    Picker("收支類型", selection: $newType) {
                        Text("支出").tag(TransactionType.expense)
                        Text("收入").tag(TransactionType.income)
                    }
                    .pickerStyle(.segmented)
                }
                
                Section("選擇圖示") {
                    LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 10), count: 6), spacing: 12) {
                        ForEach(availableIcons, id: \.self) { icon in
                            Button {
                                selectedIcon = icon
                            } label: {
                                Image(systemName: icon)
                                    .font(.system(size: 20))
                                    .foregroundColor(selectedIcon == icon ? .white : .primary)
                                    .frame(width: 44, height: 44)
                                    .background(selectedIcon == icon ? Color(hex: selectedColorHex) : Color(.tertiarySystemBackground))
                                    .clipShape(Circle())
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .padding(.vertical, 6)
                }
                
                Section("選擇代表色") {
                    LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 10), count: 6), spacing: 12) {
                        ForEach(availableColors, id: \.self) { hex in
                            Button {
                                selectedColorHex = hex
                            } label: {
                                ZStack {
                                    Circle()
                                        .fill(Color(hex: hex))
                                        .frame(width: 36, height: 36)
                                    
                                    if selectedColorHex == hex {
                                        Image(systemName: "checkmark")
                                            .font(.caption.weight(.bold))
                                            .foregroundColor(.white)
                                    }
                                }
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .padding(.vertical, 6)
                }
            }
            .navigationTitle("新增自訂類別")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("取消") { showingAddCategory = false }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("儲存") {
                        saveNewCategory()
                    }
                    .disabled(newName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                }
            }
        }
        .presentationDetents([.medium, .large])
    }
    
    private func saveNewCategory() {
        let trimmed = newName.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }
        
        let newCat = AccountingCategory(
            name: trimmed,
            type: newType,
            iconName: selectedIcon,
            colorHex: selectedColorHex,
            isSystem: false
        )
        dataManager.addCategory(newCat)
        newName = ""
        showingAddCategory = false
    }
}
