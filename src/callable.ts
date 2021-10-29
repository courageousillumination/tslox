import { Interpreter } from ".";

export interface LoxCallable {
  airity: () => number;
  call: (interpreter: Interpreter, argumentList: any[]) => void;
}
