import { Token, TokenType } from "./lexer";

enum ExpressionType {
  Binary,
  Literal,
  Unary,
  Grouping,
}

interface BinaryExpression {
  expressionType: ExpressionType.Binary;
  left: Expression;
  right: Expression;
  operator: Token;
}

interface LiteralExpression {
  expressionType: ExpressionType.Literal;
  literal: string | number | boolean | null;
}

interface UnaryExpression {
  expressionType: ExpressionType.Unary;
  operator: Token;
  value: Expression;
}

interface GroupingExpression {
  expressionType: ExpressionType.Grouping;
  expression: Expression;
}

type Expression =
  | BinaryExpression
  | LiteralExpression
  | UnaryExpression
  | GroupingExpression;

const buildBinaryExpression = (
  left: Expression,
  operator: Token,
  right: Expression
): BinaryExpression => {
  return {
    expressionType: ExpressionType.Binary,
    left,
    operator,
    right,
  };
};

const buildLiteralExpression = (
  literal: string | number | boolean | null
): LiteralExpression => {
  return {
    expressionType: ExpressionType.Literal,
    literal,
  };
};

const buildUnaryExpression = (
  operator: Token,
  value: Expression
): UnaryExpression => {
  return {
    expressionType: ExpressionType.Unary,
    operator,
    value,
  };
};

const buildGroupingExpression = (
  expression: Expression
): GroupingExpression => {
  return {
    expressionType: ExpressionType.Grouping,
    expression,
  };
};

export const parse = (tokens: Token[]) => {
  const parser = new Parser(tokens);
  return parser.parse();
};

export const prettyPrintExpression = (expr: Expression): string => {
  switch (expr.expressionType) {
    case ExpressionType.Literal:
      return `${expr.literal}`;
    case ExpressionType.Grouping:
      return `${prettyPrintExpression(expr.expression)}`;
    case ExpressionType.Unary:
      return `(${expr.operator.lexeme} ${prettyPrintExpression(expr.value)})`;
    case ExpressionType.Binary:
      return `(${expr.operator.lexeme} ${prettyPrintExpression(
        expr.left
      )} ${prettyPrintExpression(expr.right)})`;
  }
};

class Parser {
  private current = 0;
  constructor(private tokens: Token[]) {}

  public parse(): Expression {
    return this.expression();
  }

  private expression(): Expression {
    return this.equality();
  }

  private equality(): Expression {
    let expr = this.comparison();

    while (this.match([TokenType.BANG_EQUAL, TokenType.EQUAL_EQUAL])) {
      const operator = this.previous();
      const right = this.comparison();
      expr = buildBinaryExpression(expr, operator, right);
    }

    return expr;
  }

  private comparison(): Expression {
    let expr = this.term();

    while (
      this.match([
        TokenType.GREATER,
        TokenType.GREATER_EQUAL,
        TokenType.LESS,
        TokenType.LESS_EQUAL,
      ])
    ) {
      const operator = this.previous();
      const right = this.term();
      expr = buildBinaryExpression(expr, operator, right);
    }

    return expr;
  }

  private term(): Expression {
    let expr = this.factor();

    while (this.match([TokenType.MINUS, TokenType.PLUS])) {
      const operator = this.previous();
      const right = this.factor();
      expr = buildBinaryExpression(expr, operator, right);
    }

    return expr;
  }

  private factor(): Expression {
    let expr = this.unary();

    while (this.match([TokenType.STAR, TokenType.SLASH])) {
      const operator = this.previous();
      const right = this.unary();
      expr = buildBinaryExpression(expr, operator, right);
    }

    return expr;
  }

  private unary(): Expression {
    if (this.match([TokenType.BANG, TokenType.MINUS])) {
      const operator = this.previous();
      const right = this.unary();
      return buildUnaryExpression(operator, right);
    }

    return this.primary();
  }

  private primary(): Expression {
    if (this.match([TokenType.FALSE])) return buildLiteralExpression(false);
    if (this.match([TokenType.TRUE])) return buildLiteralExpression(true);
    if (this.match([TokenType.NIL])) return buildLiteralExpression(null);

    if (this.match([TokenType.NUMBER, TokenType.STRING])) {
      return buildLiteralExpression(this.previous().literal as string | number);
    }

    if (this.match([TokenType.LEFT_PAREN])) {
      const expr = this.expression();
      this.consume(TokenType.RIGHT_PAREN, "Expect ')' after expression.");
      return buildGroupingExpression(expr);
    }

    console.log(this.current, this.tokens);
    throw new Error("Something went wrong");
  }

  private match(types: TokenType[]) {
    for (const type of types) {
      if (this.check(type)) {
        this.advance();
        return true;
      }
    }

    return false;
  }

  private check(type: TokenType) {
    if (this.isAtEnd()) return false;
    return this.peek().tokenType == type;
  }

  private advance(): Token {
    if (!this.isAtEnd()) this.current += 1;
    return this.previous();
  }

  private isAtEnd() {
    return this.peek().tokenType == TokenType.EOF;
  }

  private peek(): Token {
    return this.tokens[this.current];
  }

  private previous(): Token {
    return this.tokens[this.current - 1];
  }

  private consume(type: TokenType, message: string) {
    if (this.check(type)) return this.advance();

    throw new Error(message);
  }
}
