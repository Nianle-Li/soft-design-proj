import { describe, expect, it } from "vitest";
import { createCodeApplication } from "../../src/host/assembly/ApplicationAssembly";

describe("box CLI feedback", () => {
  it("matches the Phase 1 section 6.1 composite feedback without changing its tree label", () => {
    const app = createCodeApplication();
    app.runLine("init 1000 700");

    expect(app.runLine('create box n1 120 100 160 60 "开始"')).toEqual([
      "box#n1 created (g#n1 + rect#n1-rect + text#n1-label)"
    ]);
    expect(app.runLine('create box n2 520 100 160 60 "处理数据"')).toEqual([
      "box#n2 created (g#n2 + rect#n2-rect + text#n2-label)"
    ]);
    expect(app.runLine("move n2 0 100")).toEqual(["box#n2 moved by (0,100)"]);
    expect(app.runLine("undo")).toEqual(["box#n2 moved back by (0,-100)"]);
    expect(app.runLine("set n2 fill #f5a623")).toEqual(["box#n2 fill propagated to n2-rect"]);
    expect(app.runLine('set n2 label "处理数据 v2"')).toEqual([
      'box#n2 label updated: "处理数据 v2"'
    ]);
    expect(app.runLine("undo")).toEqual(['box#n2 label restored: "处理数据"']);
    expect(app.runLine("tree n1")[0]).toBe("g#n1 (box)");
  });
});
