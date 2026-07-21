import React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { AccountDeleteDialog } from "./AccountDeleteDialog";

vi.mock("../../../components/ModalFrame", () => ({
  ModalFrame: ({
    children,
    open,
    testId
  }: {
    children: React.ReactNode;
    open: boolean;
    testId: string;
  }) => (open ? React.createElement("div", { "data-testid": testId }, children) : null)
}));

function renderDialog(props: Partial<React.ComponentProps<typeof AccountDeleteDialog>> = {}) {
  let renderer: ReactTestRenderer | null = null;
  const mergedProps: React.ComponentProps<typeof AccountDeleteDialog> = {
    busyAction: null,
    onCancel: vi.fn(),
    onDeleteAccount: vi.fn(),
    onDeleteLocal: vi.fn(),
    open: true,
    ...props
  };

  act(() => {
    renderer = create(React.createElement(AccountDeleteDialog, mergedProps));
  });

  const rendered = renderer as ReactTestRenderer | null;
  if (!rendered) throw new Error("Component did not render");
  return { props: mergedProps, root: rendered.root };
}

beforeEach(() => {
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
});

afterEach(() => {
  vi.restoreAllMocks();
});

test("renders nothing while closed", () => {
  let renderer: ReactTestRenderer | null = null;

  act(() => {
    renderer = create(
      React.createElement(AccountDeleteDialog, {
        busyAction: null,
        onCancel: vi.fn(),
        onDeleteAccount: vi.fn(),
        onDeleteLocal: vi.fn(),
        open: false
      })
    );
  });

  expect((renderer as unknown as ReactTestRenderer).toJSON()).toBeNull();
});

test("defaults to local deletion and switches to server deletion when selected", () => {
  const { props, root } = renderDialog();

  expect(root.findByProps({ "data-testid": "delete-local-option" }).props["data-active"]).toBe(
    "true"
  );
  expect(root.findByProps({ "data-testid": "confirm-confirm-button" }).props.children).toBe(
    "Account auf Gerät löschen"
  );

  act(() => {
    root.findByProps({ "data-testid": "confirm-confirm-button" }).props.onClick();
  });

  expect(props.onDeleteLocal).toHaveBeenCalledOnce();
  expect(props.onDeleteAccount).not.toHaveBeenCalled();

  act(() => {
    root.findByProps({ "data-testid": "delete-server-option" }).props.onClick();
  });

  expect(root.findByProps({ "data-testid": "delete-server-option" }).props["data-active"]).toBe(
    "true"
  );
  expect(root.findByProps({ "data-testid": "confirm-confirm-button" }).props.className).toBe(
    "danger"
  );
  expect(root.findByProps({ "data-testid": "confirm-confirm-button" }).props.children).toBe(
    "Account endgültig löschen"
  );

  act(() => {
    root.findByProps({ "data-testid": "confirm-confirm-button" }).props.onClick();
  });

  expect(props.onDeleteAccount).toHaveBeenCalledOnce();
});

test("disables actions and shows busy label while deleting", () => {
  const { root } = renderDialog({ busyAction: "server" });

  expect(root.findByProps({ "data-testid": "delete-local-option" }).props.disabled).toBe(true);
  expect(root.findByProps({ "data-testid": "delete-server-option" }).props.disabled).toBe(true);
  expect(root.findByProps({ "data-testid": "confirm-cancel-button" }).props.disabled).toBe(true);
  expect(root.findByProps({ "data-testid": "confirm-confirm-button" }).props.disabled).toBe(true);
  expect(root.findByProps({ "data-testid": "confirm-confirm-button" }).props.children).toBe(
    "Löscht..."
  );
});
