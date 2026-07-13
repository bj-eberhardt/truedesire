import fs from "node:fs";
import { createHash } from "node:crypto";
import { SYSTEM_QUESTIONS_FILE } from "../config.js";
import { ApiErrorCode } from "../errors/apiErrorCode.js";

type SystemQuestion = {
  id: string;
  version: number;
  text: string;
  sha256B64: string;
};

type SystemQuestionVerification = Omit<SystemQuestion, "text">;

type ReadSystemQuestionsResult =
  | {
      ok: true;
      catalogVersion: number;
      questions: SystemQuestion[];
      verificationCatalog: SystemQuestionVerification[];
    }
  | {
      ok: false;
      error: ApiErrorCode.BadSystemQuestions | ApiErrorCode.SystemQuestionsUnavailable;
    };

type RawSystemQuestion = {
  id?: unknown;
  version?: unknown;
  text?: unknown;
  active?: unknown;
};

function normalizeSystemQuestion(
  item: RawSystemQuestion
): (SystemQuestion & { active: boolean }) | null {
  if (!item || typeof item.id !== "string" || typeof item.text !== "string") return null;
  const version =
    typeof item.version === "number" && Number.isInteger(item.version) ? item.version : 1;
  if (version < 1) return null;

  return {
    id: item.id,
    version,
    text: item.text,
    active: item.active !== false,
    sha256B64: createHash("sha256").update(item.text, "utf8").digest("base64")
  };
}

function readQuestionItems(
  parsed: unknown
): { catalogVersion: number; items: RawSystemQuestion[] } | null {
  if (Array.isArray(parsed)) return { catalogVersion: 1, items: parsed as RawSystemQuestion[] };
  if (!parsed || typeof parsed !== "object") return null;

  const candidate = parsed as { catalogVersion?: unknown; questions?: unknown };
  if (!Array.isArray(candidate.questions)) return null;
  const catalogVersion =
    typeof candidate.catalogVersion === "number" && Number.isInteger(candidate.catalogVersion)
      ? candidate.catalogVersion
      : 1;

  return { catalogVersion, items: candidate.questions as RawSystemQuestion[] };
}

export function readSystemQuestions(): ReadSystemQuestionsResult {
  try {
    const raw = fs.readFileSync(SYSTEM_QUESTIONS_FILE, "utf8");
    const parsed = JSON.parse(raw);
    const source = readQuestionItems(parsed);
    if (!source) return { ok: false, error: ApiErrorCode.BadSystemQuestions };

    const catalog = source.items
      .map(normalizeSystemQuestion)
      .filter((item): item is SystemQuestion & { active: boolean } => !!item);
    if (catalog.length === 0) return { ok: false, error: ApiErrorCode.BadSystemQuestions };

    return {
      ok: true,
      catalogVersion: source.catalogVersion,
      questions: catalog
        .filter((item) => item.active)
        .map(({ active: _active, ...question }) => question),
      verificationCatalog: catalog.map(({ active: _active, text: _text, ...question }) => question)
    };
  } catch {
    return { ok: false, error: ApiErrorCode.SystemQuestionsUnavailable };
  }
}
