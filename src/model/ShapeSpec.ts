/** Typed creation request, independent of CLI token positions and XML attributes. */
interface ShapeIdentity {
  readonly id: string;
  readonly fill?: string;
  readonly stroke?: string;
  readonly strokeWidth?: string;
}

export type ShapeSpec = ShapeIdentity &
  (
    | Readonly<{ kind: "g" }>
    | Readonly<{ kind: "rect"; x: number; y: number; width: number; height: number }>
    | Readonly<{ kind: "circle"; cx: number; cy: number; r: number }>
    | Readonly<{ kind: "ellipse"; cx: number; cy: number; rx: number; ry: number }>
    | Readonly<{ kind: "line"; x1: number; y1: number; x2: number; y2: number }>
    | Readonly<{ kind: "text"; x: number; y: number; text: string }>
  );
