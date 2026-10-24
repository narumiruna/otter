import Foundation
import Testing

@testable import OtterKit

private actor StubTransport: HTTPTransport {
    private(set) var requests: [URLRequest] = []
    let status: Int
    let body: Data

    init(status: Int = 200, body: String) {
        self.status = status
        self.body = Data(body.utf8)
    }

    func data(for request: URLRequest) async throws -> (Data, HTTPURLResponse) {
        requests.append(request)
        let response = HTTPURLResponse(
            url: request.url!, statusCode: status, httpVersion: "HTTP/1.1", headerFields: nil)!
        return (body, response)
    }
}

private let tripJSON = #"""
    {
      "trip": {
        "id": "trip_1", "name": "京都", "ownerId": "user_1", "baseCurrency": "JPY",
        "allowApiWrites": true, "archivedAt": null,
        "visaSettlementEnabled": true, "visaSettlementCurrency": "TWD",
        "participants": [{"id":"p_1","name":"Alice"},{"id":"p_2","name":"Bob"}],
        "expenses": [{"id":"e_1","description":"Lunch","amountMinor":2500,"currency":"JPY","paidById":"p_1","participantIds":["p_1","p_2"],"expenseDate":"2026-10-19","version":3}],
        "settlementPayments": [{"id":"s_1","fromId":"p_2","toId":"p_1","amountMinor":100,"currency":"TWD","paidAt":"2026-10-19","note":"Cash"}]
      },
      "balances": [{"participantId":"p_1","name":"Alice","amountMinor":175,"currency":"TWD"},{"participantId":"p_2","name":"Bob","amountMinor":-175,"currency":"TWD"}],
      "settlements": [{"fromId":"p_2","fromName":"Bob","toId":"p_1","toName":"Alice","amountMinor":175,"currency":"TWD"}],
      "currentUserRole": "owner"
    }
    """#

private func client(_ transport: any HTTPTransport) throws -> OtterClient {
    try OtterClient(server: "https://otter.example/", token: "otter_api_test", transport: transport)
}

struct OtterClientTests {
    @Test func listsActiveAndArchivedGroupsWithBearerAuth() async throws {
        let transport = StubTransport(
            body:
                #"{"trips":[{"id":"t_1","name":"Trip","baseCurrency":"USD","participantCount":2,"expenseCount":1}],"archivedTrips":[{"id":"t_2","name":"Old","baseCurrency":"TWD","archivedAt":"2026-10-19T00:00:00Z","participantCount":1,"expenseCount":0}]}"#
        )
        let response = try await client(transport).trips()
        #expect(response.trips.first?.baseCurrency == .usd)
        #expect(response.archivedTrips.count == 1)
        let request = try #require(await transport.requests.first)
        #expect(request.url?.absoluteString == "https://otter.example/api/trips")
        #expect(request.httpMethod == "GET")
        #expect(request.value(forHTTPHeaderField: "Authorization") == "Bearer otter_api_test")
        #expect(request.value(forHTTPHeaderField: "Accept") == "application/json")
        #expect(request.value(forHTTPHeaderField: "Cookie") == nil)
    }

    @Test func decodesServerBalancesAndVisaCurrencyWithoutRecalculation() async throws {
        let payload = try await client(StubTransport(body: tripJSON)).trip(id: "trip_1")
        #expect(payload.trip.canWrite)
        #expect(payload.trip.settlementCurrency == .twd)
        #expect(payload.balances[1].amountMinor == -175)
        #expect(payload.settlements[0].currency == .twd)
        #expect(payload.trip.expenses[0].amountMinor == 2500)
        #expect(payload.trip.settlementPayments?.first?.paidAt == "2026-10-19")
    }

    @Test func archivedAndDefaultPermissionsAreReadOnly() throws {
        let archived = tripJSON.replacingOccurrences(
            of: #""archivedAt": null"#, with: #""archivedAt": "2026-10-19T00:00:00Z""#)
        #expect(
            try !JSONDecoder().decode(TripPayload.self, from: Data(archived.utf8)).trip.canWrite)
        let legacy = tripJSON.replacingOccurrences(of: #""allowApiWrites": true,"#, with: "")
        #expect(try !JSONDecoder().decode(TripPayload.self, from: Data(legacy.utf8)).trip.canWrite)
    }

    @Test func deletionUsesCurrentQuotedVersion() async throws {
        let transport = StubTransport(body: tripJSON)
        let api = try client(transport)
        let payload = try await api.trip(id: "trip_1")
        _ = try await api.deleteExpense(tripID: "trip_1", expense: payload.trip.expenses[0])
        let request = try #require(await transport.requests.last)
        #expect(request.httpMethod == "DELETE")
        #expect(request.url?.path == "/api/trips/trip_1/expenses/e_1")
        #expect(request.value(forHTTPHeaderField: "If-Match") == "\"3\"")
    }

    @Test func missingVersionNeverSendsDelete() async throws {
        let json = tripJSON.replacingOccurrences(of: ",\"version\":3", with: "")
        let payload = try JSONDecoder().decode(TripPayload.self, from: Data(json.utf8))
        let transport = StubTransport(body: tripJSON)
        do {
            _ = try await client(transport).deleteExpense(
                tripID: "trip_1", expense: payload.trip.expenses[0])
            Issue.record("Expected missing version")
        } catch APIError.missingVersion {}
        #expect(await transport.requests.isEmpty)
    }

    @Test func expenseAmountIsSentAsDecimalStringAndSplitIDs() async throws {
        let transport = StubTransport(status: 201, body: tripJSON)
        let input = NewExpense(
            description: "Lunch", amount: "12.50", currency: .usd, paidById: "p_1",
            participantIds: ["p_1", "p_2"], expenseDate: "2026-10-19")
        _ = try await client(transport).addExpense(tripID: "trip_1", input: input)
        let request = try #require(await transport.requests.first)
        let data = try #require(request.httpBody)
        let body = try #require(JSONSerialization.jsonObject(with: data) as? [String: Any])
        #expect(body["amount"] as? String == "12.50")
        #expect(body["currency"] as? String == "USD")
        #expect(body["participantIds"] as? [String] == ["p_1", "p_2"])
        #expect(body["expenseDate"] as? String == "2026-10-19")
        #expect(request.value(forHTTPHeaderField: "Content-Type") == "application/json")
    }

    @Test func settlementUsesServerCurrencyAndMajorUnits() async throws {
        let payload = try JSONDecoder().decode(TripPayload.self, from: Data(tripJSON.utf8))
        let transport = StubTransport(status: 201, body: tripJSON)
        _ = try await client(transport).recordSettlement(
            tripID: "trip_1", settlement: payload.settlements[0])
        let request = try #require(await transport.requests.first)
        let data = try #require(request.httpBody)
        let body = try #require(JSONSerialization.jsonObject(with: data) as? [String: String])
        #expect(body["amount"] == "175")
        #expect(body["currency"] == "TWD")
        #expect(body["fromId"] == "p_2")
        #expect(request.url?.path == "/api/trips/trip_1/settlement-payments")
    }

    @Test func createsGroupAndParticipantWithCorrectBodies() async throws {
        let transport = StubTransport(status: 201, body: tripJSON)
        let api = try client(transport)
        _ = try await api.createTrip(name: "京都", currency: .jpy)
        _ = try await api.addParticipant(tripID: "trip_1", name: "Bob")
        let requests = await transport.requests
        let firstData = try #require(requests[0].httpBody)
        let first = try #require(JSONSerialization.jsonObject(with: firstData) as? [String: String])
        #expect(first == ["name": "京都", "baseCurrency": "JPY"])
        let secondData = try #require(requests[1].httpBody)
        let second = try #require(
            JSONSerialization.jsonObject(with: secondData) as? [String: String])
        #expect(second == ["name": "Bob"])
        #expect(requests[1].url?.path == "/api/trips/trip_1/participants")
    }

    @Test func validatesUserForSignIn() async throws {
        let transport = StubTransport(
            body: #"{"user":{"id":"u_1","name":"Alice","username":"alice"}}"#)
        #expect(try await client(transport).user().name == "Alice")
        #expect(await transport.requests.first?.url?.path == "/api/me")
    }

    @Test func nullUserRequiresSignIn() async throws {
        do {
            _ = try await client(StubTransport(body: #"{"user":null}"#)).user()
            Issue.record("Expected unauthorized")
        } catch APIError.unauthorized {}
    }

    @Test(arguments: [401, 403, 404, 409, 412, 500, 302])
    func mapsHTTPFailuresWithoutRetry(_ status: Int) async throws {
        let transport = StubTransport(status: status, body: #"{"error":"Server message"}"#)
        do {
            _ = try await client(transport).trips()
            Issue.record("Expected HTTP error")
        } catch APIError.unauthorized {
            #expect(status == 401)
        } catch let error as APIResponseError {
            #expect(error.status == status)
            #expect(error.message == "Server message")
        }
        #expect(await transport.requests.count == 1)
    }

    @Test func malformedResponseIsReported() async throws {
        do {
            _ = try await client(StubTransport(body: "<html>Not an API</html>")).trips()
            Issue.record("Expected invalid response")
        } catch APIError.invalidResponse {}
    }

    @Test(arguments: [
        "http://example.com", "https://user:pass@example.com", "https://example.com/api",
        "https://example.com?x=1", "https://example.com/#token", "file:///tmp/test", "not a URL",
    ])
    func rejectsUnsafeOrigins(_ url: String) {
        #expect(throws: APIError.self) { try OtterClient(server: url, token: "otter_api_test") }
    }

    @Test func allowsLocalDevelopmentOnlyOnLocalhostHTTP() throws {
        #expect(
            try OtterClient(server: "http://localhost:17463", token: "otter_api_test").baseURL.host
                == "localhost")
    }

    @Test func rejectsHeaderInjectionAndPathTraversal() async throws {
        #expect(throws: APIError.self) {
            try OtterClient(server: "https://otter.example", token: "token\r\nInjected: true")
        }
        let transport = StubTransport(body: tripJSON)
        do {
            _ = try await client(transport).trip(id: "../me?x=1")
            Issue.record("Expected invalid identifier")
        } catch APIError.invalidIdentifier {}
        #expect(await transport.requests.isEmpty)
    }
}
