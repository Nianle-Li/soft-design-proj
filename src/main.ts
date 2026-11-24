import { createInterface } from "node:readline";
import { CliApp } from "./host/cli/CliApp";
import { EditorSession } from "./core/editor/EditorSession";
import { SvgFileStore } from "./adapters/svg/SvgFileStore";
import { SvgCodec } from "./adapters/svg/SvgCodec";
import { createDefaultShapeProviders } from "./host/assembly/DefaultShapes";
import { StatsCommand } from "../plugins/stats/StatsCommand";
import { DirCommand } from "../plugins/dir/DirCommand";
import { NodeDirectoryReader } from "../plugins/dir/adapters/NodeDirectoryReader";
import { createDefaultAttributeHandlers } from "./host/assembly/DefaultAttributes";
import { createDefaultTreeDecorators } from "./host/assembly/DefaultTreeDecorators";
import { BoxShapeProvider } from "../plugins/box/BoxShapeProvider";
import { BoxAttributeHandler } from "../plugins/box/BoxAttributeHandler";
import { BoxTypeDecorator } from "../plugins/box/BoxTypeDecorator";

const shapeProviders = createDefaultShapeProviders([new BoxShapeProvider()]);
const attributeHandlers = createDefaultAttributeHandlers([new BoxAttributeHandler()]);
const treeDecorators = createDefaultTreeDecorators([new BoxTypeDecorator()]);
const session = new EditorSession(
  new SvgFileStore(new SvgCodec(shapeProviders, attributeHandlers)),
  shapeProviders,
  attributeHandlers
);
const app = new CliApp(
  session,
  [new StatsCommand(() => session.tree()), new DirCommand(new NodeDirectoryReader())],
  treeDecorators
);
const repl = createInterface({ input: process.stdin, output: process.stdout });

process.stdout.write("svg-editor 0.1 — type 'help' for commands\n\n");
repl.setPrompt("svg> ");
repl.prompt();
repl.on("line", (line) => {
  for (const output of app.runLine(line)) {
    process.stdout.write(`${output}\n`);
  }
  repl.prompt();
});
