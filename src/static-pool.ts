import { Pool } from "./pool";
import { PoolWorker } from "./pool-worker";
import { StaticTaskExecutor } from "./task-executor";
import { createCode } from "./create-code";
import { CommonWorkerSettings } from "./common";
import { SHARE_ENV, WorkerOptions } from "worker_threads";

export type TaskFuncThis<WorkerData = any> = {
  workerData: WorkerData;
  require: NodeRequire;
};

export type TaskFunc<ParamType, ResultType, WorkerData = any> =
  | ((this: TaskFuncThis<WorkerData>) => Promise<ResultType>)
  | ((this: TaskFuncThis<WorkerData>) => ResultType)
  | ((this: TaskFuncThis<WorkerData>, param: ParamType) => Promise<ResultType>)
  | ((this: TaskFuncThis<WorkerData>, param: ParamType) => ResultType);

function createScript(fn: Function) {
  return `
    const { parentPort, workerData } = require('worker_threads');

    this.workerData = workerData;
    const container = {
      workerData,
      require,
      task: ${createCode(fn)}
    };
    
    process.once("unhandledRejection", (err) => {
      throw err;
    });

    parentPort.on('message', async (param) => {
      parentPort.postMessage(await container.task(param));
    });
  `;
}

export interface StaticPoolOptions<ParamType, ResultType, WorkerData>
  extends CommonWorkerSettings {
  /** number of workers */
  size: number;
  /** path of worker file or a worker function */
  task: string | TaskFunc<ParamType, ResultType>;
  /** data to pass into workers */
  workerData?: WorkerData;
}

/**
 * Threads pool with static task.
 */
export class StaticPool<ParamType, ResultType, WorkerData = any> extends Pool {
  constructor(opt: StaticPoolOptions<ParamType, ResultType, WorkerData>) {
    super(opt.size);
    const { workerData, shareEnv, resourceLimits, isDone } = opt;
    let task = opt.task;
    const workerOpt: WorkerOptions = { workerData };
    /* istanbul ignore next */
    if (shareEnv) {
      workerOpt.env = SHARE_ENV;
    }
    /* istanbul ignore next */
    if (typeof resourceLimits === "object") {
      workerOpt.resourceLimits = resourceLimits;
    }
    if (typeof task === "function") {
      workerOpt.eval = true;
    }

    switch (typeof task) {
      case "string": {
        if (task.endsWith(".ts")) {
          workerOpt.argv = [task];
          task = __dirname + "/register.js";
        }
        this.fill(() => new PoolWorker(task as string, workerOpt, isDone));
        break;
      }

      case "function": {
        const script = createScript(task);
        this.fill(() => new PoolWorker(script, workerOpt, isDone));
        break;
      }

      default:
        throw new TypeError("Invalid type of 'task'!");
    }
  }

  /**
   * Choose a idle worker to run the task
   * with param provided.
   */
  exec(param?: ParamType, timeout = 0): Promise<ResultType> {
    if (typeof param === "function") {
      throw new TypeError('"param" can not be a function!');
    }
    return this.runTask(param, { timeout });
  }

  /**
   * Create a task executor of this pool.
   * This is used to apply some advanced settings to a task.
   */
  createExecutor(): StaticTaskExecutor<ParamType, ResultType> {
    return new StaticTaskExecutor(this);
  }
}
