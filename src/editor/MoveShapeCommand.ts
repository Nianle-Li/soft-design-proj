import type { MoveLocation } from "../model/Shape";
import type { MoveReceipt } from "../model/SvgDocument";
import { SvgDocument } from "../model/SvgDocument";
import type { EditCommand, MoveChange } from "./EditCommand";

/** The Receiver owns geometry; this command retains only the affected move plan. */
export class MoveShapeCommand implements EditCommand<MoveChange> {
  private receipt?: MoveReceipt;

  constructor(
    private readonly document: SvgDocument,
    private readonly id: string,
    private readonly dx: number,
    private readonly dy: number
  ) {}

  execute(): MoveChange {
    this.receipt = this.document.move(this.id, this.dx, this.dy);
    return this.change("moved", this.receipt.location, this.dx, this.dy);
  }

  undo(): MoveChange {
    const receipt = this.executedReceipt();
    return this.change("moved-back", this.document.undoMove(receipt), -this.dx, -this.dy);
  }

  redo(): MoveChange {
    const receipt = this.executedReceipt();
    return this.change("moved", this.document.redoMove(receipt), this.dx, this.dy);
  }

  private executedReceipt(): MoveReceipt {
    if (this.receipt === undefined) {
      throw new Error("command has not been executed");
    }
    return this.receipt;
  }

  private change(
    action: MoveChange["action"],
    location: MoveLocation,
    dx: number,
    dy: number
  ): MoveChange {
    return { kind: "move", label: this.executedReceipt().shape.label, action, location, dx, dy };
  }
}
