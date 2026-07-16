import type { ReactNode } from "react";
import { QuestionsContext, type QuestionsContextValue } from "../AppContexts";

export function QuestionsProvider({
  children,
  value
}: {
  children: ReactNode;
  value: QuestionsContextValue;
}) {
  return <QuestionsContext.Provider value={value}>{children}</QuestionsContext.Provider>;
}
