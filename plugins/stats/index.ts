import type { Plugin } from "../../src/core/plugin-api";
import { StatsCommand } from "./StatsCommand";

export const statsManifest = {
  name: "@svgframe/plugin-stats",
  contributes: { commands: ["stats"] }
} as const;

const statsPlugin: Plugin = {
  activate(context) {
    context.registerCommand(new StatsCommand(context.tree));
  }
};

export default statsPlugin;
