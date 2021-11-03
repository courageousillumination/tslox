import {
  AssignementExpression,
  BinaryExpression,
  CallExpression,
  Expression,
  ExpressionVistor,
  GetExpression,
  GroupingExpression,
  Interpreter,
  LiteralExpression,
  SetExpression,
  SuperExpression,
  ThisExpression,
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
  ClassStatement,
} from "./statement";

enum FunctionType {
  NONE,
  FUNCTION,
  METHOD,
  INITIALIZER,
}

enum ClassType {
  NONE,
  CLASS,
  SUBCLASS,
}

export class Resolver
  implements StatementVisitor<void>, ExpressionVistor<void>
{
  private readonly scopes: Map<string, boolean>[] = [];
  private currentFunction: FunctionType = FunctionType.NONE;
  private currentClass: ClassType = ClassType.NONE;

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
    return this.resolveFunction(statement, FunctionType.FUNCTION);
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
    if (this.currentFunction === FunctionType.NONE) {
      throw new Error("Can't return from top-level code.");
    }

    if (this.currentFunction == FunctionType.INITIALIZER) {
      throw new Error("Can't return a value from an initializer.");
    }
    if (statement.value) {
      this.resolve(statement.value);
    }
  }

  visitSuper(expr: SuperExpression) {
    if (this.currentClass === ClassType.NONE) {
      throw new Error("Can't use 'super' outside of a class.");
    } else if (this.currentClass !== ClassType.SUBCLASS) {
      throw new Error("Can't use 'super' in a class with no superclass.");
    }
    this.resolveLocal(expr, expr.keyword);
  }

  visitClassStatement(statement: ClassStatement) {
    const enclosingClass = this.currentClass;
    this.currentClass = ClassType.CLASS;

    this.declare(statement.name);
    this.define(statement.name);

    if (statement.superClass) {
      if (statement.name.lexeme === statement.superClass.name.lexeme) {
        throw new Error("A class can't inherit from itself");
      }
      this.currentClass = ClassType.SUBCLASS;
      this.resolve(statement.superClass);
    }

    if (statement.superClass) {
      this.beginScope();
      this.scopes[0].set("super", true);
    }

    this.beginScope();
    this.scopes[0].set("this", true);

    for (const method of statement.methods) {
      let declaration = FunctionType.METHOD;
      if (method.name.lexeme === "init") {
        declaration = FunctionType.INITIALIZER;
      }
      this.resolveFunction(method, declaration);
    }

    this.endScope();

    if (statement.superClass) {
      this.endScope();
    }

    this.currentClass = enclosingClass;
  }

  visitThis(expr: ThisExpression) {
    if (this.currentClass == ClassType.NONE) {
      throw new Error("Can't use 'this' outside of a class.");
    }
    this.resolveLocal(expr, expr.keyword);
  }

  visitGet(expr: GetExpression) {
    this.resolve(expr.object);
  }

  visitSet(expr: SetExpression) {
    this.resolve(expr.object);
    this.resolve(expr.value);
  }

  visitUnary(expression: UnaryExpression) {
    this.resolve(expression.value);
  }

  visitWhileStatement(statement: WhileStatement) {
    this.resolve(statement.condition);
    this.resolve(statement.body);
  }

  private resolveFunction(statement: FuncStatement, type: FunctionType) {
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
    if ((value as Expression).expressionType !== undefined) {
      return visitExpression(value as Expression, this);
    } else {
      return visitStatement(value as Statement, this);
    }
  }
}
