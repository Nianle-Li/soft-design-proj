/** One externally named CLI operation; dependencies are bound when it is assembled. */
export interface Command {
  readonly name: string;
  readonly help: string;
  execute(args: readonly string[]): readonly string[];
}
