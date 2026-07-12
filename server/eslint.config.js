import js from "@eslint/js";
import globals from "globals";
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
  globalIgnores(["dist/**", "node_modules/**", "*.tsbuildinfo"]),
  {
    files: ["src/**/*.ts"],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    rules: tsRules,
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: "module",
      globals: globals.node
    }
  },
  prettier
]);
