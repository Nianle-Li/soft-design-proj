import { describe, expect, it } from "vitest";
import { EditorSession } from "../../src/editor/EditorSession";

describe("set command history", () => {
  it("restores a pre-existing style and keeps each set as one history unit", () => {
    const session = new EditorSession();
    session.init();
    session.create("rect", "r1", ["1", "2", "3", "4", "red"]);

    session.set("r1", "fill", "blue");
    session.set("r1", "x", "9");
    expect(session.show("r1")).toMatchObject({
      geometry: [
        ["x", "9"],
        ["y", "2"],
        ["width", "3"],
        ["height", "4"]
      ],
      style: { fill: "blue" }
    });
    session.undo();
    expect(session.show("r1")).toMatchObject({
      geometry: [
        ["x", "1"],
        ["y", "2"],
        ["width", "3"],
        ["height", "4"]
      ],
      style: { fill: "blue" }
    });
    session.undo();
    expect(session.show("r1")).toMatchObject({
      geometry: [
        ["x", "1"],
        ["y", "2"],
        ["width", "3"],
        ["height", "4"]
      ],
      style: { fill: "red" }
    });
    session.redo();
    session.redo();
    expect(session.show("r1")).toMatchObject({
      geometry: [
        ["x", "9"],
        ["y", "2"],
        ["width", "3"],
        ["height", "4"]
      ],
      style: { fill: "blue" }
    });
  });

  it("preserves redo after a failed set and clears it after a successful new set", () => {
    const session = new EditorSession();
    session.init();
    session.create("rect", "r1", ["1", "2", "3", "4"]);
    session.set("r1", "fill", "blue");
    session.undo();

    expect(() => session.set("r1", "unknown", "x")).toThrow("unknown attribute: unknown");
    session.redo();
    expect(session.show("r1").style).toEqual({ fill: "blue" });
    session.undo();
    session.set("r1", "fill", "green");
    expect(() => session.redo()).toThrow("nothing to redo");
  });
});
