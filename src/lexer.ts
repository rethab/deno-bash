import * as moo from "https://deno.land/x/moo@0.5.1-deno.2/mod.ts";

export type TokenType =
  | "OP"
  | "NEWLINE"
  | "KEYWORD"
  | "STRING"
  | "NUMBER"
  | "IDENTIFIER"
  | "ARITHMETIC_OPEN"
  | "CONDITIONAL_OPEN";

export interface Token {
  type: TokenType;
  value: string;
}

export class Lexer {
  private l: moo.Lexer;
  private current?: moo.Token;
  constructor(input: string) {
    // @ts-ignore moo is incorrectly published
    this.l = moo.compileStates({
      main: {
        WS: / /,
        NEWLINE: { match: "\n", lineBreaks: true },
        COMMENT: "#",
        ARITHMETIC_OPEN: { match: "$((", push: "arithmetic" },
        CONDITIONAL_OPEN: { match: "[", push: "conditional" },
        OP: ["=", "(", ")", "+"],
        KEYWORD: [";", "if", "then", "else", "fi"],
        NUMBER: /[0-9]+/,
        STRING: [
          { match: /"(?:[^"]*)"/, value: (s: string) => s.slice(1, -1) },
          { match: /[A-Za-z0-9_:$/.*-]+/ },
        ],
      },
      arithmetic: {
        OP: [
          { match: "(", push: "arithmetic" },
          { match: ")", pop: 1 },
          "=",
          "+",
          "*",
        ],
        ARITHMETIC_OPEN: { match: "$((", push: "arithmetic" },
        NUMBER: /[0-9]+/,
        IDENTIFIER: /[A-Za-z0-9_:$/.*-]+/,
        WS: / /,
      },
      conditional: {
        OP: [
          { match: "]", pop: 1 },
          { match: /-[a-zA-Z]{1,2}/ },
          ")",
          "=",
          "!=",
          "+",
          "*",
        ],
        ARITHMETIC_OPEN: { match: "$((", push: "arithmetic" },
        NUMBER: /[0-9]+/,
        STRING: [
          { match: /"(?:[^"]*)"/, value: (s: string) => s.slice(1, -1) },
          { match: /[A-Za-z0-9_:$/.*-]+/ },
        ],
        WS: / /,
      },
    }).reset(input);

    this.current = this.l.next();
  }

  next(): Token | undefined {
    let token = this.pop();

    while (token?.type === "WS") {
      token = this.pop();
    }

    if (token?.type === "COMMENT") {
      while (token && token.type !== "NEWLINE") {
        token = this.pop();
      }
    }

    while (token?.type === "STRING" && this.peek()?.type === "STRING") {
      const next = this.pop()!!;
      token.value += next.value;
    }

    if (!token) return;

    return {
      type: token.type as TokenType,
      value: token.value,
    };
  }

  private pop(): moo.Token | undefined {
    const previous = this.current;
    this.current = this.l.next();
    return previous;
  }

  private peek(): moo.Token | undefined {
    return this.current;
  }
}
