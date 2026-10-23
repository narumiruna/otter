import Foundation
import OtterKit

/// Map only known native values. Preserve unknown categories from older records.
enum NativeExpenseLabels {
    static func category(_ value: String?, locale: Locale = AppPreferences.displayLocale())
        -> String
    {
        ExpenseCategory.displayName(value, locale: locale)
    }

    static func balance(_ amount: Int64, locale: Locale = AppPreferences.displayLocale()) -> String
    {
        if amount > 0 { return NativeLocalization.string("應收", locale: locale) }
        if amount < 0 { return NativeLocalization.string("應付", locale: locale) }
        return NativeLocalization.string("已結清", locale: locale)
    }
}
