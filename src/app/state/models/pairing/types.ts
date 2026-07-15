import type { api } from "../../../../api/api";

export type ApiClient = ReturnType<typeof api>;
export type { MyPairs, PairingIncoming, PairingOutgoing } from "../../types";

