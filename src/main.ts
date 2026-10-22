import { createInterface } from "node:readline";
import { CliApp } from "./cli/CliApp";
import { EditorSession } from "./editor/EditorSession";
import { SvgFileStore } from "./svg/SvgFileStore";

const app = new CliApp(new EditorSession(new SvgFileStore()));
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
