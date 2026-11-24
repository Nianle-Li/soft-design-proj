import type { CreationReceipt } from "../../model/SvgDocument";
import { SvgDocument } from "../../model/SvgDocument";
import { Shape } from "../model/Shape";
import type { EditCommand, ShapeChange } from "./EditCommand";

/** Binds a detached shape to its Receiver and retains an opaque undo receipt. */
export class CreateShapeCommand implements EditCommand<ShapeChange> {
  private receipt?: CreationReceipt;

  constructor(
    private readonly document: SvgDocument,
    private readonly creation: Shape,
    private readonly parentId?: string
  ) {}

  execute(): ShapeChange {
    this.receipt = this.document.createCandidate(this.creation, this.parentId);
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
      action,
      ...(receipt.parts === undefined ? {} : { parts: receipt.parts })
    };
    if (receipt.parentLabel === undefined) {
      return change;
    }
    return { ...change, parentLabel: receipt.parentLabel };
  }
}
