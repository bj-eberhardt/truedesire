import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";
import { defineConfig, globalIgnores } from "eslint/config";

const tsRules = {
  "@typescript-eslint/no-explicit-any": "off",
  "@typescript-eslint/no-unused-vars": [
    "error",
    { argsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_", varsIgnorePattern: "^_" }
  ]
};

export default defineConfig([
  globalIgnores([
    "dist/**",
    "server/**",
    "server/dist/**",
    "node_modules/**",
    "playwright-report/**",
    "test-results/**",
    "*.tsbuildinfo"
  ]),
  {
    files: ["src/**/*.{ts,tsx}"],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite
    ],
    rules: {
      ...tsRules,
      "react-hooks/set-state-in-effect": "off"
    },
    languageOptions: {
      ecmaVersion: 2023,
      globals: globals.browser
    }
  },
  {
    files: [
      "server/src/**/*.ts",
      "scripts/**/*.mjs",
      "*.config.ts",
      "*.config.js",
      "eslint.config.js"
    ],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    rules: tsRules,
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: "module",
      globals: globals.node
    }
  },
  {
    files: ["tests/**/*.ts", "playwright.config.ts"],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    rules: tsRules,
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: "module",
      globals: { ...globals.browser, ...globals.node }
    }
  },
  prettier
]);
