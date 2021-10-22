import { tokenize, parse, prettyPrintExpression, interpret } from "../src";

const text = `1 + 2 + 3 + 4`;
console.log(interpret(parse(tokenize(text))));
