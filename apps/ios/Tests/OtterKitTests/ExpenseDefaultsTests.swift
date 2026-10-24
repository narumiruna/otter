import Foundation
import Testing

@testable import OtterKit

private func defaultsContext(
    origin: String = "https://otter.example", user: String = "user_1", trip: String = "trip_1"
) throws -> ExpenseContext {
    try ExpenseContext(origin: URL(string: origin)!, userID: user, tripID: trip)
}

struct ExpenseDefaultsTests {
    @Test func explicitSaveLoadClearAndRestart() async throws {
        let memory = ExpenseTestStorage()
        let store = ExpenseDefaultsStore(storage: memory.storage)
        let context = try defaultsContext()
        #expect(try await store.load(in: context, currentParticipantIDs: ["a", "b"]) == nil)
        #expect(memory.writeCount == 0)
        let defaults = ExpenseDefaults(
            currency: .usd, splitMode: .amount, participantIDs: ["a", "b"],
            splitValues: ["a": "2.00", "b": "8.00", "notSelected": "secret"])
        try await store.save(defaults, in: context)
        let restarted = ExpenseDefaultsStore(storage: memory.storage)
        let saved = try #require(
            await restarted.load(in: context, currentParticipantIDs: ["a", "b"]))
        #expect(saved.currency == .usd)
        #expect(saved.split?.mode == .amount)
        #expect(saved.split?.participantIDs == ["a", "b"])
        #expect(saved.split?.values == ["a": "2.00", "b": "8.00"])
        #expect(!saved.invalidSplit)
        #expect(memory.writeCount == 1)
        try await restarted.clear(in: context)
        #expect(
            try await ExpenseDefaultsStore(storage: memory.storage).load(
                in: context, currentParticipantIDs: ["a", "b"]) == nil)
    }

    @Test func defaultsAreIsolatedByCanonicalOriginUserAndTrip() async throws {
        let store = ExpenseDefaultsStore(storage: ExpenseTestStorage().storage)
        let context = try defaultsContext()
        try await store.save(ExpenseDefaults(currency: .jpy, participantIDs: ["a"]), in: context)
        for other in [
            try defaultsContext(origin: "https://other.example"),
            try defaultsContext(user: "other"), try defaultsContext(trip: "other"),
        ] {
            #expect(try await store.load(in: other, currentParticipantIDs: ["a"]) == nil)
        }
        let equivalent = try defaultsContext(origin: "https://OTTER.example:443/")
        #expect(
            try await store.load(in: equivalent, currentParticipantIDs: ["a"])?.currency == .jpy)
    }

    @Test func removedParticipantsClearSplitButKeepValidCurrencyWithoutImplicitSave() async throws {
        let memory = ExpenseTestStorage()
        let store = ExpenseDefaultsStore(storage: memory.storage)
        let context = try defaultsContext()
        try await store.save(
            ExpenseDefaults(
                currency: .eur, splitMode: .ratio, participantIDs: ["removed"],
                splitValues: ["removed": "2"]),
            in: context)
        let savedBytes = memory.data
        let resolved = try #require(await store.load(in: context, currentParticipantIDs: ["new"]))
        #expect(resolved.currency == .eur)
        #expect(resolved.split == nil)
        #expect(resolved.invalidSplit)
        #expect(memory.data == savedBytes)
        #expect(memory.writeCount == 1)
    }

    @Test(arguments: [SplitMode.equal, .amount, .ratio, .shares])
    func eachSplitModePreservesInputStringsWithoutRescale(_ mode: SplitMode) async throws {
        let store = ExpenseDefaultsStore(storage: ExpenseTestStorage().storage)
        let context = try defaultsContext()
        let values = ["a": "002.00", "b": "8.00"]
        try await store.save(
            ExpenseDefaults(
                currency: .usd, splitMode: mode, participantIDs: ["a", "b"], splitValues: values),
            in: context)
        let result = try #require(
            await store.load(in: context, currentParticipantIDs: ["a", "b", "new"]))
        #expect(!result.invalidSplit)
        #expect(result.split?.values == values)
        #expect(result.split?.participantIDs == ["a", "b"])
    }

    @Test func defaultsValidateWithECMAScriptTrimAndPreserveStoredInput() async throws {
        let store = ExpenseDefaultsStore(storage: ExpenseTestStorage().storage)
        let context = try defaultsContext()
        for mode in [SplitMode.amount, .ratio, .shares] {
            for text in WebTextFixtures.whitespace + WebTextFixtures.nonWhitespace {
                let raw = text + "1.00" + text
                try await store.save(
                    ExpenseDefaults(
                        currency: .usd, splitMode: mode, participantIDs: ["a"],
                        splitValues: ["a": raw]),
                    in: context)
                let result = try #require(
                    await store.load(in: context, currentParticipantIDs: ["a"]))
                let valid = WebTextFixtures.whitespace.contains(text)
                #expect(result.invalidSplit == !valid)
                if valid {
                    #expect(result.split?.values["a"].map { Array($0.utf16) } == Array(raw.utf16))
                }
            }
        }
    }

    @Test func invalidSplitsKeepCurrencyAndReportWarning() async throws {
        let store = ExpenseDefaultsStore(storage: ExpenseTestStorage().storage)
        let context = try defaultsContext()
        let invalid: [ExpenseDefaults] = [
            ExpenseDefaults(currency: .usd, participantIDs: []),
            ExpenseDefaults(currency: .usd, participantIDs: ["a", "a"]),
            ExpenseDefaults(
                currency: .usd, splitMode: .ratio, participantIDs: ["a"], splitValues: ["a": "0"]),
            ExpenseDefaults(
                currency: .usd, splitMode: .shares, participantIDs: ["a"], splitValues: ["a": "-1"]),
            ExpenseDefaults(
                currency: .usd, splitMode: .ratio, participantIDs: ["a"], splitValues: ["a": "NaN"]),
            ExpenseDefaults(
                currency: .usd, splitMode: .ratio, participantIDs: ["a"], splitValues: ["a": "1e3"]),
            ExpenseDefaults(currency: .usd, splitMode: .ratio, participantIDs: ["a"]),
            ExpenseDefaults(
                currency: .usd, splitMode: .amount, participantIDs: ["a"],
                splitValues: ["a": "0.001"]),
            ExpenseDefaults(
                currency: .usd, splitMode: .amount, participantIDs: ["a"],
                splitValues: ["a": "90071992547410"]),
        ]
        for value in invalid {
            try await store.save(value, in: context)
            let result = try #require(await store.load(in: context, currentParticipantIDs: ["a"]))
            #expect(result.currency == .usd)
            #expect(result.split == nil)
            #expect(result.invalidSplit)
        }
    }

    @Test func zeroIndividualAmountSharesAreValidAndSafeIntegerSumIsChecked() async throws {
        let store = ExpenseDefaultsStore(storage: ExpenseTestStorage().storage)
        let context = try defaultsContext()
        try await store.save(
            ExpenseDefaults(
                currency: .usd, splitMode: .amount, participantIDs: ["a", "b"],
                splitValues: ["a": "0.00", "b": "1.00"]),
            in: context)
        #expect(
            try await store.load(in: context, currentParticipantIDs: ["a", "b"])?.invalidSplit
                == false)
        try await store.save(
            ExpenseDefaults(
                currency: .usd, splitMode: .amount, participantIDs: ["a", "b"],
                splitValues: ["a": "90071992547409.91", "b": "0.01"]),
            in: context)
        #expect(
            try await store.load(in: context, currentParticipantIDs: ["a", "b"])?.invalidSplit
                == true)
    }

    @Test func saveAndClearFailuresPreserveLastSavedPreferences() async throws {
        let memory = ExpenseTestStorage()
        let store = ExpenseDefaultsStore(storage: memory.storage)
        let context = try defaultsContext()
        try await store.save(ExpenseDefaults(currency: .gbp, participantIDs: ["a"]), in: context)
        memory.fail(write: 2)
        await #expect(throws: ExpenseTestStorage.Failure.self) {
            try await store.save(
                ExpenseDefaults(currency: .jpy, participantIDs: ["a"]), in: context)
        }
        #expect(try await store.load(in: context, currentParticipantIDs: ["a"])?.currency == .gbp)
        memory.fail(write: 3)
        await #expect(throws: ExpenseTestStorage.Failure.self) {
            try await store.clear(in: context)
        }
        #expect(try await store.load(in: context, currentParticipantIDs: ["a"])?.currency == .gbp)
    }

    @Test func corruptAndUnknownSchemasFailClosedWithoutDeletingData() async throws {
        for raw in [
            "corrupt", #"{"version":2,"entries":[]}"#,
            #"{"version":1,"entries":[{"context":{"origin":"https://otter.example","userID":"u","tripID":"t"},"defaults":{"currency":"UNKNOWN","splitMode":"equal","participantIDs":[],"splitValues":{}}}]}"#,
        ] {
            let bytes = Data(raw.utf8)
            let memory = ExpenseTestStorage(bytes)
            let store = ExpenseDefaultsStore(storage: memory.storage)
            let context = try defaultsContext()
            await #expect(throws: ExpenseStorageError.self) {
                try await store.load(in: context, currentParticipantIDs: [])
            }
            await #expect(throws: ExpenseStorageError.self) { try await store.clear(in: context) }
            await #expect(throws: ExpenseStorageError.self) {
                try await store.save(
                    ExpenseDefaults(currency: .usd, participantIDs: ["a"]), in: context)
            }
            #expect(memory.data == bytes)
            #expect(memory.writeCount == 0)
        }
    }

    @Test func savedFileContainsOnlyPreferenceFieldsAndClearDoesNotTouchQueue() async throws {
        let defaultsMemory = ExpenseTestStorage()
        let queueMemory = ExpenseTestStorage()
        let store = ExpenseDefaultsStore(storage: defaultsMemory.storage)
        let queue = ExpenseQueue(storage: queueMemory.storage)
        let context = try defaultsContext()
        let draft = NewExpense(
            description: "Private description", amount: "10", currency: .usd, paidById: "payer",
            participantIds: ["a"], expenseDate: "2026-10-23")
        let item = try await queue.enqueue(draft, in: context)
        try await store.save(ExpenseDefaults(currency: .usd, participantIDs: ["a"]), in: context)
        let bytes = try #require(defaultsMemory.data)
        let json = try #require(JSONSerialization.jsonObject(with: bytes) as? [String: Any])
        let entries = try #require(json["entries"] as? [[String: Any]])
        let defaults = try #require(entries.first?["defaults"] as? [String: Any])
        #expect(Set(defaults.keys) == ["currency", "splitMode", "participantIDs", "splitValues"])
        try await store.clear(in: context)
        #expect(try await queue.list(in: context).first?.id == item.id)
        #expect(try await queue.list(in: context).first?.draft == draft)
    }
}
