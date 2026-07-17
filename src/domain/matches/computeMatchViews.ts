export type MatchGrade = "perfect" | "maybe" | "mutualMaybe" | "ok";

export type MatchView = {
  id: string;
  question: string;
  grade: MatchGrade;
};

export type MatchQuestionInput = {
  id: string;
  text: string;
  createdAt: number;
  grade: MatchGrade;
};

type MatchCandidate = MatchView & {
  createdAt: number;
};

export function computeMatchViews(questions: MatchQuestionInput[]): MatchView[] {
  const matches: MatchCandidate[] = [];

  for (const question of questions) {
    matches.push({
      id: question.id,
      question: question.text,
      grade: question.grade,
      createdAt: question.createdAt
    });
  }

  return matches
    .sort((a, b) => b.createdAt - a.createdAt)
    .map(({ createdAt: _createdAt, ...match }) => match);
}
