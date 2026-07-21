import React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { BackupImportStep } from "./BackupImportStep";

function renderStep(props: Partial<React.ComponentProps<typeof BackupImportStep>> = {}) {
  let renderer: ReactTestRenderer | null = null;
  const backupFileInputRef = { current: null };
  const mergedProps: React.ComponentProps<typeof BackupImportStep> = {
    backupFileInputRef,
    backupFileName: null,
    backupText: "",
    clearBackupFileSelection: vi.fn(),
    importSuccessVisible: false,
    onBack: vi.fn(),
    selectBackupFile: vi.fn(),
    setBackupText: vi.fn(),
    submitBackupImport: vi.fn(() => Promise.resolve()),
    ...props
  };

  act(() => {
    renderer = create(React.createElement(BackupImportStep, mergedProps));
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

test("renders success message only after a valid import", () => {
  const hidden = renderStep({ importSuccessVisible: false });
  expect(() => hidden.root.findByProps({ "data-testid": "backup-import-success" })).toThrow();

  const visible = renderStep({ importSuccessVisible: true });
  expect(visible.root.findByProps({ "data-testid": "backup-import-success" })).toBeTruthy();
});

test("wires text input, submit, back, and selected-file clearing", () => {
  const { props, root } = renderStep({ backupFileName: "backup.json", backupText: "{}" });

  act(() => {
    root.findByProps({ "data-testid": "backup-import-textarea" }).props.onChange({
      target: { value: '{ "ok": true }' }
    });
    root.findByProps({ "data-testid": "backup-import-submit-button" }).props.onClick();
    root.findByProps({ "data-testid": "backup-import-back-button" }).props.onClick();
    root.findByProps({ "data-testid": "backup-file-clear-button" }).props.onClick();
  });

  expect(props.setBackupText).toHaveBeenCalledWith('{ "ok": true }');
  expect(props.submitBackupImport).toHaveBeenCalledOnce();
  expect(props.onBack).toHaveBeenCalledOnce();
  expect(props.clearBackupFileSelection).toHaveBeenCalledOnce();
});

test("passes selected backup file to the import model", () => {
  const { props, root } = renderStep();
  const file = new File(["{}"], "backup.json", { type: "application/json" });

  act(() => {
    root.findByProps({ "data-testid": "backup-file-input" }).props.onChange({
      currentTarget: { files: [file] }
    });
  });

  expect(props.selectBackupFile).toHaveBeenCalledWith(file);
});
