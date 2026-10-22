import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    pool: "forks",
    poolOptions: {
      forks: {
        singleFork: true
      }
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/**/*.ts"],
      exclude: ["src/main.ts", "src/**/TreeView.ts", "src/editor/EditCommand.ts"]
    }
  }
});
