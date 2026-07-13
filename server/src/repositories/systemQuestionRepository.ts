import { createHash } from "node:crypto";
import { query, transaction, type DbClient } from "../db/pool.js";

export type SystemQuestionRecord = {
  id: string;
  version: number;
  text: string;
  sha256B64: string;
};

export type SystemQuestionVerificationRecord = Omit<SystemQuestionRecord, "text">;

type SystemQuestionRow = {
  catalog_version: string | number;
  question_id: string;
  text: string;
  sha256_b64: string;
};

export type PublishSystemQuestion = {
  id: string;
  text: string;
};

export type PublishSystemQuestionVersionInput = {
  version: number;
  questions: PublishSystemQuestion[];
  description?: string | null;
};

function mapQuestion(row: SystemQuestionRow): SystemQuestionRecord {
  return {
    id: row.question_id,
    version: Number(row.catalog_version),
    text: row.text,
    sha256B64: row.sha256_b64
  };
}

function hashQuestionText(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("base64");
}

export async function listLatestSystemQuestions(): Promise<{
  catalogVersion: number | null;
  questions: SystemQuestionRecord[];
}> {
  const latest = await query<{ version: string | number }>(
    "select max(version) as version from system_question_versions"
  );
  const version = latest.rows[0]?.version === null ? null : Number(latest.rows[0]?.version);
  if (!version) return { catalogVersion: null, questions: [] };

  const result = await query<SystemQuestionRow>(
    `select catalog_version, question_id, text, sha256_b64
     from system_questions
     where catalog_version = $1
     order by position`,
    [version]
  );
  return { catalogVersion: version, questions: result.rows.map(mapQuestion) };
}

export async function listSystemQuestionVerificationCatalog(): Promise<
  SystemQuestionVerificationRecord[]
> {
  const result = await query<SystemQuestionRow>(
    `select catalog_version, question_id, text, sha256_b64
     from system_questions
     order by catalog_version, position`
  );
  return result.rows.map(({ text: _text, ...row }) => {
    const question = mapQuestion({ ...row, text: "" });
    return { id: question.id, version: question.version, sha256B64: question.sha256B64 };
  });
}

export function validateSystemQuestionVersion(input: PublishSystemQuestionVersionInput): void {
  if (!Number.isInteger(input.version) || input.version < 1) {
    throw new Error("catalog version must be a positive integer");
  }
  if (!Array.isArray(input.questions) || input.questions.length === 0) {
    throw new Error("questions must contain at least one item");
  }

  const ids = new Set<string>();
  for (const [index, question] of input.questions.entries()) {
    if (!question || typeof question.id !== "string" || question.id.trim() === "") {
      throw new Error(`question at position ${index + 1} has no id`);
    }
    if (ids.has(question.id)) {
      throw new Error(`duplicate question id in version ${input.version}: ${question.id}`);
    }
    ids.add(question.id);
    if (typeof question.text !== "string" || question.text.trim() === "") {
      throw new Error(`question ${question.id} has empty text`);
    }
  }
}

export async function publishSystemQuestionVersion(
  input: PublishSystemQuestionVersionInput
): Promise<void> {
  validateSystemQuestionVersion(input);
  const now = Date.now();

  await transaction(async (client: DbClient) => {
    const existing = await client.query<{ version: string | number }>(
      "select version from system_question_versions where version = $1 for update",
      [input.version]
    );
    if (existing.rows.length > 0) {
      throw new Error(`system question version ${input.version} already exists`);
    }

    await client.query(
      `insert into system_question_versions(version, published_at, description)
       values ($1, $2, $3)`,
      [input.version, now, input.description ?? null]
    );

    for (const [index, question] of input.questions.entries()) {
      await client.query(
        `insert into system_questions(
           catalog_version, question_id, position, text, sha256_b64, created_at
         )
         values ($1, $2, $3, $4, $5, $6)`,
        [input.version, question.id, index + 1, question.text, hashQuestionText(question.text), now]
      );
    }
  });
}
