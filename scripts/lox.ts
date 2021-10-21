#!/usr/bin/env node
import prompt from "prompt-sync";
import fs from "fs";

import { evaluate } from "../src";
// const fs = require('fs')

/** Run lox in an interpreter */
const runInterpreter = async () => {
  const p = prompt({ sigint: true, eot: true } as any);
  while (true) {
    const result = p("> ");
    if (result === "quit") {
      break;
    } else {
      console.log(evaluate(result));
    }
  }
};

/** Compile and run a lox file */
const runCompiled = async (fileName: string) => {
  const content = fs.readFileSync(fileName);
  console.log(content);
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
