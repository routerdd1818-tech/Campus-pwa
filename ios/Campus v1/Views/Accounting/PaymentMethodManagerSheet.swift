//
//  PaymentMethodManagerSheet.swift
//  Campus v1
//

import SwiftUI

struct PaymentMethodManagerSheet: View {
    @Environment(\.dismiss) var dismiss
    @EnvironmentObject var dataManager: DataManager
    
    @State private var showingAddMethod = false
    @State private var newName: String = ""
    @State private var selectedIcon: String = "creditcard.fill"
    
    private let availableIcons = [
        "banknote.fill", "creditcard.fill", "iphone.radiowaves.left.and.right",
        "building.columns.fill", "wave.3.forward.circle.fill", "wallet.pass.fill",
        "qrcode", "centsign.circle.fill", "dollarsign.circle.fill", "ellipsis.circle"
    ]
    
    var body: some View {
        NavigationStack {
            List {
                Section {
                    ForEach(dataManager.paymentMethods) { method in
                        HStack(spacing: 12) {
                            Image(systemName: method.iconName)
                                .font(.system(size: 16))
                                .foregroundColor(.indigo)
                                .frame(width: 32, height: 32)
                                .background(Color.indigo.opacity(0.12))
                                .clipShape(Circle())
                            
                            Text(method.name)
                                .font(.body)
                            
                            Spacer()
                            
                            if method.isSystem {
                                Text("預設")
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
                    .onDelete(perform: deleteMethod)
                } header: {
                    Text("現有支付方式 (左滑可刪除自訂項目)")
                }
            }
            .navigationTitle("支付方式管理")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("關閉") { dismiss() }
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        showingAddMethod = true
                    } label: {
                        Label("新增", systemImage: "plus")
                    }
                }
            }
            .sheet(isPresented: $showingAddMethod) {
                addMethodSheet
            }
        }
    }
    
    private func deleteMethod(at offsets: IndexSet) {
        for index in offsets {
            let method = dataManager.paymentMethods[index]
            if !method.isSystem {
                dataManager.deletePaymentMethod(id: method.id)
            }
        }
    }
    
    private var addMethodSheet: some View {
        NavigationStack {
            Form {
                Section("名稱") {
                    TextField("自訂支付名稱 (如: 街口支付、悠遊付)", text: $newName)
                }
                
                Section("圖示") {
                    LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 10), count: 5), spacing: 12) {
                        ForEach(availableIcons, id: \.self) { icon in
                            Button {
                                selectedIcon = icon
                            } label: {
                                Image(systemName: icon)
                                    .font(.system(size: 20))
                                    .foregroundColor(selectedIcon == icon ? .white : .indigo)
                                    .frame(width: 44, height: 44)
                                    .background(selectedIcon == icon ? Color.indigo : Color.indigo.opacity(0.12))
                                    .clipShape(Circle())
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .padding(.vertical, 6)
                }
            }
            .navigationTitle("新增支付方式")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("取消") { showingAddMethod = false }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("儲存") {
                        saveMethod()
                    }
                    .disabled(newName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                }
            }
        }
        .presentationDetents([.medium])
    }
    
    private func saveMethod() {
        let trimmed = newName.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }
        
        let newMethod = PaymentMethod(name: trimmed, iconName: selectedIcon, isSystem: false)
        dataManager.addPaymentMethod(newMethod)
        newName = ""
        showingAddMethod = false
    }
}
