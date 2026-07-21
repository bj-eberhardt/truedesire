import React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import {
  AccountContext,
  PairingContext,
  PairWorkspaceContext,
  SessionContext
} from "../../../../app/state/AppContexts";
import type {
  AccountContextValue,
  PairingContextValue,
  PairWorkspaceContextValue,
  SessionContextValue
} from "../../../../app/state";
import { useAccountHomeModel, type AccountHomeModel } from "./useAccountHomeModel";

function sessionValue(): SessionContextValue {
  return {
    identity: { userId: "user-1", nickname: "Ada", code: "AAA111" },
    nicknameDraft: "",
    isBootstrappingAccount: false,
    updateNicknameDraft: vi.fn(),
    bootstrapAccount: vi.fn(),
    registerAccount: vi.fn()
  };
}

function accountValue(copyPairingCode = vi.fn(() => Promise.resolve())): AccountContextValue {
  return {
    copyPairingCode,
    exportBackupText: vi.fn(),
    importBackupText: vi.fn(),
    deleteLocalAccount: vi.fn(),
    deleteAccount: vi.fn()
  };
}

function pairingValue(overrides: Partial<PairingContextValue> = {}): PairingContextValue {
  return {
    incoming: [],
    outgoing: [],
    myPairs: [
      {
        id: "pair-visible",
        status: "active",
        weeklyLimit: 5,
        partnerDeleted: false,
        partner: { id: "user-2", nickname: "Bea", code: "BBB222" },
        updatedAt: 2
      },
      {
        id: "pair-deleted",
        status: "active",
        weeklyLimit: 5,
        partnerDeleted: true,
        partner: { id: "user-3", nickname: "Cia", code: "CCC333" },
        updatedAt: 1
      }
    ],
    inlineError: null,
    clearInlineError: vi.fn(),
    refreshRequests: vi.fn(() => Promise.resolve()),
    sendPairRequest: vi.fn(() => Promise.resolve(true)),
    respondPairing: vi.fn(),
    ...overrides
  };
}

function workspaceValue(openPairRoute = vi.fn()): PairWorkspaceContextValue {
  return {
    route: { kind: "v3", route: { mode: "home", pairId: null } },
    pair: null,
    isLoadingPairData: false,
    openPair: vi.fn(),
    openPairRoute,
    refreshPairView: vi.fn()
  };
}

async function renderAccountHomeModel(
  opts: {
    account?: AccountContextValue;
    pairing?: PairingContextValue;
    workspace?: PairWorkspaceContextValue;
  } = {}
) {
  let current: AccountHomeModel | null = null;
  let renderer: ReactTestRenderer | null = null;

  function HookReader({ onValue }: { onValue: (value: AccountHomeModel) => void }) {
    onValue(useAccountHomeModel());
    return null;
  }

  function Providers() {
    return React.createElement(
      SessionContext.Provider,
      { value: sessionValue() },
      React.createElement(
        AccountContext.Provider,
        { value: opts.account ?? accountValue() },
        React.createElement(
          PairingContext.Provider,
          { value: opts.pairing ?? pairingValue() },
          React.createElement(
            PairWorkspaceContext.Provider,
            { value: opts.workspace ?? workspaceValue() },
            React.createElement(HookReader, { onValue: (value) => (current = value) })
          )
        )
      )
    );
  }

  await act(async () => {
    renderer = create(React.createElement(Providers));
  });

  if (!current || !renderer) throw new Error("Hook did not render");

  return {
    get current() {
      if (!current) throw new Error("Hook value missing");
      return current;
    },
    unmount: async () => {
      await act(async () => {
        renderer?.unmount();
      });
    }
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  const originalConsoleError = console.error;
  vi.spyOn(console, "error").mockImplementation((message?: unknown, ...args: unknown[]) => {
    if (typeof message === "string" && message.includes("react-test-renderer is deprecated")) {
      return;
    }
    originalConsoleError(message, ...args);
  });
  Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", {
    value: true,
    configurable: true
  });
  Object.defineProperty(globalThis, "window", {
    value: {
      clearInterval: globalThis.clearInterval,
      setInterval: globalThis.setInterval,
      scrollTo: vi.fn()
    },
    configurable: true
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

test("filters deleted partners and derives request/pair flags", async () => {
  const hook = await renderAccountHomeModel({
    pairing: pairingValue({
      incoming: [
        {
          id: "incoming-1",
          from: { id: "user-2", code: "BBB222", nickname: "Bea" },
          createdAt: 1
        }
      ]
    })
  });

  expect(hook.current.visiblePairs.map((pair) => pair.id)).toEqual(["pair-visible"]);
  expect(hook.current.hasPairs).toBe(true);
  expect(hook.current.hasRequests).toBe(true);
  expect(hook.current.groupedRequests).toHaveLength(1);

  await hook.unmount();
});

test("sends pair request with the current input and clears it afterwards", async () => {
  const sendPairRequest = vi.fn(() => Promise.resolve(true));
  const hook = await renderAccountHomeModel({
    pairing: pairingValue({ sendPairRequest })
  });

  act(() => hook.current.setPartnerCodeInput("BBB222"));

  await act(async () => {
    await hook.current.sendPairRequest();
  });

  expect(sendPairRequest).toHaveBeenCalledWith("BBB222");
  expect(hook.current.partnerCodeInput).toBe("");

  await hook.unmount();
});

test("delegates pairing code copy and pair opening actions", async () => {
  const copyPairingCode = vi.fn(() => Promise.resolve());
  const openPairRoute = vi.fn();
  const hook = await renderAccountHomeModel({
    account: accountValue(copyPairingCode),
    workspace: workspaceValue(openPairRoute)
  });

  act(() => hook.current.copyPairingCode());
  expect(copyPairingCode).toHaveBeenCalledTimes(1);

  hook.current.openPairRoute("pair-visible");
  expect(openPairRoute).toHaveBeenCalledWith("pair-visible");

  await hook.unmount();
});
