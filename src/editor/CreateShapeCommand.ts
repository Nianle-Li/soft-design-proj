import type { CreationReceipt } from "../model/SvgDocument";
import { SvgDocument } from "../model/SvgDocument";
import type { ShapeSpec } from "../model/ShapeSpec";
import type { EditCommand, ShapeChange } from "./EditCommand";

/** Binds a typed create request to its Receiver and retains an opaque undo receipt. */
export class CreateShapeCommand implements EditCommand<ShapeChange> {
  private receipt?: CreationReceipt;

  constructor(
    private readonly document: SvgDocument,
    private readonly spec: ShapeSpec,
    private readonly parentId?: string
  ) {}

  execute(): ShapeChange {
    this.receipt = this.document.create(this.spec, this.parentId);
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

  private change(action: "created" | "removed"): ShapeChange {
    const receipt = this.executedReceipt();
    const change: ShapeChange = {
      kind: "shape",
      label: receipt.label,
      action
    };
    if (receipt.parentLabel === undefined) {
      return change;
    }
    return { ...change, parentLabel: receipt.parentLabel };
  }
}
