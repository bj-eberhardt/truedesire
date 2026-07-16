import type { AnswerChoice } from "../../types";

export type MatchGrade = "perfect" | "maybe" | "ok";

export type MatchView = {
  id: string;
  question: string;
  grade: MatchGrade;
  answers: AnswerChoice[];
};

export type MatchQuestionInput = {
  id: string;
  text: string;
  createdAt: number;
  answers: AnswerChoice[];
};

type MatchCandidate = MatchView & {
  createdAt: number;
};

function gradeAnswers(answers: AnswerChoice[]): MatchGrade {
  if (answers.every((answer) => answer === "yes")) return "perfect";
  if (answers.some((answer) => answer === "maybe")) return "maybe";
  return "ok";
}

export function computeMatchViews(questions: MatchQuestionInput[]): MatchView[] {
  const matches: MatchCandidate[] = [];

  for (const question of questions) {
    if (question.answers.length < 2) continue;
    if (question.answers.includes("no")) continue;

    matches.push({
      id: question.id,
      question: question.text,
      grade: gradeAnswers(question.answers),
      answers: question.answers,
      createdAt: question.createdAt
    });
  }

  return matches
    .sort((a, b) => b.createdAt - a.createdAt)
    .map(({ createdAt: _createdAt, ...match }) => match);
}
