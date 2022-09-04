import {
  assert,
  AssertionError,
} from "https://deno.land/std@0.153.0/testing/asserts.ts";
import { Lexer, Token } from "./lexer.ts";

Deno.test("comments", () => {
  assertTokens("# foo", []);
  assertTokens("echo foo; # foo", [
    { type: "STRING", value: "echo" },
    { type: "STRING", value: "foo" },
    { type: "KEYWORD", value: ";" },
  ]);
  assertTokens(
    `# foo
  echo foo # bar ;
  # foo`,
    [
      { type: "NEWLINE", value: "\n" },
      { type: "STRING", value: "echo" },
      { type: "STRING", value: "foo" },
      { type: "NEWLINE", value: "\n" },
    ],
  );
});

Deno.test("braces", () => {
  assertTokens("[", [{ type: "OP", value: "[" }]);
  assertTokens("]", [{ type: "OP", value: "]" }]);
  assertTokens("[]", [{ type: "OP", value: "[" }, { type: "OP", value: "]" }]);
});

Deno.test("declare variables", () => {
  assertTokens("A=a", [
    { type: "STRING", value: "A" },
    { type: "OP", value: "=" },
    { type: "STRING", value: "a" },
  ]);
  assertTokens("a=5", [
    { type: "STRING", value: "a" },
    { type: "OP", value: "=" },
    { type: "NUMBER", value: "5" },
  ]);
  assertTokens("ABC=abc", [
    { type: "STRING", value: "ABC" },
    { type: "OP", value: "=" },
    { type: "STRING", value: "abc" },
  ]);
  assertTokens("A=A", [
    { type: "STRING", value: "A" },
    { type: "OP", value: "=" },
    { type: "STRING", value: "A" },
  ]);
  assertTokens("A1=B2", [
    { type: "STRING", value: "A1" },
    { type: "OP", value: "=" },
    { type: "STRING", value: "B2" },
  ]);
  assertTokens("aBc1_z=X", [
    { type: "STRING", value: "aBc1_z" },
    { type: "OP", value: "=" },
    { type: "STRING", value: "X" },
  ]);
});

Deno.test("arithmetic expansion", () => {
  assertTokens("$((5))", [
    { type: "ARITHMETIC_OPEN", value: "$((" },
    { type: "NUMBER", value: "5" },
    { type: "OP", value: ")" },
    { type: "OP", value: ")" },
  ]);
  assertTokens("$((5 + 4))", [
    { type: "ARITHMETIC_OPEN", value: "$((" },
    { type: "NUMBER", value: "5" },
    { type: "OP", value: "+" },
    { type: "NUMBER", value: "4" },
    { type: "OP", value: ")" },
    { type: "OP", value: ")" },
  ]);
  assertTokens("$((5 * 4))", [
    { type: "ARITHMETIC_OPEN", value: "$((" },
    { type: "NUMBER", value: "5" },
    { type: "OP", value: "*" },
    { type: "NUMBER", value: "4" },
    { type: "OP", value: ")" },
    { type: "OP", value: ")" },
  ]);
  assertTokens("$((0 + 4))", [
    { type: "ARITHMETIC_OPEN", value: "$((" },
    { type: "NUMBER", value: "0" },
    { type: "OP", value: "+" },
    { type: "NUMBER", value: "4" },
    { type: "OP", value: ")" },
    { type: "OP", value: ")" },
  ]);
  assertTokens("$(($((0))))", [
    { type: "ARITHMETIC_OPEN", value: "$((" },
    { type: "ARITHMETIC_OPEN", value: "$((" },
    { type: "NUMBER", value: "0" },
    { type: "OP", value: ")" },
    { type: "OP", value: ")" },
    { type: "OP", value: ")" },
    { type: "OP", value: ")" },
  ]);
  assertTokens("$((a))", [
    { type: "ARITHMETIC_OPEN", value: "$((" },
    { type: "IDENTIFIER", value: "a" },
    { type: "OP", value: ")" },
    { type: "OP", value: ")" },
  ]);
});

Deno.test("braces", () => {
  assertTokens("$(((5)))", [
    { type: "ARITHMETIC_OPEN", value: "$((" },
    { type: "OP", value: "(" },
    { type: "NUMBER", value: "5" },
    { type: "OP", value: ")" },
    { type: "OP", value: ")" },
    { type: "OP", value: ")" },
  ]);
  assertTokens("$((((5))))", [
    { type: "ARITHMETIC_OPEN", value: "$((" },
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
    { type: "STRING", value: "A" },
    { type: "OP", value: "=" },
    { type: "STRING", value: "" },
  ]);
  assertTokens('A="a"', [
    { type: "STRING", value: "A" },
    { type: "OP", value: "=" },
    { type: "STRING", value: "a" },
  ]);
  assertTokens('A="abc"', [
    { type: "STRING", value: "A" },
    { type: "OP", value: "=" },
    { type: "STRING", value: "abc" },
  ]);
  assertTokens('A="abc""bcd"', [
    { type: "STRING", value: "A" },
    { type: "OP", value: "=" },
    { type: "STRING", value: "abcbcd" },
  ]);
  assertTokens('A="abc""bcd""efg"', [
    { type: "STRING", value: "A" },
    { type: "OP", value: "=" },
    { type: "STRING", value: "abcbcdefg" },
  ]);
});

Deno.test("use variables", () => {
  assertTokens("$A", [{ type: "STRING", value: "$A" }]);
  assertTokens("$ABC", [{ type: "STRING", value: "$ABC" }]);
});

Deno.test("simple condition", () => {
  assertTokens('["a" = $b]', [
    { type: "OP", value: "[" },
    { type: "STRING", value: "a" },
    { type: "OP", value: "=" },
    { type: "STRING", value: "$b" },
    { type: "OP", value: "]" },
  ]);
});

Deno.test("if condition", () => {
  assertTokens('if ["a" = $b]; then $a else $b fi', [
    { type: "KEYWORD", value: "if" },
    { type: "OP", value: "[" },
    { type: "STRING", value: "a" },
    { type: "OP", value: "=" },
    { type: "STRING", value: "$b" },
    { type: "OP", value: "]" },
    { type: "KEYWORD", value: ";" },
    { type: "KEYWORD", value: "then" },
    { type: "STRING", value: "$a" },
    { type: "KEYWORD", value: "else" },
    { type: "STRING", value: "$b" },
    { type: "KEYWORD", value: "fi" },
  ]);
});

Deno.test("function application", () => {
  assertTokens("echo $a", [
    { type: "STRING", value: "echo" },
    { type: "STRING", value: "$a" },
  ]);

  assertTokens("echo 5", [
    { type: "STRING", value: "echo" },
    { type: "NUMBER", value: "5" },
  ]);
});

Deno.test("command invocation", () => {
  assertTokens(
    'docker run -v "$PWD":/mnt -w /mnt mvdan/shfmt "${ARGS[@]}" -- *.sh',
    [
      { type: "STRING", value: "docker" },
      { type: "STRING", value: "run" },
      { type: "STRING", value: "-v" },
      { type: "STRING", value: "$PWD:/mnt" },
      { type: "STRING", value: "-w" },
      { type: "STRING", value: "/mnt" },
      { type: "STRING", value: "mvdan/shfmt" },
      { type: "STRING", value: "${ARGS[@]}" },
      { type: "STRING", value: "--" },
      { type: "STRING", value: "*.sh" },
    ],
  );
});

Deno.test("if condition multiple lines", () => {
  assertTokens(
    `if [ a = b ]; then
    echo c
  else
    echo d;
  fi`,
    [
      { type: "KEYWORD", value: "if" },
      { type: "OP", value: "[" },
      { type: "STRING", value: "a" },
      { type: "OP", value: "=" },
      { type: "STRING", value: "b" },
      { type: "OP", value: "]" },
      { type: "KEYWORD", value: ";" },
      { type: "KEYWORD", value: "then" },
      { type: "NEWLINE", value: "\n" },
      { type: "STRING", value: "echo" },
      { type: "STRING", value: "c" },
      { type: "NEWLINE", value: "\n" },
      { type: "KEYWORD", value: "else" },
      { type: "NEWLINE", value: "\n" },
      { type: "STRING", value: "echo" },
      { type: "STRING", value: "d" },
      { type: "KEYWORD", value: ";" },
      { type: "NEWLINE", value: "\n" },
      { type: "KEYWORD", value: "fi" },
    ],
  );
});

function assertTokens(
  input: string,
  tokens: Token[],
) {
  const lexer = new Lexer(input);
  for (const token of tokens) {
    assertToken(token, lexer.next());
  }
  const next = lexer.next();

  assert(!next, `more chars: '${JSON.stringify(next)}'`);
}

function assertToken(expected: Token, actual?: Token) {
  if (!actual) {
    throw new AssertionError(
      `Expected '${expected.value}' (${expected.type}), but stream is empty..`,
    );
  }
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
