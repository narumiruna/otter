import Foundation

/// The signed-in invite response contains no trip data before the user joins.
public struct SharePreview: Codable, Sendable {
    public let mode: ShareMode
    public let tripName: String

    public init(tripName: String) {
        mode = .signedInEdit
        self.tripName = tripName
    }

    private enum CodingKeys: String, CodingKey { case mode, tripName }
    public init(from decoder: Decoder) throws {
        let values = try decoder.container(keyedBy: CodingKeys.self)
        mode = try values.decode(ShareMode.self, forKey: .mode)
        guard mode == .signedInEdit else { throw IncomingLinkError.invalidShare }
        tripName = try values.decode(String.self, forKey: .tripName)
    }
}

/// `mode` identifies previews; `shareMode` identifies public trip payloads.
public enum ShareOpenResult: Codable, Sendable {
    case preview(SharePreview)
    case readonly(TripPayload)
    case anyoneEdit(TripPayload)

    private enum CodingKeys: String, CodingKey { case mode, shareMode, trip }

    public init(from decoder: Decoder) throws {
        let values = try decoder.container(keyedBy: CodingKeys.self)
        if values.contains(.mode) {
            guard !values.contains(.shareMode), !values.contains(.trip) else {
                throw IncomingLinkError.invalidShare
            }
            self = .preview(try SharePreview(from: decoder))
            return
        }
        let mode = try values.decode(ShareMode.self, forKey: .shareMode)
        let payload = try TripPayload(from: decoder)
        _ = try OtterClient.identifier(payload.trip.id)
        switch mode {
        case .readonly:
            guard payload.readonly == true else { throw IncomingLinkError.invalidShare }
            self = .readonly(payload)
        case .anyoneEdit:
            guard payload.readonly != true else { throw IncomingLinkError.invalidShare }
            self = .anyoneEdit(payload)
        case .signedInEdit: throw IncomingLinkError.invalidShare
        }
    }

    public func encode(to encoder: Encoder) throws {
        switch self {
        case .preview(let preview): try preview.encode(to: encoder)
        case .readonly(let payload), .anyoneEdit(let payload): try payload.encode(to: encoder)
        }
    }
}

/// Public reads use a separate anonymous client, never the current account client.
/// The UI must confirm an unknown origin before it calls these methods.
public struct ShareClient: Sendable {
    public let origin: URL
    private let anonymous: OtterClient

    public init(origin: URL, transport: any HTTPTransport = URLSessionTransport()) throws {
        self.origin = try IncomingLink.canonicalOrigin(origin)
        anonymous = try OtterClient(
            server: self.origin.absoluteString, auth: .anonymous,
            transport: ShareTransport(underlying: transport))
    }

    public func open(token: String) async throws -> ShareOpenResult {
        try IncomingLink.validateShareToken(token)
        do { return try await anonymous.api("GET", path: "api/share/\(token)") } catch {
            if error is CancellationError || (error as? URLError)?.code == .cancelled {
                throw CancellationError()
            }
            // A server error can contain the URL capability. Never expose its text.
            throw IncomingLinkError.invalidShare
        }
    }

    public func readonlyPayload(token: String) async throws -> TripPayload {
        guard case .readonly(let payload) = try await open(token: token) else {
            throw IncomingLinkError.invalidShare
        }
        return payload
    }

    public func guestClient(token: String, payload: TripPayload) throws -> OtterClient {
        try IncomingLink.validateShareToken(token)
        guard payload.shareMode == .anyoneEdit, payload.readonly != true else {
            throw IncomingLinkError.invalidShare
        }
        return try OtterClient(
            server: origin.absoluteString,
            auth: .share(tripID: payload.trip.id, token: token),
            transport: ShareTransport(underlying: anonymous.transport, guestTripID: payload.trip.id)
        )
    }

    public var readonlyClient: OtterClient { anonymous }

    /// The account cookie is sent only after a same-origin session check.
    public func join(token: String, session: OtterClient) async throws -> TripPayload {
        try IncomingLink.validateShareToken(token)
        guard IncomingLink.sameOrigin(origin, session.baseURL) else {
            throw IncomingLinkError.differentOrigin
        }
        try session.requireSession()
        struct JoinedTrip: Decodable, Sendable { let tripId: String }
        do {
            let joined: JoinedTrip = try await session.api(
                "POST", path: "api/share/\(token)/join", body: Data("{}".utf8))
            _ = try OtterClient.identifier(joined.tripId)
            return try await session.trip(id: joined.tripId)
        } catch {
            if error is CancellationError || (error as? URLError)?.code == .cancelled {
                throw CancellationError()
            }
            if case APIError.unauthorized = error { throw APIError.unauthorized }
            throw IncomingLinkError.invalidShare
        }
    }
}

/// Do not let network or server error text expose a share capability in the UI.
private struct ShareTransport: HTTPTransport {
    let underlying: any HTTPTransport
    var guestTripID: String? = nil

    func data(for request: URLRequest) async throws -> (Data, HTTPURLResponse) {
        do {
            let (data, response) = try await underlying.data(for: request)
            guard (200...299).contains(response.statusCode) else {
                struct Failure: Encodable { let error: String }
                let failure = Failure(error: NativeLocalization.string("分享工作區要求失敗。請重新開啟分享連結。"))
                return (try JSONEncoder().encode(failure), response)
            }
            if let guestTripID,
                let payload = try? JSONDecoder().decode(TripPayload.self, from: data)
            {
                guard payload.trip.id == guestTripID else { throw IncomingLinkError.invalidShare }
                // Trip endpoints omit shareMode. Keep the capability context on reads and mutations.
                let guestPayload = TripPayload(
                    trip: payload.trip, balances: payload.balances,
                    settlements: payload.settlements, exchangeRateInfo: payload.exchangeRateInfo,
                    currentUserRole: payload.currentUserRole, readonly: payload.readonly,
                    shareMode: .anyoneEdit, createdExpenseId: payload.createdExpenseId)
                return (try JSONEncoder().encode(guestPayload), response)
            }
            return (data, response)
        } catch {
            if error is CancellationError || (error as? URLError)?.code == .cancelled {
                throw CancellationError()
            }
            throw IncomingLinkError.invalidShare
        }
    }
}
