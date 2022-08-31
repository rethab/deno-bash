import { assertEquals } from "https://deno.land/std@0.153.0/testing/asserts.ts";
import { Lexer } from "./lexer.ts";
import {
  ArithmeticExpression,
  Assignment,
  Condition,
  ExpressionStatement,
  FunctionApplication,
  Identifier,
  InfixExpression,
  NumberConstant,
  Operator,
  Parser,
  Program,
  StringConstant,
} from "./parser.ts";

Deno.test("variable assignment", () => {
  assertProgram("a = b", {
    statements: [
      new Assignment(new Identifier("a"), new Identifier("b")),
    ],
  });
});

Deno.test("number assignment", () => {
  assertProgram("a = 5", {
    statements: [
      new Assignment(new Identifier("a"), new NumberConstant(5)),
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

Deno.test("arithmetic expression nested", () => {
  assertProgram("$(($((3))))", {
    statements: [
      new ExpressionStatement(
        new ArithmeticExpression(
          new ArithmeticExpression(new NumberConstant(3)),
        ),
      ),
    ],
  });
});

Deno.test("arithmetic expression with braces", () => {
  assertProgram("$(((((3)))))", {
    statements: [
      new ExpressionStatement(
        new ArithmeticExpression(new NumberConstant(3)),
      ),
    ],
  });
});

Deno.test("operator precedence addition", () => {
  assertProgram("$((5 + 4 + 3))", {
    statements: [
      new ExpressionStatement(
        new ArithmeticExpression(
          new InfixExpression(
            new InfixExpression(
              new NumberConstant(5),
              new NumberConstant(4),
              Operator.Plus,
            ),
            new NumberConstant(3),
            Operator.Plus,
          ),
        ),
      ),
    ],
  });
});

Deno.test("operator precedence addition", () => {
  assertProgram("$((5 + 4 + 3 + 2 + 1))", {
    statements: [
      new ExpressionStatement(
        new ArithmeticExpression(
          new InfixExpression(
            new InfixExpression(
              new InfixExpression(
                new InfixExpression(
                  new NumberConstant(5),
                  new NumberConstant(4),
                  Operator.Plus,
                ),
                new NumberConstant(3),
                Operator.Plus,
              ),
              new NumberConstant(2),
              Operator.Plus,
            ),
            new NumberConstant(1),
            Operator.Plus,
          ),
        ),
      ),
    ],
  });
});

Deno.test("operator precedence addition with braces", () => {
  assertProgram("$((5 + (4 + 3)))", {
    statements: [
      new ExpressionStatement(
        new ArithmeticExpression(
          new InfixExpression(
            new NumberConstant(5),
            new InfixExpression(
              new NumberConstant(4),
              new NumberConstant(3),
              Operator.Plus,
            ),
            Operator.Plus,
          ),
        ),
      ),
    ],
  });
});

Deno.test("operator precedence multiplication left-to-right", () => {
  assertProgram("$((5 * 4 + 3))", {
    statements: [
      new ExpressionStatement(
        new ArithmeticExpression(
          new InfixExpression(
            new InfixExpression(
              new NumberConstant(5),
              new NumberConstant(4),
              Operator.Asterisk,
            ),
            new NumberConstant(3),
            Operator.Plus,
          ),
        ),
      ),
    ],
  });
});

Deno.test("operator precedence multiplication between additions", () => {
  assertProgram("$((5 + 4 * 3 + 2))", {
    statements: [
      new ExpressionStatement(
        new ArithmeticExpression(
          new InfixExpression(
            new InfixExpression(
              new NumberConstant(5),
              new InfixExpression(
                new NumberConstant(4),
                new NumberConstant(3),
                Operator.Asterisk,
              ),
              Operator.Plus,
            ),
            new NumberConstant(2),
            Operator.Plus,
          ),
        ),
      ),
    ],
  });
});

Deno.test("arithmetic expression addition", () => {
  assertProgram("$((5 + 4))", {
    statements: [
      new ExpressionStatement(
        new ArithmeticExpression(
          new InfixExpression(
            new NumberConstant(5),
            new NumberConstant(4),
            Operator.Plus,
          ),
        ),
      ),
    ],
  });
});

Deno.test("arithmetic expression addition with variable", () => {
  assertProgram("$((a + 4))", {
    statements: [
      new ExpressionStatement(
        new ArithmeticExpression(
          new InfixExpression(
            new Identifier("a"),
            new NumberConstant(4),
            Operator.Plus,
          ),
        ),
      ),
    ],
  });
});

Deno.test("condition (if else)", () => {
  assertProgram("if [ a = b ]; then c else d fi", {
    statements: [
      new Condition(
        new InfixExpression(
          new Identifier("a"),
          new Identifier("b"),
          Operator.Equal,
        ),
        new ExpressionStatement(new Identifier("c")),
        new ExpressionStatement(new Identifier("d")),
      ),
    ],
  });
});

Deno.test("condition (only if)", () => {
  assertProgram("if [ a = b ]; then c fi", {
    statements: [
      new Condition(
        new InfixExpression(
          new Identifier("a"),
          new Identifier("b"),
          Operator.Equal,
        ),
        new ExpressionStatement(new Identifier("c")),
      ),
    ],
  });
});

Deno.test("condition (nested expression)", () => {
  assertProgram("if [ $((a + 1)) = b ]; then c fi", {
    statements: [
      new Condition(
        new InfixExpression(
          new ArithmeticExpression(
            new InfixExpression(
              new Identifier("a"),
              new NumberConstant(1),
              Operator.Plus,
            ),
          ),
          new Identifier("b"),
          Operator.Equal,
        ),
        new ExpressionStatement(new Identifier("c")),
      ),
    ],
  });
});

Deno.test("condition (nested expression 2)", () => {
  assertProgram("if [ $((a + 1)) = $((b + 1 * 2)) ]; then c fi", {
    statements: [
      new Condition(
        new InfixExpression(
          new ArithmeticExpression(
            new InfixExpression(
              new Identifier("a"),
              new NumberConstant(1),
              Operator.Plus,
            ),
          ),
          new ArithmeticExpression(
            new InfixExpression(
              new Identifier("b"),
              new InfixExpression(
                new NumberConstant(1),
                new NumberConstant(2),
                Operator.Asterisk,
              ),
              Operator.Plus,
            ),
          ),
          Operator.Equal,
        ),
        new ExpressionStatement(new Identifier("c")),
      ),
    ],
  });
});

Deno.test("condition (semicolons)", () => {
  assertProgram("if [ a = b ]; then c; else d; fi", {
    statements: [
      new Condition(
        new InfixExpression(
          new Identifier("a"),
          new Identifier("b"),
          Operator.Equal,
        ),
        new ExpressionStatement(new Identifier("c")),
        new ExpressionStatement(new Identifier("d")),
      ),
    ],
  });
});

Deno.test("condition with function application", () => {
  assertProgram("if [ a = b ]; then echo c fi", {
    statements: [
      new Condition(
        new InfixExpression(
          new Identifier("a"),
          new Identifier("b"),
          Operator.Equal,
        ),
        new FunctionApplication(new Identifier("echo"), [new Identifier("c")]),
      ),
    ],
  });
});

Deno.test("condition with arithmetic expression", () => {
  assertProgram("if [ a = b ]; then echo $((5+5)) fi", {
    statements: [
      new Condition(
        new InfixExpression(
          new Identifier("a"),
          new Identifier("b"),
          Operator.Equal,
        ),
        new FunctionApplication(
          new Identifier("echo"),
          [
            new ArithmeticExpression(
              new InfixExpression(
                new NumberConstant(5),
                new NumberConstant(5),
                Operator.Plus,
              ),
            ),
          ],
        ),
      ),
    ],
  });
});

Deno.test("function application", () => {
  assertProgram("echo $((5))", {
    statements: [
      new FunctionApplication(
        new Identifier("echo"),
        [new ArithmeticExpression(new NumberConstant(5))],
      ),
    ],
  });

  assertProgram("echo $a", {
    statements: [
      new FunctionApplication(new Identifier("echo"), [new Identifier("$a")]),
    ],
  });

  assertProgram("echo 5", {
    statements: [
      new FunctionApplication(new Identifier("echo"), [new NumberConstant(5)]),
    ],
  });

  assertProgram("echo 5 6", {
    statements: [
      new FunctionApplication(
        new Identifier("echo"),
        [new NumberConstant(5), new NumberConstant(6)],
      ),
    ],
  });

  assertProgram('echo "hello"', {
    statements: [
      new FunctionApplication(new Identifier("echo"), [
        new StringConstant("hello"),
      ]),
    ],
  });
});

Deno.test("multiple statement on one line", () => {
  assertProgram("a=5;", {
    statements: [
      new Assignment(new Identifier("a"), new NumberConstant(5)),
    ],
  });

  assertProgram("a=5;b=6", {
    statements: [
      new Assignment(new Identifier("a"), new NumberConstant(5)),
      new Assignment(new Identifier("b"), new NumberConstant(6)),
    ],
  });

  assertProgram("a=5;b=6;", {
    statements: [
      new Assignment(new Identifier("a"), new NumberConstant(5)),
      new Assignment(new Identifier("b"), new NumberConstant(6)),
    ],
  });

  assertProgram("a=5;b=6;c=7;d=8", {
    statements: [
      new Assignment(new Identifier("a"), new NumberConstant(5)),
      new Assignment(new Identifier("b"), new NumberConstant(6)),
      new Assignment(new Identifier("c"), new NumberConstant(7)),
      new Assignment(new Identifier("d"), new NumberConstant(8)),
    ],
  });

  assertProgram("a = 5; echo $a", {
    statements: [
      new Assignment(new Identifier("a"), new NumberConstant(5)),
      new FunctionApplication(new Identifier("echo"), [new Identifier("$a")]),
    ],
  });

  assertProgram("echo $a;", {
    statements: [
      new FunctionApplication(new Identifier("echo"), [new Identifier("$a")]),
    ],
  });

  assertProgram("a=5;echo $a ;b = 7", {
    statements: [
      new Assignment(new Identifier("a"), new NumberConstant(5)),
      new FunctionApplication(new Identifier("echo"), [new Identifier("$a")]),
      new Assignment(new Identifier("b"), new NumberConstant(7)),
    ],
  });
});

function assertProgram(input: string, program: Program) {
  const lexer = new Lexer(input);
  const parser = new Parser(lexer);
  const actualProgram = parser.parse();
  assertEquals(program, actualProgram);
}
