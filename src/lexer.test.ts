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
  assertTokens("[", [{ type: "CONDITIONAL_OPEN", value: "[" }]);
  assertTokens("[]", [{ type: "CONDITIONAL_OPEN", value: "[" }, {
    type: "OP",
    value: "]",
  }]);
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
    { type: "STRING", value: "", text: '""' },
  ]);
  assertTokens('" "', [
    { type: "STRING", value: " ", text: '" "' },
  ]);
  assertTokens('A=""', [
    { type: "STRING", value: "A", text: "A" },
    { type: "OP", value: "=" },
    { type: "STRING", value: "", text: '""' },
  ]);
  assertTokens('A="a"', [
    { type: "STRING", value: "A" },
    { type: "OP", value: "=" },
    { type: "STRING", value: "a", text: '"a"' },
  ]);
  assertTokens('A="abc"', [
    { type: "STRING", value: "A" },
    { type: "OP", value: "=" },
    { type: "STRING", value: "abc", text: '"abc"' },
  ]);
  assertTokens('A="abc""bcd"', [
    { type: "STRING", value: "A" },
    { type: "OP", value: "=" },
    { type: "STRING", value: "abcbcd", text: '"abc""bcd"' },
  ]);
  assertTokens('A="abc""bcd""efg"', [
    { type: "STRING", value: "A" },
    { type: "OP", value: "=" },
    { type: "STRING", value: "abcbcdefg", text: '"abc""bcd""efg"' },
  ]);
});

Deno.test("single quotes", () => {
  assertTokens(`'"'`, [{ type: "STRING", value: '"', text: `'"'` }]);
  assertTokens(`'"foo'`, [{ type: "STRING", value: '"foo', text: `'"foo'` }]);
  assertTokens(`'"fo"'`, [{ type: "STRING", value: '"fo"', text: `'"fo"'` }]);
  assertTokens(`'"fo"of'`, [{
    type: "STRING",
    value: '"fo"of',
    text: `'"fo"of'`,
  }]);
  assertTokens(`'"fo"of"'`, [{
    type: "STRING",
    value: '"fo"of"',
    text: `'"fo"of"'`,
  }]);
  assertTokens(`[ 'f"o' != 'of' ]`, [
    { type: "CONDITIONAL_OPEN", value: "[" },
    { type: "STRING", value: 'f"o', text: `'f"o'` },
    { type: "OP", value: "!=" },
    { type: "STRING", value: "of", text: `'of'` },
    { type: "OP", value: "]" },
  ]);
});

Deno.test("use variables", () => {
  assertTokens("$A", [{ type: "STRING", value: "$A" }]);
  assertTokens("$ABC", [{ type: "STRING", value: "$ABC" }]);
});

Deno.test("simple condition", () => {
  assertTokens('["a" = $b]', [
    { type: "CONDITIONAL_OPEN", value: "[" },
    { type: "STRING", value: "a" },
    { type: "OP", value: "=" },
    { type: "STRING", value: "$b" },
    { type: "OP", value: "]" },
  ]);
});

Deno.test("if condition", () => {
  assertTokens('if ["a" = $b]; then $a else $b fi', [
    { type: "KEYWORD", value: "if" },
    { type: "CONDITIONAL_OPEN", value: "[" },
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

Deno.test("command invocation: docker", () => {
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

Deno.test("command invocation: awk", () => {
  assertTokens(`awk 'BEGIN{print "foo"}'`, [
    { type: "STRING", value: "awk" },
    { type: "STRING", value: 'BEGIN{print "foo"}' },
  ]);
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
      { type: "CONDITIONAL_OPEN", value: "[" },
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

Deno.test("conditional expression", () => {
  assertTokens(
    '[ -n "$foo" ]; then',
    [
      { type: "CONDITIONAL_OPEN", value: "[" },
      { type: "OP", value: "-n" },
      { type: "STRING", value: "$foo" },
      { type: "OP", value: "]" },
      { type: "KEYWORD", value: ";" },
      { type: "KEYWORD", value: "then" },
    ],
  );
  assertTokens(
    "[ -z $foo ]",
    [
      { type: "CONDITIONAL_OPEN", value: "[" },
      { type: "OP", value: "-z" },
      { type: "STRING", value: "$foo" },
      { type: "OP", value: "]" },
    ],
  );
  assertTokens(
    '[ "foo" != "bar" ]',
    [
      { type: "CONDITIONAL_OPEN", value: "[" },
      { type: "STRING", value: "foo" },
      { type: "OP", value: "!=" },
      { type: "STRING", value: "bar" },
      { type: "OP", value: "]" },
    ],
  );
  assertTokens(
    "[ $((1)) ]",
    [
      { type: "CONDITIONAL_OPEN", value: "[" },
      { type: "ARITHMETIC_OPEN", value: "$((" },
      { type: "NUMBER", value: "1" },
      { type: "OP", value: ")" },
      { type: "OP", value: ")" },
      { type: "OP", value: "]" },
    ],
  );
});

function assertTokens(
  input: string,
  tokens: Partial<Token>[],
) {
  const lexer = new Lexer(input);
  for (const token of tokens) {
    assertToken(token, lexer.next());
  }
  const next = lexer.next();

  assert(!next, `more chars: '${JSON.stringify(next)}'`);
}

function assertToken(expected: Partial<Token>, actual?: Token) {
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
  if (expected.text && expected.text !== actual.text) {
    throw new AssertionError(
      `Expected text '${expected.text}' but got '${actual.text}'`,
    );
  }
}
