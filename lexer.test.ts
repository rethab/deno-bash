import {
  assert,
  AssertionError,
} from "https://deno.land/std@0.153.0/testing/asserts.ts";
import { Lexer, Token } from "./lexer.ts";

Deno.test("braces", () => {
  assertTokens("[", [{ type: "OP", value: "[" }]);
  assertTokens("]", [{ type: "OP", value: "]" }]);
  assertTokens("[]", [{ type: "OP", value: "[" }, { type: "OP", value: "]" }]);
});

Deno.test("declare variables", () => {
  assertTokens("A=a", [
    { type: "IDENTIFIER", value: "A" },
    { type: "OP", value: "=" },
    { type: "IDENTIFIER", value: "a" },
  ]);
  assertTokens("a=5", [
    { type: "IDENTIFIER", value: "a" },
    { type: "OP", value: "=" },
    { type: "NUMBER", value: "5" },
  ]);
  assertTokens("ABC=abc", [
    { type: "IDENTIFIER", value: "ABC" },
    { type: "OP", value: "=" },
    { type: "IDENTIFIER", value: "abc" },
  ]);
  assertTokens("A=A", [
    { type: "IDENTIFIER", value: "A" },
    { type: "OP", value: "=" },
    { type: "IDENTIFIER", value: "A" },
  ]);
  assertTokens("A1=B2", [
    { type: "IDENTIFIER", value: "A1" },
    { type: "OP", value: "=" },
    { type: "IDENTIFIER", value: "B2" },
  ]);
  assertTokens("aBc1_z=X", [
    { type: "IDENTIFIER", value: "aBc1_z" },
    { type: "OP", value: "=" },
    { type: "IDENTIFIER", value: "X" },
  ]);
});

Deno.test("arithmetic expansion", () => {
  assertTokens("$((5))", [
    { type: "OP", value: "$((" },
    { type: "NUMBER", value: "5" },
    { type: "OP", value: ")" },
    { type: "OP", value: ")" },
  ]);
  assertTokens("$((5 + 4))", [
    { type: "OP", value: "$((" },
    { type: "NUMBER", value: "5" },
    { type: "OP", value: "+" },
    { type: "NUMBER", value: "4" },
    { type: "OP", value: ")" },
    { type: "OP", value: ")" },
  ]);
  assertTokens("$((5 * 4))", [
    { type: "OP", value: "$((" },
    { type: "NUMBER", value: "5" },
    { type: "OP", value: "*" },
    { type: "NUMBER", value: "4" },
    { type: "OP", value: ")" },
    { type: "OP", value: ")" },
  ]);
  assertTokens("$((0 + 4))", [
    { type: "OP", value: "$((" },
    { type: "NUMBER", value: "0" },
    { type: "OP", value: "+" },
    { type: "NUMBER", value: "4" },
    { type: "OP", value: ")" },
    { type: "OP", value: ")" },
  ]);
});

Deno.test("braces", () => {
  assertTokens("$(((5)))", [
    { type: "OP", value: "$((" },
    { type: "OP", value: "(" },
    { type: "NUMBER", value: "5" },
    { type: "OP", value: ")" },
    { type: "OP", value: ")" },
    { type: "OP", value: ")" },
  ]);
  assertTokens("$((((5))))", [
    { type: "OP", value: "$((" },
    { type: "OP", value: "(" },
    { type: "OP", value: "(" },
    { type: "NUMBER", value: "5" },
    { type: "OP", value: ")" },
    { type: "OP", value: ")" },
    { type: "OP", value: ")" },
    { type: "OP", value: ")" },
  ]);
});

Deno.test("strings", () => {
  assertTokens('""', [
    { type: "STRING", value: "" },
  ]);
  assertTokens('" "', [
    { type: "STRING", value: " " },
  ]);
  assertTokens('A=""', [
    { type: "IDENTIFIER", value: "A" },
    { type: "OP", value: "=" },
    { type: "STRING", value: "" },
  ]);
  assertTokens('A="a"', [
    { type: "IDENTIFIER", value: "A" },
    { type: "OP", value: "=" },
    { type: "STRING", value: "a" },
  ]);
  assertTokens('A="abc"', [
    { type: "IDENTIFIER", value: "A" },
    { type: "OP", value: "=" },
    { type: "STRING", value: "abc" },
  ]);
});

Deno.test("use variables", () => {
  assertTokens("$A", [{ type: "IDENTIFIER", value: "$A" }]);
  assertTokens("$ABC", [{ type: "IDENTIFIER", value: "$ABC" }]);
});

Deno.test("simple condition", () => {
  assertTokens('["a" = $b]', [
    { type: "OP", value: "[" },
    { type: "STRING", value: "a" },
    { type: "OP", value: "=" },
    { type: "IDENTIFIER", value: "$b" },
    { type: "OP", value: "]" },
  ]);
});

Deno.test("if condition", () => {
  assertTokens('if ["a" = $b]; then $a else $b fi', [
    { type: "KEYWORD", value: "if" },
    { type: "OP", value: "[" },
    { type: "STRING", value: "a" },
    { type: "OP", value: "=" },
    { type: "IDENTIFIER", value: "$b" },
    { type: "OP", value: "]" },
    { type: "KEYWORD", value: ";" },
    { type: "KEYWORD", value: "then" },
    { type: "IDENTIFIER", value: "$a" },
    { type: "KEYWORD", value: "else" },
    { type: "IDENTIFIER", value: "$b" },
    { type: "KEYWORD", value: "fi" },
  ]);
});

Deno.test("function application", () => {
  assertTokens("echo $a", [
    { type: "IDENTIFIER", value: "echo" },
    { type: "IDENTIFIER", value: "$a" },
  ]);

  assertTokens("echo 5", [
    { type: "IDENTIFIER", value: "echo" },
    { type: "NUMBER", value: "5" },
  ]);
});

function assertTokens(
  input: string,
  tokens: Token[],
) {
  const lexer = new Lexer(input);
  for (const token of tokens) {
    assertToken(token, lexer.next()!);
  }
  const next = lexer.next();

  assert(!next, `more chars: '${next}'`);
}

function assertToken(expected: Token, actual: Token) {
  if (expected.type !== actual.type) {
    throw new AssertionError(
      `Expected type ${expected.type} ('${expected.value}') but got ${actual.type} ('${actual.value}')`,
    );
  }
  if (expected.value !== actual.value) {
    throw new AssertionError(
      `Expected value '${expected.value}' but got '${actual.value}'`,
    );
  }
}
