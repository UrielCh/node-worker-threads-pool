import path from "path";
require("ts-node").register();
const script = process.argv.pop() as string;
require(path.resolve(script));
