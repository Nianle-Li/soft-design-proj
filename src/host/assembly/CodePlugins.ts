import boxPlugin, { boxManifest } from "../../../plugins/box/index";
import dirPlugin, { dirManifest } from "../../../plugins/dir/index";
import statsPlugin, { statsManifest } from "../../../plugins/stats/index";
import { PluginInstaller } from "./PluginInstaller";

/** The single change point for optional plugins selected by code assembly. */
export function installCodePlugins(installer: PluginInstaller): void {
  installer.install({ ...boxManifest, plugin: boxPlugin });
  installer.install({ ...statsManifest, plugin: statsPlugin });
  installer.install({ ...dirManifest, plugin: dirPlugin });
}
