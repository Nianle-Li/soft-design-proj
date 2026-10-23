import type { DeletionReceipt } from "../model/SvgDocument";
import { SvgDocument } from "../model/SvgDocument";
import type { EditCommand, ShapeChange } from "./EditCommand";

/** Stores only the detached subtree and its original location for precise undo. */
export class DeleteShapeCommand implements EditCommand<ShapeChange> {
  private receipt?: DeletionReceipt;

  constructor(
    private readonly document: SvgDocument,
    private readonly id: string
  ) {}

  execute(): ShapeChange {
    this.receipt = this.document.delete(this.id);
    return this.change("deleted");
  }

  undo(): ShapeChange {
    this.document.restoreDeletion(this.deletedReceipt());
    return this.change("restored");
  }

  redo(): ShapeChange {
    this.receipt = this.document.delete(this.id);
    return this.change("deleted");
  }

  private deletedReceipt(): DeletionReceipt {
    if (this.receipt === undefined) {
      throw new Error("command has not been executed");
    }
    return this.receipt;
  }

  private change(action: "deleted" | "restored"): ShapeChange {
    const receipt = this.deletedReceipt();
    const change: ShapeChange = {
      kind: "shape",
      label: receipt.label,
      action
    };
    return receipt.parentLabel === undefined
      ? change
      : { ...change, parentLabel: receipt.parentLabel };
  }
}
