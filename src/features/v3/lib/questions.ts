import type { AnswerChoice, DecryptedQuestion } from "../../../types";

export type AnswerSummary = Record<string, { total: number; mine?: AnswerChoice }>;

export function sortByCreatedAtDesc<T extends { createdAt: number }>(items: T[]): T[] {
  return items.slice().sort((a, b) => b.createdAt - a.createdAt);
}

export function getOpenQuestions(
  questions: DecryptedQuestion[],
  answerSummary: AnswerSummary
): DecryptedQuestion[] {
  return questions.filter((q) => (answerSummary[q.id]?.total ?? 0) < 2);
}

export function countOpenNonOwnUnanswered(opts: {
  questions: DecryptedQuestion[];
  answerSummary: AnswerSummary;
  identityUserId: string;
}): number {
  const open = getOpenQuestions(opts.questions, opts.answerSummary);
  return open.filter((q) => !opts.answerSummary[q.id]?.mine && q.createdBy !== opts.identityUserId)
    .length;
}
