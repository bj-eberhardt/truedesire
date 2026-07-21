import React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { OnboardingAssistantFrame } from "./OnboardingAssistantFrame";
import { BackupSaveStep } from "./BackupSaveStep";
import { OnboardingPairingStep } from "./OnboardingPairingStep";

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

test("keeps backup optional and lets the assistant frame advance to pairing", () => {
  const downloadBackup = vi.fn();
  const onContinue = vi.fn();

  const root = render(
    React.createElement(
      OnboardingAssistantFrame,
      {
        activeStepId: "backup",
        rightAction: React.createElement(
          "button",
          {
            className: "primary",
            "data-testid": "onboarding-backup-next-button",
            onClick: onContinue
          },
          "Weiter"
        ),
        steps: [{ id: "backup", title: "Backup" }]
      },
      React.createElement(BackupSaveStep, {
        downloadBackup,
        isDownloadingBackup: false
      })
    )
  );

  act(() => {
    root.findByProps({ "data-testid": "onboarding-download-backup-button" }).props.onClick();
    root.findByProps({ "data-testid": "onboarding-backup-next-button" }).props.onClick();
  });

  expect(downloadBackup).toHaveBeenCalledOnce();
  expect(onContinue).toHaveBeenCalledOnce();
});

test("shows pairing code and focused next action in pairing step", () => {
  const copyPairingCode = vi.fn();
  const sendPairRequest = vi.fn();

  const root = render(
    React.createElement(OnboardingPairingStep, {
      clearInlineError: vi.fn(),
      copyPairingCode,
      inlineError: null,
      isSendingPairRequest: false,
      partnerCodeInput: "BEEF-1234",
      pairingCode: "ABCD-1234",
      requestSent: true,
      sendPairRequest,
      setPartnerCodeInput: vi.fn()
    })
  );

  expect(
    root.findByProps({ "data-testid": "onboarding-next-step-card" }).props.children
  ).toBeTruthy();

  act(() => {
    root.findByProps({ "data-testid": "onboarding-copy-pairing-code-button" }).props.onClick();
    root.findByProps({ "data-testid": "onboarding-send-pair-request-button" }).props.onClick();
  });

  expect(copyPairingCode).toHaveBeenCalledOnce();
  expect(sendPairRequest).toHaveBeenCalledOnce();
});

function render(element: React.ReactElement) {
  let renderer: ReactTestRenderer | null = null;
  act(() => {
    renderer = create(element);
  });

  const rendered = renderer as ReactTestRenderer | null;
  if (!rendered) throw new Error("Component did not render");
  return rendered.root;
}
