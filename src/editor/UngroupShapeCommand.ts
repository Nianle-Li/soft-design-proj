import type { UngroupReceipt } from "../model/SvgDocument";
import { SvgDocument } from "../model/SvgDocument";
import type { EditCommand, UngroupChange } from "./EditCommand";

/** Binds an ungroup request to its Receiver and retains the removed group and child order. */
export class UngroupShapeCommand implements EditCommand<UngroupChange> {
  private receipt?: UngroupReceipt;

  constructor(
    private readonly document: SvgDocument,
    private readonly id: string
  ) {}

  execute(): UngroupChange {
    this.receipt = this.document.ungroup(this.id);
    return this.change("ungrouped");
  }

  undo(): UngroupChange {
    this.document.undoUngroup(this.executedReceipt());
    return this.change("regrouped");
  }

  redo(): UngroupChange {
    this.document.redoUngroup(this.executedReceipt());
    return this.change("ungrouped");
  }

  private executedReceipt(): UngroupReceipt {
    if (this.receipt === undefined) {
      throw new Error("command has not been executed");
    }
    return this.receipt;
  }

  private change(action: "ungrouped" | "regrouped"): UngroupChange {
    const receipt = this.executedReceipt();
    return {
      kind: "ungroup",
      label: receipt.group.label,
      action,
      childCount: receipt.children.length
    };
  }
}
