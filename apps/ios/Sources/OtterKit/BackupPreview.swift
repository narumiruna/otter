import CoreFoundation
import Foundation

public struct BackupPreviewError: LocalizedError, Sendable, Equatable {
    public let message: String
    public var errorDescription: String? { message }
    init(_ message: String) { self.message = message }
}

/// Validates the backup without decoding it into the current Trip model.
/// Restore must send originalData, so unknown and version-specific fields are preserved.
public struct BackupPreview: Sendable {
    public static let maximumBytes = 10 * 1024 * 1024
    public let originalData: Data
    public let version: Int
    public let name: String
    public let baseCurrency: Currency
    public let participantCount: Int
    public let expenseCount: Int
    public let paymentCount: Int

    public init(data: Data) throws {
        guard data.count <= Self.maximumBytes else {
            throw BackupPreviewError(NativeLocalization.string("備份不可超過 10 MB"))
        }
        let value: Any
        do {
            value = try JSONSerialization.jsonObject(with: data, options: [.fragmentsAllowed])
        } catch { throw BackupPreviewError(NativeLocalization.string("備份不是有效的 JSON")) }
        guard let backup = value as? [String: Any] else {
            throw BackupPreviewError(NativeLocalization.string("備份格式錯誤"))
        }
        guard let number = Self.number(backup["version"]), number == 1 || number == 2 else {
            throw BackupPreviewError(NativeLocalization.string("不支援的備份版本"))
        }
        guard let trip = backup["trip"] as? [String: Any] else {
            throw BackupPreviewError(NativeLocalization.string("備份缺少 trip"))
        }
        guard let name = trip["name"] as? String, !name.isEmpty, name.utf16.count <= 100 else {
            throw BackupPreviewError(NativeLocalization.string("備份旅行名稱錯誤"))
        }
        guard let base = Self.currency(trip["baseCurrency"]) else {
            throw BackupPreviewError(NativeLocalization.string("備份基準貨幣錯誤"))
        }
        if let enabled = trip["visaSettlementEnabled"], !Self.isBoolean(enabled) {
            throw BackupPreviewError(NativeLocalization.string("備份 Visa 結清設定錯誤"))
        }
        let visaEnabled = (trip["visaSettlementEnabled"] as? Bool) == true
        let visaCurrency = Self.currency(trip["visaSettlementCurrency"])
        if (trip["visaSettlementCurrency"] != nil && visaCurrency == nil)
            || (visaEnabled && visaCurrency == nil)
        {
            throw BackupPreviewError(NativeLocalization.string("備份 Visa 結清貨幣錯誤"))
        }
        var rates: ExchangeRates = [:]
        if let raw = trip["exchangeRates"] {
            guard let values = raw as? [String: Any] else {
                throw BackupPreviewError(NativeLocalization.string("備份匯率格式錯誤"))
            }
            for (key, value) in values {
                guard Currency(rawValue: key) != nil, let rate = Self.number(value),
                    rate >= 0.00000001, rate < 10_000_000_000
                else {
                    throw BackupPreviewError(NativeLocalization.string("備份匯率格式錯誤"))
                }
                rates[key] = rate
            }
        }
        guard let participants = trip["participants"] as? [Any], !participants.isEmpty else {
            throw BackupPreviewError(NativeLocalization.string("備份缺少參與者"))
        }
        guard let expenses = trip["expenses"] as? [Any] else {
            throw BackupPreviewError(NativeLocalization.string("備份缺少支出"))
        }
        var ids = Set<String>()
        var names = Set<[UInt16]>()
        var people: [[String: Any]] = []
        for raw in participants {
            guard let person = raw as? [String: Any], let id = person["id"] as? String, !id.isEmpty,
                let personName = person["name"] as? String, !personName.isEmpty,
                personName.utf16.count <= 80
            else {
                throw BackupPreviewError(NativeLocalization.string("備份參與者格式錯誤"))
            }
            guard ids.insert(id).inserted,
                names.insert(Array(WebText.trim(personName).lowercased().utf16)).inserted
            else {
                throw BackupPreviewError(NativeLocalization.string("備份參與者重複"))
            }
            people.append(person)
        }
        let representatives = Set(people.compactMap { $0["settledById"] as? String })
        for person in people {
            if let value = person["settledById"] {
                guard let representative = value as? String, ids.contains(representative),
                    let id = person["id"] as? String, id != representative,
                    !representatives.contains(id)
                else {
                    throw BackupPreviewError(NativeLocalization.string("備份結算歸屬格式錯誤"))
                }
            }
        }
        // Match core: the restored group's base rate is always one.
        var conversionRates = rates
        conversionRates[base.rawValue] = 1
        for raw in expenses {
            guard let expense = raw as? [String: Any], let id = expense["id"] as? String,
                !id.isEmpty,
                let description = expense["description"] as? String, !description.isEmpty,
                description.utf16.count <= 120,
                let amount = Self.positiveInteger(expense["amountMinor"]),
                let currency = Self.currency(expense["currency"]),
                let paidBy = expense["paidById"] as? String, ids.contains(paidBy),
                let date = expense["expenseDate"] as? String, CSV.isDateOnly(date),
                expense["createdAt"] is String,
                let splits = expense["participantIds"] as? [Any], !splits.isEmpty
            else {
                throw BackupPreviewError(NativeLocalization.string("備份支出格式錯誤"))
            }
            if expense["visaExchangeRate"] != nil || visaEnabled {
                let visa = try Self.visaRate(
                    expense["visaExchangeRate"], currency: currency, date: date,
                    target: visaEnabled ? visaCurrency : nil)
                do {
                    _ = try ExpenseMath.convertVisaExpenseMinor(
                        amountMinor: amount, currency: currency, date: date, rate: visa)
                } catch {
                    throw BackupPreviewError(NativeLocalization.string("Visa 換算金額超出範圍。"))
                }
            }
            let snapshot: ExpenseExchangeRate
            if number == 2 {
                snapshot = try Self.expenseRate(expense["exchangeRate"], currency: currency)
            } else {
                snapshot = ExpenseExchangeRate(
                    baseCurrency: base,
                    rateToBase: currency == base
                        ? 1
                        : rates[currency.rawValue]
                            ?? Self.fixedRate(currency) / Self.fixedRate(base), source: "legacy")
            }
            do {
                _ = try ExpenseMath.convertExpenseMinor(
                    amountMinor: amount, currency: currency,
                    baseCurrency: base, snapshot: snapshot, rates: conversionRates)
            } catch { throw BackupPreviewError(NativeLocalization.string("備份支出換算金額超出範圍")) }
            var splitIDs = Set<String>()
            for value in splits {
                guard let split = value as? String, ids.contains(split) else {
                    throw BackupPreviewError(NativeLocalization.string("備份支出參與者不存在"))
                }
                guard splitIDs.insert(split).inserted else {
                    throw BackupPreviewError(NativeLocalization.string("備份支出參與者重複"))
                }
            }
            if let category = expense["category"] {
                guard let text = category as? String,
                    ["餐飲", "交通", "住宿", "門票", "購物", "其他"].contains(text)
                else {
                    throw BackupPreviewError(NativeLocalization.string("備份支出分類錯誤"))
                }
            }
            if let rawTags = expense["tags"] {
                guard let tags = rawTags as? [Any],
                    tags.allSatisfy({ ($0 as? String).map { $0.utf16.count <= 24 } == true })
                else {
                    throw BackupPreviewError(NativeLocalization.string("備份支出標籤錯誤"))
                }
            }
            if let rawShares = expense["participantShares"] {
                guard let shares = rawShares as? [Any] else {
                    throw BackupPreviewError(NativeLocalization.string("備份分帳格式錯誤"))
                }
                var shareIDs = Set<String>()
                var total: Double = 0
                for rawShare in shares {
                    guard let share = rawShare as? [String: Any],
                        let person = share["participantId"] as? String,
                        splitIDs.contains(person), shareIDs.insert(person).inserted,
                        let minor = Self.positiveInteger(share["shareMinor"])
                    else { throw BackupPreviewError(NativeLocalization.string("備份分帳格式錯誤")) }
                    total += Double(minor)
                }
                guard shareIDs.count == splitIDs.count else {
                    throw BackupPreviewError(NativeLocalization.string("備份分帳格式錯誤"))
                }
                guard total == Double(amount) else {
                    throw BackupPreviewError(NativeLocalization.string("備份分帳加總錯誤"))
                }
            }
        }
        let payments: [Any]
        if let value = trip["settlementPayments"], !(value is NSNull) {
            guard let records = value as? [Any] else {
                throw BackupPreviewError(NativeLocalization.string("備份付款紀錄格式錯誤"))
            }
            payments = records
        } else {
            payments = []
        }
        for raw in payments {
            guard let payment = raw as? [String: Any], payment["id"] is String,
                let from = payment["fromId"] as? String, ids.contains(from),
                let to = payment["toId"] as? String, ids.contains(to), from != to,
                Self.positiveInteger(payment["amountMinor"]) != nil,
                let currency = Self.currency(payment["currency"]),
                !visaEnabled || currency == visaCurrency,
                let paidAt = payment["paidAt"] as? String, CSV.isDateOnly(paidAt),
                let note = payment["note"] as? String, note.utf16.count <= 160,
                payment["createdAt"] is String
            else { throw BackupPreviewError(NativeLocalization.string("備份付款紀錄格式錯誤")) }
        }
        self.originalData = data
        self.version = Int(number)
        self.name = name
        self.baseCurrency = base
        self.participantCount = people.count
        self.expenseCount = expenses.count
        self.paymentCount = payments.count
    }

    private static func currency(_ value: Any?) -> Currency? {
        (value as? String).flatMap(Currency.init(rawValue:))
    }
    private static func isBoolean(_ value: Any) -> Bool {
        guard let number = value as? NSNumber else { return false }
        return CFGetTypeID(number) == CFBooleanGetTypeID()
    }
    private static func number(_ value: Any?) -> Double? {
        guard let value, !isBoolean(value), let number = value as? NSNumber,
            number.doubleValue.isFinite
        else { return nil }
        return number.doubleValue
    }
    private static func positiveInteger(_ value: Any?) -> Int64? {
        guard let number = number(value), number > 0, number <= 9_007_199_254_740_991,
            number.rounded(.towardZero) == number
        else { return nil }
        return Int64(number)
    }
    private static func expenseRate(_ raw: Any?, currency: Currency) throws -> ExpenseExchangeRate {
        guard let value = raw as? [String: Any], let base = self.currency(value["baseCurrency"]),
            let rate = number(value["rateToBase"]), rate > 0, currency != base || rate == 1,
            let source = value["source"] as? String,
            ["bank", "custom", "fixed", "legacy"].contains(source)
        else {
            throw BackupPreviewError(NativeLocalization.string("備份支出匯率格式錯誤"))
        }
        if source == "bank" {
            guard value["provider"] as? String == "BANK_OF_TAIWAN",
                value["rateType"] as? String == "spotMid",
                timestamp(value["fetchedAt"])
            else { throw BackupPreviewError(NativeLocalization.string("備份支出匯率格式錯誤")) }
        } else if value["provider"] != nil || value["rateType"] != nil || value["fetchedAt"] != nil
        {
            throw BackupPreviewError(NativeLocalization.string("備份支出匯率格式錯誤"))
        }
        return ExpenseExchangeRate(
            baseCurrency: base, rateToBase: rate, source: source,
            provider: value["provider"] as? String, rateType: value["rateType"] as? String,
            fetchedAt: (value["fetchedAt"] as? String).map(normalizedTimestamp))
    }
    private static func visaRate(_ raw: Any?, currency: Currency, date: String, target: Currency?)
        throws -> VisaExpenseRate
    {
        guard let value = raw as? [String: Any], self.currency(value["sourceCurrency"]) == currency,
            let to = self.currency(value["targetCurrency"]), target == nil || target == to,
            value["date"] as? String == date, let rate = number(value["rate"]), rate > 0,
            currency != to || rate == 1, let fetchedAt = value["fetchedAt"] as? String,
            timestamp(fetchedAt)
        else {
            throw BackupPreviewError(NativeLocalization.string("備份 Visa 匯率格式錯誤"))
        }
        return VisaExpenseRate(
            sourceCurrency: currency, targetCurrency: to, date: date, rate: rate,
            fetchedAt: normalizedTimestamp(fetchedAt))
    }
    private static func fixedRate(_ currency: Currency) -> Double {
        switch currency {
        case .twd: 1
        case .jpy: 0.22
        case .usd: 32
        case .eur: 35
        case .sgd: 24
        case .gbp: 41
        case .aud: 21
        case .cad: 23
        case .krw: 0.024
        }
    }
    private static func normalizedTimestamp(_ text: String) -> String {
        CSV.isDateOnly(text) ? text + "T00:00:00Z" : text
    }
    private static func timestamp(_ raw: Any?) -> Bool {
        guard let text = raw as? String else { return false }
        return ExpenseMath.validTimestamp(text) || CSV.isDateOnly(text)
    }
}
