const fs = require("node:fs");
const path = require("node:path");
const vscode = require("vscode");

exports.run = async () => {
  const document = await vscode.workspace.openTextDocument(
    vscode.Uri.file(path.join(__dirname, "..", "sample", "example.svg"))
  );
  const symbols =
    (await vscode.commands.executeCommand("vscode.executeDocumentSymbolProvider", document.uri)) ??
    [];
  const report = {
    languageId: document.languageId,
    symbols: symbols.map((symbol) => ({
      name: symbol.name,
      children: symbol.children?.map((child) => child.name) ?? []
    })),
    thirdPartySvgExtensions: vscode.extensions.all
      .filter((extension) => !extension.packageJSON.isBuiltin && /svg/i.test(extension.id))
      .map((extension) => extension.id)
  };
  fs.writeFileSync(process.env.SVG_LAB_TEST_REPORT, JSON.stringify(report, null, 2), "utf8");
};
