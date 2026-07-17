import { expect, test } from "vitest";
import { bytesToArrayBuffer, utf8ToBytes } from "../../crypto/base64";
import { acceptedMatchCombos, classifyMatchedTokens, createMatchTokens } from "./matchTokens";
import type { MatchPolicy, MatchTokenSet } from "../../types";

async function hmacKey() {
  return await crypto.subtle.importKey(
    "raw",
    bytesToArrayBuffer(utf8ToBytes("test-secret")),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
}

async function sharedTokens(opts: {
  aliceAnswer: "yes" | "maybe" | "no";
  bobAnswer: "yes" | "maybe" | "no";
  alicePolicy: MatchPolicy;
  bobPolicy: MatchPolicy;
}) {
  const key = await hmacKey();
  const base = { hmacKey: key, pairId: "pair-1", questionId: "question-1" };
  const aliceTokens = await createMatchTokens({
    ...base,
    myUserId: "alice",
    partnerUserId: "bob",
    answer: opts.aliceAnswer,
    matchPolicy: opts.alicePolicy
  });
  const bobTokens = await createMatchTokens({
    ...base,
    myUserId: "bob",
    partnerUserId: "alice",
    answer: opts.bobAnswer,
    matchPolicy: opts.bobPolicy
  });
  const sharedSet: MatchTokenSet = {
    perfect: aliceTokens.perfect.filter((token) => bobTokens.perfect.includes(token)),
    mixedMaybe: aliceTokens.mixedMaybe.filter((token) => bobTokens.mixedMaybe.includes(token)),
    mutualMaybe: aliceTokens.mutualMaybe.filter((token) =>
      bobTokens.mutualMaybe.includes(token)
    )
  };
  const shared = [...sharedSet.perfect, ...sharedSet.mixedMaybe, ...sharedSet.mutualMaybe];
  return { key, shared };
}

test("yes/yes can match even when maybe is disabled", () => {
  expect(acceptedMatchCombos("yes", "perfectOnly")).toEqual(["yes-yes"]);
});

test("yes/maybe requires a policy that allows mixed maybe matches", () => {
  expect(acceptedMatchCombos("yes", "allowMixedMaybe")).toContain("yes-maybe");
  expect(acceptedMatchCombos("maybe", "allowMixedMaybe")).toContain("yes-maybe");
  expect(acceptedMatchCombos("maybe", "perfectOnly")).not.toContain("yes-maybe");
});

test("maybe/maybe is only accepted by the mutual maybe policy", () => {
  expect(acceptedMatchCombos("maybe", "allowMixedMaybe")).toEqual(["yes-maybe"]);
  expect(acceptedMatchCombos("maybe", "allowMutualMaybe")).toEqual([
    "yes-maybe",
    "maybe-maybe"
  ]);
});

test("no never contributes match tokens", () => {
  expect(acceptedMatchCombos("no", "allowMutualMaybe")).toEqual([]);
  expect(acceptedMatchCombos("no", "perfectOnly")).toEqual([]);
});

test("yes/yes classifies as a perfect match even when maybe is enabled", async () => {
  const { key, shared } = await sharedTokens({
    aliceAnswer: "yes",
    bobAnswer: "yes",
    alicePolicy: "allowMutualMaybe",
    bobPolicy: "allowMutualMaybe"
  });

  expect(shared).toHaveLength(1);
  await expect(
    classifyMatchedTokens({
      hmacKey: key,
      pairId: "pair-1",
      questionId: "question-1",
      matchedTokens: shared
    })
  ).resolves.toBe("perfect");
});

test("yes/maybe classifies as a maybe match only when both settings allow it", async () => {
  const allowed = await sharedTokens({
    aliceAnswer: "yes",
    bobAnswer: "maybe",
    alicePolicy: "allowMixedMaybe",
    bobPolicy: "allowMixedMaybe"
  });
  await expect(
    classifyMatchedTokens({
      hmacKey: allowed.key,
      pairId: "pair-1",
      questionId: "question-1",
      matchedTokens: allowed.shared
    })
  ).resolves.toBe("maybe");

  const blocked = await sharedTokens({
    aliceAnswer: "yes",
    bobAnswer: "maybe",
    alicePolicy: "allowMixedMaybe",
    bobPolicy: "perfectOnly"
  });
  expect(blocked.shared).toEqual([]);
});

test("maybe/maybe is blocked by allowMixedMaybe", async () => {
  const blocked = await sharedTokens({
    aliceAnswer: "maybe",
    bobAnswer: "maybe",
    alicePolicy: "allowMixedMaybe",
    bobPolicy: "allowMixedMaybe"
  });

  expect(blocked.shared).toEqual([]);
});

test("maybe/maybe classifies as a separate mutual maybe match under allowMutualMaybe", async () => {
  const { key, shared } = await sharedTokens({
    aliceAnswer: "maybe",
    bobAnswer: "maybe",
    alicePolicy: "allowMutualMaybe",
    bobPolicy: "allowMutualMaybe"
  });

  expect(shared).toHaveLength(1);
  await expect(
    classifyMatchedTokens({
      hmacKey: key,
      pairId: "pair-1",
      questionId: "question-1",
      matchedTokens: shared
    })
  ).resolves.toBe("mutualMaybe");
});
