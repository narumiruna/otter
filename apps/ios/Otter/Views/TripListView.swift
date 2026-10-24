import OtterKit
import SwiftUI

@MainActor
struct TripListView: View {
    private enum Sheet: Int, Identifiable {
        case create, account, queue, restore
        var id: Self { self }
    }

    @Environment(AppSession.self) private var session
    @Environment(LocalExpenseState.self) private var local
    @Environment(AppNavigation.self) private var navigation
    @State private var handledRoute: UUID?
    @State private var sheet: Sheet?
    @State private var response: TripsResponse?
    @State private var isLoading = false
    @State private var loadID: UUID?
    @State private var loadFailed = false
    @State private var showsSignOut = false
    @State private var selectedTripID: String?
    @State private var detailPath: [String] = []

    private var currentTripID: String? { detailPath.last ?? selectedTripID }
    private var sidebarSelection: Binding<String?> {
        Binding(
            get: { currentTripID },
            set: { value in
                detailPath = []
                selectedTripID = value
                if navigation.route?.tripID != value { navigation.route = nil }
            })
    }

    var body: some View {
        let generation = session.sessionID
        NavigationSplitView {
            List(selection: sidebarSelection) {
                if let response {
                    Section("使用中的群組") {
                        if response.trips.isEmpty {
                            Text("尚無使用中的群組。點選右上角的加號來建立群組。")
                                .otterSecondaryText()
                        }
                        ForEach(response.trips) { trip in
                            NavigationLink(value: trip.id) { TripSummaryRow(trip: trip) }
                                .accessibilityIdentifier("trip.\(trip.id)")
                        }
                    }
                    if !response.archivedTrips.isEmpty {
                        Section("已封存") {
                            ForEach(response.archivedTrips) { trip in
                                NavigationLink(value: trip.id) { TripSummaryRow(trip: trip) }
                                    .accessibilityIdentifier("trip.\(trip.id)")
                            }
                        }
                    }
                } else if !isLoading {
                    ContentUnavailableView {
                        Label(
                            LocalizedStringKey(loadFailed ? "無法載入群組" : "尚無群組"),
                            systemImage: "person.3")
                    } description: {
                        Text("請下拉重新整理，或再試一次。")
                    } actions: {
                        Button("重新載入") { Task { await load() } }
                    }
                }
            }
            .otterList()
            .overlay {
                if isLoading && response == nil { ProgressView("正在載入群組…") }
            }
            .navigationTitle("群組")
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Menu {
                        Button("帳號設定", systemImage: "person.crop.circle") { sheet = .account }
                        Button(
                            "待同步支出（\(local.visibleItems(session: session).count)）",
                            systemImage: "icloud.and.arrow.up"
                        ) {
                            sheet = .queue
                        }
                        Button("還原 JSON 備份", systemImage: "square.and.arrow.down") {
                            sheet = .restore
                        }
                        Button(
                            "登出", systemImage: "rectangle.portrait.and.arrow.right",
                            role: .destructive
                        ) {
                            showsSignOut = true
                        }
                    } label: {
                        Label("帳號", systemImage: "person.crop.circle")
                    }
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button("建立群組", systemImage: "plus") { sheet = .create }
                        .disabled(isLoading)
                }
            }
            .confirmationDialog("確定登出？", isPresented: $showsSignOut, titleVisibility: .visible) {
                Button("登出", role: .destructive) { Task { await session.signOut() } }
                Button("取消", role: .cancel) {}
            }
            .refreshable { await load() }
        } detail: {
            NavigationStack(path: $detailPath) {
                Group {
                    if let selectedTripID {
                        detail(selectedTripID)
                            .id(selectedTripID)
                    } else {
                        ContentUnavailableView("群組", systemImage: "person.3")
                    }
                }
                .navigationDestination(for: String.self) { id in
                    detail(id).id(id)
                }
            }
        }
        .sheet(item: $sheet) { destination in
            switch destination {
            case .create:
                CreateTripView { payload in
                    guard generation == session.sessionID else { return }
                    sheet = nil
                    detailPath = []
                    selectedTripID = payload.trip.id
                    Task { await load() }
                }
            case .account:
                AccountSettingsView()
            case .queue:
                ExpenseQueueView(
                    currentPayload: nil,
                    knownTripIDs: response.map { Set(($0.trips + $0.archivedTrips).map(\.id)) })
            case .restore:
                RestoreBackupView { value in
                    guard generation == session.sessionID else { return }
                    sheet = nil
                    detailPath = []
                    selectedTripID = value.trip.id
                    Task { await load() }
                }
            }
        }
        .task(id: currentTripID) { await load() }
        .task(id: navigation.route?.id) {
            guard let route = navigation.route, route.id != handledRoute,
                route.sessionID == session.sessionID, route.userID == session.user?.id,
                let client = session.client,
                IncomingLink.sameOrigin(route.origin, client.baseURL)
            else { return }
            handledRoute = route.id
            detailPath = []
            selectedTripID = route.tripID
        }
    }

    private func detail(_ id: String) -> some View {
        let generation = session.sessionID
        return TripDetailView(
            tripID: id,
            onCreated: { value in
                guard generation == session.sessionID else { return }
                // Keep a different workspace selected if the user left during the request.
                if currentTripID == id {
                    // A copied workspace must not be pushed inside the original TabView.
                    detailPath = []
                    selectedTripID = value.trip.id
                }
                Task { await load() }
            },
            onDeleted: {
                guard generation == session.sessionID else { return }
                if currentTripID == id && detailPath.isEmpty { selectedTripID = nil }
                Task { await load() }
            },
            route: navigation.route?.tripID == id ? navigation.route : nil)
    }

    private func load() async {
        guard let client = session.client else { return }
        let requestSessionID = session.sessionID
        let requestID = UUID()
        loadID = requestID
        isLoading = true
        defer { if loadID == requestID { isLoading = false } }
        do {
            let result = try await client.trips()
            try Task.checkCancellation()
            guard loadID == requestID, requestSessionID == session.sessionID,
                session.client === client
            else { return }
            response = result
            loadFailed = false
        } catch is CancellationError {
        } catch {
            guard loadID == requestID, requestSessionID == session.sessionID, !Task.isCancelled
            else { return }
            loadFailed = true
            session.handle(error, for: requestSessionID)
        }
    }
}

@MainActor
private struct TripSummaryRow: View {
    let trip: TripSummary

    var body: some View {
        HStack(alignment: .top, spacing: 14) {
            OtterIconBadge(symbol: "globe.asia.australia")
            VStack(alignment: .leading, spacing: 6) {
                Text(trip.name).font(.headline.weight(.semibold))
                    .fixedSize(horizontal: false, vertical: true)
                Text("\(trip.participantCount) 位成員 · \(trip.expenseCount) 筆支出")
                    .font(.footnote)
                    .otterSecondaryText()
                Text("基本幣別：\(trip.baseCurrency.rawValue)")
                    .font(.caption)
                    .otterSecondaryText()
            }
        }
        .padding(.vertical, 10)
        .accessibilityElement(children: .combine)
    }
}

@MainActor
private struct CreateTripView: View {
    @Environment(AppSession.self) private var session
    @Environment(\.dismiss) private var dismiss
    let onCreated: @MainActor (TripPayload) -> Void
    @State private var name = ""
    @State private var currency: Currency = .twd
    @State private var isSubmitting = false
    @State private var errorMessage: String?

    private var trimmedName: String { WebText.trim(name) }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    TextField("群組名稱", text: $name)
                    Picker("基本幣別", selection: $currency) {
                        ForEach(Currency.allCases) { currency in
                            Text(currency.rawValue).tag(currency)
                        }
                    }
                } footer: {
                    Text("群組名稱最多 100 個字。")
                }
                if let errorMessage {
                    Section { Text(errorMessage).foregroundStyle(.red) }
                }
                if isSubmitting { ProgressView("正在建立群組…") }
            }
            .otterList()
            .disabled(isSubmitting)
            .navigationTitle("建立群組")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("取消") { dismiss() }.disabled(isSubmitting)
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("建立") { Task { await submit() } }
                        .disabled(
                            isSubmitting || !GroupRules.validName(name))
                }
            }
            .interactiveDismissDisabled(isSubmitting)
        }
    }

    private func submit() async {
        guard !isSubmitting, GroupRules.validName(name),
            let client = session.client
        else { return }
        let requestSessionID = session.sessionID
        isSubmitting = true
        errorMessage = nil
        defer { isSubmitting = false }
        do {
            let payload = try await client.createTrip(name: trimmedName, currency: currency)
            guard requestSessionID == session.sessionID, !Task.isCancelled else { return }
            onCreated(payload)
        } catch is CancellationError {
        } catch {
            guard !Task.isCancelled else { return }
            errorMessage = error.localizedDescription
            session.handle(error, for: requestSessionID)
        }
    }
}
