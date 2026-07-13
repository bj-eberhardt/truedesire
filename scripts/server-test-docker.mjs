import { spawnSync } from "node:child_process";

const compose = ["compose", "-f", "docker-compose.server-test.yml"];
const databaseUrl = "postgres://truedesire:truedesire@localhost:55432/truedesire_server_test";

function run(command, args, opts = {}) {
  const executable = process.platform === "win32" ? process.env.ComSpec || "cmd.exe" : command;
  const commandArgs =
    process.platform === "win32" ? ["/d", "/s", "/c", [command, ...args].join(" ")] : args;
  const result = spawnSync(executable, commandArgs, {
    stdio: "inherit",
    shell: false,
    env: { ...process.env, ...opts.env }
  });
  return result.status ?? 1;
}

let status = run("docker", [...compose, "up", "-d", "--wait", "--force-recreate"]);
if (status === 0) {
  status = run("npm", ["--prefix", "server", "run", "test"], {
    env: {
      DATABASE_URL: databaseUrl,
      DB_SSL: "false",
      PORT: "0",
      LOG_LEVEL: "silent",
      REQUEST_LOGS: "false"
    }
  });
}

const downStatus = run("docker", [...compose, "down", "-v"]);
process.exit(status || downStatus);
