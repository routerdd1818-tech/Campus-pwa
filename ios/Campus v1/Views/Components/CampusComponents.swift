//
//  CampusComponents.swift
//  Campus v1
//

import SwiftUI

// MARK: - 顏色十六進位擴充
extension Color {
    public init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 3: // RGB (12-bit)
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6: // RGB (24-bit)
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8: // ARGB (32-bit)
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (255, 230, 126, 34) // 預設三花貓暖橘
        }
        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue:  Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
}

// MARK: - 🐱 三花貓（可樂）× iOS 27 Liquid Glass 溫暖流體玻璃設計系統
public struct CalicoTheme {
    /// 三花貓暖橘主色 (Warm Calico Orange)
    public static let warmOrange = Color(hex: "#E67E22")
    /// 焦糖奶橘 (Caramel Amber)
    public static let caramel = Color(hex: "#F39C12")
    /// 三花貓可可深褐斑塊 (Cocoa Patch Brown)
    public static let cocoaBrown = Color(hex: "#5C3D2E")
    /// 貓咪肉球珊瑚粉 (Paw Pad Pink)
    public static let pawPink = Color(hex: "#F0788C")
    /// 溫暖鼠尾草綠 (Cozy Sage Green)
    public static let sageGreen = Color(hex: "#2E9E7B")
    /// iOS 27 天空冰晶藍
    public static let crystalBlue = Color(hex: "#4A90E2")
    
    /// iOS 27 三花貓主色流體漸層
    public static var accentGradient: LinearGradient {
        LinearGradient(
            colors: [Color(hex: "#F39C12"), Color(hex: "#E67E22"), Color(hex: "#EC7063")],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
    }
    
    /// iOS 27 Liquid Glass 高光折射邊框漸層
    public static var glassBorderGradient: LinearGradient {
        LinearGradient(
            colors: [
                Color.white.opacity(0.90),
                CalicoTheme.warmOrange.opacity(0.32),
                CalicoTheme.pawPink.opacity(0.22),
                Color.white.opacity(0.50)
            ],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
    }
    
    /// 溫暖奶茶米白頁面背景（支援深色模式自動切換為溫暖深可可色）
    public static let warmPageBackground: Color = Color(UIColor { trait in
        if trait.userInterfaceStyle == .dark {
            return UIColor(red: 0.09, green: 0.08, blue: 0.08, alpha: 1.0)
        } else {
            return UIColor(red: 0.985, green: 0.968, blue: 0.942, alpha: 1.0) // #FBF7F0 iOS 27 溫暖空間底色
        }
    })
    
    /// 溫暖象牙白卡片背景（支援深色模式自動切換）
    public static let warmCardBackground: Color = Color(UIColor { trait in
        if trait.userInterfaceStyle == .dark {
            return UIColor(red: 0.16, green: 0.14, blue: 0.13, alpha: 0.94)
        } else {
            return UIColor(red: 1.0, green: 0.994, blue: 0.985, alpha: 0.94) // iOS 27 高分子暖白流體玻璃基底
        }
    })
    
    /// 溫暖次級區塊底色
    public static let warmSecondaryBackground: Color = Color(UIColor { trait in
        if trait.userInterfaceStyle == .dark {
            return UIColor(red: 0.22, green: 0.18, blue: 0.16, alpha: 0.86)
        } else {
            return UIColor(red: 0.965, green: 0.938, blue: 0.902, alpha: 0.86) // #F6EFE6 燕麥米色玻璃
        }
    })
}

// MARK: - 🌌 iOS 27 三花貓流體空間光暈背景 (CalicoSpatialBackground - GPU 單次紋理快取版)
public struct CalicoSpatialBackground: View {
    public init() {}
    
    public var body: some View {
        ZStack {
            CalicoTheme.warmPageBackground
            
            GeometryReader { geo in
                ZStack {
                    // 右上三花暖橘柔光球
                    Circle()
                        .fill(
                            RadialGradient(
                                colors: [CalicoTheme.warmOrange.opacity(0.18), CalicoTheme.caramel.opacity(0.06), .clear],
                                center: .center,
                                startRadius: 10,
                                endRadius: geo.size.width * 0.62
                            )
                        )
                        .frame(width: geo.size.width * 0.95, height: geo.size.width * 0.95)
                        .offset(x: geo.size.width * 0.32, y: -geo.size.height * 0.14)
                    
                    // 左中肉球珊瑚粉柔光球
                    Circle()
                        .fill(
                            RadialGradient(
                                colors: [CalicoTheme.pawPink.opacity(0.14), CalicoTheme.warmOrange.opacity(0.04), .clear],
                                center: .center,
                                startRadius: 10,
                                endRadius: geo.size.width * 0.55
                            )
                        )
                        .frame(width: geo.size.width * 0.85, height: geo.size.width * 0.85)
                        .offset(x: -geo.size.width * 0.34, y: geo.size.height * 0.18)
                    
                    // 右下鼠尾草綠與焦糖光暈
                    Circle()
                        .fill(
                            RadialGradient(
                                colors: [CalicoTheme.sageGreen.opacity(0.10), CalicoTheme.caramel.opacity(0.05), .clear],
                                center: .center,
                                startRadius: 10,
                                endRadius: geo.size.width * 0.58
                            )
                        )
                        .frame(width: geo.size.width * 0.9, height: geo.size.width * 0.9)
                        .offset(x: geo.size.width * 0.25, y: geo.size.height * 0.42)
                }
                .drawingGroup()
            }
            .allowsHitTesting(false)
        }
        .ignoresSafeArea()
    }
}

// MARK: - 常用配色盤（三花貓溫暖柔和色系）
public struct CampusColors {
    public static let palette: [String] = [
        "#E67E22", // 三花暖橘 (Calico Orange)
        "#EC7063", // 肉球珊瑚粉 (Coral Pink)
        "#2E9E7B", // 森林抹茶綠 (Warm Emerald)
        "#D4883A", // 焦糖琥珀 (Caramel)
        "#5C6BC0", // 溫暖丹寧藍 (Warm Denim)
        "#8D6E63", // 可可奶褐 (Cocoa Brown)
        "#AB47BC", // 莓果紫 (Berry Purple)
        "#26A69A"  // 湖水青綠 (Teal)
    ]
}

// MARK: - 🐾 三花貓（可樂）原生向量插畫元件 — iOS 27 立體玻璃光環版 (CalicoCatAvatar)
public enum CalicoMood {
    case happy      // 彎彎笑眼 ^ ^
    case normal     // 圓滾滾亮晶晶大眼
    case studying   // 認真陪伴模式
}

public struct CalicoCatAvatar: View {
    public var size: CGFloat = 48
    public var mood: CalicoMood = .normal
    
    public init(size: CGFloat = 48, mood: CalicoMood = .normal) {
        self.size = size
        self.mood = mood
    }
    
    public var body: some View {
        ZStack {
            // iOS 27 底部立體流體玻璃圓盤
            Circle()
                .fill(
                    LinearGradient(
                        colors: [Color(hex: "#FFF3E4"), Color(hex: "#FAD7B8"), Color(hex: "#F8C8A0")],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
                .frame(width: size, height: size)
                .overlay(
                    // iOS 27 頂部鏡面高光折射
                    Circle()
                        .fill(
                            LinearGradient(
                                colors: [Color.white.opacity(0.65), Color.clear],
                                startPoint: .topLeading,
                                endPoint: .center
                            )
                        )
                        .padding(size * 0.04)
                )
                .overlay(
                    Circle()
                        .strokeBorder(
                            LinearGradient(
                                colors: [Color.white.opacity(0.9), CalicoTheme.warmOrange.opacity(0.45), CalicoTheme.pawPink.opacity(0.35)],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            ),
                            lineWidth: max(1.2, size * 0.035)
                        )
                )
                .shadow(color: CalicoTheme.warmOrange.opacity(0.18), radius: size * 0.12, x: 0, y: size * 0.05)
            
            // 左耳（三花暖橘色）
            CatEarShape()
                .fill(
                    LinearGradient(
                        colors: [Color(hex: "#F39C12"), Color(hex: "#E67E22")],
                        startPoint: .top,
                        endPoint: .bottom
                    )
                )
                .frame(width: size * 0.34, height: size * 0.34)
                .rotationEffect(.degrees(-24))
                .offset(x: -size * 0.23, y: -size * 0.25)
            
            // 左內耳（肉球粉紅）
            CatEarShape()
                .fill(Color(hex: "#F7A8B8"))
                .frame(width: size * 0.18, height: size * 0.18)
                .rotationEffect(.degrees(-24))
                .offset(x: -size * 0.22, y: -size * 0.23)
            
            // 右耳（三花可可深褐色）
            CatEarShape()
                .fill(
                    LinearGradient(
                        colors: [Color(hex: "#5C4033"), Color(hex: "#4A3525")],
                        startPoint: .top,
                        endPoint: .bottom
                    )
                )
                .frame(width: size * 0.34, height: size * 0.34)
                .rotationEffect(.degrees(24))
                .offset(x: size * 0.23, y: -size * 0.25)
            
            // 右內耳（肉球粉紅）
            CatEarShape()
                .fill(Color(hex: "#F7A8B8"))
                .frame(width: size * 0.18, height: size * 0.18)
                .rotationEffect(.degrees(24))
                .offset(x: size * 0.22, y: -size * 0.23)
            
            // 貓咪圓臉主體（奶油白 + 雙色三花斑塊）
            ZStack {
                // 奶油白底臉
                Ellipse()
                    .fill(Color(hex: "#FFFDF9"))
                
                // 左上額頭暖橘斑塊
                Circle()
                    .fill(
                        LinearGradient(
                            colors: [Color(hex: "#F39C12"), Color(hex: "#E67E22")],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
                    .frame(width: size * 0.42, height: size * 0.38)
                    .offset(x: -size * 0.18, y: -size * 0.18)
                
                // 右上額頭與臉頰可可深褐斑塊
                Circle()
                    .fill(Color(hex: "#4A3525"))
                    .frame(width: size * 0.40, height: size * 0.36)
                    .offset(x: size * 0.19, y: -size * 0.17)
                
                // 左下暖橘小斑點
                Circle()
                    .fill(Color(hex: "#F39C12").opacity(0.85))
                    .frame(width: size * 0.18, height: size * 0.14)
                    .offset(x: -size * 0.28, y: size * 0.12)
            }
            .frame(width: size * 0.76, height: size * 0.68)
            .clipShape(Ellipse())
            .overlay(
                Ellipse()
                    .stroke(Color(hex: "#5C3D2E").opacity(0.22), lineWidth: max(1, size * 0.025))
            )
            .offset(y: size * 0.05)
            
            // 腮紅（粉嫩雙頰）
            HStack(spacing: size * 0.30) {
                Ellipse()
                    .fill(Color(hex: "#F58FA0").opacity(0.60))
                    .frame(width: size * 0.135, height: size * 0.072)
                Ellipse()
                    .fill(Color(hex: "#F58FA0").opacity(0.60))
                    .frame(width: size * 0.135, height: size * 0.072)
            }
            .offset(y: size * 0.11)
            
            // 眼睛
            HStack(spacing: size * 0.20) {
                catEye(size: size, mood: mood)
                catEye(size: size, mood: mood)
            }
            .offset(y: size * 0.03)
            
            // 粉紅小鼻頭與 ω 貓嘴
            VStack(spacing: 0) {
                // 倒三角粉紅鼻
                CatNoseShape()
                    .fill(Color(hex: "#F0788C"))
                    .frame(width: size * 0.09, height: size * 0.065)
                
                // ω 貓咪嘴巴
                CatMouthShape()
                    .stroke(Color(hex: "#4A352E"), style: StrokeStyle(lineWidth: max(1.2, size * 0.032), lineCap: .round, lineJoin: .round))
                    .frame(width: size * 0.18, height: size * 0.07)
            }
            .offset(y: size * 0.13)
        }
        .frame(width: size, height: size)
    }
    
    @ViewBuilder
    private func catEye(size: CGFloat, mood: CalicoMood) -> some View {
        switch mood {
        case .happy:
            CatHappyEyeShape()
                .stroke(Color(hex: "#3D2B1F"), style: StrokeStyle(lineWidth: max(1.5, size * 0.04), lineCap: .round))
                .frame(width: size * 0.12, height: size * 0.07)
        case .normal, .studying:
            ZStack(alignment: .topLeading) {
                Circle()
                    .fill(Color(hex: "#3D2B1F"))
                    .frame(width: size * 0.115, height: size * 0.115)
                Circle()
                    .fill(Color.white)
                    .frame(width: size * 0.045, height: size * 0.045)
                    .offset(x: size * 0.018, y: size * 0.018)
                Circle()
                    .fill(Color.white.opacity(0.75))
                    .frame(width: size * 0.022, height: size * 0.022)
                    .offset(x: size * 0.062, y: size * 0.062)
            }
        }
    }
}

// 貓耳幾何形狀
public struct CatEarShape: Shape {
    public func path(in rect: CGRect) -> Path {
        var path = Path()
        path.move(to: CGPoint(x: rect.midX, y: rect.minY))
        path.addQuadCurve(
            to: CGPoint(x: rect.maxX, y: rect.maxY),
            control: CGPoint(x: rect.maxX * 0.95, y: rect.midY * 0.7)
        )
        path.addLine(to: CGPoint(x: rect.minX, y: rect.maxY))
        path.addQuadCurve(
            to: CGPoint(x: rect.midX, y: rect.minY),
            control: CGPoint(x: rect.maxX * 0.05, y: rect.midY * 0.7)
        )
        path.closeSubpath()
        return path
    }
}

// 貓鼻倒三角形
public struct CatNoseShape: Shape {
    public func path(in rect: CGRect) -> Path {
        var path = Path()
        path.move(to: CGPoint(x: rect.minX, y: rect.minY))
        path.addLine(to: CGPoint(x: rect.maxX, y: rect.minY))
        path.addLine(to: CGPoint(x: rect.midX, y: rect.maxY))
        path.closeSubpath()
        return path
    }
}

// ω 貓嘴曲線
public struct CatMouthShape: Shape {
    public func path(in rect: CGRect) -> Path {
        var path = Path()
        path.move(to: CGPoint(x: rect.minX, y: rect.midY))
        path.addQuadCurve(
            to: CGPoint(x: rect.midX, y: rect.minY),
            control: CGPoint(x: rect.width * 0.25, y: rect.maxY)
        )
        path.addQuadCurve(
            to: CGPoint(x: rect.maxX, y: rect.midY),
            control: CGPoint(x: rect.width * 0.75, y: rect.maxY)
        )
        return path
    }
}

// 彎彎笑眼曲線
public struct CatHappyEyeShape: Shape {
    public func path(in rect: CGRect) -> Path {
        var path = Path()
        path.move(to: CGPoint(x: rect.minX, y: rect.maxY))
        path.addQuadCurve(
            to: CGPoint(x: rect.maxX, y: rect.maxY),
            control: CGPoint(x: rect.midX, y: rect.minY)
        )
        return path
    }
}

// MARK: - 🐾 三花貓肉球小標籤與裝飾水印
public struct CalicoPawStamp: View {
    public var color: Color = CalicoTheme.warmOrange
    public var size: CGFloat = 14
    
    public init(color: Color = CalicoTheme.warmOrange, size: CGFloat = 14) {
        self.color = color
        self.size = size
    }
    
    public var body: some View {
        Image(systemName: "pawprint.fill")
            .font(.system(size: size, weight: .bold))
            .foregroundColor(color)
            .rotationEffect(.degrees(-12))
    }
}

// MARK: - 💎 iOS 27 Liquid Glass × 三花貓流體玻璃卡片樣式 (CampusCardModifier)
public struct CampusCardModifier: ViewModifier {
    public var cornerRadius: CGFloat = 24
    public var padding: CGFloat = 16
    
    public init(cornerRadius: CGFloat = 24, padding: CGFloat = 16) {
        self.cornerRadius = cornerRadius
        self.padding = padding
    }
    
    public func body(content: Content) -> some View {
        content
            .padding(padding)
            .background(
                RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                    .fill(CalicoTheme.warmCardBackground)
                    .overlay(
                        // iOS 27 頂部鏡面流體高光層 (Specular Liquid Sheen)
                        RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                            .fill(
                                LinearGradient(
                                    colors: [
                                        Color.white.opacity(0.42),
                                        Color.white.opacity(0.08),
                                        Color.clear
                                    ],
                                    startPoint: .topLeading,
                                    endPoint: .bottomTrailing
                                )
                            )
                    )
                    .overlay(
                        RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                            .strokeBorder(CalicoTheme.glassBorderGradient, lineWidth: 1.15)
                    )
                    .shadow(color: CalicoTheme.cocoaBrown.opacity(0.055), radius: 10, x: 0, y: 4)
            )
    }
}

extension View {
    public func campusCardStyle(cornerRadius: CGFloat = 24, padding: CGFloat = 16) -> some View {
        self.modifier(CampusCardModifier(cornerRadius: cornerRadius, padding: padding))
    }
}

// MARK: - 優先度標籤 (iOS 27 膠囊光澤版)
public struct PriorityBadge: View {
    let priority: TodoPriority
    
    public init(priority: TodoPriority) {
        self.priority = priority
    }
    
    public var body: some View {
        HStack(spacing: 3.5) {
            Circle()
                .fill(priority.color)
                .frame(width: 6, height: 6)
            Text(priority.displayName)
                .font(.system(size: 11, weight: .semibold, design: .rounded))
                .foregroundColor(priority.color)
        }
        .padding(.horizontal, 7)
        .padding(.vertical, 3)
        .background(priority.color.opacity(0.13))
        .overlay(
            Capsule()
                .strokeBorder(priority.color.opacity(0.25), lineWidth: 0.8)
        )
        .clipShape(Capsule())
    }
}

// MARK: - 類別標籤 (iOS 27 膠囊光澤版)
public struct CategoryBadge: View {
    let category: TodoCategory
    
    public init(category: TodoCategory) {
        self.category = category
    }
    
    public var body: some View {
        HStack(spacing: 4) {
            Image(systemName: category.iconName)
                .font(.system(size: 10, weight: .semibold))
            Text(category.rawValue)
                .font(.system(size: 11, weight: .semibold, design: .rounded))
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 3.5)
        .foregroundColor(category.badgeColor)
        .background(category.badgeColor.opacity(0.13))
        .overlay(
            Capsule()
                .strokeBorder(category.badgeColor.opacity(0.25), lineWidth: 0.8)
        )
        .clipShape(Capsule())
    }
}

// MARK: - 三花貓溫暖空狀態視圖 (iOS 27 Liquid Glass EmptyStateView)
public struct EmptyStateView: View {
    let icon: String
    let title: String
    let subtitle: String
    
    public init(icon: String, title: String, subtitle: String) {
        self.icon = icon
        self.title = title
        self.subtitle = subtitle
    }
    
    public var body: some View {
        VStack(spacing: 14) {
            ZStack(alignment: .bottomTrailing) {
                CalicoCatAvatar(size: 76, mood: .happy)
                
                ZStack {
                    Circle()
                        .fill(CalicoTheme.accentGradient)
                        .frame(width: 28, height: 28)
                        .shadow(color: CalicoTheme.warmOrange.opacity(0.3), radius: 4, y: 2)
                    Image(systemName: "pawprint.fill")
                        .font(.system(size: 12, weight: .bold))
                        .foregroundColor(.white)
                }
                .offset(x: 4, y: 4)
            }
            
            Text(title)
                .font(.system(.headline, design: .rounded).weight(.bold))
                .foregroundColor(.primary)
            
            Text(subtitle)
                .font(.system(.subheadline, design: .rounded))
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 34)
        .padding(.horizontal, 24)
        .background(
            RoundedRectangle(cornerRadius: 26, style: .continuous)
                .fill(CalicoTheme.warmCardBackground)
                .overlay(
                    RoundedRectangle(cornerRadius: 26, style: .continuous)
                        .strokeBorder(CalicoTheme.glassBorderGradient, lineWidth: 1.2)
                )
                .shadow(color: CalicoTheme.cocoaBrown.opacity(0.05), radius: 10, x: 0, y: 4)
        )
        .padding(.horizontal, 20)
    }
}

extension View {
    func hideKeyboard() {
        UIApplication.shared.sendAction(#selector(UIResponder.resignFirstResponder), to: nil, from: nil, for: nil)
    }
}
