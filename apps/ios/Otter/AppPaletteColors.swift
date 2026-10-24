import OtterKit
import SwiftUI
import UIKit

/// Semantic roles match the web Radix gray and accent families.
struct OtterColors {
    let background: Color
    let surface: Color
    let text: Color
    let secondaryText: Color
    let border: Color
    let softAccent: Color
    let accentText: Color
    let primary: Color
    let primaryText: Color
    let destructive: Color
}

extension AppPalette {
    var colors: OtterColors {
        let gray: NativeGray
        let accent: NativeAccent
        switch self {
        case .forest: (gray, accent) = (.sage, .green)
        case .parchment: (gray, accent) = (.sand, .green)
        case .ocean: (gray, accent) = (.slate, .blue)
        case .lavender: (gray, accent) = (.mauve, .violet)
        case .sunset: (gray, accent) = (.sand, .orange)
        case .rose: (gray, accent) = (.mauve, .crimson)
        }
        let neutral = gray.values
        let tint = accent.values
        return OtterColors(
            background: self == .parchment ? adaptiveColor(0xF5F3ED, 0x211F1C) : neutral.background,
            surface: self == .parchment
                ? adaptiveColor(0xFDFCF5, 0x151310) : adaptiveColor(0xFFFFFF, neutral.darkSurface),
            text: self == .parchment ? adaptiveColor(0x1C2024, 0xEDEEF0) : neutral.text,
            secondaryText: self == .parchment
                ? adaptiveColor(0x60646C, 0xB0B4BA) : neutral.secondary,
            border: neutral.border,
            softAccent: self == .parchment ? adaptiveColor(0xEBF3ED, 0x1A2821) : tint.soft,
            accentText: tint.text,
            primary: self == .parchment ? adaptiveColor(0x218358, 0x3DD68C) : tint.primary,
            primaryText: adaptiveColor(neutral.lightForeground, neutral.darkForeground),
            destructive: adaptiveColor(0xCE2C31, 0xFF9592))
    }

    /// Native controls also need contrast on the system's grouped backgrounds.
    var accessibleTint: Color {
        switch self {
        case .forest, .parchment: adaptiveColor(0x1B6E45, 0x8BE0B1)
        case .ocean: adaptiveColor(0x005EA9, 0x70B8FF)
        case .lavender: adaptiveColor(0x6550B9, 0xBAA7FF)
        case .sunset: adaptiveColor(0xA53B00, 0xFFB381)
        case .rose: adaptiveColor(0xAA1F73, 0xFF8DCC)
        }
    }
}

private struct NeutralValues {
    let background: Color
    let text: Color
    let secondary: Color
    let border: Color
    let darkSurface: UInt32
    let lightForeground: UInt32
    let darkForeground: UInt32
}

private enum NativeGray {
    case sage, sand, slate, mauve

    var values: NeutralValues {
        switch self {
        case .sage:
            NeutralValues(
                background: adaptiveColor(0xF7F9F8, 0x171918),
                text: adaptiveColor(0x1A211E, 0xECEEED),
                secondary: adaptiveColor(0x5F6563, 0xADB5B2),
                border: adaptiveColor(0xD7DAD9, 0x373B39),
                darkSurface: 0x171918, lightForeground: 0xFBFDFC, darkForeground: 0x101211)
        case .sand:
            NeutralValues(
                background: adaptiveColor(0xF9F9F8, 0x191918),
                text: adaptiveColor(0x21201C, 0xEEEEEC),
                secondary: adaptiveColor(0x63635E, 0xB5B3AD),
                border: adaptiveColor(0xDAD9D6, 0x3B3A37),
                darkSurface: 0x191918, lightForeground: 0xFDFDFC, darkForeground: 0x111110)
        case .slate:
            NeutralValues(
                background: adaptiveColor(0xF9F9FB, 0x18191B),
                text: adaptiveColor(0x1C2024, 0xEDEEF0),
                secondary: adaptiveColor(0x60646C, 0xB0B4BA),
                border: adaptiveColor(0xD9D9E0, 0x363A3F),
                darkSurface: 0x18191B, lightForeground: 0xFCFCFD, darkForeground: 0x111113)
        case .mauve:
            NeutralValues(
                background: adaptiveColor(0xFAF9FB, 0x1A191B),
                text: adaptiveColor(0x211F26, 0xEEEEF0),
                secondary: adaptiveColor(0x65636D, 0xB5B2BC),
                border: adaptiveColor(0xDBD8E0, 0x3C393F),
                darkSurface: 0x1A191B, lightForeground: 0xFDFCFD, darkForeground: 0x121113)
        }
    }
}

private struct AccentValues {
    let soft: Color
    let text: Color
    let primary: Color
}

private enum NativeAccent {
    case green, blue, violet, orange, crimson

    var values: AccentValues {
        switch self {
        case .green:
            AccentValues(
                soft: adaptiveColor(0xE6F6EB, 0x132D21),
                text: adaptiveColor(0x193B2D, 0xB1F1CB),
                primary: adaptiveColor(0x193B2D, 0x3DD68C))
        case .blue:
            AccentValues(
                soft: adaptiveColor(0xE6F4FE, 0x0D2847),
                text: adaptiveColor(0x113264, 0xC2E6FF),
                primary: adaptiveColor(0x113264, 0x70B8FF))
        case .violet:
            AccentValues(
                soft: adaptiveColor(0xF4F0FE, 0x291F43),
                text: adaptiveColor(0x2F265F, 0xE2DDFE),
                primary: adaptiveColor(0x2F265F, 0xBAA7FF))
        case .orange:
            AccentValues(
                soft: adaptiveColor(0xFFEFD6, 0x331E0B),
                text: adaptiveColor(0x582D1D, 0xFFE0C2),
                primary: adaptiveColor(0x582D1D, 0xFFA057))
        case .crimson:
            AccentValues(
                soft: adaptiveColor(0xFFE9F0, 0x381525),
                text: adaptiveColor(0x621639, 0xFDD3E8),
                primary: adaptiveColor(0x621639, 0xFF92AD))
        }
    }
}

private func adaptiveColor(_ light: UInt32, _ dark: UInt32) -> Color {
    Color(
        uiColor: UIColor { traits in
            let rgb = traits.userInterfaceStyle == .dark ? dark : light
            return UIColor(
                red: CGFloat((rgb >> 16) & 255) / 255,
                green: CGFloat((rgb >> 8) & 255) / 255,
                blue: CGFloat(rgb & 255) / 255, alpha: 1)
        })
}
