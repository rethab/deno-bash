import * as moo from "https://deno.land/x/moo@0.5.1-deno.2/mod.ts";

export type TokenType =
  | "OP"
  | "NEWLINE"
  | "KEYWORD"
  | "STRING"
  | "NUMBER"
  | "IDENTIFIER"
  | "ARITHMETIC_OPEN";

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
        ARITHMETIC_OPEN: { match: "$((", push: "arith" },
        OP: ["[", "]", "=", "(", ")", "+"],
        KEYWORD: [";", "if", "then", "else", "fi"],
        NUMBER: /[0-9]+/,
        STRING: [
          { match: /"(?:[^"]*)"/, value: (s: string) => s.slice(1, -1) },
          { match: /[A-Za-z0-9_:$/.*-]+/ },
        ],
      },
      arith: {
        OP: [
          { match: "(", push: "arith" },
          { match: ")", pop: 1 },
          "=",
          "+",
          "*",
        ],
        ARITHMETIC_OPEN: { match: "$((", push: "arith" },
        NUMBER: /[0-9]+/,
        IDENTIFIER: /[A-Za-z0-9_:$/.*-]+/,
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
