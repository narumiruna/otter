import Foundation
import Observation
import OtterKit

public enum ExpenseEditorMode {
    case new
    case edit(Expense)
    case copy(Expense)
}

/// All draft values and photos stay in memory. Only explicit defaults use local storage.
@MainActor
@Observable
final class ExpenseEditorState {
    var payload: TripPayload
    let mode: ExpenseEditorMode
    var description = ""
    var amount = ""
    var currency: Currency
    var paidByID: String
    var participantIDs: [String]
    var date = Date()
    var invalidDate: String?
    var splitMode: SplitMode = .equal
    var splitValues: [String: String] = [:]
    var category = "其他"
    var tags = ""
    var photo: Data?
    var removeReceipt = false
    var existingPhoto: Data?
    var receiptLoading = false
    var issue: String?
    var notice: String?
    var busy = false
    var finished = false
    var conflict = false
    var reviewLoaded = false
    var unknownCreate = false
    var creationConfirmed = false
    var checkedUnknown = false
    var savedExpenseID: String?
    var observed: Expense?
    var reviewExpense: Expense?
    var generation: UUID?
    private var baseline: NewExpense?
    private var originalTags: [String] = []
    private var originalTagsText = ""
    private var defaultsLoaded = false

    init(payload: TripPayload, mode: ExpenseEditorMode) {
        self.payload = payload
        self.mode = mode
        currency = payload.trip.baseCurrency
        paidByID = payload.trip.participants.first?.id ?? ""
        participantIDs = payload.trip.participants.map(\.id)
        switch mode {
        case .new: break
        case .edit(let expense), .copy(let expense):
            description = expense.description
            amount = expense.currency.majorString(expense.amountMinor)
            currency = expense.currency
            paidByID = expense.paidById
            participantIDs = expense.participantIds
            category = expense.category ?? ""
            originalTags = expense.tags ?? []
            tags = originalTags.joined(separator: ", ")
            originalTagsText = tags
            if let shares = expense.participantShares {
                // Saved shares are exact amounts, not a request to divide equally again.
                splitMode = .amount
                for share in shares {
                    splitValues[share.participantId] = currency.majorString(share.shareMinor)
                }
            }
            if case .edit = mode {
                date = Self.parseDate(expense.expenseDate) ?? Date()
                observed = expense
            }
        }
        baseline = input
    }

    convenience init(payload: TripPayload, draft: NewExpense) {
        self.init(payload: payload, mode: .new)
        description = draft.description
        amount = draft.amount
        currency = draft.currency
        paidByID = draft.paidById
        participantIDs = draft.participantIds
        if let parsed = Self.parseDate(draft.expenseDate) {
            date = parsed
        } else {
            invalidDate = draft.expenseDate
        }
        splitMode = draft.splitMode
        splitValues = draft.splitValues
        category = draft.category ?? ""
        originalTags = draft.tags
        tags = draft.tags.joined(separator: ", ")
        originalTagsText = tags
        baseline = input
    }

    var isNew: Bool {
        if case .new = mode { return true }
        return false
    }
    var isEdit: Bool {
        if case .edit = mode { return true }
        return false
    }
    var locked: Bool { busy || savedExpenseID != nil || unknownCreate }
    var dirty: Bool {
        baseline.map { !Self.sameInput(input, $0) } ?? true
            || photo != nil || removeReceipt || savedExpenseID != nil || unknownCreate
    }
    // Synthesized String equality treats different Unicode spellings as equal.
    private static func sameInput(_ left: NewExpense, _ right: NewExpense) -> Bool {
        left == right && WebText.equal(left.description, right.description)
            && left.tags.map { Array($0.utf16) } == right.tags.map { Array($0.utf16) }
    }
    var title: String {
        if isEdit { return NativeLocalization.string("編輯支出") }
        if isNew { return NativeLocalization.string("新增支出") }
        return NativeLocalization.string("複製為新支出")
    }
    var input: NewExpense {
        var seen = Set<[UInt16]>()
        let normalizedTags =
            WebText.equal(tags, originalTagsText)
            ? originalTags
            : tags.split(separator: ",").map { WebText.trim(String($0)) }
                .filter { !$0.isEmpty && seen.insert(Array($0.utf16)).inserted }
        return NewExpense(
            description: WebText.trim(description),
            amount: WebText.trim(amount), currency: currency,
            paidById: paidByID, participantIds: participantIDs,
            expenseDate: invalidDate ?? Self.dateString(date), splitMode: splitMode,
            splitValues: splitValues.filter { participantIDs.contains($0.key) },
            category: category.isEmpty ? nil : category, tags: normalizedTags)
    }
    var missingIDs: [String] {
        let valid = Set(payload.trip.participants.map(\.id))
        return Array(Set(participantIDs + [paidByID]).subtracting(valid)).sorted()
    }
    var preview: [ParticipantShare]? {
        guard let minor = try? currency.parseAmount(input.amount) else { return nil }
        return try? ExpenseMath.preview(
            mode: splitMode, participantIDs: participantIDs,
            amountMinor: minor, values: splitValues, currency: currency)
    }
    var validation: String? {
        if input.description.isEmpty || input.description.utf16.count > 120 {
            return NativeLocalization.string("請輸入 1 至 120 字的支出說明。")
        }
        if !missingIDs.isEmpty {
            return NativeLocalization.string("部分成員已不存在。請重新選擇付款人，移除不存在的分攤成員，並檢查指定金額；金額不會自動調整。")
        }
        if participantIDs.isEmpty { return NativeLocalization.string("請選擇至少一位分攤成員。") }
        if invalidDate != nil { return NativeLocalization.string("佇列中的日期無效。請選擇有效支出日期。") }
        if !category.isEmpty && !["餐飲", "交通", "住宿", "門票", "購物", "其他"].contains(category) {
            return NativeLocalization.string("請重新選擇有效分類。")
        }
        if preview == nil {
            return NativeLocalization.string(
                "請檢查總金額及分攤值。指定金額合計必須等於總額；比例、份數與每人分攤必須大於零。修改總額或幣別不會自動調整指定金額。")
        }
        if input.tags.count > 10 || input.tags.contains(where: { $0.utf16.count > 24 }) {
            return NativeLocalization.string("標籤最多 10 個，每個最多 24 字。")
        }
        return nil
    }
    var receiptExpense: Expense? { reviewLoaded ? reviewExpense : (savedExpense ?? observed) }
    var savedExpense: Expense? {
        guard let savedExpenseID else { return nil }
        return payload.trip.expenses.first { $0.id == savedExpenseID }
    }
    func permits(_ operation: TripOperation, session: AppSession) -> Bool {
        guard let client = session.client, generation == session.sessionID else { return false }
        return TripPermissions(payload: payload, auth: client.auth, userID: session.user?.id)
            .allows(operation)
    }
    func bind(session: AppSession) { if generation == nil { generation = session.sessionID } }
    func isCurrent(_ session: AppSession, _ id: UUID) -> Bool {
        generation == id && session.sessionID == id && !Task.isCancelled
    }
    func correctMissingParticipants() {
        participantIDs.removeAll { id in !payload.trip.participants.contains { $0.id == id } }
        notice = NativeLocalization.string("已移除不存在的分攤成員。請選擇有效付款人並手動修正分攤金額；未自動重分配。")
    }
    func toggle(_ id: String, selected: Bool) {
        if selected && !participantIDs.contains(id) {
            participantIDs.append(id)
        } else if !selected {
            participantIDs.removeAll { $0 == id }
        }
    }

    func loadDefaults(_ store: ExpenseDefaultsStore?, context: ExpenseContext?, session: AppSession)
        async
    {
        bind(session: session)
        guard !defaultsLoaded, isNew, !dirty, let store, let context,
            validContext(context, session: session), let id = generation
        else { return }
        defaultsLoaded = true
        let original = input
        do {
            let values = try await store.load(
                in: context, currentParticipantIDs: Set(payload.trip.participants.map(\.id)))
            guard isCurrent(session, id), Self.sameInput(original, input), !dirty, let values else {
                return
            }
            currency = values.currency
            if let split = values.split {
                splitMode = split.mode
                participantIDs = split.participantIDs
                splitValues = split.values
            }
            if values.invalidSplit {
                notice = NativeLocalization.string("已儲存的分攤設定不適用於目前成員，改用目前成員平均分攤。幣別已保留。")
            }
            baseline = input
        } catch { if isCurrent(session, id) { issue = error.localizedDescription } }
    }
    func validContext(_ context: ExpenseContext, session: AppSession) -> Bool {
        guard let client = session.client, context.userID == session.user?.id,
            context.tripID == payload.trip.id, permits(.queueExpense, session: session),
            let origin = try? ExpenseContext.canonicalOrigin(client.baseURL)
        else { return false }
        return origin == context.origin
    }
    func saveDefaults(
        _ store: ExpenseDefaultsStore, context: ExpenseContext, clear: Bool, session: AppSession
    ) async {
        guard !busy, isNew, validContext(context, session: session), let id = generation else {
            return
        }
        busy = true
        defer { busy = false }
        do {
            if clear {
                try await store.clear(in: context)
            } else {
                try await store.save(
                    ExpenseDefaults(
                        currency: currency, splitMode: splitMode,
                        participantIDs: participantIDs, splitValues: splitValues), in: context)
            }
            if isCurrent(session, id) {
                notice =
                    clear
                    ? NativeLocalization.string("已清除本機預設值；目前表單不變。")
                    : NativeLocalization.string("已儲存幣別及分攤預設值。未儲存金額、付款人、日期、說明、標籤或照片。")
            }
        } catch { if isCurrent(session, id) { issue = error.localizedDescription } }
    }

    func submit(session: AppSession, onPayload: @MainActor (TripPayload) -> Void) async {
        guard !busy, !receiptLoading, !conflict, !unknownCreate,
            !creationConfirmed || savedExpenseID != nil, permits(.editDailyData, session: session),
            let client = session.client, let id = generation,
            savedExpenseID != nil || validation == nil
        else { return }
        guard ExpenseMutationGate.shared.acquire(sessionID: id, tripID: payload.trip.id) else {
            issue = NativeLocalization.string("另一項支出操作仍在處理中。")
            return
        }
        busy = true
        issue = nil
        var posting = false
        defer {
            busy = false
            ExpenseMutationGate.shared.release(sessionID: id, tripID: payload.trip.id)
        }
        do {
            if savedExpenseID == nil {
                let response: TripPayload
                if isEdit {
                    guard let observed else { throw APIError.missingVersion }
                    response = try await client.updateExpense(
                        tripID: payload.trip.id, expense: observed, input: input)
                } else {
                    posting = true
                    response = try await client.addExpense(tripID: payload.trip.id, input: input)
                }
                guard isCurrent(session, id) else { return }
                posting = false
                if !isEdit { creationConfirmed = true }
                payload = response
                savedExpenseID = isEdit ? observed?.id : response.createdExpenseId
                onPayload(response)
                if photo != nil || removeReceipt {
                    guard savedExpenseID != nil, savedExpense != nil else {
                        unknownCreate = true
                        issue = NativeLocalization.string(
                            "支出已儲存，但回應缺少 createdExpenseId 或目前版本。請檢查群組；不會再新增一次。")
                        return
                    }
                }
            }
            if photo != nil || removeReceipt {
                guard let expense = savedExpense else { throw APIError.missingVersion }
                let response: TripPayload
                if let photo {
                    response = try await client.uploadReceipt(
                        tripID: payload.trip.id, expense: expense, bytes: photo,
                        mimeType: "image/jpeg")
                } else {
                    response = try await client.deleteReceipt(
                        tripID: payload.trip.id, expense: expense)
                }
                guard isCurrent(session, id) else { return }
                payload = response
                photo = nil
                removeReceipt = false
                onPayload(response)
            }
            guard isCurrent(session, id) else { return }
            finished = true
        } catch {
            guard generation == id, session.sessionID == id else { return }
            if Self.needsReview(error) {
                conflict = true
                reviewLoaded = false
                issue = NativeLocalization.string("版本已變更或缺少有效版本。草稿與照片仍保留。請比較最新內容並明確確認，再儲存。")
                do { try await fetchReview(session: session, onPayload: onPayload) } catch {
                    if isCurrent(session, id) {
                        issue =
                            NativeLocalization.string("無法載入最新內容。請重試載入；草稿仍保留。\n")
                            + error.localizedDescription
                    }
                }
            } else if posting && Self.unknownResult(error) {
                unknownCreate = true
                issue = NativeLocalization.string("新增結果不明。伺服器可能已建立支出。請先檢查最新群組，避免重複新增。")
            } else {
                issue =
                    savedExpenseID == nil
                    ? error.localizedDescription
                    : NativeLocalization.string("支出已儲存；收據尚未完成。重試只會處理收據。\n")
                        + error.localizedDescription
            }
            session.handle(error, for: id)
        }
    }
    static func needsReview(_ error: Error) -> Bool {
        if case APIError.missingVersion = error { return true }
        return status(error) == 412 || status(error) == 428
    }
    static func status(_ error: Error) -> Int? {
        if let response = error as? APIResponseError { return response.status }
        if case APIError.http(let status, _) = error { return status }
        return nil
    }
    static func unknownResult(_ error: Error) -> Bool {
        if let status = status(error) { return status >= 500 || status == 408 }
        if case APIError.invalidAmount = error { return false }
        if case APIError.invalidIdentifier = error { return false }
        return true
    }

    func reloadReview(session: AppSession, onPayload: @MainActor (TripPayload) -> Void) async {
        guard !busy, let id = generation, isCurrent(session, id), session.client != nil else {
            return
        }
        busy = true
        issue = nil
        reviewLoaded = false
        defer { busy = false }
        do { try await fetchReview(session: session, onPayload: onPayload) } catch {
            guard isCurrent(session, id) else { return }
            issue = error.localizedDescription
            session.handle(error, for: id)
        }
    }
    private func fetchReview(session: AppSession, onPayload: @MainActor (TripPayload) -> Void)
        async throws
    {
        guard let client = session.client, let id = generation, isCurrent(session, id) else {
            throw CancellationError()
        }
        let response = try await client.trip(id: payload.trip.id)
        guard isCurrent(session, id) else { return }
        payload = response
        reviewExpense = response.trip.expenses.first { $0.id == (savedExpenseID ?? observed?.id) }
        reviewLoaded = true
        checkedUnknown = unknownCreate
        existingPhoto = nil
        onPayload(response)
        if conflict && reviewExpense == nil {
            issue = NativeLocalization.string("這筆支出已不存在，不能以目前草稿覆寫。請關閉並檢查群組。")
        }
        if let expense = reviewExpense, expense.receiptId != nil || expense.receiptUrl != nil {
            let bytes = try await client.receipt(tripID: payload.trip.id, expenseID: expense.id)
            if isCurrent(session, id) { existingPhoto = bytes }
        }
    }
    func confirmReview() {
        guard reviewLoaded, let latest = reviewExpense, (latest.version ?? 0) > 0,
            savedExpenseID != nil || validation == nil
        else { return }
        observed = latest
        conflict = false
        reviewLoaded = false
        issue = nil
        notice = NativeLocalization.string("已確認最新版本。請再按儲存以提交保留的草稿。")
    }
    func loadReceipt(session: AppSession) async {
        guard let expense = observed, expense.receiptId != nil || expense.receiptUrl != nil,
            let client = session.client, let id = generation, isCurrent(session, id)
        else { return }
        do {
            let bytes = try await client.receipt(tripID: payload.trip.id, expenseID: expense.id)
            if isCurrent(session, id) { existingPhoto = bytes }
        } catch {
            if isCurrent(session, id) {
                issue = NativeLocalization.string("無法載入目前收據。\n") + error.localizedDescription
                session.handle(error, for: id)
            }
        }
    }
    func deleteExpense(session: AppSession, onPayload: @MainActor (TripPayload) -> Void) async {
        guard !busy, !receiptLoading, !conflict, savedExpenseID == nil, let observed,
            permits(.editDailyData, session: session), let client = session.client,
            let id = generation,
            ExpenseMutationGate.shared.acquire(sessionID: id, tripID: payload.trip.id)
        else { return }
        busy = true
        issue = nil
        defer {
            busy = false
            ExpenseMutationGate.shared.release(sessionID: id, tripID: payload.trip.id)
        }
        do {
            let response = try await client.deleteExpense(
                tripID: payload.trip.id, expense: observed)
            guard isCurrent(session, id) else { return }
            payload = response
            onPayload(response)
            finished = true
        } catch {
            guard isCurrent(session, id) else { return }
            issue = error.localizedDescription
            if Self.needsReview(error) {
                conflict = true
                reviewLoaded = false
                do { try await fetchReview(session: session, onPayload: onPayload) } catch {
                    if isCurrent(session, id) { issue = error.localizedDescription }
                }
            }
            session.handle(error, for: id)
        }
    }
    static func dateString(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter.string(from: date)
    }
    static func parseDate(_ value: String) -> Date? {
        let formatter = DateFormatter()
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.dateFormat = "yyyy-MM-dd"
        formatter.isLenient = false
        guard let date = formatter.date(from: value), formatter.string(from: date) == value else {
            return nil
        }
        return date
    }
}

/// Serialize editor and history writes for each signed-in generation and group.
@MainActor
final class ExpenseMutationGate {
    static let shared = ExpenseMutationGate()
    private var keys: Set<String> = []
    func acquire(sessionID: UUID, tripID: String) -> Bool {
        keys.insert("\(sessionID):\(tripID)").inserted
    }
    func release(sessionID: UUID, tripID: String) { keys.remove("\(sessionID):\(tripID)") }
}
