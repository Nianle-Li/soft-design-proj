import { EditorError } from "../../src/core/plugin-api";
import type { Command, ShapeView, TreeView } from "../../src/core/plugin-api";

/** Counts the current read-only tree without touching edit history. */
export class StatsCommand implements Command {
  readonly name = "stats";
  readonly help = "stats";

  constructor(private readonly tree: () => TreeView) {}

  execute(args: readonly string[]): readonly string[] {
    if (args.length !== 0) throw new EditorError("usage: stats");

    const counts = new Map<string, number>();
    let total = 0;
    let containers = 0;
    const visit = (node: ShapeView): void => {
      if (node.isContainer) {
        containers += 1;
        node.children.forEach(visit);
      } else {
        total += 1;
        counts.set(node.kind, (counts.get(node.kind) ?? 0) + 1);
      }
    };
    this.tree().roots.forEach(visit);

    const summary = `(total ${String(total)}, containers ${String(containers)})`;
    const types = [...counts].map(([type, count]) => `${type}: ${String(count)}`);
    return [types.length === 0 ? summary : `${types.join("  ")}  ${summary}`];
  }
}
