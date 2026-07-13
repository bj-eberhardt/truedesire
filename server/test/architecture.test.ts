import fs from "node:fs";
import path from "node:path";
import { expect, test } from "vitest";

const root = path.resolve("..");
const serverSrc = path.join(root, "server", "src");
const handlersDir = path.join(serverSrc, "handlers");

const checks = [
  {
    name: "no express routers in backend",
    dir: serverSrc,
    pattern: /router\.(get|post|options)\s*\(/,
    allow: () => false
  },
  {
    name: "no direct bad string codes",
    dir: serverSrc,
    pattern: /bad\(res,\s*["']/,
    allow: () => false
  },
  {
    name: "no manual body coercion in handlers",
    dir: handlersDir,
    pattern: /String\(body|Number\(body|body\?\./,
    allow: () => false
  },
  {
    name: "no storage access in handlers",
    dir: handlersDir,
    pattern: /from\s+["'].*\/storage\/db\.js["']|dbStore|normalizeDb/,
    allow: () => false
  },
  {
    name: "no pg outside db and repositories",
    dir: serverSrc,
    pattern: /from\s+["']pg["']|from\s+["'].*\/db\/pool\.js["']/,
    allow: (file: string) =>
      file.includes(path.join("server", "src", "db")) ||
      file.includes(path.join("server", "src", "repositories")) ||
      file.includes(path.join("server", "src", "scripts"))
  },
  {
    name: "no direct sql in handlers or services",
    dir: serverSrc,
    pattern: /\b(select|insert|update|delete|create|alter|drop)\s+/i,
    allow: (file: string) =>
      file.includes(path.join("server", "src", "db")) ||
      file.includes(path.join("server", "src", "repositories"))
  },
  {
    name: "no FileStore app data",
    dir: serverSrc,
    pattern: /new\s+FileStore|dbStore/,
    allow: (file: string) => file.endsWith(path.join("server", "src", "storage", "fileStore.ts"))
  },
  {
    name: "central route registration only",
    dir: serverSrc,
    pattern: /app\.(get|post|options)\s*\(/,
    allow: (file: string) => file.endsWith(path.join("server", "src", "app.ts"))
  }
];

function listFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return listFiles(fullPath);
    return entry.isFile() && fullPath.endsWith(".ts") ? [fullPath] : [];
  });
}

test("server code follows backend architecture boundaries", () => {
  const failures: string[] = [];

  for (const check of checks) {
    for (const file of listFiles(check.dir)) {
      if (check.allow(file)) continue;
      const relative = path.relative(root, file);
      const lines = fs.readFileSync(file, "utf8").split("\n");
      lines.forEach((line, index) => {
        if (check.pattern.test(line)) {
          failures.push(`${check.name}: ${relative}:${index + 1}`);
        }
      });
    }
  }

  expect(failures).toEqual([]);
});
