import boxPlugin, { boxManifest } from "../../../plugins/box/index";
import dirPlugin, { dirManifest } from "../../../plugins/dir/index";
import statsPlugin, { statsManifest } from "../../../plugins/stats/index";
import type { PluginInstallation } from "./PluginInstaller";

/** The single change point for optional plugins selected by code assembly. */
export const codePluginInstallations: readonly PluginInstallation[] = [
  { ...boxManifest, plugin: boxPlugin },
  { ...statsManifest, plugin: statsPlugin },
  { ...dirManifest, plugin: dirPlugin }
];
