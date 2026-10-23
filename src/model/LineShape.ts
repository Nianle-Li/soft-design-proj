import { Shape } from "./Shape";
import type { PreparedMove, PreparedScale } from "./Shape";
import type { PreparedSet } from "./Shape";
import { PaintStyle } from "./PaintStyle";
import type { ShapeView } from "./TreeView";

export class LineShape extends Shape {
  constructor(
    id: string,
    private x1: number,
    private y1: number,
    private x2: number,
    private y2: number,
    // The course tree example displays line geometry but not its stroke.
    stroke?: string
  ) {
    super(id, new PaintStyle(undefined, stroke));
  }

  override get kind(): string {
    return "line";
  }

  protected override geometryAttributes(): readonly (readonly [string, string])[] {
    return [
      ["x1", String(this.x1)],
      ["y1", String(this.y1)],
      ["x2", String(this.x2)],
      ["y2", String(this.y2)]
    ];
  }

  override prepareMove(dx: number, dy: number): PreparedMove {
    const previous = { x1: this.x1, y1: this.y1, x2: this.x2, y2: this.y2 };
    const moved = {
      x1: this.translatedCoordinate(previous.x1, dx),
      y1: this.translatedCoordinate(previous.y1, dy),
      x2: this.translatedCoordinate(previous.x2, dx),
      y2: this.translatedCoordinate(previous.y2, dy)
    };
    return {
      apply: () => {
        this.x1 = moved.x1;
        this.y1 = moved.y1;
        this.x2 = moved.x2;
        this.y2 = moved.y2;
        return { kind: "point", x: moved.x1, y: moved.y1 };
      },
      undo: () => {
        this.x1 = previous.x1;
        this.y1 = previous.y1;
        this.x2 = previous.x2;
        this.y2 = previous.y2;
        return { kind: "point", x: previous.x1, y: previous.y1 };
      }
    };
  }

  override prepareScale(factor: number): PreparedScale {
    const previous = { x1: this.x1, y1: this.y1, x2: this.x2, y2: this.y2 };
    const scaled = {
      x1: this.scaledGeometry(previous.x1, factor),
      y1: this.scaledGeometry(previous.y1, factor),
      x2: this.scaledGeometry(previous.x2, factor),
      y2: this.scaledGeometry(previous.y2, factor)
    };
    return {
      apply: () => {
        this.x1 = scaled.x1;
        this.y1 = scaled.y1;
        this.x2 = scaled.x2;
        this.y2 = scaled.y2;
      },
      undo: () => {
        this.x1 = previous.x1;
        this.y1 = previous.y1;
        this.x2 = previous.x2;
        this.y2 = previous.y2;
      }
    };
  }

  protected override prepareSpecificSet(attribute: string, value: string): PreparedSet {
    switch (attribute) {
      case "x1":
        return this.numericSet(value, this.x1, (next) => {
          this.x1 = next;
        });
      case "y1":
        return this.numericSet(value, this.y1, (next) => {
          this.y1 = next;
        });
      case "x2":
        return this.numericSet(value, this.x2, (next) => {
          this.x2 = next;
        });
      case "y2":
        return this.numericSet(value, this.y2, (next) => {
          this.y2 = next;
        });
      default:
        return this.unknownAttribute(attribute);
    }
  }

  override toView(): ShapeView {
    return {
      label: this.label,
      details: [
        {
          kind: "segment",
          from: { x: String(this.x1), y: String(this.y1) },
          to: { x: String(this.x2), y: String(this.y2) }
        }
      ],
      children: []
    };
  }
}
