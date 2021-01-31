const { parentPort, workerData } = require("worker_threads");

function add(a: number, b: number) {
  return a + b;
}
if (parentPort)
  parentPort.on("message", (msg: number) => {
    if (typeof msg !== "number") {
      throw new Error("param must be a number.");
    }
    if (typeof workerData !== "number") {
      throw new Error("workerData must be a number.");
    }
    if (parentPort) parentPort.postMessage(add(msg, workerData));
  });
