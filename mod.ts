import { Evaluator, StringValue, Value } from "./src/evaluator.ts";
import { Lexer } from "./src/lexer.ts";
import { Parser } from "./src/parser.ts";

const filename = Deno.args[0];
const contents = Deno.readTextFileSync(filename);

const parser = new Parser(new Lexer(contents));
const program = parser.parse();

const predefinedVariables: Map<string, Value> = new Map();
predefinedVariables.set("0", new StringValue(filename));

const evaluator = new Evaluator(
  predefinedVariables,
  {
    print: (msg: string) => console.log(msg),
  },
);

evaluator.run(program);
