import { EditorError } from "../editor/EditorError";

/** Tokenizes one REPL line while preserving quoted text and color values such as #fff. */
export class CommandLineParser {
  parse(line: string): string[] {
    if (line.trimStart().startsWith("#")) {
      return [];
    }

    const tokens: string[] = [];
    let token = "";
    let quoted = false;
    let started = false;

    for (const character of line) {
      if (character === '"') {
        quoted = !quoted;
        started = true;
      } else if (/\s/u.test(character) && !quoted) {
        if (started) {
          tokens.push(token);
          token = "";
          started = false;
        }
      } else {
        token += character;
        started = true;
      }
    }

    if (quoted) {
      throw new EditorError("unterminated quoted argument");
    }
    if (started) {
      tokens.push(token);
    }
    return tokens;
  }
}
