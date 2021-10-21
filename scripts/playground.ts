import { tokenize, parse, prettyPrintExpression } from "../src";

const text = `1 + 2 + 3 + 4`;
console.log(prettyPrintExpression(parse(tokenize(text))));
