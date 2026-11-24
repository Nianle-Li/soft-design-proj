import type { Plugin } from "../../src/core/plugin-api";
import { ModifiedStarDecorator } from "./ModifiedStarDecorator";

export const modifiedStarManifest = {
  name: "@svgframe/plugin-tree-star",
  contributes: { decorators: ["modified-star"] }
} as const;

const modifiedStarPlugin: Plugin = {
  activate(context) {
    context.registerDecorator(new ModifiedStarDecorator());
  }
};

export default modifiedStarPlugin;
