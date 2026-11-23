import { SaxesParser } from "saxes";

export interface OutlineNode {
  readonly name: string;
  readonly start: number;
  end: number;
  readonly selectionEnd: number;
  readonly children: OutlineNode[];
}

/** Parses each editor snapshot independently; malformed snapshots have no Outline symbols. */
export function parseSvgOutline(source: string): OutlineNode[] {
  const parser = new SaxesParser();
  const roots: OutlineNode[] = [];
  const stack: OutlineNode[] = [];
  let openingStart = 0;

  parser.on("opentagstart", (tag) => {
    openingStart = parser.position - tag.name.length - 2;
  });
  parser.on("opentag", (tag) => {
    const id = tag.attributes.id;
    const node: OutlineNode = {
      name: id ? `${tag.name}#${id}` : tag.name,
      start: openingStart,
      end: parser.position,
      selectionEnd: openingStart + tag.name.length + 1,
      children: []
    };
    const parent = stack.at(-1);
    if (parent) parent.children.push(node);
    else roots.push(node);
    stack.push(node);
  });
  parser.on("closetag", () => {
    const node = stack.pop();
    if (node) node.end = parser.position;
  });

  try {
    parser.write(source).close();
    return roots;
  } catch {
    return [];
  }
}
