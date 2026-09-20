import { type ChildProcess, spawn } from "node:child_process";

const children = [
  startWorkspace("@narumitw/otter-api", { PORT: "17464" }),
  startWorkspace("@narumitw/otter-web"),
];
let stopping = false;

function startWorkspace(
  workspace: string,
  environment: Record<string, string> = {},
): ChildProcess {
  return spawn("npm", ["run", "dev", "--workspace", workspace], {
    env: { ...process.env, ...environment },
    stdio: "inherit",
  });
}

function stop(signal: NodeJS.Signals): void {
  if (stopping) {
    return;
  }
  stopping = true;
  for (const child of children) {
    child.kill(signal);
  }
}

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => stop(signal));
}

for (const child of children) {
  child.on("exit", (code, signal) => {
    if (!stopping) {
      stop("SIGTERM");
      process.exitCode = code ?? (signal ? 1 : 0);
    }
  });
  child.on("error", (error) => {
    console.error(error);
    stop("SIGTERM");
    process.exitCode = 1;
  });
}
