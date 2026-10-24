import Foundation

public struct CSVImportError: Sendable, Equatable {
    public let row: Int
    public let message: String
}

public struct CSVImportRow: Sendable, Equatable {
    public struct Share: Sendable, Equatable {
        public let name: String
        public let amount: String
    }
    public let rowNumber: Int
    public let date: String
    public let description: String
    public let amount: String
    public let currency: String
    public let paidBy: String
    public let category: String
    public let tags: String
    public let splitParticipants: [String]
    public let splitShares: [Share]?
}

public struct CSVImportPreview: Sendable, Equatable {
    public let rows: [CSVImportRow]
    public let errors: [CSVImportError]
    public var canImport: Bool { !rows.isEmpty && errors.isEmpty }
}

/// Text formats shared with packages/core/src/csv.ts. Server validation is final.
public enum CSV {
    private static let expenseHeaders = [
        "date", "description", "amount", "currency", "paid_by", "category", "tags",
        "split_participants",
    ]
    private static let requiredHeaders = [
        "date", "description", "amount", "currency", "paid_by", "split_participants",
    ]

    public static func tripExpenses(trip: Trip) throws -> String {
        let names = participantNames(trip)
        return encode(
            [expenseHeaders]
                + trip.expenses.map { expense in
                    let shares = (expense.participantShares ?? []).reduce(into: [String: Int64]()) {
                        $0[$1.participantId] = $1.shareMinor
                    }
                    return [
                        expense.expenseDate, expense.description,
                        expense.currency.majorString(expense.amountMinor),
                        expense.currency.rawValue,
                        names[expense.paidById] ?? "未知", expense.category ?? "其他",
                        (expense.tags ?? []).joined(separator: "|"),
                        expense.participantIds.map { id in
                            let name = names[id] ?? "未知"
                            return shares[id].map { "\(name)=\(expense.currency.majorString($0))" }
                                ?? name
                        }.joined(separator: "; "),
                    ]
                })
    }

    public static func tripResults(payload: TripPayload) throws -> String {
        let names = participantNames(payload.trip)
        let balances = payload.balances.map {
            [
                "balance", $0.name, "", "", $0.currency.majorString($0.amountMinor),
                $0.currency.rawValue, "",
            ]
        }
        let settlements = payload.settlements.map {
            [
                "settlement", "", $0.fromName, $0.toName, $0.currency.majorString($0.amountMinor),
                $0.currency.rawValue, "",
            ]
        }
        let payments = (payload.trip.settlementPayments ?? []).map {
            [
                "payment", "", names[$0.fromId] ?? $0.fromId, names[$0.toId] ?? $0.toId,
                $0.currency.majorString($0.amountMinor), $0.currency.rawValue, $0.note,
            ]
        }
        return encode(
            [["type", "participant", "from", "to", "amount", "currency", "note"]]
                + balances + settlements + payments)
    }

    public static func parseImport(_ text: String, participantNames: [String] = [])
        -> CSVImportPreview
    {
        let records = parse(text).filter { $0.contains { !trim($0).isEmpty } }
        guard let header = records.first else {
            return CSVImportPreview(
                rows: [], errors: [.init(row: 1, message: NativeLocalization.string("CSV 沒有資料"))])
        }
        var columns: [String: Int] = [:]
        for (index, value) in header.enumerated() { columns[trim(value)] = index }
        let missing = requiredHeaders.filter { columns[$0] == nil }
        if !missing.isEmpty {
            return CSVImportPreview(
                rows: [],
                errors: [
                    .init(
                        row: 1,
                        message: NativeLocalization.string(
                            "缺少欄位：\(missing.joined(separator: ", "))"))
                ])
        }
        let knownNames = Set(participantNames.map { Array(trim($0).lowercased().utf16) })
        var rows: [CSVImportRow] = []
        var errors: [CSVImportError] = []
        for (index, record) in records.dropFirst().enumerated() {
            let number = index + 2
            func get(_ column: String) -> String {
                guard let position = columns[column], position < record.count else { return "" }
                return trim(record[position])
            }
            func error(_ message: String) { errors.append(.init(row: number, message: message)) }
            let date = get("date")
            let description = get("description")
            let amount = get("amount")
            let currencyText = get("currency")
            let paidBy = get("paid_by")
            let cells = get("split_participants").components(separatedBy: ";").map(trim).filter {
                !$0.isEmpty
            }
            let shares: [CSVImportRow.Share] = cells.compactMap { cell in
                guard let separator = cell.firstIndex(of: "=") else { return nil }
                return .init(
                    name: trim(String(cell[..<separator])),
                    amount: trim(String(cell[cell.index(after: separator)...])))
            }
            let explicit = !shares.isEmpty
            let people = explicit ? shares.map(\.name) : cells
            if !isDateOnly(date) { error(NativeLocalization.string("日期格式必須是 YYYY-MM-DD")) }
            if description.isEmpty || description.utf16.count > 120 {
                error(NativeLocalization.string("描述需為 1-120 字"))
            }
            let currency = Currency(rawValue: currencyText)
            if let currency {
                if (try? currency.parseAmount(amount)) == nil {
                    error(NativeLocalization.string("金額格式錯誤"))
                }
            } else {
                error(NativeLocalization.string("不支援的貨幣"))
            }
            if paidBy.isEmpty { error(NativeLocalization.string("付款人必填")) }
            if people.isEmpty { error(NativeLocalization.string("分帳參與者必填")) }
            if explicit && shares.count != cells.count {
                error(NativeLocalization.string("不平均分帳需每位成員都有金額"))
            }
            if explicit, let currency {
                // Double matches the JavaScript sum and cannot overflow an Int64 for large CSV files.
                var total: Double = 0
                for share in shares {
                    guard let value = try? currency.parseAmount(share.amount) else {
                        error(NativeLocalization.string("分帳金額格式錯誤"))
                        break
                    }
                    total += Double(value)
                }
                if let value = try? currency.parseAmount(amount), total != Double(value) {
                    error(NativeLocalization.string("分帳金額加總必須等於支出金額"))
                }
            }
            if !knownNames.isEmpty,
                let unknown = ([paidBy] + people).first(where: {
                    !$0.isEmpty && !knownNames.contains(Array(trim($0).lowercased().utf16))
                })
            {
                error(NativeLocalization.string("找不到參與者：\(unknown)"))
            }
            rows.append(
                .init(
                    rowNumber: number, date: date, description: description, amount: amount,
                    currency: currencyText, paidBy: paidBy, category: get("category"),
                    tags: get("tags"),
                    splitParticipants: people, splitShares: explicit ? shares : nil))
        }
        return CSVImportPreview(rows: rows, errors: errors)
    }

    private static func participantNames(_ trip: Trip) -> [String: String] {
        trip.participants.reduce(into: [:]) { $0[$1.id] = $1.name }
    }
    private static func encode(_ rows: [[String]]) -> String {
        rows.map {
            $0.map { value in
                value.unicodeScalars.contains(where: {
                    $0 == "\"" || $0 == "," || $0 == "\n" || $0 == "\r"
                })
                    ? "\"\(value.replacingOccurrences(of: "\"", with: "\"\""))\"" : value
            }.joined(separator: ",")
        }.joined(separator: "\n")
    }
    private static func parse(_ text: String) -> [[String]] {
        let scalars = Array(text.unicodeScalars)
        var records: [[String]] = []
        var row: [String] = []
        var cell = ""
        var quoted = false
        var index = 0
        while index < scalars.count {
            let char = scalars[index]
            if quoted {
                if char == "\"", index + 1 < scalars.count, scalars[index + 1] == "\"" {
                    cell.append("\"")
                    index += 1
                } else if char == "\"" {
                    quoted = false
                } else {
                    cell.unicodeScalars.append(char)
                }
            } else if char == "\"" {
                quoted = true
            } else if char == "," {
                row.append(cell)
                cell = ""
            } else if char == "\n" {
                row.append(cell)
                records.append(row)
                row = []
                cell = ""
            } else if char != "\r" {
                cell.unicodeScalars.append(char)
            }
            index += 1
        }
        row.append(cell)
        records.append(row)
        return records
    }
    static func trim(_ value: String) -> String {
        WebText.trim(value)
    }
    static func isDateOnly(_ text: String) -> Bool {
        let bytes = Array(text.utf8)
        guard bytes.count == 10, bytes[4] == 45, bytes[7] == 45,
            bytes.enumerated().allSatisfy({
                $0.offset == 4 || $0.offset == 7 || (48...57).contains($0.element)
            }),
            let year = Int(text.prefix(4)), let month = Int(text.dropFirst(5).prefix(2)),
            let day = Int(text.suffix(2)), (1...12).contains(month)
        else { return false }
        let leap = year % 4 == 0 && (year % 100 != 0 || year % 400 == 0)
        let days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
        return (1...days[month - 1]).contains(day)
    }

    /// Contains only data available in the payload, including for a read-only share.
    public static func printHTML(
        payload: TripPayload, locale: Locale = AppPreferences.displayLocale()
    ) -> String {
        SettlementPrint.html(payload: payload, locale: locale)
    }
}
