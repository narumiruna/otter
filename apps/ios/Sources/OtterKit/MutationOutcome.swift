import Foundation

public enum MutationOutcome {
    /// No non-idempotent write may be repeated until its unknown result is checked.
    public static func isUncertain(_ error: Error) -> Bool {
        if let response = error as? APIResponseError {
            return response.status >= 500 || (300...399).contains(response.status)
        }
        if let error = error as? APIError {
            switch error {
            case .invalidResponse: return true
            case .http(let status, _): return status >= 500 || (300...399).contains(status)
            case .invalidServer, .invalidToken, .invalidIdentifier, .invalidAmount,
                .missingVersion, .unauthorized, .sessionRequired, .invalidReceipt:
                return false
            }
        }
        return true
    }
}
