import {
  AssignementExpression,
  BinaryExpression,
  CallExpression,
  Expression,
  ExpressionVistor,
  GroupingExpression,
  Interpreter,
  LiteralExpression,
  Token,
  UnaryExpression,
  VariableExpression,
  visitExpression,
} from ".";
import {
  BlockStatement,
  Statement,
  StatementVisitor,
  visitStatement,
  VariableDeclarationStatement,
  FuncStatement,
  ExpressionStatement,
  IfStatement,
  PrintStatement,
  RetStatement,
  WhileStatement,
} from "./statement";

enum CurrentFunctionType {
  NONE,
  FUNCTION,
}

export class Resolver
  implements StatementVisitor<void>, ExpressionVistor<void>
{
  private readonly scopes: Map<string, boolean>[] = [];
  private currentFunction: CurrentFunctionType = CurrentFunctionType.NONE;

  constructor(private readonly interpreter: Interpreter) {}

  public visitBlockStatement(statement: BlockStatement) {
    this.beginScope();
    this.resolve(statement.statements);
    this.endScope();
  }

  visitVariableDeclarationStatement(statement: VariableDeclarationStatement) {
    this.declare(statement.name);
    if (statement.initializer) {
      this.resolve(statement.initializer);
    }
    this.define(statement.name);
  }

  visitVariable(expr: VariableExpression) {
    if (
      this.scopes.length > 0 &&
      this.scopes[0].get(expr.name.lexeme) === false
    ) {
      throw new Error("Can't read local variable in its own initializer.");
    }
    this.resolveLocal(expr, expr.name);
  }

  visitAssignement(expr: AssignementExpression) {
    this.resolve(expr.value);
    this.resolveLocal(expr, expr.name);
  }

  visitFuncStatement(statement: FuncStatement) {
    this.declare(statement.name);
    this.define(statement.name);
    return this.resolveFunction(statement, CurrentFunctionType.FUNCTION);
  }

  visitBinary(expr: BinaryExpression) {
    this.resolve(expr.left);
    this.resolve(expr.right);
  }

  visitCall(expr: CallExpression) {
    this.resolve(expr.callee);
    expr.argumentsList.forEach((x) => this.resolve(x));
  }

  visitExpressionStatement(expr: ExpressionStatement) {
    this.resolve(expr.exp);
  }

  visitGrouping(expr: GroupingExpression) {
    this.resolve(expr.expression);
  }

  visitIfStatement(statement: IfStatement) {
    this.resolve(statement.condition);
    this.resolve(statement.thenBranch);
    if (statement.elseBranch) {
      this.resolve(statement.elseBranch);
    }
  }

  visitLiteral(expr: LiteralExpression) {}

  visitPrintStatement(statement: PrintStatement) {
    this.resolve(statement.exp);
  }

  visitRetStatement(statement: RetStatement) {
    if (this.currentFunction === CurrentFunctionType.NONE) {
      throw new Error("Can't return from top-level code.");
    }
    if (statement.value) {
      this.resolve(statement.value);
    }
  }

  visitUnary(expression: UnaryExpression) {
    this.resolve(expression.value);
  }

  visitWhileStatement(statement: WhileStatement) {
    this.resolve(statement.condition);
    this.resolve(statement.body);
  }

  private resolveFunction(statement: FuncStatement, type: CurrentFunctionType) {
    const enclosingFunction = this.currentFunction;
    this.currentFunction = type;
    this.beginScope();
    for (const param of statement.params) {
      this.declare(param);
      this.define(param);
    }
    this.resolve(statement.body);
    this.endScope();
    this.currentFunction = enclosingFunction;
  }

  private resolveLocal(expr: Expression, name: Token) {
    for (let i = 0; i < this.scopes.length; i++) {
      if (this.scopes[i].get(name.lexeme)) {
        this.interpreter.resolve(expr, i);
        return;
      }
    }
  }

  private declare(name: Token) {
    if (this.scopes.length === 0) {
      return;
    }
    const scope = this.scopes[0];
    if (scope.has(name.lexeme)) {
      throw new Error("Duplicate variable declaration");
    }
    scope.set(name.lexeme, false);
  }

  private define(name: Token) {
    if (this.scopes.length === 0) {
      return;
    }
    const scope = this.scopes[0];
    scope.set(name.lexeme, true);
  }

  private beginScope() {
    this.scopes.unshift(new Map());
  }
  private endScope() {
    this.scopes.shift();
  }

  public resolve(statements: Statement[]): void;
  public resolve(statement: Statement): void;
  public resolve(expression: Expression): void;
  public resolve(value: Statement | Statement[] | Expression) {
    if (Array.isArray(value)) {
      value.forEach((x) => this.resolve(x));
    }
    if ((value as Expression).expressionType) {
      return visitExpression(value as Expression, this);
    } else {
      return visitStatement(value as Statement, this);
    }
  }
}
