import { bytesToArrayBuffer, bytesToBase64, utf8ToBytes } from "../../crypto/base64";
import type { AnswerChoice, MatchPolicy, MatchTokenSet } from "../../types";
import type { MatchGrade } from "./computeMatchViews";

export const MATCH_POLICY_VERSION = 1;

export type MatchCombo = "maybe-maybe" | "yes-maybe" | "yes-yes";
type MatchableAnswer = Exclude<AnswerChoice, "no">;
type OrderedMatchCombo = `a:${MatchableAnswer}|b:${MatchableAnswer}`;

export function acceptedMatchCombos(answer: AnswerChoice, matchPolicy: MatchPolicy): MatchCombo[] {
  if (answer === "no") return [];
  if (answer === "yes") {
    return matchPolicy === "perfectOnly" ? ["yes-yes"] : ["yes-yes", "yes-maybe"];
  }
  if (matchPolicy === "perfectOnly") return [];
  if (matchPolicy === "allowMixedMaybe") return ["yes-maybe"];
  return ["yes-maybe", "maybe-maybe"];
}

function matchablePartnerAnswers(
  answer: AnswerChoice,
  matchPolicy: MatchPolicy
): MatchableAnswer[] {
  if (answer === "no") return [];
  if (answer === "yes") return matchPolicy === "perfectOnly" ? ["yes"] : ["yes", "maybe"];
  if (matchPolicy === "perfectOnly") return [];
  if (matchPolicy === "allowMixedMaybe") return ["yes"];
  return ["yes", "maybe"];
}

function orderedComboForAnswers(opts: {
  myUserId: string;
  partnerUserId: string;
  myAnswer: MatchableAnswer;
  partnerAnswer: MatchableAnswer;
}): OrderedMatchCombo {
  const myIsA = opts.myUserId < opts.partnerUserId;
  const aAnswer = myIsA ? opts.myAnswer : opts.partnerAnswer;
  const bAnswer = myIsA ? opts.partnerAnswer : opts.myAnswer;
  return `a:${aAnswer}|b:${bAnswer}`;
}

async function tokenForCombo(opts: {
  hmacKey: CryptoKey;
  pairId: string;
  questionId: string;
  combo: OrderedMatchCombo;
}): Promise<string> {
  const message = utf8ToBytes(
    `love-interests|match-token|v1|pair:${opts.pairId}|question:${opts.questionId}|combo:${opts.combo}`
  );
  const signature = await crypto.subtle.sign("HMAC", opts.hmacKey, bytesToArrayBuffer(message));
  return bytesToBase64(new Uint8Array(signature));
}

export async function createMatchTokens(opts: {
  hmacKey: CryptoKey;
  pairId: string;
  questionId: string;
  myUserId: string;
  partnerUserId: string;
  answer: AnswerChoice;
  matchPolicy: MatchPolicy;
}): Promise<MatchTokenSet> {
  const tokens: MatchTokenSet = { perfect: [], mixedMaybe: [], mutualMaybe: [] };
  const ownAnswer = opts.answer === "no" ? null : opts.answer;
  if (!ownAnswer) return tokens;

  for (const partnerAnswer of matchablePartnerAnswers(opts.answer, opts.matchPolicy)) {
    const combo = orderedComboForAnswers({
      myUserId: opts.myUserId,
      partnerUserId: opts.partnerUserId,
      myAnswer: ownAnswer,
      partnerAnswer
    });
    const token = await tokenForCombo({
      hmacKey: opts.hmacKey,
      pairId: opts.pairId,
      questionId: opts.questionId,
      combo
    });
    if (combo === "a:yes|b:yes") {
      tokens.perfect.push(token);
    } else if (combo === "a:maybe|b:maybe") {
      tokens.mutualMaybe.push(token);
    } else {
      tokens.mixedMaybe.push(token);
    }
  }
  return tokens;
}

export async function classifyMatchedTokens(opts: {
  hmacKey: CryptoKey;
  pairId: string;
  questionId: string;
  matchedTokens: string[];
}): Promise<MatchGrade> {
  const matched = new Set(opts.matchedTokens);
  const grades: Array<{ combo: OrderedMatchCombo; grade: MatchGrade }> = [
    { combo: "a:yes|b:yes", grade: "perfect" },
    { combo: "a:yes|b:maybe", grade: "maybe" },
    { combo: "a:maybe|b:yes", grade: "maybe" },
    { combo: "a:maybe|b:maybe", grade: "mutualMaybe" }
  ];

  for (const item of grades) {
    const token = await tokenForCombo({
      hmacKey: opts.hmacKey,
      pairId: opts.pairId,
      questionId: opts.questionId,
      combo: item.combo
    });
    if (matched.has(token)) return item.grade;
  }
  return "ok";
}
