import type { ReactNode } from "react";
import { FeedbackContext, type FeedbackContextValue } from "../AppContexts";

export function FeedbackProvider({
  children,
  value
}: {
  children: ReactNode;
  value: FeedbackContextValue;
}) {
  return <FeedbackContext.Provider value={value}>{children}</FeedbackContext.Provider>;
}
