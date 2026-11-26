import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import process from "node:process";
import ts from "typescript";

const options = parseArguments(process.argv.slice(2));
const base = options.base ?? "final";
const target = options.target ?? "p2";
const targetLabel = options.targetLabel ?? target;
const output = resolve(options.output ?? "docs/metrics/metrics.md");

assertRef(base);
assertRef(target);
const baseMetrics = metricsFor(base);
const targetMetrics = metricsFor(target);
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, render(base, targetLabel, baseMetrics, targetMetrics), "utf8");
process.stdout.write(`Metrics written to ${output}\n`);

function parseArguments(arguments_) {
  const parsed = {};
  for (let index = 0; index < arguments_.length; index += 2) {
    const flag = arguments_[index];
    const value = arguments_[index + 1];
    if (
      value === undefined ||
      !["--base", "--target", "--target-label", "--output"].includes(flag)
    ) {
      throw new Error(
        "usage: generate-metrics [--base <ref>] [--target <ref>] [--target-label <name>] [--output <path>]"
      );
    }
    parsed[flag === "--target-label" ? "targetLabel" : flag.slice(2)] = value;
  }
  return parsed;
}

function git(...arguments_) {
  return execFileSync("git", arguments_, { cwd: process.cwd(), encoding: "utf8" });
}

function assertRef(ref) {
  try {
    git("rev-parse", "--verify", `${ref}^{commit}`);
  } catch {
    throw new Error(`missing metrics ref: ${ref}`);
  }
}

function metricsFor(ref) {
  const paths = git("ls-tree", "-r", "--name-only", ref)
    .split(/\r?\n/u)
    .filter((path) => sourceCategory(path) !== undefined);
  return paths.map((path) => {
    const source = git("show", `${ref}:${path}`);
    return {
      path,
      category: sourceCategory(path),
      lines: physicalLines(source),
      complexity: cyclomaticComplexity(path, source)
    };
  });
}

function sourceCategory(path) {
  if (/^vscode-extension\/src\/.*\.(?:[cm]?[jt]s|[jt]sx)$/u.test(path)) return "vscode";
  if (/^(?:src\/core|src\/model|src\/editor)\/.*\.ts$/u.test(path)) return "core";
  if (/^(?:src\/host|src\/adapters|src\/cli|src\/svg)\/.*\.ts$/u.test(path)) {
    return "assembly";
  }
  if (path === "src/main.ts") return "assembly";
  if (/^(?:src\/builtin|plugins)\/.*\.ts$/u.test(path)) return "plugin";
  return undefined;
}

function physicalLines(source) {
  if (source === "") return 0;
  return source.endsWith("\n") ? source.split("\n").length - 1 : source.split("\n").length;
}

function cyclomaticComplexity(path, source) {
  const kind = path.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const file = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, kind);
  let complexity = 0;
  const visit = (node) => {
    if (
      ts.isFunctionDeclaration(node) ||
      ts.isFunctionExpression(node) ||
      ts.isArrowFunction(node) ||
      ts.isMethodDeclaration(node) ||
      ts.isGetAccessorDeclaration(node) ||
      ts.isSetAccessorDeclaration(node) ||
      ts.isConstructorDeclaration(node)
    ) {
      complexity += 1;
    } else if (
      ts.isIfStatement(node) ||
      ts.isForStatement(node) ||
      ts.isForInStatement(node) ||
      ts.isForOfStatement(node) ||
      ts.isWhileStatement(node) ||
      ts.isDoStatement(node) ||
      ts.isCatchClause(node) ||
      ts.isConditionalExpression(node) ||
      (ts.isCaseClause(node) && node.expression !== undefined) ||
      (ts.isBinaryExpression(node) &&
        [
          ts.SyntaxKind.AmpersandAmpersandToken,
          ts.SyntaxKind.BarBarToken,
          ts.SyntaxKind.QuestionQuestionToken
        ].includes(node.operatorToken.kind))
    ) {
      complexity += 1;
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  return complexity;
}

function render(baseRef, targetRef, baseFiles, targetFiles) {
  const categories = ["core", "assembly", "plugin", "vscode"];
  const labels = {
    core: "CLI 内核",
    assembly: "装配与技术支持",
    plugin: "内置及可选插件",
    vscode: "VSCode 扩展（单列）"
  };
  const summary = categories.map((category) => {
    const before = aggregate(baseFiles, category);
    const after = aggregate(targetFiles, category);
    return `| ${labels[category]} | ${before.files} | ${after.files} | ${signed(after.files - before.files)} | ${before.lines} | ${after.lines} | ${signed(after.lines - before.lines)} | ${before.complexity} | ${after.complexity} | ${signed(after.complexity - before.complexity)} |`;
  });
  const inventory = targetFiles
    .map(
      (file) =>
        `| \`${file.path}\` | ${labels[file.category]} | ${responsibility(file.category)} | ${file.lines} | ${file.complexity} |`
    )
    .join("\n");
  return `# Phase 2 可复现指标

- 基线：\`${baseRef}\`
- 目标：\`${targetRef}\`
- 行数：Git 中源文件的物理行数。
- 圈复杂度：每个函数/方法基数 1，加 if、循环、catch、case、条件表达式及逻辑短路分支。
- 历史目录映射：\`src/model\`、\`src/editor\` 归内核；\`src/cli\`、\`src/svg\` 归装配。VSCode 始终单列。

## 汇总

| 分类 | 基线文件 | 目标文件 | Δ文件 | 基线行数 | 目标行数 | Δ行数 | 基线复杂度 | 目标复杂度 | Δ复杂度 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
${summary.join("\n")}

## 目标文件清单与职责

| 文件 | 分类 | 职责 | 行数 | 圈复杂度 |
| --- | --- | --- | ---: | ---: |
${inventory}
`;
}

function aggregate(files, category) {
  const selected = files.filter((file) => file.category === category);
  return {
    files: selected.length,
    lines: selected.reduce((sum, file) => sum + file.lines, 0),
    complexity: selected.reduce((sum, file) => sum + file.complexity, 0)
  };
}

function responsibility(category) {
  return {
    core: "领域规则、编辑历史或扩展契约",
    assembly: "CLI、持久化适配或应用装配",
    plugin: "具体图形、命令、标签或插件适配器",
    vscode: "编辑器标记与大纲实践"
  }[category];
}

function signed(value) {
  return value > 0 ? `+${value}` : String(value);
}
