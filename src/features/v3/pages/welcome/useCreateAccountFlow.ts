import { useState } from "react";
import type { V3Route } from "../../../../app/routes";
import { toUserMessage } from "../../lib/errors";

type UseCreateAccountFlowOptions = {
  bootstrapAccount: () => Promise<{ userId?: string | null } | null>;
  registerAccount: (nickname?: string) => Promise<void>;
  setOnboardingStep: (step: NonNullable<V3Route["onboard"]>) => void;
  setOnboardError: (message: string | null) => void;
};

export function useCreateAccountFlow({
  bootstrapAccount,
  registerAccount,
  setOnboardingStep,
  setOnboardError
}: UseCreateAccountFlowOptions) {
  const [isRegistering, setIsRegistering] = useState(false);

  async function createAccount(nicknameDraft: string) {
    const trimmed = nicknameDraft.trim();
    if (!trimmed) {
      setOnboardError("Bitte gib einen Nickname ein.");
      return;
    }
    try {
      setIsRegistering(true);
      await registerAccount(trimmed);
      setOnboardError(null);
      const hydrated = await bootstrapAccount();
      if (!hydrated?.userId) {
        setOnboardError(
          "Konto wurde erstellt, konnte aber noch nicht geladen werden. Bitte erneut versuchen."
        );
        return;
      }
      setOnboardingStep("backup-save");
    } catch (e: unknown) {
      setOnboardError(toUserMessage(e));
    } finally {
      setIsRegistering(false);
    }
  }

  return { createAccount, isRegistering };
}
