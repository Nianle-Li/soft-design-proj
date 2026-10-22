import { randomUUID } from "node:crypto";
import { closeSync, openSync, readFileSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import type { DocumentStore } from "../editor/DocumentStore";
import { EditorError } from "../model/EditorError";
import type { SvgDocument } from "../model/SvgDocument";
import { SvgCodec } from "./SvgCodec";

/** File adapter: a complete read precedes session replacement; writes use a sibling temporary file. */
export class SvgFileStore implements DocumentStore {
  constructor(private readonly codec = new SvgCodec()) {}

  read(path: string) {
    let xml: string;
    try {
      xml = readFileSync(path, "utf8");
    } catch {
      throw new EditorError(`cannot read file: ${path}`);
    }
    try {
      return this.codec.decode(xml);
    } catch (error) {
      if (error instanceof EditorError) throw error;
      throw new EditorError(`cannot read file: ${path}`);
    }
  }

  write(path: string, document: SvgDocument): number {
    let encoded: Readonly<{ xml: string; count: number }>;
    try {
      encoded = this.codec.encode(document);
    } catch {
      throw new EditorError(`cannot write file: ${path}`);
    }
    const temporary = join(dirname(path), `.${basename(path)}.${randomUUID()}.tmp`);
    let descriptor: number | undefined;
    try {
      descriptor = openSync(temporary, "wx");
      try {
        writeFileSync(descriptor, encoded.xml, "utf8");
      } finally {
        closeSync(descriptor);
      }
      renameSync(temporary, path);
    } catch {
      if (descriptor !== undefined) {
        try {
          unlinkSync(temporary);
        } catch {
          // Keep the original write failure as the CLI result.
        }
      }
      throw new EditorError(`cannot write file: ${path}`);
    }
    return encoded.count;
  }
}
