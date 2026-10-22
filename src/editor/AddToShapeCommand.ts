import type { AddToReceipt } from "../model/SvgDocument";
import { SvgDocument } from "../model/SvgDocument";
import type { AddToChange, EditCommand } from "./EditCommand";

/** Binds one ownership change to its Receiver and retains the source's former location. */
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
        label: receipt.source.shape.label,
        action,
        parentLabel: receipt.destination.label
      };
    }
    const parent = receipt.source.parent;
    return parent === null
      ? { kind: "addto", label: receipt.source.shape.label, action }
      : { kind: "addto", label: receipt.source.shape.label, action, parentLabel: parent.label };
  }
}
