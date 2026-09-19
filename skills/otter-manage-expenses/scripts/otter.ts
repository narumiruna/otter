#!/usr/bin/env node

import {
  CliError,
  cliHelp,
  errorPayload,
  executeCliCommand,
  executeDeviceLogin,
  executeDeviceLogout,
  parseCliCommand,
  parseDeviceLoginArguments,
} from "./otter-cli.js";

export async function main(args = process.argv.slice(2)): Promise<number> {
  if (args.length === 0 || args[0] === "--help" || args[0] === "help") {
    process.stdout.write(`${cliHelp()}\n`);
    return 0;
  }

  try {
    let result: unknown;
    if (args[0] === "auth" && args[1] === "login") {
      const loginOptions = parseDeviceLoginArguments(args.slice(2));
      result = await executeDeviceLogin(process.env, {
        ...loginOptions,
        onPrompt: (authorization) => {
          process.stderr.write(
            `Authorize this CLI in Otter:\n  ${authorization.verification_uri}\n  Code: ${authorization.user_code}\nWaiting for approval…\n`,
          );
        },
      });
    } else if (args[0] === "auth" && args[1] === "logout") {
      if (args.length !== 2) {
        throw new CliError("USAGE", "auth logout does not accept options");
      }
      result = await executeDeviceLogout(process.env);
    } else {
      const command = parseCliCommand(args);
      result = await executeCliCommand(command, process.env);
    }
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return 0;
  } catch (error) {
    if (error instanceof CliError && error.code === "HELP") {
      process.stdout.write(`${error.message}\n`);
      return 0;
    }
    process.stderr.write(`${JSON.stringify(errorPayload(error), null, 2)}\n`);
    return 1;
  }
}

process.exitCode = await main();
