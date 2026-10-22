export interface ShapeChange {
  readonly label: string;
  readonly parentLabel?: string;
  readonly action: "created" | "removed";
}

/** A request whose inverse is specific to the operation it performed. */
export interface EditCommand {
  execute(): ShapeChange;
  undo(): ShapeChange;
  redo(): ShapeChange;
}
