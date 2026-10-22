import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import process from "node:process";
import ts from "typescript";

const sourceRoot = resolve("src");
const allowed = new Map([
  ["model", new Set(["model"])],
  ["editor", new Set(["editor", "model"])],
  ["svg", new Set(["svg", "editor", "model"])],
  ["cli", new Set(["cli", "editor"])],
  ["main", new Set(["main", "model", "editor", "svg", "cli"])]
]);

function filesUnder(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? filesUnder(path) : path.endsWith(".ts") ? [path] : [];
  });
}

function moduleOf(path) {
  const parts = relative(sourceRoot, path).split(sep);
  return parts.length === 1 ? "main" : parts[0];
}

const violations = [];
let checked = 0;

for (const file of filesUnder(sourceRoot)) {
  const from = moduleOf(file);
  const source = ts.createSourceFile(
    file,
    readFileSync(file, "utf8"),
    ts.ScriptTarget.Latest,
    true
  );

  function inspect(node) {
    const declaration = ts.isImportDeclaration(node) || ts.isExportDeclaration(node);
    const specifier = declaration ? node.moduleSpecifier : undefined;
    if (specifier && ts.isStringLiteral(specifier) && specifier.text.startsWith(".")) {
      const target = resolve(dirname(file), specifier.text);
      const targetRelative = relative(sourceRoot, target);
      const to = moduleOf(target);
      checked += 1;
      if (targetRelative.startsWith("..") || !allowed.get(from)?.has(to)) {
        violations.push(`${relative(process.cwd(), file)}: ${from} -> ${to} (${specifier.text})`);
      }
    }
    ts.forEachChild(node, inspect);
  }

  inspect(source);
}

if (violations.length > 0) {
  process.stderr.write(`Dependency rule violations:\n${violations.join("\n")}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(`Dependency rules PASS (${checked} local imports checked).\n`);
}
