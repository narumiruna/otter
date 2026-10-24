import Foundation

public enum ExpenseCategory: String, Codable, CaseIterable, Sendable {
    case food = "餐飲"
    case transport = "交通"
    case accommodation = "住宿"
    case tickets = "門票"
    case shopping = "購物"
    case other = "其他"

    public static func displayName(
        _ value: String?, locale: Locale = AppPreferences.displayLocale()
    ) -> String {
        switch value {
        case "餐飲": NativeLocalization.string("餐飲", locale: locale)
        case "交通": NativeLocalization.string("交通", locale: locale)
        case "住宿": NativeLocalization.string("住宿", locale: locale)
        case "門票": NativeLocalization.string("門票", locale: locale)
        case "購物": NativeLocalization.string("購物", locale: locale)
        case "其他", nil: NativeLocalization.string("其他", locale: locale)
        case .some(let value): value
        }
    }
}
