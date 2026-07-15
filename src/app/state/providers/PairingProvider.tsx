import type { ReactNode } from "react";
import { PairingContext, type PairingContextValue } from "../AppContexts";

export function PairingProvider({
  children,
  value
}: {
  children: ReactNode;
  value: PairingContextValue;
}) {
  return <PairingContext.Provider value={value}>{children}</PairingContext.Provider>;
}
