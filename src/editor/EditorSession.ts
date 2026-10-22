import { EditorError } from "../model/EditorError";
import { SvgDocument } from "../model/SvgDocument";
import type { TreeView } from "../model/TreeView";
import { CommandExecutor } from "./CommandExecutor";
import { CreateShapeCommand } from "./CreateShapeCommand";
import type { ShapeChange } from "./EditCommand";

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

  create(type: string, id: string, parameters: readonly string[], parentId?: string): ShapeChange {
    const command = new CreateShapeCommand(this.currentDocument(), type, id, parameters, parentId);
    return this.executor.execute(command);
  }

  tree(id?: string): TreeView {
    return this.currentDocument().tree(id);
  }

  undo(): ShapeChange {
    this.currentDocument();
    return this.executor.undo();
  }

  redo(): ShapeChange {
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
