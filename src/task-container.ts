/**
 * @typedef {import("./pool-worker").TaskConfig} TaskConfig
 */

import { TaskConfig } from "./pool-worker";

export class TaskContainer {
  constructor(
    public param: any,
    public resolve: (value: any) => any,
    public reject: (reason: any) => any,
    public taskConfig: TaskConfig
  ) {}
}
