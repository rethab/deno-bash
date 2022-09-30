import { Builtins } from "./builtins.ts";
import {
  ArithmeticExpression,
  Array,
  ArrayAccess,
  Assignment,
  Condition,
  Expression,
  ExpressionStatement,
  FunctionApplication,
  Identifier,
  InfixExpression,
  NumberConstant,
  PrefixExpression,
  Program,
  Statement,
  StringConstant,
} from "./parser.ts";

export interface Value {
  show(): string;
  equals(other: Value): boolean;
}

class Void implements Value {
  show(): string {
    return "void";
  }
  equals(other: Value): boolean {
    return other instanceof Void;
  }
}

class NumberValue implements Value {
  constructor(public readonly n: number) {}

  show(): string {
    return `${this.n}`;
  }

  equals(other: Value): boolean {
    if (!(other instanceof NumberValue)) {
      return false;
    }

    return other.n === this.n;
  }
  lessThan(other: NumberValue): boolean {
    return this.n < other.n;
  }
  lessThanEquals(other: NumberValue): boolean {
    return this.n <= other.n;
  }
  greaterThan(other: NumberValue): boolean {
    return this.n > other.n;
  }
  greaterThanEquals(other: NumberValue): boolean {
    return this.n >= other.n;
  }
}

class BooleanValue implements Value {
  constructor(public readonly b: boolean) {}

  show(): string {
    return `${this.b}`;
  }

  equals(other: Value): boolean {
    if (!(other instanceof BooleanValue)) {
      return false;
    }

    return other.b === this.b;
  }
}

export class StringValue implements Value {
  constructor(public readonly s: string) {}

  show(): string {
    return `${this.s}`;
  }

  equals(other: Value): boolean {
    if (!(other instanceof StringValue)) {
      return false;
    }

    return other.s === this.s;
  }
}

export class ArrayValue implements Value {
  constructor(public readonly values: Value[]) {}

  show(): string {
    return `[${this.values.join(", ")}]`;
  }

  equals(other: Value): boolean {
    if (
      !(other instanceof ArrayValue) ||
      other.values.length !== this.values.length
    ) {
      return false;
    }

    for (const index in this.values) {
      if (!this.values[index].equals(other.values[index])) {
        return false;
      }
    }

    return true;
  }
}

export interface CommandInvoker {
  exec(name: string, args: string[]): Promise<number>;
}

export class Evaluator {
  constructor(
    private variables: Map<string, Value>,
    private builtins: Builtins,
    private commandInvoker: CommandInvoker,
  ) {}

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

    if (exp instanceof PrefixExpression) {
      return this.evalPrefixExpression(exp.op, exp.exp, mode);
    }

    if (exp instanceof Identifier) {
      return this.evalIdentifier(exp);
    }

    if (exp instanceof FunctionApplication) {
      return this.evalFunctionApplication(exp);
    }

    if (exp instanceof Array) {
      return this.evalArray(exp);
    }

    if (exp instanceof ArrayAccess) {
      return this.evalArrayAccess(exp);
    }

    throw new Error(`Unhandled expression ${exp.constructor.name}`);
  }

  private evalFunctionApplication(exp: FunctionApplication): Value {
    const name = exp.name.s;
    const parameters = exp.parameters.map((p) =>
      this.evalExpression(p, "regular")
    );

    if (name === "echo") {
      this.builtins.echo(parameters.map((p) => p.show()));
      return new Void();
    }

    this.commandInvoker.exec(name, parameters.map((p) => p.show()));
    return new Void();
  }

  private evalArray(exp: Array): ArrayValue {
    const values = [];

    for (const value of exp.values) {
      values.push(this.evalExpression(value, "regular"));
    }

    return new ArrayValue(values);
  }

  private evalArrayAccess(exp: ArrayAccess): Value {
    const { identifier, index: indexExp } = exp;

    const array = this.evalExpression(identifier, "regular");

    if (!(array instanceof ArrayValue)) {
      throw new Error(
        `Trying to access ${array} as array, but it is not an array`,
      );
    }

    const index = this.evalExpression(indexExp, "arithmetic");

    if (!(index instanceof NumberValue)) {
      throw new Error(
        `Arrays can only be accessed with a number index, but got ${index}`,
      );
    }

    return array.values[index.n] || new StringValue("");
  }

  private evalIdentifier(identifier: Identifier): Value {
    const { value: name } = identifier;

    const lookupName = name.startsWith("$") ? name.slice(1) : name;

    return this.variables.get(lookupName) || new NumberValue(0);
  }

  private evalInfixExpression(
    lhs: Expression,
    op: string,
    rhs: Expression,
    mode: "regular" | "arithmetic",
  ): Value {
    const left = this.evalExpression(lhs, mode);
    const right = this.evalExpression(rhs, mode);

    if (op === "+") {
      if (left instanceof NumberValue && right instanceof NumberValue) {
        return new NumberValue(left.n + right.n);
      }
    }
    if (op === "*") {
      if (left instanceof NumberValue && right instanceof NumberValue) {
        return new NumberValue(left.n * right.n);
      }
    }
    if (op === "=") {
      if (!(right instanceof StringValue && left instanceof StringValue)) {
        throw new Error(
          `= only works on strings, but given ${right.constructor.name} ${left.constructor.name}`,
        );
      }
      return new BooleanValue(left.equals(right));
    }
    if (op === "!=") {
      if (left instanceof StringValue && right instanceof StringValue) {
        return new BooleanValue(left.s !== right.s);
      }
    }

    if (op.startsWith("-")) {
      const leftNumber = this.coerceNumber(left);
      const rightNumber = this.coerceNumber(right);

      if (op === "-eq") {
        return new BooleanValue(leftNumber.equals(rightNumber));
      }
      if (op === "-ne") {
        return new BooleanValue(!leftNumber.equals(rightNumber));
      }
      if (op === "-lt") {
        return new BooleanValue(leftNumber.lessThan(rightNumber));
      }
      if (op === "-le") {
        return new BooleanValue(leftNumber.lessThanEquals(rightNumber));
      }
      if (op === "-gt") {
        return new BooleanValue(leftNumber.greaterThan(rightNumber));
      }
      if (op === "-ge") {
        return new BooleanValue(leftNumber.greaterThanEquals(rightNumber));
      }
    }

    throw new Error(`Unhandled operator ${op}`);
  }

  private evalPrefixExpression(
    op: string,
    exp: Expression,
    mode: "regular" | "arithmetic",
  ): Value {
    const value = this.evalExpression(exp, mode);

    if (op === "-z") {
      return new BooleanValue(value instanceof StringValue && !value.s);
    }

    if (op === "-n") {
      return new BooleanValue(value instanceof StringValue && !!value.s);
    }

    throw new Error(`Unhandled prefix operator ${op}`);
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

  private evalString(exp: StringConstant): Value {
    let output = "";

    for (let i = 0; i < exp.s.length; i++) {
      const char = exp.s[i];

      if (char === "\\") {
        output += exp.s[++i];
      } else if (char === "$" && !exp.singlequote) {
        const [substitution, newI] = this.substituteVariable(exp.s, i);

        // substituted everything --> retain type
        if (i === 0 && newI === exp.s.length) {
          return substitution;
        }

        i = newI;
        output += substitution.show();
      } else {
        output += char;
      }
    }

    return new StringValue(output);
  }

  private substituteVariable(
    string: string,
    i: number,
  ): [Value, number] {
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

    if (curly) i++; // skip }

    return [this.variables.get(varName) || new StringValue(""), i];
  }

  private coerceNumber(v: Value): NumberValue {
    if (v instanceof NumberValue) {
      return v;
    }

    const number = Number(v.show());
    if (number) {
      return new NumberValue(number);
    }

    throw new Error(`'${v}' is really not a number`);
  }
}
