import type { ShapeView, TreeDetailPart, TreeView } from "../editor/TreeView";

/** CLI-only tree glyphs and column alignment. */
export class TreeFormatter {
  format(tree: TreeView, selected = false): string[] {
    if (selected) {
      const root = tree.roots[0];
      if (root === undefined) {
        return [];
      }
      const column = this.attributeColumn(root.children);
      return [this.line(root, root.label.length + 1), ...this.children(root.children, "", column)];
    }
    const column = this.attributeColumn(tree.roots);
    return [
      `svg (${String(tree.width)}x${String(tree.height)})`,
      ...this.children(tree.roots, "", column)
    ];
  }

  private children(nodes: readonly ShapeView[], prefix: string, column: number): string[] {
    const lines: string[] = [];

    nodes.forEach((node, index) => {
      const last = index === nodes.length - 1;
      lines.push(`${prefix}${last ? "└──" : "├──"} ${this.line(node, column - prefix.length - 4)}`);
      lines.push(...this.children(node.children, `${prefix}${last ? "    " : "│   "}`, column));
    });
    return lines;
  }

  private attributeColumn(nodes: readonly ShapeView[]): number {
    const deepestLabelEnd = (shapes: readonly ShapeView[], depth: number): number =>
      Math.max(
        0,
        ...shapes.map((shape) =>
          Math.max(
            shape.details.length === 0 ? 0 : depth * 4 + 4 + shape.label.length + 1,
            deepestLabelEnd(shape.children, depth + 1)
          )
        )
      );

    // Long ids overflow with one space instead of pushing every detail far right.
    return Math.min(29, Math.max(19, deepestLabelEnd(nodes, 0)));
  }

  private line(node: ShapeView, column: number): string {
    if (node.details.length === 0) {
      return node.label;
    }
    return `${node.label}${" ".repeat(Math.max(1, column - node.label.length))}${this.details(node.details)}`;
  }

  private details(parts: readonly TreeDetailPart[]): string {
    return parts
      .map((part) => {
        switch (part.kind) {
          case "attribute": {
            const name = part.name === "width" ? "w" : part.name === "height" ? "h" : part.name;
            return `${name}=${part.value}`;
          }
          case "segment":
            return `(${part.from.x},${part.from.y}) -> (${part.to.x},${part.to.y})`;
          case "positionedText":
            return `(${part.position.x},${part.position.y}) "${part.text}"`;
        }
      })
      .join(" ");
  }
}
