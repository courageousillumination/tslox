#!/usr/bin/env node
import prompt from "prompt-sync";
import fs from "fs";

import {
  evaluate,
  Interpreter,
  tokenize,
  parse,
  RuntimeException,
  stringify,
  Resolver,
} from "../src";
// const fs = require('fs')

/** Run lox in an interpreter */
const runInterpreter = async () => {
  const p = prompt({ sigint: true, eot: true } as any);
  const interpreter = new Interpreter();
  const resolver = new Resolver(interpreter);
  while (true) {
    const result = p("> ");
    if (result === "quit") {
      break;
    } else {
      try {
        const ast = parse(tokenize(result));
        resolver.resolve(ast);
        interpreter.interpret(ast);
      } catch (e) {
        // console.log(, e instanceof RuntimeException);
        if ((e as any).name === "RuntimeException") {
          console.log("RuntimeException:", (e as any).message);
        } else {
          console.log("Unhandled error:");
          console.log(e);
        }
      }
    }
  }
};

/** Compile and run a lox file */
const runCompiled = async (fileName: string) => {
  const content = fs.readFileSync(fileName);
  const interpreter = new Interpreter();
  const resolver = new Resolver(interpreter);
  const ast = parse(tokenize(content.toString()));
  resolver.resolve(ast);
  interpreter.interpret(ast);
};

const main = async () => {
  // First two arguments to argv are "node" and script name.
  const [, , ...args] = process.argv;
  if (args.length === 0) {
    return runInterpreter();
  } else if (args.length === 1) {
    runCompiled(args[0]);
  } else {
    console.log("Usage: tslox [script]");
  }
};

main()
  .then(() => console.log("Shutting Down"))
  .catch((e) => console.log(e));
