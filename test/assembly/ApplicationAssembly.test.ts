import { describe, expect, it } from "vitest";
import { createCodeApplication } from "../../src/host/assembly/ApplicationAssembly";

describe("code application assembly", () => {
  it("uses validated code plugins without enabling the optional modified marker", () => {
    const app = createCodeApplication();

    expect(app.runLine("init 100 80")).toEqual(["canvas 100x80 created"]);
    expect(app.runLine('create box n1 10 20 40 30 "Title"')).toEqual([
      "box#n1 created (g#n1 + rect#n1-rect + text#n1-label)"
    ]);
    expect(app.runLine("stats")).toEqual(["rect: 1  text: 1  (total 2, containers 1)"]);
    expect(app.runLine("tree")).toEqual([
      "svg (100x80)",
      "└── g#n1 (box)",
      "    ├── rect#n1-rect  x=10 y=20 w=40 h=30 fill=#4a90d9",
      '    └── text#n1-label (30,40) "Title"'
    ]);
  });
});
