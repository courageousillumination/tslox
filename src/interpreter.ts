import { CallExpression, Token, TokenType, VariableExpression } from ".";
import { clock } from "./native";
import { LoxCallable } from "./callable";
import { Environment } from "./environment";
import {
  BinaryExpression,
  Expression,
  ExpressionVistor,
  GroupingExpression,
  LiteralExpression,
  UnaryExpression,
  visitExpression,
  AssignementExpression,
} from "./expression";
import {
  BlockStatement,
  ExpressionStatement,
  FuncStatement,
  IfStatement,
  PrintStatement,
  RetStatement,
  Statement,
  StatementVisitor,
  VariableDeclarationStatement,
  visitStatement,
  WhileStatement,
} from "./statement";

type PrimativeType = string | number | null | boolean;

export class RuntimeException extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RuntimeException";
  }
}

class ReturnError extends Error {
  constructor(message: string, private readonly value: any) {
    super(message);
    this.name = "ReturnError";
  }
}

const isTruthy = (value: PrimativeType) => {
  if (value === null) return false;
  if (typeof value === "boolean") return value;
  return true;
};

const isEqual = (left: any, right: any) => {
  return left === right;
};

const checkNumber = (operator: Token, value: any) => {
  if (typeof value !== "number") {
    console.log(value, typeof value);
    throw new RuntimeException(
      `${operator.lexeme} expected number (line ${operator.line})`
    );
  }
};

const checkNumberBinary = (operator: Token, left: any, right: any) => {
  if (typeof left !== "number" || typeof right !== "number") {
    throw new RuntimeException(
      `${operator.lexeme} expected number (line ${operator.line})`
    );
  }
};

export const stringify = (value: any): string => {
  if (value === null) return "nil";

  if (typeof value === "number") {
    const text = value.toString();
    if (text.endsWith(".0")) {
      return text.substring(0, text.length - 2);
    }
    return text;
  }

  return value.toString();
};

class LoxFunction implements LoxCallable {
  constructor(
    private readonly name: Token,
    private readonly params: Token[],
    private readonly body: Statement[],
    private readonly closure: Environment
  ) {}

  airity() {
    return this.params.length;
  }

  call(interpreter: Interpreter, argumentList: any[]) {
    const env = new Environment(this.closure);
    for (let i = 0; i < argumentList.length; i++) {
      env.define(this.params[i].lexeme, argumentList[i]);
    }

    try {
      interpreter.executeBlock(this.body, env);
    } catch (e: any) {
      if (e.name === "ReturnError") {
        return e.value;
      } else {
        throw e;
      }
    }
  }

  toString() {
    return `fn<${this.name.lexeme}>`;
  }
}

export class Interpreter
  implements ExpressionVistor<any>, StatementVisitor<void>
{
  public readonly globals = new Environment();
  private environment = this.globals;

  constructor() {
    // Load up any globals
    this.globals.define("clock", clock);
  }

  interpret(statements: Statement[]) {
    for (const statement of statements) {
      this.execute(statement);
    }
  }

  visitIfStatement(statement: IfStatement) {
    if (isTruthy(this.evaluate(statement.condition))) {
      this.execute(statement.thenBranch);
    } else if (statement.elseBranch !== null) {
      this.execute(statement.elseBranch);
    }
  }

  visitWhileStatement(statement: WhileStatement) {
    while (isTruthy(this.evaluate(statement.condition))) {
      this.execute(statement.body);
    }
  }

  visitPrintStatement(stmt: PrintStatement) {
    const value = this.evaluate(stmt.exp);
    console.log(stringify(value));
  }

  visitExpressionStatement(stmt: ExpressionStatement) {
    this.evaluate(stmt.exp);
  }

  visitVariableDeclarationStatement(stmt: VariableDeclarationStatement) {
    const value = stmt.initializer ? this.evaluate(stmt.initializer) : null;
    this.environment.define(stmt.name.lexeme, value);
  }

  visitLiteral(exp: LiteralExpression) {
    return exp.literal;
  }

  visitGrouping(exp: GroupingExpression): any {
    return this.evaluate(exp.expression);
  }

  visitUnary(exp: UnaryExpression): PrimativeType {
    const right = this.evaluate(exp.value);

    switch (exp.operator.tokenType) {
      case TokenType.BANG:
        return !isTruthy(right);
      case TokenType.MINUS:
        checkNumber(exp.operator, right);
        return -right;
      default:
        throw new Error("Unexpected operator");
    }
  }

  visitVariable(exp: VariableExpression): any {
    return this.environment.get(exp.name.lexeme);
  }

  visitAssignement(exp: AssignementExpression): any {
    const value = this.evaluate(exp.value);
    this.environment.assign(exp.name.lexeme, value);
  }

  visitBlockStatement(statement: BlockStatement) {
    this.executeBlock(statement.statements, new Environment(this.environment));
  }

  executeBlock(statements: Statement[], environment: Environment) {
    const previousEnvironment = this.environment;
    try {
      this.environment = environment;

      for (const statement of statements) {
        this.execute(statement);
      }
    } finally {
      this.environment = previousEnvironment;
    }

    return null;
  }

  visitCall(exp: CallExpression): any {
    const callee: LoxCallable = this.evaluate(exp.callee);
    const args = exp.argumentsList.map((x) => this.evaluate(x));
    if (!callee.call) {
      throw new RuntimeException(
        "Tried to call something that wasn't a function"
      );
    }

    if (callee.airity() !== args.length) {
      throw new RuntimeException("Incorrect number of arguments");
    }
    return callee.call(this, args);
  }

  visitFuncStatement(statement: FuncStatement) {
    const func = new LoxFunction(
      statement.name,
      statement.params,
      statement.body,
      this.environment
    );
    this.environment.define(statement.name.lexeme, func);
  }

  visitRetStatement(statement: RetStatement) {
    const value =
      statement.value !== null ? this.evaluate(statement.value) : null;
    throw new ReturnError("", value);
  }

  visitBinary(exp: BinaryExpression): any {
    const right = this.evaluate(exp.right);
    const left = this.evaluate(exp.left);

    switch (exp.operator.tokenType) {
      case TokenType.MINUS:
        checkNumberBinary(exp.operator, left, right);
        return left - right;
      case TokenType.SLASH:
        checkNumberBinary(exp.operator, left, right);
        return left / right;
      case TokenType.STAR:
        checkNumberBinary(exp.operator, left, right);
        return left * right;
      case TokenType.PLUS:
        if (
          typeof left === typeof right &&
          (typeof left === "number" || typeof left === "string")
        ) {
          return left + right; // todo
        }
        throw new RuntimeException(
          `${exp.operator.lexeme} expected a string or number`
        );
      case TokenType.GREATER:
        checkNumberBinary(exp.operator, left, right);
        return left > right;
      case TokenType.GREATER_EQUAL:
        checkNumberBinary(exp.operator, left, right);
        return left >= right;
      case TokenType.LESS:
        checkNumberBinary(exp.operator, left, right);
        return left < right;
      case TokenType.LESS_EQUAL:
        checkNumberBinary(exp.operator, left, right);
        return left <= right;
      case TokenType.BANG_EQUAL:
        return !isEqual(left, right);
      case TokenType.EQUAL_EQUAL:
        return isEqual(left, right);
      default:
        throw new Error("Unexpected operator");
    }
  }

  public evaluate(expression: Expression) {
    return visitExpression<any>(expression, this);
  }

  public execute(statement: Statement) {
    return visitStatement(statement, this);
  }
}
