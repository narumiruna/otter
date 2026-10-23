import assert from "node:assert/strict";
import {
  type ExecFileOptionsWithStringEncoding,
  execFile,
} from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  type SimulatorDevices,
  selectSimulator,
} from "./ios-integration-simulator.js";

export const workflowCaseCount = 6;
const caseAllowanceSeconds = 280;
const privateValues = new Set<string>();

export function uiSuiteBudgetMs(caseCount: number): number {
  // XCTest rounds case limits up to whole minutes. Cold startup took 346s in CI.
  const roundedCaseAllowance = Math.ceil(caseAllowanceSeconds / 60) * 60;
  return (caseCount * roundedCaseAllowance + 360) * 1_000;
}

// Child tools do not need API configuration or database credentials. In particular,
// xcodebuild must not copy those values into its test-runner environment or logs.
export function toolEnvironment(): NodeJS.ProcessEnv {
  const result: NodeJS.ProcessEnv = {};
  for (const key of [
    "PATH",
    "HOME",
    "USER",
    "LOGNAME",
    "TMPDIR",
    "LANG",
    "LC_ALL",
    "DEVELOPER_DIR",
    "SDKROOT",
  ]) {
    if (process.env[key]) result[key] = process.env[key];
  }
  return result;
}

export function redact(text: string): string {
  let output = text;
  for (const value of privateValues) {
    output = output.replaceAll(value, "[REDACTED]");
  }
  const database = process.env.DATABASE_URL;
  if (database) {
    output = output.replaceAll(database, "[DATABASE_URL]");
    try {
      const password = decodeURIComponent(new URL(database).password);
      if (password) output = output.replaceAll(password, "[REDACTED]");
    } catch {
      /* Invalid connection strings are never logged. */
    }
  }
  return output
    .replace(/otter_api_[A-Za-z0-9_-]+/g, "[TOKEN]")
    .replace(/otter_session=[^;\s]+/g, "otter_session=[REDACTED]")
    .replace(
      /(Type ')[^\n]*?(' into [^\n]*SecureTextField)/g,
      "$1[REDACTED]$2",
    );
}

export async function runTool(
  command: string,
  args: string[],
  signal: AbortSignal | undefined,
  timeout = 240_000,
  env = toolEnvironment(),
  verbose = false,
  outputPath?: string,
): Promise<string> {
  return await new Promise<string>((resolve, reject) => {
    const options: ExecFileOptionsWithStringEncoding = {
      env,
      signal,
      timeout,
      killSignal: "SIGKILL",
      encoding: "utf8",
      maxBuffer: 32 * 1024 * 1024,
    };
    const child = execFile(
      command,
      args,
      options,
      async (error, stdout, stderr) => {
        const output = redact(`${stdout}\n${stderr}`);
        if (outputPath) {
          try {
            await writeFile(outputPath, output, { mode: 0o600 });
          } catch (writeError) {
            reject(writeError);
            return;
          }
        }
        if (verbose || error) {
          const lines = output.split("\n");
          if (lines.length > 220)
            console.log(
              lines
                .filter(
                  (line) =>
                    line.startsWith("PASS live UI") || line.includes("error:"),
                )
                .join("\n"),
            );
          console.log(lines.slice(-220).join("\n"));
        }
        if (error) {
          reject(
            new Error(
              `${command} failed (${error.code ?? "terminated"}). See redacted output above.`,
            ),
          );
        } else resolve(stdout);
      },
    );
    // Show safe test milestones while the API continues to serve Simulator requests.
    // All other output is redacted after capture, not copied from arbitrary chunks.
    if (verbose) {
      let pending = "";
      child.stdout?.on("data", (chunk: Buffer | string) => {
        const lines = (pending + chunk.toString()).split("\n");
        pending = lines.pop() ?? "";
        for (const line of lines) {
          if (line.startsWith("PASS live UI")) console.log(redact(line));
        }
      });
    }
  });
}

// Register once in the owning Node process, not once per XCTest runner process.
// Only synthetic credentials are returned; the registration cookie is not forwarded.
export async function registerUIFixture(origin: string, signal: AbortSignal) {
  assert.ok(
    /^http:\/\/localhost:[1-9]\d{0,4}$/.test(origin),
    "UI fixture registration requires the owned localhost HTTP origin.",
  );
  const url = new URL(origin);
  assert.ok(
    url.origin === origin && Number(url.port) <= 65535,
    "UI fixture registration requires the owned localhost HTTP origin.",
  );
  const credentials = {
    username: `ios-ui-fixture-${randomUUID().slice(0, 12)}`,
    password: `${randomUUID()}-aA1`,
  };
  // Add the literal before any xcodebuild output can include a .setenv line.
  privateValues.add(credentials.password);
  let response: Response;
  try {
    response = await fetch(`${origin}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: origin },
      body: JSON.stringify(credentials),
      redirect: "error",
      signal: AbortSignal.any([signal, AbortSignal.timeout(20_000)]),
    });
  } catch {
    throw new Error("UI fixture registration request failed.");
  }
  assert.equal(
    response.status,
    201,
    "UI fixture registration must return 201.",
  );
  let account: unknown;
  try {
    account = await response.json();
  } catch {
    // JSON parse errors can include response data. Do not retain or log them.
    throw new Error("UI fixture registration returned invalid JSON.");
  }
  assert.ok(
    typeof account === "object" && account !== null && "user" in account,
    "UI fixture registration must return a user.",
  );
  const user = account.user;
  assert.ok(
    typeof user === "object" &&
      user !== null &&
      "username" in user &&
      user.username === credentials.username &&
      "id" in user &&
      typeof user.id === "string" &&
      user.id.startsWith("user_") &&
      "name" in user &&
      user.name === credentials.username,
    "UI fixture registration must return the created public user.",
  );
  return credentials;
}

export async function runUI(
  origin: string,
  directory: string,
  signal: AbortSignal,
  deviceFamily: "iPhone" | "iPad" = "iPhone",
  diagnostic?: "group" | "expense",
) {
  const expectedCaseCount = diagnostic ? 1 : workflowCaseCount;
  // Diagnostics cannot increase a scenario allowance or replace the full acceptance run.
  const suiteBudgetMs = uiSuiteBudgetMs(expectedCaseCount);
  const credentials = await registerUIFixture(origin, signal);
  const listing: { devices: SimulatorDevices } = JSON.parse(
    await runTool(
      "xcrun",
      ["simctl", "list", "devices", "available", "--json"],
      signal,
    ),
  );
  const sdkVersion = (
    await runTool(
      "xcrun",
      ["--sdk", "iphonesimulator", "--show-sdk-version"],
      signal,
      30_000,
    )
  ).trim();
  const candidate = selectSimulator(listing.devices, deviceFamily, sdkVersion);
  await runTool(
    "xcodebuild",
    ["-version"],
    signal,
    30_000,
    toolEnvironment(),
    true,
  );
  const id = (
    await runTool(
      "xcrun",
      [
        "simctl",
        "create",
        `Otter Live ${randomUUID()}`,
        candidate.deviceTypeIdentifier,
        candidate.runtime,
      ],
      signal,
      30_000,
    )
  ).trim();
  assert.match(
    id,
    /^[A-F0-9-]{36}$/i,
    "simctl must return an owned Simulator UUID.",
  );
  let diagnostics: string | undefined;
  let passed = false;
  try {
    diagnostics = await mkdtemp(
      path.join(process.env.RUNNER_TEMP ?? tmpdir(), "otter-ios-ui-results-"),
    );
    console.log(
      `Running ${expectedCaseCount} ${diagnostic ? `diagnostic ${diagnostic}` : "full workflow"} live XCUITests on a dedicated ${candidate.name} (${candidate.runtime}); each case is limited to ${caseAllowanceSeconds}s, runner budget ${suiteBudgetMs / 1_000}s.`,
    );
    await runTool("xcrun", ["simctl", "boot", id], signal, 30_000);
    // A new iOS runtime can spend more than two minutes on first-boot data migration.
    await runTool("xcrun", ["simctl", "bootstatus", id, "-b"], signal, 240_000);
    await runTool(
      "xcodegen",
      ["generate", "--spec", "apps/ios/project.yml", "--project", "apps/ios"],
      signal,
      30_000,
    );
    const buildArguments = [
      "-project",
      "apps/ios/Otter.xcodeproj",
      "-scheme",
      "OtterLive",
      "-destination",
      `platform=iOS Simulator,id=${id}`,
      "-destination-timeout",
      "30",
      "-derivedDataPath",
      path.join(directory, "DerivedData"),
      "-parallel-testing-enabled",
      "NO",
      "-maximum-concurrent-test-simulator-destinations",
      "1",
      "-test-timeouts-enabled",
      "YES",
      "-default-test-execution-time-allowance",
      String(caseAllowanceSeconds),
      "-maximum-test-execution-time-allowance",
      String(caseAllowanceSeconds),
      "CODE_SIGNING_ALLOWED=YES",
      "CODE_SIGN_IDENTITY=-",
      `OTTER_IOS_TEST_ORIGIN=${origin}`,
      ...(diagnostic
        ? [
            `-only-testing:OtterLiveUITests/${diagnostic === "group" ? "GroupLifecycleLiveUITests" : "WorkspaceLiveUITests/testExpenseEditAndRevisionHistory"}`,
          ]
        : []),
    ];
    const environment = {
      ...toolEnvironment(),
      TEST_RUNNER_OTTER_IOS_TEST_ORIGIN: origin,
    };
    await runTool(
      "xcodebuild",
      [...buildArguments, "build-for-testing"],
      signal,
      240_000,
      environment,
    );
    console.log(
      "PASS live UI build-for-testing; installed binary sources are fixed.",
    );
    await runTool(
      "xcodebuild",
      [
        ...buildArguments,
        "-resultBundlePath",
        path.join(diagnostics, "Live.xcresult"),
        "test-without-building",
      ],
      signal,
      suiteBudgetMs,
      {
        ...environment,
        // Xcode forwards these only to XCTest, with TEST_RUNNER_ removed.
        TEST_RUNNER_OTTER_IOS_FIXTURE_USERNAME: credentials.username,
        TEST_RUNNER_OTTER_IOS_FIXTURE_PASSWORD: credentials.password,
      },
      true,
      path.join(diagnostics, "xcodebuild.log"),
    );
    const summary: {
      result: string;
      passedTests: number;
      failedTests: number;
      skippedTests: number;
      totalTestCount: number;
    } = JSON.parse(
      await runTool(
        "xcrun",
        [
          "xcresulttool",
          "get",
          "test-results",
          "summary",
          "--path",
          path.join(diagnostics, "Live.xcresult"),
        ],
        signal,
        30_000,
      ),
    );
    assert.equal(summary.result, "Passed");
    assert.equal(summary.passedTests, expectedCaseCount);
    assert.equal(summary.failedTests, 0);
    assert.equal(summary.skippedTests, 0);
    assert.equal(summary.totalTestCount, expectedCaseCount);
    console.log(
      `PASS ${diagnostic ? `focused ${diagnostic} diagnostic (not full acceptance)` : "live UI"} xcresult: ${summary.passedTests} passed, 0 failed, 0 skipped.`,
    );
    passed = true;
  } finally {
    if (diagnostics && !passed)
      console.error(`Failure screenshots and hierarchy: ${diagnostics}`);
    // Never erase another Simulator or clear the user's Keychain.
    try {
      await runTool("xcrun", ["simctl", "shutdown", id], undefined, 30_000);
    } finally {
      try {
        await runTool("xcrun", ["simctl", "delete", id], undefined, 30_000);
      } finally {
        if (diagnostics && passed)
          await rm(diagnostics, { recursive: true, force: true });
      }
    }
  }
}
