import Foundation
import Observation
import OtterKit
import SwiftUI
import UniformTypeIdentifiers

struct TripDataToolsView: View {
    let payload: TripPayload
    let onCreated: @MainActor (TripPayload) -> Void
    let onPayload: @MainActor (TripPayload) -> Void
    @Environment(AppSession.self) private var session
    @State private var request = DataToolsRequestState()
    @State private var csvText: String?
    @State private var csvFilename = ""
    @State private var backup: BackupPreview?
    @State private var backupFilename = ""
    @State private var fileKind: DataToolsFileKind = .csv
    @State private var selecting = false
    @State private var selectionGeneration = UUID()
    @State private var confirming: DataToolsConfirmation?
    @State private var exporting = false
    @State private var exportDocument: DataToolsDocument?
    @State private var exportType = UTType.commaSeparatedText
    @State private var exportFilename = ""
    @State private var uncertainWrite = false

    init(
        payload: TripPayload, onCreated: @MainActor @escaping (TripPayload) -> Void,
        onPayload: @MainActor @escaping (TripPayload) -> Void
    ) {
        self.payload = payload
        self.onCreated = onCreated
        self.onPayload = onPayload
    }

    private func allows(_ operation: TripOperation) -> Bool {
        guard let client = session.client else { return false }
        return TripPermissions(payload: payload, auth: client.auth, userID: session.user?.id)
            .allows(operation)
    }
    private var busy: Bool { request.busy || selecting || exporting }
    private var preview: CSVImportPreview? {
        csvText.map { CSV.parseImport($0, participantNames: payload.trip.participants.map(\.name)) }
    }

    var body: some View {
        Form {
            Section("匯出與列印") {
                Text("匯出及列印不會修改群組資料。")
                Button("匯出支出 CSV") {
                    exportText({ try CSV.tripExpenses(trip: payload.trip) }, suffix: "expenses")
                }
                Button("匯出結算 CSV") {
                    exportText({ try CSV.tripResults(payload: payload) }, suffix: "results")
                }
                NavigationLink("列印結算資料") { PrintSettlementView(payload: payload) }
                if allows(.downloadBackup) { Button("下載完整 JSON 備份") { downloadBackup() } }
            }
            .disabled(busy)
            if payload.trip.archivedAt != nil {
                Section { Text("群組已封存，不能匯入 CSV。仍可匯出、列印及依權限還原備份。") }
            } else if allows(.editDailyData) {
                csvSection
            }
            if allows(.restoreBackup) { backupSection }
            if request.busy { Section { ProgressView("處理中⋯") } }
            if uncertainWrite {
                Section { Text("提交結果可能已在伺服器完成。請先關閉此畫面並核對群組與支出清單；不能直接重送匯入或還原。") }
            }
            if let issue = request.issue {
                Section {
                    Text(verbatim: issue).foregroundStyle(.red).accessibilityLabel("錯誤：\(issue)")
                }
            }
        }
        .navigationTitle("資料與匯出")
        .fileImporter(
            isPresented: $selecting,
            allowedContentTypes: fileKind == .csv ? [.commaSeparatedText, .plainText] : [.json]
        ) { result in
            receiveFile(result)
        }
        .fileExporter(
            isPresented: $exporting, document: exportDocument, contentType: exportType,
            defaultFilename: exportFilename
        ) { result in
            exportDocument = nil
            if case .failure(let error) = result { request.issue = error.localizedDescription }
        }
        .confirmationDialog(
            "確認資料操作？",
            isPresented: Binding(
                get: { confirming != nil }, set: { if !$0 { confirming = nil } }),
            titleVisibility: .visible
        ) {
            if confirming == .csv { Button("匯入全部支出") { importCSV() }.disabled(busy) }
            if confirming == .backup { Button("建立新群組") { restoreBackup() }.disabled(busy) }
            Button("取消", role: .cancel) { confirming = nil }
        } message: {
            if confirming == .csv {
                Text("將新增 \(preview?.rows.count ?? 0) 筆支出並重新計算餘額。伺服器會驗證全部資料；任一列有錯誤就不會寫入。")
            } else {
                Text("將從「\(backup?.name ?? "")」建立新群組，不會覆寫現有群組。")
            }
        }
        .interactiveDismissDisabled(request.busy)
        .onChange(of: payload.trip.id) { _, _ in reset() }
        .onChange(of: session.sessionID) { _, _ in reset() }
        .onDisappear {
            request.invalidate()
            confirming = nil
            selecting = false
            exportDocument = nil
        }
    }

    private var csvSection: some View {
        Section("匯入支出 CSV") {
            Text("先檢查全部資料，再確認匯入。取消預覽不會修改群組。分類與標籤會交由伺服器再次驗證。")
                .font(.footnote)
            Button("選擇 CSV") { choose(.csv) }.disabled(busy)
            if !csvFilename.isEmpty { Text(verbatim: csvFilename).font(.caption) }
            if let preview {
                Text("匯入預覽：\(preview.rows.count) 列，\(preview.errors.count) 個錯誤")
                ForEach(Array(preview.errors.enumerated()), id: \.offset) { _, error in
                    Text("第 \(error.row) 列：\(error.message)").foregroundStyle(.red)
                }
                DisclosureGroup("檢視全部資料列") {
                    ForEach(preview.rows, id: \.rowNumber) { row in
                        VStack(alignment: .leading, spacing: 4) {
                            Text("第 \(row.rowNumber) 列：\(row.description)").font(.headline)
                            Text("\(row.date) · \(row.currency) \(row.amount)")
                            Text("付款人：\(row.paidBy)")
                            Text(
                                "分帳：\(row.splitShares.map { $0.map { "\($0.name)=\($0.amount)" }.joined(separator: "; ") } ?? row.splitParticipants.joined(separator: "; "))"
                            )
                            Text("分類：\(row.category)；標籤：\(row.tags)")
                        }
                        .font(.caption)
                        .fixedSize(horizontal: false, vertical: true)
                    }
                }
                Button("確認匯入") { confirming = .csv }.disabled(
                    busy || uncertainWrite || !preview.canImport)
                Button("取消預覽", role: .cancel) {
                    csvText = nil
                    csvFilename = ""
                }.disabled(busy)
            }
        }
    }
    private var backupSection: some View {
        Section("還原 JSON 備份") {
            Text("還原會建立新群組，不會覆寫現有資料。支援 v1、v2 備份，檔案上限為 10 MB。")
                .font(.footnote)
            Button("選擇 JSON 備份") { choose(.backup) }.disabled(busy)
            if !backupFilename.isEmpty { Text(verbatim: backupFilename).font(.caption) }
            if let backup {
                Text("還原預覽：\(backup.name)").font(.headline)
                Text(
                    "版本 \(backup.version)；\(backup.participantCount) 位參與者；\(backup.expenseCount) 筆支出；\(backup.paymentCount) 筆付款；基本幣別 \(backup.baseCurrency.rawValue)"
                )
                Button("確認建立新群組") { confirming = .backup }.disabled(busy || uncertainWrite)
                Button("取消預覽", role: .cancel) {
                    self.backup = nil
                    backupFilename = ""
                }.disabled(busy)
            }
        }
    }

    private func choose(_ kind: DataToolsFileKind) {
        guard !busy else { return }
        fileKind = kind
        selectionGeneration = request.generation
        selecting = true
    }
    private func receiveFile(_ result: Result<URL, Error>) {
        guard selectionGeneration == request.generation else { return }
        do {
            let url = try result.get()
            let accessed = url.startAccessingSecurityScopedResource()
            defer { if accessed { url.stopAccessingSecurityScopedResource() } }
            let handle = try FileHandle(forReadingFrom: url)
            defer { try? handle.close() }
            let data = try handle.read(upToCount: BackupPreview.maximumBytes + 1) ?? Data()
            guard data.count <= BackupPreview.maximumBytes else {
                throw BackupPreviewErrorForUI.tooLarge
            }
            switch fileKind {
            case .csv:
                guard allows(.editDailyData) else { return }
                guard let text = String(data: data, encoding: .utf8) else {
                    throw BackupPreviewErrorForUI.notUTF8
                }
                csvText = text
                csvFilename = url.lastPathComponent
            case .backup:
                guard allows(.restoreBackup) else { return }
                backup = try BackupPreview(data: data)
                backupFilename = url.lastPathComponent
            }
            request.issue = nil
        } catch {
            if (error as NSError).code == NSUserCancelledError { return }
            request.issue = error.localizedDescription
        }
    }
    private func exportText(_ text: () throws -> String, suffix: String) {
        do { presentExport(Data(try text().utf8), type: .commaSeparatedText, suffix: suffix) } catch
        { request.issue = error.localizedDescription }
    }
    private func presentExport(_ bytes: Data, type: UTType, suffix: String) {
        exportDocument = DataToolsDocument(bytes: bytes)
        exportType = type
        let safeName = payload.trip.name.components(
            separatedBy: CharacterSet(charactersIn: "/\\:\n\r\0")
        )
        .joined(separator: "-").trimmingCharacters(in: .whitespacesAndNewlines)
        exportFilename =
            String(safeName.isEmpty ? "otter" : String(safeName.prefix(100))) + "-" + suffix
        exporting = true
    }
    private func downloadBackup() {
        perform(.downloadBackup) { client in
            try await client.backup(tripID: payload.trip.id)
        } accept: { bytes in
            presentExport(bytes, type: .json, suffix: "backup")
        }
    }
    private func importCSV() {
        confirming = nil
        guard let csvText, preview?.canImport == true else { return }
        perform(.editDailyData) { client in
            try await client.importCSV(tripID: payload.trip.id, csv: csvText)
        } accept: { next in
            self.csvText = nil
            csvFilename = ""
            onPayload(next)
        }
    }
    private func restoreBackup() {
        confirming = nil
        guard let backup else { return }
        perform(.restoreBackup) { client in
            try await client.restoreBackup(backup.originalData)
        } accept: { next in
            self.backup = nil
            backupFilename = ""
            onCreated(next)
        }
    }
    private func perform<Value: Sendable>(
        _ operation: TripOperation,
        work: @MainActor @escaping (OtterClient) async throws -> Value,
        accept: @MainActor @escaping (Value) -> Void
    ) {
        guard !busy, allows(operation), let client = session.client else { return }
        let writes = operation == .editDailyData || operation == .restoreBackup
        guard !writes || !uncertainWrite else { return }
        let generation = request.generation
        let sessionID = session.sessionID
        guard DataToolsRequestState.acquire(sessionID: sessionID, tripID: payload.trip.id) else {
            request.issue = NativeLocalization.string("另一項資料操作仍在處理中，請稍後再試。")
            return
        }
        request.busy = true
        request.issue = nil
        let state = request
        let tripID = payload.trip.id
        Task { @MainActor in
            defer {
                DataToolsRequestState.release(sessionID: sessionID, tripID: tripID)
                if state.generation == generation { state.busy = false }
            }
            do {
                let value = try await work(client)
                try Task.checkCancellation()
                guard state.generation == generation, session.sessionID == sessionID else { return }
                accept(value)
            } catch {
                guard state.generation == generation, session.sessionID == sessionID,
                    !(error is CancellationError)
                else { return }
                state.issue = error.localizedDescription
                if writes && MutationOutcome.isUncertain(error) { uncertainWrite = true }
                session.handle(error, for: sessionID)
            }
        }
    }
    private func reset() {
        request.invalidate()
        request.issue = nil
        uncertainWrite = false
        csvText = nil
        csvFilename = ""
        backup = nil
        backupFilename = ""
        confirming = nil
        selecting = false
        exportDocument = nil
        exporting = false
    }
}

private enum DataToolsFileKind { case csv, backup }
private enum DataToolsConfirmation { case csv, backup }
private enum BackupPreviewErrorForUI: LocalizedError {
    case tooLarge, notUTF8
    var errorDescription: String? {
        switch self {
        case .tooLarge: NativeLocalization.string("檔案不可超過 10 MB")
        case .notUTF8: NativeLocalization.string("CSV 必須使用 UTF-8 編碼")
        }
    }
}

private struct DataToolsDocument: FileDocument {
    static var readableContentTypes: [UTType] { [.commaSeparatedText, .json] }
    let bytes: Data
    init(bytes: Data) { self.bytes = bytes }
    init(configuration: ReadConfiguration) throws {
        bytes = configuration.file.regularFileContents ?? Data()
    }
    func fileWrapper(configuration: WriteConfiguration) throws -> FileWrapper {
        FileWrapper(regularFileWithContents: bytes)
    }
}

@MainActor @Observable
private final class DataToolsRequestState {
    var generation = UUID()
    var busy = false
    var issue: String?
    private static var active: Set<String> = []
    static func acquire(sessionID: UUID, tripID: String) -> Bool {
        active.insert("\(sessionID):\(tripID)").inserted
    }
    static func release(sessionID: UUID, tripID: String) { active.remove("\(sessionID):\(tripID)") }
    func invalidate() {
        generation = UUID()
        busy = false
    }
}
