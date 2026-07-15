import type { V3Route } from "../../../../app/routes";

type OnboardPath = NonNullable<V3Route["onboard"]>;

export function onboardingSteps(onboardPath: OnboardPath) {
  const isNewFlow = onboardPath === "new" || onboardPath === "backup-save";

  return isNewFlow
    ? [
        { id: "choose", title: "Start", subtitle: "Backup importieren oder neues Konto" },
        { id: "new", title: "Neues Konto", subtitle: "Nickname festlegen" },
        { id: "backup", title: "Backup", subtitle: "Optional herunterladen" },
        { id: "ready", title: "Fertig", subtitle: "Partner verknüpfen und loslegen" }
      ]
    : [
        { id: "choose", title: "Start", subtitle: "Backup importieren oder neues Konto" },
        {
          id: "setup",
          title: onboardPath === "backup" ? "Backup importieren" : "Einrichten",
          subtitle:
            onboardPath === "backup" ? "Backup importieren" : "Backup importieren oder neues Konto"
        },
        { id: "ready", title: "Fertig", subtitle: "Partner verknüpfen und loslegen" }
      ];
}

export function activeOnboardingStepId(onboardPath: OnboardPath) {
  if (onboardPath === "start") return "choose";
  if (onboardPath === "backup") return "setup";
  if (onboardPath === "new") return "new";
  if (onboardPath === "backup-save") return "backup";
  return "setup";
}
