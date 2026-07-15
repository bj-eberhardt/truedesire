import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const migrationsSource = path.join(root, "src", "db", "migrations");
const migrationsTarget = path.join(root, "dist", "db", "migrations");
const dataSource = path.join(root, "data");
const dataTarget = path.join(root, "dist", "data");

function copyDirectory(source, target, filter) {
  fs.mkdirSync(target, { recursive: true });

  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const sourcePath = path.join(source, entry.name);
    const targetPath = path.join(target, entry.name);
    if (entry.isDirectory()) {
      copyDirectory(sourcePath, targetPath, filter);
      continue;
    }
    if (!entry.isFile() || !filter(entry.name)) continue;
    fs.copyFileSync(sourcePath, targetPath);
  }
}

fs.mkdirSync(migrationsTarget, { recursive: true });

for (const entry of fs.readdirSync(migrationsSource, { withFileTypes: true })) {
  if (!entry.isFile() || !entry.name.endsWith(".sql")) continue;
  fs.copyFileSync(path.join(migrationsSource, entry.name), path.join(migrationsTarget, entry.name));
}

copyDirectory(dataSource, dataTarget, (fileName) => fileName.endsWith(".json"));
