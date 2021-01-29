import { EventEmitter } from "events";
import { TaskContainer } from "./task-container";
import { isTimeoutError } from "./promise-with-timer";
import { PoolWorker, TaskConfig } from "./pool-worker";
import { TransferListItem } from "worker_threads";

export type TransferList = ReadonlyArray<TransferListItem>;

export class Pool extends EventEmitter {
  private _size: number;
  private _deprecated = false;
  private _workers: PoolWorker[] = [];
  private _createWorker: any = null;
  private _taskQueue: TaskContainer[] = [];

  constructor(size: number) {
    super();

    if (typeof size !== "number") {
      throw new TypeError('"size" must be the type of number!');
    }

    if (Number.isNaN(size)) {
      throw new Error('"size" must not be NaN!');
    }

    if (size < 1) {
      throw new RangeError('"size" must not be lower than 1!');
    }

    this._size = size;

    this._addEventHandlers();
  }

  private _addEventHandlers() {
    this.on("worker-ready", (worker) => {
      this._processTask(worker);
    });
  }

  private _addWorkerLifecycleHandlers(worker: PoolWorker) {
    worker.on("ready", (worker) => this.emit("worker-ready", worker));

    worker.once("exit", (code) => {
      if (this._deprecated || code === 0) {
        return;
      }
      this._replaceWorker(worker);
    });
  }

  private _setWorkerCreator(getWorker: () => PoolWorker) {
    this._createWorker = () => {
      const worker = getWorker();
      this._addWorkerLifecycleHandlers(worker);
      return worker;
    };
  }

  private _replaceWorker(worker: PoolWorker) {
    const i = this._workers.indexOf(worker);
    this._workers[i] = this._createWorker();
  }

  _getIdleWorker(): PoolWorker | null {
    const worker = this._workers.find((worker) => worker.ready);

    return worker ? worker : null;
  }

  private _processTask(worker: PoolWorker) {
    const task = this._taskQueue.shift();

    if (!task) {
      return;
    }

    const { param, resolve, reject, taskConfig } = task;

    worker
      .run(param, taskConfig)
      .then(resolve)
      .catch((error) => {
        if (isTimeoutError(error)) {
          worker.terminate();
        }
        reject(error);
      });
  }

  fill(getWorker: () => PoolWorker) {
    this._setWorkerCreator(getWorker);

    const size = this._size;

    for (let i = 0; i < size; i++) {
      this._workers.push(this._createWorker());
    }
  }

  runTask(param: any, taskConfig: TaskConfig): Promise<any> {
    if (this._deprecated) {
      throw new Error("This pool is deprecated! Please use a new one.");
    }

    return new Promise((resolve, reject) => {
      const task = new TaskContainer(param, resolve, reject, taskConfig);

      this._taskQueue.push(task);
      const worker = this._getIdleWorker();

      if (worker) {
        this._processTask(worker);
      }
    });
  }

  /**
   * Destroy this pool and terminate all threads.
   */
  async destroy(): Promise<void> {
    this._deprecated = true;
    this.removeAllListeners();
    const workers = this._workers;
    this._workers = null;
    await Promise.all(workers.map((worker) => worker.terminate()));
  }
}
