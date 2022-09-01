import { assertEquals } from "https://deno.land/std@0.153.0/testing/asserts.ts";
import { Evaluator, Stdout } from "./evaluator.ts";
import { Lexer } from "./lexer.ts";
import { Parser } from "./parser.ts";

Deno.test("constant", () => assertStdout("echo 5", ["5"]));

Deno.test("arithmetic constant", () => assertStdout("echo $((5))", ["5"]));
Deno.test("arithmetic addition", () => assertStdout("echo $((5+5))", ["10"]));
Deno.test("arithmetic addition 2", () => assertStdout("echo $((5+0))", ["5"]));
Deno.test("arithmetic expression precedence", () => {
  assertStdout("echo $((5+4+3+2+1))", ["15"]);
  assertStdout("echo $((1 + 5 * 5))", ["26"]);
  assertStdout("echo $((1 * 5 * 5))", ["25"]);
  assertStdout("echo $(((1 + 5) * 5))", ["30"]);
  assertStdout("echo $(((1 + 5) * (7 + 8)))", ["90"]);
  assertStdout("echo $(((1 + 2) * 3 + 4 * 5 + 6))", ["35"]);
});

Deno.test("condition if-only", () =>
  assertStdout("if [ 5 = 5 ]; then echo 6; fi", ["6"]));
Deno.test("condition if-else", () =>
  assertStdout("if [ 5 = 5 ]; then echo 6; else echo 7; fi", ["6"]));
Deno.test("condition if-else true", () =>
  assertStdout("if [ 7 = 5 ]; then echo 6; else echo 7; fi", ["7"]));
Deno.test("condition arithmetic expression", () =>
  assertStdout("if [ 5 = 5 ]; then echo $((5+5)); fi", ["10"]));
Deno.test("condition with variable", () =>
  assertStdout("a=5; if [ 5 = $a ]; then echo yes; fi", ["yes"]));

Deno.test("variable assignment", () => assertStdout("a=5; echo $a", ["5"]));
Deno.test("multiple variable assignment", () => {
  assertStdout("a=5; b=6; echo $b", ["6"]);
  assertStdout("a=5; b=$a; echo $b", ["5"]);
  assertStdout("a=5; b=$a; c=$b; echo $c", ["5"]);
});
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

Deno.test("string without quotes", () => assertStdout("echo hello", ["hello"]));
Deno.test("string with", () => assertStdout('echo "hello"', ["hello"]));

Deno.test("parameter expansion", () => {
  assertStdout('a=foo; echo "$a"', ["foo"]);
  assertStdout('A=foo; echo "$A"', ["foo"]);
  assertStdout('aBc1_z=foo; echo "$aBc1_z"', ["foo"]);
  assertStdout('A_=foo; echo "$A_"', ["foo"]);
  assertStdout('A1=foo; echo "$A1"', ["foo"]);
  assertStdout('a=world; echo "hello $a"', ["hello world"]);
  assertStdout('a=hello; echo "$a world"', ["hello world"]);
  assertStdout('hello=hello;world=world; echo "$hello $world"', [
    "hello world",
  ]);
  assertStdout('hello=hello;world=" world"; echo "$hello$world"', [
    "hello world",
  ]);
  assertStdout('echo "\\$a"', ["$a"]);
  assertStdout('a=x; echo "$a"$a', ["xx"]);
  assertStdout('PWD=/home/alice; echo "$PWD":/foo/bar', [
    "/home/alice:/foo/bar",
  ]);
  assertStdout('PWD=/home/alice; echo "$PWD:/foo/bar"', [
    "/home/alice:/foo/bar",
  ]);
  assertStdout('a=foo; echo "\\$$a"', ["$foo"]);
  assertStdout('a=a;b="$a$a"; echo "$b"', ["aa"]);
  assertStdout('a=a;b="$a$a$a"; echo "$b"', ["aaa"]);
  assertStdout('a=a;b="$a $a"; echo "$b"', ["a a"]);
});

Deno.test("parameter expansion curly braces", () => {
  assertStdout('foo=bar; echo "${foo}"', ["bar"]);
  assertStdout('foo=bar; echo "${foo}bar"', ["barbar"]);
  assertStdout('foo=bar; echo "bar${foo}"', ["barbar"]);
  assertStdout('foo=bar; echo "bar${foo}bar"', ["barbarbar"]);
  assertStdout('foo=bar; echo "bar{foo}bar"', ["bar{foo}bar"]);
});

Deno.test("undefined variable", () => assertStdout("echo $a", [""]));
Deno.test("string expansion undefined variable", () =>
  assertStdout('echo "$a"', [""]));
Deno.test("useless expression", () => assertStdout("$((0+0))", []));
Deno.test("echo keyword", () => assertStdout("echo if", ["if"]));
Deno.test("echo with spaces", () => {
  assertStdout("echo if       else", ["if else"]);
  assertStdout('echo "if   else"', ["if   else"]);
});

function assertStdout(program: string, expectedOutputs: string[]) {
  const parser = new Parser(new Lexer(program));
  const outputs: string[] = [];
  const stdout: Stdout = {
    print(msg: string) {
      outputs.push(msg);
    },
  };
  const evaluator = new Evaluator(new Map(), stdout);
  evaluator.run(parser.parse());
  assertEquals(
    outputs,
    expectedOutputs,
    `
Program: '${program}'
Expected: '[${expectedOutputs.join(", ")}]'
Actual: '[${outputs.join(", ")}]'`,
  );
}
