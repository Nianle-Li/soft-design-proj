import type { CreationReceipt } from "../model/SvgDocument";
import { SvgDocument } from "../model/SvgDocument";
import type { EditCommand, ShapeChange } from "./EditCommand";

/** Binds a create request to its Receiver and retains only its created node and position. */
export class CreateShapeCommand implements EditCommand {
  private receipt?: CreationReceipt;

  constructor(
    private readonly document: SvgDocument,
    private readonly type: string,
    private readonly id: string,
    private readonly parameters: readonly string[],
    private readonly parentId?: string
  ) {}

  execute(): ShapeChange {
    this.receipt = this.document.create(this.type, this.id, this.parameters, this.parentId);
    return this.change("created");
  }

  undo(): ShapeChange {
    const receipt = this.executedReceipt();
    this.document.undoCreation(receipt);
    return this.change("removed");
  }

  redo(): ShapeChange {
    this.document.restoreCreation(this.executedReceipt());
    return this.change("created");
  }

  private executedReceipt(): CreationReceipt {
    if (this.receipt === undefined) {
      throw new Error("command has not been executed");
    }
    return this.receipt;
  }

  private change(action: ShapeChange["action"]): ShapeChange {
    const receipt = this.executedReceipt();
    const change: ShapeChange = {
      label: receipt.shape.label,
      action
    };
    if (receipt.parent === null) {
      return change;
    }
    return { ...change, parentLabel: receipt.parent.label };
  }
}
