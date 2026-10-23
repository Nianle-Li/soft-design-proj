import type { ReorderReceipt, StackingEdge } from "../model/SvgDocument";
import { SvgDocument } from "../model/SvgDocument";
import type { EditCommand, ReorderChange } from "./EditCommand";

/** Binds one z-order request and retains its receiver-owned inverse receipt. */
export class ReorderShapeCommand implements EditCommand<ReorderChange> {
  private receipt?: ReorderReceipt;

  constructor(
    private readonly document: SvgDocument,
    private readonly id: string,
    private readonly edge: StackingEdge
  ) {}

  execute(): ReorderChange {
    this.receipt = this.document.reorder(this.id, this.edge);
    return this.change("moved");
  }

  undo(): ReorderChange {
    this.document.undoReorder(this.executedReceipt());
    return this.change("restored");
  }

  redo(): ReorderChange {
    this.document.redoReorder(this.executedReceipt());
    return this.change("moved");
  }

  private executedReceipt(): ReorderReceipt {
    if (this.receipt === undefined) {
      throw new Error("command has not been executed");
    }
    return this.receipt;
  }

  private change(action: "moved" | "restored"): ReorderChange {
    const receipt = this.executedReceipt();
    return { kind: "reorder", label: receipt.label, action, edge: receipt.edge };
  }
}
