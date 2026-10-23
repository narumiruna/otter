import Foundation

public enum Currency: String, Codable, CaseIterable, Identifiable, Sendable {
    case twd = "TWD"
    case jpy = "JPY"
    case usd = "USD"
    case eur = "EUR"
    case sgd = "SGD"
    case gbp = "GBP"
    case aud = "AUD"
    case cad = "CAD"
    case krw = "KRW"

    public var id: String { rawValue }
    public var minorUnits: Int { [.twd, .jpy, .krw].contains(self) ? 0 : 2 }

    // Match packages/core/src/money.ts. Do not use binary floating point for input.
    public func parseAmount(_ input: String) throws -> Int64 {
        let value = WebText.trim(input)
        let parts = value.split(separator: ".", omittingEmptySubsequences: false)
        guard (1...2).contains(parts.count),
            parts.allSatisfy({ !$0.isEmpty && $0.utf8.allSatisfy { (48...57).contains($0) } }),
            parts.count == 1 || parts[1].count <= minorUnits,
            let whole = Int64(parts[0])
        else {
            throw APIError.invalidAmount(currency: self)
        }
        let factor: Int64 = minorUnits == 0 ? 1 : 100
        let (scaled, overflow) = whole.multipliedReportingOverflow(by: factor)
        let fraction =
            parts.count == 2
            ? Int64(parts[1].padding(toLength: minorUnits, withPad: "0", startingAt: 0)) ?? 0 : 0
        let (amount, additionOverflow) = scaled.addingReportingOverflow(fraction)
        guard !overflow, !additionOverflow, amount > 0, amount <= 9_007_199_254_740_991 else {
            throw APIError.invalidAmount(currency: self)
        }
        return amount
    }

    public func majorString(_ minor: Int64) -> String {
        let sign = minor < 0 ? "-" : ""
        guard minorUnits > 0 else { return String(minor) }
        let magnitude = minor.magnitude
        let fraction = String(magnitude % 100)
        return "\(sign)\(magnitude / 100).\(fraction.count == 1 ? "0" : "")\(fraction)"
    }

    public func formatted(_ minor: Int64, locale: Locale = AppPreferences.displayLocale()) -> String
    {
        let formatter = NumberFormatter()
        formatter.locale = locale
        formatter.numberStyle = .decimal
        formatter.minimumFractionDigits = minorUnits
        formatter.maximumFractionDigits = minorUnits
        let decimal = NSDecimalNumber(
            string: majorString(minor), locale: Locale(identifier: "en_US_POSIX"))
        return "\(rawValue) \(formatter.string(from: decimal) ?? majorString(minor))"
    }
}
