import { describe, expect, it } from "vitest";
import type { EditChange } from "../../src/core/editor/EditCommand";
import { ChangePresenter } from "../../src/host/cli/ChangePresenter";

const cases: readonly (readonly [EditChange, string])[] = [
  [
    {
      kind: "shape",
      label: "box#n1",
      action: "created",
      parentLabel: "g#outer",
      parts: ["g#n1", "rect#n1-rect", "text#n1-label"]
    },
    "box#n1 created (g#n1 + rect#n1-rect + text#n1-label) in g#outer"
  ],
  [{ kind: "shape", label: "rect#r", action: "removed" }, "rect#r creation undone"],
  [{ kind: "shape", label: "rect#r", action: "deleted" }, "rect#r deleted"],
  [
    { kind: "shape", label: "rect#r", action: "restored", parentLabel: "g#outer" },
    "rect#r restored into g#outer"
  ],
  [{ kind: "shape", label: "rect#r", action: "restored" }, "rect#r restored"],
  [
    {
      kind: "move",
      label: "circle#c",
      action: "moved",
      location: { kind: "point", x: 3, y: 4 },
      dx: 1,
      dy: 2
    },
    "circle#c moved to (3,4)"
  ],
  [
    {
      kind: "move",
      label: "g#node",
      action: "moved-back",
      location: { kind: "offset" },
      dx: 0,
      dy: -10
    },
    "g#node moved back by (0,-10)"
  ],
  [{ kind: "scale", label: "rect#r", action: "scaled", factor: 2 }, "rect#r scaled by 2"],
  [{ kind: "scale", label: "rect#r", action: "scale-undone", factor: 2 }, "rect#r scale undone"],
  [
    { kind: "set", label: "rect#r", attribute: "fill", action: "restored", value: undefined },
    "rect#r fill removed"
  ],
  [
    { kind: "set", label: "text#t", attribute: "text", action: "set", value: "hello" },
    'text#t updated: text="hello"'
  ],
  [
    {
      kind: "set",
      label: "box#n1",
      attribute: "fill",
      action: "set",
      value: "orange",
      effect: { kind: "propagated", targetId: "n1-rect" }
    },
    "box#n1 fill propagated to n1-rect"
  ],
  [
    {
      kind: "set",
      label: "box#n1",
      attribute: "label",
      action: "restored",
      value: "old",
      effect: { kind: "text" }
    },
    'box#n1 label restored: "old"'
  ],
  [
    { kind: "set", label: "rect#r", attribute: "stroke", action: "set", value: "blue" },
    "rect#r stroke set to blue"
  ],
  [
    { kind: "group", label: "g#pair", action: "grouped", childCount: 2 },
    "g#pair created with 2 children"
  ],
  [
    { kind: "group", label: "g#pair", action: "ungrouped", childCount: 2 },
    "g#pair grouping undone"
  ],
  [{ kind: "ungroup", label: "g#one", action: "ungrouped", childCount: 1 }, "g#one ungrouped"],
  [
    { kind: "ungroup", label: "g#one", action: "regrouped", childCount: 1 },
    "g#one restored with 1 child"
  ],
  [
    { kind: "ungroup", label: "g#many", action: "regrouped", childCount: 2 },
    "g#many restored with 2 children"
  ],
  [
    { kind: "addto", label: "rect#r", action: "added", parentLabel: "g#outer" },
    "rect#r added to g#outer"
  ],
  [{ kind: "addto", label: "rect#r", action: "restored" }, "rect#r restored to canvas"],
  [
    { kind: "addto", label: "rect#r", action: "restored", parentLabel: "g#old" },
    "rect#r restored into g#old"
  ],
  [{ kind: "reorder", label: "rect#r", action: "moved", edge: "front" }, "rect#r moved to front"],
  [{ kind: "reorder", label: "rect#r", action: "restored", edge: "front" }, "rect#r order restored"]
];

describe("ChangePresenter", () => {
  it.each(cases)("describes %#", (change, expected) => {
    expect(new ChangePresenter().describe(change)).toBe(expected);
  });
});
