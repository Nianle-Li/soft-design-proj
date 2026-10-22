import type { SetReceipt } from "../model/SvgDocument";
import { SvgDocument } from "../model/SvgDocument";
import type { EditCommand, SetChange } from "./EditCommand";

/** Retains only the target attribute's previous and next explicit values. */
export class SetShapeCommand implements EditCommand<SetChange> {
  private receipt?: SetReceipt;

  constructor(
    private readonly document: SvgDocument,
    private readonly id: string,
    private readonly attribute: string,
    private readonly value: string
  ) {}

  execute(): SetChange {
    this.receipt = this.document.set(this.id, this.attribute, this.value);
    return this.change("set", this.receipt.plan.value);
  }

  undo(): SetChange {
    const receipt = this.executedReceipt();
    this.document.undoSet(receipt);
    return this.change("restored", receipt.plan.previousValue);
  }

  redo(): SetChange {
    const receipt = this.executedReceipt();
    this.document.redoSet(receipt);
    return this.change("set", receipt.plan.value);
  }

  private executedReceipt(): SetReceipt {
    if (this.receipt === undefined) {
      throw new Error("command has not been executed");
    }
    return this.receipt;
  }

  private change(action: SetChange["action"], value: string | undefined): SetChange {
    const receipt = this.executedReceipt();
    return { kind: "set", label: receipt.shape.label, attribute: receipt.attribute, action, value };
  }
}
