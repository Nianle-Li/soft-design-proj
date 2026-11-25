import { describe, expect, it } from "vitest";
import vitestConfig from "../../vitest.config";

interface CoverageConfigView {
  readonly test?: {
    readonly coverage?: {
      readonly include?: readonly string[];
      readonly exclude?: readonly string[];
      readonly thresholds?: Readonly<Record<string, number>>;
    };
  };
}

describe("coverage scope", () => {
  it("measures production source and plugins while excluding only type-only contracts", () => {
    const coverage = (vitestConfig as CoverageConfigView).test?.coverage;

    expect(coverage?.include).toEqual(["src/**/*.ts", "plugins/**/*.ts"]);
    expect(coverage?.exclude).toEqual([
      "src/main.ts",
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
    ]);
    expect(coverage?.thresholds).toEqual({
      statements: 95,
      branches: 90,
      functions: 95,
      lines: 95
    });
  });
});
