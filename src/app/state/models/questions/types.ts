import type { api } from "../../../../api/api";
import type { AnswerChoice } from "../../../../types";

export type ApiClient = ReturnType<typeof api>;
export type AnswerSummary = Record<string, { total: number; mine?: AnswerChoice }>;
export type SystemQuestionHashes = Record<string, string[]>;

export type SystemQuestionCatalogItem = {
  id: string;
  version: number;
  sha256B64: string;
};
