import { configFromEnvironment, requiredTokenFromEnvironment } from "./auth.js";
import { isRecord, requestJson } from "./http.js";
import {
  type CliCommand,
  type CliEnvironment,
  CliError,
  type FetchImplementation,
} from "./types.js";

export { executeDeviceLogin, executeDeviceLogout } from "./auth.js";
export {
  cliHelp,
  parseCliCommand,
  parseDeviceLoginArguments,
} from "./command.js";
export {
  executeSettlementPreview,
  parseSettlementPreviewArguments,
  settlementPreview,
} from "./preview.js";
export {
  type CliCommand,
  type CliEnvironment,
  CliError,
  type DeviceAuthorization,
  type DeviceLoginOptions,
  type FetchImplementation,
} from "./types.js";

export async function executeCliCommand(
  command: CliCommand,
  environment: CliEnvironment,
  fetchImplementation: FetchImplementation = fetch,
): Promise<unknown> {
  const config = configFromEnvironment(environment);
  const token = await requiredTokenFromEnvironment(config, environment);
  const data = await requestJson(
    config,
    fetchImplementation,
    command.path,
    command.method,
    { Authorization: `Bearer ${token}` },
    command.body,
  );
  if (
    command.authenticatedUserRequired &&
    (!isRecord(data) || !isRecord(data.user))
  ) {
    throw new CliError(
      "AUTH_ERROR",
      "Otter authorization is missing or expired",
    );
  }
  return selectOutput(data, command.select);
}

function selectOutput(data: unknown, select: CliCommand["select"]): unknown {
  if (!select) {
    return data;
  }
  if (!isRecord(data) || !isRecord(data.trip)) {
    throw new CliError(
      "RESPONSE_ERROR",
      "Otter returned an unexpected payload",
    );
  }
  switch (select) {
    case "participants":
      return { participants: data.trip.participants };
    case "expenses":
      return { expenses: data.trip.expenses };
    case "balances":
      return { balances: data.balances, settlements: data.settlements };
    case "settlements":
      return {
        payments: data.trip.settlementPayments ?? [],
        settlements: data.settlements,
      };
  }
}

export function errorPayload(error: unknown): Record<string, unknown> {
  if (error instanceof CliError) {
    return {
      error: {
        code: error.code,
        message: error.message,
        ...(error.status === undefined ? {} : { status: error.status }),
      },
    };
  }
  return {
    error: {
      code: "UNEXPECTED_ERROR",
      message: error instanceof Error ? error.message : "Unexpected error",
    },
  };
}
