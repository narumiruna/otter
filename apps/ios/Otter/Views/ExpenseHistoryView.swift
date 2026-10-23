import OtterKit
import SwiftUI

@MainActor
public struct ExpenseHistoryView: View {
    @Environment(AppSession.self) private var session
    @Environment(\.dismiss) private var dismiss
    @Environment(\.locale) private var locale
    @State private var payload: TripPayload
    private let expenseID: String?
    private let onPayload: @MainActor (TripPayload) -> Void
    @State private var generation: UUID?
    @State private var revisions: [ExpenseRevision] = []
    @State private var cursor: String?
    @State private var loaded = false
    @State private var busy = false
    @State private var issue: String?
    @State private var selected: ExpenseRevision?
    @State private var reviewVersion: Int?
    @State private var reviewCurrent: Expense?
    @State private var conflict = false
    @State private var missingPeople = false

    public init(
        payload: TripPayload, expenseID: String? = nil,
        onPayload: @escaping @MainActor (TripPayload) -> Void
    ) {
        _payload = State(initialValue: payload)
        self.expenseID = expenseID
        self.onPayload = onPayload
    }
    private func permits(_ operation: TripOperation) -> Bool {
        guard let client = session.client, generation == session.sessionID else { return false }
        return TripPermissions(payload: payload, auth: client.auth, userID: session.user?.id)
            .allows(operation)
    }
    private func current(_ id: UUID) -> Bool {
        session.sessionID == id && generation == id && !Task.isCancelled
    }
    public var body: some View {
        NavigationStack {
            List {
                if generation != nil && generation != session.sessionID {
                    Text("登入狀態已變更。請關閉並重新開啟修改紀錄。")
                } else if !permits(.readHistory) {
                    Text("目前權限不允許讀取修改紀錄。唯讀分享不提供此功能。")
                } else {
                    if payload.trip.archivedAt != nil { Text("群組已封存。可以讀取紀錄，但不能還原。") }
                    if let selected { reviewSection(selected) }
                    ForEach(revisions) { revision in
                        Section {
                            VStack(alignment: .leading, spacing: 4) {
                                Text(revision.snapshot.expense.description).font(.headline)
                                Text(
                                    "版本 \(revision.version) · \(actionLabel(revision.action)) · \(revision.source.rawValue)"
                                )
                                Text(
                                    revision.actor?.name
                                        ?? NativeLocalization.string("系統或未知操作者", locale: locale))
                                if let actor = revision.actor {
                                    Text("操作者識別碼：\(actor.id)").font(.caption)
                                }
                                Text(
                                    NativeDisplayFormatting.timestamp(
                                        revision.recordedAt, locale: locale)
                                ).font(.caption).textSelection(.enabled)
                            }
                            ForEach(revision.changedFields, id: \.self) { field in
                                VStack(alignment: .leading, spacing: 4) {
                                    Text(ExpenseSnapshotDetails.label(field)).font(
                                        .subheadline.bold())
                                    Text(
                                        "之前：\(revision.previousSnapshot.map { ExpenseSnapshotDetails.value(field, snapshot: $0, locale: locale) } ?? NativeLocalization.string("無", locale: locale))"
                                    )
                                    Text(
                                        "之後：\(ExpenseSnapshotDetails.value(field, snapshot: revision.snapshot, locale: locale))"
                                    )
                                }.font(.caption)
                            }
                            if let before = revision.previousSnapshot {
                                DisclosureGroup("之前的完整快照") {
                                    ExpenseSnapshotDetails(
                                        expense: before.expense, participants: before.participants,
                                        receipt: before.receipt)
                                }
                            }
                            DisclosureGroup("此版本的完整快照") {
                                ExpenseSnapshotDetails(
                                    expense: revision.snapshot.expense,
                                    participants: revision.snapshot.participants,
                                    receipt: revision.snapshot.receipt)
                            }
                            if permits(.editDailyData) {
                                Button("檢查並還原版本 \(revision.version)") {
                                    Task { await openReview(revision) }
                                }
                                .disabled(busy)
                            }
                        }
                    }
                    if !loaded {
                        Button("載入修改紀錄") { Task { await load(reset: true) } }.disabled(busy)
                    } else if cursor != nil {
                        Button("載入更多紀錄") { Task { await load(reset: false) } }.disabled(busy)
                    } else if revisions.isEmpty {
                        Text("沒有修改紀錄。")
                    }
                    Button("重新載入紀錄") { Task { await load(reset: true) } }.disabled(busy)
                }
                if let issue {
                    Text(issue).foregroundStyle(.red).accessibilityIdentifier(
                        "expense-history-error")
                }
                if busy { ProgressView("正在載入或處理…") }
            }
            .navigationTitle(
                expenseID == nil ? LocalizedStringKey("群組修改紀錄") : LocalizedStringKey("支出修改紀錄")
            )
            .navigationBarTitleDisplayMode(.inline)
            .navigationBarBackButtonHidden(true)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("web.close") { dismiss() }.disabled(busy)
                }
            }
        }
        .interactiveDismissDisabled(busy)
        .task {
            if generation == nil { generation = session.sessionID }
            if !loaded { await load(reset: true) }
        }
    }
    @ViewBuilder private func reviewSection(_ revision: ExpenseRevision) -> some View {
        Section("還原前檢查：版本 \(revision.version)") {
            Text("還原會變更目前支出。請比較目前內容與目標快照，再明確確認。")
            if reviewVersion == nil {
                Text("尚未取得可還原的目前版本。請重新載入還原檢查。")
            } else if let reviewCurrent {
                DisclosureGroup(
                    "目前內容（版本 \(reviewCurrent.version.map { NativeDisplayFormatting.number($0, locale: locale) } ?? NativeLocalization.string("未知", locale: locale))）",
                    isExpanded: .constant(true)
                ) {
                    ExpenseSnapshotDetails(
                        expense: reviewCurrent, participants: payload.trip.participants)
                }
            } else {
                Text("目前支出不存在；確認後將還原已刪除的支出。")
            }
            DisclosureGroup("將還原的內容", isExpanded: .constant(true)) {
                ExpenseSnapshotDetails(
                    expense: revision.snapshot.expense,
                    participants: revision.snapshot.participants, receipt: revision.snapshot.receipt
                )
            }
            Text(
                reviewCurrent == nil
                    ? LocalizedStringKey("舊收據圖片不會還原。還原支出後，需重新上傳收據。")
                    : LocalizedStringKey("會保留目前收據，不會還原此快照的舊收據圖片。"))
            if missingPeople { Text("目標快照的付款人或分攤成員已不存在。不能還原；請先修正群組成員。").foregroundStyle(.red) }
            if conflict {
                Text("支出又有變更。已重新載入最新內容。請重新比較，確認後才能還原。").foregroundStyle(.red)
                Button("已比較最新內容") { conflict = false }
                    .disabled(
                        busy || reviewVersion == nil || missingPeople || !permits(.editDailyData))
            }
            Button("重新載入還原檢查") { Task { await openReview(revision) } }.disabled(busy)
            Button("確認還原此版本", role: .destructive) { Task { await restore() } }
                .disabled(
                    busy || conflict || missingPeople || reviewVersion == nil
                        || !permits(.editDailyData))
            Button("取消還原") {
                selected = nil
                reviewVersion = nil
                conflict = false
            }.disabled(busy)
        }
    }
    private func load(reset: Bool) async {
        guard !busy, permits(.readHistory), let client = session.client, let id = generation else {
            return
        }
        busy = true
        issue = nil
        defer { busy = false }
        do {
            let page = try await client.expenseHistory(
                tripID: payload.trip.id, expenseID: expenseID, cursor: reset ? nil : cursor)
            guard current(id) else { return }
            if reset {
                revisions = page.revisions
            } else {
                let existing = Set(revisions.map(\.id))
                revisions.append(contentsOf: page.revisions.filter { !existing.contains($0.id) })
            }
            cursor = page.nextCursor
            loaded = true
        } catch { handle(error, id: id) }
    }
    private func openReview(_ revision: ExpenseRevision) async {
        guard !busy, permits(.editDailyData), let id = generation else { return }
        if selected?.id != revision.id { conflict = false }
        busy = true
        selected = revision
        reviewVersion = nil
        reviewCurrent = nil
        missingPeople = false
        issue = nil
        defer { busy = false }
        do { try await fetchReview(revision, id: id) } catch { handle(error, id: id) }
    }
    private func fetchReview(_ revision: ExpenseRevision, id: UUID) async throws {
        guard let client = session.client, current(id) else { throw CancellationError() }
        // The filtered history response, not a visible page, supplies the deletion version.
        let fresh = try await client.trip(id: payload.trip.id)
        guard current(id) else { throw CancellationError() }
        let history = try await client.expenseHistory(
            tripID: payload.trip.id, expenseID: revision.expenseId)
        guard current(id) else { throw CancellationError() }
        payload = fresh
        onPayload(fresh)
        guard permits(.editDailyData) else {
            throw APIError.http(status: 403, message: NativeLocalization.string("目前權限不允許還原。"))
        }
        let review = try ExpenseRestoreReview(
            payload: fresh, revision: revision, latestRevision: history.latestRevision)
        missingPeople = !review.missingParticipantIDs.isEmpty
        reviewCurrent = review.current
        reviewVersion = review.version
    }
    private func restore() async {
        guard !busy, !conflict, !missingPeople, let revision = selected,
            let version = reviewVersion,
            permits(.editDailyData), let client = session.client, let id = generation,
            ExpenseMutationGate.shared.acquire(sessionID: id, tripID: payload.trip.id)
        else { return }
        busy = true
        issue = nil
        defer {
            busy = false
            ExpenseMutationGate.shared.release(sessionID: id, tripID: payload.trip.id)
        }
        do {
            let fresh = try await client.restoreExpense(
                tripID: payload.trip.id, expenseID: revision.expenseId,
                revisionID: revision.id, currentVersion: version)
            guard current(id) else { return }
            payload = fresh
            onPayload(fresh)
            selected = nil
            reviewVersion = nil
            let page = try await client.expenseHistory(
                tripID: payload.trip.id, expenseID: expenseID)
            guard current(id) else { return }
            revisions = page.revisions
            cursor = page.nextCursor
            loaded = true
        } catch {
            guard current(id) else { return }
            if ExpenseEditorState.status(error) == 412 {
                conflict = true
                reviewVersion = nil
                do { try await fetchReview(revision, id: id) } catch { handle(error, id: id) }
                if current(id) { issue = NativeLocalization.string("版本衝突。未執行還原；請比較最新內容並重新確認。") }
            } else {
                // A failed or interrupted mutation always requires a fresh review.
                reviewVersion = nil
                handle(error, id: id)
            }
        }
    }
    private func handle(_ error: Error, id: UUID) {
        guard current(id), !(error is CancellationError) else { return }
        issue = error.localizedDescription
        session.handle(error, for: id)
    }
    private func actionLabel(_ action: ExpenseRevisionAction) -> String {
        switch action {
        case .baseline: NativeLocalization.string("初始版本", locale: locale)
        case .created: NativeLocalization.string("web.expenseHistoryCreated", locale: locale)
        case .updated: NativeLocalization.string("修改", locale: locale)
        case .deleted: NativeLocalization.string("刪除", locale: locale)
        case .restored: NativeLocalization.string("還原", locale: locale)
        }
    }
}
