import type { ReactNode } from "react";
import { GroupSettingsContext, type GroupSettingsContextValue } from "../AppContexts";

export function GroupSettingsProvider({
  children,
  value
}: {
  children: ReactNode;
  value: GroupSettingsContextValue;
}) {
  return <GroupSettingsContext.Provider value={value}>{children}</GroupSettingsContext.Provider>;
}
