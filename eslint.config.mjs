import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: ["coverage/**", "**/dist/**", "**/node_modules/**", "tmp/**"]
  },
  {
    ...eslint.configs.recommended,
    files: ["**/*.{js,mjs,cjs}"]
  },
  ...tseslint.configs.strictTypeChecked.map((config) => ({
    ...config,
    files: [
      "src/**/*.ts",
      "test/**/*.ts",
      "vscode-extension/src/**/*.ts",
      "vscode-extension/test/**/*.ts",
      "vitest.config.ts"
    ]
  })),
  {
    files: [
      "src/**/*.ts",
      "test/**/*.ts",
      "vscode-extension/src/**/*.ts",
      "vscode-extension/test/**/*.ts",
      "vitest.config.ts"
    ],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname
      }
    }
  },
  {
    files: ["vscode-extension/test/**/*.ts"],
    languageOptions: {
      parserOptions: {
        projectService: false,
        project: ["./vscode-extension/tsconfig.test.json"],
        tsconfigRootDir: import.meta.dirname
      }
    }
  },
  {
    files: ["vscode-extension/test-host/**/*.js"],
    languageOptions: {
      globals: {
        require: "readonly",
        exports: "readonly",
        __dirname: "readonly",
        process: "readonly"
      }
    }
  }
);
