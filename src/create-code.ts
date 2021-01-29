const es6FuncReg = /^task[^]*([^]*)[^]*{[^]*}$/;

export function createCode(fn: Function): string {
  const strFn = Function.prototype.toString.call(fn);
  let expression = "";
  if (es6FuncReg.test(strFn)) {
    // ES6 style in-object function.
    expression = "function " + strFn;
  } else {
    // ES5 function or arrow function.
    expression = strFn;
  }
  return `(${expression})`;
}
