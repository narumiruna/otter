import XCTest

@testable import Otter
@testable import OtterKit

@MainActor
final class ReceiptRequestStateTests: XCTestCase {
    func testCancelSelectionClearsEditorLoadingAndInvalidatesOldRequest() {
        let state = ReceiptRequestState()
        let oldRequest = state.begin()
        XCTAssertTrue(state.loading)
        state.invalidate()
        XCTAssertFalse(state.loading)
        XCTAssertNotEqual(state.id, oldRequest)
        state.finish(oldRequest)
        XCTAssertFalse(state.loading)
    }

    func testCancelRequestClearsTheExpenseEditorLoadingGuard() {
        let editor = ExpenseEditorState(
            payload: TripPayload(trip: Trip(id: "t", name: "Trip", baseCurrency: .twd)),
            mode: .new)
        _ = editor.receiptRequest.begin()
        XCTAssertTrue(editor.receiptLoading)
        editor.receiptRequest.invalidate()
        XCTAssertFalse(editor.receiptLoading)
    }

    func testOldCompletionCannotClearNewPhotoLoading() {
        let state = ReceiptRequestState()
        let oldRequest = state.begin()
        state.invalidate()
        let newRequest = state.begin()
        state.finish(oldRequest)
        XCTAssertTrue(state.loading)
        XCTAssertEqual(state.id, newRequest)
        state.finish(newRequest)
        XCTAssertFalse(state.loading)
    }

    func testRepeatedInvalidationLeavesNoActivePhotoRequest() {
        let state = ReceiptRequestState()
        let request = state.begin()
        state.invalidate()
        state.invalidate()
        state.finish(request)
        XCTAssertFalse(state.loading)
        XCTAssertNotEqual(state.id, request)
    }
}
