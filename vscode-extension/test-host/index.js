const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const vscode = require("vscode");

exports.run = async () => {
  const extension = vscode.extensions.getExtension("sw-design-lab.svg-lab-outline");
  assert.ok(extension, "development extension is available");
  await extension.activate();

  const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "svg-lab-host-"));
  assert.equal(path.dirname(temporaryDirectory), os.tmpdir());
  const file = path.join(temporaryDirectory, "example.svg");
  const otherFile = path.join(temporaryDirectory, "other.txt");
  try {
    const source = '<svg>\n  <g id="flow">\n    <rect id="old"/>\n  </g>\n</svg>';
    fs.writeFileSync(file, source, "utf8");
    fs.writeFileSync(otherFile, source, "utf8");
    const otherDocument = await vscode.workspace.openTextDocument(vscode.Uri.file(otherFile));
    const otherSymbols =
      (await vscode.commands.executeCommand(
        "vscode.executeDocumentSymbolProvider",
        otherDocument.uri
      )) ?? [];
    assert.deepEqual(otherSymbols, []);
    const document = await vscode.workspace.openTextDocument(vscode.Uri.file(file));
    const symbols = async () =>
      (await vscode.commands.executeCommand(
        "vscode.executeDocumentSymbolProvider",
        document.uri
      )) ?? [];

    const initial = await symbols();
    assert.equal(initial[0]?.name, "svg");
    assert.equal(initial[0]?.children[0]?.name, "g#flow");
    assert.equal(initial[0]?.children[0]?.children[0]?.name, "rect#old");
    assert.equal(initial[0]?.children[0]?.children[0]?.selectionRange.start.line, 2);
    assert.equal(initial[0]?.children[0]?.children[0]?.selectionRange.start.character, 4);

    const edit = new vscode.WorkspaceEdit();
    edit.replace(document.uri, new vscode.Range(2, 14, 2, 17), "new");
    assert.equal(await vscode.workspace.applyEdit(edit), true);
    const updated = await symbols();
    assert.equal(updated[0]?.children[0]?.children[0]?.name, "rect#new");

    const incomplete = new vscode.WorkspaceEdit();
    incomplete.delete(document.uri, new vscode.Range(3, 2, 3, 6));
    assert.equal(await vscode.workspace.applyEdit(incomplete), true);
    assert.deepEqual(await symbols(), []);
    if (process.env.SVG_LAB_TEST_REPORT) {
      fs.writeFileSync(process.env.SVG_LAB_TEST_REPORT, "host assertions passed\n", "utf8");
    }
  } finally {
    fs.rmSync(temporaryDirectory, { recursive: true, force: true });
  }
};
