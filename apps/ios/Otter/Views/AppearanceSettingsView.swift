import OtterKit
import SwiftUI

/// Local device settings. Account sign-out does not reset these choices.
@MainActor
struct AppearanceSettingsView: View {
    @Environment(AppPreferences.self) private var preferences

    var body: some View {
        @Bindable var preferences = preferences
        Form {
            Section("色彩主題") {
                ForEach(AppPalette.allCases, id: \.self) { palette in
                    selectionRow(
                        palette.title, selected: preferences.palette == palette,
                        symbol: "circle.fill", color: palette.accessibleTint
                    ) {
                        preferences.palette = palette
                    }
                    .accessibilityIdentifier("appearance.palette.\(palette.rawValue)")
                }
            }
            Section("顯示模式") {
                ForEach(AppAppearance.allCases, id: \.self) { appearance in
                    selectionRow(
                        appearance.title, selected: preferences.appearance == appearance,
                        symbol: appearance.symbol
                    ) {
                        preferences.appearance = appearance
                    }
                    .accessibilityIdentifier("appearance.mode.\(appearance.rawValue)")
                }
            }
            Section("語言") {
                Picker("語言", selection: $preferences.localeID) {
                    ForEach(AppPreferences.languageOptions) { language in
                        Text(verbatim: language.label).tag(language.id)
                    }
                }
                .accessibilityIdentifier("appearance.language")
            }
        }
        .otterList()
        .navigationTitle("外觀")
    }

    private func selectionRow(
        _ title: LocalizedStringKey, selected: Bool, symbol: String,
        color: Color = .primary, action: @escaping () -> Void
    ) -> some View {
        Button(action: action) {
            HStack {
                Image(systemName: symbol).foregroundStyle(color).accessibilityHidden(true)
                Text(title).foregroundStyle(.primary)
                Spacer()
                if selected {
                    Image(systemName: "checkmark").accessibilityHidden(true)
                }
            }
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityAddTraits(selected ? [.isSelected] : [])
    }
}

extension AppAppearance {
    var colorScheme: ColorScheme? {
        switch self {
        case .system: nil
        case .light: .light
        case .dark: .dark
        }
    }

    fileprivate var title: LocalizedStringKey {
        switch self {
        case .system: "跟隨系統"
        case .light: "淺色"
        case .dark: "深色"
        }
    }

    fileprivate var symbol: String {
        switch self {
        case .system: "circle.lefthalf.filled"
        case .light: "sun.max"
        case .dark: "moon"
        }
    }
}

extension AppPalette {
    fileprivate var title: LocalizedStringKey {
        switch self {
        case .forest: "森林"
        case .parchment: "暖紙"
        case .ocean: "海洋"
        case .lavender: "薰衣草"
        case .sunset: "夕陽"
        case .rose: "玫瑰"
        }
    }
}
