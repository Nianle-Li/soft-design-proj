import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import process from "node:process";
import ts from "typescript";

const sourceRoot = resolve(process.argv[2] ?? "src");
const allowed = new Map([
  ["model", new Set(["model"])],
  ["editor", new Set(["editor", "model"])],
  ["svg", new Set(["svg", "editor", "model"])],
  ["cli", new Set(["cli", "editor"])],
  ["main", new Set(["main", "model", "editor", "svg", "cli"])]
]);
const approvedPackages = new Map([["@xmldom/xmldom", "svg"]]);
const approvedNodeApis = new Map([
  ["node:crypto", "svg"],
  ["node:fs", "svg"],
  ["node:path", "svg"],
  ["node:readline", "main"]
]);

function filesUnder(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? filesUnder(path) : path.endsWith(".ts") ? [path] : [];
  });
}

function moduleOf(path) {
  const parts = relative(sourceRoot, path).split(sep);
  return parts.length === 1 ? (parts[0] === "main.ts" ? "main" : undefined) : parts[0];
}

function isStoragePortTypeImport(node) {
  if (!ts.isImportDeclaration(node)) return false;
  const clause = node.importClause;
  if (
    clause === undefined ||
    clause.name !== undefined ||
    clause.namedBindings === undefined ||
    !ts.isNamedImports(clause.namedBindings) ||
    clause.namedBindings.elements.length === 0
  ) {
    return false;
  }
  return clause.namedBindings.elements.every(
    (element) =>
      (clause.isTypeOnly || element.isTypeOnly) &&
      (element.propertyName ?? element.name).text === "DocumentStore"
  );
}

const violations = [];
let localImports = 0;
let externalImports = 0;

for (const file of filesUnder(sourceRoot)) {
  const from = moduleOf(file);
  const location = relative(process.cwd(), file).replaceAll("\\", "/");
  if (!allowed.has(from)) {
    violations.push(`${location}: unknown source module`);
    continue;
  }
  const source = ts.createSourceFile(
    file,
    readFileSync(file, "utf8"),
    ts.ScriptTarget.Latest,
    true
  );

  function checkSpecifier(specifier, node) {
    if (specifier.startsWith(".")) {
      localImports += 1;
      const target = resolve(dirname(file), specifier);
      const targetRelative = relative(sourceRoot, target).split(sep).join("/");
      const to = moduleOf(target);
      if (targetRelative.startsWith("..") || !allowed.get(from)?.has(to)) {
        violations.push(`${location}: ${from} -> ${to ?? "outside"} (${specifier})`);
      } else if (from === "svg" && to === "editor") {
        const portPath = targetRelative.replace(/\.(?:ts|js)$/u, "");
        if (portPath !== "editor/DocumentStore" || !isStoragePortTypeImport(node)) {
          violations.push(
            `${location}: svg -> ${portPath} must be a type-only DocumentStore import`
          );
        }
      }
      return;
    }

    externalImports += 1;
    if (specifier.startsWith("node:")) {
      if (approvedNodeApis.get(specifier) !== from) {
        violations.push(`${location}: Node API ${specifier} is not allowed in ${from}`);
      }
    } else if (approvedPackages.get(specifier) !== from) {
      violations.push(`${location}: third-party package ${specifier} is not allowed in ${from}`);
    }
  }

  function inspect(node) {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
      const specifier = node.moduleSpecifier;
      if (specifier && ts.isStringLiteralLike(specifier)) {
        checkSpecifier(specifier.text, node);
      }
    } else if (ts.isImportEqualsDeclaration(node)) {
      const reference = node.moduleReference;
      if (ts.isExternalModuleReference(reference) && reference.expression) {
        if (ts.isStringLiteralLike(reference.expression)) {
          checkSpecifier(reference.expression.text, node);
        }
      }
    } else if (ts.isImportTypeNode(node)) {
      if (ts.isLiteralTypeNode(node.argument) && ts.isStringLiteralLike(node.argument.literal)) {
        checkSpecifier(node.argument.literal.text, node);
      }
    } else if (
      ts.isCallExpression(node) &&
      (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
        (ts.isIdentifier(node.expression) && node.expression.text === "require"))
    ) {
      const [argument] = node.arguments;
      if (argument && ts.isStringLiteralLike(argument)) {
        checkSpecifier(argument.text, node);
      } else {
        violations.push(`${location}: dynamic module path cannot be checked`);
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
  process.stdout.write(
    `Dependency rules PASS (${localImports} local imports, ${externalImports} external imports checked).\n`
  );
}
