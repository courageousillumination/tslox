import { Token } from "./lexer";

export enum ExpressionType {
  Binary,
  Literal,
  Unary,
  Grouping,
  Variable,
  Assignement,
  Call,
  Get,
  Set,
  This,
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

export interface VariableExpression {
  expressionType: ExpressionType.Variable;
  name: Token;
}

export interface AssignementExpression {
  expressionType: ExpressionType.Assignement;
  name: Token;
  value: Expression;
}

export interface CallExpression {
  expressionType: ExpressionType.Call;
  callee: Expression;
  paren: Token;
  argumentsList: Expression[];
}

export interface GetExpression {
  expressionType: ExpressionType.Get;
  name: Token;
  object: Expression;
}

export interface SetExpression {
  expressionType: ExpressionType.Set;
  name: Token;
  object: Expression;
  value: Expression;
}

export interface ThisExpression {
  expressionType: ExpressionType.This;
  keyword: Token;
}

export type Expression =
  | BinaryExpression
  | LiteralExpression
  | UnaryExpression
  | GroupingExpression
  | VariableExpression
  | AssignementExpression
  | CallExpression
  | GetExpression
  | SetExpression
  | ThisExpression;

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

export const buildVariableExpression = (name: Token): VariableExpression => {
  return {
    expressionType: ExpressionType.Variable,
    name,
  };
};

export const buildAssignementExpression = (
  name: Token,
  value: Expression
): AssignementExpression => {
  return {
    expressionType: ExpressionType.Assignement,
    name,
    value,
  };
};

export const buildCallExpression = (
  callee: Expression,
  paren: Token,
  argumentsList: Expression[]
): CallExpression => {
  return {
    expressionType: ExpressionType.Call,
    callee,
    paren,
    argumentsList,
  };
};

export const buildGetExpression = (
  name: Token,
  object: Expression
): GetExpression => ({
  expressionType: ExpressionType.Get,
  name,
  object,
});

export const buildSetExpression = (
  name: Token,
  object: Expression,
  value: Expression
): SetExpression => ({
  expressionType: ExpressionType.Set,
  name,
  object,
  value,
});

export const buildThisExpression = (keyword: Token): ThisExpression => ({
  expressionType: ExpressionType.This,
  keyword,
});

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
    case ExpressionType.Variable:
      return expr.name.lexeme;
    default:
      throw new Error("Unprintable expression type");
  }
};

export interface ExpressionVistor<T> {
  visitLiteral: (exp: LiteralExpression) => T;
  visitUnary: (exp: UnaryExpression) => T;
  visitBinary: (exp: BinaryExpression) => T;
  visitGrouping: (exp: GroupingExpression) => T;
  visitVariable: (exp: VariableExpression) => T;
  visitAssignement: (exp: AssignementExpression) => T;
  visitCall: (exp: CallExpression) => T;
  visitGet: (exp: GetExpression) => T;
  visitSet: (exp: SetExpression) => T;
  visitThis: (exp: ThisExpression) => T;
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
    case ExpressionType.Variable:
      return visitor.visitVariable(expression);
    case ExpressionType.Assignement:
      return visitor.visitAssignement(expression);
    case ExpressionType.Call:
      return visitor.visitCall(expression);
    case ExpressionType.Get:
      return visitor.visitGet(expression);
    case ExpressionType.Set:
      return visitor.visitSet(expression);
    case ExpressionType.This:
      return visitor.visitThis(expression);
  }
};
