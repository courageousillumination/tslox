import { Token } from "./lexer";

export enum ExpressionType {
  Binary,
  Literal,
  Unary,
  Grouping,
}

export interface BinaryExpression {
  expressionType: ExpressionType.Binary;
  left: Expression;
  right: Expression;
  operator: Token;
}

export interface LiteralExpression {
  expressionType: ExpressionType.Literal;
  literal: string | number | boolean | null;
}

export interface UnaryExpression {
  expressionType: ExpressionType.Unary;
  operator: Token;
  value: Expression;
}

export interface GroupingExpression {
  expressionType: ExpressionType.Grouping;
  expression: Expression;
}

export type Expression =
  | BinaryExpression
  | LiteralExpression
  | UnaryExpression
  | GroupingExpression;

export const buildBinaryExpression = (
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

export const buildLiteralExpression = (
  literal: string | number | boolean | null
): LiteralExpression => {
  return {
    expressionType: ExpressionType.Literal,
    literal,
  };
};

export const buildUnaryExpression = (
  operator: Token,
  value: Expression
): UnaryExpression => {
  return {
    expressionType: ExpressionType.Unary,
    operator,
    value,
  };
};

export const buildGroupingExpression = (
  expression: Expression
): GroupingExpression => {
  return {
    expressionType: ExpressionType.Grouping,
    expression,
  };
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

export interface ExpressionVistor<T> {
  visitLiteral: (exp: LiteralExpression) => T;
  visitUnary: (exp: UnaryExpression) => T;
  visitBinary: (exp: BinaryExpression) => T;
  visitGrouping: (exp: GroupingExpression) => T;
}

export const visitExpression = <T>(
  expression: Expression,
  visitor: ExpressionVistor<T>
) => {
  switch (expression.expressionType) {
    case ExpressionType.Literal:
      return visitor.visitLiteral(expression);
    case ExpressionType.Binary:
      return visitor.visitBinary(expression);
    case ExpressionType.Unary:
      return visitor.visitUnary(expression);
    case ExpressionType.Grouping:
      return visitor.visitGrouping(expression);
  }
};