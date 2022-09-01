import {
  ArithmeticExpression,
  Assignment,
  Condition,
  Expression,
  ExpressionStatement,
  FunctionApplication,
  Identifier,
  InfixExpression,
  NumberConstant,
  Operator,
  Program,
  Statement,
  StringConstant,
} from "./parser.ts";

interface Value {
  show(): string;
}

class Void implements Value {
  show(): string {
    return "void";
  }
}

class NumberValue implements Value {
  constructor(public readonly n: number) {}

  show(): string {
    return `${this.n}`;
  }
}

class BooleanValue implements Value {
  constructor(public readonly b: boolean) {}

  show(): string {
    return `${this.b}`;
  }
}

class StringValue implements Value {
  constructor(public readonly s: string) {}

  show(): string {
    return `${this.s}`;
  }
}

export interface Stdout {
  print(msg: string): void;
}

export class Evaluator {
  private variables: Map<string, Value> = new Map();

  constructor(private stdout: Stdout) {}

  run(p: Program) {
    for (const statement of p.statements) {
      this.evalStatement(statement);
    }
  }

  private evalStatement(statement: Statement): void {
    if (statement instanceof Condition) {
      return this.evalCondition(statement);
    }

    if (statement instanceof Assignment) {
      return this.evalAssignment(statement);
    }

    if (statement instanceof ExpressionStatement) {
      this.evalExpression(statement.expression, "regular");
      return;
    }

    throw new Error(
      `Unhandled statement: ${statement.constructor.name}`,
    );
  }

  private evalExpression(
    exp: Expression,
    mode: "regular" | "arithmetic",
  ): Value {
    if (exp instanceof NumberConstant) {
      return new NumberValue(exp.n);
    }

    if (exp instanceof StringConstant) {
      return this.evalString(exp);
    }

    if (exp instanceof ArithmeticExpression) {
      return this.evalExpression(exp.expression, "arithmetic");
    }

    if (exp instanceof InfixExpression) {
      return this.evalInfixExpression(exp.lhs, exp.op, exp.rhs, mode);
    }

    if (exp instanceof Identifier) {
      return this.evalIdentifier(exp, mode);
    }

    if (exp instanceof FunctionApplication) {
      return this.evalFunctionApplication(exp);
    }

    throw new Error(`Unhandled expression ${exp.constructor.name}`);
  }

  private evalFunctionApplication(exp: FunctionApplication): Value {
    const name = exp.name.s;
    const parameters = exp.parameters.map((p) =>
      this.evalExpression(p, "regular")
    );

    if (name === "echo") {
      this.stdout.print(parameters.map((obj) => obj.show()).join(" "));
      return new Void();
    }

    throw new Error(`Unhandled function ${name}`);
  }

  private evalIdentifier(
    identifier: Identifier,
    mode: "regular" | "arithmetic",
  ): Value {
    const { value: name } = identifier;

    if (mode === "regular" && !name.startsWith("$")) {
      return new StringValue(name);
    }

    const lookupName = mode === "arithmetic" && !name.startsWith("$")
      ? name
      : name.slice(1);
    const value = this.variables.get(lookupName);

    if (!value && mode === "arithmetic") {
      return new NumberValue(0);
    }

    if (!value) {
      return new StringValue("");
    }

    return value;
  }

  private evalInfixExpression(
    lhs: Expression,
    op: Operator,
    rhs: Expression,
    mode: "regular" | "arithmetic",
  ): Value {
    const left = this.evalExpression(lhs, mode);
    const right = this.evalExpression(rhs, mode);

    if (op == Operator.Plus) {
      if (left instanceof NumberValue && right instanceof NumberValue) {
        return new NumberValue(left.n + right.n);
      }
    }
    if (op == Operator.Asterisk) {
      if (left instanceof NumberValue && right instanceof NumberValue) {
        return new NumberValue(left.n * right.n);
      }
    }
    if (op == Operator.Equal) {
      if (left instanceof NumberValue && right instanceof NumberValue) {
        return new BooleanValue(left.n === right.n);
      }
    }

    throw new Error(`Unhandled operator ${op}`);
  }

  private evalCondition(statement: Condition) {
    const condition = this.evalExpression(statement.condition, "regular");

    if (!(condition instanceof BooleanValue)) {
      throw new Error(
        `Condition must eval to BooleanValue, but got ${condition.constructor.name}`,
      );
    }

    if (condition.b) {
      return this.evalStatement(statement.then);
    }

    if (statement.other) {
      return this.evalStatement(statement.other);
    }
  }

  private evalAssignment(statement: Assignment): void {
    const value = this.evalExpression(statement.rhs, "regular");
    this.variables.set(statement.lhs.value, value);
  }

  private evalString(exp: StringConstant) {
    let output = "";

    for (let i = 0; i < exp.s.length; i++) {
      const char = exp.s[i];

      if (char === "\\") {
        output += exp.s[++i];
      } else if (char === "$") {
        const [substitution, newI] = this.substituteVariable(exp.s, i);
        i = newI;
        output += substitution;
      } else {
        output += char;
      }
    }

    return new StringValue(output);
  }

  private substituteVariable(string: string, i: number): [string, number] {
    i++; // skip $

    const curly = string[i] === "{";
    if (curly) i++; // skip {

    let varName = "";
    for (; i < string.length; i++) {
      if (!string[i].match(/[a-zA-Z0-9_]/)) {
        i--; // read too far, current char is part of string again
        break;
      }
      varName += string[i];
    }
    const result = this.variables.get(varName)?.show() ?? "";

    if (curly) i++; // skip }

    return [result, i];
  }
}
