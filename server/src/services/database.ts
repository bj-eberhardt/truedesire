import type { PairRecord, UserRecord } from "../storage/db.js";

export function isPairMember(pair: PairRecord, userId: string): boolean {
  return [pair.userA, pair.userB].includes(userId);
}

export function isPartnerDeletedFromUsers(
  pair: PairRecord,
  userId: string,
  users: { userA: UserRecord | null; userB: UserRecord | null }
): boolean {
  const partner = pair.userA === userId ? users.userB : users.userA;
  return !!partner?.deletedAt;
}
