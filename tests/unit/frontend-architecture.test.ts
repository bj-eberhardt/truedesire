import fs from "node:fs";
import path from "node:path";
import { expect, test } from "vitest";

const root = process.cwd();
const v3ShellPath = path.join(root, "src", "features", "v3", "V3Shell.tsx");
const v3PagesDir = path.join(root, "src", "features", "v3", "pages");
const pairPagePath = path.join(v3PagesDir, "Pair.tsx");
const accountHomePath = path.join(v3PagesDir, "AccountHome.tsx");
const hooksDir = path.join(root, "src", "hooks");
const usePairSelectionPath = path.join(
  root,
  "src",
  "app",
  "state",
  "models",
  "pair-selection",
  "usePairSelection.ts"
);
const usePairingPath = path.join(root, "src", "app", "state", "models", "pairing", "usePairing.ts");
const useAccountModelPath = path.join(root, "src", "app", "state", "models", "useAccountModel.ts");
const pairWorkspaceHookPath = path.join(root, "src", "app", "hooks", "usePairWorkspace.ts");
const appContextsPath = path.join(root, "src", "app", "state", "AppContexts.ts");
const appModelPath = path.join(root, "src", "app", "state", "useAppModel.ts");
const appStateTypesPath = path.join(root, "src", "app", "state", "types.ts");
const forbiddenRootHookPaths = [
  path.join(root, "src", "hooks", "useApiClient.ts"),
  path.join(root, "src", "hooks", "useHiddenMatches.ts"),
  path.join(root, "src", "hooks", "useIdentity.ts"),
  path.join(root, "src", "hooks", "useMatches.ts"),
  path.join(root, "src", "hooks", "usePairing.ts"),
  path.join(root, "src", "hooks", "usePairSelection.ts"),
  path.join(root, "src", "hooks", "useQuestions.ts"),
  path.join(root, "src", "hooks", "useToast.ts")
];
const pairWorkspaceModelPath = path.join(
  root,
  "src",
  "app",
  "state",
  "models",
  "usePairWorkspaceModel.ts"
);

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

test("recently split frontend modules stay below orchestration-size limits", () => {
  const limits = [
    { file: accountHomePath, maxLines: 140 },
    { file: usePairSelectionPath, maxLines: 120 },
    { file: usePairingPath, maxLines: 120 },
    { file: useAccountModelPath, maxLines: 80 }
  ];

  const failures = limits.flatMap(({ file, maxLines }) => {
    const lineCount = fs.readFileSync(file, "utf8").split(/\r?\n/).length;
    return lineCount > maxLines
      ? [`${path.relative(root, file)} has ${lineCount} lines, limit is ${maxLines}`]
      : [];
  });

  expect(failures).toEqual([]);
});

test("top-level V3 pages do not contain polling or interval refresh logic", () => {
  const failures: string[] = [];
  const topLevelPageFiles = fs
    .readdirSync(v3PagesDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".tsx"))
    .map((entry) => path.join(v3PagesDir, entry.name));

  for (const file of topLevelPageFiles) {
    const source = fs.readFileSync(file, "utf8");
    if (/\b(?:setInterval|clearInterval)\b|\bDate\.now\(\)|\bpoll(?:ing)?\b/i.test(source)) {
      failures.push(path.relative(root, file));
    }
  }

  expect(failures).toEqual([]);
});

test("V3 pages consume domain state via app state or local page models", () => {
  const failures: string[] = [];

  for (const file of listFiles(v3PagesDir)) {
    const source = fs.readFileSync(file, "utf8");
    if (/from\s+["'](?:\.\.\/){3,4}hooks\//.test(source)) {
      failures.push(path.relative(root, file));
    }
  }

  expect(failures).toEqual([]);
});

test("pair workspace does not own hidden-match visibility state", () => {
  const failures: string[] = [];
  const files = [pairWorkspaceHookPath, pairWorkspaceModelPath];

  for (const file of files) {
    const source = fs.readFileSync(file, "utf8");
    if (
      /\bhiddenMatches\b|\bHiddenMatches\b|\bshowHiddenMatches\b|\bhiddenMatchIds\b/.test(source)
    ) {
      failures.push(path.relative(root, file));
    }
  }

  expect(failures).toEqual([]);
});

test("app context public types do not depend on hook implementation files", () => {
  const source = [appContextsPath, appStateTypesPath]
    .map((file) => fs.readFileSync(file, "utf8"))
    .join("\n");

  expect(source).not.toMatch(/from\s+["'](?:\.\.\/)+hooks\//);
});

test("useAppModel remains a composition root without local state", () => {
  const source = fs.readFileSync(appModelPath, "utf8");

  expect(source).not.toMatch(/\buseState\b/);
});

test("domain-owned hooks do not reappear in the root hooks folder", () => {
  const existing = forbiddenRootHookPaths
    .filter((file) => fs.existsSync(file))
    .map((file) => path.relative(root, file));

  expect(existing).toEqual([]);
});

test("root hooks folder does not expose shared state hooks", () => {
  if (!fs.existsSync(hooksDir)) {
    expect(fs.existsSync(hooksDir)).toBe(false);
    return;
  }

  const rootHookFiles = fs
    .readdirSync(hooksDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".ts"))
    .map((entry) => entry.name)
    .sort();

  expect(rootHookFiles).toEqual([]);
});
