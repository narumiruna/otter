import Foundation
import OtterKit

@MainActor
final class LiveIntegration {
    let server: String
    let anonymous: OtterClient
    private var passed: Set<String> = []

    init(server: String) throws {
        self.server = server
        anonymous = try OtterClient(server: server)
    }

    func check(_ condition: Bool, _ name: String) throws {
        try require(condition, "Live assertion failed: \(name)")
        try require(passed.insert(name).inserted, "Duplicate live case: \(name)")
        print("PASS live \(name)")
    }

    func status(_ expected: Int, _ name: String, _ operation: () async throws -> Void) async throws
    {
        do { try await operation() } catch APIError.unauthorized {
            try require(
                expected == 401, "Live status differs: \(name), expected \(expected), received 401")
            try check(true, name)
            return
        } catch let error as APIResponseError {
            try require(
                error.status == expected,
                "Live status differs: \(name), expected \(expected), received \(error.status)")
            try check(true, name)
            return
        }
        throw IntegrationFailure("Live operation did not reject: \(name)")
    }

    func run(csv: String) async throws {
        let unauthenticated: UserResponse = try await anonymous.api("GET", path: "api/me")
        try check(unauthenticated.user == nil, "anonymous account has no user")
        try await status(401, "anonymous trips require authentication") {
            _ = try await self.anonymous.trips()
        }
        try await status(401, "anonymous AI catalog requires cookie") {
            let _: JSONValue = try await self.anonymous.api("GET", path: "api/auth/ai/catalog")
        }

        // All accounts and credentials are created through the real authentication API.
        let password = UUID().uuidString + "-aA1"
        let registered = try await anonymous.passwordLogin(
            username: "ios-owner", password: password, register: true)
        let editorLogin = try await anonymous.passwordLogin(
            username: "ios-editor", password: password, register: true)
        let outsiderLogin = try await anonymous.passwordLogin(
            username: "ios-outsider", password: password, register: true)
        let ownerLogin = try await anonymous.passwordLogin(
            username: "ios-owner", password: password)
        let owner = ownerLogin.client
        let editor = editorLogin.client
        let outsider = outsiderLogin.client
        try check(
            owner.auth.isSession && ownerLogin.user.id == registered.user.id,
            "password registration and login return session")
        try check(try await owner.user().id == registered.user.id, "session account identity")
        let renamed = try await owner.updateUsername("ios-owner-renamed")
        try check(renamed.username == "ios-owner-renamed", "cookie-only account rename")
        let catalog = try await owner.aiCatalog()
        try check(!catalog.providers.isEmpty, "cookie-only real AI catalog")
        try check(
            try await owner.aiConnections().connections.isEmpty,
            "AI connections start empty without fake provider success")
        try check(try await owner.aiSettings().settings == nil, "AI settings start empty")
        try check(try await owner.passkeys().passkeys.isEmpty, "cookie-only passkey list")
        let tokenRequest = try CreateApiTokenRequest(name: "Integration")
        let issued = try await owner.createToken(tokenRequest)
        let replay = try await owner.createToken(tokenRequest)
        try check(
            issued.token.id == replay.token.id && issued.accessToken == replay.accessToken,
            "token create replay is idempotent")
        try check(try await owner.tokens().tokens.count == 1, "replayed token has one list entry")
        let bearer = try OtterClient(server: server, token: issued.accessToken)
        try check(try await bearer.user().id == registered.user.id, "bearer identity")
        try await status(401, "bearer cannot rename account") {
            let _: JSONValue = try await bearer.api(
                "PATCH", path: "api/me", body: JSONEncoder().encode(["username": "not-allowed"]))
        }
        try await status(401, "bearer cannot list tokens") {
            let _: JSONValue = try await bearer.api("GET", path: "api/auth/tokens")
        }
        try await status(401, "bearer cannot read AI catalog") {
            let _: JSONValue = try await bearer.api("GET", path: "api/auth/ai/catalog")
        }

        var payload = try await owner.createTrip(name: "Integration trip", currency: .twd)
        let tripID = payload.trip.id
        try check(
            payload.trip.ownerId == registered.user.id && payload.trip.allowApiWrites == false,
            "group owner and default API writes false")
        payload = try await owner.trip(id: tripID)
        try check(payload.currentUserRole == .owner, "group read returns owner role")
        try check(
            try await owner.trips().trips.contains { $0.id == tripID },
            "group appears in active list")
        try await status(403, "API writes false blocks bearer mutation") {
            _ = try await bearer.addParticipant(tripID: tripID, name: "Blocked")
        }
        try await status(404, "nonmember cannot read group") {
            _ = try await outsider.trip(id: tripID)
        }
        payload = try await owner.addCollaborator(tripID: tripID, username: "ios-editor")
        try check(payload.collaborators?.count == 2, "owner adds editor membership")
        let editorPayload = try await editor.trip(id: tripID)
        try check(
            editorPayload.currentUserRole == .editor
                && editorPayload.collaborators?.isEmpty == true,
            "editor role hides collaborator identities")
        try await status(403, "editor cannot change API write permission") {
            _ = try await editor.updateTrip(id: tripID, patch: TripPatch(allowApiWrites: true))
        }
        try await status(404, "editor cannot delete owner group") {
            try await editor.deleteTrip(id: tripID)
        }
        payload = try await owner.updateTrip(id: tripID, patch: TripPatch(allowApiWrites: true))
        try check(payload.trip.allowApiWrites == true, "owner enables API writes")
        payload = try await bearer.updateTrip(
            id: tripID, patch: TripPatch(name: "Integration renamed"))
        try check(
            payload.trip.name == "Integration renamed", "API writes true permits bearer mutation")
        let tokenPerson = try unwrap(payload.trip.participants.first, "Missing token expense payer")
        let tokenInput = NewExpense(
            description: "Token boundary", amount: "10", currency: .twd,
            paidById: tokenPerson.id, participantIds: [tokenPerson.id], expenseDate: "2026-09-19")
        payload = try await bearer.addExpense(tripID: tripID, input: tokenInput)
        let tokenExpense = try unwrap(payload.trip.expenses.first, "Missing token-created expense")
        try check(tokenExpense.amountMinor == 10, "API writes true permits bearer expense create")
        payload = try await bearer.deleteExpense(tripID: tripID, expense: tokenExpense)
        try check(payload.trip.expenses.isEmpty, "API writes true permits bearer expense delete")
        try await status(403, "bearer cannot change API write permission") {
            _ = try await bearer.updateTrip(id: tripID, patch: TripPatch(allowApiWrites: false))
        }
        _ = try await owner.updateTrip(id: tripID, patch: TripPatch(allowApiWrites: false))
        try await status(403, "API writes true to false blocks again") {
            _ = try await bearer.updateTrip(id: tripID, patch: TripPatch(name: "Blocked"))
        }
        try await status(403, "API writes false blocks bearer expense create") {
            _ = try await bearer.addExpense(tripID: tripID, input: tokenInput)
        }

        let first = try unwrap(payload.trip.participants.first, "Group lacks initial participant")
        payload = try await owner.renameParticipant(
            tripID: tripID, participantID: first.id, name: "Alice")
        payload = try await editor.addParticipant(tripID: tripID, name: "Bob")
        payload = try await owner.addParticipant(tripID: tripID, name: "Carol")
        let ids = payload.trip.participants.map(\.id)
        try check(
            payload.trip.participants.map(\.name) == ["Alice", "Bob", "Carol"],
            "participant create rename and editor mutation")
        payload = try await owner.addParticipant(tripID: tripID, name: "Temporary")
        let temporary = try unwrap(
            payload.trip.participants.first { $0.name == "Temporary" },
            "Missing temporary participant")
        payload = try await owner.deleteParticipant(tripID: tripID, participantID: temporary.id)
        try check(payload.trip.participants.count == 3, "participant delete")

        for mode in SplitMode.allCases {
            let values = Dictionary(
                uniqueKeysWithValues: zip(
                    ids, mode == .amount ? ["20", "30", "50"] : ["1", "2", "3"]))
            let input = NewExpense(
                description: "\(mode.rawValue) expense", amount: "100", currency: .twd,
                paidById: ids[0], participantIds: ids, expenseDate: "2026-09-19", splitMode: mode,
                splitValues: values, category: "餐飲", tags: ["integration"])
            payload = try await owner.addExpense(tripID: tripID, input: input)
            let expense = try unwrap(
                payload.trip.expenses.first { $0.description == input.description },
                "Missing new expense")
            let shares = try ExpenseMath.preview(
                mode: mode, participantIDs: ids, amountMinor: 100, values: values, currency: .twd)
            try check(
                expense.amountMinor == 100 && expense.version == 1
                    && (mode == .equal
                        ? expense.participantShares == nil : expense.participantShares == shares),
                "expense create \(mode.rawValue)")
            let nextValues = Dictionary(
                uniqueKeysWithValues: zip(
                    ids, mode == .amount ? ["40", "60", "100"] : ["1", "2", "3"]))
            let updated = NewExpense(
                description: input.description, amount: "200", currency: .twd,
                paidById: ids[0], participantIds: ids, expenseDate: input.expenseDate,
                splitMode: mode,
                splitValues: nextValues, category: "餐飲", tags: ["integration"])
            payload = try await editor.updateExpense(
                tripID: tripID, expense: expense, input: updated)
            let changed = try unwrap(
                payload.trip.expenses.first { $0.id == expense.id }, "Missing changed expense")
            let changedShares = try ExpenseMath.preview(
                mode: mode, participantIDs: ids, amountMinor: 200, values: nextValues,
                currency: .twd)
            try check(
                changed.amountMinor == 200 && changed.version == 2
                    && (mode == .equal
                        ? changed.participantShares == nil
                        : changed.participantShares == changedShares),
                "expense update \(mode.rawValue)")
            try await status(412, "stale expense version rejects \(mode.rawValue)") {
                _ = try await owner.updateExpense(tripID: tripID, expense: expense, input: updated)
            }
        }
        try check(
            try await owner.trip(id: tripID).trip.expenses.count == 4,
            "expense read four split modes")
        var expense = try unwrap(payload.trip.expenses.first, "No expense for history")
        var history = try await owner.expenseHistory(tripID: tripID, expenseID: expense.id)
        let created = try unwrap(
            history.revisions.first { $0.action == .created }, "Missing created history revision")
        try check(
            history.revisions.count == 2 && history.revisions.contains { $0.action == .updated },
            "history contains created and updated revisions")
        payload = try await owner.restoreExpense(
            tripID: tripID, expenseID: expense.id, revisionID: created.id,
            currentVersion: unwrap(expense.version, "Missing expense version"))
        expense = try unwrap(
            payload.trip.expenses.first { $0.id == expense.id }, "Missing restored expense")
        try check(
            expense.amountMinor == 100 && expense.version == 3,
            "restore historical expense with optimistic version")
        let deletedID = expense.id
        payload = try await owner.deleteExpense(tripID: tripID, expense: expense)
        try check(!payload.trip.expenses.contains { $0.id == deletedID }, "expense delete")
        history = try await owner.expenseHistory(tripID: tripID, expenseID: deletedID)
        let deletedVersion = try unwrap(history.latestRevision?.version, "Missing deleted version")
        payload = try await owner.restoreExpense(
            tripID: tripID, expenseID: deletedID, revisionID: created.id,
            currentVersion: deletedVersion)
        expense = try unwrap(
            payload.trip.expenses.first { $0.id == deletedID }, "Missing undeleted expense")
        try check(expense.amountMinor == 100, "restore deleted expense")

        let png = try unwrap(
            Data(
                base64Encoded:
                    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a9WQAAAAASUVORK5CYII="
            ), "Invalid PNG fixture")
        let beforeReceipt = expense
        payload = try await owner.uploadReceipt(
            tripID: tripID, expense: expense, bytes: png, mimeType: "image/png")
        expense = try unwrap(
            payload.trip.expenses.first { $0.id == deletedID }, "Missing receipt expense")
        try check(
            expense.receiptId != nil && expense.version == (beforeReceipt.version ?? 0) + 1,
            "receipt upload increments version")
        try check(
            try await editor.receipt(tripID: tripID, expenseID: expense.id) == png,
            "receipt download exact PNG bytes")
        try await status(412, "stale receipt upload rejects") {
            _ = try await owner.uploadReceipt(
                tripID: tripID, expense: beforeReceipt, bytes: png, mimeType: "image/png")
        }
        let settlement = try unwrap(payload.settlements.first, "Missing settlement suggestion")
        payload = try await owner.recordSettlement(tripID: tripID, settlement: settlement)
        let payment = try unwrap(
            payload.trip.settlementPayments?.first, "Missing recorded settlement")
        try check(
            payment.amountMinor == settlement.amountMinor && payment.fromId == settlement.fromId,
            "settlement records suggested amount")
        try check(
            try Finance.balances(trip: payload.trip).map(\.amountMinor)
                == payload.balances.map(\.amountMinor),
            "live Swift balances match API after settlement")
        try check(
            try json(Finance.settlements(trip: payload.trip)) == json(payload.settlements),
            "live Swift settlements match API")

        try await shares(
            owner: owner, outsider: outsider, tripID: tripID, expense: expense, png: png)
        payload = try await owner.deletePayment(tripID: tripID, paymentID: payment.id)
        try check(payload.trip.settlementPayments?.isEmpty == true, "settlement delete")
        expense = try unwrap(
            payload.trip.expenses.first { $0.id == deletedID }, "Missing receipt to delete")
        payload = try await owner.deleteReceipt(tripID: tripID, expense: expense)
        try check(
            payload.trip.expenses.first { $0.id == deletedID }?.receiptId == nil, "receipt delete")
        try await status(404, "deleted receipt unavailable") {
            _ = try await owner.receipt(tripID: tripID, expenseID: deletedID)
        }

        payload = try await owner.setRepresentative(
            tripID: tripID, participantID: ids[2], representativeID: ids[1])
        try check(
            payload.trip.participants.first { $0.id == ids[2] }?.settledById == ids[1],
            "member settlement representative setting")
        payload = try await owner.setRepresentative(
            tripID: tripID, participantID: ids[2], representativeID: nil)
        try check(
            payload.trip.participants.first { $0.id == ids[2] }?.settledById == nil,
            "member representative clear encodes null")
        payload = try await owner.addParticipant(tripID: tripID, name: "Merge source")
        let mergeSource = try unwrap(
            payload.trip.participants.first { $0.name == "Merge source" }, "Missing merge source")
        payload = try await owner.mergeParticipant(
            tripID: tripID, sourceID: mergeSource.id, targetID: ids[1])
        try check(
            payload.trip.participants.count == 3
                && !payload.trip.participants.contains { $0.id == mergeSource.id },
            "member merge removes source")
        payload = try await owner.updateTrip(
            id: tripID, patch: TripPatch(exchangeRates: ["USD": 31, "JPY": 0.25]))
        try check(payload.trip.exchangeRates?["USD"] == 31, "custom exchange rate settings")
        payload = try await owner.setVisa(tripID: tripID, enabled: true, currency: .jpy)
        try check(
            payload.trip.visaSettlementEnabled == true
                && payload.balances.allSatisfy { $0.currency == .jpy },
            "Visa setting uses deterministic external quotes")
        try check(
            try Finance.balances(trip: payload.trip).map(\.amountMinor)
                == payload.balances.map(\.amountMinor), "live Visa balances match API")
        payload = try await owner.setVisa(tripID: tripID, enabled: false, currency: .jpy)
        try check(payload.trip.visaSettlementEnabled == false, "disable Visa settlement setting")
        payload = try await owner.updateTrip(id: tripID, patch: TripPatch(clearExchangeRates: true))
        try check(
            payload.exchangeRateInfo?.source == "bank"
                && payload.exchangeRateInfo?.customRates == nil
                && payload.trip.exchangeRates?["USD"] == 32, "clear custom exchange rates")

        try await roundtrips(owner: owner, tripID: tripID, csv: csv)
        payload = try await owner.removeCollaborator(tripID: tripID, userID: editorLogin.user.id)
        try check(payload.collaborators?.count == 1, "owner removes collaborator")
        try await status(404, "removed collaborator loses access") {
            _ = try await editor.trip(id: tripID)
        }
        try await owner.revokeToken(id: issued.token.id)
        try await status(401, "revoked token cannot authenticate") { _ = try await bearer.trips() }
        try check(try await owner.tokens().tokens.isEmpty, "revoked token removed from list")
        let secondToken = try await owner.createToken(CreateApiTokenRequest(name: "Self revoke"))
        let selfRevoking = try OtterClient(server: server, token: secondToken.accessToken)
        try await selfRevoking.revokeCurrentToken()
        try await status(401, "self-revoked token invalidated") {
            _ = try await selfRevoking.trips()
        }
        try await owner.logout()
        try await status(401, "logout invalidates cookie on trips") { _ = try await owner.trips() }
        try await status(401, "logout invalidates cookie on AI catalog") {
            _ = try await owner.aiCatalog()
        }
        try await status(401, "logout invalidates account rename") {
            _ = try await owner.updateUsername("invalid")
        }
        try check(
            try await registered.client.user().id == registered.user.id,
            "logout does not invalidate a different session")
        try await registered.client.logout()
        try await editor.logout()
        try await outsider.logout()
        print("PASS live total: \(passed.count)")
    }

    private func shares(
        owner: OtterClient, outsider: OtterClient, tripID: String, expense: Expense, png: Data
    ) async throws {
        let readonlyPayload = try await owner.createShare(tripID: tripID, mode: .readonly)
        let readonlyLink = try unwrap(
            readonlyPayload.shareLinks?.first { $0.url != nil }, "Missing readonly share link")
        let readonlyToken = try token(readonlyLink)
        let publicPayload: TripPayload = try await anonymous.api(
            "GET", path: "api/share/" + readonlyToken)
        try check(
            publicPayload.readonly == true && publicPayload.trip.ownerId == nil
                && publicPayload.trip.settlementPayments == nil
                && publicPayload.collaborators == nil && publicPayload.shareLinks == nil
                && publicPayload.trip.expenses.allSatisfy {
                    $0.receiptId == nil && $0.receiptUrl == nil
                },
            "readonly share hides identity payments receipts and links")
        try check(
            try Finance.memberAccounts(payload: publicPayload).allSatisfy {
                !$0.paymentDetailsAvailable && $0.payments.isEmpty
            }, "readonly member accounts do not reconstruct hidden payments")
        let readonly = try OtterClient(
            server: server, auth: .share(tripID: tripID, token: readonlyToken))
        try await status(401, "readonly share cannot write") {
            _ = try await readonly.addParticipant(tripID: tripID, name: "Forbidden")
        }
        try await status(401, "readonly share cannot download receipt") {
            _ = try await readonly.receipt(tripID: tripID, expenseID: expense.id)
        }
        _ = try await owner.revokeShare(tripID: tripID, linkID: readonlyLink.id)
        try await status(404, "revoked readonly URL unavailable") {
            let _: JSONValue = try await self.anonymous.api(
                "GET", path: "api/share/" + readonlyToken)
        }

        let editPayload = try await owner.createShare(tripID: tripID, mode: .anyoneEdit)
        let editLink = try unwrap(
            editPayload.shareLinks?.first { $0.url != nil }, "Missing edit share link")
        let editToken = try token(editLink)
        let share = try OtterClient(server: server, auth: .share(tripID: tripID, token: editToken))
        let shared = try await share.trip(id: tripID)
        try check(
            shared.currentUserRole == .editor && shared.collaborators?.isEmpty == true
                && shared.shareLinks?.isEmpty == true, "anyone edit share has scoped editor role")
        let added = try await share.addParticipant(tripID: tripID, name: "Share guest")
        let guest = try unwrap(
            added.trip.participants.first { $0.name == "Share guest" }, "Missing guest participant")
        try check(
            added.trip.participants.count == 4, "anyone edit share writes with API writes disabled")
        try check(
            try await share.receipt(tripID: tripID, expenseID: expense.id) == png,
            "edit share can read receipt bytes")
        try await status(401, "share transport blocks account access") {
            _ = try await share.user()
        }
        try await status(401, "edit share cannot create new share links") {
            let _: JSONValue = try await share.api("POST", path: "api/trips/\(tripID)/share-links")
        }
        _ = try await share.deleteParticipant(tripID: tripID, participantID: guest.id)
        _ = try await owner.revokeShare(tripID: tripID, linkID: editLink.id)
        try await status(401, "revoked edit capability loses access") {
            _ = try await share.trip(id: tripID)
        }

        let invitePayload = try await owner.createShare(tripID: tripID, mode: .signedInEdit)
        let invite = try unwrap(
            invitePayload.shareLinks?.first { $0.url != nil }, "Missing signed in edit invite")
        let inviteToken = try token(invite)
        let preview: JSONValue = try await anonymous.api("GET", path: "api/share/" + inviteToken)
        try check(
            preview["mode"]?.string == "signed-in-edit" && preview["trip"] == nil,
            "signed in edit preview has no trip details")
        try await status(401, "signed in edit join requires session") {
            let _: JSONValue = try await self.anonymous.api(
                "POST", path: "api/share/\(inviteToken)/join")
        }
        let joined: JSONValue = try await outsider.api(
            "POST", path: "api/share/\(inviteToken)/join")
        let joinedTrip = try await outsider.trip(id: tripID)
        try check(
            joined["tripId"]?.string == tripID && joinedTrip.currentUserRole == .editor,
            "signed in invite joins real account as editor")
        _ = try await owner.revokeShare(tripID: tripID, linkID: invite.id)
        try await status(404, "revoked invitation cannot join again") {
            let _: JSONValue = try await outsider.api("POST", path: "api/share/\(inviteToken)/join")
        }
        let joinedUser = try await outsider.user()
        _ = try await owner.removeCollaborator(tripID: tripID, userID: joinedUser.id)
        try await status(404, "removed invited member loses access") {
            _ = try await outsider.trip(id: tripID)
        }
    }

    private func token(_ link: TripShareLink) throws -> String {
        let url = try unwrap(link.url.flatMap(URL.init(string:)), "Missing share URL")
        return url.lastPathComponent
    }

    private func roundtrips(owner: OtterClient, tripID: String, csv: String) async throws {
        let source = try await owner.trip(id: tripID)
        let backup = try await owner.backup(tripID: tripID)
        let restored = try await owner.restoreBackup(backup)
        try check(
            restored.trip.id != tripID && restored.trip.expenses.count == source.trip.expenses.count
                && restored.trip.participants.map(\.name) == source.trip.participants.map(\.name)
                && restored.trip.expenses.map(\.amountMinor).sorted()
                    == source.trip.expenses.map(\.amountMinor).sorted(),
            "backup roundtrip preserves expenses and participants")
        try await owner.deleteTrip(id: restored.trip.id)
        var imported = try await owner.createTrip(name: "CSV integration", currency: .twd)
        let initial = try unwrap(imported.trip.participants.first, "CSV group lacks participant")
        imported = try await owner.renameParticipant(
            tripID: imported.trip.id, participantID: initial.id, name: "Alice")
        imported = try await owner.addParticipant(tripID: imported.trip.id, name: "Bob")
        imported = try await owner.addParticipant(tripID: imported.trip.id, name: "Carol")
        imported = try await owner.importCSV(tripID: imported.trip.id, csv: csv)
        try check(
            imported.trip.expenses.count == 3
                && Set(imported.trip.expenses.map(\.description)) == [
                    "Dinner", "Train", "DINNER extra",
                ]
                && imported.trip.expenses.contains {
                    $0.participantShares?.map(\.shareMinor).sorted() == [1, 100]
                }, "core CSV export to live Swift import roundtrip")
        let csvBackup = try await owner.backup(tripID: imported.trip.id)
        let importedAgain = try await owner.restoreBackup(csvBackup)
        try check(importedAgain.trip.expenses.count == 3, "CSV data survives backup roundtrip")
        try await owner.deleteTrip(id: imported.trip.id)
        try await owner.deleteTrip(id: importedAgain.trip.id)
        let archived = try await owner.updateTrip(id: tripID, patch: TripPatch(archived: true))
        try check(archived.trip.archivedAt != nil, "archive group")
        let listing = try await owner.trips()
        try check(
            listing.archivedTrips.contains { $0.id == tripID }
                && !listing.trips.contains { $0.id == tripID }, "archived list separates group")
        try await status(409, "archived group rejects writes") {
            _ = try await owner.addParticipant(tripID: tripID, name: "Blocked")
        }
        let copied = try await owner.copyTrip(id: tripID)
        try check(
            copied.trip.id != tripID && copied.trip.archivedAt == nil
                && copied.trip.expenses.isEmpty
                && copied.trip.allowApiWrites == false
                && copied.trip.participants.map(\.name) == source.trip.participants.map(\.name),
            "copy archived group creates independent empty active group")
        try await owner.deleteTrip(id: copied.trip.id)
        try await status(404, "deleted copy unavailable") {
            _ = try await owner.trip(id: copied.trip.id)
        }
        let active = try await owner.updateTrip(id: tripID, patch: TripPatch(archived: false))
        try check(active.trip.archivedAt == nil, "unarchive group")
    }
}
