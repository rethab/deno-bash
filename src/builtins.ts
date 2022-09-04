export interface Builtins {
  echo(args: string[]): number;
}

export const defaultBuiltins: Builtins = {
  echo(args: string[]): number {
    console.log(args.join(" "));
    return 0;
  },
};
