import { EditorError } from "../../core/plugin-api";

/** Shared Phase 1 argument errors for the built-in shape providers. */
export function requireShapeArgumentCount(
  type: string,
  parameters: readonly string[],
  minimum: number,
  maximum: number
): void {
  if (parameters.length < minimum || parameters.length > maximum) {
    throw new EditorError(`invalid arguments for ${type}`);
  }
}

export function parseShapeNumber(value: string | undefined): number {
  const parsed = Number(value);
  if (value === undefined || value.trim() === "" || !Number.isFinite(parsed)) {
    throw new EditorError(`invalid number: ${value ?? ""}`);
  }
  return parsed;
}
