import type { Plugin } from "../../src/core/plugin-api";
import { BoxAttributeHandler } from "./BoxAttributeHandler";
import { BoxShapeProvider } from "./BoxShapeProvider";
import { BoxTypeDecorator } from "./BoxTypeDecorator";

export const boxManifest = {
  name: "@svgframe/plugin-shape-box",
  contributes: {
    shapes: ["box"],
    attributes: ["box-attributes"],
    decorators: ["box-type-label"]
  }
} as const;

const boxPlugin: Plugin = {
  activate(context) {
    context.registerShape(new BoxShapeProvider());
    context.registerAttribute(new BoxAttributeHandler());
    context.registerDecorator(new BoxTypeDecorator());
  }
};

export default boxPlugin;
