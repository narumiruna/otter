import { type ChildProcess, spawn } from "node:child_process";

export interface OwnedProcess {
  child: ChildProcess;
  done: Promise<string>;
  stop: () => Promise<void>;
}

// Keep child output private. Never include it in an error or a call log.
export function startProcess(
  executable: string,
  args: string[],
  signal: AbortSignal,
  environment: Record<string, string>,
  timeout: number,
  input?: string,
  capture = true,
  cwd = process.cwd(),
): OwnedProcess {
  signal.throwIfAborted();
  const child = spawn(executable, args, {
    cwd,
    env: environment,
    detached: true,
    stdio: ["pipe", "pipe", "pipe"],
  });
  let exited = false;
  let output = "";
  let bytes = 0;
  let stopped = false;
  function kill(groupSignal: NodeJS.Signals) {
    if (exited || !child.pid) return;
    try {
      process.kill(-child.pid, groupSignal);
    } catch {
      /* Own group has already exited. */
    }
  }
  const abort = () => {
    stopped = true;
    kill("SIGKILL");
  };
  const timer = setTimeout(abort, timeout);
  signal.addEventListener("abort", abort, { once: true });
  const done = new Promise<string>((resolve, reject) => {
    child.stdout?.on("data", (chunk: Buffer) => {
      if (!capture) return;
      bytes += chunk.length;
      if (bytes > 32 * 1024 * 1024) return abort();
      output += chunk.toString("utf8");
    });
    child.stderr?.on("data", () => {
      /* Discard all private diagnostics. */
    });
    child.stdin?.on("error", abort);
    child.once("error", () =>
      reject(new Error("Cross-client child could not start.")),
    );
    child.once("close", (code) => {
      exited = true;
      clearTimeout(timer);
      signal.removeEventListener("abort", abort);
      if (code === 0 && !stopped) resolve(output);
      else
        reject(
          new Error("Cross-client child failed; private output was discarded."),
        );
    });
  });
  // Attach immediately. Vite can fail while the caller waits for its HTTP port.
  void done.catch(() => {});
  child.stdin?.end(input);
  return {
    child,
    done,
    stop: async () => {
      if (exited) return;
      kill("SIGTERM");
      const force = setTimeout(() => kill("SIGKILL"), 2_000);
      try {
        await done;
      } catch {
        /* No raw child error escapes cleanup. */
      } finally {
        clearTimeout(force);
      }
    },
  };
}
