import { Token } from ".";
import { Expression } from "./expression";

export enum StatementType {
  Print,
  Expression,
  VariableDeclaration,
  Block,
}

export interface PrintStatement {
  statementType: StatementType.Print;
  exp: Expression;
}

export interface ExpressionStatement {
  statementType: StatementType.Expression;
  exp: Expression;
}

export interface VariableDeclarationStatement {
  statementType: StatementType.VariableDeclaration;
  name: Token;
  initializer?: Expression;
}

export interface BlockStatement {
  statementType: StatementType.Block;
  statements: Statement[];
}

export const buildPrintStatement = (exp: Expression): PrintStatement => ({
  statementType: StatementType.Print,
  exp,
});

export const buildExpressionStatement = (
  exp: Expression
): ExpressionStatement => ({
  statementType: StatementType.Expression,
  exp,
});

export const buildVariableDeclarationStatement = (
  name: Token,
  initializer?: Expression
): VariableDeclarationStatement => ({
  statementType: StatementType.VariableDeclaration,
  name,
  initializer,
});

export const buildBlockStatement = (
  statements: Statement[]
): BlockStatement => ({
  statementType: StatementType.Block,
  statements,
});

export type Statement =
  | PrintStatement
  | ExpressionStatement
  | VariableDeclarationStatement
  | BlockStatement;

export interface StatementVisitor<T> {
  visitPrintStatement: (statement: PrintStatement) => T;
  visitExpressionStatement: (statement: ExpressionStatement) => T;
  visitVariableDeclarationStatement: (
    statement: VariableDeclarationStatement
  ) => T;
  visitBlockStatement: (statement: BlockStatement) => T;
}

export const visitStatement = <T>(
  statement: Statement,
  visitor: StatementVisitor<T>
) => {
  switch (statement.statementType) {
    case StatementType.Print:
      return visitor.visitPrintStatement(statement);
    case StatementType.Expression:
      return visitor.visitExpressionStatement(statement);
    case StatementType.VariableDeclaration:
      return visitor.visitVariableDeclarationStatement(statement);
    case StatementType.Block:
      return visitor.visitBlockStatement(statement);
  }
};
