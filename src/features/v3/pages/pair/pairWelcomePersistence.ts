import { idbGet, idbSet } from "../../../../storage/idb";

const PAIR_WELCOME_ACK_PREFIX = "pair-welcome-ack:v1";

function pairWelcomeAckKey(userId: string, pairId: string): string {
  return `${PAIR_WELCOME_ACK_PREFIX}:${userId}:${pairId}`;
}

export async function hasAcknowledgedPairWelcome(userId: string, pairId: string): Promise<boolean> {
  return (await idbGet<boolean>(pairWelcomeAckKey(userId, pairId))) === true;
}

export async function acknowledgePairWelcome(userId: string, pairId: string): Promise<void> {
  await idbSet(pairWelcomeAckKey(userId, pairId), true);
}
