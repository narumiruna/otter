import Foundation
import Testing

@testable import OtterKit

struct MutationOutcomeTests {
    @Test(arguments: [400, 401, 403, 404, 409, 412, 428, 429])
    func explicitRejectionsAllowCorrection(_ status: Int) {
        #expect(
            !MutationOutcome.isUncertain(
                APIResponseError(status: status, code: nil, message: "Rejected", retryAfter: nil)))
    }
    @Test(arguments: [302, 500, 502, 503, 504])
    func serverFailuresCannotProveRollback(_ status: Int) {
        #expect(
            MutationOutcome.isUncertain(
                APIResponseError(status: status, code: nil, message: "Unknown", retryAfter: nil)))
    }
    @Test func lostOrMalformedResponseRequiresInspection() {
        #expect(MutationOutcome.isUncertain(URLError(.networkConnectionLost)))
        #expect(MutationOutcome.isUncertain(APIError.invalidResponse))
        #expect(MutationOutcome.isUncertain(CancellationError()))
        #expect(!MutationOutcome.isUncertain(APIError.invalidAmount(currency: .usd)))
        #expect(!MutationOutcome.isUncertain(APIError.unauthorized))
    }
}
