import Foundation
import OtterKit

@main
struct OtterIntegration {
    @MainActor
    static func main() async {
        do {
            try require(
                CommandLine.arguments.count == 3,
                "Usage: OtterIntegration http://localhost:PORT DIFFERENTIAL_JSON")
            let fixture = try JSONDecoder().decode(
                DifferentialFixture.self,
                from: Data(contentsOf: URL(fileURLWithPath: CommandLine.arguments[2])))
            try runDifferential(fixture)
            let suite = try LiveIntegration(server: CommandLine.arguments[1])
            try await suite.run(csv: fixture.csv)
            print("PASS real Swift/PostgreSQL integration and cross-language differential harness")
        } catch let error as IntegrationFailure {
            fputs("FAIL \(error.description)\n", stderr)
            exit(1)
        } catch let error as APIResponseError {
            // Response bodies and credentials must not enter test output.
            fputs("FAIL unexpected HTTP status \(error.status)\n", stderr)
            exit(1)
        } catch {
            fputs("FAIL unexpected integration error (\(type(of: error)))\n", stderr)
            exit(1)
        }
    }
}
