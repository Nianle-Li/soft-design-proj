/** The only core entry point available to built-in and optional plugins. */
export { ContainerShape } from "./model/ContainerShape";
export { EditorError } from "./model/EditorError";
export { PaintStyle } from "./model/PaintStyle";
export { Shape } from "./model/Shape";
export type { PreparedMove, PreparedScale, PreparedSet } from "./model/Shape";
export type { AttributeHandler } from "./model/AttributeHandler";
export type { ShapeCreationContext, ShapeProvider, SvgReadInput } from "./model/ShapeProvider";
export type { ShapeView, TreeView } from "./model/TreeView";
export type { Command } from "./command/Command";
