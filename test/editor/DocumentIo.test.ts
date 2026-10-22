import { describe, expect, it } from "vitest";
import type { DocumentStore } from "../../src/editor/DocumentStore";
import { EditorSession } from "../../src/editor/EditorSession";
import { EditorError } from "../../src/model/EditorError";
import { SvgDocument } from "../../src/model/SvgDocument";

class FakeStore implements DocumentStore {
  readonly writes: string[] = [];
  failRead = false;
  failWrite = false;

  read(path: string) {
    if (this.failRead) throw new EditorError(`cannot read file: ${path}`);
    const document = new SvgDocument(400, 300);
    document.create("rect", "loaded", ["0", "0", "1", "1"]);
    return { document, count: 1, assignedIds: [{ id: "rect1", tag: "rect" }] };
  }

  write(path: string): number {
    if (this.failWrite) throw new EditorError(`cannot write file: ${path}`);
    this.writes.push(path);
    return 1;
  }
}

describe("document I/O session policy", () => {
  it("keeps only the read source as the implicit save destination", () => {
    const store = new FakeStore();
    const session = new EditorSession(store);
    session.init();
    session.save("first.svg");
    expect(() => session.save()).toThrow("no read path for save");

    expect(session.read("source.svg")).toMatchObject({ count: 1 });
    session.save("copy.svg");
    session.save();
    expect(store.writes).toEqual(["first.svg", "copy.svg", "source.svg"]);
    session.init();
    expect(() => session.save()).toThrow("no read path for save");
  });

  it("commits read and save barriers only after success", () => {
    const store = new FakeStore();
    const session = new EditorSession(store);
    session.init();
    session.create("rect", "old", ["0", "0", "1", "1"]);
    store.failRead = true;
    expect(() => session.read("bad.svg")).toThrow("cannot read file: bad.svg");
    expect(session.tree().roots[0]?.label).toBe("rect#old");
    expect(session.undo()).toMatchObject({ label: "rect#old", action: "removed" });

    store.failRead = false;
    session.read("good.svg");
    expect(session.tree().roots[0]?.label).toBe("rect#loaded");
    store.failRead = true;
    expect(() => session.read("another-bad.svg")).toThrow("cannot read file: another-bad.svg");
    expect(session.tree().roots[0]?.label).toBe("rect#loaded");
    store.failRead = false;
    expect(() => session.undo()).toThrow("undo not allowed after io command");
    session.create("circle", "new", ["1", "1", "1"]);
    store.failWrite = true;
    expect(() => session.save("bad.svg")).toThrow("cannot write file: bad.svg");
    expect(session.undo()).toMatchObject({ label: "circle#new", action: "removed" });
    store.failWrite = false;
    session.save();
    expect(store.writes.at(-1)).toBe("good.svg");
    expect(() => session.undo()).toThrow("undo not allowed after io command");
  });
});
