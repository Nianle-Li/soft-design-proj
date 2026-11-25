import type { EditChange, ShapeChange } from "../../core/editor/EditCommand";

/** Owns the exact CLI wording for structured edit results. */
export class ChangePresenter {
  describe(change: EditChange): string {
    if (change.kind === "move") {
      const verb = change.action === "moved" ? "moved" : "moved back";
      if (change.location.kind === "point") {
        return `${change.label} ${verb} to (${String(change.location.x)},${String(change.location.y)})`;
      }
      return `${change.label} ${verb} by (${String(change.dx)},${String(change.dy)})`;
    }
    if (change.kind === "scale") {
      return change.action === "scaled"
        ? `${change.label} scaled by ${String(change.factor)}`
        : `${change.label} scale undone`;
    }
    if (change.kind === "set") {
      if (change.value === undefined) {
        return `${change.label} ${change.attribute} removed`;
      }
      if (change.attribute === "text") {
        return `${change.label} updated: text="${change.value}"`;
      }
      if (change.effect?.kind === "propagated" && change.action === "set") {
        return `${change.label} ${change.attribute} propagated to ${change.effect.targetId}`;
      }
      if (change.effect?.kind === "text") {
        const verb = change.action === "set" ? "updated" : "restored";
        return `${change.label} ${change.attribute} ${verb}: "${change.value}"`;
      }
      const verb = change.action === "set" ? "set to" : "restored to";
      return `${change.label} ${change.attribute} ${verb} ${change.value}`;
    }
    if (change.kind === "group") {
      return change.action === "grouped"
        ? `${change.label} created with ${String(change.childCount)} children`
        : `${change.label} grouping undone`;
    }
    if (change.kind === "ungroup") {
      if (change.action === "ungrouped") {
        return `${change.label} ungrouped`;
      }
      const unit = change.childCount === 1 ? "child" : "children";
      return `${change.label} restored with ${String(change.childCount)} ${unit}`;
    }
    if (change.kind === "addto") {
      if (change.action === "added") {
        return `${change.label} added to ${change.parentLabel}`;
      }
      return change.parentLabel === undefined
        ? `${change.label} restored to canvas`
        : `${change.label} restored into ${change.parentLabel}`;
    }
    if (change.kind === "reorder") {
      return change.action === "moved"
        ? `${change.label} moved to ${change.edge}`
        : `${change.label} order restored`;
    }
    return this.describeShape(change);
  }

  private describeShape(change: ShapeChange): string {
    if (change.action === "removed") {
      return `${change.label} creation undone`;
    }
    if (change.action === "deleted") {
      return `${change.label} deleted`;
    }
    if (change.action === "restored") {
      const parent = change.parentLabel === undefined ? "" : ` into ${change.parentLabel}`;
      return `${change.label} restored${parent}`;
    }
    // New shape actions must receive explicit CLI wording before this assignment can compile.
    const createdAction: "created" = change.action;
    const parent = change.parentLabel === undefined ? "" : ` in ${change.parentLabel}`;
    const parts = change.parts === undefined ? "" : ` (${change.parts.join(" + ")})`;
    return `${change.label} ${createdAction}${parts}${parent}`;
  }
}
