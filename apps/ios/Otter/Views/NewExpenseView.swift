import OtterKit
import SwiftUI

/// Compatibility entry for existing callers that own the create request.
@MainActor
struct NewExpenseView: View {
    @Environment(AppSession.self) private var session
    @Environment(\.dismiss) private var dismiss
    @State private var state: ExpenseEditorState
    @State private var discard = false
    @State private var unknownResult = false
    let onSubmit: @MainActor (NewExpense) async throws -> Void

    init(trip: Trip, onSubmit: @escaping @MainActor (NewExpense) async throws -> Void) {
        _state = State(
            initialValue: ExpenseEditorState(payload: TripPayload(trip: trip), mode: .new))
        self.onSubmit = onSubmit
    }
    var body: some View {
        NavigationStack {
            Form {
                ExpenseDraftFields(state: state).disabled(
                    state.busy || unknownResult || state.generation != session.sessionID)
                if let issue = state.issue { Text(issue).foregroundStyle(.red) }
                if unknownResult { Text("請關閉此表單並重新載入群組，檢查支出是否已建立。此表單不會再次新增。") }
                if state.busy { ProgressView("正在新增支出…") }
            }
            .navigationTitle("新增支出")
            .navigationBarTitleDisplayMode(.inline)
            .navigationBarBackButtonHidden(true)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("取消") { if state.dirty { discard = true } else { dismiss() } }.disabled(
                        state.busy)
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("web.addShort") { Task { await submit() } }
                        .disabled(
                            state.busy || state.validation != nil || unknownResult
                                || state.generation != session.sessionID)
                }
            }
            .confirmationDialog("放棄尚未儲存的變更？", isPresented: $discard, titleVisibility: .visible) {
                Button("放棄變更", role: .destructive) { dismiss() }
            }
        }
        .interactiveDismissDisabled(state.busy || state.dirty)
        .task { state.bind(session: session) }
    }
    private func submit() async {
        guard !state.busy, state.validation == nil, !unknownResult,
            let id = state.generation, state.isCurrent(session, id)
        else { return }
        state.busy = true
        state.issue = nil
        defer { state.busy = false }
        do {
            try await onSubmit(state.input)
            guard state.isCurrent(session, id) else { return }
            dismiss()
        } catch {
            guard state.generation == id, session.sessionID == id else { return }
            unknownResult = ExpenseEditorState.unknownResult(error)
            state.issue = error.localizedDescription
            session.handle(error, for: id)
        }
    }
}
