import { expect, test } from "vitest";
import { groupPairingRequests } from "./groupPairingRequests";

test("groups incoming and outgoing pairing requests by partner identity", () => {
  expect(
    groupPairingRequests(
      [
        { id: "incoming-1", from: { id: "a", code: "AAA", nickname: "Ada" }, createdAt: 1 },
        { id: "incoming-2", from: { id: "a", code: "AAA", nickname: "Ada" }, createdAt: 2 }
      ],
      [{ id: "outgoing-1", to: { id: "a", code: "AAA", nickname: "Ada" }, createdAt: 3 }]
    )
  ).toEqual([
    {
      nickname: "Ada",
      code: "AAA",
      incomingIds: ["incoming-1", "incoming-2"],
      outgoingIds: ["outgoing-1"]
    }
  ]);
});

test("sorts grouped pairing requests by nickname", () => {
  expect(
    groupPairingRequests(
      [{ id: "incoming-1", from: { id: "z", code: "ZZZ", nickname: "Zoë" }, createdAt: 1 }],
      [{ id: "outgoing-1", to: { id: "a", code: "AAA", nickname: "Ada" }, createdAt: 2 }]
    ).map((request) => request.nickname)
  ).toEqual(["Ada", "Zoë"]);
});
