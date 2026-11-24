import { createInterface } from "node:readline";
import { createCodeApplication } from "./host/assembly/ApplicationAssembly";

const app = createCodeApplication();
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
