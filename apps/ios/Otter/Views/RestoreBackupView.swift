import OtterKit
import SwiftUI
import UniformTypeIdentifiers

@MainActor
struct RestoreBackupView: View {
    @Environment(AppSession.self) private var session
    @Environment(\.dismiss) private var dismiss
    let onCreated: @MainActor (TripPayload) -> Void
    @State private var selecting = false
    @State private var preview: BackupPreview?
    @State private var filename = ""
    @State private var issue: String?
    @State private var confirming = false
    @State private var busy = false
    @State private var unknownResult = false

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    Text("將 JSON 備份還原成新的支出群組，不覆蓋目前群組。照片與版本歷史不包含在群組備份內。")
                    Button("選擇 JSON 備份") { selecting = true }.disabled(busy || unknownResult)
                }
                if let preview {
                    Section("還原預覽") {
                        Text(filename)
                        Text(preview.name).font(.headline)
                        Text(
                            "\(preview.participantCount) 位成員 · \(preview.expenseCount) 筆支出 · \(preview.paymentCount) 筆付款"
                        )
                        Text("基準貨幣：\(preview.baseCurrency.rawValue)")
                        Button("確認還原成新群組") { confirming = true }.disabled(busy || unknownResult)
                    }
                }
                if let issue { Text(issue).foregroundStyle(.red) }
                if unknownResult {
                    Text("還原結果可能已在伺服器完成。請先關閉此畫面並核對群組清單，不要直接重送。")
                }
                if busy { ProgressView("正在還原…") }
            }
            .navigationTitle("還原 JSON 備份")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("web.close") { dismiss() }.disabled(busy)
                }
            }
            .interactiveDismissDisabled(busy)
            .fileImporter(
                isPresented: $selecting, allowedContentTypes: [.json],
                allowsMultipleSelection: false
            ) { result in
                do {
                    guard let url = try result.get().first else { return }
                    let access = url.startAccessingSecurityScopedResource()
                    defer { if access { url.stopAccessingSecurityScopedResource() } }
                    let size = try url.resourceValues(forKeys: [.fileSizeKey]).fileSize ?? 0
                    guard size <= 10 * 1024 * 1024 else { throw APIError.invalidResponse }
                    let handle = try FileHandle(forReadingFrom: url)
                    defer { try? handle.close() }
                    let bytes = try handle.read(upToCount: 10 * 1024 * 1024 + 1) ?? Data()
                    let value = try BackupPreview(data: bytes)
                    preview = value
                    filename = url.lastPathComponent
                    issue = nil
                } catch {
                    issue = error.localizedDescription
                    preview = nil
                }
            }
            .confirmationDialog("要建立還原群組嗎？", isPresented: $confirming, titleVisibility: .visible) {
                Button("建立新群組") { Task { await restore() } }
            } message: {
                Text("既有群組不會被覆寫。取消不會送出任何資料。")
            }
        }
    }
    private func restore() async {
        guard !busy, !unknownResult, let preview, let client = session.client,
            client.auth.isSession || client.auth.isBearer
        else { return }
        let generation = session.sessionID
        busy = true
        defer { busy = false }
        do {
            let value = try await client.restoreBackup(preview.originalData)
            guard generation == session.sessionID else { return }
            onCreated(value)
            dismiss()
        } catch {
            guard generation == session.sessionID else { return }
            issue = error.localizedDescription
            unknownResult = MutationOutcome.isUncertain(error)
            session.handle(error, for: generation)
        }
    }
}
