import OtterKit
import SwiftUI

@MainActor
struct AddParticipantView: View {
    @Environment(AppSession.self) private var session
    @Environment(\.dismiss) private var dismiss
    let onSubmit: @MainActor (String) async throws -> Void
    @State private var name = ""
    @State private var isSubmitting = false
    @State private var errorMessage: String?

    private var trimmedName: String { WebText.trim(name) }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    TextField("成員名稱", text: $name)
                } footer: {
                    Text("成員名稱最多 80 個字。")
                }
                if let errorMessage {
                    Section { Text(errorMessage).foregroundStyle(.red) }
                }
                if isSubmitting { ProgressView("正在新增成員…") }
            }
            .disabled(isSubmitting)
            .navigationTitle("新增成員")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("取消") { dismiss() }.disabled(isSubmitting)
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("web.addShort") { Task { await submit() } }
                        .disabled(
                            isSubmitting || trimmedName.isEmpty || trimmedName.utf16.count > 80)
                }
            }
            .interactiveDismissDisabled(isSubmitting)
        }
    }

    private func submit() async {
        guard !isSubmitting, !trimmedName.isEmpty, trimmedName.utf16.count <= 80 else { return }
        let requestSessionID = session.sessionID
        isSubmitting = true
        errorMessage = nil
        defer { isSubmitting = false }
        do {
            try await onSubmit(trimmedName)
            dismiss()
        } catch is CancellationError {
        } catch {
            guard !Task.isCancelled else { return }
            errorMessage = error.localizedDescription
            session.handle(error, for: requestSessionID)
        }
    }
}
