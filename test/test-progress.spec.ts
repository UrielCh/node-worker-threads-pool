import { StaticPool } from "..";
import path from "path";

describe("progress function in static pool tests", () => {
  test("test worker file with progess event", async () => {
    const workerData = 100;
    let progressCount = 0;
    const pool = new StaticPool({
      task: path.resolve(__dirname, "progress.js"),
      size: 1,
      workerData,
      isDone: (message) => {
        if (typeof message === "string") {
          progressCount++;
          return false;
        }
        return true;
      },
    });
    const res = await pool.exec(1);
    expect(res).toBe(101);
    expect(progressCount).toBe(1);
    pool.destroy();
  });
});
