import { MatchVisibilityIcon } from "../../../../components/MatchVisibilityIcon";
import type { MatchView } from "../../../../domain/matches/computeMatchViews";

type PairMatchCardProps = {
  match: MatchView;
  onHide: (matchId: string) => void;
  onRestore: (matchId: string) => void;
  showHiddenMatches: boolean;
};

export function PairMatchCard({
  match,
  onHide,
  onRestore,
  showHiddenMatches
}: PairMatchCardProps) {
  return (
    <div
      className={`match-card ${match.grade}`}
      data-testid="match-card"
      data-match-id={match.id}
      data-match-grade={match.grade}
    >
      <div className="match-head">
        <div className={`badge ${match.grade}`}>
          <MatchGradeIcon grade={match.grade} />
          <span className="match-grade-copy">
            <span className="match-grade-kicker">{matchGradeKicker(match.grade)}</span>
            <span className="match-grade-label">{matchGradeLabel(match.grade)}</span>
          </span>
        </div>
        <div className="match-title" data-testid="match-question-text">
          {match.question}
        </div>
      </div>
      <div className="match-card-actions">
        <button
          className="secondary icon-btn mini"
          data-testid="match-visibility-button"
          title={showHiddenMatches ? "Match wieder anzeigen" : "Match ausblenden"}
          onClick={() => (showHiddenMatches ? onRestore(match.id) : onHide(match.id))}
        >
          <MatchVisibilityIcon hidden={!showHiddenMatches} />
        </button>
      </div>
    </div>
  );
}

type MatchGrade = MatchView["grade"];

function MatchGradeIcon({ grade }: { grade: MatchGrade }) {
  return (
    <svg className="match-grade-icon" viewBox="0 0 24 24" aria-hidden="true">
      {grade === "perfect" ? (
        <path
          d="M12 21s-7-4.4-9.2-9A5.7 5.7 0 0 1 12 5.7 5.7 5.7 0 0 1 21.2 12C19 16.6 12 21 12 21Z"
          fill="currentColor"
        />
      ) : grade === "maybe" ? (
        <path
          d="M12 3.5 14.7 9l6 .9-4.3 4.2 1 6-5.4-2.9-5.4 2.9 1-6L3.3 9l6-.9L12 3.5Z"
          fill="currentColor"
        />
      ) : (
        <circle cx="12" cy="12" r="7" fill="currentColor" />
      )}
    </svg>
  );
}

function matchGradeKicker(grade: MatchGrade) {
  if (grade === "perfect") return "Starkes Match";
  if (grade === "maybe") return "Interessante Nähe";
  return "Guter Start";
}

function matchGradeLabel(grade: MatchGrade) {
  if (grade === "perfect") return "Perfekt";
  if (grade === "maybe") return "Vielleicht";
  return "Okay";
}
