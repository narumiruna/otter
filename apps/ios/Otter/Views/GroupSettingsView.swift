import OtterKit
import SwiftUI

struct GroupSettingsView: View {
    let payload: TripPayload
    let onPayload: @MainActor (TripPayload) -> Void
    let onCreated: @MainActor (TripPayload) -> Void
    let onDeleted: @MainActor () -> Void
    @Environment(AppSession.self) private var session
    @Environment(\.locale) private var locale
    @State private var mutation = GroupManagementState()
    @State private var name: String
    @State private var baseCurrency: Currency
    @State private var rateValues: [String: String]
    @State private var loadedSnapshot: ExchangeRateSnapshot?
    @State private var visaEnabled: Bool
    @State private var visaCurrency: Currency
    @State private var deleteName = ""
    @State private var confirming: GroupSettingsConfirmation?

    init(
        payload: TripPayload,
        onPayload: @MainActor @escaping (TripPayload) -> Void,
        onCreated: @MainActor @escaping (TripPayload) -> Void,
        onDeleted: @MainActor @escaping () -> Void
    ) {
        self.payload = payload
        self.onPayload = onPayload
        self.onCreated = onCreated
        self.onDeleted = onDeleted
        _name = State(initialValue: payload.trip.name)
        _baseCurrency = State(initialValue: payload.trip.baseCurrency)
        _rateValues = State(initialValue: GroupRatesRules.customValues(payload))
        _visaEnabled = State(initialValue: payload.trip.visaSettlementEnabled == true)
        _visaCurrency = State(
            initialValue: payload.trip.visaSettlementCurrency ?? payload.trip.baseCurrency)
    }

    private func allows(_ operation: TripOperation) -> Bool {
        guard let client = session.client else { return false }
        return TripPermissions(payload: payload, auth: client.auth, userID: session.user?.id)
            .allows(operation)
    }
    private var busy: Bool {
        mutation.busy
            || GroupManagementGate.shared.contains(
                sessionID: session.sessionID, tripID: payload.trip.id)
    }
    private var validName: Bool { GroupRules.validName(name) }
    private var preferencesChanged: Bool {
        GroupRules.nameChanged(name, original: payload.trip.name)
            || baseCurrency != payload.trip.baseCurrency
    }
    private var customRates: ExchangeRates? {
        try? GroupRatesRules.customRates(values: rateValues, base: payload.trip.baseCurrency)
    }
    private var proposedRates: ExchangeRates? {
        guard let customRates else { return nil }
        var result =
            loadedSnapshot?.rates
            ?? GroupRatesRules.automaticRates(payload, base: payload.trip.baseCurrency)
        result.merge(customRates) { _, custom in custom }
        result[payload.trip.baseCurrency.rawValue] = 1
        return result
    }

    var body: some View {
        Form {
            Section {
                if payload.trip.archivedAt != nil {
                    Text("群組已封存。無法修改名稱、幣別、匯率、Visa 設定或日常資料。擁有者仍可管理存取權、API 寫入、複製、還原及刪除群組。")
                } else if !allows(.changePreferences) {
                    Text("您可以檢視設定，但只有具備權限的擁有者可以修改群組偏好。編輯者不能執行擁有者操作。")
                }
                if busy { ProgressView("處理中⋯") }
                if let issue = mutation.issue { Text(verbatim: issue).foregroundStyle(.red) }
            }
            preferencesSection
            ratesInfoSection
            if allows(.changePreferences) { ratesEditorSection }
            visaSection
            apiSection
            ownerActionsSection
        }
        .otterList()
        .navigationTitle("群組設定")
        .confirmationDialog(
            "確認群組變更？",
            isPresented: Binding(get: { confirming != nil }, set: { if !$0 { confirming = nil } }),
            titleVisibility: .visible
        ) {
            switch confirming {
            case .preferences: Button("變更基本幣別") { savePreferences() }
            case .rates: Button("套用匯率") { saveRates() }
            case .visa: Button("套用 Visa 設定") { saveVisa() }
            case .apiWrites(let enabled):
                Button(
                    enabled
                        ? LocalizedStringKey("允許 API token 寫入")
                        : LocalizedStringKey("停用 API token 寫入")
                ) { setAPIWrites(enabled) }
            case .archive: Button("封存群組") { setArchived(true) }
            case .unarchive: Button("還原群組") { setArchived(false) }
            case .copy: Button("複製群組") { copy() }
            case .delete:
                Button("永久刪除", role: .destructive) { delete() }
                    .disabled(!WebText.equal(deleteName, payload.trip.name))
            case nil: EmptyView()
            }
            Button("取消", role: .cancel) { confirming = nil }
        } message: {
            confirmationMessage
        }
        .onChange(of: payload.trip.id) { _, _ in reset() }
        .onChange(of: session.sessionID) { _, _ in reset() }
        .onDisappear {
            mutation.invalidate()
            confirming = nil
        }
    }

    private var preferencesSection: some View {
        Section("基本設定") {
            if allows(.changePreferences) {
                TextField("群組名稱（1–100 字）", text: $name)
                currencyPicker("基本幣別", selection: $baseCurrency)
                Text("變更基本幣別會清除群組自訂匯率。既有支出的匯率快照會保留；需要時再換算至新的基本幣別。")
                    .font(.footnote)
                if baseCurrency != payload.trip.baseCurrency {
                    GroupBalancePreview(
                        payload: payload, base: baseCurrency,
                        rates: GroupRatesRules.automaticRates(payload, base: baseCurrency))
                }
                Button("儲存基本設定") {
                    if baseCurrency != payload.trip.baseCurrency {
                        confirming = .preferences
                    } else {
                        savePreferences()
                    }
                }
                .disabled(!validName || !preferencesChanged)
            } else {
                LabeledContent("名稱", value: payload.trip.name)
                LabeledContent("基本幣別", value: payload.trip.baseCurrency.rawValue)
            }
        }
        .disabled(busy)
    }

    private var ratesInfoSection: some View {
        Section("匯率資訊與快照") {
            if let info = payload.exchangeRateInfo {
                rateSource(info.source)
                if let provider = info.provider { Text("提供者：\(provider)") }
                if let type = info.rateType { Text("匯率類型：\(type)") }
                if let fetchedAt = info.fetchedAt {
                    Text("取得時間：\(NativeDisplayFormatting.timestamp(fetchedAt, locale: locale))")
                }
                if let defaults = info.defaults {
                    DisclosureGroup("自動匯率來源") {
                        rateSource(defaults.source)
                        if let provider = defaults.provider { Text("提供者：\(provider)") }
                        if let fetchedAt = defaults.fetchedAt {
                            Text(
                                "取得時間：\(NativeDisplayFormatting.timestamp(fetchedAt, locale: locale))"
                            )
                        }
                        rateRows(defaults.rates, base: payload.trip.baseCurrency)
                    }
                }
            } else {
                Text("此回應未提供匯率來源。")
            }
            DisclosureGroup("目前群組匯率") {
                if let rates = payload.trip.exchangeRates {
                    rateRows(rates, base: payload.trip.baseCurrency)
                } else {
                    Text("未提供群組匯率；本機試算將使用固定備援匯率。")
                }
            }
            Text("群組匯率與每筆支出保存的快照不同。修改群組匯率不會取代既有支出快照；Visa 結算使用支出日期對應的 Visa 匯率。")
                .font(.footnote)
            DisclosureGroup("支出匯率快照") {
                if payload.trip.expenses.isEmpty { Text("尚無支出。") }
                ForEach(payload.trip.expenses) { expense in
                    VStack(alignment: .leading, spacing: 4) {
                        Text(verbatim: expense.description).font(.headline)
                        if let rate = expense.exchangeRate {
                            Text(
                                verbatim:
                                    "1 \(expense.currency.rawValue) = \(NativeDisplayFormatting.number(rate.rateToBase, locale: locale)) \(rate.baseCurrency.rawValue)"
                            )
                            rateSource(rate.source)
                            if let provider = rate.provider { Text("提供者：\(provider)") }
                            if let type = rate.rateType { Text("匯率類型：\(type)") }
                            if let time = rate.fetchedAt {
                                Text(
                                    "取得時間：\(NativeDisplayFormatting.timestamp(time, locale: locale))"
                                )
                            }
                        } else {
                            Text("未保存匯率快照，換算可能受群組匯率影響。")
                        }
                        if let visa = expense.visaExchangeRate {
                            Text(
                                verbatim:
                                    "Visa：1 \(visa.sourceCurrency.rawValue) = \(NativeDisplayFormatting.number(visa.rate, locale: locale)) \(visa.targetCurrency.rawValue)"
                            )
                            Text(
                                "日期：\(NativeDisplayFormatting.dateOnly(visa.date, locale: locale))；取得時間：\(NativeDisplayFormatting.timestamp(visa.fetchedAt, locale: locale))"
                            )
                        }
                    }
                    .font(.caption)
                }
            }
        }
    }

    private var ratesEditorSection: some View {
        Section("自訂匯率") {
            Text("輸入 1 單位外幣可兌換多少 \(payload.trip.baseCurrency.rawValue)。留白會使用自動匯率；所有數值都必須大於零。")
                .font(.footnote)
            ForEach(Currency.allCases.filter { $0 != payload.trip.baseCurrency }) { currency in
                HStack {
                    Text(verbatim: currency.rawValue)
                    TextField(
                        "自動",
                        text: Binding(
                            get: { rateValues[currency.rawValue] ?? "" },
                            set: { rateValues[currency.rawValue] = $0 })
                    )
                    .keyboardType(.decimalPad)
                    .multilineTextAlignment(.trailing)
                    .accessibilityLabel(
                        "\(currency.rawValue) 對 \(payload.trip.baseCurrency.rawValue) 匯率")
                }
            }
            if let snapshot = loadedSnapshot {
                Text(
                    "已載入臺灣銀行即期中價快照：\(NativeDisplayFormatting.timestamp(snapshot.fetchedAt, locale: locale))。尚未儲存。"
                )
                .font(.footnote)
            }
            Button("載入最新自動匯率快照") { loadSnapshot() }
            Button("清除自訂匯率草稿") { rateValues = [:] }
            if let proposedRates {
                GroupBalancePreview(
                    payload: payload, base: payload.trip.baseCurrency, rates: proposedRates)
            } else {
                Text("匯率必須是大於零的有限數值。").foregroundStyle(.red)
            }
            Button("檢查並套用匯率") { confirming = .rates }
                .disabled(customRates == nil)
            Text("預覽使用目前可取得的匯率。儲存時伺服器可能取得較新的自動匯率；最終金額以儲存後資料為準。")
                .font(.footnote).foregroundStyle(.secondary)
        }
        .disabled(busy)
    }

    private var visaSection: some View {
        Section("Visa 結算") {
            if allows(.changePreferences) {
                Toggle("啟用 Visa 結算", isOn: $visaEnabled)
                currencyPicker("Visa 結算幣別", selection: $visaCurrency)
                    .disabled(!visaEnabled)
                Text("變更模式或幣別會由伺服器取得所需的歷史匯率並重新計算。若匯率不可用或既有付款幣別不相容，操作可能失敗。成功前不會更新此頁資料；失敗時會保留草稿。")
                    .font(.footnote)
                Button("檢查並套用 Visa 設定") { confirming = .visa }
                    .disabled(
                        visaEnabled == (payload.trip.visaSettlementEnabled == true)
                            && (!visaEnabled || visaCurrency == payload.trip.settlementCurrency))
            } else {
                LabeledContent("Visa 結算") {
                    if payload.trip.visaSettlementEnabled == true {
                        Text("已啟用")
                    } else {
                        Text("未啟用")
                    }
                }
                LabeledContent("結算幣別", value: payload.trip.settlementCurrency.rawValue)
            }
        }
        .disabled(busy)
    }

    private var apiSection: some View {
        Section("API 寫入") {
            if allows(.manageAPIWrites) {
                Toggle(
                    "允許 API token 修改此群組",
                    isOn: Binding(
                        get: { payload.trip.allowApiWrites == true },
                        set: { confirming = .apiWrites($0) })
                )
                .disabled(busy)
                Text("此開關只控制 API token 的修改權限，不影響已登入帳號的編輯權限。只有以帳號工作階段登入的擁有者可變更此設定。封存仍會阻止日常資料修改。")
                    .font(.footnote)
            } else {
                LabeledContent("API token 寫入") {
                    if payload.trip.allowApiWrites == true { Text("允許") } else { Text("不允許") }
                }
                Text("需要以帳號工作階段登入的擁有者才能變更。")
                    .font(.footnote)
            }
        }
    }

    @ViewBuilder
    private var ownerActionsSection: some View {
        if allows(.copyTrip) || allows(.archive) || allows(.deleteTrip) {
            Section("擁有者操作") {
                if allows(.copyTrip) {
                    Button("複製群組") { confirming = .copy }
                    Text("建立新的群組，不會覆寫原群組。帳號存取權與分享連結不會沿用。")
                        .font(.footnote)
                }
                if allows(.archive) {
                    if payload.trip.archivedAt == nil {
                        Button("封存群組") { confirming = .archive }
                    } else {
                        Button("還原群組") { confirming = .unarchive }
                    }
                }
            }
            .disabled(busy)
            if allows(.deleteTrip) {
                Section("永久刪除") {
                    Text("此操作會刪除群組及其資料，無法復原。請輸入完整群組名稱「\(payload.trip.name)」。")
                    TextField("完整群組名稱", text: $deleteName)
                        .autocorrectionDisabled()
                        .textInputAutocapitalization(.never)
                    Button("永久刪除群組", role: .destructive) { confirming = .delete }
                        .disabled(!WebText.equal(deleteName, payload.trip.name))
                }
                .disabled(busy)
            }
        }
    }

    @ViewBuilder
    private var confirmationMessage: some View {
        switch confirming {
        case .preferences:
            Text("基本幣別將改為 \(baseCurrency.rawValue)，並清除群組自訂匯率。支出快照會保留。請先檢查餘額預覽。")
        case .rates:
            Text("匯率會影響未保存快照的支出及需要跨基本幣別換算的金額。請確認餘額預覽後套用。")
        case .visa:
            Text("套用後會重新計算結算餘額。伺服器須完成所需匯率處理後才會回傳結果；失敗時不會在本機套用部分結果。")
        case .apiWrites:
            Text("此變更會影響持有 API token 且有群組權限的帳號，不會授予新的帳號存取權。")
        case .archive:
            Text("封存後仍可檢視資料，但不能修改日常資料或偏好設定。可隨時還原。")
        case .unarchive: Text("群組將恢復為可編輯狀態，仍受帳號及 API 權限限制。")
        case .copy: Text("建立新的群組並開啟副本，原群組不會變更。")
        case .delete: Text("確定永久刪除「\(payload.trip.name)」及其資料？此操作無法復原。")
        case nil: EmptyView()
        }
    }

    private func currencyPicker(_ title: LocalizedStringKey, selection: Binding<Currency>)
        -> some View
    {
        Picker(title, selection: selection) {
            ForEach(Currency.allCases) { currency in Text(verbatim: currency.rawValue).tag(currency)
            }
        }
    }
    private func rateSource(_ source: String) -> Text {
        switch source {
        case "bank": Text("來源：臺灣銀行即期中價")
        case "custom": Text("來源：自訂匯率")
        case "fixed": Text("來源：固定備援匯率（非即時）")
        case "legacy": Text("來源：舊版匯率快照")
        default: Text("來源：\(source)")
        }
    }
    private func rateRows(_ rates: ExchangeRates, base: Currency) -> some View {
        ForEach(Currency.allCases) { currency in
            if let rate = rates[currency.rawValue] {
                Text(
                    verbatim:
                        "1 \(currency.rawValue) = \(NativeDisplayFormatting.number(rate, locale: locale)) \(base.rawValue)"
                ).font(.caption)
            }
        }
    }

    private func reset() {
        mutation.invalidate()
        mutation.issue = nil
        name = payload.trip.name
        baseCurrency = payload.trip.baseCurrency
        rateValues = GroupRatesRules.customValues(payload)
        loadedSnapshot = nil
        visaEnabled = payload.trip.visaSettlementEnabled == true
        visaCurrency = payload.trip.visaSettlementCurrency ?? payload.trip.baseCurrency
        deleteName = ""
        confirming = nil
    }
    private func savePreferences() {
        confirming = nil
        guard validName else { return }
        let changedBase = baseCurrency != payload.trip.baseCurrency
        let patch = TripPatch(
            name: WebText.trim(name),
            baseCurrency: changedBase ? baseCurrency : nil)
        update(patch, operation: .changePreferences) { next in
            name = next.trip.name
            baseCurrency = next.trip.baseCurrency
            if changedBase {
                rateValues = GroupRatesRules.customValues(next)
                loadedSnapshot = nil
            }
        }
    }
    private func saveRates() {
        confirming = nil
        guard let customRates else { return }
        update(TripPatch(exchangeRates: customRates), operation: .changePreferences) { next in
            rateValues = GroupRatesRules.customValues(next)
            loadedSnapshot = nil
        }
    }
    private func loadSnapshot() {
        let base = payload.trip.baseCurrency
        let request = mutation.request(sessionID: session.sessionID)
        Task { @MainActor in
            await mutation.run(
                request: request, session: session, payload: payload, operation: .changePreferences
            ) { client in
                let snapshot: ExchangeRateSnapshot = try await client.api(
                    "GET", path: "api/exchange-rates/" + base.rawValue)
                guard GroupRatesRules.validSnapshot(snapshot, base: base) else {
                    throw GroupRatesError.invalidSnapshot
                }
                return snapshot
            } accept: { snapshot in
                loadedSnapshot = snapshot
                rateValues = [:]
            }
        }
    }
    private func saveVisa() {
        confirming = nil
        let enabled = visaEnabled
        let currency = visaCurrency
        let request = mutation.request(sessionID: session.sessionID)
        Task { @MainActor in
            await mutation.run(
                request: request, session: session, payload: payload, operation: .changePreferences
            ) { client in
                try await client.setVisa(
                    tripID: payload.trip.id, enabled: enabled, currency: currency)
            } publish: { next in
                onPayload(next)
            } accept: { next in
                visaEnabled = next.trip.visaSettlementEnabled == true
                visaCurrency = next.trip.visaSettlementCurrency ?? next.trip.baseCurrency
            }
        }
    }
    private func setAPIWrites(_ enabled: Bool) {
        confirming = nil
        update(TripPatch(allowApiWrites: enabled), operation: .manageAPIWrites)
    }
    private func setArchived(_ archived: Bool) {
        confirming = nil
        update(TripPatch(archived: archived), operation: .archive)
    }
    private func update(
        _ patch: TripPatch, operation: TripOperation,
        accepted: @MainActor @escaping (TripPayload) -> Void = { _ in }
    ) {
        let request = mutation.request(sessionID: session.sessionID)
        Task { @MainActor in
            await mutation.run(
                request: request, session: session, payload: payload, operation: operation
            ) { client in
                try await client.updateTrip(id: payload.trip.id, patch: patch)
            } publish: { next in
                onPayload(next)
            } accept: { next in
                accepted(next)
            }
        }
    }
    private func copy() {
        confirming = nil
        let request = mutation.request(sessionID: session.sessionID)
        Task { @MainActor in
            await mutation.run(
                request: request, session: session, payload: payload, operation: .copyTrip
            ) { client in
                try await client.copyTrip(id: payload.trip.id)
            } publish: { next in
                onCreated(next)
            }
        }
    }
    private func delete() {
        confirming = nil
        guard WebText.equal(deleteName, payload.trip.name) else { return }
        let request = mutation.request(sessionID: session.sessionID)
        Task { @MainActor in
            await mutation.run(
                request: request, session: session, payload: payload, operation: .deleteTrip
            ) { client in
                try await client.deleteTrip(id: payload.trip.id)
                return true
            } publish: { _ in
                onDeleted()
            }
        }
    }
}

private enum GroupSettingsConfirmation {
    case preferences, rates, visa
    case apiWrites(Bool)
    case archive, unarchive, copy, delete
}

private struct GroupBalancePreview: View {
    let payload: TripPayload
    let base: Currency
    let rates: ExchangeRates

    var body: some View {
        DisclosureGroup("餘額預覽（目前 → 變更後）") {
            if payload.trip.settlementPayments == nil {
                Text("付款明細不可用，無法準確預覽結算餘額。")
            } else {
                switch preview() {
                case .success(let balances):
                    if balances.isEmpty { Text("尚無參與者。") }
                    ForEach(balances) { balance in
                        VStack(alignment: .leading, spacing: 4) {
                            Text(verbatim: balance.name)
                            if let current = payload.balances.first(where: {
                                $0.participantId == balance.participantId
                            }) {
                                Text(
                                    "\(current.currency.formatted(current.amountMinor)) → \(balance.currency.formatted(balance.amountMinor))"
                                )
                            } else {
                                Text("變更後：\(balance.currency.formatted(balance.amountMinor))")
                            }
                        }
                        .font(.caption)
                    }
                case .failure:
                    Text("無法預覽：匯率或既有資料不相容，或換算金額超出範圍。請檢查匯率。伺服器會在儲存時再次驗證。")
                        .foregroundStyle(.red)
                }
            }
            if payload.trip.visaSettlementEnabled == true {
                Text("Visa 模式下，群組基本幣別與一般匯率不會取代 Visa 結算匯率。")
                    .font(.footnote)
            }
        }
    }
    private func preview() -> Result<[Balance], Error> {
        Result {
            try Finance.balances(
                trip: GroupRatesRules.previewTrip(payload.trip, base: base, rates: rates))
        }
    }
}
