import { SvgCodec } from "../../adapters/svg/SvgCodec";
import { SvgFileStore } from "../../adapters/svg/SvgFileStore";
import { EditorSession } from "../../core/editor/EditorSession";
import { CliApp } from "../cli/CliApp";
import { installCodePlugins } from "./CodePlugins";
import { createDefaultAttributeHandlers } from "./DefaultAttributes";
import { createDefaultShapeProviders } from "./DefaultShapes";
import { createDefaultTreeDecorators } from "./DefaultTreeDecorators";
import { PluginInstaller } from "./PluginInstaller";

/** Builds the complete code-selected application while hiding its construction order. */
export function createCodeApplication(): CliApp {
  const application: { session?: EditorSession } = {};
  const installer = new PluginInstaller({
    tree: () => {
      if (application.session === undefined) throw new Error("application assembly is incomplete");
      return application.session.tree();
    }
  });
  installCodePlugins(installer);
  const contributions = installer.contributions();
  const shapeProviders = createDefaultShapeProviders(contributions.shapes);
  const attributeHandlers = createDefaultAttributeHandlers(contributions.attributes);
  const treeDecorators = createDefaultTreeDecorators(contributions.decorators);
  application.session = new EditorSession(
    new SvgFileStore(new SvgCodec(shapeProviders, attributeHandlers)),
    shapeProviders,
    attributeHandlers
  );
  return new CliApp(application.session, contributions.commands, treeDecorators);
}
