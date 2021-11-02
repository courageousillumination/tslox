import { Token } from ".";
import { Expression } from "./expression";

export enum StatementType {
  Print,
  Expression,
  VariableDeclaration,
  Block,
  If,
  While,
  Func,
  Ret,
  Class,
}

export interface FuncStatement {
  statementType: StatementType.Func;
  name: Token;
  params: Token[];
  body: Statement[];
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

export interface IfStatement {
  statementType: StatementType.If;
  condition: Expression;
  thenBranch: Statement;
  elseBranch: Statement | null;
}

export interface WhileStatement {
  statementType: StatementType.While;
  condition: Expression;
  body: Statement;
}

export interface RetStatement {
  statementType: StatementType.Ret;
  keyword: Token;
  value: Expression | null;
}

export interface ClassStatement {
  statementType: StatementType.Class;
  name: Token;
  methods: FuncStatement[];
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

export const buildIfStatement = (
  condition: Expression,
  thenBranch: Statement,
  elseBranch: Statement | null
): IfStatement => ({
  statementType: StatementType.If,
  condition,
  thenBranch,
  elseBranch,
});

export const buildWhileStatement = (
  condition: Expression,
  body: Statement
): WhileStatement => ({
  statementType: StatementType.While,
  condition,
  body,
});

export const buildFunStatement = (
  name: Token,
  params: Token[],
  body: Statement[]
): FuncStatement => ({
  statementType: StatementType.Func,
  name,
  params,
  body,
});

export const buildRetStatement = (
  keyword: Token,
  value: Expression | null
): RetStatement => ({
  statementType: StatementType.Ret,
  keyword,
  value,
});

export const buildClassStatement = (
  name: Token,
  methods: FuncStatement[]
): ClassStatement => ({
  statementType: StatementType.Class,
  name,
  methods,
});

export type Statement =
  | PrintStatement
  | ExpressionStatement
  | VariableDeclarationStatement
  | BlockStatement
  | IfStatement
  | WhileStatement
  | FuncStatement
  | RetStatement
  | ClassStatement;

export interface StatementVisitor<T> {
  visitPrintStatement: (statement: PrintStatement) => T;
  visitExpressionStatement: (statement: ExpressionStatement) => T;
  visitVariableDeclarationStatement: (
    statement: VariableDeclarationStatement
  ) => T;
  visitBlockStatement: (statement: BlockStatement) => T;
  visitIfStatement: (statement: IfStatement) => T;
  visitWhileStatement: (statement: WhileStatement) => T;
  visitFuncStatement: (statement: FuncStatement) => T;
  visitRetStatement: (statement: RetStatement) => T;
  visitClassStatement: (statement: ClassStatement) => T;
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
    case StatementType.If:
      return visitor.visitIfStatement(statement);
    case StatementType.While:
      return visitor.visitWhileStatement(statement);
    case StatementType.Func:
      return visitor.visitFuncStatement(statement);
    case StatementType.Ret:
      return visitor.visitRetStatement(statement);
    case StatementType.Class:
      return visitor.visitClassStatement(statement);
  }
};
