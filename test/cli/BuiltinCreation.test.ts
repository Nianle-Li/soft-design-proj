import { describe, expect, it } from "vitest";
import { CliApp } from "../../src/cli/CliApp";
import { EditorSession } from "../../src/editor/EditorSession";

describe("six built-in create types through the CLI", () => {
  it("matches the assignment's nested flowchart tree alignment", () => {
    const app = new CliApp(new EditorSession());
    const commands = [
      "init 800 600",
      "create g flowchart",
      "create g node1 in flowchart",
      "create rect start 120 100 160 60 #4a90d9 in node1",
      'create text start-label 155 135 "开始" in node1',
      "create g node2 in flowchart",
      "create rect process 520 100 160 60 #f5a623 in node2",
      'create text process-label 545 135 "处理数据" in node2',
      "create line arrow1 280 130 520 130 black in flowchart"
    ];
    const outputs = commands.map((command) => app.runLine(command));

    expect(outputs).toEqual([
      ["canvas 800x600 created"],
      ["g#flowchart created"],
      ["g#node1 created in g#flowchart"],
      ["rect#start created in g#node1"],
      ["text#start-label created in g#node1"],
      ["g#node2 created in g#flowchart"],
      ["rect#process created in g#node2"],
      ["text#process-label created in g#node2"],
      ["line#arrow1 created in g#flowchart"]
    ]);
    expect(app.runLine("tree")).toEqual([
      "svg (800x600)",
      "└── g#flowchart",
      "    ├── g#node1",
      "    │   ├── rect#start       x=120 y=100 w=160 h=60 fill=#4a90d9",
      '    │   └── text#start-label (155,135) "开始"',
      "    ├── g#node2",
      "    │   ├── rect#process     x=520 y=100 w=160 h=60 fill=#f5a623",
      '    │   └── text#process-label (545,135) "处理数据"',
      "    └── line#arrow1          (280,130) -> (520,130)"
    ]);

    expect(app.runLine("undo")).toEqual(["line#arrow1 creation undone"]);
    expect(app.runLine("redo")).toEqual(["line#arrow1 created in g#flowchart"]);
  });

  it("creates circle and ellipse, and keeps state unchanged on invalid numeric input", () => {
    const app = new CliApp(new EditorSession());
    app.runLine("init");
    expect(app.runLine("create circle c1 50 50 10 red")).toEqual(["circle#c1 created"]);
    expect(app.runLine("create ellipse e1 1 2 3 4")).toEqual(["ellipse#e1 created"]);
    const before = app.runLine("tree");

    expect(app.runLine("create circle bad 0 0 Infinity")).toEqual([
      "error: invalid number: Infinity"
    ]);
    expect(app.runLine("tree")).toEqual(before);
    expect(app.runLine("undo")).toEqual(["ellipse#e1 creation undone"]);
    expect(app.runLine("redo")).toEqual(["ellipse#e1 created"]);
  });
});
