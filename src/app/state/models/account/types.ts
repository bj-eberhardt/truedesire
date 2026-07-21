import type { api } from "../../../../api/api";
import type { Identity } from "../../../../state/identity";
import type { PairView } from "../../../../types";

export type ApiClient = ReturnType<typeof api>;

export type AccountModelOptions = {
  apiClient: ApiClient | null;
  identity: Identity | null;
  resetLocalIdentity: () => Promise<void>;
  setIdentity: (next: Identity | null) => void;
  setPair: (next: PairView | null) => void;
  clearMatches: () => void;
  clearQuestions: () => void;
  clearGlobalError: () => void;
  showNotice: (message: string) => void;
};
