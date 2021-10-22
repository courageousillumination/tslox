export enum TokenType {
  LEFT_PAREN,
  RIGHT_PAREN,
  LEFT_BRACE,
  RIGHT_BRACE,
  COMMA,
  DOT,
  MINUS,
  PLUS,
  SEMICOLON,
  SLASH,
  STAR,

  // One or two character tokens.
  BANG,
  BANG_EQUAL,
  EQUAL,
  EQUAL_EQUAL,
  GREATER,
  GREATER_EQUAL,
  LESS,
  LESS_EQUAL,

  // Literals.
  IDENTIFIER,
  STRING,
  NUMBER,

  // Keywords.
  AND,
  CLASS,
  ELSE,
  FALSE,
  FUN,
  FOR,
  IF,
  NIL,
  OR,
  PRINT,
  RETURN,
  SUPER,
  THIS,
  TRUE,
  VAR,
  WHILE,

  // Custom EOF
  EOF,
}

const KEYWORDS: any = {
  and: TokenType.AND,
  class: TokenType.CLASS,
  else: TokenType.ELSE,
  false: TokenType.FALSE,
  for: TokenType.FOR,
  fun: TokenType.FUN,
  if: TokenType.IF,
  nil: TokenType.NIL,
  or: TokenType.OR,
  print: TokenType.PRINT,
  return: TokenType.RETURN,
  super: TokenType.SUPER,
  this: TokenType.THIS,
  true: TokenType.TRUE,
  var: TokenType.VAR,
  while: TokenType.WHILE,
};

export interface Token {
  /** The type of the token. */
  tokenType: TokenType;
  /** The lexeme that produced this token. */
  lexeme: string;
  /** The line this token was located on. */
  line: number;
  /** An interpreted literal if necessary. */
  literal?: number | string;
}

export const tokenize = (input: string): Token[] => {
  const tokenizer = new Tokenizer(input);
  return tokenizer.scan();
};

class Tokenizer {
  private currentPosition = 0;
  private tokenStart = 0;
  private line = 1;

  constructor(private readonly content: string) {}

  public scan(): Token[] {
    const tokens: Token[] = [];

    while (!this.isAtEnd()) {
      const token = this.scanToken();
      if (token) {
        tokens.push(token);
      }
      this.tokenStart = this.currentPosition;
    }

    tokens.push(this.createToken(TokenType.EOF));
    return tokens;
  }

  private createToken(tokenType: TokenType, literal?: string | number): Token {
    return {
      tokenType,
      lexeme: this.content.slice(this.tokenStart, this.currentPosition),
      line: this.line,
      literal,
    };
  }

  private scanToken(): Token | null {
    const c = this.advance();
    switch (c) {
      case "(":
        return this.createToken(TokenType.LEFT_PAREN);
      case ")":
        return this.createToken(TokenType.RIGHT_PAREN);
      case "{":
        return this.createToken(TokenType.LEFT_BRACE);
      case "}":
        return this.createToken(TokenType.RIGHT_BRACE);
      case ",":
        return this.createToken(TokenType.COMMA);
      case ".":
        return this.createToken(TokenType.DOT);
      case "-":
        return this.createToken(TokenType.MINUS);
      case "+":
        return this.createToken(TokenType.PLUS);
      case ";":
        return this.createToken(TokenType.SEMICOLON);
      case "*":
        return this.createToken(TokenType.STAR);
      case "!":
        return this.createToken(
          this.match("=") ? TokenType.BANG_EQUAL : TokenType.BANG
        );
      case "=":
        return this.createToken(
          this.match("=") ? TokenType.EQUAL_EQUAL : TokenType.EQUAL
        );
      case "<":
        return this.createToken(
          this.match("=") ? TokenType.LESS_EQUAL : TokenType.LESS
        );
      case ">":
        return this.createToken(
          this.match("=") ? TokenType.GREATER_EQUAL : TokenType.GREATER
        );
      case "/":
        if (this.match("/")) {
          // A comment goes until the end of the line.
          while (!this.isAtEnd() && this.peek() != "\n") this.advance();
          return null;
        } else {
          return this.createToken(TokenType.SLASH);
        }
      case " ":
      case "\r":
      case "\t":
      case "\n":
        return null;
      case '"':
        return this.string();
      default:
        if (isDigit(c)) {
          return this.number();
        } else if (isAlpha(c)) {
          return this.identifier();
        }
        throw new Error(`Unknown token type: ${c}`);
    }
  }

  private isAtEnd() {
    return this.currentPosition >= this.content.length;
  }

  private advance() {
    const char = this.content[this.currentPosition];
    this.currentPosition += 1;
    if (char === "\n") {
      this.line += 1;
    }
    return char;
  }

  private match(expected: string) {
    if (this.isAtEnd() || this.content[this.currentPosition] != expected) {
      return false;
    }
    this.advance();
    return true;
  }

  private peek() {
    return this.content[this.currentPosition];
  }

  private string() {
    while (!this.isAtEnd() && this.peek() != '"') {
      this.advance();
    }

    if (this.isAtEnd()) {
      throw new Error("Unterminated string.");
    }

    // The closing ".
    this.advance();

    // Trim the surrounding quotes.
    const value = this.content.slice(
      this.tokenStart + 1,
      this.currentPosition - 1
    );
    return this.createToken(TokenType.STRING, value);
  }

  private number() {
    while (isDigit(this.peek())) this.advance();

    // Look for a fractional part.
    if (this.peek() == "." && isDigit(this.peekNext())) {
      // Consume the "."
      this.advance();

      while (isDigit(this.peek())) this.advance();
    }

    return this.createToken(
      TokenType.NUMBER,
      parseFloat(this.content.slice(this.tokenStart, this.currentPosition))
    );
  }

  private peekNext() {
    if (this.currentPosition + 1 >= this.content.length) return "\0";
    return this.content[this.currentPosition + 1];
  }

  private identifier() {
    while (!this.isAtEnd() && isAlphaNumeric(this.peek())) this.advance();

    const value = this.content.slice(this.tokenStart, this.currentPosition);
    const tokenType = KEYWORDS[value] || TokenType.IDENTIFIER;
    return this.createToken(tokenType);
  }
}

const isDigit = (x: string) => !isNaN(parseInt(x));
const isAlpha = (x: string) => x.match(/^[a-zA-Z_]+$/);
const isAlphaNumeric = (x: string) => isDigit(x) || isAlpha(x);
