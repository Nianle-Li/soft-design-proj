import { EditorError } from "../model/EditorError";
import { SvgDocument } from "../model/SvgDocument";
import { ShapeFactory } from "../model/ShapeFactory";
import type { ShapeSpec } from "../model/ShapeSpec";
import type { StackingEdge } from "../model/SvgDocument";
import type { ShapeDetailsView, TreeView } from "../model/TreeView";
import { AddToShapeCommand } from "./AddToShapeCommand";
import { CommandExecutor } from "./CommandExecutor";
import { CreateShapeCommand } from "./CreateShapeCommand";
import { DeleteShapeCommand } from "./DeleteShapeCommand";
import type { DocumentStore } from "./DocumentStore";
import type {
  AddToChange,
  EditChange,
  GroupChange,
  MoveChange,
  ReorderChange,
  ScaleChange,
  SetChange,
  ShapeChange,
  UngroupChange
} from "./EditCommand";
import { GroupShapeCommand } from "./GroupShapeCommand";
import { MoveShapeCommand } from "./MoveShapeCommand";
import { ReorderShapeCommand } from "./ReorderShapeCommand";
import { ScaleShapeCommand } from "./ScaleShapeCommand";
import { SetShapeCommand } from "./SetShapeCommand";
import { UngroupShapeCommand } from "./UngroupShapeCommand";

/** The current document and its edit history are one user session. */
export class EditorSession {
  private document?: SvgDocument;
  private readPath: string | undefined;
  private readonly executor = new CommandExecutor();
  private readonly shapeFactory = new ShapeFactory();

  constructor(private readonly store?: DocumentStore) {}

  init(width = 800, height = 600): Readonly<{ width: number; height: number }> {
    const document = new SvgDocument(width, height);
    this.document = document;
    this.readPath = undefined;
    this.executor.ioBarrier();
    return { width, height };
  }

  read(path: string): Readonly<{
    count: number;
    assignedIds: readonly Readonly<{ id: string; tag: string }>[];
  }> {
    const result = this.currentStore().read(path);
    this.document = result.document;
    this.readPath = path;
    this.executor.ioBarrier();
    return { count: result.count, assignedIds: result.assignedIds };
  }

  save(path?: string): Readonly<{ path: string; count: number }> {
    const document = this.currentDocument();
    const destination = path ?? this.readPath;
    if (destination === undefined) {
      throw new EditorError("no read path for save");
    }
    const count = this.currentStore().write(destination, document);
    this.executor.ioBarrier();
    return { path: destination, count };
  }

  canvas(): Readonly<{ width: number; height: number }> {
    return this.currentDocument().canvasSize();
  }

  resizeCanvas(width: number, height: number): Readonly<{ width: number; height: number }> {
    const size = this.currentDocument().resizeCanvas(width, height);
    this.executor.ioBarrier();
    return size;
  }

  create(type: string, id: string, parameters: readonly string[], parentId?: string): ShapeChange {
    const document = this.currentDocument();
    const spec = this.shapeFactory.parseCommand(type, id, parameters);
    const command = new CreateShapeCommand(document, spec, parentId);
    return this.executor.execute(command);
  }

  createShape(spec: ShapeSpec, parentId?: string): ShapeChange {
    const command = new CreateShapeCommand(this.currentDocument(), spec, parentId);
    return this.executor.execute(command);
  }

  delete(id: string): ShapeChange {
    return this.executor.execute(new DeleteShapeCommand(this.currentDocument(), id));
  }

  move(id: string, dx: number, dy: number): MoveChange {
    return this.executor.execute(new MoveShapeCommand(this.currentDocument(), id, dx, dy));
  }

  scale(id: string, factor: number): ScaleChange {
    return this.executor.execute(new ScaleShapeCommand(this.currentDocument(), id, factor));
  }

  set(id: string, attribute: string, value: string): SetChange {
    return this.executor.execute(new SetShapeCommand(this.currentDocument(), id, attribute, value));
  }

  group(id: string, targetIds: readonly string[]): GroupChange {
    return this.executor.execute(new GroupShapeCommand(this.currentDocument(), id, targetIds));
  }

  ungroup(id: string): UngroupChange {
    return this.executor.execute(new UngroupShapeCommand(this.currentDocument(), id));
  }

  addTo(destinationId: string, sourceId: string): AddToChange {
    return this.executor.execute(
      new AddToShapeCommand(this.currentDocument(), destinationId, sourceId)
    );
  }

  reorder(id: string, edge: StackingEdge): ReorderChange {
    return this.executor.execute(new ReorderShapeCommand(this.currentDocument(), id, edge));
  }

  tree(id?: string): TreeView {
    return this.currentDocument().tree(id);
  }

  show(id: string): ShapeDetailsView {
    return this.currentDocument().show(id);
  }

  undo(): EditChange {
    this.currentDocument();
    return this.executor.undo();
  }

  redo(): EditChange {
    this.currentDocument();
    return this.executor.redo();
  }

  private currentDocument(): SvgDocument {
    if (this.document === undefined) {
      throw new EditorError("no document. use 'init' or 'read' first");
    }
    return this.document;
  }

  private currentStore(): DocumentStore {
    if (this.store === undefined) {
      throw new EditorError("document store unavailable");
    }
    return this.store;
  }
}
