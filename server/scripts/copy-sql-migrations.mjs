import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const source = path.join(root, "src", "db", "migrations");
const target = path.join(root, "dist", "db", "migrations");

fs.mkdirSync(target, { recursive: true });

for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
  if (!entry.isFile() || !entry.name.endsWith(".sql")) continue;
  fs.copyFileSync(path.join(source, entry.name), path.join(target, entry.name));
}
