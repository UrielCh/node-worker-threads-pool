/**
 * @typedef {import("./pool-worker").TaskConfig} TaskConfig
 */

export interface DynamicPoolWorkerParam {
  code: string;
  param?: any;
}

import { Pool } from "./pool";
import { PoolWorker } from "./pool-worker";
import { DynamicTaskExecutor } from "./task-executor";
import { createCode } from "./create-code";
import { TaskFunc } from "./static-pool";
import { CommonWorkerSettings } from "./common";

const script = `
  const vm = require('vm');
  const { parentPort } = require('worker_threads');

  process.once("unhandledRejection", (err) => {
    throw err;
  });

  parentPort.on('message', async ({ code, workerData, param }) => {
    this.workerData = workerData;
    const task = vm.runInThisContext(code);
    const container = { task, workerData, require };
    const result = await container.task(param);
    parentPort.postMessage(result);
  });
`;

export interface DynamicPoolOptions<ParamType, ResultType, WorkerData = any> {
  /** Function to be executed. */
  task: TaskFunc<ParamType, ResultType>;
  /** Parameter for task function. */
  param?: ParamType;
  /**
   * Data to pass into workers.
   * @deprecated since version 1.4.0. Please use parameter instead.
   */
  workerData?: WorkerData;
  timeout?: number;
}

/**
 * Threads pool that can run different function
 * each call.
 */
export class DynamicPool extends Pool {
  /**
   * @param size Number of workers.
   * @param opt Some advanced settings.
   *
   */
  constructor(size: number, opt?: CommonWorkerSettings) {
    super(size);
    const workerOpt = {
      eval: true,
    } as any;
    if (opt) {
      /* istanbul ignore next */
      if (opt.shareEnv) {
        const { SHARE_ENV } = require("worker_threads");
        workerOpt.env = SHARE_ENV;
      }
      /* istanbul ignore next */
      if (typeof opt.resourceLimits === "object") {
        workerOpt.resourceLimits = opt.resourceLimits;
      }
    }
    this.fill(() => new PoolWorker(script, workerOpt));
  }
  /**
   * Choose a idle worker to execute the function
   * with context provided.
   */
  exec<ParamType = any, ResultType = any, WorkerData = any>(
    options: DynamicPoolOptions<ParamType, ResultType, WorkerData>
  ): Promise<ResultType> {
    const { task, param, workerData, timeout = 0 } = options;
    if (typeof task !== "function") {
      throw new TypeError('task "fn" must be a function!');
    }
    const code = createCode(task);
    const workerParam = {
      code,
      param,
      workerData,
    };
    return this.runTask(workerParam, { timeout });
  }

  /**
   * Create a task executor of this pool.
   * This is used to apply some advanced settings to a task.
   */
  createExecutor<ParamType, ResultType>(
    task: TaskFunc<ParamType, ResultType>
  ): DynamicTaskExecutor<ParamType, ResultType> {
    return new DynamicTaskExecutor(this, task);
  }
}
