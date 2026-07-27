import fs from "node:fs";
import path from "node:path";
import { expect, test } from "vitest";

const root = path.resolve("..");
const scanRoots = [path.join(root, "server", "src"), path.join(root, "server", "test")];
const scanFiles = [
  path.join(root, "server", "package.json"),
  path.join(root, "server", "tsconfig.json"),
  path.join(root, "server", "tsconfig.test.json")
];
const skippedDirectoryNames = new Set(["dist", "node_modules"]);
const checkedExtensions = new Set([".json", ".sql", ".ts"]);
const mojibakePattern = new RegExp(
  [
    String.fromCharCode(0x00c3),
    String.fromCharCode(0x00c2),
    `${String.fromCharCode(0x00e2)}[^\\sA-Za-z]`,
    String.fromCharCode(0xfffd)
  ].join("|"),
  "u"
);
const questionMarkInsideWordPattern = /[A-Za-zÄÖÜäöüß]\?[A-Za-zÄÖÜäöüß]/u;

function listFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (skippedDirectoryNames.has(entry.name)) return [];
      return listFiles(fullPath);
    }
    return entry.isFile() && checkedExtensions.has(path.extname(entry.name)) ? [fullPath] : [];
  });
}

test("backend text files do not contain common mojibake markers", () => {
  const failures: string[] = [];
  const files = [
    ...scanRoots.flatMap((scanRoot) => listFiles(scanRoot)),
    ...scanFiles.filter((file) => fs.existsSync(file))
  ];

  for (const file of files) {
    const relative = path.relative(root, file);
    const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
    lines.forEach((line, index) => {
      if (mojibakePattern.test(line)) failures.push(`${relative}:${index + 1}`);
    });
  }

  expect(failures).toEqual([]);
});

test("system question catalogs do not contain replacement question marks inside words", () => {
  const failures: string[] = [];
  const catalogsDir = path.join(root, "server", "data", "system-question-catalogs");
  const catalogFiles = fs
    .readdirSync(catalogsDir)
    .filter((file) => file.endsWith(".json"))
    .map((file) => path.join(catalogsDir, file));

  for (const file of catalogFiles) {
    const relative = path.relative(root, file);
    const catalog = JSON.parse(fs.readFileSync(file, "utf8")) as {
      questions?: Array<{ id?: string; text?: string }>;
    };

    for (const question of catalog.questions ?? []) {
      if (question.text && questionMarkInsideWordPattern.test(question.text)) {
        failures.push(`${relative}:${question.id ?? "<missing id>"}`);
      }
    }
  }

  expect(failures).toEqual([]);
});
