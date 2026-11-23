import { EditorError } from "./EditorError";
import { Shape } from "./Shape";
import type { ShapeCreationContext, ShapeProvider, SvgReadInput } from "./ShapeProvider";

/** Selection and composition are shared by built-in and optional shape providers. */
export class ShapeProviderRegistry implements ShapeCreationContext {
  private readonly providers = new Map<string, ShapeProvider>();

  constructor(providers: readonly ShapeProvider[]) {
    for (const provider of providers) {
      if (this.providers.has(provider.type)) {
        throw new EditorError(`duplicate registration: shapes/${provider.type}`);
      }
      this.providers.set(provider.type, provider);
    }
  }

  has(type: string): boolean {
    return this.providers.has(type);
  }

  hasSvgReader(type: string): boolean {
    return this.providers.get(type)?.readSvg !== undefined;
  }

  types(): readonly string[] {
    return [...this.providers.keys()];
  }

  create(type: string, id: string, parameters: readonly string[]): Shape {
    const provider = this.providers.get(type);
    if (provider === undefined) {
      throw new EditorError(`unknown shape type: ${type} (is the plugin loaded?)`);
    }
    return this.validateShape(type, id, provider.create(id, parameters, this));
  }

  readSvg(type: string, element: SvgReadInput): Shape {
    const provider = this.providers.get(type);
    if (provider === undefined) {
      throw new EditorError(`unknown shape type: ${type} (is the plugin loaded?)`);
    }
    if (provider.readSvg === undefined) {
      throw new EditorError(`shape provider ${type} does not support SVG read`);
    }
    return this.validateShape(type, element.id, provider.readSvg(element));
  }

  private validateShape(type: string, id: string, shape: Shape): Shape {
    if (!(shape instanceof Shape)) {
      throw new EditorError(`shape provider ${type} did not return a shape`);
    }
    if (shape.id !== id) {
      throw new EditorError(`shape provider ${type} returned id ${shape.id} instead of ${id}`);
    }
    return shape;
  }
}
