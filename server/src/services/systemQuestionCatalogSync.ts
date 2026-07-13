import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { log } from "../logger.js";
import {
  publishSystemQuestionVersionIfMissing,
  validateSystemQuestionVersion,
  type PublishSystemQuestion,
  type PublishSystemQuestionVersionInput
} from "../repositories/systemQuestionRepository.js";

const SERVICES_DIR = path.dirname(fileURLToPath(import.meta.url));
const CATALOGS_DIR = path.join(SERVICES_DIR, "..", "data", "system-question-catalogs");

type RawCatalog = {
  catalogVersion?: unknown;
  version?: unknown;
  description?: unknown;
  questions?: unknown;
};

type RawQuestion = {
  id?: unknown;
  text?: unknown;
};

function parseCatalog(raw: unknown, fileName: string): PublishSystemQuestionVersionInput {
  if (!raw || typeof raw !== "object") {
    throw new Error(`system question catalog ${fileName} must be an object`);
  }
  const catalog = raw as RawCatalog;
  const version = catalog.catalogVersion ?? catalog.version;
  if (typeof version !== "number" || !Number.isInteger(version)) {
    throw new Error(`system question catalog ${fileName} must contain integer version`);
  }
  if (!Array.isArray(catalog.questions)) {
    throw new Error(`system question catalog ${fileName} must contain questions array`);
  }

  const questions: PublishSystemQuestion[] = catalog.questions.map((item, index) => {
    if (!item || typeof item !== "object") {
      throw new Error(`question at position ${index + 1} in ${fileName} must be an object`);
    }
    const question = item as RawQuestion;
    if (typeof question.id !== "string" || typeof question.text !== "string") {
      throw new Error(`question at position ${index + 1} in ${fileName} needs string id and text`);
    }
    return {
      id: question.id,
      text: question.text
    };
  });

  const parsed = {
    version,
    description: typeof catalog.description === "string" ? catalog.description : null,
    questions
  };
  validateSystemQuestionVersion(parsed);
  return parsed;
}

async function loadCatalogs(): Promise<PublishSystemQuestionVersionInput[]> {
  const entries = await fs.readdir(CATALOGS_DIR, { withFileTypes: true });
  const fileNames = entries
    .filter((entry) => entry.isFile() && /^v\d+\.json$/u.test(entry.name))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  const catalogs: PublishSystemQuestionVersionInput[] = [];
  for (const fileName of fileNames) {
    const raw = JSON.parse(await fs.readFile(path.join(CATALOGS_DIR, fileName), "utf8"));
    catalogs.push(parseCatalog(raw, fileName));
  }

  return catalogs.sort((a, b) => a.version - b.version);
}

export async function syncSystemQuestionCatalogs(): Promise<void> {
  const catalogs = await loadCatalogs();
  const seenVersions = new Set<number>();

  for (const catalog of catalogs) {
    if (seenVersions.has(catalog.version)) {
      throw new Error(`duplicate system question catalog version ${catalog.version}`);
    }
    seenVersions.add(catalog.version);

    const published = await publishSystemQuestionVersionIfMissing(catalog);
    if (published) {
      log("info", "system question catalog published", {
        version: catalog.version,
        questionCount: catalog.questions.length
      });
    }
  }
}
