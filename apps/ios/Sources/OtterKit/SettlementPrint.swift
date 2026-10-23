import Foundation

/// Print presentation uses only the supplied payload, including for a read-only share.
enum SettlementPrint {
    /// Escape all text, including localized headings. Do not add links or scripts.
    static func html(payload: TripPayload, locale: Locale) -> String {
        func escape(_ text: String) -> String {
            text.replacingOccurrences(of: "&", with: "&amp;")
                .replacingOccurrences(of: "<", with: "&lt;")
                .replacingOccurrences(of: ">", with: "&gt;")
                .replacingOccurrences(of: "\"", with: "&quot;")
                .replacingOccurrences(of: "'", with: "&#39;")
        }
        func table(_ title: String, _ headers: [String], _ rows: [[String]]) -> String {
            "<h2>\(escape(title))</h2><table><thead><tr>"
                + headers.map { "<th>\(escape($0))</th>" }.joined()
                + "</tr></thead><tbody>"
                + rows.map { row in "<tr>" + row.map { "<td>\(escape($0))</td>" }.joined() + "</tr>"
                }.joined()
                + "</tbody></table>"
        }
        let selectedLanguage = AppPreferences.matchDeviceLanguages([
            locale.identifier.replacingOccurrences(of: "_", with: "-")
        ])
        let language = selectedLanguage == "zh-TW" ? "zh-Hant" : selectedLanguage
        let participantHeading = NativeLocalization.string("參與者", locale: locale)
        let amountHeading = NativeLocalization.string("金額", locale: locale)
        let payerHeading = NativeLocalization.string("付款人", locale: locale)
        let payeeHeading = NativeLocalization.string("收款人", locale: locale)
        let dateHeading = NativeLocalization.string("日期", locale: locale)
        let paymentHeading = NativeLocalization.string("付款紀錄", locale: locale)
        let unknownName = NativeLocalization.string("未知", locale: locale)
        let trip = payload.trip
        let names = trip.participants.reduce(into: [String: String]()) { $0[$1.id] = $1.name }
        let balances = table(
            NativeLocalization.string("餘額", locale: locale), [participantHeading, amountHeading],
            payload.balances.map {
                [$0.name, $0.currency.formatted($0.amountMinor, locale: locale)]
            })
        let settlements = table(
            NativeLocalization.string("建議結算", locale: locale),
            [payerHeading, payeeHeading, amountHeading],
            payload.settlements.map {
                [$0.fromName, $0.toName, $0.currency.formatted($0.amountMinor, locale: locale)]
            })
        let expenses = table(
            NativeLocalization.string("支出", locale: locale),
            [
                dateHeading, NativeLocalization.string("描述", locale: locale), amountHeading,
                payerHeading, NativeLocalization.string("分類／標籤", locale: locale),
                NativeLocalization.string("分帳參與者", locale: locale),
            ],
            trip.expenses.map {
                let expense = $0
                let shares = (expense.participantShares ?? []).reduce(into: [String: Int64]()) {
                    $0[$1.participantId] = $1.shareMinor
                }
                return [
                    NativeDisplayFormatting.dateOnly(expense.expenseDate, locale: locale),
                    expense.description,
                    expense.currency.formatted(expense.amountMinor, locale: locale),
                    names[expense.paidById] ?? unknownName,
                    ([ExpenseCategory.displayName(expense.category, locale: locale)]
                        + (expense.tags ?? [])).joined(separator: "／"),
                    expense.participantIds.map { id in
                        let name = names[id] ?? unknownName
                        return shares[id].map {
                            "\(name)=\(expense.currency.formatted($0, locale: locale))"
                        }
                            ?? name
                    }.joined(separator: "; "),
                ]
            })
        let payments: String
        if let records = trip.settlementPayments {
            payments = table(
                paymentHeading,
                [
                    dateHeading, payerHeading, payeeHeading, amountHeading,
                    NativeLocalization.string("備註", locale: locale),
                ],
                records.map {
                    [
                        NativeDisplayFormatting.dateOnly($0.paidAt, locale: locale),
                        names[$0.fromId] ?? $0.fromId, names[$0.toId] ?? $0.toId,
                        $0.currency.formatted($0.amountMinor, locale: locale), $0.note,
                    ]
                })
        } else {
            let notice = NativeLocalization.string("此分享未提供付款明細。", locale: locale)
            payments = "<h2>\(escape(paymentHeading))</h2><p>\(escape(notice))</p>"
        }
        let currencies = NativeLocalization.string(
            "基本幣別：\(trip.baseCurrency.rawValue)；結算幣別：\(trip.settlementCurrency.rawValue)",
            locale: locale)
        let participants = table(
            participantHeading,
            [
                NativeLocalization.string("姓名", locale: locale),
                NativeLocalization.string("結算歸屬", locale: locale),
            ],
            trip.participants.map { [$0.name, $0.settledById.flatMap { names[$0] } ?? ""] })
        return """
            <!doctype html><html lang="\(escape(language))"><head><meta charset="utf-8"><title>\(escape(trip.name))</title>
            <style>@page{margin:15mm}body{font-family:-apple-system,sans-serif;color:#000;background:#fff;font-size:10pt}
            h1{font-size:20pt;overflow-wrap:anywhere}h2{font-size:14pt;break-after:avoid}table{width:100%;border-collapse:collapse;table-layout:fixed;margin-bottom:18pt}
            th,td{text-align:left;vertical-align:top;border-bottom:1px solid #aaa;padding:5pt;overflow-wrap:anywhere;word-wrap:break-word;white-space:pre-wrap}
            thead{display:table-header-group}tr{break-inside:avoid}p{overflow-wrap:anywhere}</style></head>
            <body><h1>\(escape(trip.name))</h1><p>\(escape(currencies))</p>
            \(participants)
            \(balances)\(settlements)\(expenses)\(payments)</body></html>
            """
    }
}
