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
      include: ["src/**/*.ts", "plugins/**/*.ts"],
      exclude: [
        "src/main.ts",
        // Type-only contracts emit no executable statements.
        "src/core/command/Command.ts",
        "src/core/model/AttributeHandler.ts",
        "src/core/model/ShapeProvider.ts",
        "src/core/model/TreeView.ts",
        "src/core/editor/EditCommand.ts",
        "src/core/editor/DocumentStore.ts",
        "src/core/model/SvgNodeView.ts",
        "src/core/plugin/Plugin.ts",
        "src/core/tree/TreeDecorator.ts",
        "plugins/dir/DirectoryReader.ts"
      ]
    }
  }
});
