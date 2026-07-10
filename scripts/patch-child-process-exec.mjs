import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const childProcess = require("node:child_process");

// Vite (on Windows) calls `child_process.exec("net use")` to optimize realpath handling.
// In some locked-down environments, spawning `cmd.exe` is blocked and throws `spawn EPERM`,
// which can crash Vite during startup/config loading.
//
// Patch `exec` to never throw synchronously. If spawning is blocked, we surface the error
// to the callback and let Vite continue with its safe fallbacks.
const originalExec = childProcess.exec;
childProcess.exec = function execPatched(command, options, callback) {
  try {
    return originalExec.call(childProcess, command, options, callback);
  } catch (error) {
    const cb = typeof options === "function" ? options : callback;
    if (typeof cb === "function") queueMicrotask(() => cb(error, "", ""));
    return /** @type {any} */ ({ pid: 0, kill() {} });
  }
};
