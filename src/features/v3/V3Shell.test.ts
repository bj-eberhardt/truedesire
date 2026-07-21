import React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import {
  AccountContext,
  FeedbackContext,
  PairWorkspaceContext,
  SessionContext
} from "../../app/state/AppContexts";
import type {
  AccountContextValue,
  FeedbackContextValue,
  PairWorkspaceContextValue,
  SessionContextValue
} from "../../app/state";
import { V3Shell } from "./V3Shell";

vi.mock("./hooks/useAutoHideHeader", () => ({
  useAutoHideHeader: () => false
}));
vi.mock("./components/ProfileMenu", () => ({
  ProfileMenu: () => null
}));
vi.mock("./components/V3Footer", () => ({
  V3Footer: () => React.createElement("footer", null)
}));
vi.mock("./pages/AccountHome", () => ({
  AccountHomePage: () => React.createElement("div", { "data-testid": "home-view" }, "Account")
}));
vi.mock("./pages/Home", () => ({
  HomePage: () => React.createElement("div", { "data-testid": "welcome-home-view" }, "Welcome")
}));
vi.mock("./pages/Pair", () => ({
  PairPage: () => React.createElement("div", null, "Pair")
}));
vi.mock("./pages/Welcome", () => ({
  WelcomePage: () => React.createElement("div", null, "Welcome route")
}));
vi.mock("./pages/AccountDeleted", () => ({
  AccountDeletedPage: () => React.createElement("div", null, "Deleted")
}));
vi.mock("./pages/Ask", () => ({
  AskPage: () => React.createElement("div", null, "Ask")
}));
vi.mock("./pages/Backup", () => ({
  BackupPage: () => React.createElement("div", null, "Backup")
}));
vi.mock("./pages/Played", () => ({
  PlayedPage: () => React.createElement("div", null, "Played")
}));

const feedbackValue: FeedbackContextValue = {
  toast: null,
  inlineNotice: null,
  error: null,
  setGlobalError: vi.fn(),
  clearGlobalError: vi.fn()
};

const workspaceValue: PairWorkspaceContextValue = {
  route: { kind: "v3", route: { mode: "home", pairId: null } },
  pair: null,
  isLoadingPairData: false,
  openPair: vi.fn(),
  openPairRoute: vi.fn(),
  refreshPairView: vi.fn()
};

function accountValue(overrides: Partial<AccountContextValue> = {}): AccountContextValue {
  return {
    copyPairingCode: vi.fn(),
    deleteAccount: vi.fn(),
    deleteLocalAccount: vi.fn(),
    exportBackupText: vi.fn(),
    importBackupText: vi.fn(),
    ...overrides
  };
}

function sessionValue(overrides: Partial<SessionContextValue> = {}): SessionContextValue {
  return {
    identity: null,
    nicknameDraft: "",
    bootstrapAccountStatus: "ready",
    isBootstrappingAccount: false,
    updateNicknameDraft: vi.fn(),
    bootstrapAccount: vi.fn(),
    registerAccount: vi.fn(),
    ...overrides
  };
}

function renderShell(session: SessionContextValue, account: AccountContextValue = accountValue()) {
  let renderer: ReactTestRenderer | null = null;

  act(() => {
    renderer = create(
      React.createElement(
        FeedbackContext.Provider,
        { value: feedbackValue },
        React.createElement(
          SessionContext.Provider,
          { value: session },
          React.createElement(
            AccountContext.Provider,
            { value: account },
            React.createElement(
              PairWorkspaceContext.Provider,
              { value: workspaceValue },
              React.createElement(V3Shell)
            )
          )
        )
      )
    );
  });

  const rendered = renderer as ReactTestRenderer | null;
  if (!rendered) throw new Error("Shell did not render");
  return rendered.root;
}

beforeEach(() => {
  vi.clearAllMocks();
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
    value: { location: { reload: vi.fn() } },
    configurable: true
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

test("shows header without profile menu and loading bar while bootstrapping", () => {
  const root = renderShell(
    sessionValue({
      identity: { userId: "user-1", nickname: "Ada", code: "AAA111" },
      bootstrapAccountStatus: "loading",
      isBootstrappingAccount: true
    })
  );

  expect(root.findByProps({ "data-testid": "app-header" })).toBeTruthy();
  expect(root.findAllByProps({ "data-testid": "profile-menu-button" })).toHaveLength(0);
  expect(root.findByProps({ "data-testid": "account-loading-view" })).toBeTruthy();
  expect(root.findByProps({ "data-testid": "account-loading-bar" })).toBeTruthy();
});

test("routes to welcome home after ready bootstrap without account", () => {
  const root = renderShell(sessionValue());

  expect(root.findByProps({ "data-testid": "welcome-home-view" })).toBeTruthy();
});

test("routes to account home after ready bootstrap with account", () => {
  const root = renderShell(
    sessionValue({
      identity: { userId: "user-1", nickname: "Ada", code: "AAA111" }
    })
  );

  expect(root.findByProps({ "data-testid": "home-view" })).toBeTruthy();
});

test("shows unauthorized and temporary retry states", async () => {
  const retryUnauthorized = vi.fn();
  const deleteLocalAccount = vi.fn(() => Promise.resolve());
  const unauthorizedRoot = renderShell(
    sessionValue({
      bootstrapAccountStatus: "unauthorized",
      bootstrapAccount: retryUnauthorized
    }),
    accountValue({ deleteLocalAccount })
  );

  expect(unauthorizedRoot.findByProps({ "data-testid": "account-loading-view" })).toBeTruthy();
  act(() => {
    unauthorizedRoot
      .findByProps({ "data-testid": "account-bootstrap-retry-button" })
      .props.onClick();
  });
  expect(retryUnauthorized).toHaveBeenCalledOnce();
  await act(async () => {
    unauthorizedRoot
      .findByProps({ "data-testid": "account-bootstrap-delete-local-button" })
      .props.onClick();
  });
  expect(deleteLocalAccount).toHaveBeenCalledOnce();
  expect(window.location.reload).toHaveBeenCalledOnce();

  const temporaryRoot = renderShell(
    sessionValue({
      bootstrapAccountStatus: "temporary"
    })
  );

  expect(
    temporaryRoot.findByProps({ "data-testid": "account-bootstrap-retry-button" })
  ).toBeTruthy();
  expect(
    temporaryRoot.findAllByProps({ "data-testid": "account-bootstrap-delete-local-button" })
  ).toHaveLength(0);
});
