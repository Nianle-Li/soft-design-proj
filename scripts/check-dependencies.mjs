import { existsSync, readdirSync, readFileSync } from "node:fs";
import { isBuiltin } from "node:module";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import process from "node:process";
import ts from "typescript";

const sourceRoot = resolve(process.argv[2] ?? "src");
const pluginsRoot = resolve(sourceRoot, "../plugins");
const allowed = new Map([
  ["model", new Set(["model", "core/model"])],
  ["core/model", new Set(["core/model"])],
  ["core/editor", new Set(["core/editor", "core/model", "model"])],
  ["core/command", new Set(["core/command", "core/editor", "core/model"])],
  ["core/tree", new Set(["core/tree", "core/model"])],
  [
    "core/plugin-api",
    new Set(["core/plugin-api", "core/model", "core/editor", "core/command", "core/tree"])
  ],
  ["host/cli", new Set(["host/cli", "core/model", "core/editor", "core/command", "core/tree"])],
  [
    "host/assembly",
    new Set([
      "host/assembly",
      "host/cli",
      "core/model",
      "core/editor",
      "core/command",
      "core/tree",
      "adapters/svg",
      "builtin/shapes",
      "model"
    ])
  ],
  ["adapters/svg", new Set(["adapters/svg", "core/model", "core/editor", "model"])],
  ["builtin/shapes", new Set(["builtin/shapes", "core/plugin-api"])],
  ["main", new Set(["main", "host/cli", "host/assembly", "adapters/svg", "core/editor", "model"])]
]);
const approvedPackages = new Map([["@xmldom/xmldom", new Set(["adapters/svg"])]]);
const approvedNodeApis = new Map([
  ["node:crypto", new Set(["adapters/svg"])],
  ["node:fs", new Set(["adapters/svg", "host/assembly"])],
  ["node:path", new Set(["adapters/svg", "host/assembly"])],
  ["node:url", new Set(["host/assembly"])],
  ["node:module", new Set(["host/assembly"])],
  ["node:readline", new Set(["main", "host/cli"])]
]);

function filesUnder(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      return ["node_modules", "dist", "coverage"].includes(entry.name) ? [] : filesUnder(path);
    }
    return /\.(?:[cm]?[jt]s|[jt]sx)$/u.test(path) ? [path] : [];
  });
}

function partsWithin(root, path) {
  const pathFromRoot = relative(root, path);
  if (
    pathFromRoot === "" ||
    pathFromRoot === ".." ||
    pathFromRoot.startsWith(`..${sep}`) ||
    isAbsolute(pathFromRoot)
  ) {
    return undefined;
  }
  return pathFromRoot.split(sep);
}

function moduleOf(path) {
  const sourceParts = partsWithin(sourceRoot, path);
  if (sourceParts !== undefined) {
    const [first, second] = sourceParts;
    if (sourceParts.length === 1) return first === "main.ts" ? "main" : undefined;
    if (first === "model") return first;
    if (
      first === "core" &&
      ["plugin-api", "plugin-api.ts"].includes(second) &&
      sourceParts.length === 2
    ) {
      return "core/plugin-api";
    }
    if (first === "core" && ["model", "editor", "command", "tree"].includes(second)) {
      return `core/${second}`;
    }
    if (first === "host" && ["cli", "assembly"].includes(second)) return `host/${second}`;
    if (first === "adapters" && second === "svg") return "adapters/svg";
    if (first === "builtin" && second === "shapes") return "builtin/shapes";
    return undefined;
  }
  const pluginParts = partsWithin(pluginsRoot, path);
  return pluginParts !== undefined && pluginParts.length > 1
    ? `plugins/${pluginParts[0]}`
    : undefined;
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

function isPlugin(module) {
  return module?.startsWith("plugins/") ?? false;
}

function allowsDependency(from, to) {
  if (isPlugin(from)) return to === from || to === "core/plugin-api";
  if (from === "main" && isPlugin(to)) return true;
  if (from === "host/assembly" && isPlugin(to)) return true;
  return allowed.get(from)?.has(to) ?? false;
}

function declaredPluginPackage(from, specifier) {
  const packageName = specifier.startsWith("@")
    ? specifier.split("/").slice(0, 2).join("/")
    : specifier.split("/")[0];
  const manifestPath = join(pluginsRoot, from.slice("plugins/".length), "package.json");
  if (!existsSync(manifestPath)) return false;
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  return ["dependencies", "peerDependencies", "optionalDependencies"].some((section) =>
    Object.hasOwn(manifest[section] ?? {}, packageName)
  );
}

function isPluginLoader(file) {
  return relative(sourceRoot, file).split(sep).join("/") === "host/assembly/PluginLoader.ts";
}

function isPluginAdapter(file) {
  const parts = partsWithin(pluginsRoot, file);
  return parts !== undefined && parts[1] === "adapters" && parts.length > 2;
}

const violations = [];
let localImports = 0;
let externalImports = 0;

const sourceFiles = filesUnder(sourceRoot);
const pluginFiles = existsSync(pluginsRoot) ? filesUnder(pluginsRoot) : [];
for (const file of [...sourceFiles, ...pluginFiles]) {
  const from = moduleOf(file);
  const location = relative(process.cwd(), file).replaceAll("\\", "/");
  if (!allowed.has(from) && !isPlugin(from)) {
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
      const to = moduleOf(target);
      if (isPluginLoader(file) && isPlugin(to)) {
        violations.push(`${location}: loader cannot import a concrete plugin (${specifier})`);
      } else if (!allowsDependency(from, to)) {
        violations.push(`${location}: ${from} -> ${to ?? "outside"} (${specifier})`);
      } else if (from === "adapters/svg" && to === "core/editor") {
        const portPath = relative(sourceRoot, target)
          .split(sep)
          .join("/")
          .replace(/\.(?:ts|js)$/u, "");
        if (portPath !== "core/editor/DocumentStore" || !isStoragePortTypeImport(node)) {
          violations.push(
            `${location}: ${from} -> ${portPath} must be a type-only DocumentStore import`
          );
        }
      }
      return;
    }

    externalImports += 1;
    if (isBuiltin(specifier)) {
      const api = specifier.startsWith("node:") ? specifier : `node:${specifier}`;
      if (
        (isPlugin(from) && !isPluginAdapter(file)) ||
        (!isPlugin(from) && !approvedNodeApis.get(api)?.has(from))
      ) {
        violations.push(`${location}: Node API ${specifier} is not allowed in ${from}`);
      }
    } else if (isPlugin(from)) {
      if (!declaredPluginPackage(from, specifier)) {
        violations.push(`${location}: undeclared plugin package ${specifier}`);
      }
    } else if (!approvedPackages.get(specifier)?.has(from)) {
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
      } else if (!(node.expression.kind === ts.SyntaxKind.ImportKeyword && isPluginLoader(file))) {
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
