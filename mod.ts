import { defaultBuiltins } from "./src/builtins.ts";
import {
  CommandInvoker,
  Evaluator,
  StringValue,
  Value,
} from "./src/evaluator.ts";
import { Lexer } from "./src/lexer.ts";
import { Parser } from "./src/parser.ts";

const filename = Deno.args[0];
const contents = Deno.readTextFileSync(filename);

const parser = new Parser(new Lexer(contents));
const program = parser.parse();

const predefinedVariables: Map<string, Value> = new Map();
predefinedVariables.set("0", new StringValue(filename));

for (let i = 1; i < Deno.args.length; i++) {
  predefinedVariables.set(`${i}`, new StringValue(Deno.args[i]));
}

const commandInvoker: CommandInvoker = {
  async exec(name: string, args: string[]): Promise<number> {
    const process = Deno.run({
      cmd: [name, ...args],
    });
    const status = await process.status();
    process.close();

    return status.code;
  },
};

const evaluator = new Evaluator(
  predefinedVariables,
  defaultBuiltins,
  commandInvoker,
);

evaluator.run(program);
