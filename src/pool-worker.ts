import { TransferList } from "./pool";

export interface TaskConfig {
  timeout?: number;
  transferList?: TransferList;
}

import { Worker, WorkerOptions } from "worker_threads";
import { PromiseWithTimer } from "./promise-with-timer";
import { URL } from "url";

export class PoolWorker extends Worker {
  public ready = false;

  constructor(
    filename: string | URL,
    options?: WorkerOptions,
    private isDone?: (message: any) => boolean
  ) {
    super(filename, options);
    this.once("online", () => this.readyToWork());
  }

  run(param: any, taskConfig: TaskConfig) {
    this.ready = false;

    const timeout = taskConfig.timeout ? taskConfig.timeout : 0;
    const transferList = taskConfig.transferList;
    const { isDone } = this;
    const taskPromise = new Promise((resolve, reject) => {
      const self = this;

      function message(res: any) {
        if (isDone) {
          if (isDone(res)) {
            self.removeListener("message", message);
          } else {
            return;
          }
        }
        self.removeListener("error", error);
        self.readyToWork();
        resolve(res);
      }

      function error(err: Error) {
        self.removeListener("message", message);
        reject(err);
      }

      if (!this.isDone) this.once("message", message);
      else this.on("message", message);
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
