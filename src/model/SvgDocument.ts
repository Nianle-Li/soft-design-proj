import { EditorError } from "./EditorError";
import { GroupShape } from "./GroupShape";
import { Shape } from "./Shape";
import type { MoveLocation, PreparedMove, PreparedScale, PreparedSet } from "./Shape";
import type { ExplicitStyle } from "./PaintStyle";
import { ShapeFactory } from "./ShapeFactory";
import type { ShapeSpec } from "./ShapeSpec";
import type { SvgDocumentView } from "./SvgNodeView";
import type { ShapeDetailsView, TreeView } from "./TreeView";

declare const receiptBrand: unique symbol;
type Receipt<TKind extends string, TSummary extends object> = Readonly<
  TSummary & { readonly [receiptBrand]: TKind }
>;

/** Public receipts reveal feedback only; the document privately owns exact inverse data. */
export type CreationReceipt = Receipt<"create", { label: string; parentLabel?: string }>;
export type DeletionReceipt = Receipt<"delete", { label: string; parentLabel?: string }>;
export type MoveReceipt = Receipt<"move", { label: string; location: MoveLocation }>;
export type ScaleReceipt = Receipt<"scale", { label: string }>;
export type SetReceipt = Receipt<
  "set",
  { label: string; attribute: string; value: string; previousValue: string | undefined }
>;
export type GroupReceipt = Receipt<"group", { label: string; childCount: number }>;
export type UngroupReceipt = Receipt<"ungroup", { label: string; childCount: number }>;
export type AddToReceipt = Receipt<
  "addto",
  { label: string; destinationLabel: string; sourceParentLabel?: string }
>;

export type StackingEdge = "front" | "back";

export type ReorderReceipt = Receipt<"reorder", { label: string; edge: StackingEdge }>;

interface ShapePosition {
  readonly shape: Shape;
  readonly parent: GroupShape | null;
  readonly index: number;
}

interface GroupData {
  readonly group: GroupShape;
  readonly parent: GroupShape | null;
  readonly index: number;
  readonly members: readonly ShapePosition[];
}

interface UngroupData {
  readonly group: GroupShape;
  readonly parent: GroupShape;
  readonly index: number;
  readonly children: readonly Shape[];
}

interface AddToData {
  readonly source: ShapePosition;
  readonly destination: GroupShape;
}

interface ReorderData {
  readonly shape: Shape;
  readonly parent: GroupShape | null;
  readonly originalIndex: number;
  readonly targetIndex: number;
}

interface MoveData {
  readonly shape: Shape;
  readonly plan: PreparedMove;
}

interface ScaleData {
  readonly shape: Shape;
  readonly plan: PreparedScale;
}

interface SetData {
  readonly shape: Shape;
  readonly plan: PreparedSet;
}

interface ShapeEntry {
  readonly shape: Shape;
  readonly parent: GroupShape | null;
}

/** Receiver for document business operations and owner of the id index. */
export class SvgDocument {
  private readonly roots: Shape[] = [];
  private readonly shapes = new Map<string, ShapeEntry>();
  private readonly receipts = new WeakMap<object, Readonly<{ kind: string; data: unknown }>>();
  private readonly shapeFactory = new ShapeFactory();
  private canvasWidth: number;
  private canvasHeight: number;

  constructor(width: number, height: number) {
    SvgDocument.validateCanvasSize(width, height);
    this.canvasWidth = width;
    this.canvasHeight = height;
  }

  private issueReceipt<T extends object>(kind: string, summary: T, data: unknown): Readonly<T> {
    const receipt = Object.freeze(summary);
    this.receipts.set(receipt, { kind, data });
    return receipt;
  }

  private receiptData(receipt: object, kind: string): unknown {
    const record = this.receipts.get(receipt);
    if (record?.kind !== kind) {
      throw new Error(`${kind} receipt does not belong to this document`);
    }
    return record.data;
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

  /** Exports a detached, ordered projection; persistence cannot mutate the live tree. */
  toSvgView(): SvgDocumentView {
    return {
      width: this.canvasWidth,
      height: this.canvasHeight,
      roots: this.roots.map((shape) => shape.toSvgNode())
    };
  }

  importShape(spec: ShapeSpec, parentId?: string): void {
    this.ensureAvailableId(spec.id);
    let parent: GroupShape | null = null;
    if (parentId !== undefined) {
      const candidate = this.shapes.get(parentId)?.shape;
      if (!(candidate instanceof GroupShape)) {
        throw new EditorError(`no such container: ${parentId}`);
      }
      parent = candidate;
    }
    const shape = this.shapeFactory.create(spec);
    this.restoreCreatedShape({
      shape,
      parent,
      index: parent === null ? this.roots.length : parent.childCount
    });
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

  create(spec: ShapeSpec, parentId?: string): CreationReceipt {
    this.ensureAvailableId(spec.id);

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
    const shape = this.shapeFactory.create(spec);
    const index = parent === null ? this.roots.length : parent.childCount;
    const position = { shape, parent, index };
    this.restoreCreatedShape(position);
    const summary =
      parent === null ? { label: shape.label } : { label: shape.label, parentLabel: parent.label };
    return this.issueReceipt("create", summary, position) as CreationReceipt;
  }

  undoCreation(receipt: CreationReceipt): void {
    const position = this.receiptData(receipt, "create") as ShapePosition;
    if (this.shapes.get(position.shape.id)?.shape !== position.shape) {
      throw new Error("creation receipt no longer matches the document");
    }
    if (position.shape instanceof GroupShape && position.shape.childCount > 0) {
      throw new Error("cannot undo creation of a non-empty group");
    }
    if (position.parent === null) {
      const index = this.roots.indexOf(position.shape);
      if (index < 0) {
        throw new Error("created shape is missing from root");
      }
      this.roots.splice(index, 1);
    } else {
      position.parent.removeChild(position.shape);
    }
    this.shapes.delete(position.shape.id);
  }

  restoreCreation(receipt: CreationReceipt): void {
    this.restoreCreatedShape(this.receiptData(receipt, "create") as ShapePosition);
  }

  private restoreCreatedShape(position: ShapePosition): void {
    if (this.shapes.has(position.shape.id)) {
      throw new Error("cannot restore a shape with an existing id");
    }
    if (position.parent === null) {
      this.roots.splice(position.index, 0, position.shape);
    } else {
      position.parent.insertChild(position.index, position.shape);
    }
    this.shapes.set(position.shape.id, { shape: position.shape, parent: position.parent });
  }

  delete(id: string): DeletionReceipt {
    const position = this.removeShape(id);
    const summary =
      position.parent === null
        ? { label: position.shape.label }
        : { label: position.shape.label, parentLabel: position.parent.label };
    return this.issueReceipt("delete", summary, position) as DeletionReceipt;
  }

  private removeShape(id: string): ShapePosition {
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
    this.restoreDeletedShape(this.receiptData(receipt, "delete") as ShapePosition);
  }

  private restoreDeletedShape(position: ShapePosition): void {
    if (
      position.parent !== null &&
      this.shapes.get(position.parent.id)?.shape !== position.parent
    ) {
      throw new Error("cannot restore into a detached parent");
    }
    position.shape.visitSubtree((node) => {
      if (this.shapes.has(node.id)) {
        throw new Error(`cannot restore a shape with an existing id: ${node.id}`);
      }
    }, position.parent);

    if (position.parent === null) {
      this.roots.splice(position.index, 0, position.shape);
    } else {
      position.parent.insertChild(position.index, position.shape);
    }
    position.shape.visitSubtree((shape, parent) => {
      this.shapes.set(shape.id, { shape, parent });
    }, position.parent);
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

    const members: ShapePosition[] = [];
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
    const data: GroupData = {
      group: new GroupShape(id),
      parent,
      index: this.childIndex(branch, parent),
      members
    };
    this.redoGroupData(data);
    return this.issueReceipt(
      "group",
      { label: data.group.label, childCount: data.members.length },
      data
    ) as GroupReceipt;
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
    const data = this.receiptData(receipt, "group") as GroupData;
    if (this.shapes.get(data.group.id)?.shape !== data.group) {
      throw new Error("group receipt no longer matches the document");
    }
    this.removeShape(data.group.id);
    for (const member of data.members) {
      data.group.removeChild(member.shape);
      this.restoreDeletedShape(member);
    }
  }

  redoGroup(receipt: GroupReceipt): void {
    this.redoGroupData(this.receiptData(receipt, "group") as GroupData);
  }

  private redoGroupData(data: GroupData): void {
    for (const member of [...data.members].reverse()) {
      this.removeShape(member.shape.id);
    }
    this.restoreCreatedShape({ shape: data.group, parent: data.parent, index: data.index });
    data.members.forEach((member, index) => {
      this.restoreDeletedShape({ shape: member.shape, parent: data.group, index });
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

  private nearestSharedParent(members: readonly ShapePosition[]): GroupShape | null {
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

    const data: UngroupData = {
      group: entry.shape,
      parent: entry.parent,
      index: entry.parent.childIndex(entry.shape),
      children: entry.shape.directChildren()
    };
    this.redoUngroupData(data);
    return this.issueReceipt(
      "ungroup",
      { label: data.group.label, childCount: data.children.length },
      data
    ) as UngroupReceipt;
  }

  undoUngroup(receipt: UngroupReceipt): void {
    const data = this.receiptData(receipt, "ungroup") as UngroupData;
    for (const child of [...data.children].reverse()) {
      this.removeShape(child.id);
    }
    this.restoreCreatedShape({
      shape: data.group,
      parent: data.parent,
      index: data.index
    });
    data.children.forEach((child, index) => {
      this.restoreDeletedShape({ shape: child, parent: data.group, index });
    });
  }

  redoUngroup(receipt: UngroupReceipt): void {
    this.redoUngroupData(this.receiptData(receipt, "ungroup") as UngroupData);
  }

  private redoUngroupData(data: UngroupData): void {
    if (this.shapes.get(data.group.id)?.shape !== data.group) {
      throw new Error("ungroup receipt no longer matches the document");
    }
    this.removeShape(data.group.id);
    data.children.forEach((child, offset) => {
      data.group.removeChild(child);
      this.restoreDeletedShape({
        shape: child,
        parent: data.parent,
        index: data.index + offset
      });
    });
  }

  /** Moves an existing subtree to a group's tail after validating the destination is not below it. */
  addTo(destinationId: string, sourceId: string): AddToReceipt {
    const destination = this.shapes.get(destinationId)?.shape;
    if (destination === undefined) {
      throw new EditorError(`no such container: ${destinationId}`);
    }
    if (!(destination instanceof GroupShape)) {
      throw new EditorError(`not a container: ${destinationId}`);
    }
    const sourceShape = this.shapes.get(sourceId)?.shape;
    if (sourceShape === undefined) {
      throw new EditorError(`no such shape: ${sourceId}`);
    }
    let ancestor: GroupShape | null = destination;
    while (ancestor !== null) {
      if (ancestor === sourceShape) {
        throw new EditorError(`cannot add a container into itself or its descendant: ${sourceId}`);
      }
      ancestor = this.shapes.get(ancestor.id)?.parent ?? null;
    }

    const source = this.removeShape(sourceId);
    const data: AddToData = { source, destination };
    this.restoreDeletedShape({
      shape: source.shape,
      parent: destination,
      index: destination.childCount
    });
    const summary =
      source.parent === null
        ? { label: source.shape.label, destinationLabel: destination.label }
        : {
            label: source.shape.label,
            destinationLabel: destination.label,
            sourceParentLabel: source.parent.label
          };
    return this.issueReceipt("addto", summary, data) as AddToReceipt;
  }

  undoAddTo(receipt: AddToReceipt): void {
    const data = this.receiptData(receipt, "addto") as AddToData;
    this.removeShape(data.source.shape.id);
    this.restoreDeletedShape(data.source);
  }

  redoAddTo(receipt: AddToReceipt): void {
    const data = this.receiptData(receipt, "addto") as AddToData;
    this.removeShape(data.source.shape.id);
    this.restoreDeletedShape({
      shape: data.source.shape,
      parent: data.destination,
      index: data.destination.childCount
    });
  }

  /** SVG paints later siblings over earlier ones: front is the tail, back is the head. */
  reorder(id: string, edge: StackingEdge): ReorderReceipt {
    const entry = this.shapes.get(id);
    if (entry === undefined) {
      throw new EditorError(`no such shape: ${id}`);
    }
    const originalIndex = this.childIndex(entry.shape, entry.parent);
    const siblingCount = entry.parent === null ? this.roots.length : entry.parent.childCount;
    const data: ReorderData = {
      shape: entry.shape,
      parent: entry.parent,
      originalIndex,
      targetIndex: edge === "front" ? siblingCount - 1 : 0
    };
    this.moveSibling(data.shape, data.parent, data.targetIndex);
    return this.issueReceipt("reorder", { label: data.shape.label, edge }, data) as ReorderReceipt;
  }

  undoReorder(receipt: ReorderReceipt): void {
    const data = this.receiptData(receipt, "reorder") as ReorderData;
    this.ensureReorderTarget(data);
    this.moveSibling(data.shape, data.parent, data.originalIndex);
  }

  redoReorder(receipt: ReorderReceipt): void {
    const data = this.receiptData(receipt, "reorder") as ReorderData;
    this.ensureReorderTarget(data);
    this.moveSibling(data.shape, data.parent, data.targetIndex);
  }

  private ensureReorderTarget(data: ReorderData): void {
    const entry = this.shapes.get(data.shape.id);
    if (entry?.shape !== data.shape || entry.parent !== data.parent) {
      throw new Error("reorder receipt no longer matches the document");
    }
  }

  private moveSibling(shape: Shape, parent: GroupShape | null, index: number): void {
    if (parent === null) {
      const previousIndex = this.childIndex(shape, null);
      this.roots.splice(previousIndex, 1);
      this.roots.splice(index, 0, shape);
    } else {
      parent.removeChild(shape);
      parent.insertChild(index, shape);
    }
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
    return this.issueReceipt(
      "move",
      { label: shape.label, location: Object.freeze(location) },
      { shape, plan }
    ) as MoveReceipt;
  }

  undoMove(receipt: MoveReceipt): MoveLocation {
    const data = this.receiptData(receipt, "move") as MoveData;
    this.ensureMoveTarget(data);
    return data.plan.undo();
  }

  redoMove(receipt: MoveReceipt): MoveLocation {
    const data = this.receiptData(receipt, "move") as MoveData;
    this.ensureMoveTarget(data);
    return data.plan.apply();
  }

  private ensureMoveTarget(data: MoveData): void {
    if (this.shapes.get(data.shape.id)?.shape !== data.shape) {
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
    return this.issueReceipt("scale", { label: shape.label }, { shape, plan }) as ScaleReceipt;
  }

  undoScale(receipt: ScaleReceipt): void {
    const data = this.receiptData(receipt, "scale") as ScaleData;
    this.ensureScaleTarget(data);
    data.plan.undo();
  }

  redoScale(receipt: ScaleReceipt): void {
    const data = this.receiptData(receipt, "scale") as ScaleData;
    this.ensureScaleTarget(data);
    data.plan.apply();
  }

  private ensureScaleTarget(data: ScaleData): void {
    if (this.shapes.get(data.shape.id)?.shape !== data.shape) {
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
    return this.issueReceipt(
      "set",
      { label: shape.label, attribute, value: plan.value, previousValue: plan.previousValue },
      { shape, plan }
    ) as SetReceipt;
  }

  undoSet(receipt: SetReceipt): void {
    const data = this.receiptData(receipt, "set") as SetData;
    this.ensureSetTarget(data);
    data.plan.undo();
  }

  redoSet(receipt: SetReceipt): void {
    const data = this.receiptData(receipt, "set") as SetData;
    this.ensureSetTarget(data);
    data.plan.apply();
  }

  explicitStyle(id: string): ExplicitStyle {
    const shape = this.shapes.get(id)?.shape;
    if (shape === undefined) {
      throw new EditorError(`no such shape: ${id}`);
    }
    return shape.explicitStyle();
  }

  private ensureSetTarget(data: SetData): void {
    if (this.shapes.get(data.shape.id)?.shape !== data.shape) {
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

  show(id: string): ShapeDetailsView {
    const entry = this.shapes.get(id);
    if (entry === undefined) {
      throw new EditorError(`no such shape: ${id}`);
    }
    return entry.shape.toDetailsView(entry.parent?.label ?? "svg");
  }
}
