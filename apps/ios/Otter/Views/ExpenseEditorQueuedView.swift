import OtterKit
import SwiftUI

/// Edit only the locked local queue draft. The parent owns beginEditing/endEditing.
@MainActor
struct QueuedExpenseEditorView: View {
    @Environment(AppSession.self) private var session
    @Environment(\.dismiss) private var dismiss
    @State private var state: ExpenseEditorState
    @State private var discard = false
    let onSave: @MainActor (NewExpense) async throws -> Void

    init(
        payload: TripPayload, draft: NewExpense,
        onSave: @escaping @MainActor (NewExpense) async throws -> Void
    ) {
        _state = State(initialValue: ExpenseEditorState(payload: payload, draft: draft))
        self.onSave = onSave
    }
    var body: some View {
        NavigationStack {
            Form {
                Text("僅修改本機佇列草稿，不會在此表單送出支出或收據。")
                ExpenseDraftFields(state: state)
                    .disabled(state.busy || !state.permits(.queueExpense, session: session))
                if state.generation != nil && state.generation != session.sessionID {
                    Text("登入狀態已變更。請關閉此草稿並重新開啟。").foregroundStyle(.red)
                }
                if let issue = state.issue { Text(issue).foregroundStyle(.red) }
                if let notice = state.notice { Text(notice) }
                if state.busy { ProgressView("正在儲存本機草稿…") }
            }
            .navigationTitle("編輯佇列草稿")
            .navigationBarTitleDisplayMode(.inline)
            .navigationBarBackButtonHidden(true)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("取消") { if state.dirty { discard = true } else { dismiss() } }.disabled(
                        state.busy)
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("儲存草稿") { Task { await save() } }
                        .disabled(
                            state.busy || state.validation != nil
                                || !state.permits(.queueExpense, session: session))
                }
            }
            .confirmationDialog(
                "放棄草稿中的變更？原本佇列項目不會被刪除。", isPresented: $discard, titleVisibility: .visible
            ) {
                Button("放棄變更", role: .destructive) { dismiss() }
            }
        }
        .interactiveDismissDisabled(state.busy || state.dirty)
        .task { state.bind(session: session) }
    }
    private func save() async {
        guard !state.busy, state.validation == nil, state.permits(.queueExpense, session: session),
            let id = state.generation,
            ExpenseMutationGate.shared.acquire(sessionID: id, tripID: state.payload.trip.id)
        else { return }
        state.busy = true
        state.issue = nil
        defer {
            state.busy = false
            ExpenseMutationGate.shared.release(sessionID: id, tripID: state.payload.trip.id)
        }
        do {
            try await onSave(state.input)
            guard state.isCurrent(session, id) else { return }
            dismiss()
        } catch {
            guard state.isCurrent(session, id) else { return }
            state.issue = error.localizedDescription
        }
    }
}
