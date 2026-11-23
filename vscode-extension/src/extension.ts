import * as vscode from "vscode";
import { shouldMarkSvgFile, SVG_FILE_BADGE } from "./SvgFileMarker";
import { parseSvgOutline, type OutlineNode } from "./SvgOutline";

class SvgFileDecorationProvider implements vscode.FileDecorationProvider {
  async provideFileDecoration(uri: vscode.Uri): Promise<vscode.FileDecoration | undefined> {
    const matches = await shouldMarkSvgFile(
      uri,
      async () => (await vscode.workspace.fs.stat(uri)).type
    );
    if (!matches) return undefined;
    const decoration = new vscode.FileDecoration(SVG_FILE_BADGE, "SVG file");
    decoration.propagate = false;
    return decoration;
  }
}

class SvgDocumentSymbolProvider implements vscode.DocumentSymbolProvider {
  provideDocumentSymbols(document: vscode.TextDocument): vscode.DocumentSymbol[] {
    const toSymbol = (node: OutlineNode): vscode.DocumentSymbol => {
      const range = new vscode.Range(
        document.positionAt(node.start),
        document.positionAt(node.end)
      );
      const selectionRange = new vscode.Range(
        document.positionAt(node.start),
        document.positionAt(node.selectionEnd)
      );
      const symbol = new vscode.DocumentSymbol(
        node.name,
        "",
        node.children.length ? vscode.SymbolKind.Namespace : vscode.SymbolKind.Object,
        range,
        selectionRange
      );
      symbol.children.push(...node.children.map(toSymbol));
      return symbol;
    };
    return parseSvgOutline(document.getText()).map(toSymbol);
  }
}

export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.window.registerFileDecorationProvider(new SvgFileDecorationProvider()),
    vscode.languages.registerDocumentSymbolProvider(
      { scheme: "file", pattern: "**/*.svg" },
      new SvgDocumentSymbolProvider()
    )
  );
}
