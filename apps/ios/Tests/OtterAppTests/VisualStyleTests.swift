import OtterKit
import SwiftUI
import UIKit
import XCTest

@testable import Otter

/// Synthetic records render real SwiftUI screens without an API or saved account.
@MainActor
final class VisualStyleTests: XCTestCase {
    func testMainScreensInLightAndDark() async throws {
        let payload = try fixture()
        for style in [UIUserInterfaceStyle.light, .dark] {
            try await render(
                LoginView(), name: "login-\(style.rawValue)", style: style,
                size: CGSize(width: 390, height: 844))
            try await render(
                NavigationStack {
                    OverviewView(
                        payload: payload, onPayload: { _ in }, onEdit: { _ in }, onAdd: {})
                },
                name: "overview-\(style.rawValue)", style: style,
                size: CGSize(width: 390, height: 844))
            try await render(
                NavigationStack {
                    ExpenseBrowserView(
                        payload: payload, origin: URL(string: "https://example.invalid")!,
                        userID: nil, onEdit: { _ in }, onCopy: { _ in },
                        onHistory: { _ in }, onDelete: { _ in })
                },
                name: "expenses-\(style.rawValue)", style: style,
                size: CGSize(width: 390, height: 844))
        }
    }

    func testLargeTextAndTabletLayouts() async throws {
        let payload = try fixture()
        try await render(
            NavigationStack {
                OverviewView(payload: payload, onPayload: { _ in }, onEdit: { _ in }, onAdd: {})
            },
            name: "overview-large-text", style: .light,
            size: CGSize(width: 375, height: 812), textSize: .accessibility3)
        try await render(
            NavigationStack { AnalysisView(payload: payload) },
            name: "analysis-tablet", style: .dark,
            size: CGSize(width: 1024, height: 1366))
        try await render(
            NavigationStack { PeopleView(payload: payload, onPayload: { _ in }) },
            name: "people", style: .light, size: CGSize(width: 390, height: 844))
    }

    private func render<Content: View>(
        _ content: Content, name: String, style: UIUserInterfaceStyle, size: CGSize,
        textSize: DynamicTypeSize = .large
    ) async throws {
        let suite = "otter.visual-tests.\(UUID().uuidString)"
        let defaults = try XCTUnwrap(UserDefaults(suiteName: suite))
        defer { defaults.removePersistentDomain(forName: suite) }
        let preferences = AppPreferences(defaults: defaults, deviceLanguages: ["zh-TW"])
        let root =
            content
            .environment(preferences)
            .environment(AppSession())
            .environment(\.locale, preferences.locale)
            .environment(\.dynamicTypeSize, textSize)
            .foregroundStyle(preferences.palette.colors.text)
            .tint(preferences.palette.accessibleTint)
        let controller = UIHostingController(rootView: root)
        controller.overrideUserInterfaceStyle = style
        let scene = try XCTUnwrap(
            UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }.first)
        let previousWindow = scene.windows.first { $0.isKeyWindow }
        let window = UIWindow(windowScene: scene)
        window.frame = CGRect(origin: .zero, size: size)
        window.rootViewController = controller
        window.makeKeyAndVisible()
        defer {
            window.isHidden = true
            previousWindow?.makeKey()
        }
        controller.view.frame = window.bounds
        controller.view.setNeedsLayout()
        controller.view.layoutIfNeeded()
        try await Task.sleep(for: .milliseconds(300))
        let image = UIGraphicsImageRenderer(bounds: window.bounds).image { _ in
            window.drawHierarchy(in: window.bounds, afterScreenUpdates: true)
        }
        XCTAssertEqual(image.size, size)
        XCTAssertGreaterThan(try XCTUnwrap(image.pngData()).count, 10_000)
        let attachment = XCTAttachment(image: image)
        attachment.name = name
        attachment.lifetime = .keepAlways
        add(attachment)
    }

    private func fixture() throws -> TripPayload {
        let trip = Trip(
            id: "visual", name: "範例：京都旅行", baseCurrency: .jpy,
            participants: [
                Participant(id: "a", name: "小林"),
                Participant(id: "b", name: "佳穎"),
                Participant(id: "c", name: "Alex"),
            ],
            expenses: [
                Expense(
                    id: "dinner", description: "範例：鴨川旁的晚餐", amountMinor: 8400,
                    currency: .jpy, paidById: "a", participantIds: ["a", "b", "c"],
                    expenseDate: "2026-10-24", version: 1, category: "餐飲"),
                Expense(
                    id: "train", description: "範例：京都車站交通", amountMinor: 3600,
                    currency: .jpy, paidById: "b", participantIds: ["a", "b", "c"],
                    expenseDate: "2026-10-23", version: 1, category: "交通"),
            ], settlementPayments: [])
        return TripPayload(
            trip: trip, balances: try Finance.balances(trip: trip),
            settlements: try Finance.settlements(trip: trip))
    }
}
