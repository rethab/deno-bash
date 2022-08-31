import { Lexer, Token } from "./lexer.ts";

export interface Program {
  statements: Statement[];
}

export interface Expression {}

export class InfixExpression implements Expression {
  constructor(
    public readonly lhs: Expression,
    public readonly rhs: Expression,
    public readonly op: Operator,
  ) {}
  toString(): string {
    return `${this.lhs} ${this.op} ${this.rhs}`;
  }
}

export class ArithmeticExpression implements Expression {
  constructor(public readonly expression: Expression) {}
  toString(): string {
    return `$((${this.expression}))`;
  }
}

export class Identifier implements Expression {
  constructor(public readonly value: string) {}

  toString(): string {
    return this.value;
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

enum Precedence {
  Lowest,
  Equals, // ==
  LessGreater, // < or >
  Sum, // +
  Product, // *
  Prefix, // -x or !x
  Call, // function(x)
}

export enum Operator {
  Equal = "=",
  Plus = "+",
  Asterisk = "*",
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
  constructor(public readonly expression: Expression) {
  }
}

export class FunctionApplication implements Statement, Expression {
  constructor(
    public readonly identifier: Identifier,
    public readonly parameters: Expression[],
  ) {
  }
}

type PrefixParseFunction = (t: Token) => Expression;
type InfixParseFunction = (e: Expression) => Expression;

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

  private prefixParseFunction(token: Token): PrefixParseFunction {
    const { type, value } = token;

    if (type === "NUMBER") return (t: Token) => this.parseNumber(t);
    if (type === "STRING") return (t: Token) => this.parseString(t);
    if (type === "IDENTIFIER") return (t: Token) => this.parseIdentifier(t);

    if (type === "OP" && value === "(") {
      return () => this.parseGroupedExpression();
    }

    if (type === "OP" && value === "$((") {
      return () => this.parseArithmeticExpression();
    }

    if (type === "KEYWORD" && value === "if") {
      return () => this.parseConditionStatement();
    }

    throw new Error(`Unhandled expression '${token.value} (${token.type})`);
  }

  private infixParseFunction(token: Token): InfixParseFunction {
    const { type, value } = token;
    if (type === "OP") {
      if (value === "+" || value === "*" || value === "=") {
        return this.parseInfixExpression.bind(this);
      }
    }

    throw new Error(`Unhandled expression '${token.value} (${token.type})`);
  }

  private advanceToken() {
    this.curToken = this.nextToken;
    this.nextToken = this.lexer.next();
  }

  private parseStatement(): Statement {
    if (this.nextToken?.value === "=") {
      return this.parseAssignment(this.curToken!!);
    }

    if (this.curToken?.value === "if") {
      return this.parseConditionStatement();
    }

    if (this.curToken?.type === "IDENTIFIER") {
      if (this.isFunctionApplication()) {
        return this.parseFunctionApplication(this.curToken);
      }

      return new ExpressionStatement(this.parseIdentifier(this.curToken));
    }

    return new ExpressionStatement(this.parseExpression(Precedence.Lowest));
  }

  private parseConditionStatement(): Condition {
    this.consumeToken({ type: "KEYWORD", value: "if" });
    this.consumeToken({ type: "OP", value: "[" });
    const expression = this.parseExpression(Precedence.Lowest);
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

  private parseAssignment(curToken: Token) {
    const lhs = this.parseIdentifier(curToken);
    this.consumeToken({ type: "OP", value: "=" });
    const rhs = this.parseExpression(Precedence.Lowest);

    return new Assignment(lhs, rhs);
  }

  private parseExpression(precedence: Precedence): Expression {
    if (!this.curToken) {
      throw new Error(`Unhandled case: no current token`);
    }

    const prefixParser = this.prefixParseFunction(this.curToken);

    if (!prefixParser) {
      throw new Error(
        `Unhandled case: No prefix parser for '${this.curToken.value}' (${this.curToken.type})`,
      );
    }

    let leftExpression = prefixParser(this.curToken);

    while (
      this.curToken && !this.isSemicolon() &&
      precedence < this.precedence(this.curToken)
    ) {
      const infixParseFunction = this.infixParseFunction(this.curToken);

      if (!infixParseFunction) {
        return leftExpression;
      }

      leftExpression = infixParseFunction(leftExpression);
    }

    return leftExpression;
  }

  private parseOperator(): Operator {
    switch (this.curToken?.value) {
      case "=":
        this.advanceToken();
        return Operator.Equal;
      case "+":
        this.advanceToken();
        return Operator.Plus;
      case "*":
        this.advanceToken();
        return Operator.Asterisk;
    }

    throw new Error(`Unsupported Operator ${this.curToken?.value}`);
  }

  private parseIdentifier(curToken: Token): Identifier {
    const identifier = new Identifier(curToken.value);
    this.advanceToken();
    return identifier;
  }

  private parseNumber(curToken: Token): NumberConstant {
    const number = new NumberConstant(Number(curToken.value));
    this.advanceToken();
    return number;
  }

  private parseString(curToken: Token): StringConstant {
    const string = new StringConstant(curToken.value);
    this.advanceToken();
    return string;
  }

  private parseInfixExpression(lhs: Expression): Expression {
    const precedence = this.precedence(this.curToken!!);
    const op = this.parseOperator();

    const rhs = this.parseExpression(precedence);

    return new InfixExpression(lhs, rhs, op);
  }

  private parseGroupedExpression(): Expression {
    this.consumeToken({ type: "OP", value: "(" });
    const expression = this.parseExpression(Precedence.Lowest);
    this.consumeToken({ type: "OP", value: ")" });
    return expression;
  }

  private parseArithmeticExpression() {
    this.consumeToken({ type: "OP", value: "$((" });

    const expression = this.parseExpression(Precedence.Lowest);

    this.consumeToken({ type: "OP", value: ")" });
    this.consumeToken({ type: "OP", value: ")" });

    return new ArithmeticExpression(expression);
  }

  private parseFunctionApplication(curToken: Token) {
    const name = this.parseIdentifier(curToken);
    const parameters = [];
    while (this.curToken && !this.isSemicolon() && !this.isKeyword()) {
      const parameter = this.parseExpression(Precedence.Lowest);
      parameters.push(parameter);
    }

    return new FunctionApplication(name, parameters);
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

  private isSemicolon(): boolean {
    return this.curToken?.type === "KEYWORD" && this.curToken.value === ";";
  }

  private nextIsSemicolon(): boolean {
    return this.nextToken?.type === "KEYWORD" && this.nextToken.value === ";";
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

  private isClosingArithmeticExpansion(): boolean {
    return this.isOperator(")") && this.nextToken?.type === "OP" &&
      this.nextToken.value === ")";
  }

  private isFunctionApplication() {
    return this.nextToken?.type === "IDENTIFIER" ||
      this.nextToken?.type === "STRING" ||
      this.nextToken?.type === "NUMBER" ||
      this.nextToken?.type === "OP";
  }

  private precedence(token: Token): Precedence {
    const { type, value } = token;

    if (type === "OP" && value === "=") {
      return Precedence.Equals;
    }

    if (type === "OP" && value === "+") {
      return Precedence.Sum;
    }

    if (type === "OP" && value === "*") {
      return Precedence.Product;
    }

    return Precedence.Lowest;
  }
}
