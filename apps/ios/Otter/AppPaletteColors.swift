import OtterKit
import SwiftUI
import UIKit

extension AppPalette {
    /// Text and control accents retain contrast on standard grouped backgrounds.
    var accessibleTint: Color {
        let pair: (UInt32, UInt32)
        switch self {
        case .forest: pair = (0x1B6E45, 0x8BE0B1)
        case .parchment: pair = (0x705038, 0xE2C1A7)
        case .ocean: pair = (0x005EA9, 0x70B8FF)
        case .lavender: pair = (0x7235A8, 0xD1AFEF)
        case .sunset: pair = (0xA53B00, 0xFFB381)
        case .rose: pair = (0xAA1F73, 0xFF8DCC)
        }
        return Color(
            uiColor: UIColor { traits in
                let rgb = traits.userInterfaceStyle == .dark ? pair.1 : pair.0
                return UIColor(
                    red: CGFloat((rgb >> 16) & 255) / 255,
                    green: CGFloat((rgb >> 8) & 255) / 255,
                    blue: CGFloat(rgb & 255) / 255, alpha: 1)
            })
    }
}
