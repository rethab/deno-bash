import { Lexer, Token } from "./lexer.ts";

export interface Program {
  statements: Statement[];
}

export interface Expression {}

export class BooleanExpression implements Expression {
  constructor(
    public readonly lhs: Expression,
    public readonly rhs: Expression,
    public readonly op: Operator,
  ) {}

  toString(): string {
    return `${this.lhs} ${this.op} ${this.rhs}`;
  }
}

export class ArithmeticInfixExpression implements Expression {
  constructor(
    public readonly lhs: Expression,
    public readonly rhs: Expression,
    public readonly op: Operator,
  ) {}
  toString(): string {
    return `$((${this.lhs} ${this.op} ${this.rhs}))`;
  }
}

export class ArithmeticExpression implements Expression {
  constructor(public readonly expression: Expression) {}
  toString(): string {
    return `$((${this.expression}))`;
  }
}

export class Identifier implements Expression {
  constructor(public readonly t: Token) {}

  toString(): string {
    return this.t.value;
  }
}

export class NumberConstant implements Expression {
  constructor(public readonly n: number) {}

  toString(): string {
    return `${this.n}`;
  }
}

export class StringConstant implements Expression {
  constructor(public readonly s: string) {}
  toString(): string {
    return `"${this.s}"`;
  }
}

export enum Operator {
  Equal = "=",
  Plus = "+",
}

export interface Statement {}

export class Assignment implements Statement {
  constructor(
    public readonly lhs: Identifier,
    public readonly rhs: Expression,
  ) {}
}

export class Condition implements Statement {
  constructor(
    public readonly condition: Expression,
    public readonly then: Statement,
    public readonly other?: Statement,
  ) {}
}

export class ExpressionStatement implements Statement, Expression {
  constructor(expression: Expression) {
  }
}

export class FunctionApplication implements Statement, Expression {
  constructor(
    public readonly identifier: Identifier,
    public readonly parameters: Expression[],
  ) {
  }
}

export class Parser {
  private curToken?: Token;
  private nextToken?: Token;

  constructor(private lexer: Lexer) {
    this.curToken = this.lexer.next();
    this.nextToken = this.lexer.next();
  }

  parse(): Program {
    const statements = [];

    while (this.curToken != undefined) {
      statements.push(this.parseStatement());
      this.skipSemicolon();
    }

    return { statements };
  }

  private advanceToken() {
    this.curToken = this.nextToken;
    this.nextToken = this.lexer.next();
  }

  private parseStatement(): Statement {
    if (this.isKeyword("if")) {
      return this.parseConditionStatement();
    }

    if (this.nextToken?.type === "OP" && this.nextToken?.value === "=") {
      const assignment = this.parseAssignment();
      return assignment;
    }

    if (this.curToken?.type === "IDENTIFIER") {
      if (this.isFunctionApplication()) {
        return this.parseFunctionApplication();
      }

      return new ExpressionStatement(this.parseIdentifier());
    }

    if (this.isOperator("$((")) {
      return new ExpressionStatement(this.parseArithmeticExpression());
    }

    throw new Error(`Unhandled statement ${this.curToken?.value}`);
  }

  private parseConditionStatement(): Condition {
    this.consumeToken({ type: "KEYWORD", value: "if" });
    this.consumeToken({ type: "OP", value: "[" });
    const expression = this.parseExpression(true);
    this.consumeToken({ type: "OP", value: "]" });
    this.consumeToken({ type: "KEYWORD", value: ";" });
    this.consumeToken({ type: "KEYWORD", value: "then" });
    const consequence = this.parseStatement();
    this.skipSemicolon();

    if (this.isKeyword("fi")) {
      this.consumeToken({ type: "KEYWORD", value: "fi" });
      return new Condition(expression, consequence);
    }

    if (this.isKeyword("else")) {
      this.consumeToken({ type: "KEYWORD", value: "else" });
      const other = this.parseStatement();
      this.skipSemicolon();
      this.consumeToken({ type: "KEYWORD", value: "fi" });
      return new Condition(expression, consequence, other);
    }

    throw new Error(
      `Unexpected statement after condition '${this.curToken?.value}' (${this.curToken?.type})`,
    );
  }

  private parseAssignment() {
    const lhs = this.parseIdentifier();
    this.consumeToken({ type: "OP", value: "=" });
    const rhs = this.parseExpression(true);

    return new Assignment(lhs, rhs);
  }

  private parseExpression(recurse: boolean): Expression {
    if (recurse && this.nextToken?.type === "OP") {
      return this.parseBooleanExpression();
    }

    if (this.curToken?.type === "IDENTIFIER") {
      return this.parseIdentifier();
    }

    if (this.curToken?.type === "NUMBER") {
      const number = new NumberConstant(Number(this.curToken?.value));
      this.advanceToken();
      return number;
    }

    if (this.curToken?.type === "STRING") {
      const string = new StringConstant(this.curToken.value);
      this.advanceToken();
      return string;
    }

    if (this.isOperator("$((")) {
      return this.parseArithmeticExpression();
    }

    throw new Error(
      `Unhandled expression '${this.curToken?.value}' (${this.curToken?.type})`,
    );
  }

  private parseOperator(): Operator {
    switch (this.curToken?.value) {
      case "=":
        this.advanceToken();
        return Operator.Equal;
      case "+":
        this.advanceToken();
        return Operator.Plus;
    }

    throw new Error(`Unsupported Operator ${this.curToken?.value}`);
  }

  private parseIdentifier() {
    if (this.curToken?.type !== "IDENTIFIER") {
      throw new Error(
        `Expected IDENTIFIER but got ${this.curToken?.type} / ${this.curToken?.value}`,
      );
    }

    const identifier = new Identifier(this.curToken);
    this.advanceToken();
    return identifier;
  }

  private consumeToken(expected: Token) {
    if (
      this.curToken?.type !== expected.type ||
      this.curToken?.value !== expected.value
    ) {
      throw new Error(
        `Expected token '${expected.value}' (${expected.type}) but got '${this.curToken?.value}' (${this.curToken?.type})`,
      );
    }

    this.advanceToken();
  }

  private parseBooleanExpression() {
    const lhs = this.parseExpression(false);
    const op = this.parseOperator();
    const rhs = this.parseExpression(false);
    return new BooleanExpression(lhs, rhs, op);
  }

  private parseArithmeticExpression() {
    this.consumeToken({ type: "OP", value: "$((" });
    const lhs = this.parseExpression(false);

    if (this.isOperator("))")) {
      this.consumeToken({ type: "OP", value: "))" });
      return new ArithmeticExpression(lhs);
    }

    const op = this.parseOperator();
    const rhs = this.parseExpression(false);
    this.consumeToken({ type: "OP", value: "))" });
    return new ArithmeticInfixExpression(lhs, rhs, op);
  }

  private parseFunctionApplication() {
    const name = this.parseIdentifier();
    const parameters = [];
    while (this.curToken && !this.isSemicolon() && !this.isKeyword()) {
      const parameter = this.parseExpression(false);
      parameters.push(parameter);
    }

    return new FunctionApplication(name, parameters);
  }

  private isSemicolon(): boolean {
    return this.curToken?.type === "KEYWORD" && this.curToken.value === ";";
  }

  private skipSemicolon() {
    if (this.isSemicolon()) {
      this.advanceToken();
    }
  }

  private isKeyword(value?: string): boolean {
    return this.curToken?.type === "KEYWORD" &&
      (!value || this.curToken.value === value);
  }

  private isOperator(value: string): boolean {
    return this.curToken?.type === "OP" && this.curToken.value === value;
  }

  private isFunctionApplication() {
    return this.nextToken?.type === "IDENTIFIER" ||
      this.nextToken?.type === "STRING" ||
      this.nextToken?.type === "NUMBER" ||
      this.nextToken?.type === "OP";
  }
}
