import {
  ArithmeticExpression,
  ArithmeticInfixExpression,
  BooleanExpression,
  Condition,
  Expression,
  FunctionApplication,
  NumberConstant,
  Operator,
  Program,
  Statement,
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

export class Evaluator {
  constructor() {}

  run(p: Program): string[] {
    const outputs = [];
    for (const statement of p.statements) {
      outputs.push(...this.eval(statement));
    }
    return outputs;
  }

  private eval(statement: Statement): string[] {
    if (statement instanceof FunctionApplication) {
      const name = statement.identifier.t.value;
      const parameters = statement.parameters.map((p) =>
        this.evalExpression(p)
      );
      if (name === "echo") {
        return [parameters.map((obj) => obj.show()).join(" ")];
      }
    }

    if (statement instanceof Condition) {
      return this.evalCondition(statement);
    }

    throw new Error(
      `Unhandled statement: ${statement.constructor.name}`,
    );
  }

  private evalExpression(exp: Expression): Value {
    if (exp instanceof NumberConstant) {
      return new NumberValue(exp.n);
    }

    if (exp instanceof ArithmeticExpression) {
      return this.evalExpression(exp.expression);
    }

    if (exp instanceof ArithmeticInfixExpression) {
      return this.evalInfixExpression(exp.lhs, exp.op, exp.rhs);
    }

    if (exp instanceof BooleanExpression) {
      return this.evalInfixExpression(exp.lhs, exp.op, exp.rhs);
    }

    throw new Error(`Unhandled expression ${exp.constructor.name}`);
  }

  private evalInfixExpression(
    lhs: Expression,
    op: Operator,
    rhs: Expression,
  ): Value {
    const left = this.evalExpression(lhs);
    const right = this.evalExpression(rhs);

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
    const condition = this.evalExpression(statement.condition);

    if (!(condition instanceof BooleanValue)) {
      throw new Error(
        `Condition must eval to BooleanValue, but got ${condition.constructor.name}`,
      );
    }

    if (condition.b) {
      return this.eval(statement.then);
    }

    if (statement.other) {
      return this.eval(statement.other);
    }

    return [];
  }
}
