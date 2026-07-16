import type { ReactNode } from "react";
import { PairWorkspaceContext, type PairWorkspaceContextValue } from "../AppContexts";

export function PairWorkspaceProvider({
  children,
  value
}: {
  children: ReactNode;
  value: PairWorkspaceContextValue;
}) {
  return <PairWorkspaceContext.Provider value={value}>{children}</PairWorkspaceContext.Provider>;
}
