import { EditorSession } from "../../src/core/editor/EditorSession";
import type { DocumentStore } from "../../src/core/editor/DocumentStore";
import { createDefaultShapeProviders } from "../../src/host/assembly/DefaultShapes";

/** Keeps test sessions on the same explicit built-in provider set as the CLI host. */
export function createDefaultEditorSession(store?: DocumentStore): EditorSession {
  return new EditorSession(store, createDefaultShapeProviders());
}
