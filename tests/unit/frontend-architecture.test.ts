import fs from "node:fs";
import path from "node:path";
import { expect, test } from "vitest";

const root = process.cwd();
const v3ShellPath = path.join(root, "src", "features", "v3", "V3Shell.tsx");
const v3PagesDir = path.join(root, "src", "features", "v3", "pages");
const pairPagePath = path.join(v3PagesDir, "Pair.tsx");

function listFiles(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return listFiles(fullPath);
    return entry.isFile() && /\.(ts|tsx)$/.test(entry.name) ? [fullPath] : [];
  });
}

test("V3Shell stays prop-less and does not reintroduce shell prop bags", () => {
  const source = fs.readFileSync(v3ShellPath, "utf8");

  expect(source).toMatch(/export function V3Shell\(\)/);
  expect(source).not.toMatch(/\bV3ShellProps\b/);
});

test("top-level V3 pages do not expose broad page prop interfaces", () => {
  const failures: string[] = [];

  for (const file of listFiles(v3PagesDir)) {
    const relative = path.relative(root, file);
    const source = fs.readFileSync(file, "utf8");

    if (/\btype\s+\w*PageProps\b/.test(source) || /\binterface\s+\w*PageProps\b/.test(source)) {
      failures.push(`${relative}: PageProps type/interface`);
    }

    const exportedPage = source.match(/export function \w+Page\(([^)]*)\)/);
    if (exportedPage?.[1]?.trim()) {
      failures.push(`${relative}: exported Page function has parameters`);
    }
  }

  expect(failures).toEqual([]);
});

test("PairPage remains a container instead of growing back into tab implementations", () => {
  const source = fs.readFileSync(pairPagePath, "utf8");
  const lineCount = source.split(/\r?\n/).length;

  expect(lineCount).toBeLessThanOrEqual(220);
  expect(source).toContain("<PairPlayTab />");
  expect(source).toContain("<PairMatchesTab />");
  expect(source).toContain("<PairSettingsTab />");
});
