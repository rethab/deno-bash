import * as moo from "https://deno.land/x/moo@0.5.1-deno.2/mod.ts";

export type TokenType = "OP" | "KEYWORD" | "STRING" | "NUMBER" | "IDENTIFIER";

export interface Token {
  type: TokenType;
  value: string;
}

export class Lexer {
  private l: moo.Lexer;
  constructor(input: string) {
    this.l = moo.compile({
      WS: / /,
      OP: ["[", "]", "=", "$((", "(", ")", "+", "*"],
      KEYWORD: [";", "if", "then", "else", "fi"],
      STRING: { match: /"(?:[^"]*)"/, value: (s) => s.slice(1, -1) },
      NUMBER: /[0-9]+/,
      IDENTIFIER: /\$?[A-Za-z0-9]+/,
    }).reset(input);
  }

  next(): Token | undefined {
    let token = this.l.next();
    while (token?.type === "WS") {
      token = this.l.next();
    }

    if (!token) return;

    return {
      type: token.type as TokenType,
      value: token.value,
    };
  }
}
