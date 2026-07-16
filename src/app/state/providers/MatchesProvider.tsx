import type { ReactNode } from "react";
import { MatchesContext, type MatchesContextValue } from "../AppContexts";

export function MatchesProvider({
  children,
  value
}: {
  children: ReactNode;
  value: MatchesContextValue;
}) {
  return <MatchesContext.Provider value={value}>{children}</MatchesContext.Provider>;
}
