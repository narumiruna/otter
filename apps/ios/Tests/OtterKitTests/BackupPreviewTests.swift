import Foundation
import Testing

@testable import OtterKit

struct BackupPreviewTests {
    private func expense(_ changes: [String: Any] = [:]) -> [String: Any] {
        var value: [String: Any] = [
            "id": "expense_1", "description": "Dinner", "amountMinor": 100, "currency": "TWD",
            "paidById": "alice", "participantIds": ["alice", "bob"], "expenseDate": "2026-06-25",
            "createdAt": "2026-06-25T00:00:00.000Z",
        ]
        value.merge(changes) { _, new in new }
        return value
    }
    private func fixture(version: Int = 1, trip changes: [String: Any] = [:]) -> [String: Any] {
        var trip: [String: Any] = [
            "name": "Tokyo", "baseCurrency": "TWD",
            "participants": [["id": "alice", "name": "Alice"], ["id": "bob", "name": "Bob"]],
            "expenses": [
                expense(
                    version == 2
                        ? [
                            "exchangeRate": [
                                "baseCurrency": "TWD", "rateToBase": 1, "source": "fixed",
                            ]
                        ] : [:])
            ],
        ]
        trip.merge(changes) { _, new in new }
        return ["version": version, "exportedAt": "2026-06-25T00:00:00.000Z", "trip": trip]
    }
    private func bytes(_ value: Any) throws -> Data {
        try JSONSerialization.data(
            withJSONObject: value, options: [.fragmentsAllowed, .sortedKeys])
    }
    private func preview(version: Int = 1, trip: [String: Any] = [:]) throws -> BackupPreview {
        try BackupPreview(data: bytes(fixture(version: version, trip: trip)))
    }
    private func rejects(_ trip: [String: Any], _ message: String, version: Int = 1) throws {
        let data = try bytes(fixture(version: version, trip: trip))
        #expect(throws: BackupPreviewError(message)) { try BackupPreview(data: data) }
    }

    @Test func webV1FixtureCountsAndOriginalBytes() throws {
        let raw = " \n" + String(decoding: try bytes(fixture()), as: UTF8.self) + "\n "
        let data = Data(raw.utf8)
        let preview = try BackupPreview(data: data)
        #expect(preview.originalData == data)
        #expect(preview.version == 1)
        #expect(preview.name == "Tokyo")
        #expect(preview.baseCurrency == .twd)
        #expect(preview.participantCount == 2)
        #expect(preview.expenseCount == 1)
        #expect(preview.paymentCount == 0)
    }

    @Test func v2AndUnknownFieldsArePreservedWithoutLossyReencoding() throws {
        var fixture = fixture(version: 2)
        fixture["future"] =
            ["opaque": "<script>\"&😀", "number": 9_007_199_254_740_991] as [String: Any]
        let original = try bytes(fixture)
        let preview = try BackupPreview(data: original)
        #expect(preview.version == 2)
        #expect(preview.originalData == original)
        let restored =
            try JSONSerialization.jsonObject(with: preview.originalData) as? [String: Any]
        #expect(restored?["future"] != nil)
    }

    @Test(arguments: Currency.allCases)
    func allNineCurrenciesAndSnapshotsAreSupported(_ currency: Currency) throws {
        let value = expense([
            "currency": currency.rawValue,
            "exchangeRate": [
                "baseCurrency": currency.rawValue, "rateToBase": 1, "source": "legacy",
            ],
        ])
        let v2 = try preview(
            version: 2, trip: ["baseCurrency": currency.rawValue, "expenses": [value]])
        #expect(v2.baseCurrency == currency)
        #expect(v2.expenseCount == 1)
        #expect(
            try preview(trip: [
                "baseCurrency": currency.rawValue,
                "expenses": [expense(["currency": currency.rawValue])],
            ]).expenseCount == 1)
    }

    @Test func versionAndRootErrorsAreMeaningful() throws {
        for text in ["{", "not JSON", "{\"version\":NaN}"] {
            #expect(throws: BackupPreviewError("備份不是有效的 JSON")) {
                try BackupPreview(data: Data(text.utf8))
            }
        }
        for value: Any in [NSNull(), [], "text", 1] {
            let data = try bytes(value)
            #expect(throws: BackupPreviewError("備份格式錯誤")) { try BackupPreview(data: data) }
        }
        for version: Any in [99, true, "1", NSNull()] {
            let data = try bytes(["version": version, "trip": [:]] as [String: Any])
            #expect(throws: BackupPreviewError("不支援的備份版本")) { try BackupPreview(data: data) }
        }
        #expect(throws: BackupPreviewError("備份缺少 trip")) {
            try BackupPreview(data: bytes(["version": 1]))
        }
    }

    @Test func tenMiBBoundaryIsCheckedBeforeParsing() throws {
        var data = try bytes(fixture())
        data.append(Data(repeating: 32, count: BackupPreview.maximumBytes - data.count))
        #expect(try BackupPreview(data: data).originalData.count == BackupPreview.maximumBytes)
        data.append(32)
        #expect(throws: BackupPreviewError("備份不可超過 10 MB")) { try BackupPreview(data: data) }
    }

    @Test func tripFieldValidationMatchesCore() throws {
        try rejects(["name": ""], "備份旅行名稱錯誤")
        try rejects(["name": String(repeating: "😀", count: 51)], "備份旅行名稱錯誤")
        try rejects(["baseCurrency": "BTC"], "備份基準貨幣錯誤")
        try rejects(["visaSettlementEnabled": "yes"], "備份 Visa 結清設定錯誤")
        try rejects(["visaSettlementEnabled": 1], "備份 Visa 結清設定錯誤")
        try rejects(["visaSettlementCurrency": NSNull()], "備份 Visa 結清貨幣錯誤")
        try rejects(["visaSettlementEnabled": true], "備份 Visa 結清貨幣錯誤")
        try rejects(["participants": []], "備份缺少參與者")
        try rejects(["expenses": NSNull()], "備份缺少支出")
        for rates: Any in [
            NSNull(), [], ["BTC": 1], ["USD": 0], ["USD": true], ["USD": 1e10], ["USD": 1e-9],
        ] {
            try rejects(["exchangeRates": rates], "備份匯率格式錯誤")
        }
        #expect(
            try preview(trip: ["exchangeRates": ["USD": 1e-8, "JPY": 9_999_999_999]]).name
                == "Tokyo")
    }

    @Test func participantNamesUseRawUTF16DuplicateKeysInBothVersions() throws {
        let nfc = "Jos\u{00E9}"
        let nfd = "Jose\u{0301}"
        #expect(Array(nfc.utf16) != Array(nfd.utf16))
        for version in [1, 2] {
            let original = try bytes(
                fixture(
                    version: version,
                    trip: [
                        "participants": [
                            ["id": "alice", "name": nfc], ["id": "bob", "name": nfd],
                        ]
                    ]))
            let result = try BackupPreview(data: original)
            #expect(result.participantCount == 2)
            #expect(result.originalData == original)
            let decoded = try JSONDecoder().decode(JSONValue.self, from: result.originalData)
            let participants = try #require(decoded["trip"]?["participants"]?.array)
            #expect(Array(try #require(participants[1]["name"]?.string).utf16) == Array(nfd.utf16))
            for duplicate in [" JOSE\u{0301} ", "\u{FEFF}Jose\u{0301}\u{FEFF}"] {
                try rejects(
                    [
                        "participants": [
                            ["id": "alice", "name": nfd], ["id": "bob", "name": duplicate],
                        ]
                    ], "備份參與者重複", version: version)
            }
            #expect(
                try preview(
                    version: version,
                    trip: [
                        "participants": [
                            ["id": "alice", "name": " "], ["id": "bob", "name": "\u{200B}"],
                        ]
                    ]
                ).participantCount == 2)
        }
    }

    @Test func representativesRejectMissingSelfCyclesAndChains() throws {
        let alice: [String: Any] = ["id": "alice", "name": "Alice"]
        let bob: [String: Any] = ["id": "bob", "name": "Bob", "settledById": "alice"]
        #expect(try preview(trip: ["participants": [alice, bob]]).participantCount == 2)
        for representative: Any in ["bob", "missing", 123, NSNull()] {
            try rejects(
                [
                    "participants": [
                        alice, ["id": "bob", "name": "Bob", "settledById": representative],
                    ]
                ], "備份結算歸屬格式錯誤")
        }
        try rejects(
            ["participants": [["id": "alice", "name": "Alice", "settledById": "bob"], bob]],
            "備份結算歸屬格式錯誤")
        try rejects(
            ["participants": [alice, bob, ["id": "c", "name": "C", "settledById": "bob"]]],
            "備份結算歸屬格式錯誤")
        try rejects(["participants": [alice, ["id": "bob", "name": " alice "]]], "備份參與者重複")
        try rejects(["participants": [alice, ["id": "alice", "name": "Other"]]], "備份參與者重複")
        try rejects(["participants": [NSNull()]], "備份參與者格式錯誤")
    }

    @Test func expenseFieldAndRelationshipErrors() throws {
        for changes: [String: Any] in [
            ["id": ""], ["description": ""], ["amountMinor": 0], ["amountMinor": true],
            ["amountMinor": 1.5],
            ["amountMinor": 9_007_199_254_740_992], ["currency": "BTC"], ["paidById": "missing"],
            ["expenseDate": "2026-02-29"], ["createdAt": NSNull()], ["participantIds": []],
        ] {
            try rejects(["expenses": [expense(changes)]], "備份支出格式錯誤")
        }
        try rejects(
            ["expenses": [expense(["participantIds": ["alice", "missing"]])]], "備份支出參與者不存在")
        try rejects(["expenses": [expense(["participantIds": ["alice", "alice"]])]], "備份支出參與者重複")
        try rejects(["expenses": [expense(["category": "invalid"])]], "備份支出分類錯誤")
        for tags: Any in ["tag", [1], [String(repeating: "😀", count: 13)]] {
            try rejects(["expenses": [expense(["tags": tags])]], "備份支出標籤錯誤")
        }
        // Core does not require exportedAt or a date-formatted createdAt.
        #expect(
            try preview(trip: [
                "expenses": [expense(["createdAt": "", "category": "交通", "tags": ["night"]])]
            ]).expenseCount == 1)
    }

    @Test func explicitShareValidation() throws {
        let shares: [[String: Any]] = [
            ["participantId": "alice", "shareMinor": 70],
            ["participantId": "bob", "shareMinor": 30],
        ]
        #expect(
            try preview(trip: ["expenses": [expense(["participantShares": shares])]]).expenseCount
                == 1)
        for invalid: Any in [
            NSNull(), [], [["participantId": "alice", "shareMinor": 100]],
            [
                ["participantId": "alice", "shareMinor": 70],
                ["participantId": "alice", "shareMinor": 30],
            ],
            [
                ["participantId": "alice", "shareMinor": 100],
                ["participantId": "bob", "shareMinor": 0],
            ],
            [["participantId": "missing", "shareMinor": 100]], [NSNull()],
        ] {
            try rejects(["expenses": [expense(["participantShares": invalid])]], "備份分帳格式錯誤")
        }
        try rejects(
            [
                "expenses": [
                    expense([
                        "participantShares": [
                            ["participantId": "alice", "shareMinor": 70],
                            ["participantId": "bob", "shareMinor": 31],
                        ]
                    ])
                ]
            ], "備份分帳加總錯誤")
    }

    @Test func v2RequiresValidSnapshotsButV1IgnoresSnapshotField() throws {
        for rate: Any in [
            NSNull(), [:], ["baseCurrency": "TWD", "rateToBase": -1, "source": "custom"],
            ["baseCurrency": "TWD", "rateToBase": 2, "source": "fixed"],
            ["baseCurrency": "TWD", "rateToBase": true, "source": "fixed"],
            ["baseCurrency": "TWD", "rateToBase": 1, "source": "fixed", "provider": NSNull()],
            [
                "baseCurrency": "TWD", "rateToBase": 1, "source": "bank",
                "provider": "BANK_OF_TAIWAN", "rateType": "spotMid", "fetchedAt": "bad",
            ],
        ] {
            try rejects(["expenses": [expense(["exchangeRate": rate])]], "備份支出匯率格式錯誤", version: 2)
        }
        try rejects(["expenses": [expense()]], "備份支出匯率格式錯誤", version: 2)
        #expect(try preview(trip: ["expenses": [expense(["exchangeRate": NSNull()])]]).version == 1)
        let bank: [String: Any] = [
            "baseCurrency": "TWD", "rateToBase": 1, "source": "bank",
            "provider": "BANK_OF_TAIWAN", "rateType": "spotMid",
            "fetchedAt": "2026-06-25T00:00:00.000Z",
        ]
        #expect(
            try preview(version: 2, trip: ["expenses": [expense(["exchangeRate": bank])]]).version
                == 2)
        // The snapshot can predate a base-currency change.
        #expect(try preview(version: 2, trip: ["baseCurrency": "EUR"]).version == 2)
    }

    @Test func convertedAmountRangeMatchesWebFixtures() throws {
        let snapshot: [String: Any] = ["baseCurrency": "TWD", "rateToBase": 1, "source": "legacy"]
        try rejects(
            [
                "baseCurrency": "EUR", "exchangeRates": ["TWD": 1e9, "EUR": 1e9],
                "expenses": [expense(["amountMinor": 100000, "exchangeRate": snapshot])],
            ],
            "備份支出換算金額超出範圍", version: 2)
        try rejects(
            [
                "baseCurrency": "EUR",
                "expenses": [
                    expense(["amountMinor": 4_000_000_000_000_000, "exchangeRate": snapshot])
                ],
            ],
            "備份支出換算金額超出範圍", version: 2)
    }

    @Test func visaSnapshotAndPaymentValidation() throws {
        let visa: [String: Any] = [
            "sourceCurrency": "TWD", "targetCurrency": "USD", "date": "2026-06-25",
            "rate": 0.03125, "fetchedAt": "2026-06-25T00:00:00.000Z",
        ]
        #expect(
            try preview(trip: [
                "visaSettlementEnabled": true, "visaSettlementCurrency": "USD",
                "expenses": [expense(["visaExchangeRate": visa])],
            ]).expenseCount == 1)
        try rejects(
            ["visaSettlementEnabled": true, "visaSettlementCurrency": "USD"], "備份 Visa 匯率格式錯誤")
        for changes: [String: Any] in [
            ["rate": 0], ["rate": true], ["date": "2026-06-24"],
            ["targetCurrency": "BTC"], ["sourceCurrency": "USD"], ["fetchedAt": "bad"],
        ] {
            let changed = visa.merging(changes) { _, new in new }
            try rejects(["expenses": [expense(["visaExchangeRate": changed])]], "備份 Visa 匯率格式錯誤")
        }
        let payment: [String: Any] = [
            "id": "payment", "fromId": "bob", "toId": "alice", "amountMinor": 100,
            "currency": "TWD", "paidAt": "2026-06-25", "note": "cash", "createdAt": "",
        ]
        #expect(try preview(trip: ["settlementPayments": [payment]]).paymentCount == 1)
        #expect(try preview(trip: ["settlementPayments": NSNull()]).paymentCount == 0)
        for changes: [String: Any] in [
            ["fromId": "missing"], ["toId": "bob"], ["amountMinor": -1],
            ["amountMinor": true], ["paidAt": "2026-02-29"], ["currency": "BTC"],
            ["note": String(repeating: "x", count: 161)],
        ] {
            try rejects(
                ["settlementPayments": [payment.merging(changes) { _, new in new }]], "備份付款紀錄格式錯誤")
        }
        try rejects(["settlementPayments": "not an array"], "備份付款紀錄格式錯誤")
        try rejects(
            [
                "visaSettlementEnabled": true, "visaSettlementCurrency": "USD",
                "expenses": [expense(["visaExchangeRate": visa])], "settlementPayments": [payment],
            ], "備份付款紀錄格式錯誤")
    }
}
