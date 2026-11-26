import { EditorError } from "../../core/model/EditorError";

export interface PluginConfigEntry {
  readonly module: string;
  readonly options?: unknown;
}

/** Converts untrusted JSON into the ordered enabled requests understood by the loader. */
export function parsePluginConfig(source: string): readonly PluginConfigEntry[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(source.replace(/^\uFEFF/u, ""));
  } catch {
    throw new EditorError("invalid plugin config");
  }
  if (!isRecord(parsed) || !Array.isArray(parsed.plugins)) {
    throw new EditorError("invalid plugin config");
  }

  const entries: PluginConfigEntry[] = [];
  for (const candidate of parsed.plugins) {
    if (
      !isRecord(candidate) ||
      typeof candidate.module !== "string" ||
      candidate.module.trim() === "" ||
      (candidate.enabled !== undefined && typeof candidate.enabled !== "boolean")
    ) {
      throw new EditorError("invalid plugin config");
    }
    if (candidate.enabled === false) continue;
    entries.push(
      Object.hasOwn(candidate, "options")
        ? { module: candidate.module, options: candidate.options }
        : { module: candidate.module }
    );
  }
  return entries;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
