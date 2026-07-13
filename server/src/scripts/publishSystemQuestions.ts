import fs from "node:fs";
import { closePool } from "../db/pool.js";
import { initializeDatabase } from "../db/migrations.js";
import { publishSystemQuestionVersion } from "../repositories/systemQuestionRepository.js";

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

function usage(): never {
  throw new Error("Usage: node dist/scripts/publishSystemQuestions.js <catalog.json>");
}

function parseCatalog(raw: unknown) {
  if (!raw || typeof raw !== "object") usage();
  const catalog = raw as RawCatalog;
  const version = catalog.catalogVersion ?? catalog.version;
  if (typeof version !== "number" || !Number.isInteger(version)) {
    throw new Error("catalogVersion must be an integer");
  }
  if (!Array.isArray(catalog.questions)) {
    throw new Error("questions must be an array");
  }

  return {
    version,
    description: typeof catalog.description === "string" ? catalog.description : null,
    questions: catalog.questions.map((item, index) => {
      const question = item as RawQuestion;
      if (!question || typeof question !== "object") {
        throw new Error(`question at position ${index + 1} must be an object`);
      }
      if (typeof question.id !== "string" || typeof question.text !== "string") {
        throw new Error(`question at position ${index + 1} must contain string id and text`);
      }
      return {
        id: question.id,
        text: question.text
      };
    })
  };
}

async function main() {
  const file = process.argv[2];
  if (!file) usage();

  const raw = JSON.parse(fs.readFileSync(file, "utf8"));
  const catalog = parseCatalog(raw);

  await initializeDatabase();
  await publishSystemQuestionVersion({
    version: catalog.version,
    description: catalog.description,
    questions: catalog.questions
  });
  console.log(`Published system question version ${catalog.version}`);
}

main()
  .catch((err: unknown) => {
    const message = err instanceof Error ? err.message : String(err);
    console.error(message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closePool();
  });
