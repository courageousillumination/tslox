import {
  buildAssignementExpression,
  buildVariableExpression,
  ExpressionType,
} from ".";
import {
  Expression,
  buildBinaryExpression,
  buildUnaryExpression,
  buildLiteralExpression,
  buildGroupingExpression,
} from "./expression";
import { Token, TokenType } from "./lexer";
import {
  buildBlockStatement,
  buildExpressionStatement,
  buildPrintStatement,
  buildVariableDeclarationStatement,
  Statement,
} from "./statement";

export const parse = (tokens: Token[]) => {
  const parser = new Parser(tokens);
  return parser.parse();
};

class Parser {
  private current = 0;
  constructor(private tokens: Token[]) {}

  public parse(): Statement[] {
    const statements = [];
    while (!this.isAtEnd()) {
      statements.push(this.declaration());
    }
    return statements;
  }

  private declaration(): Statement {
    if (this.match([TokenType.VAR])) {
      return this.varDeclaration();
    }

    if (this.match([TokenType.LEFT_BRACE])) {
      return buildBlockStatement(this.block());
    }
    return this.statement();
  }

  private block(): Statement[] {
    const statements = [];
    while (!this.check(TokenType.RIGHT_BRACE) && !this.isAtEnd()) {
      statements.push(this.declaration());
    }

    this.consume(TokenType.RIGHT_BRACE, "Expected '}' at end of block");
    return statements;
  }

  private varDeclaration(): Statement {
    const name = this.consume(TokenType.IDENTIFIER, "Expect variable name.");

    let initializer;
    if (this.match([TokenType.EQUAL])) {
      initializer = this.expression();
    }

    this.consume(TokenType.SEMICOLON, "Expect ';' after variable declaration.");
    return buildVariableDeclarationStatement(name, initializer);
  }

  private statement(): Statement {
    if (this.match([TokenType.PRINT])) {
      return this.printStatement();
    }

    return this.expressionStatement();
  }

  private printStatement(): Statement {
    const value = this.expression();
    this.consume(TokenType.SEMICOLON, "Expected ';' at end of print statement");
    return buildPrintStatement(value);
  }

  private expressionStatement(): Statement {
    const value = this.expression();
    this.consume(
      TokenType.SEMICOLON,
      "Expected ';' at end of expression statement"
    );
    return buildExpressionStatement(value);
  }

  private expression(): Expression {
    return this.assignement();
  }

  private assignement(): Expression {
    const expr = this.equality();

    if (this.match([TokenType.EQUAL])) {
      const equals = this.previous();
      const value = this.assignement();

      if (expr.expressionType === ExpressionType.Variable) {
        const name = expr.name;
        return buildAssignementExpression(name, value);
      }
    }
    return expr;
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

    if (this.match([TokenType.IDENTIFIER])) {
      return buildVariableExpression(this.previous());
    }

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
