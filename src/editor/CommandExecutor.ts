import { EditorError } from "../model/EditorError";
import type { EditCommand, ShapeChange } from "./EditCommand";

/** Invoker: the only owner of edit history and I/O barriers. */
export class CommandExecutor {
  private readonly undoStack: EditCommand[] = [];
  private readonly redoStack: EditCommand[] = [];
  private blockedByIo = false;

  execute(command: EditCommand): ShapeChange {
    const change = command.execute();
    this.undoStack.push(command);
    this.redoStack.length = 0;
    this.blockedByIo = false;
    return change;
  }

  undo(): ShapeChange {
    this.ensureAllowed();
    const command = this.undoStack.at(-1);
    if (command === undefined) {
      throw new EditorError("nothing to undo");
    }
    const change = command.undo();
    this.undoStack.pop();
    this.redoStack.push(command);
    return change;
  }

  redo(): ShapeChange {
    this.ensureAllowed();
    const command = this.redoStack.at(-1);
    if (command === undefined) {
      throw new EditorError("nothing to redo");
    }
    const change = command.redo();
    this.redoStack.pop();
    this.undoStack.push(command);
    return change;
  }

  ioBarrier(): void {
    this.undoStack.length = 0;
    this.redoStack.length = 0;
    this.blockedByIo = true;
  }

  private ensureAllowed(): void {
    if (this.blockedByIo) {
      throw new EditorError("undo not allowed after io command");
    }
  }
}
