import {
  buildAssignementExpression,
  buildCallExpression,
  buildGetExpression,
  buildSetExpression,
  buildSuperExpression,
  buildVariableExpression,
  ExpressionType,
  VariableExpression,
} from ".";
import {
  Expression,
  buildBinaryExpression,
  buildUnaryExpression,
  buildLiteralExpression,
  buildGroupingExpression,
  buildThisExpression,
} from "./expression";
import { Token, TokenType } from "./lexer";
import {
  buildBlockStatement,
  buildClassStatement,
  buildExpressionStatement,
  buildFunStatement,
  buildIfStatement,
  buildPrintStatement,
  buildRetStatement,
  buildVariableDeclarationStatement,
  buildWhileStatement,
  FuncStatement,
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
      const statement = this.declaration();
      if (statement !== null) {
        statements.push(statement);
      }
    }
    return statements;
  }

  private declaration(): Statement | null {
    if (this.match([TokenType.SLASH_DASH])) {
      this.declaration();
      return null;
    }

    if (this.match([TokenType.CLASS])) {
      return this.classDeclaration();
    }

    if (this.match([TokenType.FUN])) {
      return this.func("function");
    }
    if (this.match([TokenType.VAR])) {
      return this.varDeclaration();
    }
    return this.statement();
  }

  private classDeclaration() {
    const name = this.consume(TokenType.IDENTIFIER, "Expected class name.");

    let superClass: undefined | VariableExpression = undefined;
    if (this.match([TokenType.LESS])) {
      const superName = this.consume(
        TokenType.IDENTIFIER,
        "Expected super class"
      );
      superClass = buildVariableExpression(superName);
    }

    this.consume(TokenType.LEFT_BRACE, "Expected '{' before class body.");

    const methods: FuncStatement[] = [];
    while (!this.check(TokenType.RIGHT_BRACE) && !this.isAtEnd()) {
      methods.push(this.func("method"));
    }

    this.consume(TokenType.RIGHT_BRACE, "Expected '}' after class body.");
    return buildClassStatement(name, methods, superClass);
  }

  private func(kind: string): FuncStatement {
    const name = this.consume(
      TokenType.IDENTIFIER,
      "Expect " + kind + " name."
    );
    this.consume(TokenType.LEFT_PAREN, "Expect '(' after " + kind + " name.");
    const parameters: Token[] = [];
    if (!this.check(TokenType.RIGHT_PAREN)) {
      do {
        if (parameters.length >= 255) {
          throw new Error("Can't have more than 255 parameters.");
        }

        parameters.push(
          this.consume(TokenType.IDENTIFIER, "Expect parameter name.")
        );
      } while (this.match([TokenType.COMMA]));
    }
    this.consume(TokenType.RIGHT_PAREN, "Expect ')' after parameters.");
    this.consume(TokenType.LEFT_BRACE, "Expect '{' before " + kind + " body.");
    const body = this.block();
    return buildFunStatement(name, parameters, body);
  }

  private block(): Statement[] {
    const statements = [];
    while (!this.check(TokenType.RIGHT_BRACE) && !this.isAtEnd()) {
      const statement = this.declaration();
      if (statement !== null) {
        statements.push(statement);
      }
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
    if (this.match([TokenType.IF])) {
      return this.ifStatement();
    }
    if (this.match([TokenType.PRINT])) {
      return this.printStatement();
    }
    if (this.match([TokenType.RETURN])) {
      return this.returnStatement();
    }
    if (this.match([TokenType.WHILE])) {
      return this.whileStatement();
    }
    if (this.match([TokenType.LEFT_BRACE])) {
      return buildBlockStatement(this.block());
    }

    return this.expressionStatement();
  }

  private returnStatement() {
    const keyword = this.previous();
    let value = null;
    if (!this.check(TokenType.SEMICOLON)) {
      value = this.expression();
    }
    this.consume(TokenType.SEMICOLON, "Expect ';' after return value.");
    return buildRetStatement(keyword, value);
  }

  private whileStatement(): Statement {
    this.consume(TokenType.LEFT_PAREN, "Expected '(' after while.");
    const condition = this.expression();
    this.consume(TokenType.RIGHT_PAREN, "Expected ')' after condition.");
    const body = this.statement();
    return buildWhileStatement(condition, body);
  }

  private ifStatement(): Statement {
    this.consume(TokenType.LEFT_PAREN, "Expected '(' after if.");
    const condition = this.expression();
    this.consume(TokenType.RIGHT_PAREN, "Expected ')' after if condition.");
    const thenBranch = this.statement();
    const elseBranch = this.match([TokenType.ELSE]) ? this.statement() : null;
    return buildIfStatement(condition, thenBranch, elseBranch);
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
      } else if (expr.expressionType === ExpressionType.Get) {
        return buildSetExpression(expr.name, expr.object, value);
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

    return this.call();
  }

  private call(): Expression {
    let expr: Expression = this.primary();

    while (true) {
      if (this.match([TokenType.LEFT_PAREN])) {
        expr = this.finishCall(expr);
      } else if (this.match([TokenType.DOT])) {
        const name = this.consume(
          TokenType.IDENTIFIER,
          "Expect property name after '.'."
        );
        expr = buildGetExpression(name, expr);
      } else {
        break;
      }
    }

    return expr;
  }

  private finishCall(expr: Expression): Expression {
    const argumentList: Expression[] = [];
    if (!this.check(TokenType.RIGHT_PAREN)) {
      do {
        if (argumentList.length >= 255) {
          throw new Error("too many arguments");
        }
        argumentList.push(this.expression());
      } while (this.match([TokenType.COMMA]));
    }

    const paren = this.consume(
      TokenType.RIGHT_PAREN,
      "Expected ')' after arguments."
    );
    return buildCallExpression(expr, paren, argumentList);
  }

  private primary(): Expression {
    if (this.match([TokenType.FALSE])) return buildLiteralExpression(false);
    if (this.match([TokenType.TRUE])) return buildLiteralExpression(true);
    if (this.match([TokenType.NIL])) return buildLiteralExpression(null);
    if (this.match([TokenType.THIS]))
      return buildThisExpression(this.previous());

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

    if (this.match([TokenType.SUPER])) {
      const keyword = this.previous();
      this.consume(TokenType.DOT, "Expect '.' after 'super'.");
      const method = this.consume(
        TokenType.IDENTIFIER,
        "Expect superclass method name."
      );
      return buildSuperExpression(keyword, method);
    }

    console.log(this.peek());

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
