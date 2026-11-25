import { SvgCodec } from "../../adapters/svg/SvgCodec";
import { SvgFileStore } from "../../adapters/svg/SvgFileStore";
import { EditorSession } from "../../core/editor/EditorSession";
import { CliApp } from "../cli/CliApp";
import { codePluginInstallations } from "./CodePlugins";
import { createDefaultAttributeHandlers } from "./DefaultAttributes";
import { createDefaultShapeProviders } from "./DefaultShapes";
import { createDefaultTreeDecorators } from "./DefaultTreeDecorators";
import { PluginInstaller, type PluginInstallation } from "./PluginInstaller";
import { PluginLoader } from "./PluginLoader";

export interface ApplicationStartup {
  readonly app: CliApp;
  readonly errors: readonly string[];
}

/** Builds the complete code-selected application while hiding its construction order. */
export function createCodeApplication(
  plugins: readonly PluginInstallation[] = codePluginInstallations
): CliApp {
  const assembly = new ApplicationAssembly();
  for (const plugin of plugins) assembly.installer.install(plugin);
  return assembly.build();
}

/** Builds only successfully configured plugins; invalid config falls back to built-ins. */
export async function createConfiguredApplication(configPath: string): Promise<ApplicationStartup> {
  const assembly = new ApplicationAssembly();
  const errors = await new PluginLoader(assembly.installer).load(configPath);
  return { app: assembly.build(), errors };
}

class ApplicationAssembly {
  private readonly state: { session?: EditorSession } = {};
  readonly installer = new PluginInstaller({
    tree: () => {
      if (this.state.session === undefined) throw new Error("application assembly is incomplete");
      return this.state.session.tree();
    }
  });

  build(): CliApp {
    const contributions = this.installer.contributions();
    const shapeProviders = createDefaultShapeProviders(contributions.shapes);
    const attributeHandlers = createDefaultAttributeHandlers(contributions.attributes);
    const treeDecorators = createDefaultTreeDecorators(contributions.decorators);
    this.state.session = new EditorSession(
      new SvgFileStore(new SvgCodec(shapeProviders, attributeHandlers)),
      shapeProviders,
      attributeHandlers
    );
    return new CliApp(this.state.session, contributions.commands, treeDecorators);
  }
}
