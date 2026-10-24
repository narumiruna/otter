import OtterKit
import SwiftUI

/// Web panels use 14-point corners; controls use 8-point corners.
extension View {
    func otterList() -> some View { modifier(OtterListStyle()) }
    func otterSecondaryText() -> some View { modifier(OtterSecondaryTextStyle()) }
}

private struct OtterSecondaryTextStyle: ViewModifier {
    @Environment(AppPreferences.self) private var preferences

    func body(content: Content) -> some View {
        content.foregroundStyle(preferences.palette.colors.secondaryText)
    }
}

private struct OtterListStyle: ViewModifier {
    @Environment(AppPreferences.self) private var preferences

    func body(content: Content) -> some View {
        content
            .scrollContentBackground(.hidden)
            .background(preferences.palette.colors.background)
            .foregroundStyle(
                preferences.palette.colors.text, preferences.palette.colors.secondaryText
            )
            .listSectionSpacing(20)
            .environment(\.defaultMinListRowHeight, 52)
    }
}

struct OtterPrimaryButtonStyle: ButtonStyle {
    @Environment(AppPreferences.self) private var preferences
    @Environment(\.isEnabled) private var isEnabled

    func makeBody(configuration: Configuration) -> some View {
        let colors = preferences.palette.colors
        configuration.label
            .font(.body.weight(.semibold))
            .frame(maxWidth: .infinity, minHeight: 48)
            .foregroundStyle(colors.primaryText)
            .tint(colors.primaryText)
            .background(colors.primary, in: RoundedRectangle(cornerRadius: 8))
            .opacity(isEnabled ? (configuration.isPressed ? 0.8 : 1) : 0.5)
            .contentShape(RoundedRectangle(cornerRadius: 8))
    }
}

struct OtterIconBadge: View {
    @Environment(AppPreferences.self) private var preferences
    let symbol: String

    var body: some View {
        Image(systemName: symbol)
            .font(.system(size: 18, weight: .medium))
            .foregroundStyle(preferences.palette.colors.accentText)
            .frame(width: 44, height: 44)
            .background(
                preferences.palette.colors.softAccent,
                in: RoundedRectangle(cornerRadius: 12)
            )
            .accessibilityHidden(true)
    }
}

struct OtterAvatar: View {
    @Environment(AppPreferences.self) private var preferences
    let name: String

    var body: some View {
        Text(verbatim: String(name.prefix(1)))
            .font(.headline)
            .foregroundStyle(preferences.palette.colors.accentText)
            .frame(width: 40, height: 40)
            .background(preferences.palette.colors.softAccent, in: Circle())
            .accessibilityHidden(true)
    }
}

struct OtterMetric: View {
    @Environment(AppPreferences.self) private var preferences
    let title: LocalizedStringKey
    let amount: Int64
    let currency: Currency

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(title)
                .font(.subheadline.weight(.medium))
                .lineLimit(nil)
                .fixedSize(horizontal: false, vertical: true)
            Text(verbatim: currency.formatted(amount))
                .font(.largeTitle.weight(.semibold))
                .tracking(-0.8)
                .monospacedDigit()
                .fixedSize(horizontal: false, vertical: true)
        }
        .foregroundStyle(preferences.palette.colors.accentText)
        .padding(20)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            preferences.palette.colors.softAccent, in: RoundedRectangle(cornerRadius: 14)
        )
        .accessibilityElement(children: .combine)
    }
}
