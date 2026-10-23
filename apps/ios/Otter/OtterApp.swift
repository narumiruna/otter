import OtterKit
import SwiftUI

@main
struct OtterApp: App {
    @Environment(\.scenePhase) private var scenePhase
    @State private var session = AppSession()
    @State private var local = LocalExpenseState()
    @State private var navigation = AppNavigation()
    @State private var preferences = AppPreferences()
    @State private var incoming: IncomingLink?
    @State private var pendingRoute: AppNavigation.WorkspaceRoute?

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(session)
                .environment(local)
                .environment(navigation)
                .environment(preferences)
                .environment(\.locale, preferences.locale)
                .preferredColorScheme(preferences.appearance.colorScheme)
                .onOpenURL { url in
                    pendingRoute = nil
                    do { incoming = try IncomingLink.parse(url) } catch {
                        session.errorMessage = error.localizedDescription
                    }
                }
                .sheet(item: $incoming, onDismiss: applyPendingRoute) { link in
                    IncomingLinkView(link: link) { route in
                        guard incoming?.id == link.id, route.sessionID == session.sessionID,
                            route.userID == session.user?.id,
                            let client = session.client,
                            IncomingLink.sameOrigin(route.origin, client.baseURL)
                        else { return }
                        pendingRoute = route
                        incoming = nil
                    }
                    .id(link.id)
                }
                .onChange(of: session.sessionID) { _, _ in
                    if navigation.route?.sessionID != session.sessionID { navigation.route = nil }
                    if pendingRoute?.sessionID != session.sessionID { pendingRoute = nil }
                }
                .tint(preferences.palette.accessibleTint)
                .task { await session.restore() }
                .task(id: "\(session.sessionID):\(session.user?.id ?? "none")") {
                    await local.activate(session: session)
                    while !Task.isCancelled {
                        if scenePhase == .active { await local.synchronize(session: session) }
                        do { try await Task.sleep(for: .seconds(30)) } catch { return }
                    }
                }
                .onChange(of: scenePhase) { _, phase in
                    if phase == .active { Task { await local.synchronize(session: session) } }
                }
                .onChange(of: local.isOnline) { _, online in
                    if online { Task { await local.synchronize(session: session) } }
                }
                .privacySensitive()
        }
    }

    /// Present the workspace and its sheets only after the incoming-link sheet is gone.
    private func applyPendingRoute() {
        guard incoming == nil else { return }
        defer { pendingRoute = nil }
        guard let route = pendingRoute, route.sessionID == session.sessionID,
            route.userID == session.user?.id, let client = session.client,
            IncomingLink.sameOrigin(route.origin, client.baseURL)
        else { return }
        navigation.route = route
    }
}
