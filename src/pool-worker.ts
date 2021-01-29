import { TransferList } from "./pool";

export interface TaskConfig {
  timeout?: number;
  transferList?: TransferList;
}

import { Worker, WorkerOptions } from "worker_threads";
import { PromiseWithTimer } from "./promise-with-timer";

export class PoolWorker extends Worker {
  public ready = false;

  constructor(filename: string | URL, options?: WorkerOptions) {
    super(filename, options);
    this.once("online", () => this.readyToWork());
  }

  run(param: any, taskConfig: TaskConfig) {
    this.ready = false;

    const timeout = taskConfig.timeout ? taskConfig.timeout : 0;
    const transferList = taskConfig.transferList;

    const taskPromise = new Promise((resolve, reject) => {
      const self = this;

      function message(res) {
        self.removeListener("error", error);
        self.readyToWork();
        resolve(res);
      }

      function error(err: Error) {
        self.removeListener("message", message);
        reject(err);
      }

      this.once("message", message);
      this.once("error", error);
      this.postMessage(param, transferList);
    });

    return new PromiseWithTimer(taskPromise, timeout).startRace();
  }

  readyToWork() {
    this.ready = true;
    this.emit("ready", this);
  }

  /**
   * @override
   */
  terminate() {
    this.once("exit", () => {
      setImmediate(() => {
        this.removeAllListeners();
      });
    });

    return super.terminate();
  }
}
