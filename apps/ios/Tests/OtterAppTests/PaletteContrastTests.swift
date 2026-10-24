import OtterKit
import SwiftUI
import UIKit
import XCTest

@testable import Otter

@MainActor
final class PaletteContrastTests: XCTestCase {
    private func luminance(_ color: UIColor, traits: UITraitCollection) throws -> Double {
        var r: CGFloat = 0
        var g: CGFloat = 0
        var b: CGFloat = 0
        var alpha: CGFloat = 0
        XCTAssertTrue(
            color.resolvedColor(with: traits).getRed(&r, green: &g, blue: &b, alpha: &alpha))
        XCTAssertEqual(alpha, 1)
        func channel(_ value: CGFloat) -> Double {
            let number = Double(value)
            return number <= 0.04045 ? number / 12.92 : pow((number + 0.055) / 1.055, 2.4)
        }
        return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
    }

    func testWebSemanticPairsMeetContrastInBothAppearances() throws {
        for style in [UIUserInterfaceStyle.light, .dark] {
            let traits = UITraitCollection(userInterfaceStyle: style)
            for palette in AppPalette.allCases {
                let colors = palette.colors
                for (foreground, background) in [
                    (colors.text, colors.background), (colors.text, colors.surface),
                    (colors.secondaryText, colors.background),
                    (colors.secondaryText, colors.surface),
                    (colors.accentText, colors.softAccent),
                    (colors.primaryText, colors.primary),
                    (colors.destructive, colors.background), (colors.destructive, colors.surface),
                ] {
                    let a = try luminance(UIColor(foreground), traits: traits)
                    let b = try luminance(UIColor(background), traits: traits)
                    XCTAssertGreaterThanOrEqual(
                        (max(a, b) + 0.05) / (min(a, b) + 0.05), 4.5,
                        "\(palette.rawValue), \(style.rawValue)")
                }
            }
        }
    }

    func testWebNeutralFamiliesAndParchmentAccentArePreserved() {
        let light = UITraitCollection(userInterfaceStyle: .light)
        let dark = UITraitCollection(userInterfaceStyle: .dark)
        XCTAssertEqual(
            UIColor(AppPalette.forest.colors.background).resolvedColor(with: light),
            UIColor(red: 247 / 255, green: 249 / 255, blue: 248 / 255, alpha: 1))
        XCTAssertEqual(
            UIColor(AppPalette.forest.colors.background).resolvedColor(with: dark),
            UIColor(red: 23 / 255, green: 25 / 255, blue: 24 / 255, alpha: 1))
        for traits in [light, dark] {
            XCTAssertEqual(
                UIColor(AppPalette.parchment.colors.accentText).resolvedColor(with: traits),
                UIColor(AppPalette.forest.colors.accentText).resolvedColor(with: traits))
        }
    }

    func testAllPaletteTextAccentsMeetContrastInLightAndDark() throws {
        for style in [UIUserInterfaceStyle.light, .dark] {
            let traits = UITraitCollection(userInterfaceStyle: style)
            for palette in AppPalette.allCases {
                let foreground = try luminance(UIColor(palette.accessibleTint), traits: traits)
                for background in [
                    UIColor.systemBackground, .systemGroupedBackground,
                    .secondarySystemGroupedBackground,
                ] {
                    let other = try luminance(background, traits: traits)
                    let ratio = (max(foreground, other) + 0.05) / (min(foreground, other) + 0.05)
                    XCTAssertGreaterThanOrEqual(
                        ratio, 4.5, "\(palette.rawValue), \(style.rawValue)")
                }
            }
        }
    }
}
