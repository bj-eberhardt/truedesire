import type { ReactNode } from "react";
import { AccountContext, type AccountContextValue } from "../AppContexts";

export function AccountProvider({
  children,
  value
}: {
  children: ReactNode;
  value: AccountContextValue;
}) {
  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
}
