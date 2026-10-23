import type { ScaleReceipt } from "../model/SvgDocument";
import { SvgDocument } from "../model/SvgDocument";
import type { EditCommand, ScaleChange } from "./EditCommand";

/** The Receiver owns geometry and inverse values; this command retains its receipt. */
export class ScaleShapeCommand implements EditCommand<ScaleChange> {
  private receipt?: ScaleReceipt;

  constructor(
    private readonly document: SvgDocument,
    private readonly id: string,
    private readonly factor: number
  ) {}

  execute(): ScaleChange {
    this.receipt = this.document.scale(this.id, this.factor);
    return this.change("scaled");
  }

  undo(): ScaleChange {
    this.document.undoScale(this.executedReceipt());
    return this.change("scale-undone");
  }

  redo(): ScaleChange {
    this.document.redoScale(this.executedReceipt());
    return this.change("scaled");
  }

  private executedReceipt(): ScaleReceipt {
    if (this.receipt === undefined) {
      throw new Error("command has not been executed");
    }
    return this.receipt;
  }

  private change(action: ScaleChange["action"]): ScaleChange {
    return {
      kind: "scale",
      label: this.executedReceipt().label,
      action,
      factor: this.factor
    };
  }
}
