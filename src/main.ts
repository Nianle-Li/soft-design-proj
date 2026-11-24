import { createInterface } from "node:readline";
import {
  createCodeApplication,
  createConfiguredApplication
} from "./host/assembly/ApplicationAssembly";

async function start(): Promise<void> {
  const configPath = process.argv[2] === "--config" ? (process.argv[3] ?? "") : undefined;
  const startup =
    configPath === undefined
      ? { app: createCodeApplication(), errors: [] }
      : await createConfiguredApplication(configPath);
  const repl = createInterface({ input: process.stdin, output: process.stdout });

  process.stdout.write("svg-editor 0.1 — type 'help' for commands\n\n");
  for (const error of startup.errors) process.stdout.write(`${error}\n`);
  repl.setPrompt("svg> ");
  repl.prompt();
  repl.on("line", (line) => {
    for (const output of startup.app.runLine(line)) {
      process.stdout.write(`${output}\n`);
    }
    repl.prompt();
  });
}

void start();
