export interface CommonWorkerSettings {
  /**
   * Enable SHARE_ENV for all threads in pool.
   * @see {@link https://nodejs.org/dist/latest-v14.x/docs/api/worker_threads.html#worker_threads_worker_share_env SHARE_ENV}
   */
  shareEnv?: boolean;
  /**
   * Set resourceLimits for all threads in pool.
   * @see {@link https://nodejs.org/api/worker_threads.html#worker_threads_worker_resourcelimits resourcelimits}
   */
  resourceLimits?: {
    maxYoungGenerationSizeMb?: number;
    maxOldGenerationSizeMb?: number;
    codeRangeSizeMb?: number;
    stackSizeMb?: number;
  };
  /**
   * if provided, call on each message emited by the workrs, if it return true, the task is consider as done; else wait for more messages
   */
  isDone?: (message: any) => boolean;
}
