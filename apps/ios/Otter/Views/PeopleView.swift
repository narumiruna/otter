import OtterKit
import SwiftUI

struct PeopleView: View {
    let payload: TripPayload
    let onPayload: @MainActor (TripPayload) -> Void
    @Environment(AppSession.self) private var session
    @State private var mutation = GroupManagementState()
    @State private var addedName = ""
    @State private var selectedID = ""
    @State private var editedName = ""
    @State private var representativeID = ""
    @State private var mergeTargetID = ""
    @State private var confirming: PeopleConfirmation?

    init(payload: TripPayload, onPayload: @MainActor @escaping (TripPayload) -> Void) {
        self.payload = payload
        self.onPayload = onPayload
    }

    private var canEdit: Bool {
        guard let client = session.client else { return false }
        return TripPermissions(payload: payload, auth: client.auth, userID: session.user?.id)
            .allows(.editDailyData)
    }
    private var busy: Bool {
        mutation.busy
            || GroupManagementGate.shared.contains(
                sessionID: session.sessionID, tripID: payload.trip.id)
    }
    private var selected: Participant? {
        payload.trip.participants.first { $0.id == selectedID }
    }
    private var target: Participant? {
        payload.trip.participants.first { $0.id == mergeTargetID && $0.id != selectedID }
    }
    private var allowedRepresentatives: [Participant] {
        PeopleRules.representatives(trip: payload.trip, participantID: selectedID)
    }
    private var validRepresentative: Bool {
        representativeID.isEmpty || allowedRepresentatives.contains { $0.id == representativeID }
    }

    var body: some View {
        Form {
            Section {
                Text("參與者用於分攤支出，不會取得帳號存取權。邀請帳號請使用「存取與分享」。")
                if payload.trip.archivedAt != nil {
                    Text("群組已封存，無法變更參與者。")
                } else if !canEdit {
                    Text("目前權限不能變更參與者。")
                }
                if busy { ProgressView("處理中⋯") }
                if let issue = mutation.issue { Text(verbatim: issue).foregroundStyle(.red) }
            }
            Section("參與者") {
                if payload.trip.participants.isEmpty { Text("尚無參與者。") }
                ForEach(payload.trip.participants) { person in
                    Button {
                        select(person)
                    } label: {
                        HStack(alignment: .top, spacing: 12) {
                            OtterAvatar(name: person.name)
                            VStack(alignment: .leading, spacing: 6) {
                                Text(verbatim: person.name).font(.headline).foregroundStyle(
                                    .primary)
                                if let id = person.settledById {
                                    let name =
                                        payload.trip.participants.first { $0.id == id }?.name ?? id
                                    Text("由 \(name) 代為結算").font(.caption).otterSecondaryText()
                                } else {
                                    Text("自行結算").font(.caption).otterSecondaryText()
                                }
                                if selectedID == person.id {
                                    Text("已選取").font(.caption).foregroundStyle(.tint)
                                }
                            }
                        }
                        .padding(.vertical, 6)
                    }
                    .disabled(busy)
                }
            }
            if canEdit {
                Section("新增參與者") {
                    TextField("名稱（1–80 字，不可重複）", text: $addedName)
                    Button("web.addShort") { add() }
                        .disabled(!PeopleRules.validName(addedName, trip: payload.trip))
                }
                .disabled(busy)
                if let person = selected {
                    renameSection(person)
                    representativeSection(person)
                    mergeSection(person)
                    deleteSection(person)
                } else if !payload.trip.participants.isEmpty {
                    Section { Text("請選取參與者以修改名稱、結算代表人或合併資料。") }
                }
            }
        }
        .otterList()
        .navigationTitle("web.people")
        .confirmationDialog(
            confirming == .merge ? LocalizedStringKey("確認合併參與者？") : LocalizedStringKey("確認刪除參與者？"),
            isPresented: Binding(get: { confirming != nil }, set: { if !$0 { confirming = nil } }),
            titleVisibility: .visible
        ) {
            if let person = selected {
                if confirming == .merge, let target {
                    Button("合併至 \(target.name)", role: .destructive) { merge(person, into: target) }
                } else if confirming == .delete {
                    Button("刪除 \(person.name)", role: .destructive) { delete(person) }
                }
            }
            Button("取消", role: .cancel) { confirming = nil }
        } message: {
            if confirming == .merge, let person = selected, let target {
                Text(
                    "將 \(person.name) 的付款人、分攤資料及付款紀錄移至 \(target.name)，並移除來源參與者。兩人間的付款紀錄會被刪除；結算代表人可能調整。此操作無法復原。"
                )
            } else {
                Text("刪除後無法復原。結算代表人關係也可能被解除。")
            }
        }
        .onChange(of: payload.trip.id) { _, _ in reset() }
        .onChange(of: session.sessionID) { _, _ in reset() }
        .onDisappear {
            mutation.invalidate()
            confirming = nil
        }
    }

    private func renameSection(_ person: Participant) -> some View {
        Section("修改名稱") {
            TextField("參與者名稱", text: $editedName)
            Button("儲存名稱") {
                let name = WebText.trim(editedName)
                perform { client in
                    try await client.renameParticipant(
                        tripID: payload.trip.id, participantID: person.id, name: name)
                }
            }
            .disabled(
                WebText.equal(WebText.trim(editedName), person.name)
                    || !PeopleRules.validName(editedName, trip: payload.trip, exceptID: person.id))
        }
        .disabled(busy)
    }

    private func representativeSection(_ person: Participant) -> some View {
        Section("結算代表人") {
            Text("代表人會代為承擔此人的結算餘額。不能指定自己，也不能形成多層關係。支出分攤不會變更。")
                .font(.footnote)
            if payload.trip.participants.contains(where: { $0.settledById == person.id }) {
                Text("此人已有代為結算的成員，不能再指定其他代表人。")
                    .font(.footnote)
            }
            Picker("代表人", selection: $representativeID) {
                Text("自行結算").tag("")
                ForEach(allowedRepresentatives) { candidate in
                    Text(verbatim: candidate.name).tag(candidate.id)
                }
                if !validRepresentative {
                    Text("既有關係無效，請重新選取").tag(representativeID)
                }
            }
            Button("儲存代表人") {
                let id = representativeID.isEmpty ? nil : representativeID
                perform { client in
                    try await client.setRepresentative(
                        tripID: payload.trip.id, participantID: person.id, representativeID: id)
                }
            }
            .disabled(!validRepresentative || representativeID == (person.settledById ?? ""))
        }
        .disabled(busy)
    }

    private func mergeSection(_ person: Participant) -> some View {
        Section("合併參與者") {
            Picker("合併目標", selection: $mergeTargetID) {
                Text("請選擇另一位參與者").tag("")
                ForEach(payload.trip.participants.filter { $0.id != person.id }) { candidate in
                    Text(verbatim: candidate.name).tag(candidate.id)
                }
            }
            Text(
                "涉及 \(PeopleRules.affectedExpenses(trip: payload.trip, sourceID: person.id)) 筆支出。分攤金額會合併，來源參與者會移除。"
            )
            .font(.footnote)
            if let target {
                if let count = PeopleRules.removedPayments(
                    trip: payload.trip, sourceID: person.id, targetID: target.id)
                {
                    Text("兩人間的 \(count) 筆付款紀錄會被刪除，其他付款紀錄會改為目標參與者。")
                        .font(.footnote).foregroundStyle(.red)
                } else {
                    Text("付款明細不可用，無法預先計算會刪除的付款筆數。兩人間的付款仍可能遺失。")
                        .font(.footnote).foregroundStyle(.red)
                }
            }
            Button("檢查並合併", role: .destructive) { confirming = .merge }
                .disabled(target == nil)
        }
        .disabled(busy)
    }

    private func deleteSection(_ person: Participant) -> some View {
        Section("刪除參與者") {
            if let block = PeopleRules.deletionBlock(trip: payload.trip, participantID: person.id) {
                deletionReason(block).font(.footnote)
            }
            Button("刪除參與者", role: .destructive) { confirming = .delete }
                .disabled(
                    PeopleRules.deletionBlock(trip: payload.trip, participantID: person.id) != nil)
        }
        .disabled(busy)
    }

    private func deletionReason(_ reason: PeopleDeletionBlock) -> Text {
        switch reason {
        case .lastParticipant: Text("至少需要一位參與者，無法刪除最後一人。")
        case .expense: Text("此人已有付款或分攤的支出，不能刪除。可使用合併保留資料。")
        case .payment: Text("此人已有結算付款紀錄，不能刪除。可使用合併功能。")
        case .paymentDetailsUnavailable: Text("付款明細不可用，無法確認是否可刪除。請重新載入完整群組資料。")
        }
    }

    private func select(_ person: Participant) {
        selectedID = person.id
        editedName = person.name
        representativeID = person.settledById ?? ""
        mergeTargetID = ""
    }
    private func reset() {
        mutation.invalidate()
        mutation.issue = nil
        addedName = ""
        selectedID = ""
        editedName = ""
        representativeID = ""
        mergeTargetID = ""
        confirming = nil
    }
    private func add() {
        let name = WebText.trim(addedName)
        perform(clearAddedName: true) { client in
            try await client.addParticipant(tripID: payload.trip.id, name: name)
        }
    }
    private func delete(_ person: Participant) {
        confirming = nil
        guard PeopleRules.deletionBlock(trip: payload.trip, participantID: person.id) == nil else {
            return
        }
        perform { client in
            try await client.deleteParticipant(tripID: payload.trip.id, participantID: person.id)
        }
    }
    private func merge(_ person: Participant, into target: Participant) {
        confirming = nil
        guard person.id != target.id else { return }
        perform { client in
            try await client.mergeParticipant(
                tripID: payload.trip.id, sourceID: person.id, targetID: target.id)
        }
    }
    private func perform(
        clearAddedName: Bool = false,
        work: @MainActor @escaping (OtterClient) async throws -> TripPayload
    ) {
        let request = mutation.request(sessionID: session.sessionID)
        Task { @MainActor in
            await mutation.run(
                request: request, session: session, payload: payload, operation: .editDailyData,
                work: work, publish: onPayload
            ) { next in
                if clearAddedName { addedName = "" }
                if let person = next.trip.participants.first(where: { $0.id == selectedID }) {
                    select(person)
                } else {
                    selectedID = ""
                    mergeTargetID = ""
                }
            }
        }
    }
}

private enum PeopleConfirmation { case merge, delete }
