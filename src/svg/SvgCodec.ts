import { DOMImplementation, DOMParser, XMLSerializer } from "@xmldom/xmldom";
import type {
  Document as XmlDocument,
  Element as XmlElement,
  Node as XmlNode
} from "@xmldom/xmldom";
import { EditorError } from "../model/EditorError";
import { SvgDocument } from "../model/SvgDocument";
import type { SvgNodeView } from "../model/SvgNodeView";

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

/** Translates the deliberately supported SVG subset without leaking DOM nodes into the model. */
export class SvgCodec {
  decode(xml: string): Readonly<{
    document: SvgDocument;
    count: number;
    assignedIds: readonly Readonly<{ id: string; tag: string }>[];
  }> {
    // Do not let a parser expand a DTD that this editor would reject anyway.
    if (xml.includes("<!DOCTYPE")) {
      throw new EditorError("unsupported SVG document type");
    }
    let parsed: XmlDocument;
    try {
      parsed = new DOMParser({
        onError: (_level, message) => {
          throw new Error(message);
        }
      }).parseFromString(xml, "image/svg+xml");
    } catch (error) {
      const message =
        error instanceof Error ? error.message.replace(/\s+/gu, " ") : "malformed XML";
      throw new EditorError(`invalid SVG: ${message}`);
    }
    if (parsed.doctype !== null) {
      throw new EditorError("unsupported SVG document type");
    }
    for (const node of this.nodes(parsed)) {
      if (node.nodeType === 7 && node.nodeName.toLowerCase() === "xml") continue;
      if (node.nodeType !== 1 && node.nodeType !== 3) {
        throw new EditorError("unsupported SVG document content");
      }
      if (node.nodeType === 3 && node.nodeValue?.trim() !== "") {
        throw new EditorError("unsupported SVG document content");
      }
    }
    const root = parsed.documentElement;
    if (root === null || root.tagName !== "svg" || root.namespaceURI !== SVG_NAMESPACE) {
      throw new EditorError("unsupported SVG root element");
    }
    this.requireAttributes(root, ["xmlns", "width", "height", "viewBox"]);
    if (root.getAttribute("xmlns") !== SVG_NAMESPACE) {
      throw new EditorError("unsupported SVG namespace");
    }
    const width = this.positiveNumber(root.getAttribute("width"), "width");
    const height = this.positiveNumber(root.getAttribute("height"), "height");
    const viewBox = (root.getAttribute("viewBox") ?? "")
      .trim()
      .split(/[\s,]+/u)
      .map(Number);
    if (
      viewBox.length !== 4 ||
      viewBox[0] !== 0 ||
      viewBox[1] !== 0 ||
      viewBox[2] !== width ||
      viewBox[3] !== height
    ) {
      throw new EditorError("unsupported SVG viewBox");
    }

    const explicitIds = new Set<string>();
    const collectIds = (element: XmlElement): void => {
      if (element.hasAttribute("id")) {
        const id = element.getAttribute("id") ?? "";
        if (explicitIds.has(id)) throw new EditorError(`id already exists: ${id}`);
        explicitIds.add(id);
      }
      for (const child of this.nodes(element)) {
        if (child.nodeType === 1) collectIds(child as XmlElement);
      }
    };
    for (const child of this.nodes(root)) {
      if (child.nodeType === 1) collectIds(child as XmlElement);
    }

    const document = new SvgDocument(width, height);
    const assignedIds: { id: string; tag: string }[] = [];
    const nextByTag = new Map<string, number>();
    const reservedIds = new Set(explicitIds);
    let count = 0;
    const add = (element: XmlElement, parentId?: string): void => {
      if (element.namespaceURI !== SVG_NAMESPACE || element.tagName.includes(":")) {
        throw new EditorError(`unsupported SVG element: <${element.tagName}>`);
      }
      const type = element.tagName;
      const attributes = new Map<string, string>();
      for (let index = 0; index < element.attributes.length; index += 1) {
        const attribute = element.attributes.item(index);
        if (attribute !== null) attributes.set(attribute.name, attribute.value);
      }
      let id = attributes.get("id");
      if (id === undefined) {
        let serial = nextByTag.get(type) ?? 1;
        while (reservedIds.has(`${type}${String(serial)}`)) serial += 1;
        id = `${type}${String(serial)}`;
        nextByTag.set(type, serial + 1);
        reservedIds.add(id);
        assignedIds.push({ id, tag: type });
      }
      const children: XmlElement[] = [];
      let text = "";
      for (const child of this.nodes(element)) {
        if (child.nodeType === 1) {
          children.push(child as XmlElement);
        } else if (child.nodeType === 3) {
          text += child.nodeValue ?? "";
        } else {
          throw new EditorError(`unsupported content in <${type}>`);
        }
      }
      if (type === "text" && children.length > 0) {
        throw new EditorError("unsupported child element in <text>");
      }
      const content = type === "text" ? text : text.trim() === "" ? undefined : text;
      document.importSvgShape(type, id, attributes, content, parentId);
      count += 1;
      for (const child of children) add(child, id);
    };
    for (const child of this.nodes(root)) {
      if (child.nodeType === 1) add(child as XmlElement);
      else if (child.nodeType !== 3 || child.nodeValue?.trim() !== "") {
        throw new EditorError("unsupported content in <svg>");
      }
    }
    return { document, count, assignedIds };
  }

  encode(document: SvgDocument): Readonly<{ xml: string; count: number }> {
    const view = document.toSvgView();
    const xmlDocument = new DOMImplementation().createDocument(SVG_NAMESPACE, "svg", null);
    const root = xmlDocument.documentElement;
    if (root === null) throw new Error("SVG root creation failed");
    root.setAttribute("width", String(view.width));
    root.setAttribute("height", String(view.height));
    root.setAttribute("viewBox", `0 0 ${String(view.width)} ${String(view.height)}`);
    let count = 0;
    const append = (parent: XmlElement, node: SvgNodeView): void => {
      const element = xmlDocument.createElementNS(SVG_NAMESPACE, node.tag);
      for (const [name, value] of node.attributes) element.setAttribute(name, value);
      if (node.text !== undefined) element.appendChild(xmlDocument.createTextNode(node.text));
      parent.appendChild(element);
      count += 1;
      for (const child of node.children) append(element, child);
    };
    for (const node of view.roots) append(root, node);
    const xml = new XMLSerializer().serializeToString(xmlDocument, { requireWellFormed: true });
    return { xml: `<?xml version="1.0" encoding="UTF-8"?>\n${xml}\n`, count };
  }

  private nodes(parent: XmlNode): XmlNode[] {
    const result: XmlNode[] = [];
    for (let index = 0; index < parent.childNodes.length; index += 1) {
      const child = parent.childNodes.item(index);
      if (child !== null) result.push(child);
    }
    return result;
  }

  private requireAttributes(element: XmlElement, allowed: readonly string[]): void {
    for (let index = 0; index < element.attributes.length; index += 1) {
      const attribute = element.attributes.item(index);
      if (attribute !== null && !allowed.includes(attribute.name)) {
        throw new EditorError(
          `unsupported SVG attribute: ${attribute.name} on <${element.tagName}>`
        );
      }
    }
  }

  private positiveNumber(value: string | null, name: string): number {
    const number = Number(value);
    if (value === null || value.trim() === "" || !Number.isFinite(number) || number <= 0) {
      throw new EditorError(`invalid SVG ${name}`);
    }
    return number;
  }
}
