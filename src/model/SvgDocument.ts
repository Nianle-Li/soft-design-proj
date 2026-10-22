import { EditorError } from "./EditorError";
import { GroupShape } from "./GroupShape";
import { Shape } from "./Shape";
import type { MoveLocation, PreparedMove, PreparedScale, PreparedSet } from "./Shape";
import type { ExplicitStyle } from "./PaintStyle";
import { ShapeFactory } from "./ShapeFactory";
import type { TreeView } from "./TreeView";

export interface CreationReceipt {
  readonly shape: Shape;
  readonly parent: GroupShape | null;
  readonly index: number;
}

export interface DeletionReceipt {
  readonly shape: Shape;
  readonly parent: GroupShape | null;
  readonly index: number;
}

export interface MoveReceipt {
  readonly shape: Shape;
  readonly plan: PreparedMove;
  readonly location: MoveLocation;
}

export interface ScaleReceipt {
  readonly shape: Shape;
  readonly plan: PreparedScale;
}

export interface SetReceipt {
  readonly shape: Shape;
  readonly attribute: string;
  readonly plan: PreparedSet;
}

export interface GroupReceipt {
  readonly group: GroupShape;
  readonly parent: GroupShape | null;
  readonly index: number;
  readonly members: readonly DeletionReceipt[];
}

export interface UngroupReceipt {
  readonly group: GroupShape;
  readonly parent: GroupShape;
  readonly index: number;
  readonly children: readonly Shape[];
}

interface ShapeEntry {
  readonly shape: Shape;
  readonly parent: GroupShape | null;
}

/** Receiver for document business operations and owner of the id index. */
export class SvgDocument {
  private readonly roots: Shape[] = [];
  private readonly shapes = new Map<string, ShapeEntry>();
  private readonly shapeFactory = new ShapeFactory();
  private canvasWidth: number;
  private canvasHeight: number;

  constructor(width: number, height: number) {
    SvgDocument.validateCanvasSize(width, height);
    this.canvasWidth = width;
    this.canvasHeight = height;
  }

  get width(): number {
    return this.canvasWidth;
  }

  get height(): number {
    return this.canvasHeight;
  }

  canvasSize(): Readonly<{ width: number; height: number }> {
    return { width: this.canvasWidth, height: this.canvasHeight };
  }

  /** Resizing changes the canvas, not the geometry or membership of any shape. */
  resizeCanvas(width: number, height: number): Readonly<{ width: number; height: number }> {
    SvgDocument.validateCanvasSize(width, height);
    this.canvasWidth = width;
    this.canvasHeight = height;
    return this.canvasSize();
  }

  private static validateCanvasSize(width: number, height: number): void {
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
    this.ensureAvailableId(id);

    let parent: GroupShape | null = null;
    if (parentId !== undefined) {
      const candidate = this.shapes.get(parentId)?.shape;
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
    if (this.shapes.get(receipt.shape.id)?.shape !== receipt.shape) {
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
    this.shapes.set(receipt.shape.id, { shape: receipt.shape, parent: receipt.parent });
  }

  delete(id: string): DeletionReceipt {
    const entry = this.shapes.get(id);
    if (entry === undefined) {
      throw new EditorError(`no such shape: ${id}`);
    }

    const { shape, parent } = entry;
    const index = parent === null ? this.roots.indexOf(shape) : parent.removeChild(shape);
    if (parent === null) {
      if (index < 0) {
        throw new Error("shape is missing from root");
      }
      this.roots.splice(index, 1);
    }
    shape.visitSubtree((node) => this.shapes.delete(node.id), parent);
    return { shape, parent, index };
  }

  restoreDeletion(receipt: DeletionReceipt): void {
    if (receipt.parent !== null && this.shapes.get(receipt.parent.id)?.shape !== receipt.parent) {
      throw new Error("cannot restore into a detached parent");
    }
    receipt.shape.visitSubtree((node) => {
      if (this.shapes.has(node.id)) {
        throw new Error(`cannot restore a shape with an existing id: ${node.id}`);
      }
    }, receipt.parent);

    if (receipt.parent === null) {
      this.roots.splice(receipt.index, 0, receipt.shape);
    } else {
      receipt.parent.insertChild(receipt.index, receipt.shape);
    }
    receipt.shape.visitSubtree((shape, parent) => {
      this.shapes.set(shape.id, { shape, parent });
    }, receipt.parent);
  }

  /** Groups existing subtrees at their nearest shared parent, in original document order. */
  group(id: string, targetIds: readonly string[]): GroupReceipt {
    this.ensureAvailableId(id);
    if (targetIds.length === 0) {
      throw new EditorError("group requires at least one shape");
    }

    const selected = new Set<Shape>();
    for (const targetId of targetIds) {
      const entry = this.shapes.get(targetId);
      if (entry === undefined) {
        throw new EditorError(`no such shape: ${targetId}`);
      }
      if (selected.has(entry.shape)) {
        throw new EditorError(`duplicate group target: ${targetId}`);
      }
      selected.add(entry.shape);
    }
    for (const shape of selected) {
      let ancestor = this.shapes.get(shape.id)?.parent ?? null;
      while (ancestor !== null) {
        if (selected.has(ancestor)) {
          throw new EditorError(`cannot group a container into its own descendant: ${ancestor.id}`);
        }
        ancestor = this.shapes.get(ancestor.id)?.parent ?? null;
      }
    }

    const members: DeletionReceipt[] = [];
    for (const root of this.roots) {
      root.visitSubtree((shape, parent) => {
        if (selected.has(shape)) {
          members.push({ shape, parent, index: this.childIndex(shape, parent) });
        }
      }, null);
    }
    const parent = this.nearestSharedParent(members);
    const firstMember = members[0];
    if (firstMember === undefined) {
      throw new Error("validated group targets are missing from the document tree");
    }
    let branch = firstMember.shape;
    while (this.shapes.get(branch.id)?.parent !== parent) {
      const ancestor = this.shapes.get(branch.id)?.parent;
      if (ancestor === undefined || ancestor === null) {
        throw new Error("selected shape is outside the shared parent");
      }
      branch = ancestor;
    }
    const receipt = {
      group: new GroupShape(id),
      parent,
      index: this.childIndex(branch, parent),
      members
    };
    this.redoGroup(receipt);
    return receipt;
  }

  private ensureAvailableId(id: string): void {
    if (id.trim() === "" || /\s/u.test(id)) {
      throw new EditorError(`invalid id: ${id}`);
    }
    if (this.shapes.has(id)) {
      throw new EditorError(`id already exists: ${id}`);
    }
  }

  undoGroup(receipt: GroupReceipt): void {
    if (this.shapes.get(receipt.group.id)?.shape !== receipt.group) {
      throw new Error("group receipt no longer matches the document");
    }
    this.delete(receipt.group.id);
    for (const member of receipt.members) {
      receipt.group.removeChild(member.shape);
      this.restoreDeletion(member);
    }
  }

  redoGroup(receipt: GroupReceipt): void {
    for (const member of [...receipt.members].reverse()) {
      this.delete(member.shape.id);
    }
    this.restoreCreation({ shape: receipt.group, parent: receipt.parent, index: receipt.index });
    receipt.members.forEach((member, index) => {
      this.restoreDeletion({ shape: member.shape, parent: receipt.group, index });
    });
  }

  private childIndex(shape: Shape, parent: GroupShape | null): number {
    const index = parent === null ? this.roots.indexOf(shape) : parent.childIndex(shape);
    if (index < 0) {
      throw new Error("shape is missing from root");
    }
    return index;
  }

  private parentChain(parent: GroupShape | null): GroupShape[] {
    const chain: GroupShape[] = [];
    let current = parent;
    while (current !== null) {
      chain.unshift(current);
      current = this.shapes.get(current.id)?.parent ?? null;
    }
    return chain;
  }

  private nearestSharedParent(members: readonly DeletionReceipt[]): GroupShape | null {
    const chains = members.map((member) => this.parentChain(member.parent));
    let shared: GroupShape | null = null;
    const first = chains[0] ?? [];
    for (const [depth, group] of first.entries()) {
      if (!chains.every((chain) => chain[depth] === group)) {
        break;
      }
      shared = group;
    }
    return shared;
  }

  /** Promotes only direct children; nested subtrees retain their own structure. */
  ungroup(id: string): UngroupReceipt {
    const entry = this.shapes.get(id);
    if (entry === undefined) {
      throw new EditorError(`no such shape: ${id}`);
    }
    if (!(entry.shape instanceof GroupShape)) {
      throw new EditorError(`not a container: ${id}`);
    }
    if (entry.parent === null) {
      throw new EditorError(`cannot ungroup top-level container: ${id}`);
    }

    const receipt = {
      group: entry.shape,
      parent: entry.parent,
      index: entry.parent.childIndex(entry.shape),
      children: entry.shape.directChildren()
    };
    this.redoUngroup(receipt);
    return receipt;
  }

  undoUngroup(receipt: UngroupReceipt): void {
    for (const child of [...receipt.children].reverse()) {
      this.delete(child.id);
    }
    this.restoreCreation({
      shape: receipt.group,
      parent: receipt.parent,
      index: receipt.index
    });
    receipt.children.forEach((child, index) => {
      this.restoreDeletion({ shape: child, parent: receipt.group, index });
    });
  }

  redoUngroup(receipt: UngroupReceipt): void {
    if (this.shapes.get(receipt.group.id)?.shape !== receipt.group) {
      throw new Error("ungroup receipt no longer matches the document");
    }
    this.delete(receipt.group.id);
    receipt.children.forEach((child, offset) => {
      receipt.group.removeChild(child);
      this.restoreDeletion({
        shape: child,
        parent: receipt.parent,
        index: receipt.index + offset
      });
    });
  }

  move(id: string, dx: number, dy: number): MoveReceipt {
    const shape = this.shapes.get(id)?.shape;
    if (shape === undefined) {
      throw new EditorError(`no such shape: ${id}`);
    }
    if (!Number.isFinite(dx) || !Number.isFinite(dy)) {
      throw new EditorError("invalid move delta");
    }

    const plan = shape.prepareMove(dx, dy);
    const location = plan.apply();
    return { shape, plan, location };
  }

  undoMove(receipt: MoveReceipt): MoveLocation {
    this.ensureMoveTarget(receipt);
    return receipt.plan.undo();
  }

  redoMove(receipt: MoveReceipt): MoveLocation {
    this.ensureMoveTarget(receipt);
    return receipt.plan.apply();
  }

  private ensureMoveTarget(receipt: MoveReceipt): void {
    if (this.shapes.get(receipt.shape.id)?.shape !== receipt.shape) {
      throw new Error("move receipt no longer matches the document");
    }
  }

  scale(id: string, factor: number): ScaleReceipt {
    const shape = this.shapes.get(id)?.shape;
    if (shape === undefined) {
      throw new EditorError(`no such shape: ${id}`);
    }
    if (!Number.isFinite(factor) || factor <= 0) {
      throw new EditorError("scale factor must be positive");
    }

    const plan = shape.prepareScale(factor);
    plan.apply();
    return { shape, plan };
  }

  undoScale(receipt: ScaleReceipt): void {
    this.ensureScaleTarget(receipt);
    receipt.plan.undo();
  }

  redoScale(receipt: ScaleReceipt): void {
    this.ensureScaleTarget(receipt);
    receipt.plan.apply();
  }

  private ensureScaleTarget(receipt: ScaleReceipt): void {
    if (this.shapes.get(receipt.shape.id)?.shape !== receipt.shape) {
      throw new Error("scale receipt no longer matches the document");
    }
  }

  set(id: string, attribute: string, value: string): SetReceipt {
    const shape = this.shapes.get(id)?.shape;
    if (shape === undefined) {
      throw new EditorError(`no such shape: ${id}`);
    }
    const plan = shape.prepareSet(attribute, value);
    plan.apply();
    return { shape, attribute, plan };
  }

  undoSet(receipt: SetReceipt): void {
    this.ensureSetTarget(receipt);
    receipt.plan.undo();
  }

  redoSet(receipt: SetReceipt): void {
    this.ensureSetTarget(receipt);
    receipt.plan.apply();
  }

  explicitStyle(id: string): ExplicitStyle {
    const shape = this.shapes.get(id)?.shape;
    if (shape === undefined) {
      throw new EditorError(`no such shape: ${id}`);
    }
    return shape.explicitStyle();
  }

  private ensureSetTarget(receipt: SetReceipt): void {
    if (this.shapes.get(receipt.shape.id)?.shape !== receipt.shape) {
      throw new Error("set receipt no longer matches the document");
    }
  }

  tree(id?: string): TreeView {
    if (id !== undefined) {
      const shape = this.shapes.get(id)?.shape;
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
