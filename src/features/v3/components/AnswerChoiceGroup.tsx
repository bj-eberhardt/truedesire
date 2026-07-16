import type { AnswerChoice } from "../../../types";

const answerChoices: { value: AnswerChoice; label: string }[] = [
  { value: "yes", label: "Ja" },
  { value: "maybe", label: "Vielleicht" },
  { value: "no", label: "Nein" }
];

type AnswerChoiceGroupProps = {
  value?: AnswerChoice | null;
  onSelect: (choice: AnswerChoice) => void;
  disabled?: boolean | ((choice: AnswerChoice) => boolean);
  className?: string;
  ariaLabel?: string;
  testIdPrefix?: string;
};

export function AnswerChoiceGroup({
  value,
  onSelect,
  disabled = false,
  className,
  ariaLabel = "Antwort",
  testIdPrefix = "answer"
}: AnswerChoiceGroupProps) {
  const isDisabled = typeof disabled === "function" ? disabled : () => Boolean(disabled);

  return (
    <div
      className={`v3-choice-row${className ? ` ${className}` : ""}`}
      role="group"
      aria-label={ariaLabel}
    >
      {answerChoices.map((choice) => (
        <button
          key={choice.value}
          className={`choice ${choice.value} ${value === choice.value ? "active" : ""}`.trim()}
          data-testid={`${testIdPrefix}-${choice.value}-button`}
          onClick={() => onSelect(choice.value)}
          disabled={isDisabled(choice.value)}
        >
          {choice.label}
        </button>
      ))}
    </div>
  );
}
