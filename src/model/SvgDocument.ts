import { EditorError } from "./EditorError";
import { GroupShape } from "./GroupShape";
import { Shape } from "./Shape";
import { ShapeFactory } from "./ShapeFactory";
import type { TreeView } from "./TreeView";

export interface CreationReceipt {
  readonly shape: Shape;
  readonly parent: GroupShape | null;
  readonly index: number;
}

/** Receiver for document business operations and owner of the id index. */
export class SvgDocument {
  private readonly roots: Shape[] = [];
  private readonly shapes = new Map<string, Shape>();
  private readonly shapeFactory = new ShapeFactory();

  constructor(
    readonly width: number,
    readonly height: number
  ) {
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
      throw new EditorError("canvas dimensions must be positive finite numbers");
    }
  }

  create(
    type: string,
    id: string,
    parameters: readonly string[],
    parentId?: string
  ): CreationReceipt {
    if (id.trim() === "" || /\s/u.test(id)) {
      throw new EditorError(`invalid id: ${id}`);
    }
    if (this.shapes.has(id)) {
      throw new EditorError(`id already exists: ${id}`);
    }

    let parent: GroupShape | null = null;
    if (parentId !== undefined) {
      const candidate = this.shapes.get(parentId);
      if (candidate === undefined) {
        throw new EditorError(`no such container: ${parentId}`);
      }
      if (!(candidate instanceof GroupShape)) {
        throw new EditorError(`not a container: ${parentId}`);
      }
      parent = candidate;
    }

    // Validate and construct before touching the document.
    const shape = this.shapeFactory.create(type, id, parameters);
    const index = parent === null ? this.roots.length : parent.childCount;
    const receipt = { shape, parent, index };
    this.restoreCreation(receipt);
    return receipt;
  }

  undoCreation(receipt: CreationReceipt): void {
    if (this.shapes.get(receipt.shape.id) !== receipt.shape) {
      throw new Error("creation receipt no longer matches the document");
    }
    if (receipt.shape instanceof GroupShape && receipt.shape.childCount > 0) {
      throw new Error("cannot undo creation of a non-empty group");
    }
    if (receipt.parent === null) {
      const index = this.roots.indexOf(receipt.shape);
      if (index < 0) {
        throw new Error("created shape is missing from root");
      }
      this.roots.splice(index, 1);
    } else {
      receipt.parent.removeChild(receipt.shape);
    }
    this.shapes.delete(receipt.shape.id);
  }

  restoreCreation(receipt: CreationReceipt): void {
    if (this.shapes.has(receipt.shape.id)) {
      throw new Error("cannot restore a shape with an existing id");
    }
    if (receipt.parent === null) {
      this.roots.splice(receipt.index, 0, receipt.shape);
    } else {
      receipt.parent.insertChild(receipt.index, receipt.shape);
    }
    this.shapes.set(receipt.shape.id, receipt.shape);
  }

  tree(id?: string): TreeView {
    if (id !== undefined) {
      const shape = this.shapes.get(id);
      if (shape === undefined) {
        throw new EditorError(`no such shape: ${id}`);
      }
      return { width: this.width, height: this.height, roots: [shape.toView()] };
    }
    return {
      width: this.width,
      height: this.height,
      roots: this.roots.map((shape) => shape.toView())
    };
  }
}
