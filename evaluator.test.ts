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
Deno.test("condition arithmetic expression", () =>
  assertStdout("if [ 5 = 5 ]; then echo $((5+5)) fi", ["10"]));

Deno.test("variable assignment", () => assertStdout("a=5; echo $a", ["5"]));
Deno.test("two variable assignment", () =>
  assertStdout("a=5; b=6; echo $b", ["6"]));
Deno.test("variable use in arithmetic expression", () => {
  assertStdout("a=5; echo $((a+4))", ["9"]);
  assertStdout("a=5; echo $((a+a))", ["10"]);
  assertStdout("a=5; b=4; echo $((a+b))", ["9"]);
});

Deno.test("variable use with dollar sign in arithmetic expression", () => {
  assertStdout("a=5; echo $(($a+4))", ["9"]);
  assertStdout("a=5; echo $(($a+a))", ["10"]);
  assertStdout("a=5; b=4; echo $(($a+$b))", ["9"]);
  assertStdout("a=5; b=4; echo $(($a+b))", ["9"]);
});

Deno.test("undefined variable in arithmetic expression", () => {
  assertStdout("echo $((a+4))", ["4"]);
  assertStdout("echo $((4+a))", ["4"]);
  assertStdout("echo $((a+a))", ["0"]);
  assertStdout("echo $(($a+4))", ["4"]);
  assertStdout("echo $((4+$a))", ["4"]);
  assertStdout("echo $(($a+$a))", ["0"]);
});

Deno.test("undefined variable", () => assertStdout("echo $a", [""]));

Deno.test("string without quotes", () => assertStdout("echo hello", ["hello"]));
Deno.test("string with", () => assertStdout('echo "hello"', ["hello"]));

function assertStdout(program: string, expectedOutputs: string[]) {
  const parser = new Parser(new Lexer(program));
  const evaluator = new Evaluator();
  const outputs = evaluator.run(parser.parse());
  assertEquals(outputs, expectedOutputs);
}
