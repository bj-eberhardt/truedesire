import type { PairingContextValue } from "../../../../app/state";

type PairingIncoming = PairingContextValue["incoming"];
type PairingOutgoing = PairingContextValue["outgoing"];

export type GroupedPairingRequest = {
  nickname: string;
  code: string;
  incomingIds: string[];
  outgoingIds: string[];
};

export function groupPairingRequests(
  incoming: PairingIncoming,
  outgoing: PairingOutgoing
): GroupedPairingRequest[] {
  const grouped = new Map<string, GroupedPairingRequest>();

  for (const request of incoming) {
    const key = `${request.from.code}|${request.from.nickname}`;
    const existing = grouped.get(key) ?? {
      nickname: request.from.nickname,
      code: request.from.code,
      incomingIds: [],
      outgoingIds: []
    };
    existing.incomingIds.push(request.id);
    grouped.set(key, existing);
  }

  for (const request of outgoing) {
    const key = `${request.to.code}|${request.to.nickname}`;
    const existing = grouped.get(key) ?? {
      nickname: request.to.nickname,
      code: request.to.code,
      incomingIds: [],
      outgoingIds: []
    };
    existing.outgoingIds.push(request.id);
    grouped.set(key, existing);
  }

  return Array.from(grouped.values()).sort((a, b) => a.nickname.localeCompare(b.nickname, "de"));
}
