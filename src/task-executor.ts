/**
 * @typedef {import("./pool").Pool} Pool
 * @typedef {import("./dynamic-pool").DynamicPool} DynamicPool
 * @typedef {import("./dynamic-pool").DynamicPoolWorkerParam} DynamicPoolWorkerParam
 * @typedef {import("./pool-worker").TaskConfig} TaskConfig
 * @typedef {import("../index").TransferList} TransferList
 */

import { DynamicPool, DynamicPoolWorkerParam } from "./dynamic-pool";

import { createCode } from "./create-code";
import { TaskConfig } from "./pool-worker";
import { Pool, TransferList } from "./pool";

class BaseTaskExecutor<ParamType, ResultType> {
  protected _taskConfig: TaskConfig = {};
  protected _pool: Pool;
  protected _called = false;

  constructor(pool: Pool) {
    this._pool = pool;
  }

  /** Set timeout (in millisecond) to this task. */
  setTimeout(t: number): this {
    this._taskConfig.timeout = t;
    return this;
  }

  /**
   * @see {@link https://nodejs.org/dist/latest-v14.x/docs/api/worker_threads.html#worker_threads_port_postmessage_value_transferlist transferList}
   */
  setTransferList(transferList: TransferList): this {
    this._taskConfig.transferList = transferList;
    return this;
  }

  /** Execute this task with the parameter provided. */
  async exec(param?: ParamType | DynamicPoolWorkerParam): Promise<ResultType> {
    if (this._called) {
      throw new Error("task executor is already called!");
    }
    this._called = true;
    return await this._pool.runTask(param, this._taskConfig);
  }
}

/** Executor for StaticPool. Used to apply some advanced settings to a task. */
export class StaticTaskExecutor<ParamType, ResultType> extends BaseTaskExecutor<
  ParamType,
  ResultType
> {}

/** Executor for DynamicPool. Used to apply some advanced settings to a task. */
export class DynamicTaskExecutor<
  ParamType,
  ResultType
> extends BaseTaskExecutor<ParamType, ResultType> {
  private _code: string;
  constructor(dynamicPool: DynamicPool, task: Function) {
    super(dynamicPool);
    this._code = createCode(task);
  }

  async exec(param?: DynamicPoolWorkerParam): Promise<ResultType> {
    const workerParam: DynamicPoolWorkerParam = { code: this._code, param };
    return await super.exec(workerParam);
  }
}
