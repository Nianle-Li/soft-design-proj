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
      exclude: [
        "src/main.ts",
        // Type-only contracts emit no executable statements.
        "src/**/TreeView.ts",
        "src/editor/EditCommand.ts",
        "src/editor/DocumentStore.ts",
        "src/model/ShapeSpec.ts",
        "src/model/SvgNodeView.ts"
      ]
    }
  }
});
