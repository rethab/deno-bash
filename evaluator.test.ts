import { assertEquals } from "https://deno.land/std@0.153.0/testing/asserts.ts";
import { Evaluator } from "./evaluator.ts";
import { Lexer } from "./lexer.ts";
import { Parser } from "./parser.ts";

Deno.test("constant", () => assertStdout("echo 5", ["5"]));

Deno.test("arithmetic constant", () => assertStdout("echo $((5))", ["5"]));
Deno.test("arithmetic addition", () => assertStdout("echo $((5+5))", ["10"]));
Deno.test("arithmetic addition 2", () => assertStdout("echo $((5+0))", ["5"]));

Deno.test("condition if-only", () =>
  assertStdout("if [ 5 = 5 ]; then echo 6 fi", ["6"]));
Deno.test("condition if-else", () =>
  assertStdout("if [ 5 = 5 ]; then echo 6 else echo 7 fi", ["6"]));
Deno.test("condition if-else true", () =>
  assertStdout("if [ 7 = 5 ]; then echo 6 else echo 7 fi", ["7"]));

function assertStdout(program: string, expectedOutputs: string[]) {
  const parser = new Parser(new Lexer(program));
  const evaluator = new Evaluator();
  const outputs = evaluator.run(parser.parse());
  assertEquals(outputs, expectedOutputs);
}
