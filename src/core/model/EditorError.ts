/** A user-facing failure that must leave document and history unchanged. */
export class EditorError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EditorError";
  }
}
