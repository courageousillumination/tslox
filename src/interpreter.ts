import { Token, TokenType } from ".";
import {
  BinaryExpression,
  Expression,
  ExpressionVistor,
  GroupingExpression,
  LiteralExpression,
  UnaryExpression,
  visitExpression,
} from "./expression";

type PrimativeType = string | number | null | boolean;

export class RuntimeException extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RuntimeException";
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
  if (typeof left !== "number" || right !== "number") {
    throw new RuntimeException(
      `${operator.lexeme} expected number (line ${operator.line})`
    );
  }
};

export const interpret = (expr: Expression) => {
  const interpreter = new Interpreter();
  return interpreter.evaluate(expr);
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

export class Interpreter implements ExpressionVistor<any> {
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
}
