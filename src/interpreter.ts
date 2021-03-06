import {
  CallExpression,
  SetExpression,
  ThisExpression,
  Token,
  TokenType,
  VariableExpression,
} from ".";
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
  GetExpression,
  SuperExpression,
} from "./expression";
import {
  BlockStatement,
  ClassStatement,
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
    private readonly closure: Environment,
    private readonly isInitializer: boolean = false
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
        if (this.isInitializer) return this.closure.getAt(0, "this");
        return e.value;
      } else {
        throw e;
      }
    }
    if (this.isInitializer) return this.closure.getAt(0, "this");

    return null;
  }

  toString() {
    return `fn<${this.name.lexeme}>`;
  }

  bindFunc(instance: any) {
    const environment = new Environment(this.closure);
    environment.define("this", instance);
    return new LoxFunction(this.name, this.params, this.body, environment);
  }
}

class LoxInstance {
  private readonly fields: Map<string, any> = new Map();

  constructor(private readonly klass: LoxClass) {}

  get(key: string) {
    if (this.fields.has(key)) {
      return this.fields.get(key);
    }

    const method = this.klass.findMethod(key);
    if (method != null) return method.bindFunc(this);

    throw new RuntimeException("Undefined property '" + key + "'.");
  }

  set(key: string, value: any) {
    this.fields.set(key, value);
  }

  toString() {
    return `${this.klass.toString()} instance`;
  }
}

class LoxClass implements LoxCallable {
  constructor(
    public readonly name: string,
    private readonly methods: Map<string, LoxFunction>,
    private readonly superClass: LoxClass | null
  ) {}

  findMethod(key: string): LoxFunction | null {
    if (this.methods.has(key)) return this.methods.get(key) || null;

    if (this.superClass !== null) {
      return this.superClass.findMethod(key);
    }
    return null;
  }

  toString() {
    return `${this.name}`;
  }

  call(interpreter: Interpreter, argumentList: any[]) {
    const instance = new LoxInstance(this);
    const initializer = this.findMethod("init");
    if (initializer != null) {
      initializer.bindFunc(instance).call(interpreter, argumentList);
    }
    return instance;
  }

  airity() {
    const initializer = this.findMethod("init");
    if (initializer != null) {
      return initializer.airity();
    } else {
      return 0;
    }
  }
}

export class Interpreter
  implements ExpressionVistor<any>, StatementVisitor<void>
{
  public readonly globals = new Environment();
  private readonly locals: Map<Expression, number> = new Map();

  private environment = this.globals;

  constructor() {
    // Load up any globals
    this.globals.define("clock", clock);
  }

  resolve(expression: Expression, depth: number) {
    this.locals.set(expression, depth);
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

  visitSuper(expr: SuperExpression) {
    const distance = this.locals.get(expr) as number;
    const superclass = this.environment.getAt(distance, "super");
    const object = this.environment.getAt(distance - 1, "this");

    const method = superclass.findMethod(expr.method.lexeme);
    if (!method) {
      throw new RuntimeException("Undefined property on super");
    }
    return method.bindFunc(object);
  }

  visitLiteral(exp: LiteralExpression) {
    return exp.literal;
  }

  visitGrouping(exp: GroupingExpression): any {
    return this.evaluate(exp.expression);
  }

  visitThis(exp: ThisExpression) {
    return this.lookupVariable(exp.keyword, exp);
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
    return this.lookupVariable(exp.name, exp);
  }

  private lookupVariable(name: Token, exp: Expression) {
    const distance = this.locals.get(exp);

    if (distance !== undefined) {
      return this.environment.getAt(distance, name.lexeme);
    } else {
      return this.globals.get(name.lexeme);
    }
  }

  visitClassStatement(statement: ClassStatement) {
    let superClass = null;
    if (statement.superClass) {
      superClass = this.evaluate(statement.superClass);
    }

    this.environment.define(statement.name.lexeme, null);

    if (statement.superClass) {
      this.environment = new Environment(this.environment);
      this.environment.define("super", superClass);
    }

    const methods = new Map<string, LoxFunction>();
    for (const method of statement.methods) {
      const func = new LoxFunction(
        method.name,
        method.params,
        method.body,
        this.environment,
        method.name.lexeme === "init"
      );
      methods.set(method.name.lexeme, func);
    }

    const klass = new LoxClass(statement.name.lexeme, methods, superClass);

    if (statement.superClass) {
      this.environment = this.environment.enclosing as Environment;
    }

    this.environment.assign(statement.name.lexeme, klass);
  }

  visitGet(expr: GetExpression) {
    const obj: any = this.evaluate(expr.object);
    if (obj.get) {
      return obj.get(expr.name.lexeme);
    }
    throw new RuntimeException("Only instances have properties");
  }

  visitSet(expr: SetExpression) {
    const obj: any = this.evaluate(expr.object);
    if (!obj.set) {
      throw new RuntimeException("Only instances have fields");
    }

    const value: any = this.evaluate(expr.value);
    obj.set(expr.name.lexeme, value);
    return value;
  }

  visitAssignement(exp: AssignementExpression): any {
    const value = this.evaluate(exp.value);
    const distance = this.locals.get(exp);
    if (distance !== undefined) {
      this.environment.assignAt(distance, exp.name.lexeme, value);
    } else {
      this.globals.assign(exp.name.lexeme, value);
    }
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
