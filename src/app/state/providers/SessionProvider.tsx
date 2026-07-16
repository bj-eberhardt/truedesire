import type { ReactNode } from "react";
import { SessionContext, type SessionContextValue } from "../AppContexts";

export function SessionProvider({
  children,
  value
}: {
  children: ReactNode;
  value: SessionContextValue;
}) {
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
