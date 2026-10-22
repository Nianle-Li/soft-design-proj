import { EditorError } from "../model/EditorError";
import { SvgDocument } from "../model/SvgDocument";
import type { TreeView } from "../model/TreeView";
import { CommandExecutor } from "./CommandExecutor";
import { CreateShapeCommand } from "./CreateShapeCommand";
import { DeleteShapeCommand } from "./DeleteShapeCommand";
import type { EditChange, MoveChange, ScaleChange, ShapeChange } from "./EditCommand";
import { MoveShapeCommand } from "./MoveShapeCommand";
import { ScaleShapeCommand } from "./ScaleShapeCommand";

/** The current document and its edit history are one user session. */
export class EditorSession {
  private document?: SvgDocument;
  private readonly executor = new CommandExecutor();

  init(width = 800, height = 600): Readonly<{ width: number; height: number }> {
    const document = new SvgDocument(width, height);
    this.document = document;
    this.executor.ioBarrier();
    return { width, height };
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
    const command = new CreateShapeCommand(this.currentDocument(), type, id, parameters, parentId);
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

  tree(id?: string): TreeView {
    return this.currentDocument().tree(id);
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
}
