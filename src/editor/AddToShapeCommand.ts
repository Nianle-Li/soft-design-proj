import type { AddToReceipt } from "../model/SvgDocument";
import { SvgDocument } from "../model/SvgDocument";
import type { AddToChange, EditCommand } from "./EditCommand";

/** Binds one ownership change and retains its receiver-owned inverse receipt. */
export class AddToShapeCommand implements EditCommand<AddToChange> {
  private receipt?: AddToReceipt;

  constructor(
    private readonly document: SvgDocument,
    private readonly destinationId: string,
    private readonly sourceId: string
  ) {}

  execute(): AddToChange {
    this.receipt = this.document.addTo(this.destinationId, this.sourceId);
    return this.change("added");
  }

  undo(): AddToChange {
    this.document.undoAddTo(this.executedReceipt());
    return this.change("restored");
  }

  redo(): AddToChange {
    this.document.redoAddTo(this.executedReceipt());
    return this.change("added");
  }

  private executedReceipt(): AddToReceipt {
    if (this.receipt === undefined) {
      throw new Error("command has not been executed");
    }
    return this.receipt;
  }

  private change(action: "added" | "restored"): AddToChange {
    const receipt = this.executedReceipt();
    if (action === "added") {
      return {
        kind: "addto",
        label: receipt.label,
        action,
        parentLabel: receipt.destinationLabel
      };
    }
    return receipt.sourceParentLabel === undefined
      ? { kind: "addto", label: receipt.label, action }
      : { kind: "addto", label: receipt.label, action, parentLabel: receipt.sourceParentLabel };
  }
}
