import {
  assertEquals,
  assertObjectMatch,
} from "https://deno.land/std@0.153.0/testing/asserts.ts";
import { Lexer } from "./lexer.ts";
import {
  ArithmeticExpression,
  ArithmeticInfixExpression,
  Assignment,
  BooleanExpression,
  Condition,
  ExpressionStatement,
  FunctionApplication,
  Identifier,
  NumberConstant,
  Operator,
  Parser,
  Program,
  StringConstant,
} from "./parser.ts";

Deno.test("variable assignment", () => {
  assertProgram("a = b", {
    statements: [
      new Assignment(
        new Identifier({ type: "IDENTIFIER", value: "a" }),
        new Identifier({ type: "IDENTIFIER", value: "b" }),
      ),
    ],
  });
});

Deno.test("number assignment", () => {
  assertProgram("a = 5", {
    statements: [
      new Assignment(
        new Identifier({ type: "IDENTIFIER", value: "a" }),
        new Identifier({ type: "NUMBER", value: "5" }),
      ),
    ],
  });
});

Deno.test("arithmetic expression constant", () => {
  assertProgram("$((3))", {
    statements: [
      new ExpressionStatement(
        new ArithmeticExpression(
          new NumberConstant(3),
        ),
      ),
    ],
  });
});

Deno.test("arithmetic expression addition", () => {
  assertProgram("$((5 + 4))", {
    statements: [
      new ExpressionStatement(
        new ArithmeticInfixExpression(
          new Identifier({ type: "NUMBER", value: "5" }),
          new Identifier({ type: "NUMBER", value: "4" }),
          Operator.Plus,
        ),
      ),
    ],
  });
});

Deno.test("arithmetic expression addition with variable", () => {
  assertProgram("$((a + 4))", {
    statements: [
      new ExpressionStatement(
        new ArithmeticInfixExpression(
          new Identifier({ type: "IDENTIFIER", value: "a" }),
          new Identifier({ type: "NUMBER", value: "4" }),
          Operator.Plus,
        ),
      ),
    ],
  });
});

Deno.test("condition (if else)", () => {
  assertProgram("if [ a = b ]; then c else d fi", {
    statements: [
      new Condition(
        new BooleanExpression(
          new Identifier({ type: "IDENTIFIER", value: "a" }),
          new Identifier({ type: "IDENTIFIER", value: "b" }),
          Operator.Equal,
        ),
        new ExpressionStatement(
          new Identifier({ type: "IDENTIFIER", value: "c" }),
        ),
        new ExpressionStatement(
          new Identifier({ type: "IDENTIFIER", value: "d" }),
        ),
      ),
    ],
  });
});

Deno.test("condition (only if)", () => {
  assertProgram("if [ a = b ]; then c fi", {
    statements: [
      new Condition(
        new BooleanExpression(
          new Identifier({ type: "IDENTIFIER", value: "a" }),
          new Identifier({ type: "IDENTIFIER", value: "b" }),
          Operator.Equal,
        ),
        new ExpressionStatement(
          new Identifier({ type: "IDENTIFIER", value: "c" }),
        ),
      ),
    ],
  });
});

Deno.test("condition with function application", () => {
  assertProgram("if [ a = b ]; then echo c fi", {
    statements: [
      new Condition(
        new BooleanExpression(
          new Identifier({ type: "IDENTIFIER", value: "a" }),
          new Identifier({ type: "IDENTIFIER", value: "b" }),
          Operator.Equal,
        ),
        new FunctionApplication(
          new Identifier({ type: "IDENTIFIER", value: "echo" }),
          [new Identifier({ type: "IDENTIFIER", value: "c" })],
        ),
      ),
    ],
  });
});

Deno.test("function application", () => {
  assertProgram("echo $((5))", {
    statements: [
      new FunctionApplication(
        new Identifier({ type: "IDENTIFIER", value: "echo" }),
        [new ArithmeticExpression(new NumberConstant(5))],
      ),
    ],
  });

  assertProgram("echo $a", {
    statements: [
      new FunctionApplication(
        new Identifier({ type: "IDENTIFIER", value: "echo" }),
        [new Identifier({ type: "IDENTIFIER", value: "$a" })],
      ),
    ],
  });

  assertProgram("echo 5", {
    statements: [
      new FunctionApplication(
        new Identifier({ type: "IDENTIFIER", value: "echo" }),
        [new NumberConstant(5)],
      ),
    ],
  });

  assertProgram("echo 5 6", {
    statements: [
      new FunctionApplication(
        new Identifier({ type: "IDENTIFIER", value: "echo" }),
        [new NumberConstant(5), new NumberConstant(6)],
      ),
    ],
  });

  assertProgram('echo "hello"', {
    statements: [
      new FunctionApplication(
        new Identifier({ type: "IDENTIFIER", value: "echo" }),
        [new StringConstant("hello")],
      ),
    ],
  });
});

function assertProgram(input: string, program: Program) {
  const lexer = new Lexer(input);
  const parser = new Parser(lexer);
  const actualProgram = parser.parse();
  assertEquals(program, actualProgram);
}