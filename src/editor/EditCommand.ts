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

export interface ScaleChange {
  readonly kind: "scale";
  readonly label: string;
  readonly action: "scaled" | "scale-undone";
  readonly factor: number;
}

export interface SetChange {
  readonly kind: "set";
  readonly label: string;
  readonly attribute: string;
  readonly action: "set" | "restored";
  readonly value: string | undefined;
}

export interface GroupChange {
  readonly kind: "group";
  readonly label: string;
  readonly action: "grouped" | "ungrouped";
  readonly childCount: number;
}

export interface UngroupChange {
  readonly kind: "ungroup";
  readonly label: string;
  readonly action: "ungrouped" | "regrouped";
  readonly childCount: number;
}

export type EditChange =
  ShapeChange | MoveChange | ScaleChange | SetChange | GroupChange | UngroupChange;

/** A request whose inverse is specific to the operation it performed. */
export interface EditCommand<TChange extends EditChange = EditChange> {
  execute(): TChange;
  undo(): TChange;
  redo(): TChange;
}
