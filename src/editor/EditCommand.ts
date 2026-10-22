import type { MoveLocation } from "../model/Shape";

export interface ShapeChange {
  readonly kind: "shape";
  readonly label: string;
  readonly parentLabel?: string;
  readonly action: "created" | "removed" | "deleted" | "restored";
}

export interface MoveChange {
  readonly kind: "move";
  readonly label: string;
  readonly action: "moved" | "moved-back";
  readonly location: MoveLocation;
  readonly dx: number;
  readonly dy: number;
}

export type EditChange = ShapeChange | MoveChange;

/** A request whose inverse is specific to the operation it performed. */
export interface EditCommand<TChange extends EditChange = EditChange> {
  execute(): TChange;
  undo(): TChange;
  redo(): TChange;
}
