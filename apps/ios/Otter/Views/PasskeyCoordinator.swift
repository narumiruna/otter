import AuthenticationServices
import OtterKit
import UIKit

/// Uses the system credential provider. The API remains the only WebAuthn verifier.
@MainActor
final class PasskeyCoordinator: NSObject, ASAuthorizationControllerDelegate,
    ASAuthorizationControllerPresentationContextProviding
{
    private var continuation: CheckedContinuation<JSONValue, Error>?
    private var controller: ASAuthorizationController?
    private var anchor: UIWindow?
    private var requestID: UUID?

    func perform(_ ceremony: PasskeyCeremony, server: URL, registration: Bool) async throws
        -> JSONValue
    {
        guard continuation == nil else { throw PasskeyError.busy }
        let options = ceremony.options
        guard let challengeText = options["challenge"]?.string,
            let challenge = Data(base64URL: challengeText), !challenge.isEmpty,
            let rp = registration ? options["rp"]?["id"]?.string : options["rpId"]?.string,
            !rp.isEmpty, server.scheme == "https", let host = server.host?.lowercased(),
            host == rp.lowercased() || host.hasSuffix("." + rp.lowercased())
        else { throw PasskeyError.configuration }
        let provider = ASAuthorizationPlatformPublicKeyCredentialProvider(
            relyingPartyIdentifier: rp)
        let request: ASAuthorizationRequest
        if registration {
            guard let userIDText = options["user"]?["id"]?.string,
                let userID = Data(base64URL: userIDText), !userID.isEmpty,
                let name = options["user"]?["name"]?.string, !name.isEmpty
            else { throw PasskeyError.configuration }
            let registrationRequest = provider.createCredentialRegistrationRequest(
                challenge: challenge, name: name, userID: userID)
            registrationRequest.userVerificationPreference = .required
            let excluded = try descriptors(options["excludeCredentials"])
            // The public exclusion API starts at iOS 17.4. Earlier versions must not
            // silently omit the server's exclusion check, even if it rejects duplicate IDs.
            if #available(iOS 17.4, *) {
                registrationRequest.excludedCredentials = excluded
            } else if !excluded.isEmpty {
                throw PasskeyError.requiresUpdate
            }
            request = registrationRequest
        } else {
            let assertion = provider.createCredentialAssertionRequest(challenge: challenge)
            assertion.userVerificationPreference = .required
            assertion.allowedCredentials = try descriptors(options["allowCredentials"])
            request = assertion
        }
        guard
            let window = UIApplication.shared.connectedScenes
                .compactMap({ $0 as? UIWindowScene })
                .filter({ $0.activationState == .foregroundActive })
                .flatMap(\.windows).first(where: \.isKeyWindow)
        else { throw PasskeyError.noWindow }
        try Task.checkCancellation()
        let requestID = UUID()
        return try await withTaskCancellationHandler {
            try await withCheckedThrowingContinuation { continuation in
                guard !Task.isCancelled else {
                    continuation.resume(throwing: CancellationError())
                    return
                }
                self.continuation = continuation
                self.requestID = requestID
                anchor = window
                let controller = ASAuthorizationController(authorizationRequests: [request])
                self.controller = controller
                controller.delegate = self
                controller.presentationContextProvider = self
                controller.performRequests()
            }
        } onCancel: {
            Task { @MainActor in
                guard self.requestID == requestID else { return }
                self.cancel()
            }
        }
    }

    func cancel() {
        controller?.cancel()
        finish(.failure(CancellationError()))
    }

    func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
        // Retained before performRequests; never construct a detached fallback window.
        precondition(anchor != nil)
        return anchor!
    }

    func authorizationController(
        controller: ASAuthorizationController,
        didCompleteWithAuthorization authorization: ASAuthorization
    ) {
        guard self.controller === controller else { return }
        var value: [String: JSONValue] = [
            "type": .string("public-key"),
            "authenticatorAttachment": .string("platform"),
            "clientExtensionResults": .object([:]),
        ]
        if let credential = authorization.credential
            as? ASAuthorizationPlatformPublicKeyCredentialRegistration
        {
            guard let attestation = credential.rawAttestationObject else {
                finish(.failure(PasskeyError.invalidCredential))
                return
            }
            value["id"] = .string(credential.credentialID.base64URL)
            value["rawId"] = value["id"]
            value["response"] = .object([
                "clientDataJSON": .string(credential.rawClientDataJSON.base64URL),
                "attestationObject": .string(attestation.base64URL),
                "transports": .array([.string("internal")]),
            ])
        } else if let credential = authorization.credential
            as? ASAuthorizationPlatformPublicKeyCredentialAssertion
        {
            value["id"] = .string(credential.credentialID.base64URL)
            value["rawId"] = value["id"]
            value["response"] = .object([
                "clientDataJSON": .string(credential.rawClientDataJSON.base64URL),
                "authenticatorData": .string(credential.rawAuthenticatorData.base64URL),
                "signature": .string(credential.signature.base64URL),
                "userHandle": credential.userID.isEmpty
                    ? .null : .string(credential.userID.base64URL),
            ])
        } else {
            finish(.failure(PasskeyError.invalidCredential))
            return
        }
        finish(.success(.object(value)))
    }

    func authorizationController(
        controller: ASAuthorizationController, didCompleteWithError error: Error
    ) {
        guard self.controller === controller else { return }
        if (error as? ASAuthorizationError)?.code == .canceled {
            finish(.failure(CancellationError()))
        } else {
            finish(.failure(PasskeyError.authorization))
        }
    }

    private func descriptors(_ value: JSONValue?) throws
        -> [ASAuthorizationPlatformPublicKeyCredentialDescriptor]
    {
        guard let value else { return [] }
        guard let list = value.array else { throw PasskeyError.configuration }
        return try list.map {
            guard $0["type"]?.string == "public-key", let text = $0["id"]?.string,
                let data = Data(base64URL: text), !data.isEmpty
            else { throw PasskeyError.configuration }
            return ASAuthorizationPlatformPublicKeyCredentialDescriptor(credentialID: data)
        }
    }

    private func finish(_ result: Result<JSONValue, Error>) {
        let pending = continuation
        continuation = nil
        controller?.delegate = nil
        controller?.presentationContextProvider = nil
        controller = nil
        anchor = nil
        requestID = nil
        pending?.resume(with: result)
    }
}

private enum PasskeyError: LocalizedError {
    case busy, configuration, noWindow, invalidCredential, authorization, requiresUpdate
    var errorDescription: String? {
        switch self {
        case .busy: NativeLocalization.string("Passkey 驗證正在進行。")
        case .configuration: NativeLocalization.string("Passkey 設定無效。請確認伺服器 HTTPS 網址與 RP 設定。")
        case .noWindow: NativeLocalization.string("請回到 App 後再試。")
        case .invalidCredential: NativeLocalization.string("系統未提供有效的 Passkey 回應。")
        case .authorization:
            NativeLocalization.string("無法使用 Passkey。請確認 Associated Domains 與伺服器設定，或使用其他登入方式。")
        case .requiresUpdate: NativeLocalization.string("此 Passkey 註冊需要 iOS 17.4 或以上版本。")
        }
    }
}
