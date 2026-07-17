import type { MatchPolicy } from "../../../../types";

export const MATCH_POLICY_OPTIONS: Array<{ value: MatchPolicy; label: string; summary: string }> = [
  {
    value: "perfectOnly",
    label: "Nur perfekte Matches (Ja + Ja)",
    summary: "Nur Ja + Ja wird angezeigt."
  },
  {
    value: "allowMixedMaybe",
    label: "Ja + Vielleicht zählt auch",
    summary: "Ja + Ja und Ja + Vielleicht werden angezeigt."
  },
  {
    value: "allowMutualMaybe",
    label: "Alle Vielleicht-Matches zählen",
    summary: "Alle Antworten ohne Nein werden angezeigt."
  }
];

export function matchPolicyLabel(policy: MatchPolicy): string {
  return MATCH_POLICY_OPTIONS.find((option) => option.value === policy)?.label ?? policy;
}

export function matchPolicySummary(policy: MatchPolicy): string {
  return MATCH_POLICY_OPTIONS.find((option) => option.value === policy)?.summary ?? policy;
}
