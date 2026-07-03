import SwiftUI

extension Color {
    // Brand
    static let forgeRed = Color(light: .init(hex: 0xE8192C), dark: .init(hex: 0xFF2D3F))
    static let tanrenBg = Color(light: .init(hex: 0xFFFFFF), dark: .init(hex: 0x0A0A0A))
    static let tanrenSurface = Color(light: .init(hex: 0xFAFAFA), dark: .init(hex: 0x141414))
    static let tanrenText = Color(light: .init(hex: 0x000000), dark: .init(hex: 0xFFFFFF))
    static let tanrenTextDim = Color(light: .init(hex: 0x555555), dark: .init(hex: 0xAAAAAA))
    static let tanrenTextMute = Color(light: .init(hex: 0x888888), dark: .init(hex: 0x888888))
    static let tanrenBorder = Color(light: .init(hex: 0xE5E5E5), dark: .init(hex: 0x222222))
    static let tanrenAmber = Color(light: .init(hex: 0xD98E00), dark: .init(hex: 0xF59E0B))
    static let tanrenGreen = Color(light: .init(hex: 0x1A7F2C), dark: .init(hex: 0x22C55E))

    init(light: UIColor, dark: UIColor) {
        self.init(uiColor: UIColor { traits in
            traits.userInterfaceStyle == .dark ? dark : light
        })
    }
}

extension UIColor {
    convenience init(hex: UInt32, alpha: CGFloat = 1.0) {
        self.init(
            red: CGFloat((hex >> 16) & 0xFF) / 255.0,
            green: CGFloat((hex >> 8) & 0xFF) / 255.0,
            blue: CGFloat(hex & 0xFF) / 255.0,
            alpha: alpha
        )
    }
}
