import { Lexer, Token } from "./lexer.ts";

export interface Program {
  statements: Statement[];
}

export interface Expression {}

export class InfixExpression implements Expression {
  constructor(
    public readonly lhs: Expression,
    public readonly rhs: Expression,
    public readonly op: string,
  ) {}
  toString(): string {
    return `${this.lhs} ${this.op} ${this.rhs}`;
  }
}

export class PrefixExpression implements Expression {
  constructor(
    public readonly op: string,
    public readonly exp: Expression,
  ) {}
  toString(): string {
    return `${this.op} ${this.exp}`;
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
  constructor(
    public readonly s: string,
    public readonly singlequote: boolean = false,
  ) {}
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
  Index,
  Highest,
}

export class DashedOperator implements Expression {
  constructor(public readonly op: string) {}
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

export class FunctionApplication implements Expression {
  constructor(
    public readonly name: StringConstant,
    public readonly parameters: Expression[],
  ) {
  }
}

export class Array implements Expression {
  constructor(public readonly values: StringConstant[]) {}
}

export class ArrayAccess implements Expression {
  constructor(
    public readonly identifier: Identifier,
    public readonly index: Expression,
  ) {}
}

type PrefixParseFunction = (t: Token) => Expression;
type InfixParseFunction = (e: Expression) => Expression;

type Mode = "arithmetic" | "normal";

export class Parser {
  private curToken?: Token;
  private nextToken?: Token;

  private mode: Mode = "normal";

  constructor(private lexer: Lexer) {
    this.curToken = this.lexer.next();
    this.nextToken = this.lexer.next();
  }

  parse(): Program {
    const statements = [];

    this.skipNewlines();
    while (this.curToken != undefined) {
      statements.push(this.parseStatement());
      this.skipSemicolon();
      this.skipNewlines();
    }

    return { statements };
  }

  private prefixParseFunction(token: Token): PrefixParseFunction {
    const { type, value } = token;

    if (type === "STRING" && value.startsWith("-")) {
      return () => this.parsePrefixExpression();
    }

    if (type === "NUMBER") return (t: Token) => this.parseNumber(t);
    if (type === "STRING") return (t: Token) => this.parseString(t);
    if (type === "KEYWORD") return (t: Token) => this.parseString(t);
    if (type === "IDENTIFIER") return (t: Token) => this.parseIdentifier(t);

    if (value === "(") {
      if (this.mode === "arithmetic") {
        return () => this.parseGroupedExpression("(", ")");
      } else if (this.mode === "normal") {
        return () => this.parseArray();
      }
    }

    if (value === "${") {
      return () => this.parseGroupedExpression("${", "}");
    }

    if (value === "$((") {
      return () => this.parseArithmeticExpression();
    }

    if (value === "if") {
      return () => this.parseConditionStatement();
    }

    throw new Error(`Unhandled expression '${token.value}' (${token.type})`);
  }

  private infixParseFunction(token: Token): InfixParseFunction {
    const { type, value } = token;
    if (type === "OP") {
      if (
        ["+", "*", "=", "!="].indexOf(value) !== -1 || value.startsWith("-")
      ) {
        return this.parseInfixExpression.bind(this);
      }

      if (value === "[") {
        return this.parseArrayAccess.bind(this);
      }
    }

    if (type === "STRING" && value.startsWith("-")) {
      return this.parseInfixExpression.bind(this);
    }

    return this.parseFunctionApplication.bind(this);
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

    return new ExpressionStatement(
      this.parseExpression(Precedence.Lowest),
    );
  }

  private parseConditionStatement(): Condition {
    this.consumeToken({ type: "KEYWORD", value: "if" });
    this.consumeToken({ type: "OP", value: "[" });
    const expression = this.parseExpression(Precedence.Lowest);
    this.consumeToken({ type: "OP", value: "]" });
    this.consumeToken({ type: "KEYWORD", value: ";" });
    this.consumeToken({ type: "KEYWORD", value: "then" });
    this.skipNewlines();
    const consequence = this.parseStatement();
    this.skipSemicolon();
    this.skipNewlines();

    if (this.curToken?.value === "fi") {
      this.consumeToken({ type: "KEYWORD", value: "fi" });
      return new Condition(expression, consequence);
    }

    if (this.curToken?.value === "else") {
      this.consumeToken({ type: "KEYWORD", value: "else" });
      this.skipNewlines();
      const other = this.parseStatement();
      this.skipSemicolon();
      this.skipNewlines();
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
      this.curToken && !this.isSemicolon() && !this.isNewline() &&
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

  private parseOperator(): string {
    if (!this.curToken) {
      throw new Error(`No token when parsing operator`);
    }

    const { value } = this.curToken;

    if (["=", "!=", "+", "*"].indexOf(value) !== -1) {
      this.advanceToken();
      return value;
    }

    if (value.match(/-[a-zA-Z]{1,2}/)) {
      this.advanceToken();
      return value;
    }

    throw new Error(`Unsupported Operator ${value}`);
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
    const { text, value } = curToken;
    const singlequote = text[0] === "'";
    const string = new StringConstant(value, singlequote);
    this.advanceToken();
    return string;
  }

  private parseInfixExpression(lhs: Expression): Expression {
    const precedence = this.precedence(this.curToken!!);
    const op = this.parseOperator();

    const rhs = this.parseExpression(precedence);

    return new InfixExpression(lhs, rhs, op);
  }

  private parseGroupedExpression(opening: string, closing: string): Expression {
    this.consumeToken({ value: opening });
    const expression = this.parseExpression(Precedence.Lowest);
    this.consumeToken({ value: closing });
    return expression;
  }

  private parseArray(): Expression {
    this.consumeToken({ value: "(" });
    const values = [];
    while (this.curToken && this.curToken.value != ")") {
      values.push(this.parseString(this.curToken));
    }
    this.consumeToken({ value: ")" });
    return new Array(values);
  }

  private parseArithmeticExpression() {
    this.consumeToken({ value: "$((" });

    this.mode = "arithmetic";
    const expression = this.parseExpression(Precedence.Lowest);
    this.mode = "normal";

    this.consumeToken({ value: ")" });
    this.consumeToken({ value: ")" });

    return new ArithmeticExpression(expression);
  }

  private parseArrayAccess(arrayName: Expression) {
    if (!(arrayName instanceof StringConstant)) {
      throw new Error(
        `LHS of array index must be StringConstant, but got ${arrayName.constructor.name}`,
      );
    }

    this.consumeToken({ value: "[" });
    this.mode = "arithmetic";
    const index = this.parseExpression(Precedence.Lowest);
    this.mode = "normal";
    this.consumeToken({ value: "]" });

    return new ArrayAccess(new Identifier(arrayName.s), index);
  }

  private parseFunctionApplication(name: Expression) {
    if (!(name instanceof StringConstant)) {
      throw new Error(
        `Expected StringConstant for function application, but got ${name.constructor.name}`,
      );
    }

    const parameters = [];
    while (this.curToken && !this.isSemicolon() && !this.isNewline()) {
      // using the highest means all expressions are parsed individually without trying to "combine" them
      const parameter = this.parseExpression(Precedence.Highest);
      parameters.push(parameter);
    }

    return new FunctionApplication(name, parameters);
  }

  private consumeToken(expected: Partial<Token>) {
    if (
      (expected.type && this.curToken?.type !== expected.type) ||
      (expected.value && this.curToken?.value !== expected.value)
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

  private skipSemicolon() {
    if (this.isSemicolon()) {
      this.advanceToken();
    }
  }

  private isNewline() {
    return this.curToken?.type === "NEWLINE";
  }

  private skipNewlines() {
    while (this.isNewline()) {
      this.advanceToken();
    }
  }

  private precedence(token: Token): Precedence {
    const { type, value } = token;

    if (type === "OP") {
      if (value === "=" || value === "!=") {
        return Precedence.Equals;
      }

      if (value === "+") {
        return Precedence.Sum;
      }

      if (value === "*") {
        return Precedence.Product;
      }

      if (value.startsWith("-")) {
        return Precedence.Product; // arbitrary, cant be combined anyway
      }

      if (value === "[") {
        return Precedence.Index;
      }

      if (value === "${") {
        return Precedence.Call;
      }

      return Precedence.Lowest;
    }

    if (
      type === "STRING" || type === "ARITHMETIC_OPEN" || type === "NUMBER" ||
      type === "KEYWORD"
    ) {
      return Precedence.Call;
    }

    return Precedence.Lowest;
  }

  private parsePrefixExpression(): Expression {
    const operator = this.parseOperator();
    const exp = this.parseExpression(Precedence.Prefix);

    return new PrefixExpression(operator, exp);
  }
}
