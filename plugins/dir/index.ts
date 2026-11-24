import type { Plugin } from "../../src/core/plugin-api";
import { NodeDirectoryReader } from "./adapters/NodeDirectoryReader";
import { DirCommand } from "./DirCommand";

export const dirManifest = {
  name: "@svgframe/plugin-dir",
  contributes: { commands: ["dir"] }
} as const;

const dirPlugin: Plugin = {
  activate(context) {
    context.registerCommand(new DirCommand(new NodeDirectoryReader()));
  }
};

export default dirPlugin;
