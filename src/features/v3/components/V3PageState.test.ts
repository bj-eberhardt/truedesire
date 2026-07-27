import React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { V3LoadingState, V3LoadingText } from "./V3PageState";

function render(element: React.ReactElement) {
  let renderer: ReactTestRenderer | null = null;

  act(() => {
    renderer = create(element);
  });

  const rendered = renderer as ReactTestRenderer | null;
  if (!rendered) throw new Error("Component did not render");
  return rendered.root;
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

test("loading text reuses animated dots instead of static ellipsis", () => {
  const root = render(React.createElement(V3LoadingText, null, "Ansicht wird geladen..."));
  const dots = root.findByProps({ className: "v3-loading-dots" });

  expect(root.findByProps({ className: "v3-loading-text" })).toBeTruthy();
  expect(dots.children).toHaveLength(3);
  expect(root.findAllByType("span")[1].children).toEqual(["Ansicht wird geladen"]);
});

test("loading state applies animated dots to framed title and body", () => {
  const root = render(
    React.createElement(V3LoadingState, {
      children: "Daten werden geladen...",
      title: "Konto wird geladen...",
      framed: true
    })
  );

  expect(root.findAllByProps({ className: "v3-loading-dots" })).toHaveLength(2);
  expect(root.findByType("h2").findAllByType("span")[1].children).toEqual(["Konto wird geladen"]);
});
