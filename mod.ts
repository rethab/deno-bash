import {defaultBuiltins} from './src/builtins.ts';
import { Evaluator, StringValue, Value } from "./src/evaluator.ts";
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

const evaluator = new Evaluator(predefinedVariables, defaultBuiltins);

evaluator.run(program);
