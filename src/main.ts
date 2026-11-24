import { createInterface } from "node:readline";
import { CliApp } from "./host/cli/CliApp";
import { EditorSession } from "./core/editor/EditorSession";
import { SvgFileStore } from "./adapters/svg/SvgFileStore";
import { SvgCodec } from "./adapters/svg/SvgCodec";
import { createDefaultShapeProviders } from "./host/assembly/DefaultShapes";
import { StatsCommand } from "../plugins/stats/StatsCommand";

const shapeProviders = createDefaultShapeProviders();
const session = new EditorSession(new SvgFileStore(new SvgCodec(shapeProviders)), shapeProviders);
const app = new CliApp(session, [new StatsCommand(() => session.tree())]);
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
