import type { Plugin } from "../../src/core/plugin-api";
import { DiamondShapeProvider } from "./DiamondShapeProvider";

export const diamondManifest = {
  name: "@svgframe/plugin-shape-diamond",
  contributes: { shapes: ["diamond"] }
} as const;

const diamondPlugin: Plugin = {
  activate(context) {
    context.registerShape(new DiamondShapeProvider());
  }
};

export default diamondPlugin;
