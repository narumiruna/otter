import OtterKit
import SwiftUI

@MainActor
struct ExpenseBrowserView: View {
    @Environment(AppSession.self) private var session
    @Environment(\.locale) private var locale
    @Environment(AppPreferences.self) private var preferences
    @Environment(\.dynamicTypeSize) private var dynamicTypeSize
    let payload: TripPayload
    let onEdit: @MainActor (Expense) -> Void
    let onCopy: @MainActor (Expense) -> Void
    let onHistory: @MainActor (Expense?) -> Void
    let onDelete: @MainActor (Expense) async throws -> Void
    @State private var filters = ExpenseFilters()
    @State private var grouping: ExpenseGrouping = .date
    @State private var showFilters = false
    @State private var deletion: Expense?
    @AppStorage private var storedColumns: String

    init(
        payload: TripPayload, origin: URL, userID: String?,
        onEdit: @escaping @MainActor (Expense) -> Void,
        onCopy: @escaping @MainActor (Expense) -> Void,
        onHistory: @escaping @MainActor (Expense?) -> Void,
        onDelete: @escaping @MainActor (Expense) async throws -> Void
    ) {
        self.payload = payload
        self.onEdit = onEdit
        self.onCopy = onCopy
        self.onHistory = onHistory
        self.onDelete = onDelete
        _storedColumns = AppStorage(
            wrappedValue: "payer,category,date",
            "otter.expense-columns.\(origin.absoluteString).\(userID ?? "public")")
    }
    private var permissions: TripPermissions {
        TripPermissions(
            payload: payload, auth: session.client?.auth ?? .anonymous, userID: session.user?.id)
    }
    private var result: Result<[ExpenseGroup], Error> {
        Result {
            let values = try ExpenseQuery.filterAndSort(
                trip: payload.trip, filters: filters, locale: locale)
            return try ExpenseQuery.groups(
                expenses: values, trip: payload.trip, grouping: grouping, sort: filters.sort,
                locale: locale)
        }
    }
    private var columns: Set<String> { Set(storedColumns.split(separator: ",").map(String.init)) }

    var body: some View {
        List {
            Section {
                TextField("搜尋支出描述", text: $filters.query)
                    .accessibilityIdentifier("expenses.search")
                HStack {
                    Button("篩選", systemImage: "line.3.horizontal.decrease.circle") {
                        showFilters = true
                    }
                    Spacer()
                    if permissions.allows(.readHistory) {
                        Button("修改紀錄", systemImage: "clock.arrow.circlepath") { onHistory(nil) }
                    }
                }
                .buttonStyle(.borderless)
                Picker("排序", selection: $filters.sort) {
                    ForEach(ExpenseSort.allCases, id: \.self) { value in
                        Text(sortName(value)).tag(value)
                    }
                }
                Picker("分組", selection: $grouping) {
                    Text("依日期").tag(ExpenseGrouping.date)
                    Text("依付款人").tag(ExpenseGrouping.payer)
                    Text("不分組").tag(ExpenseGrouping.none)
                }
                Menu("顯示資訊", systemImage: "list.bullet.rectangle") {
                    ForEach(columnNames, id: \.0) { key, label in
                        Toggle(
                            label,
                            isOn: Binding(
                                get: { columns.contains(key) },
                                set: { selected in
                                    var next = columns
                                    if selected { next.insert(key) } else { next.remove(key) }
                                    storedColumns = next.sorted().joined(separator: ",")
                                }))
                    }
                    Button("恢復預設欄位") { storedColumns = "payer,category,date" }
                }
            }
            switch result {
            case .failure(let error):
                Section {
                    Text(OverviewFinanceSupport.mathError(error, locale: locale)).foregroundStyle(
                        .red)
                }
            case .success(let groups):
                if groups.allSatisfy({ $0.expenses.isEmpty }) {
                    ContentUnavailableView(
                        "沒有符合的支出", systemImage: "receipt", description: Text("可以調整篩選條件或新增支出。"))
                    Button("清除篩選") { filters = ExpenseFilters() }
                }
                ForEach(groups) { group in
                    Section {
                        ForEach(group.expenses) { expense in
                            row(expense)
                                .id(expense.id)
                                .contextMenu { actions(expense) }
                        }
                    } header: {
                        if grouping != .none { Text(groupName(group.key)) }
                    } footer: {
                        Text(
                            NativeDisplayFormatting.list(
                                group.totals.map { $0.currency.formatted($0.amountMinor) },
                                locale: locale))
                    }
                }
            }
        }
        .otterList()
        .sheet(isPresented: $showFilters) { filterSheet }
        .sheet(item: $deletion) { expense in
            ExpenseDeleteConfirmation(expense: expense) { try await onDelete(expense) }
        }
    }
    private func row(_ expense: Expense) -> some View {
        HStack(alignment: .top, spacing: 12) {
            OtterIconBadge(symbol: "receipt")
            VStack(alignment: .leading, spacing: 8) {
                let layout =
                    dynamicTypeSize.isAccessibilitySize
                    ? AnyLayout(VStackLayout(alignment: .leading, spacing: 6))
                    : AnyLayout(HStackLayout(alignment: .firstTextBaseline, spacing: 12))
                layout {
                    Button(expense.description) {
                        if permissions.allows(.editDailyData) { onEdit(expense) }
                    }
                    .buttonStyle(.plain).font(.body.weight(.semibold))
                    .frame(maxWidth: .infinity, alignment: .leading)
                    Text(expense.currency.formatted(expense.amountMinor))
                        .font(.headline).monospacedDigit().layoutPriority(1)
                }
                .fixedSize(horizontal: false, vertical: true)
                if columns.contains("payer") {
                    Text("付款人：\(name(expense.paidById))").font(.footnote)
                        .otterSecondaryText()
                }
                if columns.contains("date") {
                    Text(NativeDisplayFormatting.dateOnly(expense.expenseDate, locale: locale))
                        .font(
                            .caption
                        ).otterSecondaryText()
                }
                if columns.contains("category") {
                    Text(NativeExpenseLabels.category(expense.category, locale: locale))
                        .font(.caption.weight(.medium))
                        .foregroundStyle(preferences.palette.colors.accentText)
                        .padding(.horizontal, 8).padding(.vertical, 4)
                        .background(
                            preferences.palette.colors.softAccent,
                            in: RoundedRectangle(cornerRadius: 6))
                }
                if columns.contains("participants") {
                    Text(
                        "分攤：\(NativeDisplayFormatting.list(expense.participantIds.map(name), locale: locale))"
                    ).font(.caption)
                }
                if columns.contains("tags"), let tags = expense.tags, !tags.isEmpty {
                    Text(tags.joined(separator: " · ")).font(.caption)
                }
                if columns.contains("receipt"), expense.receiptId != nil {
                    Label("有收據", systemImage: "photo").font(.caption)
                }
            }
            Menu {
                actions(expense)
            } label: {
                Image(systemName: "ellipsis").frame(minWidth: 44, minHeight: 44)
            }
            .accessibilityLabel("\(expense.description) 的操作")
            .disabled(!permissions.allows(.readHistory) && !permissions.allows(.editDailyData))
        }
        .padding(.vertical, 10)
    }
    @ViewBuilder private func actions(_ expense: Expense) -> some View {
        if permissions.allows(.editDailyData) {
            Button("編輯支出", systemImage: "pencil") { onEdit(expense) }
                .disabled(expense.version == nil)
            Button("複製為新支出", systemImage: "document.on.document") { onCopy(expense) }
        }
        if permissions.allows(.readHistory) {
            Button("修改紀錄", systemImage: "clock.arrow.circlepath") { onHistory(expense) }
        }
        if permissions.allows(.editDailyData) {
            Button("刪除支出", systemImage: "trash", role: .destructive) { deletion = expense }
                .disabled(expense.version == nil)
        }
    }
    private var filterSheet: some View {
        NavigationStack {
            Form {
                Section("日期範圍") {
                    dateFilter("開始日期", field: $filters.dateFrom)
                    dateFilter("結束日期", field: $filters.dateTo)
                }
                Section {
                    personFilter("付款人", selection: $filters.paidById)
                    personFilter("分攤人", selection: $filters.participantId)
                    Picker("貨幣", selection: $filters.currency) {
                        Text("全部貨幣").tag("")
                        ForEach(Currency.allCases) { Text($0.rawValue).tag($0.rawValue) }
                    }
                    Picker("分類", selection: $filters.category) {
                        Text("全部分類").tag("")
                        ForEach(ExpenseCategory.allCases, id: \.rawValue) {
                            Text(NativeExpenseLabels.category($0.rawValue, locale: locale)).tag(
                                $0.rawValue)
                        }
                    }
                    TextField("標籤（完全相符）", text: $filters.tag)
                }
                Button("清除篩選") { filters = ExpenseFilters() }
            }
            .otterList()
            .navigationTitle("支出篩選")
            .toolbar {
                ToolbarItem(placement: .confirmationAction) { Button("完成") { showFilters = false } }
            }
        }
    }
    private func personFilter(_ label: LocalizedStringKey, selection: Binding<String>) -> some View
    {
        Picker(label, selection: selection) {
            Text("全部成員").tag("")
            ForEach(payload.trip.participants) { Text($0.name).tag($0.id) }
        }
    }
    private func dateFilter(_ label: LocalizedStringKey, field: Binding<String>) -> some View {
        Group {
            Toggle(
                label,
                isOn: Binding(
                    get: { !field.wrappedValue.isEmpty },
                    set: { enabled in
                        field.wrappedValue = enabled ? formatter.string(from: Date()) : ""
                    }))
            if !field.wrappedValue.isEmpty {
                DatePicker(
                    label,
                    selection: Binding(
                        get: { formatter.date(from: field.wrappedValue) ?? Date() },
                        set: {
                            field.wrappedValue = formatter.string(from: $0)
                        }), displayedComponents: .date
                )
                .environment(\.calendar, Calendar(identifier: .gregorian))
            }
        }
    }
    private var formatter: DateFormatter {
        let formatter = DateFormatter()
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.dateFormat = "yyyy-MM-dd"
        formatter.isLenient = false
        return formatter
    }
    private func groupName(_ key: String) -> String {
        grouping == .payer ? name(key) : NativeDisplayFormatting.dateOnly(key, locale: locale)
    }
    private func name(_ id: String) -> String {
        payload.trip.participants.first { $0.id == id }?.name
            ?? NativeLocalization.string("未知成員", locale: locale)
    }
    private func sortName(_ sort: ExpenseSort) -> LocalizedStringKey {
        switch sort {
        case .dateDescending: "日期：由新到舊"
        case .dateAscending: "日期：由舊到新"
        case .amountDescending: "換算金額：由高到低"
        case .amountAscending: "換算金額：由低到高"
        }
    }
    private var columnNames: [(String, LocalizedStringKey)] {
        [
            ("payer", "付款人"), ("category", "分類"), ("date", "日期"),
            ("participants", "native.expenseBrowserView.splitParticipants"),
            ("receipt", "收據"), ("tags", "web.tags"),
        ]
    }
}

@MainActor
private struct ExpenseDeleteConfirmation: View {
    @Environment(\.dismiss) private var dismiss
    let expense: Expense
    let onDelete: @MainActor () async throws -> Void
    @State private var busy = false
    @State private var issue: String?
    var body: some View {
        NavigationStack {
            Form {
                Text(expense.description).font(.headline)
                Text(expense.currency.formatted(expense.amountMinor))
                Text("刪除後會重新計算帳務。可從修改紀錄檢查並還原；舊收據圖片不會保留。")
                if let issue { Text(issue).foregroundStyle(.red) }
                Button("確認刪除支出", role: .destructive) {
                    Task {
                        guard !busy else { return }
                        busy = true
                        defer { busy = false }
                        do {
                            try await onDelete()
                            dismiss()
                        } catch { issue = error.localizedDescription }
                    }
                }.disabled(busy)
                if busy { ProgressView("正在刪除…") }
            }
            .navigationTitle("刪除支出")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("取消") { dismiss() }.disabled(busy)
                }
            }
            .interactiveDismissDisabled(busy)
        }
    }
}
