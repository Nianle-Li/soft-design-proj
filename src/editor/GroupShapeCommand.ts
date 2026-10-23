import type { GroupReceipt } from "../model/SvgDocument";
import { SvgDocument } from "../model/SvgDocument";
import type { EditCommand, GroupChange } from "./EditCommand";

/** Binds one group request to its Receiver and retains only former member locations. */
export class GroupShapeCommand implements EditCommand<GroupChange> {
  private receipt?: GroupReceipt;

  constructor(
    private readonly document: SvgDocument,
    private readonly id: string,
    private readonly targetIds: readonly string[]
  ) {}

  execute(): GroupChange {
    this.receipt = this.document.group(this.id, this.targetIds);
    return this.change("grouped");
  }

  undo(): GroupChange {
    this.document.undoGroup(this.executedReceipt());
    return this.change("ungrouped");
  }

  redo(): GroupChange {
    this.document.redoGroup(this.executedReceipt());
    return this.change("grouped");
  }

  private executedReceipt(): GroupReceipt {
    if (this.receipt === undefined) {
      throw new Error("command has not been executed");
    }
    return this.receipt;
  }

  private change(action: "grouped" | "ungrouped"): GroupChange {
    const receipt = this.executedReceipt();
    return {
      kind: "group",
      label: receipt.label,
      action,
      childCount: receipt.childCount
    };
  }
}
