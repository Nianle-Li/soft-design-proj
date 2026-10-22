import type { ShapeView, TreeView } from "../editor/TreeView";

/** CLI-only tree glyphs and column alignment. */
export class TreeFormatter {
  format(tree: TreeView, selected = false): string[] {
    if (selected) {
      const root = tree.roots[0];
      if (root === undefined) {
        return [];
      }
      return [this.line(root, root.label.length + 1), ...this.children(root.children, "", 1)];
    }
    return [
      `svg (${String(tree.width)}x${String(tree.height)})`,
      ...this.children(tree.roots, "", 0)
    ];
  }

  private children(nodes: readonly ShapeView[], prefix: string, depth: number): string[] {
    const lines: string[] = [];
    const longest = Math.max(0, ...nodes.map((node) => node.label.length));
    const column = Math.max(depth === 0 ? 15 : 11, longest + 1);

    nodes.forEach((node, index) => {
      const last = index === nodes.length - 1;
      lines.push(`${prefix}${last ? "└──" : "├──"} ${this.line(node, column)}`);
      lines.push(...this.children(node.children, `${prefix}${last ? "    " : "│   "}`, depth + 1));
    });
    return lines;
  }

  private line(node: ShapeView, column: number): string {
    if (node.details === "") {
      return node.label;
    }
    return `${node.label}${" ".repeat(Math.max(1, column - node.label.length))}${node.details}`;
  }
}
