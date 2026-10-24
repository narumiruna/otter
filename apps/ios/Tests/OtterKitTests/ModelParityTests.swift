import Foundation
import Testing

@testable import OtterKit

struct ModelParityTests {
    private let fixture = #"""
        {
          "trip": {
            "id":"trip", "ownerId":"owner", "name":"Example", "baseCurrency":"TWD",
            "archivedAt":null, "allowApiWrites":true, "createdAt":"2026-10-23T00:00:00Z",
            "visaSettlementEnabled":true, "visaSettlementCurrency":"JPY",
            "exchangeRates":{"TWD":1,"USD":31.5,"JPY":0.22},
            "participants":[{"id":"a","name":"A"},{"id":"b","name":"B","settledById":"a"}],
            "expenses":[{
              "id":"expense", "description":"Example", "amountMinor":101, "currency":"USD",
              "paidById":"a", "participantIds":["a","b"], "expenseDate":"2026-10-23",
              "createdAt":"2026-10-23T01:00:00Z", "version":7,
              "exchangeRate":{"baseCurrency":"TWD","rateToBase":31.5,"source":"bank",
                "provider":"BANK_OF_TAIWAN","rateType":"spotMid","fetchedAt":"2026-10-23T00:00:00Z"},
              "visaExchangeRate":{"sourceCurrency":"USD","targetCurrency":"JPY","date":"2026-10-23",
                "rate":150.3,"fetchedAt":"2026-10-23T00:00:00Z"},
              "participantShares":[{"participantId":"a","shareMinor":40},{"participantId":"b","shareMinor":61}],
              "category":"餐飲", "tags":["example","lunch"], "receiptId":"receipt",
              "receiptUrl":"/api/trips/trip/expenses/expense/receipt"
            }],
            "settlementPayments":[{"id":"p","fromId":"b","toId":"a","amountMinor":1,
              "currency":"JPY","paidAt":"2026-10-23","note":"example","createdAt":"2026-10-23T02:00:00Z"}]
          },
          "balances":[{"participantId":"a","name":"A","amountMinor":0,"currency":"JPY"}],
          "settlements":[], "currentUserRole":"owner", "readonly":false, "shareMode":"signed-in-edit",
          "createdExpenseId":"expense",
          "collaborators":[{"userId":"owner","name":"Owner","username":"owner","role":"owner","createdAt":"2026-10-23T00:00:00Z"}],
          "shareLinks":[{"id":"link","mode":"readonly","createdAt":"2026-10-23T00:00:00Z","revokedAt":null,"expiresAt":null}],
          "exchangeRateInfo":{"source":"custom","customRates":{"USD":31.5},"defaults":{"source":"bank",
            "fetchedAt":"2026-10-23T00:00:00Z","provider":"BANK_OF_TAIWAN","rateType":"spotMid","rates":{"USD":32}}}
        }
        """#

    @Test func completePayloadRoundTrip() throws {
        let payload = try JSONDecoder().decode(TripPayload.self, from: Data(fixture.utf8))
        #expect(payload.currentUserRole == .owner)
        #expect(payload.shareMode == .signedInEdit)
        #expect(payload.createdExpenseId == "expense")
        #expect(payload.trip.ownerId == "owner")
        #expect(payload.trip.settlementCurrency == .jpy)
        #expect(payload.trip.participants[1].settledById == "a")
        #expect(payload.trip.expenses[0].participantShares?.map(\.shareMinor) == [40, 61])
        #expect(payload.trip.expenses[0].visaExchangeRate?.rate == 150.3)
        #expect(payload.trip.expenses[0].receiptId == "receipt")
        #expect(payload.collaborators?.first?.role == .owner)
        #expect(payload.shareLinks?.first?.url == nil)
        #expect(payload.exchangeRateInfo?.defaults?.rates["USD"] == 32)
        let encoded = try JSONEncoder().encode(payload)
        let original = try #require(
            JSONSerialization.jsonObject(with: Data(fixture.utf8)) as? NSDictionary)
        let output = try #require(JSONSerialization.jsonObject(with: encoded) as? NSDictionary)
        // archivedAt may be omitted rather than encoded as null.
        let originalTrip = try #require(
            (original["trip"] as? NSDictionary)?.mutableCopy() as? NSMutableDictionary)
        originalTrip.removeObject(forKey: "archivedAt")
        let expected = try #require(original.mutableCopy() as? NSMutableDictionary)
        expected["trip"] = originalTrip
        #expect(expected == output)
        _ = try JSONDecoder().decode(TripPayload.self, from: encoded)
    }

    @Test func legacyAndReadonlyPayloadsDoNotCreatePrivateDetails() throws {
        let data = Data(
            #"{"trip":{"id":"t","name":"Example","baseCurrency":"USD","participants":[{"id":"a","name":"A"}],"expenses":[{"id":"e","description":"Example","amountMinor":1,"currency":"USD","paidById":"a","participantIds":["a"],"expenseDate":"2026-10-23"}]},"balances":[],"settlements":[],"readonly":true,"shareMode":"readonly"}"#
                .utf8)
        let payload = try JSONDecoder().decode(TripPayload.self, from: data)
        #expect(payload.trip.ownerId == nil)
        #expect(payload.trip.createdAt == nil)
        #expect(payload.trip.expenses[0].createdAt == nil)
        #expect(payload.trip.expenses[0].version == nil)
        #expect(payload.trip.settlementPayments == nil)
        #expect(payload.collaborators == nil)
        #expect(payload.trip.expenses[0].receiptUrl == nil)
        let roundTrip = try JSONDecoder().decode(
            TripPayload.self, from: JSONEncoder().encode(payload))
        #expect(roundTrip.trip.settlementPayments == nil)
    }

    @Test func creationDefaultsAndPartialUpdate() throws {
        let old = Data(
            #"{"description":"Example","amount":"1.01","currency":"USD","paidById":"a","participantIds":["a"],"expenseDate":"2026-10-23"}"#
                .utf8)
        let decoded = try JSONDecoder().decode(NewExpense.self, from: old)
        #expect(decoded.splitMode == .equal)
        #expect(decoded.splitValues.isEmpty && decoded.tags.isEmpty && decoded.category == nil)
        let input = NewExpense(
            description: "Example", amount: "1.01", currency: .usd,
            paidById: "a", participantIds: ["a"], expenseDate: "2026-10-23",
            splitMode: .ratio, splitValues: ["a": "3"], category: "餐飲", tags: ["example"])
        #expect(
            try JSONDecoder().decode(NewExpense.self, from: JSONEncoder().encode(input)) == input)
        let update = ExpenseUpdate(description: "Changed")
        let json = try #require(
            JSONSerialization.jsonObject(with: JSONEncoder().encode(update)) as? [String: String])
        #expect(json == ["description": "Changed"])
    }

    @Test func historyPreservesSnapshotsNullsAndPagination() throws {
        let payload = try JSONDecoder().decode(TripPayload.self, from: Data(fixture.utf8))
        let snapshot = ExpenseSnapshot(
            expense: payload.trip.expenses[0], participants: payload.trip.participants,
            receipt: ExpenseReceipt(id: "receipt", mimeType: "image/png"))
        let revision = ExpenseRevision(
            id: "r", expenseId: "expense", version: 8, action: .restored,
            source: .versionRestore, recordedAt: "2026-10-23T01:00:00Z", snapshot: snapshot,
            changedFields: [.participantShares, .visaExchangeRate, .receipt])
        let page = ExpenseHistoryPage(
            revisions: [revision], nextCursor: "cursor",
            latestRevision: ExpenseLatestRevision(version: 9, action: .deleted))
        let data = try JSONEncoder().encode(page)
        let decoded = try JSONDecoder().decode(ExpenseHistoryPage.self, from: data)
        #expect(decoded.nextCursor == "cursor")
        #expect(decoded.latestRevision?.action == .deleted)
        #expect(decoded.revisions[0].snapshot.expense.participantShares?.count == 2)
        #expect(decoded.revisions[0].snapshot.receipt?.mimeType == "image/png")
        #expect(
            decoded.revisions[0].changedFields == [.participantShares, .visaExchangeRate, .receipt])
        let root = try #require(JSONSerialization.jsonObject(with: data) as? [String: Any])
        let encodedRevision = try #require((root["revisions"] as? [[String: Any]])?.first)
        #expect(encodedRevision["actor"] is NSNull)
        #expect(encodedRevision["previousSnapshot"] is NSNull)
        let emptyPage = try #require(
            JSONSerialization.jsonObject(
                with: JSONEncoder().encode(ExpenseHistoryPage(revisions: []))) as? [String: Any])
        #expect(emptyPage["nextCursor"] is NSNull)
        let noReceipt = ExpenseSnapshot(
            expense: payload.trip.expenses[0], participants: payload.trip.participants)
        let snapshotJSON = try #require(
            JSONSerialization.jsonObject(with: JSONEncoder().encode(noReceipt)) as? [String: Any])
        #expect(snapshotJSON["receipt"] is NSNull)
    }

    @Test func groupSummariesRoundTrip() throws {
        let summaries = TripsResponse(
            trips: [
                TripSummary(
                    id: "t", name: "Example", baseCurrency: .krw,
                    participantCount: 2, expenseCount: 3)
            ],
            archivedTrips: [
                TripSummary(
                    id: "old", name: "Old",
                    baseCurrency: .eur, archivedAt: "2026-10-23T00:00:00Z", participantCount: 1,
                    expenseCount: 0)
            ])
        let decoded = try JSONDecoder().decode(
            TripsResponse.self, from: JSONEncoder().encode(summaries))
        #expect(decoded.trips[0].expenseCount == 3)
        #expect(decoded.archivedTrips[0].archivedAt != nil)
    }
}
