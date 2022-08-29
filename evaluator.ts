import {
  ArithmeticExpression,
  ArithmeticInfixExpression,
  Assignment,
  BooleanExpression,
  Condition,
  Expression,
  ExpressionStatement,
  FunctionApplication,
  Identifier,
  NumberConstant,
  Operator,
  Program,
  Statement,
  StringConstant,
} from "./parser.ts";

interface Value {
  show(): string;
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

export class Evaluator {
  private variables: Map<string, Value> = new Map();

  run(p: Program): string[] {
    const outputs = [];
    for (const statement of p.statements) {
      outputs.push(...this.evalStatement(statement));
    }
    return outputs;
  }

  private evalStatement(statement: Statement): string[] {
    if (statement instanceof FunctionApplication) {
      const name = statement.identifier.value;
      const parameters = statement.parameters.map((p) =>
        this.evalExpression(p, "regular")
      );
      if (name === "echo") {
        return [parameters.map((obj) => obj.show()).join(" ")];
      }
    }

    if (statement instanceof Condition) {
      return this.evalCondition(statement);
    }

    if (statement instanceof Assignment) {
      this.evalAssignment(statement);
      return [];
    }

    if (statement instanceof ExpressionStatement) {
      this.evalExpression(statement.expression, "regular");
      return [];
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
      return new StringValue(exp.s);
    }

    if (exp instanceof ArithmeticExpression) {
      return this.evalExpression(exp.expression, "arithmetic");
    }

    if (exp instanceof ArithmeticInfixExpression) {
      return this.evalInfixExpression(exp.lhs, exp.op, exp.rhs, "arithmetic");
    }

    if (exp instanceof BooleanExpression) {
      return this.evalInfixExpression(exp.lhs, exp.op, exp.rhs, "regular");
    }

    if (exp instanceof Identifier) {
      return this.evalIdentifier(exp, mode);
    }

    throw new Error(`Unhandled expression ${exp.constructor.name}`);
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
    if (op == Operator.Equal) {
      if (left instanceof NumberValue && right instanceof NumberValue) {
        return new BooleanValue(left.n === right.n);
      }
    }

    throw new Error(`Unhandled operator ${op}`);
  }

  private evalCondition(statement: Condition): string[] {
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

    return [];
  }

  private evalAssignment(statement: Assignment): void {
    const value = this.evalExpression(statement.rhs, "regular");
    this.variables.set(statement.lhs.value, value);
  }
}
