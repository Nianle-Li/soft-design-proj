import { describe, expect, it } from "vitest";
import { SvgCodec } from "../../src/adapters/svg/SvgCodec";
import { GroupShape } from "../../src/builtin/shapes/GroupShape";
import { RectShape } from "../../src/builtin/shapes/RectShape";
import { TextShape } from "../../src/builtin/shapes/TextShape";
import type { ShapeProvider, SvgReadInput } from "../../src/core/plugin-api";
import type { DocumentStore } from "../../src/core/editor/DocumentStore";
import { EditorSession } from "../../src/core/editor/EditorSession";
import { ShapeProviderRegistry } from "../../src/core/model/ShapeProviderRegistry";
import { createDefaultShapeProviders } from "../../src/host/assembly/DefaultShapes";

const wrap = (content: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="30" viewBox="0 0 40 30">${content}</svg>`;

function frameReader(seen: SvgReadInput[]): ShapeProvider {
  return {
    type: "frame",
    create: (id) => new GroupShape(id),
    readSvg(element) {
      seen.push(element);
      const frame = new GroupShape(element.id);
      for (const child of element.children) frame.insertChild(frame.childCount, child);
      return frame;
    }
  };
}

describe("SVG adapter provider readback", () => {
  it("requires every type in a configured registry to supply SVG readback", () => {
    const rect = wrap('<rect id="r1" x="0" y="0" width="1" height="1"/>');
    expect(() => new SvgCodec(new ShapeProviderRegistry([])).decode(rect)).toThrow(
      "unsupported SVG element: <rect>"
    );
    const creationOnly = new ShapeProviderRegistry([
      { type: "rect", create: (id) => new RectShape(id, 0, 0, 1, 1) }
    ]);
    expect(() => new SvgCodec(creationOnly).decode(rect)).toThrow(
      "shape provider rect does not support SVG read"
    );
    expect(() => new SvgCodec(creationOnly).decode(wrap('<rect id="r1"><path/></rect>'))).toThrow(
      "shape provider rect does not support SVG read"
    );
    expect(() =>
      new SvgCodec(createDefaultShapeProviders()).decode(wrap('<path id="p1" d="M0 0"/>'))
    ).toThrow("unsupported SVG element: <path>");
  });

  it("reads a provider subtree within a built-in group and keeps ordered children", () => {
    const seen: SvgReadInput[] = [];
    const codec = new SvgCodec(createDefaultShapeProviders([frameReader(seen)]));
    const result = codec.decode(
      wrap(
        '<g id="outer"><frame id="f1" data-test="kept"><rect x="1" y="2" width="3" height="4" fill="red"/><text id="t1" x="5" y="6">A &amp; B</text></frame></g>'
      )
    );

    expect(result.count).toBe(4);
    expect(result.assignedIds).toEqual([{ id: "rect1", tag: "rect" }]);
    expect(result.document.tree("f1").roots[0]?.children.map((node) => node.label)).toEqual([
      "rect#rect1",
      "text#t1"
    ]);
    expect(result.document.show("rect1").parentLabel).toBe("g#f1");
    expect(result.document.explicitStyle("rect1")).toEqual({ fill: "red" });
    expect(result.document.show("t1").text).toBe("A & B");
    expect(seen).toHaveLength(1);
    expect(seen[0]).toMatchObject({ tag: "frame", id: "f1", text: "" });
    expect(seen[0]?.attributes.get("data-test")).toBe("kept");
    expect(seen[0]?.children[0]).toBeInstanceOf(RectShape);
    expect(seen[0]?.children[1]).toBeInstanceOf(TextShape);
  });

  it("recurses into provider children and rejects duplicate ids before invoking providers", () => {
    const seen: SvgReadInput[] = [];
    const codec = new SvgCodec(createDefaultShapeProviders([frameReader(seen)]));
    const result = codec.decode(wrap('<frame id="top"><frame id="inner"/></frame>'));
    expect(result.count).toBe(2);
    expect(seen.map((element) => element.id)).toEqual(["inner", "top"]);
    expect(result.document.show("inner").parentLabel).toBe("g#top");

    expect(() =>
      codec.decode(
        wrap('<frame id="same"><rect id="same" x="0" y="0" width="1" height="1"/></frame>')
      )
    ).toThrow("id already exists: same");
    expect(seen).toHaveLength(2);
  });

  it.each([
    ['<rect id="bad" x="0" y="0" width="-1" height="1"/>', "invalid width:"],
    [
      '<rect id="bad" x="0" y="0" width="1" height="1" opacity="0.5"/>',
      "unsupported SVG attribute: opacity on <rect>"
    ]
  ])("preserves built-in validation inside a provider subtree", (child, error) => {
    const seen: SvgReadInput[] = [];
    const codec = new SvgCodec(createDefaultShapeProviders([frameReader(seen)]));
    expect(() => codec.decode(wrap(`<frame id="f1">${child}</frame>`))).toThrow(error);
    expect(seen).toEqual([]);
  });

  it("rejects unavailable or invalid providers without treating custom SVG as a built-in", () => {
    const xml = wrap('<frame id="f1"/>');
    expect(() => new SvgCodec().decode(xml)).toThrow("unsupported SVG element: <frame>");
    const wrongId: ShapeProvider = {
      type: "frame",
      create: (id) => new GroupShape(id),
      readSvg: () => new GroupShape("wrong")
    };
    expect(() => new SvgCodec(new ShapeProviderRegistry([wrongId])).decode(xml)).toThrow(
      "shape provider frame returned id wrong instead of f1"
    );
  });

  it("keeps the current session and undo history if a provider rejects readback", () => {
    const registry = createDefaultShapeProviders([
      {
        type: "frame",
        create: (id) => new GroupShape(id),
        readSvg: () => {
          throw new Error("invalid frame structure");
        }
      }
    ]);
    const store: DocumentStore = {
      read: () => new SvgCodec(registry).decode(wrap('<frame id="f1"/>')),
      write: () => 0
    };
    const session = new EditorSession(store, registry);
    session.init();
    session.create("rect", "old", ["0", "0", "1", "1"]);

    expect(() => session.read("bad.svg")).toThrow("invalid frame structure");
    expect(session.tree().roots.map((node) => node.label)).toEqual(["rect#old"]);
    expect(session.undo()).toMatchObject({ label: "rect#old", action: "removed" });
    expect(session.redo()).toMatchObject({ label: "rect#old", action: "created" });
  });

  it("rejects duplicate ids introduced by a reader's detached subtree", () => {
    const registry = new ShapeProviderRegistry([
      {
        type: "frame",
        create: (id) => new GroupShape(id),
        readSvg(element) {
          const group = new GroupShape(element.id);
          group.insertChild(0, new RectShape("duplicate", 0, 0, 1, 1));
          group.insertChild(1, new RectShape("duplicate", 1, 1, 1, 1));
          return group;
        }
      }
    ]);
    expect(() => new SvgCodec(registry).decode(wrap('<frame id="f1"/>'))).toThrow(
      "id already exists: duplicate"
    );
  });
});
